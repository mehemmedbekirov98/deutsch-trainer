// Mia's offline brain: understands what Emil said (Russian or German) and decides what she answers,
// entirely from local data. Used whenever the AI backend is off, so the app is fully usable without a key.
import { t as tr, lang as uiLang, azOf } from "./i18n.js";
import { normalize, pick, shuffle, stripArticle } from "./utils.js";
import { LEVELS } from "./levels.js";
import SMALLTALK from "./brain-data/smalltalk.js";
import QUESTIONS from "./brain-data/questions.js";
import SITEHELP from "./brain-data/sitehelp.js";

/* ------------------------------------------------------------------ lexicon */
// A parenthetical gloss explains a headword, it is not one itself: "приходить; быть родом
// (kommen aus — быть из)" must not register its German half as a Russian key.
const NO_GLOSS = /[(][^)]*[)]/g;

// Every German word Emil has met, indexed both ways, so Mia can answer "что значит X" for ~380 words.
const VOCAB_DE = new Map();
const VOCAB_RU = new Map();
for (const level of LEVELS) {
  for (const v of level.vocab) {
    const de = normalize(stripArticle(v.de));
    if (!VOCAB_DE.has(de)) VOCAB_DE.set(de, { ...v, level });
    // multi-word entries ("arbeiten als", "Rad fahren") are also findable by each word
    for (const part of de.split(" ")) if (part.length > 3 && !VOCAB_DE.has(part)) VOCAB_DE.set(part, { ...v, level });
    // the parenthetical gloss is an explanation, not a headword: "приходить; быть родом
    // (kommen aus — быть из)" must not register the German half as a Russian key
    for (const part of String(v.ru).replace(NO_GLOSS, " ").split(/[,;/]/)) {
      const ru = normalize(part);
      if (ru.length > 2 && !VOCAB_RU.has(ru)) VOCAB_RU.set(ru, { ...v, level });
    }
  }
}
const GRAMMAR = LEVELS.flatMap((l) => l.grammar.map((g) => ({ ...g, level: l })));

/**
 * Азербайджанский указатель слов — лениво, при первом обращении.
 *
 * Строится из того же перевода, которым живёт весь сайт: подпись к немецкому слову уже лежит
 * в словаре, её достаточно там найти. Ни одной новой строки данных — и указатель физически не
 * может разойтись с тем, что человек видит на карточке.
 *
 * Лениво — потому что словари грузятся асинхронно, уже после того как этот модуль выполнился.
 * Если строить сразу, указатель всегда оставался бы пустым, и это молча: слово просто не
 * находится, а почему — не видно.
 */
let vocabAz = null;

/** Сбросить указатель — для проверки, которая переводит уроки уже после его постройки. */
export function resetBrainIndex() { vocabAz = null; }

function vocabAzIndex() {
  if (vocabAz) return vocabAz;
  const map = new Map();
  for (const level of LEVELS) {
    for (const v of level.vocab) {
      // Переводим подпись целиком, а уже перевод режем: ключ словаря — вся строка, и
      // «жена; женщина» по кускам в нём не нашлось бы.
      //
      // В азербайджанском режиме переводить нечего: translateLevels() уже прошёлся по данным,
      // и подпись азербайджанская. Тогда azOf() вернёт null — берём её как есть.
      const az = azOf(String(v.ru)) || (uiLang() === "az" ? String(v.ru) : null);
      if (!az) continue;
      for (const part of az.replace(NO_GLOSS, " ").split(/[,;/]/)) {
        const key = normalize(part);
        // порог ниже русского: «ev», «su», «il», «göz» — обычные слова курса, а не предлоги
        if (key.length > 1 && !map.has(key)) map.set(key, { ...v, level });
      }
    }
  }
  // пока словарь не загружен, карта пустая — не запоминаем её, попробуем на следующем вопросе
  if (map.size) vocabAz = map;
  return map;
}

/* ---------------------------------------------------------------- matching */
const has = (text, fragments) => fragments.some((f) => text.includes(normalize(f)));

/**
 * Find the entry whose `match` fragments fit best.
 *
 * Plain substring matching was far too literal: Emil writes "а ты что любишь есть?" and the stored
 * fragment is "что ты любишь есть" — one word out of order and she had nothing to say. So a
 * fragment also counts when its content words all appear somewhere in what he wrote, and half of
 * them still counts for less. An exact phrase always outscores a scattered one, so the best answer
 * still wins when several could fit.
 */
function scoreMatch(text, list) {
  const words = new Set(text.split(" ").filter((w) => w.length > 2));
  let best = null, bestScore = 0;
  for (const item of list || []) {
    // match — русский и немецкий, matchAz — азербайджанский. Смотрим в оба независимо от
    // выбранного языка: человек, который пишет вперемешку, не должен оставаться без ответа.
    for (const f of [...(item.match || []), ...(item.matchAz || [])]) {
      const n = normalize(f);
      if (!n) continue;
      let score = 0;
      if (text.includes(n)) {
        score = n.length * 2; // he used the phrase itself
      } else {
        const allToks = n.split(" ").filter(Boolean);
        const toks = n.split(" ").filter((w) => w.length > 2);
        const hit = toks.filter((w) => words.has(w));
        // Two long words at least (or a one-word fragment that hit): a single shared word is far
        // too weak — "объясни глагол sein" would otherwise land on "почему глагол в конце". Short
        // words like "что" still count towards the ratio, they just cannot carry a match alone.
        const solid = hit.filter((w) => w.length >= 4).length;
        // The escape is for fragments that really ARE one word. "как ты" collapses to ["как"] once
        // short words are dropped, and a 3-letter filler then carried the whole match — which sent
        // every Russian "как …" question to her "как дела" answer.
        const strong = solid >= 2 || (allToks.length === 1 && hit.length === 1);
        if (strong && hit.length / toks.length >= 0.5) {
          score = n.length * (hit.length / toks.length);
        }
      }
      if (score > bestScore) { bestScore = score; best = item; }
    }
  }
  return best ? { item: best, score: bestScore } : null;
}

const bestMatch = (text, list) => scoreMatch(text, list)?.item || null;

/**
 * Pick the best answer across several topic lists. Taking the first list that matched at all would
 * let a half-match about Mia beat an exact match about German grammar just because it is checked
 * first — "почему der die das" must reach the grammar answer, not the one about Berlin.
 */
/**
 * Words too common to identify a topic on their own — they appear in half the phrase lists.
 * Anything not here and at least five letters long is treated as a real subject.
 */
const WEAK_KEYWORDS = new Set([
  "почему", "какой", "какая", "какие", "когда", "сколько", "можно", "нужно", "будет", "чтобы",
  "расскажи", "объясни", "скажи", "думаешь", "знаешь", "хочешь", "любишь", "делать", "сделать",
  "слово", "слова", "твоя", "твой", "твоё", "тебе", "тебя", "меня", "очень", "этого", "этот",
  "немецкий", "немецком", "немецкому", "язык", "языка",
]);

