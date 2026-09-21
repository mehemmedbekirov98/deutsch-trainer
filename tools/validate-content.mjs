// Validates a level content module against CONTENT_SCHEMA.md
// usage: node tools/validate-content.mjs public/js/content/level01.js [more files]
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// No arguments: check every level there is. npm scripts do not expand globs on Windows, and a
// hand-written list of 36 filenames is a list somebody will forget to update.
const CONTENT = path.join(process.cwd(), "public", "js", "content");
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(CONTENT).filter((f) => /^level[0-9][0-9][.]js$/.test(f)).sort().map((f) => path.join(CONTENT, f));
if (!files.length) {
  console.error("usage: node tools/validate-content.mjs [level file ...]");
  process.exit(2);
}

const TYPES = ["choice", "fill", "translate", "order", "match", "listen", "speak"];
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[.,!?;:"'«»()\-–—]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function checkExercise(ex, i, errs, where, isExam) {
  const at = `${where}[${i}]`;
  if (!ex || typeof ex !== "object") return errs.push(`${at}: not an object`);
  if (!TYPES.includes(ex.type)) return errs.push(`${at}: unknown type "${ex.type}"`);
  const str = (k, req = true) => {
    if (ex[k] === undefined) {
      if (req) errs.push(`${at}: missing "${k}"`);
      return false;
    }
    if (typeof ex[k] !== "string" || !ex[k].trim()) {
      errs.push(`${at}: "${k}" must be a non-empty string`);
      return false;
    }
    return true;
  };
  const arr = (k, min, max) => {
    if (!Array.isArray(ex[k])) {
      errs.push(`${at}: "${k}" must be an array`);
      return false;
    }
    if (ex[k].length < min || ex[k].length > max) errs.push(`${at}: "${k}" needs ${min}..${max} items, has ${ex[k].length}`);
    for (const v of ex[k]) if (typeof v !== "string" || !v.trim()) errs.push(`${at}: "${k}" contains a non-string/empty item`);
    return true;
  };
  const idx = (k, optsKey) => {
    if (!Number.isInteger(ex[k])) return errs.push(`${at}: "${k}" must be an integer index`);
    if (Array.isArray(ex[optsKey]) && (ex[k] < 0 || ex[k] >= ex[optsKey].length)) errs.push(`${at}: "${k}" out of range`);
  };
  if (ex.explain !== undefined && typeof ex.explain !== "string") errs.push(`${at}: "explain" must be a string`);
  switch (ex.type) {
    case "choice":
      str("q");
      arr("options", 3, 4);
      idx("answer", "options");
      if (Array.isArray(ex.options) && new Set(ex.options.map(norm)).size !== ex.options.length) errs.push(`${at}: duplicate options`);
      break;
    case "fill": {
      if (str("sentence")) {
        const n = (ex.sentence.match(/___/g) || []).length;
        if (n !== 1) errs.push(`${at}: sentence must contain exactly one "___" (has ${n})`);
        if (/_{4,}/.test(ex.sentence)) errs.push(`${at}: blank must be exactly three underscores`);
      }
      arr("answers", 1, 6);
      if (ex.options !== undefined) {
        arr("options", 2, 5);
        if (
          Array.isArray(ex.options) &&
          Array.isArray(ex.answers) &&
          !ex.answers.some((a) => ex.options.map(norm).includes(norm(a)))
        )
          errs.push(`${at}: none of "answers" is among "options"`);
      }
      str("ru");
      break;
    }
    case "translate":
      if (!["ru-de", "de-ru"].includes(ex.dir)) errs.push(`${at}: dir must be "ru-de" or "de-ru"`);
      str("text");
      arr("answers", 1, 6);
      str("hint", false);
      if (ex.dir === "ru-de" && typeof ex.text === "string" && !/[а-яё]/i.test(ex.text)) errs.push(`${at}: ru-de text should be Russian`);
      if (ex.dir === "de-ru" && typeof ex.text === "string" && /[а-яё]/i.test(ex.text)) errs.push(`${at}: de-ru text should be German`);
      break;
    case "order": {
      arr("words", 3, 9);
      str("answer");
      str("ru");
      if (Array.isArray(ex.words) && typeof ex.answer === "string") {
        const a = norm(ex.answer).split(" ").sort().join(" ");
        const w = ex.words.map(norm).filter(Boolean).sort().join(" ");
        if (a !== w) errs.push(`${at}: words ${JSON.stringify(ex.words)} do not match answer "${ex.answer}"`);
        if (ex.words.join(" ").replace(/[.!?]$/, "") === ex.answer.replace(/[.!?]$/, "")) errs.push(`${at}: words are not scrambled`);
        // `alt` lists equally correct word orders. Each one has to be buildable from exactly the
        // same chips, otherwise Ali could never produce it and the entry would silently do nothing.
        if (ex.alt !== undefined) {
          if (!Array.isArray(ex.alt) || !ex.alt.length) errs.push(`${at}: alt must be a non-empty array`);
          else ex.alt.forEach((v, i) => {
            if (typeof v !== "string" || !v.trim()) { errs.push(`${at}: alt[${i}] must be a non-empty string`); return; }
            if (norm(v).split(" ").sort().join(" ") !== w) errs.push(`${at}: alt[${i}] "${v}" uses different words than the word bank`);
            if (norm(v) === norm(ex.answer)) errs.push(`${at}: alt[${i}] repeats the main answer`);
          });
        }
      }
      break;
    }
    case "match":
      if (!Array.isArray(ex.pairs)) {
        errs.push(`${at}: pairs must be an array`);
        break;
      }
      if (ex.pairs.length < 4 || ex.pairs.length > 6) errs.push(`${at}: pairs needs 4..6 items`);
      for (const p of ex.pairs)
        if (!p || typeof p.de !== "string" || typeof p.ru !== "string" || !p.de.trim() || !p.ru.trim()) errs.push(`${at}: each pair needs de & ru`);
      if (new Set(ex.pairs.map((p) => norm(p?.ru))).size !== ex.pairs.length) errs.push(`${at}: duplicate ru sides in pairs`);
      if (new Set(ex.pairs.map((p) => norm(p?.de))).size !== ex.pairs.length) errs.push(`${at}: duplicate de sides in pairs`);
      break;
    case "listen":
      str("text");
      str("ru");
      if (ex.mode === "choice") {
        str("q");
        arr("options", 3, 4);
        idx("answer", "options");
      } else if (ex.mode === "type") {
        arr("answers", 1, 6);
      } else errs.push(`${at}: mode must be "choice" or "type"`);
      break;
    case "speak":
      if (isExam) errs.push(`${at}: speak is not allowed in exam`);
      str("text");
      str("ru");
      if (typeof ex.text === "string" && ex.text.split(/\s+/).length > 8) errs.push(`${at}: speak text too long (max 8 words)`);
      break;
  }
}

