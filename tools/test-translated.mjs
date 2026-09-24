// Решаемы ли задания ПОСЛЕ перевода.
//
//   node tools/test-translated.mjs
//
// Валидатор уроков проверяет русский исходник. На экране же человек видит результат подстановки
// словаря, и сломаться может именно там: ключ ответа остался русским, пока вопрос стал
// азербайджанским; два варианта ответа слились в один, и правильных стало два; немецкое
// предложение случайно попало под перевод и перестало совпадать с озвучкой.
//
// Поэтому берём те же 36 уроков, прогоняем через translateLevels() ровно так, как это делает
// браузер, и проверяем каждое задание на решаемость.
import { LEVELS } from "../public/js/levels.js";
import { loadAzFull, setLangForTest, translateLevels } from "../public/js/i18n.js";
import { normalize } from "../public/js/utils.js";

const CYR = /[Ѐ-ӿ]/;

// Немецкий текст трогать нельзя: на нём держится озвучка — ключ кэша это хеш от самого текста,
// так что изменённая на один символ фраза теряет свой заранее синтезированный клип навсегда.
//
// Список узкий намеренно. `text` бывает и не немецким: у задания на перевод это подсказка на
// родном языке, и немецким он становится только в направлении de-ru. `hint` — всегда родной.
const GERMAN_FIELDS = ["de", "example", "plural", "sentence"];

const before = new Map();
for (const level of LEVELS) {
  const snap = (obj, path) => {
    if (Array.isArray(obj)) return obj.forEach((v, i) => snap(v, `${path}[${i}]`));
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") { if (GERMAN_FIELDS.includes(k)) before.set(`${path}.${k}`, v); }
      else snap(v, `${path}.${k}`);
    }
  };
  snap(level, `L${level.id}`);
}

await loadAzFull();
setLangForTest("az");
translateLevels(LEVELS);

let failed = 0;
const fail = (id, ex, msg) => {
  failed++;
  const what = ex?.q || ex?.text || ex?.sentence || ex?.answer || "";
  console.log(`FAIL  урок ${String(id).padStart(2)} · ${msg}${what ? `\n        ${JSON.stringify(String(what).slice(0, 80))}` : ""}`);
};

/* --------------------------------------- немецкий не должен был измениться */
{
  const after = new Map();
  for (const level of LEVELS) {
    const snap = (obj, path) => {
      if (Array.isArray(obj)) return obj.forEach((v, i) => snap(v, `${path}[${i}]`));
      if (!obj || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") { if (GERMAN_FIELDS.includes(k)) after.set(`${path}.${k}`, v); }
        else snap(v, `${path}.${k}`);
      }
    };
    snap(level, `L${level.id}`);
  }
  let changed = 0;
  for (const [k, v] of before) if (after.get(k) !== v) { changed++; if (changed <= 5) console.log(`FAIL  немецкое поле изменилось: ${k}\n        было «${v.slice(0, 60)}» стало «${String(after.get(k)).slice(0, 60)}»`); }
  if (changed) { failed += changed; console.log(`      …всего изменённых немецких полей: ${changed}`); }
}

