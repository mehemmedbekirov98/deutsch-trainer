// Починка того, что расслышал браузер чужой языковой моделью.
//
// Распознаватель в браузере слушает ОДИН язык за раз и переключаться сам не умеет (см. listen()
// в speech.js). В свободном разговоре язык микрофона выбирается по языку прошлой реплики Мии, —
// и если она ответила по-русски, а человек заговорил по-немецки, русская модель честно запишет
// немецкую речь кириллицей: «Guten Tag, Mia» превращается в «гутен так мир».
//
// Хуже того, ошибка сама себя закрепляет: langOf() относит кириллицу к русскому, свободный
// разговор на этом основании выходит из немецкого режима, и следующий ход микрофон снова
// слушает русский. Выбраться из этой петли человек не может никак.
//
// Поэтому: приводим услышанное к скелету звуков, ищем в словаре курса немецкую фразу с таким же
// скелетом — и, если нашли уверенно, возвращаем нормальное немецкое написание. Петля рвётся
// сама: langOf() видит немецкий, и режим не сбрасывается.
//
// Чего здесь нет и быть не должно — догадок. Порог стоит посреди пустоты между худшим верным
// попаданием (0.833) и лучшим ложным (0.538), а короткие одиночные слова не чинятся вовсе:
// «так» и «Tag» дают один и тот же скелет, и различить их может только контекст.
import { levenshtein } from "./utils.js";
import { LEVELS } from "./levels.js";

/*
 * Алфавит скелета — 18 символов ASCII:
 *   гласные a e i o u, полугласный j,
 *   согласные p t k f v s x h m n l r
 *
 * Аффрикаты не отдельные символы, а пары: ts = [ts] (z, ц), tx = [tʃ] (tsch, ч). Так скелеты
 * сойдутся, даже если распознаватель разложит «ч» на «тш».
 *
 * x — любой шипящий (sch, ш, ж, щ, ş). h — и [h], и [x]: иначе «их» никогда не встретится с ich.
 * Глухость снята у смычных (b/p→p, d/t→t, g/k→k) — это бесплатно даёт оглушение конца слова,
 * Tag → tak. А вот f и v НЕ сливаются, иначе vier и wir стали бы одним словом.
 * Долготы нет: кириллица её не пишет никогда, любой знак длины — гарантированный лишний разрыв.
 *
 * Пока идёт разбор, шипящий держим заглавной X и опускаем в x последним шагом: иначе он попал бы
 * под правило «x → ks», и Text с schön перепутались бы местами.
 */

/** Немецкая орфография → скелет. Порядок строк и есть смысл: каждая работает по результату предыдущей. */
const DE_RULES = [
  [/x/g, "ks"], // первым: дальше x занят под шипящий
  [/ß/g, "ss"],
  [/([aeiouäöü])h/g, "$1"], // немое h (sehen → seen) — ОБЯЗАТЕЛЬНО до ch → h, иначе сломается ich
  [/tsch/g, "tX"],
  [/dsch/g, "tX"],
  [/sch/g, "X"],
  [/chs(?!t)/g, "ks"], // sechs → seks, а machst сохраняет [x]: там дальше t
  [/^s([pt])/g, "X$1"], // только в начале слова: sprechen → xprehen, но ist остаётся ist
  [/ch/g, "h"],
  [/ph/g, "f"],
  [/th/g, "t"],
  [/ck/g, "k"],
  [/dt/g, "t"],
  [/qu/g, "kv"],
  [/ei|ai|ey|ay/g, "aj"],
  [/eu|äu/g, "oj"],
  [/ie/g, "i"],
  [/z/g, "ts"],
  [/v/g, "f"],
  [/w/g, "v"], // именно после v → f, иначе оба схлопнутся в одно
  [/ä/g, "e"],
  [/ö/g, "o"],
  [/ü/g, "u"],
  [/y/g, "i"],
  [/b/g, "p"],
  [/d/g, "t"],
  [/g/g, "k"],
];

