// Сколько сайта уже говорит по-азербайджански — и что именно ещё нет.
//
// Перевод здесь живёт не в коде, а словарями «русская строка → азербайджанская» (см. public/js/i18n.js).
// У такого способа одна слабость: если строку в коде поправили, ключ перестаёт совпадать и перевод
// тихо отваливается — на экране снова русский, и никто об этом не узнает. Этот отчёт и есть та
// проверка, которой иначе нет.
//
//   npm run i18n            — сводка
//   npm run i18n -- --list  — и сами строки без перевода
//   npm run i18n -- --strict — ненулевой код возврата, если есть пропуски (для CI)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "js");
const CYR = /[Ѐ-ӿ]/;
const SLOT = "";
const BT = String.fromCharCode(96);

// Не текст для человека: правила фильтра — это регулярные выражения, служебные помощники
// вообще не рисуют, а сообщения в консоль читает тот, кто чинит сайт.
const SKIP_FILES = new Set(["i18n.js", "moderation.js", "utils.js", "logo.js", "levels.js"]);
const LOG_TAGS = ["backend", "store", "tutor", "i18n", "speech", "games"];
const isLogLine = (s) => LOG_TAGS.some((t) => s.startsWith("[" + t + "]"));
const SKIP_EXACT = new Set(["ru-RU", "az-AZ", "de-DE"]);

/**
 * Строковые литералы файла — свой маленький сканер, а не регулярка.
 *
 * Регулярка спотыкается на классе символов вроде /[&<>"']/ и глотает весь остаток файла как
 * строку. Сканер знает про комментарии, про экранирование и про вложенность внутри ${…}.
 */
function literals(src) {
  const out = [];
  let i = 0;
  const N = src.length;
  while (i < N) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { while (i < N && src[i] !== "\n") i++; continue; }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); i = i < 0 ? N : i + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; const from = ++i;
      while (i < N && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      out.push({ kind: "str", raw: src.slice(from, i) });
      i++; continue;
    }
    if (c === BT) {
      const tag = i > 0 && /[A-Za-z0-9_$]/.test(src[i - 1])
        ? (src.slice(0, i).match(/([A-Za-z0-9_$]+)$/) || [])[1] : null;
      const parts = [];
      let cur = "", depth = 0;
      i++;
      while (i < N) {
        const ch = src[i];
        if (ch === "\\") { cur += src.slice(i, i + 2); i += 2; continue; }
        if (depth === 0 && ch === BT) { i++; break; }
        if (ch === "$" && src[i + 1] === "{") { depth++; i += 2; parts.push(cur); cur = ""; continue; }
        if (depth > 0) {
          if (ch === "{") depth++;
          else if (ch === "}") { depth--; i++; continue; }
          // строки ВНУТРИ подстановки — тоже текст: `${plural(n, "урок", "урока", "уроков")}`
          else if (ch === '"' || ch === "'") {
            const q = ch; const from = ++i;
            while (i < N && src[i] !== q) { if (src[i] === "\\") i++; i++; }
            out.push({ kind: "str", raw: src.slice(from, i) });
          } else if (ch === BT) { i = skipTemplate(src, i); continue; }
          i++;
          continue;
        }
        cur += ch;
        i++;
      }
      parts.push(cur);
      out.push({ kind: "tpl", tag, parts });
      continue;
    }
    i++;
  }
  return out;
}

function skipTemplate(src, at) {
  let i = at + 1, depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") { i += 2; continue; }
    if (depth === 0 && c === BT) return i + 1;
    if (c === "$" && src[i + 1] === "{") { depth++; i += 2; continue; }
    if (depth > 0) { if (c === "{") depth++; else if (c === "}") depth--; else if (c === BT) { i = skipTemplate(src, i); continue; } }
    i++;
  }
  return i;
}