let failed = false;
for (const f of files) {
  const errs = [];
  let lvl;
  try {
    const mod = await import(pathToFileURL(path.resolve(f)).href);
    lvl = mod.default;
  } catch (e) {
    console.log(`${f}: FAIL\n  cannot import: ${e.message}`);
    failed = true;
    continue;
  }
  if (!lvl || typeof lvl !== "object") errs.push("default export must be an object");
  else {
    const m = path.basename(f).match(/level(\d\d)\.js$/);
    if (m && lvl.id !== Number(m[1])) errs.push(`id ${lvl.id} does not match file name level${m[1]}`);
    // 36 levels: 1–12 A1, 13–24 A2, 25–36 B1
    if (!Number.isInteger(lvl.id) || lvl.id < 1 || lvl.id > 36) errs.push("id must be 1..36");
    const wantCefr = lvl.id <= 12 ? "A1" : lvl.id <= 24 ? "A2" : "B1";
    if (lvl.cefr !== wantCefr) errs.push(`cefr must be "${wantCefr}" for level ${lvl.id}`);
    if (typeof lvl.slug !== "string" || !/^[a-z0-9-]+$/.test(lvl.slug)) errs.push("slug must be lowercase ascii");
    for (const k of ["title", "titleRu", "emoji", "intro"]) if (typeof lvl[k] !== "string" || !lvl[k].trim()) errs.push(`"${k}" must be a non-empty string`);
    if (typeof lvl.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(lvl.color)) errs.push("color must be a #rrggbb hex string");
    if (!Array.isArray(lvl.goals) || lvl.goals.length < 3 || lvl.goals.length > 4) errs.push("goals needs 3..4 items");
    // vocab
    if (!Array.isArray(lvl.vocab)) errs.push("vocab must be an array");
    else {
      if (lvl.vocab.length < 24 || lvl.vocab.length > 32) errs.push(`vocab needs 24..32 items, has ${lvl.vocab.length}`);
      lvl.vocab.forEach((v, i) => {
        for (const k of ["de", "ru", "example", "exampleRu"]) if (typeof v?.[k] !== "string" || !v[k].trim()) errs.push(`vocab[${i}]: missing "${k}"`);
        if (v?.plural !== undefined && typeof v.plural !== "string") errs.push(`vocab[${i}]: plural must be a string`);
      });
      const dupes = lvl.vocab.map((v) => norm(v?.de)).filter((x, i, a) => a.indexOf(x) !== i);
      if (dupes.length) errs.push(`vocab has duplicates: ${[...new Set(dupes)].join(", ")}`);
    }
    // grammar
    if (!Array.isArray(lvl.grammar) || lvl.grammar.length < 2 || lvl.grammar.length > 3) errs.push("grammar needs 2..3 items");
    else
      lvl.grammar.forEach((g, i) => {
        for (const k of ["title", "body"]) if (typeof g?.[k] !== "string" || !g[k].trim()) errs.push(`grammar[${i}]: missing "${k}"`);
        if (!Array.isArray(g?.examples) || g.examples.length < 2 || g.examples.length > 4) errs.push(`grammar[${i}]: examples needs 2..4 items`);
        else
          g.examples.forEach((e, j) => {
            if (typeof e?.de !== "string" || typeof e?.ru !== "string") errs.push(`grammar[${i}].examples[${j}]: needs de & ru`);
          });
        if (g?.table !== undefined) {
          if (!Array.isArray(g.table?.headers) || !Array.isArray(g.table?.rows)) errs.push(`grammar[${i}].table needs headers & rows`);
          else for (const r of g.table.rows) if (!Array.isArray(r) || r.length !== g.table.headers.length) errs.push(`grammar[${i}].table row length mismatch`);
        }
      });
    // exercises
    if (!Array.isArray(lvl.exercises)) errs.push("exercises must be an array");
    else {
      if (lvl.exercises.length < 30 || lvl.exercises.length > 36) errs.push(`exercises needs 30..36 items, has ${lvl.exercises.length}`);
      lvl.exercises.forEach((ex, i) => checkExercise(ex, i, errs, "exercises", false));
      const counts = Object.fromEntries(TYPES.map((t) => [t, lvl.exercises.filter((e) => e?.type === t).length]));
      const need = { choice: [8, 10], fill: [6, 8], translate: [5, 6], order: [4, 5], match: [3, 3], listen: [3, 3], speak: [3, 4] };
      for (const [t, [lo, hi]] of Object.entries(need)) if (counts[t] < lo || counts[t] > hi) errs.push(`exercises: type "${t}" count ${counts[t]} not in ${lo}..${hi}`);
    }
    if (!Array.isArray(lvl.exam)) errs.push("exam must be an array");
    else {
      if (lvl.exam.length !== 10) errs.push(`exam needs exactly 10 items, has ${lvl.exam.length}`);
      lvl.exam.forEach((ex, i) => checkExercise(ex, i, errs, "exam", true));
      if (lvl.exam.filter((e) => e?.type === "listen").length > 1) errs.push("exam: at most 1 listen");
    }
    // dialogue
    const d = lvl.dialogue;
    if (!d || typeof d !== "object") errs.push("dialogue missing");
    else {
      for (const k of ["title", "titleRu"]) if (typeof d[k] !== "string" || !d[k].trim()) errs.push(`dialogue.${k} missing`);
      if (!Array.isArray(d.lines) || d.lines.length < 8 || d.lines.length > 12) errs.push("dialogue.lines needs 8..12 items");
      else {
        d.lines.forEach((l, i) => {
          for (const k of ["speaker", "de", "ru"]) if (typeof l?.[k] !== "string" || !l[k].trim()) errs.push(`dialogue.lines[${i}]: missing "${k}"`);
        });
        const speakers = new Set(d.lines.map((l) => l?.speaker));
        if (speakers.size !== 2) errs.push(`dialogue must have exactly 2 speakers (has ${[...speakers].join(", ")})`);
        if (!speakers.has("Ali")) errs.push('dialogue must include speaker "Ali"');
      }
    }
    // speaking
    const s = lvl.speaking;
    if (!s || typeof s !== "object") errs.push("speaking missing");
    else {
      for (const k of ["title", "scenario", "tutorBrief"]) if (typeof s[k] !== "string" || !s[k].trim()) errs.push(`speaking.${k} missing`);
      if (!Array.isArray(s.phrases) || s.phrases.length < 6 || s.phrases.length > 8) errs.push("speaking.phrases needs 6..8 items");
      else
        s.phrases.forEach((p, i) => {
          if (typeof p?.de !== "string" || typeof p?.ru !== "string") errs.push(`speaking.phrases[${i}] needs de & ru`);
        });
      if (!Array.isArray(s.script) || s.script.length < 6 || s.script.length > 8) errs.push("speaking.script needs 6..8 turns");
      else
        s.script.forEach((t, i) => {
          for (const k of ["say", "sayRu", "hint"]) if (typeof t?.[k] !== "string" || !t[k].trim()) errs.push(`speaking.script[${i}]: missing "${k}"`);
          if (!Array.isArray(t?.expect) || !t.expect.length) errs.push(`speaking.script[${i}]: expect must be a non-empty array`);
          else for (const e of t.expect) if (typeof e !== "string" || e !== e.toLowerCase()) errs.push(`speaking.script[${i}]: expect keywords must be lowercase strings`);
        });
    }
  }
  // A German line and its Russian translation must name the same places. Editing one side and
  // forgetting the other produces an exercise nobody can answer — "Я живу в Москве." accepting
  // only "Ich wohne in Baku." — and nothing else in this file would catch it.
  const PLACES = [["Baku", "Баку"], ["Moskau", "Москв"], ["Berlin", "Берлин"], ["Hamburg", "Гамбург"],
    ["Leipzig", "Лейпциг"], ["Aserbaidschan", "Азербайджан"], ["Russland", "Росси"],
    ["Deutschland", "Герман"], ["Kasan", "Казан"], ["Wien", "Вен"], ["München", "Мюнхен"]];
  // `q` is deliberately absent: in a listen/choice exercise it holds the RUSSIAN question, so
  // pairing it with `ru` compares two Russian strings and fires on every correct item.
  const PAIRS = [["de", "ru"], ["text", "ru"], ["example", "exampleRu"], ["answer", "ru"],
    ["sentence", "ru"]];
  const walkPlaces = (node, path) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((x, i) => walkPlaces(x, `${path}[${i}]`));
    for (const [dk, rk] of PAIRS) {
      if (typeof node[dk] !== "string" || typeof node[rk] !== "string") continue;
      for (const [de, ru] of PLACES) {
        if (node[dk].includes(de) !== node[rk].includes(ru)) {
          errs.push(`${path}: "${node[dk].slice(0, 50)}" and "${node[rk].slice(0, 50)}" disagree about ${de}/${ru}`);
          break;
        }
      }
    }
    for (const [k, v] of Object.entries(node)) walkPlaces(v, `${path}.${k}`);
  };
  walkPlaces(lvl, "level");

  if (errs.length) {
    failed = true;
    console.log(`${f}: FAIL (${errs.length} problems)`);
    for (const e of errs) console.log("  - " + e);
  } else {
    console.log(`${f}: OK (vocab ${lvl.vocab.length}, exercises ${lvl.exercises.length}, exam ${lvl.exam.length})`);
  }
}
process.exit(failed ? 1 : 0);