function keywordRescue(text) {
  const words = text.split(" ").filter((w) => w.length >= 5 && !WEAK_KEYWORDS.has(w));
  if (!words.length) return null;
  const groups = [
    ["aboutHer", QUESTIONS.aboutHer],
    ["aboutGerman", QUESTIONS.aboutGerman],
    ["aboutGermany", QUESTIONS.aboutGermany],
  ];
  const hits = [];
  for (const [intent, list] of groups) {
    for (const item of list || []) {
      const blob = normalize([...(item.match || []), ...(item.matchAz || [])].join(" "));
      const shared = words.filter((w) => blob.includes(w));
      if (shared.length) hits.push({ intent, item, shared: shared.length });
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.shared - a.shared);
  // ambiguous between several different answers → better to admit she does not know
  if (hits.length > 1 && hits[1].shared === hits[0].shared && hits[1].item !== hits[0].item) return null;
  return hits[0];
}

// The score a phrase match must clear to answer a sentence that was never marked as a question.
// scoreMatch() pays 2 × length for text that contains the phrase itself, so 12 means roughly
// "six characters of a phrase he used word for word".
const VERBATIM = 12;

function bestOfLists(text, groups) {
  let best = null;
  for (const [intent, list] of groups) {
    const m = scoreMatch(text, list);
    if (m && (!best || m.score > best.score)) best = { intent, item: m.item, score: m.score };
  }
  return best;
}

// Words that carry no topic — looking these up would return a random vocabulary entry.
const RU_STOPWORDS = new Set([
  "этот", "этого", "этом", "эта", "это", "того", "тоже", "также", "очень", "просто", "сейчас",
  "потом", "здесь", "везде", "нужно", "надо", "можно", "хочу", "буду", "была", "были", "было",
  "меня", "тебя", "себя", "мной", "тобой", "него", "неё", "them", "который", "которая",
  "когда", "потому", "поэтому", "значит", "вообще", "наверное", "кажется", "думаю", "знаю",
  // "у меня есть брат" is not about food: as a content word "есть" is almost always the copula,
  // and looking it up turned a sentence about his family into a lesson about eating
  "есть", "быть", "стал", "стала", "стало", "мочь", "хотеть",
]);

const RU_LETTERS = /[а-яё]/i;
const isRussian = (s) => RU_LETTERS.test(s);

/** Whole-word test, so "hi" never matches inside "hier" and "да" never inside "даже". */
const hasWord = (text, words) => {
  const tokens = new Set(text.split(" "));
  return words.some((w) => tokens.has(normalize(w)) || (w.includes(" ") && text.includes(normalize(w))));
};

// Азербайджанские варианты дописаны прямо в эти же списки: has() и hasWord() ищут любое
// совпадение, так что лишние фрагменты русской ветке не мешают — она их просто не встретит.
// «salam» уже был: по-азербайджански это то же приветствие, что и по-русски.
const GREETING = ["привет", "здравствуй", "хай", "салам", "hallo", "hi", "guten tag", "guten morgen", "guten abend", "servus", "moin",
  "salam", "sabahın xeyir", "sabahin xeyir", "axşamın xeyir", "axsamin xeyir", "günortan xeyir", "gunortan xeyir", "xoş gördük", "xos gorduk"];
const BYE = ["до свидания", "до скорого", "прощай", "tschuss", "tschüss", "auf wiedersehen", "bis bald", "bis dann", "ciao", "bye",
  // «sağ ol» тут намеренно НЕТ: по-азербайджански это прежде всего «спасибо», а прощание
  // проверяется раньше благодарности — и «çox sağ ol» заканчивало разговор вместо ответа.
  "salamat qal", "hələlik", "helelik", "görüşərik", "goruserik", "tezliklə görüşərik", "tezlikle goruserik", "sabaha qədər", "sabaha qeder"];
// "пока" usually means "for now" ("пока не знаю", "я пока учу") and only says goodbye on its own
// "давай" is deliberately NOT here: on its own it means "go on, okay", never "bye" — and
// "давай попробуем" was ending the conversation.
const BYE_SHORT = ["пока"];
// words that may sit beside a farewell without turning it into something else
// Only true fillers — "всё" and "хорошо" carry meaning ("пока всё хорошо" is not a goodbye).
const BYE_FILLER = new Set(["мия", "ну", "ок", "окей", "ладно", "давай", "тогда", "уже"]);
// «sağ ol» и прощание, и благодарность — по одному слову не различить, поэтому оно есть в обоих
// списках; порядок проверок в read() решает, что это значит в конкретной фразе.
const THANKS = ["спасибо", "благодарю", "danke", "vielen dank", "спс",
  "təşəkkür", "tesekkur", "sağ ol", "sag ol", "sağ olun", "sag olun", "çox sağ ol", "cox sag ol", "minnətdaram", "minnetdaram"];
const CONFUSED = ["не понимаю", "не понял", "непонятно", "что это значит", "не знаю", "verstehe nicht", "ich verstehe nicht", "was ist das", "wie bitte", "не поняла", "хз",
  "başa düşmürəm", "basa dusmurem", "anlamadım", "anlamadim", "başa düşmədim", "basa dusmedim", "bilmirəm", "bilmirem", "nə deməkdir", "ne demekdir"];
const REPEAT = ["повтори", "ещё раз", "еще раз", "медленнее", "помедленнее", "noch einmal", "langsamer", "wiederhole",
  "təkrar et", "tekrar et", "bir də de", "bir de de", "yavaş", "yavas", "daha yavaş", "daha yavas"];
// "трудно/сложно/тяжело" deliberately live in FEELING_BAD, not here: «мне тяжело» is Emil telling
// you how he feels, and answering it with a grammar tip instead of comfort is exactly the coldness
// this is meant to avoid. HELP_ME is for an actual request.
const HELP_ME = ["помоги", "подскажи", "как сказать", "как будет", "wie sagt man", "не могу",
  "kömək et", "komek et", "necə deyilir", "nece deyilir", "necə olur", "nece olur", "bacarmıram", "bacarmiram"];
const FEELING_BAD = ["устал", "устала", "тяжело", "трудно", "сложно", "плохо", "грустно", "болит", "не получается", "надоело", "скучаю", "müde", "schlecht", "schwer",
  "yorğunam", "yorgunam", "çətindir", "cetindir", "ağırdır", "agirdir", "pisdir", "kefim yoxdur", "alınmır", "alinmir", "bezmişəm", "bezmisem", "darıxıram", "darixiram"];
// "неплохо" is praise, not a complaint — never let FEELING_BAD swallow it
const FEELING_BAD_NOT = /(^|[\s,])не ?(плохо|трудно|сложно|тяжело)/;
const FEELING_GOOD = ["хорошо", "отлично", "супер", "классно", "рад", "здорово", "нормально", "прекрасно", "gut", "super", "prima", "toll", "schön",
  // формы перечислены целиком: совпадение идёт по слову, а не по подстроке, и «əladır» с «əla» не сойдётся
  "yaxşı", "yaxsi", "yaxşıyam", "yaxsiyam", "əla", "ela", "əladır", "eladir", "möhtəşəm", "mohtesem",
  "şadam", "sadam", "normaldır", "normaldir", "gözəldir", "gozeldir", "hər şey yaxşıdır", "her sey yaxsidir"];
// "Ich komme aus Baku" is Emil talking about himself, not a question about Mia's life.
const SELF_STATEMENT = /^(ich|mein|meine|mir|mich)\b/;
const QUESTIONY = /\?|^(wie|was|wo|wer|wann|warum|woher|wohin)\b|как|что|где|кто|когда|почему|зачем|откуда|сколько|какой|какая|можно|расскажи|объясни|скажи|neçə|nece|necə|nə|ne |haradan|harada|hara|kim|nə vaxt|ne vaxt|niyə|niye|nəyə görə|neye gore|hansı|hansi|olar|danış|danis|izah et|de görüm|de gorum/;
// German yes/no questions put the verb first: "Bist du müde?", "Hast du Kinder?", "Magst du Fußball?"
const GERMAN_YESNO = /^(bist|hast|magst|kannst|willst|moechtest|machst|spielst|wohnst|kommst|arbeitest|warst|kennst|trinkst|isst|sprichst|findest|gibt|darf|kann|ist|sind|hattest|lernst|gehst|liest|hoerst)\s+(du|ihr|sie|es|das)\b/;

const ABOUT_SITE = ["сайт", "приложение", "программа", "уровень", "уровни", "монет", "магазин", "экзамен", "миссия", "достижен", "профиль", "прогресс", "xp", "опыт", "серия", "история", "подсказк", "микрофон", "голос",
  "sayt", "dərs", "ders", "səviyyə", "seviyye", "sikkə", "sikke", "mağaza", "magaza", "imtahan", "missiya", "nailiyyət", "nailiyyet", "kabinet", "irəliləyiş", "ireleyis", "ipucu", "mikrofon", "səs", "ses"];

/**
 * Work out what Emil meant.
 * @returns {{intent: string, payload?: any, lang: "ru"|"de", raw: string}}
 */
export function understand(raw) {
  const text = normalize(raw);
  const lang = isRussian(raw) ? "ru" : "de";
  const out = (intent, payload) => ({ intent, payload, lang, raw });

  if (!text) return out("empty");

  // A word question comes first: "как будет пока по-немецки?" is a question, not a goodbye.
  const word = findWordQuestion(text);
  if (word) return out("word", word);

  // The phrasebook answers "как сказать «не знаю»" — but ONLY on an explicit lead-in. It used to be
  // consulted for every message, so "Мне не нравится грамматика" matched the «мне не нравится»
  // entry and Mia recited Emil's own sentence back at him as though it were her opinion. It sits
  // here, above the confused/help gates, because those would otherwise swallow the lead-in first.
  if (/как сказать|как будет|как ответить|как спросить|по немецки|wie sagt man|necə deyilir|nece deyilir|necə olur|nece olur|almanca necə|almanca nece|nə cavab verim|ne cavab verim|necə soruşum|nece sorusum/.test(text)) {
    const small = bestMatch(text, QUESTIONS.smallAnswers);
    if (small) return out("small", small);
  }

  // "пока" only says goodbye on its own — inside a sentence it almost always means "for now"
  // a short farewell counts only when nothing else of substance is in the message
  const bareBye = hasWord(text, BYE_SHORT)
    && text.split(" ").filter(Boolean).every((w) => BYE_SHORT.includes(w) || BYE_FILLER.has(w));
  if (hasWord(text, BYE) || bareBye) return out("bye");
  if (hasWord(text, REPEAT)) return out("repeat");
  if (hasWord(text, THANKS) && text.split(" ").length <= 3) return out("thanks");

  // Knowledge lookups only when Emil is actually asking, never when he states something about himself.
  // normalize() strips the question mark, so it has to be read off the raw input; and a German
  // yes/no question starts with the verb ("Bist du ein Roboter?"), which no W-word test catches.
  const asking = (/\?/.test(String(raw)) || QUESTIONY.test(text) || GERMAN_YESNO.test(text)) && !SELF_STATEMENT.test(text);
  // A question mark is a luxury Emil does not have: speech recognition never produces one, and he
  // rarely types one either. So her knowledge is reachable without it too — «кем ты работаешь»,
  // «нужна ли виза», «страховка» — but then only on a near-verbatim phrase match, never on a loose
  // word overlap, and never when he is talking about himself.
  const canKnow = asking || !SELF_STATEMENT.test(text);
  if (canKnow) {
    // A site word inside a long sentence is usually just a word — «вчера ходил в магазин» is not a
    // question about the shop. Without a question it has to be short and about nothing else.
    const siteish = has(text, ABOUT_SITE) && (asking || text.split(" ").length <= 3);
    const site = siteish ? bestMatch(text, SITEHELP.topics) : null;
    if (site) return out("site", site);
    const best = bestOfLists(text, [
      ["aboutHer", QUESTIONS.aboutHer],
      ["aboutGerman", QUESTIONS.aboutGerman],
      ["aboutGermany", QUESTIONS.aboutGermany],
    ]);
    // scoreMatch() gives 2 × length for a phrase he used as written and at most 1 × length for a
    // word overlap, so this threshold means "he really said this phrase", not "some words agree".
    // …or when the phrase IS the whole message: a one-word «виза», «банк», «метро» said into the
    // microphone is unmistakable, however short it is (score is 2 × length for a contained phrase,
    // so this comparison means the phrase covers everything he said).
    const wholeMessage = best && best.score >= text.length * 2;
    // …or when it dominates the message: «я боюсь говорить» is a question in disguise, while
    // «мне нравится учить немецкий» is him telling her something and deserves an answer to that.
    const dominant = best && best.score >= Math.max(VERBATIM, text.length * 1.2);
    if (best && (asking || wholeMessage || dominant)) return out(best.intent, best.item);
    const grammar = findGrammarQuestion(text);
    if (grammar) return out("grammar", grammar);
    // Last chance before giving up: he asked about something she does know, just in words the
    // phrase lists do not carry — "расскажи про Берлин" against "почему Берлин". Only one
    // unmistakable keyword is allowed to decide, and only once everything stricter has failed.
    // Loosest rule in the file, so this one still needs an actual question.
    if (asking) {
      const rescue = keywordRescue(text);
      if (rescue) return out(rescue.intent, rescue.item);
    }
  }

  // whole words only: "чего" used to match inside "ничего", "трудно" inside "не трудно"
  if (hasWord(text, CONFUSED)) return out("confused");
  if (hasWord(text, HELP_ME) && !FEELING_BAD_NOT.test(text)) return out("help");
  if (hasWord(text, GREETING) && text.split(" ").length <= 4) return out("greeting");
  if (hasWord(text, FEELING_BAD) && !FEELING_BAD_NOT.test(text)) return out("feelingBad");
  if (hasWord(text, FEELING_GOOD) && text.split(" ").length <= 5) return out("feelingGood");

  // a real German sentence he built himself
  if (lang === "de" && text.split(" ").length >= 2) return out("germanSentence");
  // He asked about the app but no topic fitted. Saying "ask me about the site" would be absurd —
  // that is exactly what he just did — so answer with the honest site-help fallback instead.
  if (asking && has(text, ABOUT_SITE)) return out("site", { ru: SITEHELP.fallback });
  // normalize() strips punctuation, so the question mark has to be read off the raw input
  if (lang === "ru" && (/\?\s*$/.test(String(raw)) || QUESTIONY.test(text))) return out("openQuestion");
  // A Russian statement deserves a Russian answer. Carry the content words so respond() can look
  // them up in the vocabulary Emil has already met and turn what he said into a German phrase.
  if (lang === "ru") {
    const words = text.split(" ").filter((w) => w.length >= 4 && !RU_STOPWORDS.has(w));
    if (words.length) return out("ruStatement", { words });
  }
  return out("statement");
}

// Endings: the part of a word that changes when it is used in a sentence. Emil types "я работаю",
// "у меня новая квартира" — the course stores "arbeiten"/"работать" and "квартира", so a lookup
// that only matches whole words finds nothing. Comparing a shared stem plus a known ending keeps
// «врач» → «врачом» while «стол» no longer swallows «столько».
const ENDINGS = new Set(["", "а", "я", "у", "ю", "ы", "и", "е", "о", "й", "ь",
  "ой", "ей", "ом", "ем", "ов", "ев", "ам", "ям", "ах", "ях", "ью", "ья", "ье",
  "ий", "ый", "ая", "ое", "ые", "их", "ых", "ым", "ую",
  "ть", "ться", "л", "ла", "ло", "ли", "ешь", "ет", "ем", "ете", "ут", "ют", "ит", "ят", "ал", "ала",
  "en", "e", "t", "st", "n", "s", "er", "es", "em"]);

/**
 * Are these two words the same word, just in a different grammatical shape?
 *
 * Deliberately strict. The old rule — "the first four letters agree" — matched «дорога» to
 * «дорого» and «квартира» to «квартал», so Mia answered a sentence with a word that was never in
 * it and the whole reply read as a non sequitur.
 */
function sameLemma(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i < 4) return false; // a shared stem shorter than this means nothing in either language
  return ENDINGS.has(a.slice(i)) && ENDINGS.has(b.slice(i));
}

