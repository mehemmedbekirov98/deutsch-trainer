// Не утекло ли что-нибудь — в рабочую копию и во всю историю git.
//
//   node tools/check-secrets.mjs
//
// Ключ, один раз попавший в коммит, остаётся в репозитории навсегда: удалить файл следующим
// коммитом недостаточно, `git log -p` всё равно его покажет, а публичный репозиторий читают
// роботы. Поэтому смотрим не только то, что лежит сейчас, но и каждый блоб в истории.
//
// Что ищем: служебный ключ Supabase (он обходит все правила доступа), ключ Anthropic (это деньги),
// JWT, приватные ключи, строки подключения к Postgres с паролем.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });

const PATTERNS = [
  ["ключ Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["служебный ключ Supabase (новый формат)", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ["ключ Supabase в формате JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ["приватный ключ", /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ["строка подключения к Postgres с паролем", /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/],
  ["токен GitHub", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["ключ AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["пароль или токен прямо в коде", /(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"'\s]{12,}["']/i],
];

// Учебные тексты: «token» в объяснении грамматики и заглушки в примерах — не утечка.
const ALLOW = [
  /sk-ant-\.\.\./,
  /sk-ant-api03-xxx/i,
  /your[-_]?key/i,
  /вставь сюда/i,
  /<[A-Z_]{3,}>/,
  /example\.com/,
];

const isAllowed = (line) => ALLOW.some((re) => re.test(line));

let failed = 0;
const hit = (where, what, line) => {
  failed++;
  // Само значение НЕ печатаем: вывод этой проверки может попасть в лог сборки.
  console.log(`НАЙДЕНО  ${what}\n         ${where}\n         …${line.replace(/[A-Za-z0-9_-]{12,}/g, "***").trim().slice(0, 120)}`);
};

/* ------------------------------------------------- 1. что лежит в рабочей копии и под git */
const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
for (const rel of tracked) {
  const p = path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(p, "utf8"); } catch { continue; }
  if (src.includes("\0")) continue;
  for (const [what, re] of PATTERNS) {
    for (const line of src.split("\n")) {
      if (re.test(line) && !isAllowed(line)) { hit(rel, what, line); break; }
    }
  }
}

/* ------------------------------------------------- 2. что осталось в истории */
// Каждый блоб, который когда-либо был закоммичен. Файл, удалённый год назад, здесь всё ещё есть.
const objects = git("rev-list", "--objects", "--all").split("\n").filter(Boolean);
const blobs = [];
for (const line of objects) {
  const sp = line.indexOf(" ");
  if (sp < 0) continue;
  const sha = line.slice(0, sp);
  const name = line.slice(sp + 1);
  if (/\.(png|jpg|jpeg|gif|webp|mp3|mp4|woff2?|ttf|ico|zip|pdf)$/i.test(name)) continue;
  blobs.push([sha, name]);
}

// Разом: батч-чтение вместо тысячи запусков git.
const input = blobs.map(([sha]) => sha).join("\n") + "\n";
const raw = execFileSync("git", ["cat-file", "--batch"], { cwd: ROOT, input, maxBuffer: 1 << 28 });

let off = 0;
let scanned = 0;
for (const [, name] of blobs) {
  const nl = raw.indexOf("\n", off);
  if (nl < 0) break;
  const header = raw.toString("utf8", off, nl);
  const size = Number(header.split(" ")[2]);
  const start = nl + 1;
  if (!Number.isFinite(size)) break;
  const body = raw.toString("utf8", start, start + size);
  off = start + size + 1;
  scanned++;
  if (size > 2_000_000) continue;
  for (const [what, re] of PATTERNS) {
    const m = body.match(re);
    if (m && !isAllowed(m[0]) && !isAllowed(body.split("\n").find((l) => l.includes(m[0])) || "")) {
      hit(`в истории git: ${name}`, what, m[0]);
      break;
    }
  }
}

/* ------------------------------------------------- 3. что точно не должно быть под git */
const FORBIDDEN = [/^\.env$/, /^\.env\.local$/, /^\.claude\/settings\.local\.json$/, /^supabase\/\.temp\//, /^DEPLOY\.local\.md$/, /^\.netlify\//];
for (const rel of tracked) {
  if (FORBIDDEN.some((re) => re.test(rel))) { failed++; console.log(`НАЙДЕНО  файл под git, хотя не должен быть\n         ${rel}`); }
}

console.log(`\nпросмотрено: ${tracked.length} файлов сейчас, ${scanned} версий в истории`);
console.log(failed ? `\n${failed} НАХОДОК — деплоить нельзя` : "Ключей и личных файлов ни в коде, ни в истории git нет");
process.exit(failed ? 1 : 0);
