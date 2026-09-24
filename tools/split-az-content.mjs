// Разрезать азербайджанский словарь уроков на то, что нужно сразу, и то, что нужно потом.
//
//   node tools/split-az-content.mjs
//
// Словарь уроков — 236 КБ в сжатом виде, и он приезжал целиком ещё до первой отрисовки. То есть
// человек, выбравший азербайджанский, ждал четверть мегабайта, чтобы увидеть главный экран, на
// котором из этого словаря используется 213 строк: названия уроков, их темы и цели. Всё
// остальное — слова, грамматика, задания, реплики диалога — нужно только когда урок откроют.
//
// Получается:
//   az-content-index.js   — 15 КБ, грузится сразу
//   az-content-NN.js      — по 7 КБ на урок, грузится при входе в урок
//
// Исходник лежит в tools/i18n-source/az-content.js: он собирается конвейером перевода и служит здесь
// входными данными. Резать надо ПОСЛЕ каждого обновления перевода.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "public", "js", "i18n");
// Исходный словарь лежит ВНЕ public: его никто не скачивает, а в папке сайта это 870 КБ,
// которые уезжают на хостинг при каждой выкладке мёртвым грузом.
const SRC = path.join(ROOT, "tools", "i18n-source");

const { LEVELS } = await import(pathToFileURL(path.join(ROOT, "public", "js", "levels.js")).href);
const dict = (await import(pathToFileURL(path.join(SRC, "az-content.js")).href)).default;

// Те же служебные поля, что пропускает walk() в i18n.js: это не текст, а устройство урока.
const SKIP = new Set(["id", "emoji", "cefr", "color", "type", "voice", "speaker"]);

/** Все переводимые строки поддерева — обход повторяет walk() из i18n.js один в один. */
function strings(node, key = "", out = new Set()) {
  if (Array.isArray(node)) {
    for (const v of node) {
      if (typeof v === "string") { if (!SKIP.has(key)) out.add(v); }
      else if (v && typeof v === "object") strings(v, key, out);
    }
    return out;
  }
  if (!node || typeof node !== "object") return out;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === "string") { if (!SKIP.has(k)) out.add(v); }
    else if (v && typeof v === "object") strings(v, k, out);
  }
  return out;
}

// Видно до того, как урок откроют: карта уровней, главный экран, заголовки в тренировке — и
// список сценариев на экране Мии, который показывает названия разговоров из ВСЕХ открытых
// уроков сразу. Ради трёх слов тянуть тридцать шесть файлов было бы глупо, поэтому они здесь.
const upfront = new Set();
for (const l of LEVELS) {
  for (const s of [l.titleRu, l.intro, l.speaking?.title, ...(l.goals || [])]) {
    if (typeof s === "string") upfront.add(s);
  }
}

const HEADER = (what) => `// Азербайджанский словарь: ${what}.
//
// Собран автоматически: node tools/split-az-content.mjs. Руками не править — следующая сборка
// перезапишет. Источник — az-content.js, он и есть то, что правит конвейер перевода.
//
// Символ \\u0001 внутри ключа — место подстановки в шаблонной строке.

`;

const CHECK = process.argv.includes("--check");
const stale = [];

const write = (name, obj, what) => {
  const body = Object.entries(obj).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n");
  const text = HEADER(what) + "export default {\n" + body + "\n};\n";
  const at = path.join(DIR, name);
  if (CHECK) {
    // Ничего не пишем — только сравниваем. Первая версия этого режима всё-таки писала, и
    // проверка «не отстали ли куски» всегда отвечала «совпадают»: она сама же их и обновляла.
    const had = fs.existsSync(at) ? fs.readFileSync(at, "utf8") : null;
    if (had !== text) stale.push(name);
  } else {
    fs.writeFileSync(at, text, "utf8");
  }
  return { bytes: text.length, gz: zlib.gzipSync(Buffer.from(text, "utf8")).length, rows: Object.keys(obj).length };
};

const pick = (keys) => Object.fromEntries([...keys].filter((k) => dict[k] !== undefined).map((k) => [k, dict[k]]));

// старые куски убираем, чтобы удалённый урок не оставил за собой файл-призрак
if (!CHECK) for (const f of fs.readdirSync(DIR)) if (/^az-content-/.test(f)) fs.unlinkSync(path.join(DIR, f));

const idx = write("az-content-index.js", pick(upfront), "названия уроков, темы и цели");
let sum = 0, biggest = 0;
for (const l of LEVELS) {
  const own = new Set([...strings(l)].filter((s) => !upfront.has(s)));
  const nn = String(l.id).padStart(2, "0");
  const r = write(`az-content-${nn}.js`, pick(own), `урок ${l.id} — ${l.titleRu}`);
  sum += r.gz;
  biggest = Math.max(biggest, r.gz);
}

if (CHECK) {
  // файл-призрак тоже расхождение: урок удалили, а его словарь остался лежать
  const want = new Set(["az-content-index.js", ...LEVELS.map((l) => `az-content-${String(l.id).padStart(2, "0")}.js`)]);
  for (const f of fs.readdirSync(DIR)) if (/^az-content-/.test(f) && !want.has(f)) stale.push(f + " (лишний)");
  if (stale.length) {
    console.log(`Разрезанные словари отстали от исходника — ${stale.length} файлов:`);
    for (const f of stale.slice(0, 8)) console.log("    · " + f);
    if (stale.length > 8) console.log(`    … и ещё ${stale.length - 8}`);
    console.log("\nПочинить: npm run split");
    process.exit(1);
  }
  console.log(`Разрезанные словари совпадают с исходником (${LEVELS.length + 1} файлов)`);
  process.exit(0);
}

const whole = zlib.gzipSync(Buffer.from(fs.readFileSync(path.join(SRC, "az-content.js"))));
console.log(`было при заходе: ${(whole.length / 1024).toFixed(0)} КБ сжатых (${Object.keys(dict).length} строк)`);
console.log(`стало при заходе: ${(idx.gz / 1024).toFixed(1)} КБ (${idx.rows} строк)`);
console.log(`по урокам: ${LEVELS.length} файлов, ${(sum / 1024).toFixed(0)} КБ суммарно, самый большой ${(biggest / 1024).toFixed(1)} КБ`);

/* ------------------------------------------------------------------ не отстали ли куски
 *
 * `--check` ничего не пишет, а только сравнивает: то же ли сейчас в кусках, что получилось бы
 * при резке. Нужно потому, что правку перевода легко сделать и забыть перерезать — и сайт будет
 * месяцами отдавать старое, а отчёт о полноте покажет 100%: он читает как раз куски.
 */
