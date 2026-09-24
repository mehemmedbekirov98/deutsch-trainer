// Offline brain smoke test: does Mia understand and answer sensibly without any API key?
// usage: node tools/test-brain.mjs
import { understand, respond, opening, checkGerman, BRAIN_STATS, resetBrainIndex } from "../public/js/brain.js";
import { loadAzFull } from "../public/js/i18n.js";

// Азербайджанский указатель слов строится из словаря перевода, а тот грузится динамически.
// Без этого половина азербайджанских проверок молча прошла бы мимо: слово просто не нашлось бы.
await loadAzFull();

const cases = [
  ["привет", "greeting"],
  ["Hallo Mia", "greeting"],
  ["что значит Brot", "word"],
  ["как будет спасибо по-немецки", "word"],
  ["объясни глагол sein", "grammar"],
  ["почему der die das", "aboutGerman"],
  ["как тебя зовут", "aboutHer"],
  ["сколько тебе лет", "aboutHer"],
  ["как найти работу в германии", "aboutGermany"],
  ["что такое монеты на сайте", "site"],
  ["как открыть следующий уровень", "site"],
  ["я не понимаю", "confused"],
  ["повтори пожалуйста", "repeat"],
  ["я устал сегодня", "feelingBad"],
  ["всё отлично", "feelingGood"],
  ["Ich komme aus Baku", "germanSentence"],
  ["Ich bin Fahrer", "germanSentence"],
  ["спасибо", "thanks"],
  ["пока", "bye"],
  ["", "empty"],

  // Азербайджанский. Мия отвечать на нём умела всегда — её реплики переводятся словарём, — а
  // вот слышала до сих пор только русский и немецкий, и для человека без ключа Anthropic это
  // значило, что офлайн-режима у него просто нет.
  ["Salam!", "greeting"],
  ["Sabahın xeyir, Mia", "greeting"],
  ["Haus nə deməkdir?", "word"],
  ["ev almanca necədir", "word"],
  ["ev almanca necedir", "word"],            // без диакритики — так печатают чаще всего
  ["su almanca necədir", "word"],            // двухбуквенное слово: раньше отсеивалось фильтром
  ["başa düşmürəm", "confused"],
  ["basa dusmurem", "confused"],
  ["bir də de, zəhmət olmasa", "repeat"],
  ["yorğunam, çox çətindir", "feelingBad"],
  ["hər şey əladır", "feelingGood"],
  ["çox sağ ol", "thanks"],
  ["hələlik", "bye"],
  // маршрутизация по группам: не просто «поняла», а «поняла КУДА»
  ["necəsən", "aboutHer"],
  ["haradan gəlmisən", "aboutHer"],
  ["artikllər niyə var", "aboutGerman"],
  ["neçə ay çəkəcək", "aboutGerman"],
  ["almaniyada iş necə tapmaq olar", "aboutGermany"],
  ["viza lazımdırmı", "aboutGermany"],
  ["sikkələr nə üçündür", "site"],
  ["yazılı imtahan nədir", "site"],
  // разговорник открывается и азербайджанским зачином, иначе весь его matchAz недостижим
  ["almanca bilmirəm necə deyilir", "small"],
  ["almanca təşəkkür necə deyilir", "small"],
];

let failed = 0;
const ctx = { used: new Set(), turns: 1 };
for (const [input, wantIntent] of cases) {
  const u = understand(input);
  const r = respond(u, ctx);
  const okIntent = u.intent === wantIntent;
  const hasDe = typeof r.de === "string" && r.de.length > 0;
  const hasRu = typeof r.ru === "string" && r.ru.length > 0;
  if (!okIntent || !hasDe || !hasRu) {
    failed++;
    console.log(`FAIL  ${JSON.stringify(input).padEnd(34)} intent=${u.intent} (want ${wantIntent}) de=${hasDe} ru=${hasRu}`);
  }
}

