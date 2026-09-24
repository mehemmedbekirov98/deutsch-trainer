// Лежит ли в хранилище ровно то, что попросит браузер.
//
//   node --env-file=.env tools/check-audio.mjs
//
// Предгенерация и браузер считают ключ кэша независимо: один на сервере, другой в speech.js.
// Разойдись они на один символ — и человек, выбравший азербайджанский, ждёт синтеза каждого
// слова, хотя всё уже озвучено. Проверять это надо снаружи: обе стороны по отдельности
// «работают правильно».
//
// Берём случайные строки курса, считаем ключ ТАК ЖЕ, как его считает браузер, и спрашиваем
// хранилище, есть ли такой файл.
// speech.js — браузерный модуль: ему нужен намёк на окно, прежде чем он загрузится.
globalThis.window = { speechSynthesis: null, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, append() {} }), documentElement: {} };
Object.defineProperty(globalThis, "navigator", { value: { language: "ru-RU", userAgent: "node" }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { LEVELS } = await import("../public/js/levels.js");
const { loadAz, azOf } = await import("../public/js/i18n.js");
const { cacheKey, publicUrl } = await import("../lib/tts.mjs");
// Скорости и тембр берём ИЗ БРАУЗЕРНОГО модуля, а не переписываем сюда. Ровно эти числа входят
// в ключ кэша; продублируй их здесь — и проверка начнёт подтверждать сама себя, а не сайт.
const { RATES, presetById, MIA_VOICE, FALLBACK_VOICE_RU, FALLBACK_VOICE_AZ } = await import("../public/js/speech.js");

const URL_ = process.env.SUPABASE_URL;
if (!URL_) { console.error("нужен SUPABASE_URL: node --env-file=.env tools/check-audio.mjs"); process.exit(1); }

const PRESET = presetById("sanft");
// Как plan() в speech.js превращает множитель скорости в проценты.
const pct = (r) => Math.round(PRESET.rate + (r - 0.92) * 100);
const DE_VOICE = MIA_VOICE;
const RU_VOICE = MIA_VOICE;       // Серафина многоязычна и читает русский сама
const AZ_VOICE = FALLBACK_VOICE_AZ;

await loadAz();

const jobs = [];
for (const level of LEVELS) {
  for (const v of level.vocab || []) {
    jobs.push({ what: `${level.id} слово (de)`, text: v.de, voice: DE_VOICE, locale: "", rate: pct(RATES.word) });
    jobs.push({ what: `${level.id} перевод (ru)`, text: v.ru, voice: RU_VOICE, locale: "ru-RU", rate: pct(RATES.translation) });
    const az = azOf(String(v.ru));
    if (az) jobs.push({ what: `${level.id} перевод (az)`, text: az, voice: AZ_VOICE, locale: "az-AZ", rate: pct(RATES.translation) });
    if (v.example) jobs.push({ what: `${level.id} пример (de)`, text: v.example, voice: DE_VOICE, locale: "", rate: pct(RATES.example) });
  }
  // Реплики диалога читаются с разной скоростью в зависимости от того, чья они, — ровно так же
  // это решает rateFor() в dialogue.js. Скорость входит в ключ, так что перепутать нельзя.
  for (const l of level.dialogue?.lines || []) {
    const rate = l.speaker === "Emil" ? RATES.dialogueAli : RATES.dialogueOther;
    jobs.push({ what: `${level.id} диалог (de)`, text: l.de, voice: DE_VOICE, locale: "", rate: pct(rate) });
  }
}

// Случайная, но воспроизводимая выборка: проверять все 8815 по сети незачем.
const SAMPLE = Number(process.argv[2]) || 120;
const step = Math.max(1, Math.floor(jobs.length / SAMPLE));
const picked = jobs.filter((_, i) => i % step === 0).slice(0, SAMPLE);

let missing = 0;
let unknown = 0;
const byKind = new Map();

// По шесть за раз, а не все двести сразу.
//
// Первая версия слала все запросы одновременно — и Storage начинал отвечать 429. Проверка
// исправно считала это как «файла нет» и требовала перегенерировать восемь тысяч клипов,
// которые на месте. Отказ по перегрузке — это «не знаю», и считать его надо отдельно.
async function head(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok) return "есть";
      if (r.status === 404 || r.status === 400) return "нет";
    } catch { /* сеть моргнула — это тоже не ответ */ }
    await new Promise((res) => setTimeout(res, 250 * (i + 1)));
  }
  return "неясно";
}

const queue = picked.slice();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const j = queue.shift();
    const key = cacheKey(j.voice, j.rate, String(j.text).trim(), PRESET.pitch, PRESET.volume, j.locale);
    const verdict = await head(publicUrl(URL_, key));
    const kind = j.what.replace(/^\d+ /, "");
    if (!byKind.has(kind)) byKind.set(kind, { ok: 0, no: 0, "?": 0 });
    byKind.get(kind)[verdict === "есть" ? "ok" : verdict === "нет" ? "no" : "?"]++;
    if (verdict === "нет") { missing++; if (missing <= 8) console.log(`НЕТ  ${j.what}  «${String(j.text).slice(0, 44)}»`); }
    if (verdict === "неясно") unknown++;
  }
}));

console.log(`\nпроверено ${picked.length} строк из ${jobs.length}:`);
for (const [kind, n] of [...byKind].sort()) {
  console.log(`  ${kind.padEnd(16)} есть ${String(n.ok).padStart(3)}   нет ${String(n.no).padStart(3)}   неясно ${n["?"]}`);
}
// Проверка, которая ничего не проверила, обязана сказать об этом, а не отрапортовать «всё
// хорошо». Раньше при недоступном хранилище все ответы становились «неясно», missing оставался
// нулём — и вывод был «всё уже лежит», хотя не подтвердилась ни одна строка.
const confirmed = picked.length - missing - unknown;
if (unknown) console.log(`\n${unknown} ответов не получено (хранилище отказывало по нагрузке) — это не «нет»`);

if (missing) {
  console.log(`\n${missing} строк не озвучено — запусти npm run audio`);
  process.exit(1);
}
if (confirmed < picked.length * 0.8) {
  console.log(`\nподтверждено всего ${confirmed} из ${picked.length} — хранилище почти не отвечало, проверка НЕ состоялась`);
  process.exit(1);
}
console.log(`\nвсё, что попросит браузер, уже лежит в хранилище (подтверждено ${confirmed} из ${picked.length})`);
process.exit(0);
