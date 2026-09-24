// Классы и переменные, которых нет.
//
//   node tools/check-css.mjs
//
// Опечатка в имени класса ничего не ломает — она просто ничего не делает. Поле остаётся без
// рамки, модалка без фона, разделитель не рисуется; ошибок в консоли ноль, тесты зелёные, а
// экран выглядит недоделанным. Так на сайт попали `class: "input"` (такого класса нет, есть
// `auth-input`) и `var(--line)` (такой переменной нет, есть `--border`).
//
// Заодно в обратную сторону: правила, которых никто не использует, — это мёртвый код, который
// мешает читать и который боятся трогать.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_DIR = path.join(ROOT, "public", "css");
const JS_DIR = path.join(ROOT, "public", "js");

/* ------------------------------------------------------------------ что есть в стилях */
let css = "";
for (const f of fs.readdirSync(CSS_DIR)) {
  if (f.endsWith(".css")) css += "\n" + fs.readFileSync(path.join(CSS_DIR, f), "utf8");
}
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, " ");

const classesInCss = new Set();
for (const m of stripped.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classesInCss.add(m[1]);

const varsDefined = new Set();
for (const m of stripped.matchAll(/(--[\w-]+)\s*:/g)) varsDefined.add(m[1]);

/* ------------------------------------------------------------------ …и что ставит сам код */
// Часть переменных живёт не в таблице стилей, а на элементе: `style: { "--accent": l.color }`,
// `"--i": i` для ступенчатой задержки анимации. Их тоже надо считать объявленными, иначе
// проверка ругается на совершенно рабочие правила.
const jsSources = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name !== "i18n") walk(path.join(dir, e.name)); }
    else if (e.name.endsWith(".js")) jsSources.push(path.join(dir, e.name));
  }
})(JS_DIR);
for (const f of jsSources) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/"(--[\w-]+)"\s*[:,]/g)) varsDefined.add(m[1]);
  for (const m of src.matchAll(/setProperty\(\s*"(--[\w-]+)"/g)) varsDefined.add(m[1]);
}

let failed = 0;

/* ------------------------------------------------------------------ var(--чего-нет) */
for (const m of stripped.matchAll(/var\((--[\w-]+)(\s*,)?/g)) {
  if (varsDefined.has(m[1])) continue;
  if (m[2]) continue;                       // есть запасное значение — это осознанно
  failed++;
  const line = stripped.slice(0, m.index).split("\n").length;
  console.log(`ПРОВАЛ переменная ${m[1]} нигде не объявлена (css:${line}) — правило просто не применится`);
}

/* ------------------------------------------------------------------ class: "чего-нет" */
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name !== "i18n") walk(path.join(dir, e.name)); }
    else if (e.name.endsWith(".js")) jsFiles.push(path.join(dir, e.name));
  }
})(JS_DIR);

// Ругаемся только когда У ЭЛЕМЕНТА НЕТ НИ ОДНОГО знакомого класса.
//
// `class: "ex ex-choice"` — нормально: оформление несёт `.ex`, а `ex-choice` это метка для кода.
// Таких зацепок в проекте два десятка, и жаловаться на каждую значит приучить не читать вывод.
// А вот `class: "input"`, где `input` единственный и в стилях его нет, — это опечатка: поле
// осталось без оформления, и никто бы не заметил.
const DYNAMIC = /\$\{|\+/;

// Зацепки, которые оформления и не просят: пустой контейнер под замену содержимого, обёртка
// вокруг эмодзи, ячейка, которую разметка уже разложила родителем. Они были тут до этой
// проверки, и каждая просмотрена глазами. Список закрытый: всё НОВОЕ будет провалом, и это и
// есть смысл — поймать следующую опечатку, а не перечислять старые.
const HOOKS = new Set([
  "auth-form-host", "board-host",   // пустые контейнеры: сюда подставляют содержимое
  "fb-icon", "mic-icon", "ss-icon", // обёртки вокруг эмодзи, размер наследуется
  "ss-rank", "toggle-label",        // ячейки, разложенные родительской сеткой
]);

let elements = 0;
for (const f of jsFiles) {
  const src = fs.readFileSync(f, "utf8");
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  for (const m of src.matchAll(/class:\s*"([^"$]+)"/g)) {
    const names = m[1].split(/\s+/).filter((n) => n && !DYNAMIC.test(n));
    if (!names.length) continue;
    elements++;
    if (names.some((n) => classesInCss.has(n) || HOOKS.has(n))) continue;
    failed++;
    const line = src.slice(0, m.index).split("\n").length;
    console.log(`ПРОВАЛ ${rel}:${line}\n       class="${m[1]}" — ни одного из этих классов нет в стилях, элемент останется без оформления`);
  }
}

console.log(`\nпросмотрено: ${classesInCss.size} классов и ${varsDefined.size} переменных в стилях, ${elements} элементов в коде`);
console.log(failed ? `\n${failed} находок` : "Все классы и переменные, на которые ссылается код, существуют");
process.exit(failed ? 1 : 0);