// a real conversation must not repeat itself or run dry
const seen = new Set();
let repeats = 0;
const conv = { used: new Set(), topic: null, turns: 0 };
const replies = ["gut", "Ich arbeite viel", "ja", "Ich esse gern Fleisch", "nein", "Ich wohne in Baku", "Ich spiele Fußball", "ja genau", "Ich lerne jeden Tag", "sehr gut", "Ich habe eine Schwester", "Ich trinke Tee"];
for (const reply of replies) {
  conv.turns++;
  const r = respond(understand(reply), conv);
  if (r.topic) conv.topic = r.topic;
  if (seen.has(r.de)) repeats++;
  seen.add(r.de);
}
if (repeats > 2) { failed++; console.log(`FAIL  conversation repeated itself ${repeats} times in ${replies.length} turns`); }

// every answer she can give must have both languages filled in
for (const input of ["что значит Haus", "объясни артикли", "что такое XP", "как дела"]) {
  const r = respond(understand(input), { used: new Set(), turns: 2 });
  if (!r.de || !r.ru) { failed++; console.log(`FAIL  ${input}: missing de/ru`); }
}

// A German yes/no question puts the verb first, so no W-word test catches it. Without this the
// pre-written answers about her can only ever be reached in Russian.
for (const q of ["Bist du ein Roboter?", "Hast du Kinder?", "Magst du Fußball?", "Kennst du Baku?", "Wie geht es dir?"]) {
  const u = understand(q);
  if (u.intent !== "aboutHer") { failed++; console.log(`FAIL  ${q}: intent=${u.intent}, want aboutHer`); }
}

// ...while a statement about himself must never be mistaken for a question about her
for (const s of ["Ich bin Programmierer", "Ich habe eine Katze", "Ich heiße Emil"]) {
  const u = understand(s);
  if (u.intent === "aboutHer") { failed++; console.log(`FAIL  ${s}: read as a question about Mia`); }
}

// She has to answer the content, not praise him and change the subject.
const echoes = [
  ["Ich heiße Emil", /Freut mich, Emil/],
  ["Ich komme aus Baku", /aus Baku/i],
  ["Ich arbeite als Programmierer", /Programmierer/],
  ["Ich trinke gern Tee", /Tee/],
];
for (const [said, want] of echoes) {
  const r = respond(understand(said), { used: new Set(), turns: 2 });
  if (!want.test(r.de)) { failed++; console.log(`FAIL  "${said}" -> "${r.de}" does not pick up what he said`); }
}

// Emil writes in Russian, and rarely in the exact words a phrase list happens to store. She has an
// answer for all of these — she must actually find it instead of saying she cannot help.
for (const q of ["расскажи про Берлин", "а ты что любишь есть?", "ты замужем?", "у тебя есть кот?",
                 "а ты откуда вообще", "как найти работу в Германии", "а музыку какую слушаешь"]) {
  const r = respond(understand(q), { used: new Set(), turns: 3 });
  if (/не смогу|не знаю/.test(r.explainRu || "")) { failed++; console.log(`FAIL  "${q}" left unanswered`); }
}

// ...but a loose word overlap must never hijack a question that has a precise answer
for (const [q, want] of [["объясни глагол sein", "grammar"], ["почему der die das", "aboutGerman"], ["что значит Haus", "word"]]) {
  const got = understand(q).intent;
  if (got !== want) { failed++; console.log(`FAIL  "${q}" -> ${got}, want ${want}`); }
}

// Russian words that used to be misread because a keyword sat inside a longer word: "пока" as
// "for now", "чего" inside "ничего", "плохо" inside "неплохо". Each of these ended or derailed
// the conversation.
for (const [text, mustNotBe] of [["пока не знаю", "bye"], ["я пока учу немецкий", "bye"],
                                 ["ничего страшного", "confused"], ["неплохо", "feelingBad"],
                                 ["всё неплохо", "feelingBad"], ["мне не трудно", "help"]]) {
  const got = understand(text).intent;
  if (got === mustNotBe) { failed++; console.log(`FAIL  "${text}" read as ${got}`); }
}
// ...while the real signals still have to land
for (const [text, want] of [["пока", "bye"], ["до свидания", "bye"], ["ничего не понял", "confused"],
                            ["мне трудно", "feelingBad"], ["я устал", "feelingBad"], ["помоги", "help"], ["повтори", "repeat"]]) {
  const got = understand(text).intent;
  if (got !== want) { failed++; console.log(`FAIL  "${text}" -> ${got}, want ${want}`); }
}

