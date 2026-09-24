// Small DOM + text helpers shared by all modules
import { translateText, plural as pluralI18n } from "./i18n.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const TRANSLATED_ATTRS = new Set(["title", "placeholder", "aria-label", "alt"]);

/** Create an element: el('div', {class:'x', onClick: fn, dataset:{id:1}}, child, 'text') */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style" && typeof v === "object") {
      // Object.assign cannot set a custom property: node.style["--accent"] just creates a JS
      // expando and never reaches the element, which silently killed every level colour and
      // every staggered --i animation delay in the app.
      for (const [prop, val] of Object.entries(v)) {
        if (val === null || val === undefined) continue;
        if (prop.startsWith("--")) node.style.setProperty(prop, String(val));
        else node.style[prop] = val;
      }
    }
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    // Ветки `html:` здесь больше нет. Ей никто не пользовался, а innerHTML в общем помощнике —
    // это мина: первый же вызов с чужим текстом (именем из рейтинга, репликой Мии) становится
    // дырой, и заметить это при чтении вызова невозможно. Нужна разметка — собирай из el().
    // Подписи, которые видит человек, а не разметка: их тоже надо переводить.
    else if (TRANSLATED_ATTRS.has(k)) node.setAttribute(k, translateText(String(v)));
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    // Здесь и происходит перевод интерфейса. Весь текст на экране рождается этой строкой, так
    // что одного места достаточно — и ни одна надпись не может «забыть» перевестись.
    node.append(c instanceof Node ? c : document.createTextNode(translateText(String(c))));
  }
  return node;
}

/**
 * Подставить имя того, кто сейчас занимается, вместо учебного «Эмиля».
 *
 * Курс писался для одного человека, и его имя осталось в сотне реплик Мии: «Привет, Эмиль!»,
 * «Immer gern, Emil.». Сайтом теперь пользуются разные люди, и каждому из них Мия говорила чужое
 * имя. Переписывать сами реплики нельзя: их русский текст — это ключи словаря для
 * азербайджанского, и любая правка обрывает перевод. Поэтому подстановка делается на выходе,
 * прямо перед тем как строку показать и произнести, — и работает одинаково на всех трёх языках.
 *
 * Если имени нет (гость, который его не вводил), обращение убирается целиком: «Привет!» — это
 * нормальная фраза, а «Привет, Ученик!» — нет.
 *
 * ВНИМАНИЕ: `\b` здесь не работает. В JavaScript граница слова считается по ASCII, и перед «Э»
 * её попросту нет — `\bЭмиль` не совпадёт ни разу. Поэтому границы заданы явно, через отсутствие
 * буквы любого алфавита слева и справа.
 */
// Заменяется ТОЛЬКО обращение — имя, которым окликают. Не всякое вхождение.
//
// Первая версия ловила имя где угодно, и «Ich heiße Emil und wohne in Berlin.» превращалось в
// «Ich heiße und wohne in Berlin.»: сломанный немецкий внутри того самого предложения, которое
// Мия объясняет. Эмиль ещё и персонаж курса — он ходит на работу, снимает квартиру, спорит с
// ведомством в тридцати шести уроках, и трогать его там нельзя.
//
// Обращение узнаётся по трём приметам, других не бывает:
//   1. отделено запятой и кончает предложение — «Привет, Эмиль!», «Immer gern, Emil.»
//   2. стоит первым и отделено запятой — «Эмиль, иди сюда»
//   3. идёт сразу за приветствием — «Hallo Emil!», «Salam Emil!»
//
// `\b` здесь не работает: в JavaScript граница слова считается по ASCII, и перед «Э» её нет.
// Границы заданы явно — отсутствием буквы любого алфавита слева и справа.
const NAME = "(?:Эмиль|Emil)";
const GREETING = "(?:Hallo|Hi|Hey|Guten\\s+(?:Morgen|Tag|Abend)|Gute\\s+Nacht|Tschüss|Salam|Privet|Привет|Здравствуй|Здравствуйте|Салам)";
const VOCATIVE = [
  // «…, Эмиль!» — запятая слева, конец предложения справа
  new RegExp(`(\\s*,\\s*)${NAME}(?=\\s*[.!?…]|\\s*$)`, "gu"),
  // «Эмиль, …» — имя первым, запятая справа. Группа пустая, но нужна: без неё replace передаёт
  // вторым аргументом смещение, и в текст подставлялся ноль — «0Tural, komm bitte her.»
  new RegExp(`^()${NAME}(?=\\s*,)`, "u"),
  // «Hallo Emil!» — сразу за приветствием
  new RegExp(`(${GREETING}\\s+)${NAME}(?![\\p{L}\\p{N}@])`, "giu"),
];
const PLACEHOLDER_NAMES = new Set(["", "emil", "эмиль", "ученик", "şagird", "sagird"]);