let checked = 0;
for (const level of LEVELS) {
  for (const field of ["titleRu", "intro"]) {
    if (CYR.test(String(level[field] || ""))) fail(level.id, null, `${field} остался русским`);
  }
  for (const g of level.goals || []) if (CYR.test(g)) fail(level.id, null, `цель осталась русской: «${g.slice(0, 50)}»`);

  for (const ex of [...(level.exercises || []), ...(level.exam || [])]) {
    checked++;

    // варианты выбора: правильный существует, пустых нет, одинаковых нет
    if (Array.isArray(ex.options) && ex.options.length) {
      if (typeof ex.answer === "number" && !(ex.answer >= 0 && ex.answer < ex.options.length)) {
        fail(level.id, ex, "номер правильного ответа вне списка вариантов");
      }
      if (ex.options.some((o) => !String(o ?? "").trim())) fail(level.id, ex, "есть пустой вариант ответа");
      const seen = new Set();
      for (const o of ex.options) {
        const k = normalize(o);
        if (seen.has(k)) fail(level.id, ex, `два варианта совпали после перевода: «${o}»`);
        seen.add(k);
      }
    }

    // задания с вводом: ключ ответа есть и не пуст
    if (["fill", "translate", "order"].includes(ex.type)) {
      const keys = ex.type === "order" ? [ex.answer] : (ex.answers || []);
      if (!keys.length || keys.some((a) => !String(a ?? "").trim())) fail(level.id, ex, `${ex.type}: нет ключа ответа`);
    }

    // перевод НА родной язык: ключ обязан быть на родном, иначе задание нерешаемо
    if (ex.type === "translate" && ex.dir === "de-ru") {
      if ((ex.answers || []).some((a) => CYR.test(a))) fail(level.id, ex, "перевод на родной: ключ остался русским");
    }
    // перевод С родного: подсказка на родном, ответ немецкий
    if (ex.type === "translate" && ex.dir === "ru-de") {
      if (CYR.test(String(ex.text || ""))) fail(level.id, ex, "перевод с родного: задание осталось русским");
    }

    if (ex.type === "order" && Array.isArray(ex.words) && ex.answer) {
      const a = normalize(ex.words.join(" ")).split(" ").filter(Boolean).sort().join(" ");
      const b = normalize(ex.answer).split(" ").filter(Boolean).sort().join(" ");
      if (a !== b) fail(level.id, ex, "слова не складываются в ответ");
    }

    if (ex.type === "match" && Array.isArray(ex.pairs)) {
      for (const p of ex.pairs) {
        if (!String(p.de ?? "").trim() || !String(p.ru ?? "").trim()) fail(level.id, ex, "в паре пустая половина");
        if (CYR.test(String(p.ru))) fail(level.id, ex, `пара осталась русской: «${p.ru}»`);
      }
      const rus = ex.pairs.map((p) => normalize(p.ru));
      if (new Set(rus).size !== rus.length) fail(level.id, ex, "две пары получили одинаковый перевод — правильных ответов стало два");
    }

    for (const f of ["q", "ru", "explain", "hint"]) {
      if (ex[f] !== undefined && CYR.test(String(ex[f]))) fail(level.id, ex, `поле ${f} осталось русским: «${String(ex[f]).slice(0, 50)}»`);
    }
  }

  for (const line of level.dialogue?.lines || []) {
    if (!String(line.de ?? "").trim()) fail(level.id, null, "реплика диалога без немецкого");
    if (!String(line.ru ?? "").trim()) fail(level.id, null, "реплика диалога без перевода");
    if (CYR.test(String(line.ru))) fail(level.id, null, `реплика диалога осталась русской: «${String(line.ru).slice(0, 40)}»`);
  }

  for (const v of level.vocab || []) {
    if (!String(v.de ?? "").trim()) fail(level.id, null, "слово без немецкого");
    if (!String(v.ru ?? "").trim()) fail(level.id, null, `слово без перевода: ${v.de}`);
    if (CYR.test(String(v.ru))) fail(level.id, null, `подпись к слову осталась русской: ${v.de} — ${v.ru}`);
    if (v.exampleRu !== undefined && CYR.test(String(v.exampleRu))) fail(level.id, null, `пример к слову остался русским: ${v.de}`);
  }

  for (const g of level.grammar || []) {
    if (CYR.test(String(g.title || ""))) fail(level.id, null, `заголовок грамматики остался русским: «${g.title}»`);
    if (CYR.test(String(g.body || ""))) fail(level.id, null, `объяснение грамматики осталось русским (${g.title})`);
  }
}

console.log(`\nпроверено заданий: ${checked} в ${LEVELS.length} уроках`);
console.log(failed ? `\n${failed} FAILURES` : `All translated-content checks pass (${checked} заданий)`);
process.exit(failed ? 1 : 0);