// A short farewell word must not end the conversation when it is part of a real sentence:
// "давай попробуем" and "пока всё хорошо" used to hang up on him.
for (const text of ["давай попробуем", "давай ещё", "ну давай", "пока нормально", "пока всё хорошо", "пока не знаю"]) {
  if (understand(text).intent === "bye") { failed++; console.log(`FAIL  "${text}" ended the conversation`); }
}
for (const text of ["пока", "пока мия", "ну пока", "до свидания"]) {
  if (understand(text).intent !== "bye") { failed++; console.log(`FAIL  "${text}" is a goodbye and was not read as one`); }
}

// A two-word phrase must not match on one short filler word: "как ты" once made every Russian
// "как …" question land on her "как дела" answer.
for (const text of ["как твой день", "как работа", "как прошёл день"]) {
  const r = respond(understand(text), { used: new Set(), turns: 3 });
  if (/У меня всё хорошо, спасибо/.test(r.ru || "")) {
    failed++; console.log(`FAIL  "${text}" was answered with the «как дела» reply`);
  }
}

// A Russian statement has to come back with something in Russian that picks up what he said —
// it used to fall to the generic branch and answer in German only.
for (const text of ["я сегодня купил хлеб", "мой брат работает врачом", "у меня новая квартира"]) {
  const u = understand(text);
  const r = respond(u, { used: new Set(), turns: 3 });
  if (u.intent !== "ruStatement") { failed++; console.log(`FAIL  "${text}" -> ${u.intent}, want ruStatement`); }
  else if (!r.explainRu) { failed++; console.log(`FAIL  "${text}" came back with no Russian`); }
}

// The phrasebook may only fire on an explicit request, or Mia recites Emil's own sentence back.
for (const text of ["Мне не нравится немецкая грамматика", "У меня всё хорошо сегодня на работе"]) {
  if (understand(text).intent === "small") { failed++; console.log(`FAIL  "${text}" parroted from the phrasebook`); }
}
for (const text of ["как сказать не знаю", "как сказать подожди"]) {
  if (understand(text).intent !== "small") { failed++; console.log(`FAIL  "${text}" did not reach the phrasebook`); }
}

// Every small-talk question must carry a sayable answer — that is what «💡 Подсказка» shows.
{
  const st = { used: new Set(), topic: null, turns: 3 };
  let noTip = 0;
  for (let i = 0; i < 12; i++) {
    st.turns++;
    const r = respond(understand("Ich lerne Deutsch"), st);
    if (r.topic) st.topic = r.topic;
    if (!r.tip) noTip++;
  }
  if (noTip) { failed++; console.log(`FAIL  ${noTip}/12 replies had no hint to offer`); }
}

// Не допрос. She used to end EVERY turn with a question, which is what made talking to her feel
// like an interview. Over a long conversation a good share of turns must simply receive what he
// said, and no single turn may fire two questions at once.
{
  const st = { used: new Set(), topic: null, turns: 0, sinceQuestion: 0 };
  const said = ["Hallo", "Mir geht es gut", "Ich arbeite viel", "ja", "Ich esse gern Brot",
                "Ich wohne in Baku", "nein", "Ich spiele Fußball", "ja genau", "Ich lerne jeden Tag",
                "мой брат работает врачом", "Ich trinke Tee"];
  let asked = 0;
  for (const s of said) {
    st.turns++;
    const r = respond(understand(s, st), st);
    if (r.topic) st.topic = r.topic;
    st.lastAnswer = s;
    st.sinceQuestion = r.asked ? 0 : (st.sinceQuestion ?? 0) + 1;
    if (r.asked) asked++;
  }
  if (asked === said.length) { failed++; console.log(`FAIL  every one of ${said.length} turns ended with a question — that is an interrogation`); }
}

// A reaction that already asks something ("In Baku also. Wohnst du gern dort?") must not get a
// second, unrelated question bolted on. (A tag question inside one stored line — "Und wie ist dein
// Abend? Ruhig?" — is normal speech and is fine.)
for (let i = 0; i < 20; i++) {
  const r = respond(understand("Ich wohne in Baku"), { used: new Set(), turns: 2, sinceQuestion: 9 });
  if (/Wohnst du gern dort\?.*\?/s.test(r.de)) {
    failed++; console.log(`FAIL  a second question was stacked on a reaction that already asked: ${r.de}`);
    break;
  }
}