/** "что значит haben", "как будет спасибо по-немецки", "переведи Freund" */
function findWordQuestion(text) {
  // `text` is already normalised (ß→ss, ü→ue, punctuation stripped), so the German patterns
  // must be written in that same spelling or they would never match.
  // Азербайджанский спрашивает в другом порядке — «ev almanca necədir?», а не «как будет ev» —
  // поэтому это отдельные образцы, а не перевод русских. normalize() уже съел пунктуацию, так что
  // «necədir» и «necə» приходится ловить по корню.
  const asksMeaning = /значит|означает|перевед|перевод|was heisst|was bedeutet|uebersetze|nə deməkdir|ne demekdir|mənası|menasi|tərcümə|tercume/.test(text);
  const asksGerman = /как будет|как сказать|по немецки|wie sagt man|almanca nec|almancada nec|almanca nədir|almanca nedir|almancası|almancasi/.test(text);
  if (!asksMeaning && !asksGerman) return null;
  const STOP = new Set(["что", "как", "это", "значит", "означает", "будет", "сказать", "немецки", "переведи", "перевод", "пожалуйста", "слово", "was", "heisst", "bedeutet", "sagt", "man",
    // обе записи каждого слова: normalize() трогает немецкие умлауты, но не азербайджанские
    // ə, ı, ş, ç, ğ — а печатают и так, и так
    "almanca", "almancada", "almancasi", "almancası", "necedir", "necədir", "nece", "necə",
    "nedir", "nədir", "demekdir", "deməkdir", "menasi", "mənası", "tercume", "tərcümə",
    "soz", "söz", "sozu", "sözü", "bu", "zehmet", "zəhmət", "olmasa", "deyilir", "olur"]);
  const words = text.split(" ").filter((w) => w.length > 2 && !STOP.has(w));
  // try the longest words first: they are the most likely to be the one he asked about
  for (const w of words.slice().sort((a, b) => b.length - a.length)) {
    const de = VOCAB_DE.get(w);
    if (de) return { dir: "de-ru", entry: de };
    const ru = VOCAB_RU.get(w);
    if (ru) return { dir: "ru-de", entry: ru };
    // Направление то же самое: подпись к немецкому слову на сайте всё равно переводится
    // автоматически, поэтому отдельного «az-de» не нужно.
    const az = vocabAzIndex().get(w);
    if (az) return { dir: "ru-de", entry: az };
  }
  // no exact hit: allow a stem match, so "Arbeit" still finds "arbeiten"
  for (const w of words.slice().sort((a, b) => b.length - a.length)) {
    if (w.length < 4) continue;
    for (const [key, entry] of VOCAB_DE) if (sameLemma(key, w)) return { dir: "de-ru", entry };
    for (const [key, entry] of VOCAB_RU) if (sameLemma(key, w)) return { dir: "ru-de", entry };
  }
  // Последний проход — двухбуквенные слова, и только по азербайджанскому указателю.
  // Идёт последним нарочно: пока есть слово подлиннее, отвечаем по нему, потому что короткое
  // с большей вероятностью окажется служебным.
  for (const w of text.split(" ")) {
    if (w.length !== 2 || STOP.has(w)) continue;
    const az = vocabAzIndex().get(w);
    if (az) return { dir: "ru-de", entry: az };
  }
  return null;
}

