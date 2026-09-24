// Забытый import — молча сломанный экран.
//
//   node tools/check-imports.mjs
//
// `backend.token()` стояло в tutor.js, а самого `backend` там никто не импортировал. Синтаксис
// верный, файл грузится, тесты зелёные — и живая Мия не работала НИ У КОГО: первое же обращение
// кидало ReferenceError, tutor.js ловил его своим catch и навсегда выключал умный режим. Такое
// ловится только в браузере и только если открыть нужный экран.
//
// Поэтому здесь: собираем всё, что экспортируют наши модули, и ищем файлы, которые этим именем
// пользуются, но его не ввозят и сами не объявляют.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public", "js");

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "i18n") walk(p); }
    else if (e.name.endsWith(".js")) files.push(p);
  }
})(DIR);

/** Что модуль отдаёт наружу: `export const x`, `export function x`, `export class x`, `export { x }`. */
function exportsOf(src) {
  const out = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const as = part.split(/\bas\b/);
      const name = (as[1] || as[0] || "").trim();
      if (name && name !== "default") out.add(name);
    }
  }
  return out;
}

/** Имена, которые файл ввёз: с учётом `as`, `* as ns` и import по умолчанию. */
function importedBy(src) {
  const out = new Set();
  for (const m of src.matchAll(/^import\s+([\s\S]*?)\s+from\s+["'][^"']+["']/gm)) {
    const clause = m[1];
    for (const b of clause.matchAll(/\{([\s\S]*?)\}/g)) {
      for (const part of b[1].split(",")) {
        const as = part.split(/\bas\b/);
        const name = (as[1] || as[0] || "").trim();
        if (name) out.add(name);
      }
    }
    for (const b of clause.matchAll(/\*\s+as\s+([A-Za-z_$][\w$]*)/g)) out.add(b[1]);
    const dflt = clause.replace(/\{[\s\S]*?\}/g, "").replace(/\*\s+as\s+[A-Za-z_$][\w$]*/g, "").split(",")[0].trim();
    if (/^[A-Za-z_$][\w$]*$/.test(dflt)) out.add(dflt);
  }
  return out;
}

