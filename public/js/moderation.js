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

/*
 * То же самое по-азербайджански.
 *
 * Отдельными наборами, а не дописыванием в русские: у азербайджанского латиница со своими
 * буквами (ə, ı, ğ, ş, ç, ö, ü), и граница слова по [а-яё] его не ловит вообще. Список намеренно
 * короткий — ровно то, что осмысленно перехватывать до обращения к модели.
 */
const AZ_SEXUAL = rx([
  "porno", "seks\\s+(?:et|elə|video)", "erotik", "sikiş", "orqazm",
  "fahişə", "yataq\\s+səhnə", "çılpaq\\s+(?:qadın|qız)", "masturb",
]);
const AZ_GAMBLING = rx([
  "kazino", "mərc\\s+(?:oyun|saytı|etmək)", "bukmeker", "rulet(?:ka)?", "poker\\s+pul",
  "oyun\\s+avtomat", "bahis\\s+(?:saytı|oyna)",
]);
const AZ_HATE = rx([
  // порядок слов обратный русскому: «bütün erməniləri öldürmək», а не «убить всех армян»
  "(?:bütün\\s+)?(?:erməni|yəhudi|rus|kürd|ərəb|alman)[a-zçəğıöşü]*\\s+(?:öldür|qır|məhv)",
  "(?:öldür|qır)\\s+(?:bütün\\s+)?(?:erməni|yəhudi|rus|kürd|ərəb|alman)",
  "kafir\\s+(?:öldür|qır)", "irqi\\s+üstünlük", "nasist\\s+(?:salam|şüar)",
]);
const AZ_SELF_HARM = rx([
  "intihar", "özümü\\s+öldür", "damarımı\\s+kəs", "özümü\\s+as(?:maq|acağam)",
  // «yaşamaq istəmirəm» без продолжения — крик о помощи; «bu şəhərdə yaşamaq istəmirəm» — урок про жильё
  "(?<!(?:də|da|lə|la|rə|ra|ilə)\\s)yaşamaq\\s+istəmirəm(?!\\s*[-—,]?\\s*(?:bu|burada|burda|orada|orda|onunla|onlarla|evdə|tək|şəhər|kənd|ölkə))",
]);
const AZ_VIOLENCE = rx([
  "bomba\\s+(?:necə|düzəlt|hazırla)", "partlayıcı\\s+(?:düzəlt|hazırla)",
  "necə\\s+(?:öldür|zəhərlə)[a-zçəğıöşü]*\\s+(?:adam|onu|qonşu)",
  "silah\\s+al[a-zçəğıöşü]*\\s+(?:sənədsiz|qeyri)", "narkotik\\s+(?:al|satın)", "heroin\\s+hara",
]);
const AZ_POLITICS = rx([
  "putin", "zelenski", "tramp(?![a-zçəğıöşü]{3})", "bayden", "navaln",
  "müharibədə\\s+kim\\s+haqlı", "anneksiya", "işğal\\s+(?:haqqında|barədə)",
  "qarabağ\\s+(?:kimin|münaqişə|müharibə)",
]);

const CATEGORIES = [
  { id: "self-harm", re: [SELF_HARM, AZ_SELF_HARM] },
  { id: "hate", re: [HATE, AZ_HATE] },
  { id: "violence", re: [VIOLENCE, AZ_VIOLENCE] },
  { id: "sexual", re: [SEXUAL, AZ_SEXUAL] },
  { id: "gambling", re: [GAMBLING, AZ_GAMBLING] },
  { id: "politics", re: [POLITICS, AZ_POLITICS] },
];

/**
 * What Mia says instead. Kind, short, and it always offers the way back to the lesson.
 *
 * Written out in both languages rather than translated at render time: this is the one reply that
 * has to be right when somebody is in trouble, and the crisis line differs by country — the
 * Azerbaijani version names the Azerbaijani one alongside the German.
 */
const REPLIES_RU = {
  "self-harm": "Слушай, это серьёзнее, чем немецкий, и я не тот собеседник, который тут поможет. Пожалуйста, позвони близкому человеку или на линию поддержки — в Германии это 0800 111 0 111, круглосуточно и бесплатно. Я никуда не денусь и буду здесь, когда захочешь вернуться к занятиям.",
  hate: "Вот об этом я говорить не буду — ни на русском, ни на немецком. Давай лучше вернёмся к делу: спроси меня про слово, про грамматику или просто расскажи, как прошёл день.",
  violence: "Нет, с этим я не помогу. Давай про другое — например, что тебе сегодня нужно сказать по-немецки?",
  sexual: "Это не ко мне — я всё-таки про немецкий. Спроси лучше что-нибудь по теме, я с радостью объясню.",
  gambling: "Про азартные игры не буду, извини. Зато могу рассказать, как в Германии устроен банк, договор или счёт — это пригодится куда больше.",
  politics: "Политику я обхожу стороной — не хочу спорить, хочу помогать тебе с языком. Про то, как устроена Германия по-бытовому — ведомства, страховка, работа — спрашивай сколько угодно.",
};