/** Кириллица → скелет. Диграфы раньше одиночных букв. */
const CY_DIGRAPHS = [[/тш/g, "tX"], [/дж/g, "tX"], [/дз/g, "ts"]];
const CY_LETTERS = {
  а: "a", б: "p", в: "v", г: "k", д: "t", е: "je", ё: "jo", ж: "X", з: "s", и: "i",
  й: "j", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "ts", ч: "tX", ш: "X", щ: "X", ъ: "", ы: "i", ь: "",
  э: "e", ю: "ju", я: "ja",
};

/** Турецкая латиница → скелет: сюда попадает азербайджанская речь, которую сервис слушал как турецкую. */
const TR_LETTERS = {
  a: "a", b: "p", c: "tx", ç: "tx", d: "t", e: "e", ə: "e", f: "f", g: "k", ğ: "",
  h: "h", ı: "i", i: "i", j: "x", k: "k", l: "l", m: "m", n: "n", o: "o", ö: "o",
  p: "p", q: "k", r: "r", s: "s", ş: "x", t: "t", u: "u", ü: "u", v: "v", x: "h",
  y: "j", z: "s",
};

/** Общий хвост для всех трёх таблиц. */
function tail(s) {
  if (s.length >= 4) s = s.replace(/er$/, "a"); // Mutter → muta; порог длины бережёт der → ter
  s = s.replace(/(.)\1+/g, "$1"); // удвоенные согласные звука не добавляют
  return s.replace(/X/g, "x"); // снимаем внутренний маркер шипящего
}

/** Скелет одного слова. alphabet: "de" | "cyr" | "tr". */
// Апострофы заданы кодами нарочно: литеральная кавычка внутри класса сбивает сканер
// переводов (tools/i18n-report.mjs) — он начинает считать код продолжением строки.
export function skeleton(word, alphabet = "de") {
  let s = String(word || "").toLowerCase().replace(/[\u0027\u2019\u0060]/g, "");
  if (!s) return "";
  // Кириллица внутри турецкой или немецкой строки всё равно идёт по кириллической таблице.
  const cyrillic = /[а-яё]/.test(s);
  if (alphabet === "cyr" || cyrillic) {
    for (const [re, to] of CY_DIGRAPHS) s = s.replace(re, to);
    // Фильтр обязан пропускать и заглавную X: диграфы выше уже положили её в строку как маркер
    // шипящего. Пока он её выбрасывал, «энтшульдигунг» давало entultikunk вместо entxultikunk,
    // и слово не совпадало ни с чем.
    s = [...s].map((c) => (c in CY_LETTERS ? CY_LETTERS[c] : /[a-zX]/.test(c) ? c : "")).join("");
    // После согласной «j» — это русская мягкость, а не звук: «шён» → Xjon → Xon, ровно как schön.
    s = s.replace(/([ptkfvsXhmnlr])j/g, "$1");
    return tail(s);
  }
  if (alphabet === "tr") {
    s = [...s].map((c) => (c in TR_LETTERS ? TR_LETTERS[c] : /[a-z]/.test(c) ? c : "")).join("");
    return tail(s);
  }
  for (const [re, to] of DE_RULES) s = s.replace(re, to);
  return tail(s.replace(/[^a-zX]/g, ""));
}

/** Слова реплики. Апострофы УДАЛЯЕМ, а не заменяем пробелом, иначе geht's распадается надвое. */
const wordsOf = (s) => String(s || "").replace(/[\u0027\u2019\u0060]/g, "").split(/[^\p{L}]+/u).filter(Boolean);

/** Скелет фразы — слова склеены БЕЗ пробелов: так вопрос о границах слов отпадает сам. */
const phraseSkeleton = (list, alphabet) => list.map((w) => skeleton(w, alphabet)).join("");

const similar = (a, b) => {
  const max = Math.max(a.length, b.length);
  return max ? 1 - levenshtein(a, b) / max : 1;
};