/** "объясни артикли", "что такое sein", "как спрягается haben" */
function findGrammarQuestion(text) {
  if (!/объясни|расскажи|что такое|как работает|как спряга|правило|грамматик|не понимаю как/.test(text)) return null;
  let best = null, score = 0;
  for (const g of GRAMMAR) {
    const words = normalize(g.title).split(" ").filter((w) => w.length > 3);
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits > score) { score = hits; best = g; }
  }
  return score ? best : null;
}


/* --------------------------------------------------- checking Emil's German */
// A small set of A1 mistakes Mia can spot locally, so even offline she reacts to what he actually said.
const CONJUGATION = {
  ich: { sein: "bin", haben: "habe", heissen: "heiße", kommen: "komme", wohnen: "wohne", sprechen: "spreche", arbeiten: "arbeite", machen: "mache", gehen: "gehe", trinken: "trinke", essen: "esse", lernen: "lerne", spielen: "spiele" },
  du: { sein: "bist", haben: "hast", heissen: "heißt", kommen: "kommst", wohnen: "wohnst", sprechen: "sprichst", arbeiten: "arbeitest", machen: "machst", gehen: "gehst", trinken: "trinkst", essen: "isst", lernen: "lernst", spielen: "spielst" },
  er: { sein: "ist", haben: "hat", heissen: "heißt", kommen: "kommt", wohnen: "wohnt", sprechen: "spricht", arbeiten: "arbeitet", machen: "macht", gehen: "geht", trinken: "trinkt", essen: "isst", lernen: "lernt", spielen: "spielt" },
};
const STEMS = { bin: "sein", bist: "sein", ist: "sein", sind: "sein", habe: "haben", hast: "haben", hat: "haben",
  heisse: "heissen", heisst: "heissen", komme: "kommen", kommst: "kommen", kommt: "kommen",
  wohne: "wohnen", wohnst: "wohnen", wohnt: "wohnen", spreche: "sprechen", sprichst: "sprechen", spricht: "sprechen",
  arbeite: "arbeiten", arbeitest: "arbeiten", arbeitet: "arbeiten", mache: "machen", machst: "machen", macht: "machen",
  gehe: "gehen", gehst: "gehen", geht: "gehen", trinke: "trinken", trinkst: "trinken", trinkt: "trinken",
  esse: "essen", isst: "essen", lerne: "lernen", lernst: "lernen", lernt: "lernen",
  spiele: "spielen", spielst: "spielen", spielt: "spielen" };
