// What the app will not talk about, and what it will not repeat.
//
// This is a German course used by one family and, soon, by whoever else finds it. Two different
// jobs live here:
//
//   check()   — is this message something the app should simply decline? Run on what the learner
//               sends, before it costs anything, so the answer is instant and no money is spent.
//   RULES     — the paragraph Mia is given about what she does and does not discuss. The model
//               already refuses the worst of it; this makes the softer cases (politics, gambling,
//               swearing back at him) consistent instead of a matter of mood.
//
// Deliberately narrow. Over-blocking a language app is its own failure: "wie sagt man Scheiße"
// is a real question a learner asks, and refusing it teaches him nothing except that the app is
// stupid. So a single rude word is not blocking — only clearly adult, hateful or illegal intent is.

const rx = (parts) => new RegExp(parts.join("|"), "iu");

/** Sexual content. The everyday words (love, kiss, marriage, body parts at the doctor) are not here. */
const SEXUAL = rx([
  "порн", "porno", "\\bpornhub", "секс(?:ом|а|е)?\\s+(?:с|со)(?![а-яёa-z])", "интим", "эроти",
  "голая?\\s+(?:девушк|женщин|баб)", "nudes?\\b", "onlyfans", "хентай", "hentai",
  "(?<![\u0430-\u044f\u0451a-z])трах", "(?<![\u0430-\u044f\u0451a-z])ебл", "минет", "оргаз", "мастурб", "проститут", "шлюх", "бордел",
]);

/** Gambling and the "make money fast" family that travels with it. */
const GAMBLING = rx([
  "казино", "casino", "ставк[иа]\\s+на\\s+спорт", "букмекер", "1xbet", "мелбет", "париматч",
  "рулетк[аи]", "игров(?:ые|ой)\\s+автомат", "слот[ыс](?![а-яёa-z])", "бетт?инг", "покер\\s+на\\s+деньги",
]);

/** Hate: attacks on people for who they are. Talking ABOUT racism is fine; being racist is not. */
const HATE = rx([
  "жид[ыаов]?(?![а-яёa-z])", "хач[иа]?(?![а-яёa-z])", "чернож", "нигг?ер", "nigg", "унтерменш",
  "(?:смерть|убить|бей|убивай)\\s+(?:всем?|вс[ех]х?)?\\s*(?:евре|мусульман|русск|немц|цыган|украин|араб|турк)",
  "хайль\\s*гитлер", "heil\\s*hitler", "зиг\\s*хайль", "sieg\\s*heil", "white\\s+power",
  "газовы[ех]\\s+камер", "расов(?:ая|ое)\\s+(?:чистот|превосходств)",
]);

/** Harm: to himself, or to somebody else. These get a different, careful answer — see check(). */
const SELF_HARM = rx([
  "покончить\\s+с\\s+собой", "самоубий", "суицид", "убить\\s+себя",
  "не\\s+хочу\\s+(?:больше\\s+)?жить(?!\\s*[-—,]?\\s*(?:в|во|с|со|у|на|за|под|около|рядом|здесь|там|тут|дома|один|одна|вместе|как|по|где))",
  "вскры(?:ть|ю)\\s+вены", "kill\\s+myself", "повеситься",
]);

const VIOLENCE = rx([
  "как\\s+(?:сделать|собрать|изготовить)\\s+(?:бомб|взрывчатк|оружи)",
  "как\\s+(?:убить|зарезать|отравить)\\s+(?:человек|его|её|их|соседа)",
  "купить\\s+(?:оружие|ствол|пистолет)\\s+без", "наркотик[иа]\\s+купить", "где\\s+купить\\s+(?:герои|кокаин|мет)",
]);

/**
 * Politics, but only the inflammatory kind.
 *
 * "How does the Bundestag work" and "what is a Bürgeramt" are exactly what a person moving to
 * Germany needs, so the category is intentionally about taking sides in a live conflict, not about
 * the existence of government.
 */
