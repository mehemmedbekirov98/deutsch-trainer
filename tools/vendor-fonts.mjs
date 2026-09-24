// Забрать шрифты к себе.
//
//   node tools/vendor-fonts.mjs
//
// Раньше в <head> стоял <link> на fonts.googleapis.com. Это значит, что адрес каждого, кто просто
// открыл страницу, уходил в Google — до всякого согласия, до входа, вообще до первого действия.
// Заодно это третья сторона на критическом пути: пока их таблица стилей не приехала, текста нет.
//
// Файлы шрифтов лежат теперь в public/fonts, а @font-face — в собственном style.css. Content-
// Security-Policy после этого не разрешает ни сторонних стилей, ни сторонних шрифтов: сайт не
// ходит наружу ни за чем, кроме своей же базы.
//
// Лицензия обоих шрифтов — SIL Open Font License 1.1: класть к себе и раздавать можно.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "fonts");

const CSS_URL = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap";
// Современный браузер получает от Google woff2 и только нужные диапазоны символов. Именно это
// нам и нужно: и латиница, и кириллица приезжают отдельными файлами, лишнего человек не качает.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

fs.mkdirSync(OUT, { recursive: true });

const css = await fetch(CSS_URL, { headers: { "user-agent": UA } }).then((r) => {
  if (!r.ok) throw new Error(`css → ${r.status}`);
  return r.text();
});

// Каждый @font-face у Google идёт со своим комментарием — /* cyrillic */, /* latin-ext */ и так
// далее. Комментарий берётся вместе с блоком, одним выражением: искать его отдельным поиском по
// тексту нельзя — «последний перед блоком» так не находится, и все поддиапазоны одного начертания
// получали одно имя файла и затирали друг друга.
let out = [];
let count = 0;
let bytes = 0;

// Греческий и вьетнамский нам не нужны: сайт объясняет по-русски и по-азербайджански, а учит
// немецкому. Азербайджанские ə, ğ, ı, ş живут в latin-ext, так что этих четырёх хватает на всё.
// Браузер всё равно скачал бы только нужное — но и в репозитории лишнему делать нечего.
const SUBSETS = new Set(["latin", "latin-ext", "cyrillic", "cyrillic-ext"]);

for (const m of css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g)) {
  const subset = m[1];
  if (!SUBSETS.has(subset)) continue;
  const block = m[2];
  const family = (block.match(/font-family:\s*'([^']+)'/) || [])[1] || "font";
  const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || "400";
  const style = (block.match(/font-style:\s*(\w+)/) || [])[1] || "normal";
  const url = (block.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  if (!url) continue;

  const name = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}-${subset}.woff2`;
  const buf = Buffer.from(await fetch(url, { headers: { "user-agent": UA } }).then((r) => r.arrayBuffer()));
  fs.writeFileSync(path.join(OUT, name), buf);
  count++;
  bytes += buf.length;

  const unicodeRange = (block.match(/unicode-range:\s*([^;}]+)/) || [])[1];
  out.push([
    "@font-face {",
    `  font-family: '${family}';`,
    `  font-style: ${style};`,
    `  font-weight: ${weight};`,
    "  font-display: swap;",
    `  src: url('../fonts/${name}') format('woff2');`,
    unicodeRange ? `  unicode-range: ${unicodeRange.trim()};` : null,
    "}",
  ].filter(Boolean).join("\n"));
}

const header = `/*
 * Шрифты сайта — свои файлы, не Google.
 *
 * Собрано автоматически: node tools/vendor-fonts.mjs. Руками не править.
 * Manrope и Inter, обе под SIL Open Font License 1.1.
 *
 * Зачем не с fonts.googleapis.com: <link> туда отправлял адрес каждого посетителя в Google ещё
 * до того, как он что-либо нажал, и держал отрисовку текста на чужом сервере.
 */
`;
fs.writeFileSync(path.join(ROOT, "public", "css", "fonts.css"), header + out.join("\n\n") + "\n", "utf8");

console.log(`Шрифты: ${count} файлов, ${(bytes / 1024).toFixed(0)} КБ → public/fonts/`);
console.log(`Описания @font-face → public/css/fonts.css`);