// "sie" and "es" are deliberately absent: "sie" is both she and they/formal-you, so a correct
// "Sie sind..." or "sie kommen..." would otherwise be "corrected" into a mistake.
const SUBJECTS = { ich: "ich", du: "du", er: "er" };
/** The word itself inside a token, so punctuation around it survives a correction. */
const LETTERS = /[a-zA-ZäöüÄÖÜß]+/;

/**
 * Look for one obvious A1 mistake in Emil's German sentence.
 * Only flags a wrong ending after an unambiguous subject; stays silent when unsure.
 * @returns {{original, corrected, explanationRu} | null}
 */
export function checkGerman(raw) {
  const words = normalize(raw).split(" ").filter(Boolean);
  if (words.length < 2) return null;
  for (let i = 0; i < words.length - 1; i++) {
    const person = SUBJECTS[words[i]];
    if (!person) continue;
    const verb = STEMS[words[i + 1]];
    if (!verb) continue;
    const right = CONJUGATION[person][verb];
    if (!right) continue;
    if (normalize(right) === words[i + 1]) return null; // correct, nothing to say
    const parts = String(raw).split(" ");
    let done = false;
    for (let k = 0; k < parts.length; k++) {
      if (normalize(parts[k]) !== words[i + 1]) continue;
      parts[k] = parts[k].replace(LETTERS, right); // keeps a trailing comma or full stop
      done = true;
      break;
    }
    const corrected = parts.join(" ");
    // nothing visibly changed — showing "Ich heißt Emil → Ich heißt Emil" is worse than saying nothing
    if (!done || normalize(corrected) === normalize(raw)) return null;
    return {
      original: raw,
      corrected,
      explanationRu: tr`После «${words[i]}» глагол будет «${right}»: ${words[i]} ${right}.`,
    };
  }
  return null;
}

/* ---------------------------------------------------------------- answering */
const R = (list) => pick(list);

/**
 * Build Mia's reply to an understood message.
 * @param {object} u          result of understand()
 * @param {object} ctx        { topic, askedTopics: Set, level, turns, lastHint }
 * @returns {{de, ru, explainRu?, tip?, done?, topic?}}
 */