// When he says he is tired or struggling: comfort, and never a question or a new topic.
for (const text of ["я сегодня устал", "мне очень тяжело", "я устала и ничего не получается"]) {
  const r = respond(understand(text), { used: new Set(), turns: 3, sinceQuestion: 4 });
  // `asked` is the structural signal — a warm tag like «отдохни, ладно?» is fine, a new topic is not
  if (r.asked) { failed++; console.log(`FAIL  "${text}" was answered with a new question`); }
  if (r.topic) { failed++; console.log(`FAIL  "${text}" pivoted to a new topic instead of staying with him`); }
  // and the comfort must be about him, not a compliment about his German
  if (/правильно|почти|звучит|молодец, как ты сказал/i.test(r.explainRu || "")) {
    failed++; console.log(`FAIL  "${text}" got a grammar compliment instead of comfort: ${r.explainRu}`);
  }
}

// Russian needs a case ending where German does not. «Из Берлин» and «в Москва» read as machine
// output to the only person who will ever use this.
for (const [said, want] of [["Ich komme aus Berlin", "Из Берлина"], ["Ich komme aus Moskau", "Из Москвы"],
                            ["Ich komme aus Deutschland", "Из Германии"], ["Ich komme aus Baku", "Из Баку"],
                            ["Ich wohne in Berlin", "в Берлине"], ["Ich wohne in Frankfurt", "во Франкфурте"],
                            ["Ich wohne in Wien", "в Вене"], ["Ich wohne in Baku", "в Баку"]]) {
  const r = respond(understand(said), { used: new Set(), turns: 2, sinceQuestion: 9 });
  if (!(r.ru || "").includes(want)) { failed++; console.log(`FAIL  "${said}" -> "${r.ru}", want «${want}»`); }
}

// ruWord() looks names up through normalize(), which writes ö as oe and ü as ue — keys spelled with
// umlauts silently never matched and the German name was left sitting in the Russian sentence.
for (const [said, want] of [["Ich komme aus München", "Мюнхен"], ["Ich komme aus Köln", "Кёльн"],
                            ["Ich spreche Türkisch", "турецком"]]) {
  const r = respond(understand(said), { used: new Set(), turns: 2, sinceQuestion: 9 });
  if (!(r.ru || "").includes(want)) { failed++; console.log(`FAIL  "${said}" -> "${r.ru}", want «${want}»`); }
}

// The word she picks up must be a word he actually said. A four-letter prefix match used to tie
// «дорога» to «дорого» and «квартира» to «квартал», and the answer then made no sense at all.
for (const text of ["я сегодня купил хлеб", "мой брат работает врачом", "у меня новая квартира",
                    "я вчера был в магазине", "моя жена готовит суп", "я работаю водителем уже десять лет"]) {
  const r = respond(understand(text), { used: new Set(), turns: 3, sinceQuestion: 2 });
  const m = (r.explainRu || "").match(/про «([^»]+)»/);
  if (m && !text.includes(m[1])) { failed++; console.log(`FAIL  "${text}" -> она отвечает про «${m[1]}», которого он не говорил`); }
}

// Emil speaks into a microphone, which never produces a question mark, and types without one too.
// Her whole knowledge base used to sit behind a gate that required one: 178 of 304 prepared
// phrases could not be reached at all by voice.
{
  const asked = ["кем ты работаешь", "нужна ли виза", "страховка", "прописка", "транспорт",
                 "ты замужем", "твоё имя", "боюсь говорить", "сколько стоит жильё"];
  const dead = asked.filter((q) => !["aboutHer", "aboutGerman", "aboutGermany", "site"].includes(understand(q).intent));
  if (dead.length) { failed++; console.log(`FAIL  без «?» не доходят до ответа: ${dead.join(", ")}`); }
}
// …while a plain statement about his own day must never be captured by a topic
for (const text of ["вчера ходил в магазин", "мне нравится учить немецкий", "я вчера был в банке",
                    "я живу в Баку", "у меня есть виза", "завтра еду на метро"]) {
  const got = understand(text).intent;
  if (["aboutHer", "aboutGerman", "aboutGermany", "site"].includes(got)) {
    failed++; console.log(`FAIL  "${text}" перехвачено темой ${got}`);
  }
}

