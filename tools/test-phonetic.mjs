// Починка расслышанного не должна ни пропускать немецкое, ни трогать родное.
//
//   node tools/test-phonetic.mjs
//
// Человек говорит Мие по-немецки, а микрофон в этот момент слушает русский — и записывает
// «гутен так мир». public/js/phonetic.js разворачивает это обратно в «Guten Tag Mia».
//
// Опасность тут ровно одна и она обоюдная. Чинить слишком охотно — значит переписывать человеку
// его же русские слова на немецкие, которых он не говорил; чинить слишком робко — значит не
// чинить вовсе. Поэтому тест держит обе границы сразу: список того, что ОБЯЗАНО починиться,
// и список того, что НЕЛЬЗЯ трогать. Пороги в модуле стоят между ними, и этот файл следит,
// чтобы они там и остались.
//
// Отдельно проверяется «так»: его скелет совпадает с Tag ТОЧНО, и никакая мера похожести их не
// разделит. Спасает только правило про одиночные короткие слова — если оно сломается, человек
// начнёт получать «Tag» всякий раз, когда скажет «так».

// phonetic.js тянет levels.js и utils.js — обоим хватает пустых заглушек, окна они не трогают.
globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, append() {} }), documentElement: {} };
Object.defineProperty(globalThis, "navigator", { value: { language: "ru-RU", userAgent: "node" }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const { repairGerman, skeleton, NATIVE_COMMON } = await import("../public/js/phonetic.js");

let failed = 0;
const fail = (msg) => { failed++; console.log("ПРОВАЛ " + msg); };

const NAMES = ["Mia", "Эмиль"];
const say = (text, alphabet = "cyr") => repairGerman(text, { alphabet, names: NAMES });

/* ---------------------------------------------------------- обязано чиниться */

// Ожидание — точная строка: учебнику нельзя показывать «Danke schon» вместо «Danke schön».
const MUST_FIX = [
  ["гутен так мир", "Guten Tag Mia"],
  ["гутен морген", "Guten Morgen"],
  ["их хайсе", "Ich heiße"],
  ["ихь бин эмиль", "Ich bin Emil"],
  ["ви гейтс", "Wie geht's?"],
  ["данке шён", "Danke schön"],
  ["аух видерзейн", "Auf Wiedersehen"],
  ["вас махст ду", "Was machst du"],
  ["энтшульдигунг", "Entschuldigung"],
];

for (const [heard, want] of MUST_FIX) {
  const got = say(heard).text;
  if (got !== want) fail(`«${heard}» → «${got}», а ожидалось «${want}»`);
}

/* ------------------------------------------------------------ нельзя трогать */

// Человек правда говорит на своём. Любая починка здесь — это подмена его слов.
const MUST_KEEP = [
  "привет как дела",
  "я не понял объясни ещё раз",
  "что такое артикль",
  "мне нравится этот урок",
  "спасибо большое",
  "так",        // скелет точно совпадает с Tag — держится только правилом про одиночные слова
  "да",
  "нет",
  "что",
  "как дела",
];

for (const heard of MUST_KEEP) {
  const r = say(heard);
  if (r.changed) fail(`«${heard}» трогать нельзя, а получилось «${r.text}»`);
}

/* ------------------------------------------------------------------ скелеты */

// Кириллица и немецкая орфография обязаны сходиться в один скелет — на этом всё и держится.
const SAME = [
  ["гутен", "guten"],
  ["так", "Tag"],
  ["их", "ich"],
  ["хайсе", "heiße"],
  ["шён", "schön"],
  ["данке", "danke"],
  ["энтшульдигунг", "Entschuldigung"],
  ["махст", "machst"],
  ["вас", "was"],
];
for (const [cyr, de] of SAME) {
  const a = skeleton(cyr, "cyr");
  const b = skeleton(de, "de");
  if (a !== b) fail(`скелеты разошлись: «${cyr}» → ${a}, «${de}» → ${b}`);
}

// А эти сходиться НЕ должны, иначе короткие слова начнут подменяться друг другом. Ради этого
// f и v оставлены разными звуками: немецкое v читается как [f], w — как [v], и если их слить,
// vier и wir станут одним словом.
const DIFFERENT = [["vier", "wir"], ["viel", "wie"]];
for (const [a, b] of DIFFERENT) {
  if (skeleton(a, "de") === skeleton(b, "de")) fail(`скелеты слиплись: «${a}» и «${b}» → ${skeleton(a, "de")}`);
}

/* ------------------------------------------------- азербайджанский через турецкий */

// Сервис распознавания не знает азербайджанского и подменяется турецким (см. STT_ALTERNATIVE
// в speech.js), так что немецкая речь приходит латиницей по турецким правилам.
for (const [heard, want] of [["guten tak", "Guten Tag"], ["şön", "schön"]]) {
  const got = skeleton(heard.split(" ")[0], "tr");
  const need = skeleton(want.split(" ")[0], "de");
  if (got !== need) fail(`турецкая таблица: «${heard.split(" ")[0]}» → ${got}, а «${want.split(" ")[0]}» → ${need}`);
}

/* ------------------------------------------------------------------ немецкий режим */

// Микрофон слушал немецкий — чинить нечего и нельзя: строка уже немецкая.
if (say("Guten Tag", "de").changed) fail("при alphabet=de починка обязана молчать");

/* ------------------------------------------------------------------ мелочи */

if (!NATIVE_COMMON.has("так")) fail("«так» обязано быть в списке частых родных слов");
if (!NATIVE_COMMON.has("дела")) fail("«дела» обязано быть в списке частых родных слов");
if (say("").changed) fail("пустая строка не должна меняться");

console.log(
  failed
    ? `\n${failed} FAILURES`
    : `Починка распознанного: ${MUST_FIX.length} чинится, ${MUST_KEEP.length} не трогается, скелеты сходятся`,
);
process.exit(failed ? 1 : 0);