export function respond(u, ctx = {}) {
  const nextQuestion = () => pickQuestion(ctx);

  switch (u.intent) {
    case "bye": {
      const g = R(SMALLTALK.goodbyes);
      return { ...g, explainRu: ctx.turns >= 4 ? "Спасибо, что поговорил со мной сегодня. Приходи, когда захочешь — я тут." : "", done: true };
    }
    case "repeat": {
      const last = ctx.lastDe || "";
      return {
        de: last || "Kein Problem. Wie geht es dir?",
        ru: ctx.lastRu || "Без проблем. Как у тебя дела?",
        explainRu: "Конечно, повторяю. Слушай ещё раз, я не тороплюсь.",
      };
    }
    case "thanks": {
      // One pick for BOTH languages: Emil reads the Russian line as the translation of the German
      // one, and two independent picks paired «Immer gern, Emil!» with a «Пожалуйста.» that had
      // lost his name. And a simple thank-you does not deserve a brand-new topic every single
      // time — askOrReceive puts that decision back through shouldAsk, like every other branch.
      const t = R([
        { de: "Gern geschehen!", ru: "Пожалуйста!" },
        { de: "Bitte, bitte!", ru: "Да не за что!" },
        { de: "Immer gern, Emil.", ru: "Всегда пожалуйста, Эмиль." },
      ]);
      return askOrReceive({ de: t.de, ru: t.ru }, ctx);
    }
    case "word": {
      const { dir, entry } = u.payload;
      const ru = dir === "de-ru"
        ? tr`«${entry.de}» — это «${entry.ru}». Например: ${entry.example} — ${entry.exampleRu}`
        : tr`«${entry.ru}» по-немецки — «${entry.de}». Например: ${entry.example} — ${entry.exampleRu}`;
      // Mia says a line of her own, then explains; the example belongs in the explanation,
      // not in her mouth as if it were her thought.
      return {
        de: `Das Wort kennst du gleich: ${stripArticle(entry.de)}.`,
        ru: tr`Это слово ты сейчас запомнишь: ${entry.ru}.`,
        explainRu: ru,
        tip: tr`Попробуй сказать: ${entry.example}`,
      };
    }
    case "grammar": {
      const g = u.payload;
      const ex = g.examples[0];
      return {
        de: `Gute Frage! Schau: ${ex.de}`,
        ru: tr`Хороший вопрос! Смотри: ${ex.ru}`,
        explainRu: tr`${g.title}. ${String(g.body).split("\n").join(" ")} Например: ${ex.de} — ${ex.ru}`,
        tip: tr`Это из уровня ${g.level.id}: «${g.level.titleRu}» — там есть вся таблица.`,
      };
    }
    case "site":
      return withQuestion({ de: "Ich erkläre es dir.", ru: "Сейчас объясню.", explainRu: u.payload.ru }, maybeQuestion(ctx));
    case "aboutHer":
      return withQuestion({ de: u.payload.de, ru: u.payload.ru, explainRu: u.payload.explainRu || "" }, maybeQuestion(ctx));
    case "aboutGerman":
    case "aboutGermany":
      // one pick, so the Russian line really is a translation of the German one
      return withQuestion({
        ...R([
          { de: "Gute Frage!", ru: "Хороший вопрос!" },
          { de: "Oh, das ist eine gute Frage.", ru: "О, это хороший вопрос." },
        ]),
        explainRu: u.payload.ru,
      }, maybeQuestion(ctx));
    case "confused": {
      const hint = ctx.lastHint ? tr`Можешь ответить так: «${ctx.lastHint}»` : "Скажи своими словами, как получится — я пойму.";
      return {
        de: ctx.lastDe || "Kein Problem. Ich frage anders.",
        ru: ctx.lastRu || "Ничего страшного. Спрошу по-другому.",
        explainRu: tr`${R(SMALLTALK.encouragement)} ${hint}`,
      };
    }
    case "help": {
      const hint = ctx.lastHint ? tr`Скажи так: «${ctx.lastHint}»` : "Начни с «Ich …» — дальше само пойдёт.";
      return { de: "Ich helfe dir gern.", ru: "Конечно помогу.", explainRu: tr`${R(SMALLTALK.encouragement)} ${hint}` };
    }
    case "feelingBad": {
      // He said he is tired or that it is hard. Stay with that — no question, no new topic. Warmth,
      // and an invitation he is free to ignore. Asking him about his balcony here was awful.
      const r = R(SMALLTALK.reactions.negative);
      const soft = R(SMALLTALK.soft);
      return {
        de: `${r.de} ${soft.de}`.trim(),
        ru: tr`${r.ru} ${soft.ru}`.trim(),
        explainRu: R(SMALLTALK.comfort), // about HIM, not about his German
        asked: false,
      };
    }
    case "feelingGood": {
      const r = R(SMALLTALK.reactions.positive);
      return askOrReceive({ de: r.de, ru: r.ru }, ctx);
    }
    case "greeting": {
      const o = R(SMALLTALK.openers);
      // every opener carries a ready answer to itself; dropping it left 💡 showing a generic
      // placeholder on the very first turn of a conversation, where it is needed most
      return { de: o.de, ru: o.ru, topic: o.topic, tip: o.hint || "" };
    }
    case "small":
      return askOrReceive({ de: u.payload.de, ru: u.payload.ru }, ctx);
    case "germanSentence": {
      const mistake = checkGerman(u.raw);
      // React to what he actually said before moving on. Generic praise plus an unrelated question
      // ("Sehr schön! Gehst du früh ins Bett?") leaves a beginner unsure he was even understood.
      const echo = acknowledge(u.raw);
      const r = echo || R(mistake ? SMALLTALK.reactions.neutral : SMALLTALK.reactions.positive);
      // He has just built a German sentence — that deserves a reaction to the sentence, and only
      // sometimes a new question on top. A fresh question every single time is what felt like a test.
      return {
        ...askOrReceive({ de: r.de, ru: r.ru }, ctx),
        correction: mistake,
        explainRu: mistake ? tr`Совсем чуть-чуть не хватило. ${mistake.explanationRu}` : (echo ? echo.explainRu || "" : ""),
      };
    }
    case "openQuestion":
      return withQuestion({
        ...R([ // one pick, so the two lines say the same thing
          { de: "Hmm, gute Frage!", ru: "Хм, хороший вопрос!" },
          { de: "Oh, interessant!", ru: "О, интересно!" },
        ]),
        explainRu: "Честно скажу: на это я сейчас ответить не смогу — я знаю только то, что мы с тобой проходили. Спроси меня про слово, про грамматику, про Германию или про сам сайт — тут я всё расскажу. А если хочешь, чтобы я отвечала вообще на всё, включи «умную Мию» на главной.",
      }, maybeQuestion(ctx));
    case "empty":
      return { de: "Ich höre dir zu.", ru: "Я тебя слушаю.", explainRu: "Я ничего не услышала. Скажи ещё раз или напиши." };
    case "ruStatement": {
      // He said something in Russian that is not a question. Find a word in it that the course has
      // already taught and hand him the German for it — otherwise the reply came back in German
      // only, with nothing in it that responded to what he actually said.
      // Longest word first — it carries the most meaning. Every exact hit is checked before any
      // stem match, or a loose match on an early word hides the word he actually used.
      const said = (u.payload?.words || []).slice().sort((a, b) => b.length - a.length);
      let entry = null, hitRu = "";
      for (const w of said) {
        const exact = VOCAB_RU.get(w);
        if (exact) { entry = exact; hitRu = w; break; }
      }
      if (!entry) {
        outer: for (const w of said) {
          for (const [key, e] of VOCAB_RU) {
            if (sameLemma(key, w)) { entry = e; hitRu = w; break outer; }
          }
        }
      }
      const react = R(SMALLTALK.reactions.neutral);
      if (entry) {
        return withQuestion({
          de: react.de,
          ru: react.ru,
          explainRu: tr`Ты сказал про «${hitRu}». По-немецки это «${entry.de}» — например: ${entry.example} — ${entry.exampleRu}`,
          tip: tr`Попробуй сказать: ${entry.example}`,
        }, nextQuestion());
      }
      // nothing she has taught — say so plainly instead of silently changing the subject
      return withQuestion({
        de: react.de,
        ru: react.ru,
        explainRu: "Про это я пока рассказать не смогу — без интернета я знаю только то, что мы с тобой проходили. Спроси меня про слово, про грамматику, про Германию или про сам сайт. А если хочешь, чтобы я говорила вообще обо всём, включи «умную Мию» на главной.",
      }, maybeQuestion(ctx));
    }
    default: {
      const r = R(SMALLTALK.reactions.neutral);
      return askOrReceive({ de: r.de, ru: r.ru }, ctx);
    }
  }
}

/**
 * Say back what Emil just told her, so he can hear that he was understood.
 * Returns null when the sentence is not one of the things a beginner says about himself —
 * the caller then falls back to a general reaction.
 */
