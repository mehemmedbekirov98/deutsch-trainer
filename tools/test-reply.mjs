// На каком языке Мия сказала — и каким голосом это прозвучит.
//
//   node tools/test-reply.mjs
//
// Проверка ровно того места, где серверная правда теряется по дороге к человеку. askMia честно
// возвращает lang: "az" — а normalizeReply в браузере схлопывал его в "ru", и азербайджанскую
// фразу читал русский голос по русским правилам чтения. Проверка на живом ключе этого увидеть
// не могла: она смотрела на ответ сервера, а ломалось после него.
//
// Поэтому здесь берётся ровно то, что рисует экран, — normalizeReply, — и сверяется с картой
// голосов из того же файла.

// tutor.js тянет за собой весь браузер: окно, хранилище, речь. Шим минимальный, но настоящий —
// если модуль перестанет грузиться, это тоже поломка, и она здесь всплывёт.
globalThis.window = { speechSynthesis: null, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, append() {}, classList: { add() {}, remove() {}, toggle() {} } }), documentElement: {}, querySelector: () => null };
Object.defineProperty(globalThis, "navigator", { value: { language: "ru-RU", userAgent: "node" }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

const { normalizeReply } = await import("../public/js/tutor.js");
const { lang: uiLang } = await import("../public/js/i18n.js");

let failed = 0;
const fail = (msg) => { failed++; console.log("ПРОВАЛ " + msg); };
const eq = (got, want, what) => { if (got !== want) fail(`${what}: получили «${got}», ждали «${want}»`); };

/* ------------------------------------------------- язык доезжает до экрана целым */
for (const lang of ["ru", "az", "de"]) {
  const r = normalizeReply({ say: "текст", lang, translation: "" });
  eq(r.lang, lang, `реплика на «${lang}» осталась «${lang}»`);
}

// мусор в поле языка не должен ронять экран
// Откат — именно язык САЙТА, а не жёсткий русский: на азербайджанском сайте текст приходит
// азербайджанский, и метка "ru" отдавала его русскому голосу. В Node uiLang() — русский,
// так что сравниваем с ним самим — проверка останется верной и если язык сайта будет другим.
eq(normalizeReply({ say: "x", lang: "tr" }).lang, uiLang(), "незнакомый язык откатывается к языку сайта");
eq(normalizeReply({ say: "x" }).lang, uiLang(), "язык не пришёл вовсе");

/* ------------------------------------------------- старая форма (офлайн-Мия и сценарии) */
{
  const r = normalizeReply({ de: "Guten Tag", ru: "Добрый день", explainRu: "Так здороваются днём" });
  eq(r.lang, "de", "форма {de, ru} — это всегда немецкий");
  eq(r.say, "Guten Tag", "немецкая фраза не тронута");
  if (!r.translation) fail("перевод под немецкой фразой потерялся");
}

/* ------------------------------------------------- немецкий текст не должен меняться */
{
  const de = "Ich heiße Emil und wohne in Berlin.";
  const r = normalizeReply({ de, ru: "Меня зовут Эмиль, и я живу в Берлине." });
  eq(r.say, de, "немецкая фраза прошла насквозь без правок");
}

/* ------------------------------------------------- весь немецкий курса проходит насквозь
 *
 * Не выборочно: каждая немецкая строка всех тридцати шести уроков прогоняется через ту самую
 * воронку, которой пользуется экран, и обязана вернуться байт в байт. На немецком держится
 * озвучка — ключ кэша это хеш от самого текста, — и одна изменённая буква теряет заранее
 * синтезированный клип навсегда. А в курсе есть тридцать реплик вида «Woher kommst du, Emil?»:
 * это диалог, который человек разыгрывает, играя роль Эмиля, и подставлять туда его имя нельзя.
 */
{
  const { LEVELS } = await import("../public/js/levels.js");
  const FIELDS = new Set(["de", "example", "plural", "sentence", "answer", "title"]);
  let checked = 0, broken = 0;
  const walk = (obj) => {
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== "string") { walk(v); continue; }
      if (!FIELDS.has(k)) continue;
      checked++;
      // обе формы, которыми реплика доходит до экрана
      const asScript = normalizeReply({ de: v, ru: "перевод" }).say;
      const asAi = normalizeReply({ say: v, lang: "de" }).say;
      if (asScript !== v || asAi !== v) {
        broken++;
        if (broken <= 5) console.log(`ПРОВАЛ немецкий курса изменился (${k})\n       было  «${v}»\n       стало «${asScript !== v ? asScript : asAi}»`);
      }
    }
  };
  LEVELS.forEach(walk);
  failed += broken;
  console.log(`      немецкого текста курса через normalizeReply: ${checked} строк, изменено ${broken}`);
}

/* ------------------------------------------------- а родной язык — подставляется */
{
  const r = normalizeReply({ de: "Wie geht es dir?", ru: "Привет, Эмиль! Как дела?" });
  if (/Эмиль/.test(r.translation)) fail("в родном переводе осталось учебное имя: " + r.translation);
}

/* ------------------------------------------------- карта голосов покрывает все три языка */
{
  const src = await import("node:fs").then((fs) => fs.readFileSync(new URL("../public/js/tutor.js", import.meta.url), "utf8"));
  const map = src.match(/const LOCALE_OF = \{([^}]*)\}/)?.[1] || "";
  for (const [lang, locale] of [["ru", "ru-RU"], ["az", "az-AZ"]]) {
    if (!new RegExp(`${lang}:\\s*"${locale}"`).test(map)) fail(`в LOCALE_OF нет «${lang}» → «${locale}»`);
  }
  if (!/de:\s*""/.test(map)) fail("в LOCALE_OF немецкий должен быть пустой строкой — это родной язык голоса Мии");
}

console.log(failed ? `\n${failed} FAILURES` : "Язык реплики доезжает до голоса целым (ru, az, de)");
process.exit(failed ? 1 : 0);
