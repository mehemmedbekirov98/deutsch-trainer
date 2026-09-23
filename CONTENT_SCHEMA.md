# Level content contract (Lingua Mia)

Every level lives in `public/js/content/levelNN.js` (NN = two digits, `level01.js` … `level36.js`) and is an ES module:

```js
export default { ...level object... };
```

The learner is **Emil**, an adult beginner. He is a character, not a person: give him no biography beyond what a textbook example needs — no wife, no home town, no back story.

All *instructions, explanations, translations* are written in **Russian**, and all *target language material* in **German** (correct spelling with ä ö ü ß, nouns with their article, `du` when addressing Emil). Tone: friendly, adult, never childish.

**The German is the anchor, the Russian is its gloss.** The site also explains in Azerbaijani, and that translation is keyed by the Russian string (see `public/js/i18n.js`). So the Russian must say exactly what the German says, and nothing that only makes sense for a Russian speaker — "Ich spreche Russisch" is glossed "Я говорю по-русски" and translated "Mən rusca danışıram", never localised to another language. Changing a Russian string orphans its translation; `npm run i18n` is what tells you.

Validate a file with: `node tools/validate-content.mjs public/js/content/level05.js` — it must print `OK`.
Check the whole course and both languages with `npm run check`.

## Level object

| field | type | rules |
|---|---|---|
| `id` | number | 1..36, equals NN |
| `cefr` | string | `"A1"` (1–12), `"A2"` (13–24) or `"B1"` (25–36) — required |
| `slug` | string | lowercase ascii, e.g. `"hallo"` |
| `title` | string | German title, e.g. `"Hallo & Vorstellung"` |
| `titleRu` | string | Russian title |
| `emoji` | string | one emoji |
| `color` | string | hex accent color, e.g. `"#7c5cff"` (use the one assigned to you) |
| `intro` | string | 1–2 Russian sentences: what Emil will learn |
| `goals` | string[] | 3–4 short Russian goals ("Представиться и спросить имя") |
| `vocab` | Vocab[] | 24–32 items |
| `grammar` | Grammar[] | 2–3 items |
| `exercises` | Exercise[] | 30–36 items, mixed types (see distribution) |
| `dialogue` | Dialogue | one listening dialogue, 8–12 lines |
| `speaking` | Speaking | voice-practice scenario |
| `exam` | Exercise[] | exactly 10 items, no `speak` type, at most 1 `listen`, harder mix |

### Vocab
```js
{ de: "der Name", ru: "имя", plural: "die Namen",      // plural only for nouns (optional)
  example: "Mein Name ist Emil.", exampleRu: "Меня зовут Эмиль." }
```
- Nouns: always with article in `de` ("die Frau", "das Kind"). Verbs in infinitive ("kommen"). Phrases allowed ("Guten Morgen").
- `example` is a full simple German sentence, `exampleRu` its Russian translation. Both required.

### Grammar
```js
{ title: "Глагол sein (быть)",
  body: "Короткое объяснение на русском (2–5 предложений). Переносы строк допустимы.",
  table: { headers: ["Лицо", "sein"], rows: [["ich", "bin"], ["du", "bist"], ["er/sie/es", "ist"], ["wir", "sind"], ["ihr", "seid"], ["sie/Sie", "sind"]] }, // optional
  examples: [{ de: "Ich bin Emil.", ru: "Я Эмиль." }] }   // 2–4 examples
```

### Exercise types (exact shapes)

Every exercise may have an optional `explain` (Russian, one sentence, shown after answering).

1. **choice** — one correct option
```js
{ type: "choice", q: "Как сказать «Доброе утро»?", options: ["Guten Abend", "Guten Morgen", "Gute Nacht"], answer: 1, explain: "Morgen — утро." }
```
`q` can be Russian or German. 3–4 options, `answer` = index of the correct one.

2. **fill** — fill the blank (`___` = exactly three underscores, exactly one blank)
```js
{ type: "fill", sentence: "Ich ___ aus Russland.", answers: ["komme"], options: ["komme", "kommst", "kommt"], ru: "Я из России.", explain: "ich → komme" }
```
`options` optional: with options the UI shows chips, without options the user types. `answers` = every accepted spelling.

3. **translate** — translate a short sentence
```js
{ type: "translate", dir: "ru-de", text: "Меня зовут Эмиль.", answers: ["Ich heiße Emil.", "Mein Name ist Emil."], hint: "heißen / Name" }
{ type: "translate", dir: "de-ru", text: "Woher kommst du?", answers: ["Откуда ты?", "Откуда ты родом?"], hint: "woher = откуда" }
```
Comparison is forgiving (case, punctuation, ß/ss, ё/е are ignored), but list every natural variant in `answers` (2–4). Keep sentences ≤ 6 words.

