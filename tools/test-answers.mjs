// Regression tests for the answer checker. Run: node tools/test-answers.mjs
import { matchAnswer, spokenSimilarity, digitsToWords, germanNumber, normalize } from "../public/js/utils.js";

const FILL = 1;      // fill-in-the-blank: exact form required
const DE = 0.85;     // ru→de translation
const RU = 0.8;      // de→ru translation

const cases = [
  // fill: the ending IS the answer
  ["heißt", ["heiße", "heisse", "bin"], FILL, false, "wrong conjugation rejected"],
  ["heiße", ["heiße", "heisse", "bin"], FILL, true, "correct form accepted"],
  ["heisse", ["heiße"], FILL, true, "ss spelling accepted"],
  ["sprichst", ["spricht"], FILL, false, "wrong person rejected"],
  ["wohne", ["wohnen"], FILL, false, "wrong number rejected"],
  ["kommt", ["komme"], FILL, false, "wrong person rejected"],
  ["komme", ["komme"], FILL, true, "exact"],
  ["Komme", ["komme"], FILL, true, "case ignored"],
  // translation into German
  ["Ich wohne in Moskau", ["Ich wohne in Moskau."], DE, true, "punctuation ignored"],
  ["Ich wohne in Moskua", ["Ich wohne in Moskau."], DE, true, "letter-swap typo tolerated"],
  ["Ich wohnt in Moskau", ["Ich wohne in Moskau."], DE, false, "verb ending error rejected"],
  ["Ich kommt aus Russland", ["Ich komme aus Russland."], DE, false, "verb ending error rejected"],
  ["Ich heisse Emil", ["Ich heiße Emil.", "Mein Name ist Emil."], DE, true, "ss + missing period"],
  ["Mein Name ist Emil", ["Ich heiße Emil.", "Mein Name ist Emil."], DE, true, "second accepted variant"],
  ["Wie heißt du?", ["Wie heißt du?"], DE, true, "exact question"],
  ["Wie heiße du?", ["Wie heißt du?"], DE, false, "wrong verb form rejected"],
  // translation into Russian
  ["Откуда ты?", ["Откуда ты?", "Откуда ты родом?"], RU, true, "exact"],
  ["Откуда Вы?", ["Откуда ты?"], RU, true, "polite variant tolerated"],
  ["Меня зовут Эмиль", ["Меня зовут Эмиль."], RU, true, "no period"],
  ["Как тебя зовут", ["Как тебя зовут?"], RU, true, "no question mark"],
];

let failed = 0;
for (const [given, accepted, tol, want, note] of cases) {
  const r = matchAnswer(given, accepted, tol);
  if (r.ok !== want) {
    failed++;
    console.log(`FAIL  ${JSON.stringify(given).padEnd(26)} -> ${r.ok} (want ${want}) score ${r.score.toFixed(2)}  | ${note}`);
  }
}

// numbers arriving as digits from speech recognition
const numberCases = [
  ["Meine Nummer ist 0176", "Meine Nummer ist null eins sieben sechs", 0.95],
  ["Ich bin 31 Jahre alt", "Ich bin einunddreißig Jahre alt", 0.95],
  ["Es ist 8 Uhr", "Es ist acht Uhr", 0.95],
];
for (const [heard, target, min] of numberCases) {
  const s = spokenSimilarity(heard, target);
  if (s < min) { failed++; console.log(`FAIL  spoken ${JSON.stringify(heard)} vs target -> ${s.toFixed(2)} < ${min}`); }
}

if (germanNumber(31) !== "einunddreissig") { failed++; console.log("FAIL germanNumber(31) =", germanNumber(31)); }
if (normalize("Groß") !== "gross") { failed++; console.log("FAIL normalize ß"); }

console.log(failed ? `\n${failed} FAILURES` : `All ${cases.length + numberCases.length + 2} answer-checker tests pass`);
process.exit(failed ? 1 : 0);
