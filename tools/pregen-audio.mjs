// Synthesise the whole course once and put it in the bucket.
//
// Everything Emil hears in a lesson is fixed text: the words, their examples, the dialogue lines,
// the phrases. Making the site synthesise them on demand would mean a serverless function running
// — and being paid for — every time somebody opens a level, forever, for audio that never changes.
// So it is generated here, once, and served from the CDN after that. The function in
// netlify/functions/tts.mjs is then only ever asked for something genuinely new: Mia's own replies.
//
//   node tools/pregen-audio.mjs             # everything that is missing
//   node tools/pregen-audio.mjs --level 13  # one level
//   node tools/pregen-audio.mjs --dry       # just count what would be made
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (or in .env).
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { cacheKey, synthesise, putClip, hasClip } from "../lib/tts.mjs";

const MIA_VOICE = "de-DE-SeraphinaMultilingualNeural";
const RU_VOICE = "de-DE-SeraphinaMultilingualNeural"; // multilingual: the same person reads Russian

// These must match RATES and the "sanft" preset in public/js/speech.js exactly. The speed is part
// of the cache key, so a clip made at the wrong speed is a clip the browser will never ask for.
const RATES = { word: 0.8, example: 0.85, translation: 0.9, dialogueAli: 0.8, dialogueOther: 0.88, listen: 0.9 };
const PRESET = { rate: -12, pitch: -3, volume: -12 }; // "sanft", the default tone
const pct = (r) => Math.round(PRESET.rate + (r - 0.92) * 100);

const args = process.argv.slice(2);
const only = args.includes("--level") ? Number(args[args.indexOf("--level") + 1]) : null;
const dry = args.includes("--dry");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !serviceKey)) {
  console.error("Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY. Положи их в .env или передай в окружении.");
  process.exit(2);
}

/** Every line of the course that is ever spoken aloud, with the speed the app will use. */
function linesOf(level) {
  const out = [];
  const de = (text, rate) => text && out.push({ text: String(text).trim(), rate, locale: "" });
  const ru = (text, rate) => text && out.push({ text: String(text).trim(), rate, locale: "ru-RU" });

  for (const v of level.vocab || []) {
    de(v.de, RATES.word);
    de(v.example, RATES.example);
    ru(v.ru, RATES.translation);
  }
  for (const g of level.grammar || []) for (const e of g.examples || []) de(e.de, RATES.example);
  for (const l of level.dialogue?.lines || []) de(l.de, l.speaker === "Emil" ? RATES.dialogueAli : RATES.dialogueOther);
  for (const p of level.speaking?.phrases || []) de(p.de, RATES.example);

  // exercises: whatever a 🔊 or a ▶ can play
  for (const ex of [...(level.exercises || []), ...(level.exam || [])]) {
    if (ex.type === "listen") de(ex.text, Math.min(0.92, RATES.listen));
    de(ex.text, RATES.example);
    de(ex.answer, RATES.example);
    de(ex.answers?.[0], RATES.example);
    if (ex.sentence && ex.answers?.[0]) de(ex.sentence.replace("___", ex.answers[0]), RATES.example);
    if (ex.type === "choice" && Array.isArray(ex.options)) de(ex.options[ex.answer], RATES.example);
    for (const p of ex.pairs || []) de(p.de, RATES.word);
  }
  return out.filter((l) => l.text && /[a-zäöüßа-яё]/i.test(l.text));
}

const CONTENT = path.join(process.cwd(), "public", "js", "content");
const files = fs.readdirSync(CONTENT).filter((f) => /^level[0-9][0-9][.]js$/.test(f)).sort();

const jobs = new Map(); // key -> {text, voice, locale, rate}
for (const file of files) {
  const level = (await import(pathToFileURL(path.join(CONTENT, file)).href)).default;
  if (only && level.id !== only) continue;
  for (const line of linesOf(level)) {
    const voice = line.locale ? RU_VOICE : MIA_VOICE;
    const rate = pct(line.rate);
    const key = cacheKey(voice, rate, line.text, PRESET.pitch, PRESET.volume, line.locale);
    if (!jobs.has(key)) jobs.set(key, { text: line.text, voice, locale: line.locale, rate });
  }
}

console.log(`Уникальных фраз: ${jobs.size} (из ${only ? "уровня " + only : files.length + " уровней"})`);
if (dry) process.exit(0);

let made = 0, skipped = 0, failed = 0;
const entries = [...jobs.entries()];
// A handful at a time: the endpoint throttles, and a burst is how you get empty audio back.
const LANES = 4;
await Promise.all(Array.from({ length: LANES }, async (_, lane) => {
  for (let i = lane; i < entries.length; i += LANES) {
    const [key, job] = entries[i];
    try {
      if (await hasClip(url, key)) { skipped++; continue; }
      const audio = await synthesise({ ...job, pitch: PRESET.pitch, volume: PRESET.volume });
      await putClip(url, serviceKey, key, audio);
      made++;
      if ((made + skipped) % 50 === 0) console.log(`  …${made + skipped} / ${entries.length}`);
    } catch (e) {
      failed++;
      console.warn(`  не вышло: «${job.text.slice(0, 40)}…» — ${e?.message || e}`);
    }
  }
}));

console.log(`\nГотово. Создано: ${made}, уже было: ${skipped}, не вышло: ${failed}.`);
if (failed) console.log("Неудачные можно догнать, просто запустив команду ещё раз — готовые пропустятся.");