const POLITICS = rx([
  "путин", "зеленск", "трамп(?![лт])", "байден", "навальн",
  "(?:за|против)\\s+(?:войн[ыу]|сво(?![а-яёa-z]))", "кто\\s+прав\\s+в\\s+войне",
  "аннекс", "оккупац", "хамас", "израил[ья]\\s+(?:против|или)\\s+палест",
]);

const CATEGORIES = [
  { id: "self-harm", re: SELF_HARM },
  { id: "hate", re: HATE },
  { id: "violence", re: VIOLENCE },
  { id: "sexual", re: SEXUAL },
  { id: "gambling", re: GAMBLING },
  { id: "politics", re: POLITICS },
];

/** What Mia says instead. Kind, short, and it always offers the way back to the lesson. */
const REPLIES = {
  "self-harm": "Слушай, это серьёзнее, чем немецкий, и я не тот собеседник, который тут поможет. Пожалуйста, позвони близкому человеку или на линию поддержки — в Германии это 0800 111 0 111, круглосуточно и бесплатно. Я никуда не денусь и буду здесь, когда захочешь вернуться к занятиям.",
  hate: "Вот об этом я говорить не буду — ни на русском, ни на немецком. Давай лучше вернёмся к делу: спроси меня про слово, про грамматику или просто расскажи, как прошёл день.",
  violence: "Нет, с этим я не помогу. Давай про другое — например, что тебе сегодня нужно сказать по-немецки?",
  sexual: "Это не ко мне — я всё-таки про немецкий. Спроси лучше что-нибудь по теме, я с радостью объясню.",
  gambling: "Про азартные игры не буду, извини. Зато могу рассказать, как в Германии устроен банк, договор или счёт — это пригодится куда больше.",
  politics: "Политику я обхожу стороной — не хочу спорить, хочу помогать тебе с языком. Про то, как устроена Германия по-бытовому — ведомства, страховка, работа — спрашивай сколько угодно.",
};

/**
 * Should this message be answered by the app instead of by the model?
 *
 * @returns {{blocked: boolean, category?: string, reply?: string}}
 */
export function check(text) {
  const t = String(text || "").slice(0, 2000);
  if (!t.trim()) return { blocked: false };
  // "как будет …" and "что значит …" are lookups, not requests. Someone asking for the German for
  // a rude word is doing vocabulary, and the model handles that better than a blocklist would.
  const isLookup = /как\s+(?:будет|сказать|перевести)|что\s+значит|переведи|wie\s+sagt\s+man|was\s+(?:heißt|bedeutet)/i.test(t);
  for (const { id, re } of CATEGORIES) {
    if (!re.test(t)) continue;
    if (isLookup && id !== "self-harm" && id !== "hate" && id !== "violence") continue;
    return { blocked: true, category: id, reply: REPLIES[id] };
  }
  return { blocked: false };
}

/** Bolted onto Mia's system prompt. Softer cases the blocklist cannot see land here. */
export const RULES = `

WHAT YOU DO NOT DISCUSS
You are a German tutor people invite into their evening, sometimes with children in the room. So:
- No sexual or adult content, ever, in either language.
- No gambling, betting or get-rich-quick schemes, and no help finding them.
- Nothing that demeans people for their nationality, religion, race, gender or orientation. If Emil
  says something like that, do not lecture him — say lightly that you would rather not, and move on.
- Stay out of party politics and live conflicts: no taking sides, no verdicts on leaders or wars.
  How Germany WORKS — the Bürgeramt, insurance, contracts, renting, citizenship rules — is not
  politics and is exactly what he needs; answer that fully.
- Do not swear, even if he does, and do not repeat a slur back to him. If he asks what a rude word
  means, answer plainly and without drama — he will hear it on a building site either way — but do
  not build jokes or examples around it.
- If he says something that worries you about his safety, drop the lesson entirely and be a person.

None of this makes you prim. You can disagree with him, joke, and talk about money, work, family,
religion as part of his life, homesickness, football and bad neighbours. The line is narrow on
purpose.`;