/*
 * Частые родные слова — вето на починку.
 *
 * RU_STOPWORDS из brain.js для этого не годится: там нет ни «так», ни «как», ни «что», ни
 * «привет», ни «дела» — то есть ровно тех слов, на которых всё и держится.
 *
 * Вето считается ДОЛЕЙ, а не фактом: «есть хоть одно родное — не чиним» убивает главный случай,
 * ведь в «гутен так мир» слово «так» как раз из этого списка.
 */
export const NATIVE_COMMON = new Set([
  // русский
  "я", "ты", "он", "она", "оно", "мы", "вы", "они", "не", "нет", "да", "и", "а", "но", "или",
  "что", "как", "так", "это", "этот", "эта", "то", "там", "тут", "здесь", "где", "когда",
  "почему", "зачем", "кто", "мой", "твой", "наш", "ваш", "его", "её", "их", "в", "на", "с",
  "к", "по", "за", "до", "от", "из", "у", "о", "про", "для", "без", "при", "над", "под",
  "привет", "пока", "спасибо", "пожалуйста", "извини", "извините", "хорошо", "плохо", "ладно",
  "конечно", "может", "можно", "нужно", "надо", "хочу", "хочешь", "могу", "можешь", "знаю",
  "знаешь", "понял", "поняла", "понятно", "объясни", "скажи", "повтори", "ещё", "еще", "раз",
  "тоже", "очень", "много", "мало", "всё", "все", "всегда", "никогда", "сейчас", "потом",
  "уже", "дела", "дело", "урок", "слово", "слова", "вопрос", "ответ", "пример", "язык",
  "немецкий", "русский", "перевод", "давай", "давайте", "стоп", "хватит", "думаю", "кажется",
  "наверное", "точно", "правильно", "неправильно", "ошибка", "помоги", "помощь", "учить",
  "читать", "писать", "говорить", "сказать", "быть", "есть", "нравится", "люблю", "буду",
  "был", "была", "было", "будет", "какой", "какая", "какое", "который", "самый", "другой",
  "новый", "старый", "большой", "маленький", "сегодня", "завтра", "вчера", "день", "время",
  // азербайджанский
  "mən", "sən", "biz", "siz", "onlar", "bəli", "xeyr", "yox", "və", "amma", "nə", "necə",
  "belə", "bu", "burada", "orada", "harada", "niyə", "kim", "mənim", "sənin", "salam",
  "sağol", "təşəkkür", "bağışla", "yaxşı", "pis", "tamam", "əlbəttə", "bəlkə", "olar",
  "lazım", "istəyirəm", "bilirəm", "başa", "düşdüm", "izah", "təkrar", "daha", "çox",
  "az", "hamısı", "həmişə", "heç", "indi", "sonra", "artıq", "dərs", "söz", "sual", "cavab",
  "misal", "dil", "alman", "rus", "tərcümə", "kömək", "oxumaq", "yazmaq", "danışmaq",
  "olmaq", "var", "yoxdur", "sevirəm", "sabah", "dünən", "gün", "vaxt", "saat",
]);

/* ------------------------------------------------------------------ индекс курса */

let PHRASES = null; // скелет фразы без пробелов → немецкое написание
let WORDS = null; // скелет слова → { lower, upper, up, down }

/*
 * Вежливые формулы, которых в курсе нет ЦЕЛИКОМ.
 *
 * Новичок говорит Мие ровно это, а курс даёт «danke» и «schön» по отдельности — и пословная
 * починка выдаёт «Danke schon», потому что schön и schon дают один и тот же скелет (xon) и
 * различить их мерой расстояния невозможно в принципе. Учить человека неправильному написанию
 * хуже, чем не чинить вовсе, поэтому ходовые связки лежат здесь готовыми фразами.
 *
 * Это не словарь и не контент: сюда попадает только то, что человек произносит вслух целиком.
 */