/** Всё, что файл объявляет сам — включая аргументы функций и разбор объектов. Грубо, но с запасом. */
function declaredIn(src) {
  const out = new Set();
  for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of src.matchAll(/\b(?:function\*?|class)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  // деструктуризация и параметры: берём любое имя внутри {…} и (…) — намеренно широко,
  // задача не в точности, а в том чтобы не ругаться на своё же
  for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) out.add((part.split(/[:=]/)[0] || "").trim());
  }
  for (const m of src.matchAll(/\(([^()]*)\)\s*=>/g)) {
    for (const part of m[1].split(",")) out.add((part.split(/[:=]/)[0] || "").replace(/[{}[\].\s]/g, "").trim());
  }
  for (const m of src.matchAll(/\b(?:function\*?\s*[A-Za-z_$\w]*|catch)\s*\(([^()]*)\)/g)) {
    for (const part of m[1].split(",")) out.add((part.split(/[:=]/)[0] || "").replace(/[{}[\].\s]/g, "").trim());
  }
  // методы класса: name(args) {
  for (const m of src.matchAll(/^\s{2,}(?:async\s+|static\s+|\*)*([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*\{/gm)) {
    out.add(m[1]);
    for (const part of m[2].split(",")) out.add((part.split(/[:=]/)[0] || "").replace(/[{}[\].\s]/g, "").trim());
  }
  out.delete("");
  return out;
}

/**
 * Убрать из текста всё, что кодом не является: строки, шаблоны, комментарии, регулярки.
 *
 * Без этого «Der Weg ist lang.» читается как обращение к переменной `lang`, а «department store»
 * — как `store`. Пробелы вместо вырезанного, чтобы номера строк и смещения не поехали.
 */
function codeOnly(src) {
  let out = "";
  let i = 0;
  const blank = (s) => s.replace(/[^\n]/g, " ");
  while (i < src.length) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    if (two === "//") { const j = src.indexOf("\n", i); const end = j < 0 ? src.length : j; out += blank(src.slice(i, end)); i = end; continue; }
    if (two === "/*") { const j = src.indexOf("*/", i + 2); const end = j < 0 ? src.length : j + 2; out += blank(src.slice(i, end)); i = end; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) break;
        j++;
      }
      // Сама кавычка остаётся, вырезается только содержимое. Это нужно тегированным шаблонам:
      // из tr`Урок ${n}` должно остаться «tr`», иначе не видно, что `tr` вообще использовали.
      // Ложных срабатываний это не добавляет — текст внутри по-прежнему стёрт.
      out += c + blank(src.slice(i + 1, j + 1));
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// Карта «имя → откуда его берут». Одно имя может экспортироваться из нескольких модулей —
// тогда подсказка перечислит все.
const EXPORTS = new Map();
const sources = new Map();
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  sources.set(f, src);
  const rel = "./" + path.relative(DIR, f).replace(/\\/g, "/");
  for (const name of exportsOf(src)) {
    if (!EXPORTS.has(name)) EXPORTS.set(name, []);
    EXPORTS.get(name).push(rel);
  }
}

// …и то, под каким именем модули друг друга зовут.
//
// Одних экспортов мало: `import { t as tr }` даёт локальное имя `tr`, которого ни один модуль не
// экспортирует. Из-за этого удаление ровно этой строки проверку не роняло — а `tr` в проекте
// почти в каждом файле, и без него экран падает на первой же надписи. Поэтому имена-псевдонимы
// собираются со всего проекта: если двадцать файлов ввозят `t as tr`, то `tr` в двадцать первом
// без импорта — забытый импорт, а не случайное совпадение.
for (const f of files) {
  const src = sources.get(f);
  for (const m of src.matchAll(/^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
    for (const b of m[1].matchAll(/\{([\s\S]*?)\}/g)) {
      for (const part of b[1].split(",")) {
        const as = part.split(/\bas\b/);
        if (as.length < 2) continue;                       // без `as` имя и так есть в EXPORTS
        const alias = as[1].trim();
        if (!/^[A-Za-z_$][\w$]*$/.test(alias)) continue;
        if (!EXPORTS.has(alias)) EXPORTS.set(alias, [m[2]]);
      }
    }
  }
}

// То, что живёт в браузере само по себе и импорта не требует.
const GLOBALS = new Set([
  "window", "document", "navigator", "location", "history", "localStorage", "sessionStorage",
  "console", "fetch", "Math", "JSON", "Date", "Object", "Array", "String", "Number", "Boolean",
  "Promise", "Set", "Map", "WeakMap", "Error", "RegExp", "Intl", "URL", "URLSearchParams",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
  "cancelAnimationFrame", "performance", "crypto", "AbortController", "Audio", "Image", "Blob",
  "FileReader", "FormData", "Request", "Response", "Headers", "CustomEvent", "Event", "alert",
  "confirm", "prompt", "speechSynthesis", "SpeechSynthesisUtterance", "matchMedia", "getComputedStyle",
  "structuredClone", "queueMicrotask", "TextEncoder", "TextDecoder", "Uint8Array", "ArrayBuffer",
  "Infinity", "NaN", "undefined", "globalThis", "self", "top", "parent", "screen", "CSS", "Node",
  "HTMLElement", "Element", "DOMParser", "IntersectionObserver", "ResizeObserver", "MutationObserver",
  "AudioContext", "webkitAudioContext", "SpeechRecognition", "webkitSpeechRecognition", "Proxy",
  "Reflect", "Symbol", "BigInt", "isNaN", "isFinite", "parseInt", "parseFloat", "encodeURIComponent",
  "decodeURIComponent", "atob", "btoa", "process",
]);

let failed = 0;
for (const f of files) {
  const src = sources.get(f);
  const code = codeOnly(src);
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const have = new Set([...importedBy(src), ...declaredIn(code), ...GLOBALS]);
  const selfExports = exportsOf(src);

  // Имя считается использованным, если за ним идёт `.`, `(` или обратная кавычка.
  //
  // Обратная кавычка тут не мелочь: `tr` в этом проекте почти всегда тегированный шаблон —
  // tr`Урок ${n}`. Без неё можно было удалить `tr` из импортов, и вся проверка осталась бы
  // зелёной, хотя каждый такой вызов падает ReferenceError на первом же отрисованном экране.
  const used = new Map();
  for (const m of code.matchAll(/(^|[^\w$.?])([A-Za-z_$][\w$]*)\s*[.(`]/g)) {
    const name = m[2];
    if (!EXPORTS.has(name)) continue;
    if (have.has(name) || selfExports.has(name)) continue;
    if (!used.has(name)) used.set(name, code.slice(0, m.index).split("\n").length);
  }

  for (const [name, line] of used) {
    // строки и комментарии дают ложные срабатывания — проверяем саму строку кода
    const text = src.split("\n")[line - 1] || "";
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) continue;
    failed++;
    console.log(`ПРОВАЛ ${rel}:${line}\n       «${name}» используется, но не импортирован (есть в ${EXPORTS.get(name).join(", ")})\n       ${text.trim().slice(0, 100)}`);
  }
}

/* --------------------------------------------- файл, из которого ввозят, должен существовать
 *
 * Имя проверено, а путь — нет: `import { createClient } from "../vendor/supabase-js.js"` с
 * опечаткой или удалённым файлом проходил все проверки. В браузере это 404 и мёртвый модуль,
 * причём у самого входа в аккаунт. Здесь же и адреса шрифтов из таблиц стилей — по той же
 * причине: файла нет, ошибки нет, просто системный шрифт вместо нашего.
 */
{
  const seenPaths = new Set();
  const all = [...files];
  const vendorDir = path.join(ROOT, "public", "vendor");
  if (fs.existsSync(vendorDir)) for (const f of fs.readdirSync(vendorDir)) if (f.endsWith(".js")) all.push(path.join(vendorDir, f));

  for (const f of all) {
    const src = fs.readFileSync(f, "utf8");
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    // `import\s*` без обязательного пробела: вендоренные файлы минифицированы, и там `import{…}`
    // да `from"./x.js"` — без единого пробела и всё в одной строке.
    for (const m of src.matchAll(/(?:\bimport\s*[{*\w][\s\S]{0,300}?\bfrom\s*|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      const key = rel + "→" + m[1];
      if (seenPaths.has(key) || fs.existsSync(target)) { seenPaths.add(key); continue; }
      seenPaths.add(key);
      failed++;
      console.log(`ПРОВАЛ ${rel}\n       импортирует «${m[1]}», а такого файла нет`);
    }

    // Путь может лежать и в переменной: `const SUPABASE_LIB = "../vendor/supabase-js.js"`, а
    // ниже `await import(SUPABASE_LIB)`. Литерала рядом с `import` тогда нет, и предыдущая
    // проверка его не видит — а файл при этом ровно такой же обязательный.
    for (const m of src.matchAll(/["'](\.{1,2}\/[\w./-]+\.(?:js|mjs))["']/g)) {
      const target = path.resolve(path.dirname(f), m[1]);
      const key = rel + "→" + m[1];
      if (seenPaths.has(key) || fs.existsSync(target)) { seenPaths.add(key); continue; }
      seenPaths.add(key);
      failed++;
      console.log(`ПРОВАЛ ${rel}\n       ссылается на модуль «${m[1]}», а такого файла нет`);
    }
  }

  // …и то же самое для шрифтов: url('../fonts/…') в наших таблицах стилей
  const cssDir = path.join(ROOT, "public", "css");
  for (const f of fs.existsSync(cssDir) ? fs.readdirSync(cssDir) : []) {
    if (!f.endsWith(".css")) continue;
    const p = path.join(cssDir, f);
    for (const m of fs.readFileSync(p, "utf8").matchAll(/url\(['"]?(\.[^'")]+)['"]?\)/g)) {
      const target = path.resolve(path.dirname(p), m[1]);
      if (fs.existsSync(target)) continue;
      failed++;
      console.log(`ПРОВАЛ public/css/${f}\n       ссылается на «${m[1]}», а такого файла нет`);
    }
  }
}

/* --------------------------------------------- два обработчика на одном нажатии
 *
 * el() вешает onClick через addEventListener. Если тому же элементу потом присвоить .onclick,
 * обработчиков станет ДВА и сработают оба — присваивание не заменяет слушателя, а добавляется к
 * нему. На кнопке «Прослушать диалог» это выглядело так: первый обработчик запускал диалог,
 * второй немедленно его останавливал. Кнопка гасила сама себя во всех 36 уроках, и заметить это
 * можно было только открыв урок и нажав.
 */
{
  for (const f of files) {
    const code = codeOnly(sources.get(f));
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    // имя = el(…onClick…) — запоминаем, кому обработчик уже повешен
    const withOnClick = new Set();
    for (const m of code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*el\(([\s\S]{0,400}?)\)\s*[;,]/g)) {
      if (/\bonClick\s*:/.test(m[2])) withOnClick.add(m[1]);
    }
    for (const m of code.matchAll(/([A-Za-z_$][\w$]*)\.onclick\s*=/g)) {
      if (!withOnClick.has(m[1])) continue;
      failed++;
      const line = code.slice(0, m.index).split("\n").length;
      console.log(`ПРОВАЛ ${rel}:${line}\n       «${m[1]}» создан с onClick в el() и получает ещё и .onclick — сработают ОБА\n       убери onClick из el() или перестань присваивать .onclick`);
    }
  }
}

/* --------------------------------------------- управляющие символы прямо в тексте файла
 *
 * Отдельная беда, стоившая уже двух поломок. Редактор может записать `\u0001` из строки кода не
 * escape-последовательностью, а самим байтом — на экране разницы никакой, а в файле лежит
 * невидимый символ. В одном случае так сломался разделитель подстановок в словаре, в другом —
 * класс символов в регулярке, после чего git начал считать файл двоичным и перестал показывать
 * различия. Ищется это только так: пройтись по байтам.
 */
{
  const scan = [];
  const walkAll = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      // vendor/ — чужой минифицированный код, там управляющие символы встречаются законно
      if (e.name === "node_modules" || e.name === ".git" || e.name === "vendor" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkAll(p);
      else if (/\.(js|mjs|json|css|html|sql|toml|md)$/.test(e.name)) scan.push(p);
    }
  };
  walkAll(ROOT);
  for (const f of scan) {
    const src = fs.readFileSync(f, "utf8");
    for (let i = 0; i < src.length; i++) {
      const c = src.charCodeAt(i);
      // перевод строки, возврат каретки и табуляция — законны; всё остальное ниже пробела — нет
      if (c === 9 || c === 10 || c === 13) continue;
      if (c < 32 || c === 127) {
        // \u0001 в словарях — это метка подстановки, она там по делу
        if (c === 1 && /public[\\/]js[\\/]i18n/.test(f)) break;
        failed++;
        const line = src.slice(0, i).split("\n").length;
        console.log(`ПРОВАЛ ${path.relative(ROOT, f).replace(/\\/g, "/")}:${line}\n       управляющий символ с кодом ${c} лежит в файле как есть — вероятно, редактор записал escape-последовательность байтом`);
        break;
      }
    }
  }
}

console.log(failed ? `\n${failed} находок` : `Импорты на месте, управляющих символов нет (${files.length} модулей)`);
process.exit(failed ? 1 : 0);
