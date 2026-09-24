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
// Azerbaijani is a second explanation language, and Seraphina does not speak it — see speech.js,
// which picks the same voice for the same reason. Without these clips every Azerbaijani word
// would go through the function on its first play, which is exactly what this script exists to
// prevent.
const AZ_VOICE = "az-AZ-BanuNeural";

// These must match RATES and the presets in public/js/speech.js exactly. The speed is part
// of the cache key, so a clip made at the wrong speed is a clip the browser will never ask for.
const RATES = { word: 0.8, example: 0.85, translation: 0.9, dialogueAli: 0.8, dialogueOther: 0.88, listen: 0.9 };

/*
 * Все четыре тембра, а не только тот, что стоит по умолчанию.
 *
 * Тембр входит в ключ кэша целиком — и скоростью, и высотой, и громкостью. Пока озвучен был один
 * «Мягкий», человек, выбравший в кабинете любой другой, терял ВЕСЬ предгенерированный курс разом:
 * каждое слово, каждый пример и каждая реплика диалога шли через функцию с ожиданием. То есть
 * настройка, поставленная ради удовольствия, незаметно превращала сайт в медленный.
 *
 * Это в четыре раза больше работы один раз — и ноль ожидания у всех четверых потом.
 */
const TONES = [
  { id: "sanft",  rate: -12, pitch: -3, volume: -12 },
  { id: "warm",   rate: -8,  pitch: -2, volume: -6 },
  { id: "normal", rate: -4,  pitch: 0,  volume: 0 },
  { id: "klar",   rate: 0,   pitch: 1,  volume: 4 },
];
const pctFor = (tone, r) => Math.round(tone.rate + (r - 0.92) * 100);

const args = process.argv.slice(2);
const only = args.includes("--level") ? Number(args[args.indexOf("--level") + 1]) : null;
const dry = args.includes("--dry");
// `--tone sanft` — озвучить один тембр. Без него озвучиваются все четыре.
const onlyTone = args.includes("--tone") ? args[args.indexOf("--tone") + 1] : null;
const tones = onlyTone ? TONES.filter((t) => t.id === onlyTone) : TONES;
if (!tones.length) { console.error(`Не знаю тембра «${onlyTone}». Есть: ${TONES.map((t) => t.id).join(", ")}`); process.exit(1); }

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !serviceKey)) {
  console.error("Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY. Положи их в .env или передай в окружении.");
  process.exit(2);
}

/**
 * Every line of the course that is ever spoken aloud, with the speed the app will use.
 *
 * `az` is the same line in the second explanation language. The dictionary maps the Russian
 * string to the Azerbaijani one, which is exactly what the browser will be holding after
 * translateLevels() — so the cache key computed here is the key it will ask for.
 */
function linesOf(level, azOf) {
  const out = [];
  const de = (text, rate) => text && out.push({ text: String(text).trim(), rate, locale: "" });
  const ru = (text, rate) => text && out.push({ text: String(text).trim(), rate, locale: "ru-RU" });
  const az = (russian, rate) => {
    const text = russian && azOf(String(russian));
    if (text) out.push({ text: String(text).trim(), rate, locale: "az-AZ" });
  };

  for (const v of level.vocab || []) {
    de(v.de, RATES.word);
    de(v.example, RATES.example);
    ru(v.ru, RATES.translation);
    az(v.ru, RATES.translation);
    // пример на родном языке читается вслед за немецким — см. public/js/vocab.js
    ru(v.exampleRu, RATES.translation);
    az(v.exampleRu, RATES.translation);
  }
  for (const g of level.grammar || []) for (const e of g.examples || []) de(e.de, RATES.example);
  for (const l of level.dialogue?.lines || []) de(l.de, l.speaker === "Emil" ? RATES.dialogueAli : RATES.dialogueOther);
  for (const p of level.speaking?.phrases || []) de(p.de, RATES.example);

  // exercises: whatever a 🔊 or a ▶ can play
  for (const ex of [...(level.exercises || []), ...(level.exam || [])]) {
    if (ex.type === "listen") de(ex.text, Math.min(0.92, RATES.listen));
    // In a translation exercise `text` is German only when translating FROM German — that is
    // the one direction with a 🔊 (see translateRenderer in public/js/exercises.js). The other
    // way round it is the prompt in the learner's own language, and handing that to the German
    // voice produced a clip nobody will ever ask for.
    if (ex.type !== "translate" || ex.dir === "de-ru") de(ex.text, RATES.example);
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

// Тот же словарь, которым живёт сайт: ключ кэша считается от того текста, который человек
// реально увидит на карточке, иначе клип ляжет под ключом, которого браузер не спросит.
const { azOf } = await import(pathToFileURL(path.join(process.cwd(), "public", "js", "i18n.js")).href);
const { loadAzFull } = await import(pathToFileURL(path.join(process.cwd(), "public", "js", "i18n.js")).href);
// Весь словарь, а не только заголовки: сайт грузит уроки по мере надобности, а
// озвучить надо всё сразу.
await loadAzFull();

const jobs = new Map(); // key -> {text, voice, locale, rate, pitch, volume}
for (const file of files) {
  const level = (await import(pathToFileURL(path.join(CONTENT, file)).href)).default;
  if (only && level.id !== only) continue;
  for (const line of linesOf(level, azOf)) {
    const voice = line.locale === "az-AZ" ? AZ_VOICE : line.locale ? RU_VOICE : MIA_VOICE;
    for (const tone of tones) {
      const rate = pctFor(tone, line.rate);
      const key = cacheKey(voice, rate, line.text, tone.pitch, tone.volume, line.locale);
      if (!jobs.has(key)) jobs.set(key, { text: line.text, voice, locale: line.locale, rate, pitch: tone.pitch, volume: tone.volume });
    }
  }
}

console.log(`Уникальных фраз: ${jobs.size} (${tones.length} ${tones.length === 1 ? "тембр" : "тембра"}, ${only ? "уровень " + only : files.length + " уровней"})`);
if (dry) process.exit(0);

let made = 0, skipped = 0, failed = 0;
const entries = [...jobs.entries()];
// A handful at a time: the endpoint throttles, and a burst is how you get empty audio back.
//
// Two is not timidity. At four lanes Supabase Storage starts answering 429 "too_many_connections"
// — and that failure lands AFTER the line has already been synthesised, so it throws away the
// slow half of the work. putClip() now backs off and retries, but the cheapest fix is not to
// crowd the door in the first place. The whole course is ~5,800 lines and runs once.
// Три, а не две: узкое место — синтез, а не хранилище, и putClip теперь сам отступает и
// повторяет при 429. Четыре полосы Storage всё же не любит.
const LANES = 3;
await Promise.all(Array.from({ length: LANES }, async (_, lane) => {
  for (let i = lane; i < entries.length; i += LANES) {
    const [key, job] = entries[i];
    try {
      if (await hasClip(url, key)) { skipped++; continue; }
      const audio = await synthesise(job);   // тембр уже внутри job: rate, pitch, volume
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