const COURTESY = [
  "Danke schön", "Danke sehr", "Bitte schön", "Bitte sehr",
  "Guten Tag", "Guten Morgen", "Guten Abend", "Gute Nacht",
  "Auf Wiedersehen", "Bis später", "Bis bald", "Bis morgen",
  "Wie geht's?", "Wie geht es dir?", "Wie heißt du?", "Ich heiße",
  "Entschuldigung", "Es tut mir leid", "Alles klar", "Sehr gut",
];

/** Немецкие строки курса: слова, примеры, фразы сценариев, реплики диалогов. */
function* germanStrings() {
  yield* COURTESY;
  for (const level of LEVELS) {
    for (const v of level.vocab || []) {
      if (v.de) yield v.de;
      if (v.example) yield v.example;
    }
    for (const p of level.speaking?.phrases || []) if (p.de) yield p.de;
    for (const l of level.dialogue?.lines || []) if (l.de) yield l.de;
  }
}

/**
 * Строим один раз, при первой починке, а не при загрузке страницы: микрофоном пользуются не все,
 * а обход 36 уровней — это работа. LEVELS уже в памяти, ничего не докачивается.
 */
function buildIndex() {
  PHRASES = new Map();
  WORDS = new Map();
  for (const line of germanStrings()) {
    const list = wordsOf(line);
    if (!list.length) continue;
    const key = phraseSkeleton(list, "de");
    if (key.length >= 4 && !PHRASES.has(key)) PHRASES.set(key, line.trim());
    list.forEach((w, i) => {
      const sk = skeleton(w, "de");
      if (sk.length < 2) return;
      let rec = WORDS.get(sk);
      if (!rec) {
        rec = { lower: w.toLowerCase(), upper: null, up: 0, down: 0 };
        WORDS.set(sk, rec);
      }
      const capital = /^[A-ZÄÖÜ]/.test(w);
      if (capital && !rec.upper) rec.upper = w;
      // Голосуем только по НЕ-начальным вхождениям: иначе заглавная в начале предложения
      // записала бы в существительные и «ich», и «machst».
      if (i > 0) {
        if (capital) rec.up++;
        else rec.down++;
      }
    });
  }
}

/** Как это слово пишется на самом деле — по голосованию не-начальных вхождений. */
const surfaceOf = (rec) => (rec.up > rec.down && rec.upper ? rec.upper : rec.lower);

/* ------------------------------------------------------------------ пороги */

const PHRASE_MIN = 0.78; // худшее верное попадание — 0.833, лучшее ложное — 0.538
const PHRASE_MIN_SHORT = 0.85; // на коротком скелете одна правка весит слишком много
const SOLO_MIN_LEN = 5; // одиночное слово короче не трогаем: «так» и «Tag» неразличимы
const COVERAGE_MIN = 0.6;
const NAME_MIN = 0.6;

/** Порог для слова: чем короче скелет, тем точнее должно совпасть. */
const needWord = (n) => (n <= 4 ? 1 : n <= 6 ? 0.8 : 0.75);

/** Скелеты приветствий и прощаний: после них последнее слово — скорее всего имя. */
const GREETINGS = new Set(["kuten", "halo", "txus", "tanke", "hi"]);

function bestWord(sk) {
  if (WORDS.has(sk)) return { rec: WORDS.get(sk), score: 1 };
  let best = null;
  for (const [key, rec] of WORDS) {
    if (Math.abs(key.length - sk.length) > 2) continue;
    const s = similar(sk, key);
    if (!best || s > best.score) best = { rec, score: s };
  }
  return best;
}

function bestPhrase(key) {
  if (PHRASES.has(key)) return { text: PHRASES.get(key), score: 1 };
  let best = null;
  for (const [k, text] of PHRASES) {
    if (Math.abs(k.length - key.length) > 4) continue;
    const s = similar(key, k);
    if (!best || s > best.score) best = { text, score: s };
  }
  return best;
}