4. **order** — put words in order
```js
{ type: "order", words: ["komme", "Ich", "aus", "Berlin"], answer: "Ich komme aus Berlin.", ru: "Я из Берлина." }
```
`words` = the tokens of `answer` without final punctuation, listed in a scrambled order. 4–7 words.

Optional `alt: ["Ich fahre um sechs nach Hause."]` — other word orders that are just as correct and
mean the same as `ru`. Use it when the sentence genuinely has two natural orders (typically when a
time or place phrase can stand either in first position or after the verb), so Emil is not marked
wrong for good German. Each entry must be buildable from exactly the same chips — the validator
checks this. Do not list orders that are merely grammatical but unnatural, or that contradict `ru`.

5. **match** — match German ↔ Russian
```js
{ type: "match", pairs: [{ de: "Danke", ru: "Спасибо" }, { de: "Bitte", ru: "Пожалуйста" }, { de: "Tschüss", ru: "Пока" }, { de: "Entschuldigung", ru: "Извините" }] }
```
4–6 pairs, all Russian sides distinct.

6. **listen** — the app reads `text` aloud (TTS), Emil answers
```js
{ type: "listen", text: "Guten Tag, ich heiße Anna.", mode: "choice", options: ["Anna", "Anne", "Hanna"], answer: 0, q: "Как зовут женщину?", ru: "Добрый день, меня зовут Анна." }
{ type: "listen", text: "Ich komme aus Berlin.", mode: "type", answers: ["Ich komme aus Berlin."], ru: "Я из Берлина." }
```
`mode: "choice"` needs `q`, `options`, `answer`; `mode: "type"` needs `answers` (Emil types what he heard). `ru` = translation, always present.

7. **speak** — Emil repeats the sentence into the microphone (speech recognition compares)
```js
{ type: "speak", text: "Ich heiße Emil.", ru: "Меня зовут Эмиль." }
```
Short (2–6 words), pronounceable, useful in real life.

### Distribution for `exercises` (30–36 total)
- choice 8–10, fill 6–8, translate 5–6, order 4–5, match 3, listen 3, speak 3–4.
- Order them from easy to harder. Every vocab word should appear in at least one exercise or the dialogue. Every grammar point must be trained by ≥ 4 exercises.
- Do not repeat the same sentence in several exercises. Do not use a listen `type` sentence that also appears verbatim as a translate item.

### Dialogue
```js
{ title: "Im Sprachkurs", titleRu: "На курсах немецкого",
  lines: [ { speaker: "Mia", de: "Hallo! Ich bin Mia. Und du?", ru: "Привет! Я Мия. А ты?" },
           { speaker: "Emil",  de: "Hallo Mia, ich bin Emil.",      ru: "Привет, Мия, я Эмиль." } ] }
```
8–12 lines, 2 speakers (one of them is `"Emil"`), sentences short and natural, uses this level's vocab and grammar.

### Speaking (voice practice with the tutor "Mia")
```js
{ title: "Знакомство на вечеринке",
  scenario: "Русское описание ситуации для Эмиль: Ты на вечеринке в Берлине. Познакомься с Мией: скажи, как тебя зовут, откуда ты, сколько тебе лет.",
  tutorBrief: "English brief for the AI tutor: Mia meets Emil at a party. Ask his name, where he is from, his age, what languages he speaks. Target structures: ich heiße, ich komme aus, ich bin ... Jahre alt, ich spreche. Keep to A1 vocab from the greeting topic.",
  phrases: [ { de: "Ich heiße Emil.", ru: "Меня зовут Эмиль." }, ... ],      // 6–8 useful phrases
  script: [                                                              // 6–8 turns, used when AI is offline
    { say: "Hallo! Ich bin Mia. Wie heißt du?", sayRu: "Привет! Я Мия. Как тебя зовут?", hint: "Ich heiße …", expect: ["heiße", "heisse", "bin", "name"] },
    ...
    { say: "Super, Emil! Das war sehr gut. Bis bald!", sayRu: "Отлично, Эмиль! Это было очень хорошо. До скорого!", hint: "Tschüss, Mia!", expect: ["tschüss", "tschuss", "bis", "ciao"] }
  ] }
```
`expect` = lowercase keywords; if Emil's recognized speech contains any of them the turn counts as passed. The last script turn must be a goodbye.

## Quality bar
- Native-quality German, A1 vocabulary (Goethe-Zertifikat A1 word list), no grammar beyond the level's plan.
- Russian is natural, short, encouraging; Emil is addressed as «ты».
- Avoid politics, religion, alcohol, dating; everyday adult life is fine (work, city, café, travel, sport, family).
- Only plain data: strings, numbers, arrays, objects. No functions, no imports, no comments needed.
