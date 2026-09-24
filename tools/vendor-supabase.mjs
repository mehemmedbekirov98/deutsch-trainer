// Забрать Supabase к себе.
//
//   node tools/vendor-supabase.mjs [версия]
//
// Раньше вход грузился так: `import("https://esm.sh/@supabase/supabase-js@2")`. Два следствия, оба
// плохие. Первое: сайт не работает, когда не работает esm.sh — а это чужой сервис, которому мы не
// платим и на который не влияем. Второе, серьёзнее: этот скрипт исполняется на нашей странице
// РЯДОМ с полем пароля. Подменят файл на той стороне — и пароли всех, кто вошёл, уедут куда
// угодно, а мы об этом не узнаем. Версия «@2» вдобавок плавающая: назавтра приезжает другой код.
//
// Поэтому библиотека лежит в public/vendor/ как обычный файл сайта. Content-Security-Policy после
// этого не разрешает сторонние скрипты вообще — ни одного.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "vendor");
const version = process.argv[2] || "2.117.1";
const ORIGIN = "https://esm.sh";

// Плоское имя файла из адреса: /@supabase/auth-js@2/es2022/auth-js.mjs → _supabase_auth-js@2_es2022_auth-js.js
//
// Расширение .js, а не .mjs, и не ради вкуса: локальный сервер предпросмотра отдавал .mjs как
// application/octet-stream, и браузер отказывался выполнять файл как модуль. Какой тип поставит
// хостинг — заранее не знаешь, а .js знают все. Одной поломкой, случающейся только после
// выкладки, меньше.
const flat = (p) => p.replace(/^\//, "").replace(/[/]/g, "_").replace(/\.mjs$/, ".js");

const seen = new Map(); // url path → flat name
const queue = [];

async function fetchText(p) {
  const r = await fetch(ORIGIN + p, { redirect: "follow" });
  if (!r.ok) throw new Error(`${p} → ${r.status}`);
  return await r.text();
}

const entryPath = `/@supabase/supabase-js@${version}?bundle&target=es2022`;
let entry = await fetchText(entryPath);

/** Переписать каждый абсолютный импорт esm.sh на соседний файл и добавить его в очередь. */
function rewrite(src) {
  return src.replace(/((?:from|import)\s*)"(\/[^"]+)"/g, (m, kw, p) => {
    if (!seen.has(p)) { seen.set(p, flat(p)); queue.push(p); }
    return `${kw}"./${seen.get(p)}"`;
  });
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "supabase-js.js"), rewrite(entry), "utf8");

let bytes = entry.length;
const written = ["supabase-js.js"];
while (queue.length) {
  const p = queue.shift();
  const src = await fetchText(p);
  const name = seen.get(p);
  fs.writeFileSync(path.join(OUT, name), rewrite(src), "utf8");
  written.push(name);
  bytes += src.length;
  if (written.length > 60) throw new Error("слишком большое дерево зависимостей — вендоринг не подходит");
}

// Откуда это взялось — чтобы через год было понятно, что обновлять и чем.
fs.writeFileSync(path.join(OUT, "README.md"),
  `# public/vendor\n\n` +
  `Supabase JS \`${version}\`, собранный esm.sh и положенный сюда файлами сайта.\n\n` +
  `Это не наш код и править его руками нельзя. Обновление — одной командой:\n\n` +
  "```bash\nnode tools/vendor-supabase.mjs 2.117.1\n```\n\n" +
  `Зачем не с CDN: скрипт исполняется на странице с полем пароля. Пока он наш файл, подменить\n` +
  `его может только тот, кто уже имеет доступ к нашему репозиторию. Content-Security-Policy в\n` +
  `netlify.toml поэтому не разрешает сторонние скрипты вообще — если вернуть CDN, надо вернуть и\n` +
  `разрешение, и понимать, что вы разрешаете.\n\n` +
  `Файлов: ${written.length}, всего ${(bytes / 1024).toFixed(0)} КБ.\n`,
  "utf8");

console.log(`Supabase ${version}: ${written.length} файлов, ${(bytes / 1024).toFixed(0)} КБ → public/vendor/`);
for (const w of written) console.log("  " + w);