const REPLIES_AZ = {
  "self-harm": "Bax, bu alman dilindən qat-qat ciddi məsələdir və burada sənə kömək edəcək adam mən deyiləm. Xahiş edirəm, yaxın bir adama zəng et və ya dəstək xəttinə: Azərbaycanda 860, Almaniyada 0800 111 0 111 — sutka boyu və pulsuz. Mən heç yerə getmirəm, dərsə qayıtmaq istəyəndə burada olacağam.",
  hate: "Bu barədə danışmayacağam — nə azərbaycanca, nə almanca. Gəl işimizə qayıdaq: məndən bir söz soruş, qrammatikadan soruş, ya da sadəcə danış, günün necə keçdi.",
  violence: "Yox, bunda kömək etməyəcəyəm. Gəl başqa şeydən danışaq — məsələn, bu gün almanca nə deməli olacaqsan?",
  sexual: "Bu mənlik deyil — mən hər halda alman dili üzrəyəm. Yaxşısı budur, mövzu ilə bağlı nəsə soruş, məmnuniyyətlə izah edərəm.",
  gambling: "Qumar barədə danışmaram, bağışla. Amma Almaniyada bankın, müqavilənin və hesabın necə işlədiyini danışa bilərəm — bu sənə daha çox lazım olacaq.",
  politics: "Siyasətdən yan keçirəm — mübahisə etmək yox, dilə kömək etmək istəyirəm. Almaniyanın məişət tərəfi — idarələr, sığorta, iş — bunları istədiyin qədər soruş.",
};

const REPLIES = { ru: REPLIES_RU, az: REPLIES_AZ };

/**
 * Should this message be answered by the app instead of by the model?
 *
 * @returns {{blocked: boolean, category?: string, reply?: string}}
 */
export function check(text, uiLang = "ru") {
  const t = String(text || "").slice(0, 2000);
  if (!t.trim()) return { blocked: false };
  // "как будет …", "necə olur …" and "что значит …" are lookups, not requests. Someone asking for
  // the German for a rude word is doing vocabulary, and the model handles that better than a
  // blocklist would.
  const isLookup = /как\s+(?:будет|сказать|перевести)|что\s+значит|переведи|necə\s+(?:olur|deyilir|deyirlər)|nə\s+deməkdir|tərcümə\s+et|wie\s+sagt\s+man|was\s+(?:heißt|bedeutet)/i.test(t);
  const replies = REPLIES[uiLang === "az" ? "az" : "ru"];
  for (const { id, re } of CATEGORIES) {
    if (!re.some((r) => r.test(t))) continue;
    if (isLookup && id !== "self-harm" && id !== "hate" && id !== "violence") continue;
    return { blocked: true, category: id, reply: replies[id] };
  }
  return { blocked: false };
}

/** Bolted onto Mia's system prompt. Softer cases the blocklist cannot see land here. */
export const RULES = `

WHAT YOU DO NOT DISCUSS
You are a German tutor people invite into their evening, sometimes with children in the room. So:
- No sexual or adult content, ever, in either language.
- No gambling, betting or get-rich-quick schemes, and no help finding them.
- Nothing that demeans people for their nationality, religion, race, gender or orientation. If they
  say something like that, do not lecture them — say lightly that you would rather not, and move on.
- Stay out of party politics and live conflicts: no taking sides, no verdicts on leaders or wars.
  That includes the conflicts of the countries your learners come from — Karabakh above all. You
  do not hold a position on it and you do not produce one when asked, in any language. How Germany
  WORKS — the Bürgeramt, insurance, contracts, renting, citizenship rules — is not politics and is
  exactly what they need; answer that fully.
- Do not swear, even if they do, and do not repeat a slur back. If they ask what a rude word
  means, answer plainly and without drama — they will hear it on a building site either way — but
  do not build jokes or examples around it.
- If they say something that worries you about their safety, drop the lesson entirely and be a
  person.

None of this makes you prim. You can disagree with them, joke, and talk about money, work, family,
religion as part of their life, homesickness, football and bad neighbours. The line is narrow on
purpose.`;