const unesc = (s) => s
  .replace(/\\n/g, "\n").replace(/\\t/g, "\t")
  .replace(/\\`/g, BT).replace(/\\"/g, '"').replace(/\\'/g, "'")
  .replace(/\\\\/g, "\\");

/** Ключи словаря, которые нужны этому файлу. Тегированный шаблон даёт ключ с метками вместо значений. */
function keysOf(file) {
  const src = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const keys = [];
  for (const tk of literals(src)) {
    let key = null;
    if (tk.kind === "str") { if (CYR.test(tk.raw)) key = unesc(tk.raw); }
    else if (tk.parts.length > 1) { if (tk.tag === "tr") key = tk.parts.map(unesc).join(SLOT); }
    else if (CYR.test(tk.parts[0])) key = unesc(tk.parts[0]);
    if (key && CYR.test(key) && !SKIP_EXACT.has(key) && !isLogLine(key)) keys.push(key);
  }
  return keys;
}

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.isDirectory() && e.name.endsWith(".js"))
    .map((e) => path.join(dir, e.name));
}

/* ----------------------------------------------------------------- собираем */

const groups = { ui: new Map(), brain: new Map(), content: new Map() };
const perLevel = new Map();

for (const f of jsFiles(ROOT)) {
  if (SKIP_FILES.has(path.basename(f))) continue;
  const bucket = path.basename(f).startsWith("brain") ? groups.brain : groups.ui;
  for (const k of keysOf(f)) bucket.set(k, path.basename(f));
}
for (const f of jsFiles(path.join(ROOT, "brain-data"))) {
  for (const k of keysOf(f)) groups.brain.set(k, "brain-data/" + path.basename(f));
}
for (const f of jsFiles(path.join(ROOT, "content"))) {
  const level = path.basename(f).replace(/\D/g, "");
  const keys = keysOf(f);
  if (!perLevel.has(level)) perLevel.set(level, new Set());
  for (const k of keys) { groups.content.set(k, path.basename(f)); perLevel.get(level).add(k); }
}

// оболочка страницы лежит готовой разметкой в index.html и через el() не проходит
{
  const html = fs.readFileSync(path.join(ROOT, "..", "index.html"), "utf8");
  for (const m of html.matchAll(/>([^<>]+)</g)) {
    const t = m[1].trim();
    if (t && CYR.test(t)) groups.ui.set(t, "index.html");
  }
  for (const m of html.matchAll(/(?:title|placeholder|aria-label)="([^"]+)"/g)) {
    const t = m[1].trim();
    if (t && CYR.test(t)) groups.ui.set(t, "index.html");
  }
}

// строка может встретиться и в интерфейсе, и в уроке — словарь один, так что достаточно найтись где угодно
const dict = new Map();
for (const name of ["az-ui.js", "az-brain.js", "az-content.js"]) {
  const file = path.join(ROOT, "i18n", name);
  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, "utf8");
  const body = src.slice(src.indexOf("export default {"));
  for (const m of body.matchAll(/^ {2}("(?:[^"\\]|\\.)*"): ("(?:[^"\\]|\\.)*"),?$/gm)) {
    dict.set(JSON.parse(m[1]), JSON.parse(m[2]));
  }
}

/* ------------------------------------------------------------------ отчёт */

const list = process.argv.includes("--list");
const strict = process.argv.includes("--strict");
const pct = (d, t) => (t ? Math.round((d / t) * 100) : 100);

let totalMissing = 0;
console.log(`Азербайджанский словарь: ${dict.size} строк\n`);

for (const [name, map] of Object.entries(groups)) {
  const keys = [...map.keys()];
  const missing = keys.filter((k) => !dict.has(k));
  totalMissing += missing.length;
  const title = { ui: "интерфейс", brain: "Мия офлайн", content: "уроки" }[name];
  console.log(`${title.padEnd(12)} ${String(keys.length - missing.length).padStart(5)} / ${String(keys.length).padEnd(5)} ${pct(keys.length - missing.length, keys.length)}%`);
  if (list && missing.length) {
    for (const m of missing.slice(0, 40)) console.log(`    · ${JSON.stringify(m).slice(0, 110)}  (${map.get(m)})`);
    if (missing.length > 40) console.log(`    … и ещё ${missing.length - 40}`);
  }
}

console.log("\nПо урокам:");
const byLevel = [...perLevel.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
console.log("  " + byLevel.map(([lv, set]) => {
  const done = [...set].filter((k) => dict.has(k)).length;
  return `${Number(lv)}:${pct(done, set.size)}%`;
}).join("  "));

// Перевод, который потерял свою строку в коде: ключ есть, а кода под ним нет.
const live = new Set([...groups.ui.keys(), ...groups.brain.keys(), ...groups.content.keys()]);
const stale = [...dict.keys()].filter((k) => !live.has(k));
if (stale.length) {
  console.log(`\nОсиротевших переводов: ${stale.length} (строку в коде поменяли, ключ устарел)`);
  if (list) for (const s of stale.slice(0, 20)) console.log(`    · ${JSON.stringify(s).slice(0, 110)}`);
}

/* --------------------------------------------------- структурные проверки
 *
 * Шесть тысяч строк глазами не вычитать, а ошибка перевода здесь тихая: фраза на экране
 * выглядит прилично и при этом учит неправильному. Ловим то, что можно поймать механически.
 */
const count = (s, re) => (String(s).match(re) || []).length;
const complaints = [];

for (const [k, v] of dict) {
  const say = (what) => complaints.push({ what, k, v });

  // подстановка потеряется посреди фразы
  if (k.includes(SLOT)) {
    const need = k.split(SLOT).length - 1;
    const idx = String(v).match(/\{(\d+)\}/g);
    const have = idx ? new Set(idx).size : String(v).split(SLOT).length - 1;
    if (have !== need) say("подстановки");
  }

  // абзацы в объяснении грамматики
  if (count(k, /\n/g) !== count(v, /\n/g)) say("переводы строк");

  // прочерк — это место, куда ученик вписывает ответ
  if (count(k, /___/g) !== count(v, /___/g)) say("прочерки ___");

  // Немецкий термин внутри объяснения переводить нельзя: на нём держится всё задание.
  //
  // Ищем по началу слова, а не целиком: азербайджанский лепит падежные окончания прямо к
  // латинице — «Akkusativdə», «Nominativdən». Требовать \bAkkusativ\b значило бы ругаться на
  // каждое правильное предложение.
  const TERMS = ["Nominativ", "Akkusativ", "Dativ", "Genitiv", "Perfekt", "Präteritum", "Partizip",
    "Konjunktiv", "Imperativ", "Plusquamperfekt", "Relativsatz", "Passiv", "Infinitiv"];
  for (const w of TERMS) {
    const inKey = count(k, new RegExp(`\\b${w}`, "g"));
    if (inKey && inKey > count(v, new RegExp(`\\b${w}`, "g"))) { say(`потерян ${w}`); break; }
  }

  // Числа переносятся как есть — но считаем только те, что несут смысл: цены, годы, время,
  // проценты. Однозначные цифры живут своей жизнью («3-е лицо» → «III şəxs»), а {0}/{1} —
  // это метки подстановки, а не числа.
  const bigNums = (s) => (String(s).replace(/\{\d+\}/g, "").match(/\d{2,}/g) || []).sort().join(",");
  if (bigNums(k) !== bigNums(v)) say("числа");

  // Самая частая смысловая ошибка: подпись к немецкому «Russland / Russisch» вдруг про
  // Азербайджан. Ловим только имя страны — «по-русски» в объяснении вида «по-русски мы говорим
  // …, а по-немецки …» законно становится азербайджанским, потому что это про язык ученика,
  // а не перевод немецкого слова.
  if (/Росси[йия]/.test(k) && !/Rusiya|rusca|rus dili/i.test(v)) say("подменена страна");
  if (/^русский язык$|^по-русски$/.test(k.trim()) && !/rus/i.test(v)) say("подменён язык");

  // кириллица в переводе — значит строку просто не перевели
  if (CYR.test(v) && !/[«"]/.test(k)) say("кириллица");
}

if (complaints.length) {
  const byWhat = new Map();
  for (const c of complaints) byWhat.set(c.what, (byWhat.get(c.what) || 0) + 1);
  console.log(`\nСтруктурных расхождений: ${complaints.length}`);
  for (const [what, n] of [...byWhat].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)} × ${what}`);
  if (list) {
    for (const c of complaints.slice(0, 30)) {
      console.log(`    · [${c.what}] ${JSON.stringify(c.k).slice(0, 95)}`);
      console.log(`               → ${JSON.stringify(c.v).slice(0, 95)}`);
    }
    if (complaints.length > 30) console.log(`    … и ещё ${complaints.length - 30}`);
  }
}

console.log(`\nВсего без перевода: ${totalMissing}`);
if (strict && (totalMissing || complaints.length)) process.exit(1);