// The correction card rebuilt the sentence from the raw text using a normalised token, so a verb
// with ß or an umlaut was never replaced and Emil saw his mistake twice with an arrow between.
for (const [said, want] of [["Ich heißt Emil", "Ich heiße Emil"], ["Du heiße Mia", "Du heißt Mia"],
                            ["Er komme aus Baku", "Er kommt aus Baku"]]) {
  const c = checkGerman(said);
  if (!c || c.corrected !== want) { failed++; console.log(`FAIL  checkGerman("${said}") -> ${c ? c.corrected : "null"}, want "${want}"`); }
}
// …and it must stay silent rather than show an unchanged "correction"
for (const ok of ["Ich heiße Emil", "Du heißt Mia", "Er kommt aus Baku"]) {
  if (checkGerman(ok)) { failed++; console.log(`FAIL  checkGerman("${ok}") предложило исправление для верной фразы`); }
}

// «у меня есть брат» is about his family, not about eating
for (const [text, want] of [["у меня есть брат", /Bruder/], ["у меня есть сестра", /Schwester/]]) {
  const r = respond(understand(text), { used: new Set(), turns: 3 });
  if (!want.test(r.explainRu || "")) { failed++; console.log(`FAIL  "${text}" -> ${r.explainRu}`); }
}

// Every opener carries a written answer to itself — that is what «💡 Подсказка» shows on turn one.
for (let i = 0; i < 20; i++) if (!opening("Emil").tip) { failed++; console.log("FAIL  опенер без подсказки"); break; }

// A simple "thank you" must not open a brand-new topic every single time.
{
  let asked = 0;
  for (let i = 0; i < 40; i++) if (respond(understand("спасибо"), { used: new Set(), turns: 3, sinceQuestion: 0 }).asked) asked++;
  if (asked > 30) { failed++; console.log(`FAIL  «спасибо» получило новый вопрос ${asked}/40 раз`); }
}

// An aside mid-role-play must not add a question: the script asks its own on the same breath.
for (const q of ["что значит Brot", "расскажи про Берлин", "что такое XP"]) {
  for (let i = 0; i < 10; i++) {
    const r = respond(understand(q), { used: new Set(), turns: 4, sinceQuestion: 9, noAsk: true });
    if (r.asked) { failed++; console.log(`FAIL  "${q}" задала свой вопрос при noAsk`); break; }
  }
}

// and she must not greet him again on every turn once the conversation is running
let greetings = 0;
const running = { used: new Set(), topic: null, turns: 3 };
for (let i = 0; i < 8; i++) {
  running.turns++;
  const r = respond(understand("Ich lerne Deutsch"), running);
  if (r.topic) running.topic = r.topic;
  if (/^(hallo|hi|guten (morgen|tag|abend))\b/i.test(r.de)) greetings++;
}
if (greetings) { failed++; console.log(`FAIL  greeted again ${greetings}x mid-conversation`); }

// Тот же поиск слова, но ПОСЛЕ перевода уроков — так оно и работает в браузере.
//
// Этот случай первые азербайджанские проверки пропустили: в тестах translateLevels() никто не
// звал, подписи оставались русскими, указатель строился правильно и всё было зелёным. На экране
// же подпись к этому моменту уже азербайджанская, искать её в таблице «русский → азербайджанский»
// бессмысленно, и ни одно слово не находилось.
{
  const { LEVELS } = await import("../public/js/levels.js");
  const { translateLevels, setLangForTest } = await import("../public/js/i18n.js");
  setLangForTest("az");
  translateLevels(LEVELS);
  resetBrainIndex();
  for (const [q, want] of [["ev almanca necədir", "word"], ["su almanca necedir", "word"], ["Haus nə deməkdir", "word"]]) {
    const u = understand(q);
    if (u.intent !== want) { failed++; console.log(`FAIL  после перевода уроков: ${JSON.stringify(q)} → ${u.intent}`); }
  }
  setLangForTest("ru");
}

console.log(`brain: ${BRAIN_STATS.words} слов, ${BRAIN_STATS.grammar} правил, ${BRAIN_STATS.openers} вопросов, ${BRAIN_STATS.topics} тем, ${BRAIN_STATS.answers} готовых ответов`);
console.log(failed ? `\n${failed} FAILURES` : `All ${cases.length + 121} offline-brain checks pass`);
process.exit(failed ? 1 : 0);