const SELF_PATTERNS = [
  {
    re: /\bich\s+hei(?:ß|ss)e\s+([\p{Lu}][\p{L}-]*)/iu,
    say: (v) => ({ de: `Freut mich, ${v}! Schön, dich kennenzulernen.`, ru: tr`Очень приятно, ${ruWord(v)}! Рада познакомиться.` }),
  },
  {
    re: /\bmein\s+name\s+ist\s+([\p{Lu}][\p{L}-]*)/iu,
    say: (v) => ({ de: `Freut mich, ${v}!`, ru: tr`Очень приятно, ${ruWord(v)}!` }),
  },
  {
    re: /\bich\s+komme\s+aus\s+([\p{Lu}][\p{L}-]*)/iu,
    say: (v) => ({ de: `Aus ${v}! Das ist weit weg von hier.`, ru: tr`Из ${ruCase(ruWord(v), "gen")}! Это далеко отсюда.`, explainRu: tr`Ты сказал, откуда ты — «Ich komme aus ${v}». Это одна из самых важных фраз: её спросят в первый же день.` }),
  },
  {
    re: /\bich\s+wohne\s+(?:in|bei)\s+([\p{Lu}][\p{L}-]*)/iu,
    say: (v) => ({ de: `In ${v} also. Wohnst du gern dort?`, ru: tr`Значит, ${ruIn(ruCase(ruWord(v), "prep"))}. Тебе там нравится?` }),
  },
  {
    re: /\bich\s+spreche\s+([\p{Lu}][\p{L}]*)/iu,
    say: (v) => ({ de: `${v} sprichst du also. Und jetzt auch Deutsch!`, ru: tr`Значит, ты говоришь на ${ruWord(v)}. А теперь ещё и по-немецки!` }),
  },
  {
    re: /\bich\s+bin\s+(\d{1,2})\s*(?:jahre)?/iu,
    say: (v) => ({ de: `${v} Jahre — ein sehr gutes Alter zum Lernen.`, ru: tr`${v} — отличный возраст, чтобы учиться.` }),
  },
  {
    re: /\bich\s+(?:arbeite\s+als|bin)\s+(Programmierer|Ingenieur|Lehrer|Arzt|Student|Kellner|Fahrer|Koch)\b/iu,
    say: (v) => ({ de: `${v}! Das ist ein guter Beruf.`, ru: tr`${ruWord(v)} — хорошая профессия.` }),
  },
  {
    re: /\bich\s+habe\s+(?:einen|eine|zwei|drei)?\s*(Bruder|Schwester|Kinder|Sohn|Tochter|Familie)\b/iu,
    say: (v) => ({ de: `Schön, dass du von deiner Familie erzählst.`, ru: tr`Здорово, что ты рассказываешь про семью — «${ruWord(v)}» я запомнила.` }),
  },
  {
    re: /\bich\s+habe\s+(?:einen|eine|zwei|drei)?\s*(Hund|Katze|Vogel|Fisch)\b/iu,
    say: (v) => ({ de: `Ein Haustier! Wie heißt er?`, ru: tr`У тебя есть питомец — «${ruWord(v)}». Как его зовут?` }),
  },
  {
    re: /\bich\s+(?:mag|trinke|esse|spiele|lerne|lese|höre)\s+(?:gern\s+)?([\p{L}]{3,})/iu,
    // If the course has never taught this word, do not drop the German into the Russian sentence —
    // "Fleisch — мне это тоже нравится" is half a language he cannot read yet.
    say: (v) => {
      const ru = ruWord(v);
      return { de: `${v} — das mag ich auch.`, ru: ru === v ? "Мне это тоже нравится." : tr`${ru} — мне это тоже нравится.` };
    },
  },
];

/**
 * The Russian half of a reply must not carry German words ("Из Baku!", "Значит, ты говоришь на
 * Russisch"). Places and languages are spelled out here; everything else is looked up in the
 * vocabulary Emil has already met, and only falls through unchanged when nothing is known.
 */
const RU_NAMES = {
  ali: "Эмиль", baku: "Баку", govsan: "Баку", berlin: "Берлин", leipzig: "Лейпциг", hamburg: "Гамбург",
  muenchen: "Мюнхен", wien: "Вена", moskau: "Москва", potsdam: "Потсдам",
  // the cities he is most likely to name once he is there, plus the ones near home
  koeln: "Кёльн", frankfurt: "Франкфурт", stuttgart: "Штутгарт", duesseldorf: "Дюссельдорф",
  dresden: "Дрезден", bremen: "Бремен", hannover: "Ганновер", nuernberg: "Нюрнберг",
  dortmund: "Дортмунд", essen: "Эссен", bonn: "Бонн", zuerich: "Цюрих", bern: "Берн", salzburg: "Зальцбург",
  sumgait: "Сумгаит", gandscha: "Гянджа", tiflis: "Тбилиси", istanbul: "Стамбул", ankara: "Анкара",
  schweiz: "Швейцария", tuerkei: "Турция", georgien: "Грузия", kasachstan: "Казахстан",
  ukraine: "Украина", polen: "Польша", frankreich: "Франция", italien: "Италия", spanien: "Испания",
  deutschland: "Германия", aserbaidschan: "Азербайджан", russland: "Россия", oesterreich: "Австрия",
  russisch: "русском", deutsch: "немецком", englisch: "английском", tuerkisch: "турецком",
  aserbaidschanisch: "азербайджанском", arabisch: "арабском", spanisch: "испанском",
  programmierer: "программист", ingenieur: "инженер", lehrer: "учитель", arzt: "врач",
  student: "студент", kellner: "официант", fahrer: "водитель", koch: "повар",
};

/**
 * Russian puts an ending where German does not: «из Берлин» and «в Москва» are the kind of mistake
 * that immediately sounds like a machine. Only the two forms these sentences need, and only the
 * regular patterns — a foreign name ending in any other vowel (Баку, Тбилиси, Осло) does not
 * decline at all, which covers most of the rest.
 *
 * @param {string} word  a Russian place name
 * @param {"gen"|"prep"} form  «из <gen>», «в <prep>»
 */
function ruCase(word, form) {
  const w = String(word || "");
  if (!/[а-яё]/i.test(w)) return w; // still a German name — nothing to decline
  if (w === w.toUpperCase()) return w; // США, ОАЭ — an abbreviation has no ending to change
  const last = w.slice(-1).toLowerCase();
  if (last === "а" || last === "я") {
    const stem = w.slice(0, -1);
    if (last === "я") return form === "gen" || /и$/.test(stem) ? stem + "и" : stem + "е";
    if (form === "prep") return stem + "е";
    return stem + (/[гкхжчшщ]$/i.test(stem) ? "и" : "ы"); // Москвы, но Риги
  }
  if ("оеёиуюыэ".includes(last)) return w; // Баку, Осло, Тбилиси — не склоняются
  if (last === "ь") return w.slice(0, -1) + (form === "gen" ? "я" : "е");
  return w + (form === "gen" ? "а" : "е"); // Берлин -> Берлина / Берлине
}