function bestOfNames(sk, names) {
  let best = null;
  for (const n of names) {
    if (!n) continue;
    const s = similar(sk, skeleton(n, "de"));
    if (s >= NAME_MIN && (!best || s > best.score)) best = { name: n, score: s };
  }
  return best?.name || null;
}

const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Починить услышанное.
 *
 * @param {string} heard         что записал распознаватель
 * @param {object} opts
 * @param {string} opts.alphabet "cyr" | "tr" | "de" — чем слушали, а не что видно в буквах
 * @param {string[]} opts.names  имена собеседников: «Mia» и имя человека
 * @returns {{ text: string, changed: boolean, raw: string }}
 */
export function repairGerman(heard, { alphabet = "cyr", names = [] } = {}) {
  const raw = String(heard || "").trim();
  const no = { text: raw, changed: false, raw };
  if (!raw || alphabet === "de") return no;
  if (!PHRASES) buildIndex();

  const list = wordsOf(raw);
  if (!list.length) return no;

  const native = list.filter((w) => NATIVE_COMMON.has(w.toLowerCase())).length;

  // Одно слово. Родное не трогаем никогда; чужое — только при точном совпадении и длине от пяти.
  if (list.length === 1) {
    const w = list[0];
    if (NATIVE_COMMON.has(w.toLowerCase())) return no;
    const sk = skeleton(w, alphabet);
    if (sk.length < SOLO_MIN_LEN) return no;
    const hit = WORDS.get(sk);
    if (!hit) return no;
    const text = capitalise(surfaceOf(hit));
    return { text, changed: text !== raw, raw };
  }

  // Родная речь: половина слов и больше — из частых. Не «хоть одно»: тогда «гутен ТАК мир»
  // осталось бы кириллицей, а это и есть главный случай, ради которого всё затевалось.
  if (native >= 2 && native / list.length >= 0.5) return no;

  // Сначала — фразой целиком. Склейка без пробелов снимает вопрос границ слов: «данке шён»
  // (два слова) совпадёт и с Dankeschön (одним).
  const key = phraseSkeleton(list, alphabet);
  const phrase = key.length >= 4 ? bestPhrase(key) : null;
  if (phrase) {
    // Распознаватель может склеить или разорвать слова — «данке шён» против Dankeschön, — поэтому
    // расхождение на одно слово допустимо. Но дописывать человеку то, чего он не говорил, нельзя:
    // «ихь бин эмиль» совпадало с курсовым «Ja, ich bin Emil.» на 0.818 и выдавало лишнее «Ja».
    // Разошлось число слов — спрашиваем строже; разошлось больше чем на одно — не фраза.
    const diff = Math.abs(wordsOf(phrase.text).length - list.length);
    const need = key.length <= 8 || diff ? PHRASE_MIN_SHORT : PHRASE_MIN;
    if (diff <= 1 && phrase.score >= need) return { text: phrase.text, changed: phrase.text !== raw, raw };
  }

  // Иначе пословно, и заменяем ТОЛЬКО то, что совпало: остальное человек увидит как сказал.
  const out = [];
  let judged = 0;
  let matched = 0;
  list.forEach((w, i) => {
    const sk = skeleton(w, alphabet);
    if (sk.length < 2) {
      out.push(w);
      return;
    }
    judged++;
    // Имя в конце приветствия: «Mia» проигрывает слову «mir» (1.0 против 0.667) при любых
    // весах, так что решает позиция, а не похожесть.
    if (i === list.length - 1 && GREETINGS.has(skeleton(list[0], alphabet))) {
      const named = bestOfNames(sk, names);
      if (named) {
        out.push(named);
        matched++;
        return;
      }
    }
    const hit = bestWord(sk);
    if (hit && hit.score >= needWord(sk.length)) {
      out.push(surfaceOf(hit.rec));
      matched++;
      return;
    }
    out.push(w);
  });

  if (matched < 2 || !judged || matched / judged < COVERAGE_MIN) return no;
  const text = capitalise(out.join(" "));
  return { text, changed: text !== raw, raw };
}