export function personalise(text, name) {
  const s = String(text ?? "");
  if (!s) return s;
  const clean = String(name ?? "").trim();
  const real = clean && !PLACEHOLDER_NAMES.has(clean.toLowerCase());
  // `lead` — то, чем обращение отделено слева (запятая или приветствие). С именем оно сохраняется
  // («, Эмиль» → «, Руслан»), без имени запятая уходит вместе с именем, а приветствие остаётся:
  // «Привет!» — нормальная фраза, «Привет,!» — нет.
  let out = s;
  for (const re of VOCATIVE) {
    out = out.replace(re, (m, lead = "") => {
      if (real) return lead + clean;
      return /^\s*,/.test(lead) ? "" : lead;
    });
  }
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?:;])/g, "$1")
    .trim();
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Normalise an answer for forgiving comparison (case, punctuation, ß/ss, umlaut spellings, ё/е). */
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ё/g, "е")
    .replace(/[.,!?;:"'`´«»„“”‚‘’()\[\]\-–—…]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Levenshtein distance */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/** 0..1 similarity of two already-normalised strings */
export function similarity(a, b) {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (!max) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Similarity of spoken text vs a target, tolerant of digits-for-words from speech recognition */
export function spokenSimilarity(heard, target) {
  const h = normalize(heard), t = normalize(target);
  const direct = similarity(h, t);
  const spelled = similarity(normalize(digitsToWords(heard)), t);
  return Math.max(direct, spelled);
}

/**
 * Compare a learner answer to a list of accepted answers.
 * returns { ok, exact, best, score } — ok when exact, or close enough that only a typo separates them.
 * tolerance >= 1 demands an exact (normalised) match — use it where the ending IS the answer
 * (verb conjugation, articles), because there one wrong letter is a grammar mistake, not a typo.
 */
export function matchAnswer(given, accepted, tolerance = 0.86) {
  const g = normalize(given);
  let best = { score: 0, answer: accepted[0] };
  for (const a of accepted) {
    const n = normalize(a);
    if (n === g) return { ok: true, exact: true, best: a, score: 1 };
    const s = similarity(g, n);
    if (s > best.score) best = { score: s, answer: a };
  }
  if (tolerance >= 1) return { ok: false, exact: false, best: best.answer, score: best.score };
  // short answers need to be exact-ish; long ones tolerate a typo
  const need = g.length <= 4 ? 1 : g.length <= 8 ? 0.9 : tolerance;
  const ok = best.score >= need && !endingDiffers(g, normalize(best.answer));
  return { ok, exact: false, best: best.answer, score: best.score };
}

// German inflection endings: swapping one of these for another is a grammar mistake, not a typo.
const ENDINGS = ["", "e", "en", "er", "es", "em", "et", "st", "t", "n", "s", "te", "ten", "ung"];

/**
 * True when two words share a stem and differ only by swapping one German ending for another
 * ("wohnt" vs "wohne", "spricht" vs "sprichst"). A scrambled letter inside the word
 * ("Moskua" vs "Moskau") is a typo and returns false.
 */
function isInflectionSwap(x, y) {
  const n = Math.min(x.length, y.length);
  let common = 0;
  while (common < n && x[common] === y[common]) common++;
  if (common < 2) return false; // not even a shared stem
  const tx = x.slice(common), ty = y.slice(common);
  if (tx === ty) return false;
  // the differing tails must both look like endings, and the shared stem must be most of the word
  return ENDINGS.includes(tx) && ENDINGS.includes(ty) && common >= Math.max(2, Math.floor(Math.max(x.length, y.length) * 0.5));
}

/**
 * True when the two sentences differ only in a word ending — i.e. a grammar mistake
 * ("Ich wohnt in Moskau" vs "Ich wohne in Moskau"), which must never pass as a typo.
 */
function endingDiffers(a, b) {
  const wa = a.split(" "), wb = b.split(" ");
  if (wa.length !== wb.length) return false;
  for (let i = 0; i < wa.length; i++) {
    if (wa[i] !== wb[i] && isInflectionSwap(wa[i], wb[i])) return true;
  }
  return false;
}

const DIGIT_WORDS = ["null", "eins", "zwei", "drei", "vier", "fuenf", "sechs", "sieben", "acht", "neun"];

/** Speech recognition writes spoken numbers as digits ("null eins sieben" → "017"): spell them back out. */
export function digitsToWords(s) {
  return String(s ?? "").replace(/\d+/g, (num) => {
    const perDigit = () => num.split("").map((d) => DIGIT_WORDS[+d]).join(" ");
    // leading zero or a long run: it was dictated digit by digit (phone numbers, postcodes)
    if (num.length > 4 || num[0] === "0") return perDigit();
    const n = Number(num);
    return n <= 9 ? DIGIT_WORDS[n] : germanNumber(n) || perDigit();
  });
}

const ONES = ["", "ein", "zwei", "drei", "vier", "fuenf", "sechs", "sieben", "acht", "neun"];
const TEENS = ["zehn", "elf", "zwoelf", "dreizehn", "vierzehn", "fuenfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreissig", "vierzig", "fuenfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

/** German number word for 0..999 in normalised spelling (used only for comparison, not display) */
export function germanNumber(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  if (n === 0) return "null";
  if (n === 1) return "eins";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return o ? `${ONES[o]}und${TENS[t]}` : TENS[t];
  }
  const h = Math.floor(n / 100), rest = n % 100;
  const hw = `${h === 1 ? "ein" : ONES[h]}hundert`;
  return rest ? hw + germanNumber(rest) : hw;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a, b) {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db - da) / 86400000);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * «5 дней», «2 дня», «1 день» — и «5 gün» без всякого согласования.
 *
 * Азербайджанский существительное после числа не меняет, поэтому там три формы схлопываются в
 * одну; решает это i18n, здесь остаётся только русская арифметика.
 */
export const plural = pluralI18n;

/** Strip a leading article from a German vocab entry: "der Name" -> "Name" */
export function stripArticle(de) {
  return String(de).replace(/^(der|die|das)\s+/i, "");
}
export function articleOf(de) {
  const m = String(de).match(/^(der|die|das)\s+/i);
  return m ? m[1].toLowerCase() : null;
}

/** Append children to a parent, skipping null/undefined/false (unlike Node.append which would print "null") */
export function append(parent, ...children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    parent.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return parent;
}

/** Run fn on the next frame, with a timer fallback so it also runs when the tab is hidden (rAF is paused there) */
export function nextTick(fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(run);
  setTimeout(run, 40);
}