/** «в Берлине», but «во Франкфурте» — Russian inserts the vowel before в/ф plus a consonant. */
// «в Берлине» или «во Франкфурте» — выбор предлога существует только в русском.
// В азербайджанском место обозначает суффикс (-də / -da), и он зависит от гармонии гласных
// внутри самого слова — а слово здесь то, что человек только что напечатал, включая любой
// иностранный топоним. Навесить суффикс наугад хуже, чем не навешивать: фраза вокруг
// («Deməli, Berlin. Orası xoşuna gəlir?») прекрасно обходится без него.
const ruIn = (w) => (uiLang() === "az" ? w : (/^[вф][бвгджзклмнпрстфхцчшщ]/i.test(w) ? "во " : "в ") + w);

function ruWord(de) {
  const key = normalize(String(de || ""));
  if (RU_NAMES[key]) return RU_NAMES[key];
  const entry = VOCAB_DE.get(key);
  if (entry) return String(entry.ru).split(/[,;/]/)[0].trim();
  return de; // an unknown name (his own, a friend's) — leaving it as written is right
}

const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function acknowledge(raw) {
  const text = String(raw || "");
  for (const p of SELF_PATTERNS) {
    const m = text.match(p.re);
    if (!m) continue;
    // a translated word can arrive in its lower-case dictionary form ("чай — мне это тоже нравится")
    const said = p.say(m[1]);
    return { ...said, de: capitalise(said.de), ru: capitalise(said.ru) };
  }
  return null;
}


/**
 * Should this turn carry a question at all?
 *
 * Asking every time is an interrogation, not a conversation. She asks when the talk needs a nudge
 * and holds back when Emil has just answered one — and never right after he has said he is tired or
 * struggling, where a question is the last thing that helps.
 */
function shouldAsk(ctx = {}) {
  if (ctx.noAsk) return false;               // the caller knows this turn must not ask
  const since = ctx.sinceQuestion ?? 99;     // turns since she last asked something
  if (since === 0) return Math.random() < 0.35; // she just asked and he answered — usually let it breathe
  if (since === 1) return Math.random() < 0.7;
  return true;                               // two quiet turns is enough; keep the conversation moving
}

/**
 * A turn that closes warmly without asking anything, so the floor stays with Emil.
 * Exactly ONE thing is added — three stacked fragments ("Очень здорово! Ага. Я тебя слушаю. У нас
 * есть время.") read like a machine emptying its buffer, not like a person talking.
 */
function receiveTurn(base, ctx = {}) {
  // a reaction that already says something about what he said needs no generic "ага, понятно"
  const alreadySpecific = /—/.test(base.ru || "") || (base.ru || "").length > 60;
  const pick = (ctx.turns || 0) % 3 === 0 ? SMALLTALK.stories
    : alreadySpecific ? SMALLTALK.soft
      : Math.random() < 0.3 ? SMALLTALK.soft : SMALLTALK.receipts;
  const add = R(pick);
  return {
    ...base,
    de: `${base.de} ${add.de}`.trim(),
    ru: tr`${base.ru} ${add.ru}`.trim(),
    asked: false,
  };
}

/** Append a question to a reaction without losing the reaction itself. */
function withQuestion(base, q) {
  if (!q || !q.de) return { ...base, asked: false };
  return { ...base, de: `${base.de} ${q.de}`.trim(), ru: tr`${base.ru} ${q.ru}`.trim(), topic: q.topic, tip: q.tip || base.tip, asked: true };
}

/** Ask something, or simply receive what he said — decided by shouldAsk(), so she does not interrogate. */
function askOrReceive(base, ctx) {
  // the reaction already asks something of its own ("Тебе там нравится?") — two questions in one
  // breath is exactly the interrogation feeling we are removing
  if (/\?/.test(base.de || "")) return { ...base, asked: true };
  return shouldAsk(ctx) ? withQuestion(base, pickQuestion(ctx)) : receiveTurn(base, ctx);
}

/** Only sometimes tack a question on, so Mia does not interrogate. */
function maybeQuestion(ctx = {}) {
  if (ctx.noAsk) return {}; // the caller is about to ask something itself
  if (Math.random() < 0.45) return {};
  const q = pickQuestion(ctx);
  // forward the tip too: without it «Подсказка» has nothing to show after these branches
  return { de: q.de, ru: q.ru, topic: q.topic, tip: q.tip };
}

/**
 * Choose the next thing to ask: stay on the current topic while it has fresh follow-ups,
 * otherwise open a new one Mia has not used yet in this conversation.
 */
function pickQuestion(ctx = {}) {
  const used = ctx.used || new Set();
  const answer = ctx.lastAnswer ? normalize(ctx.lastAnswer) : "";

  if (ctx.topic && SMALLTALK.followups[ctx.topic]) {
    const pool = SMALLTALK.followups[ctx.topic].filter((f) => !used.has(f.de) && (!f.needs || answer.includes(normalize(f.needs))));
    if (pool.length) {
      const f = pick(pool);
      used.add(f.de);
      return { de: f.de, ru: f.ru, topic: ctx.topic, tip: f.hint || "" };
    }
  }
  const fresh = SMALLTALK.openers.filter((o) => !used.has(o.de));
  const o = fresh.length ? pick(fresh) : pick(SMALLTALK.openers);
  used.add(o.de);
  // The openers begin with a greeting because they are written to start a conversation. Used again
  // as the next question they make Mia say "Hallo Emil!" every single turn, as if she keeps
  // forgetting they have been talking — so drop the greeting once the conversation is under way.
  const started = Boolean(ctx.turns);
  return { de: started ? dropGreeting(o.de) : o.de, ru: started ? dropGreeting(o.ru) : o.ru, topic: o.topic, tip: o.hint || "" };
}

/** Strip a leading "Hallo Emil!" / "Guten Morgen," / "Привет, Эмиль!" from a line. */
function dropGreeting(line) {
  const s = String(line || "")
    .replace(/^\s*(hallo|hi|guten morgen|guten tag|guten abend|привет|здравствуй|доброе утро|добрый день|добрый вечер)[\s,!]*(ali|али)?[\s,!]*/iu, "")
    .trim();
  if (!s) return line;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mia's opening line for a fresh offline conversation. */
export function opening(name = "Emil") {
  const o = pick(SMALLTALK.openers);
  return { de: o.de, ru: o.ru, topic: o.topic, tip: o.hint || "" };
}

export const BRAIN_STATS = {
  words: VOCAB_DE.size,
  grammar: GRAMMAR.length,
  openers: SMALLTALK.openers.length,
  topics: Object.keys(SMALLTALK.followups).length,
  answers: QUESTIONS.aboutHer.length + QUESTIONS.aboutGerman.length + QUESTIONS.aboutGermany.length + SITEHELP.topics.length,
};
