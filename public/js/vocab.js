// Flashcards for a level's vocabulary + automatic vocab quiz generation
import { el, shuffle, stripArticle, articleOf } from "./utils.js";
import { speech, RATES } from "./speech.js";
import { sfx } from "./fx.js";
import { store } from "./store.js";

/** Render a swipeable flashcard deck; calls onDone when the last card is flipped through. */
export function renderFlashcards({ container, level, onDone, onExit }) {
  const cards = level.vocab;
  let i = 0;
  let flipped = false;
  const seen = new Set();
  container.innerHTML = "";
  const counter = el("div", { class: "fc-counter" }, "");
  const bar = el("div", { class: "progress-bar" });
  const cardEl = el("div", { class: "flashcard" });
  const known = new Set();
  const root = el("div", { class: "session flash" },
    el("header", { class: "session-head" },
      el("button", { class: "icon-btn", title: "Выйти", onClick: () => { speech.stop(); onExit?.(); } }, "✕"),
      el("div", { class: "session-title" }, `${level.emoji} Слова · ${level.titleRu}`),
      el("div", { class: "progress-track" }, bar),
      counter,
    ),
    el("div", { class: "session-body" }, el("div", { class: "fc-stage" }, cardEl), el("div", { class: "fc-hint muted" }, "Нажми на карточку, чтобы перевернуть · пробел = перевернуть · → = дальше")),
    el("footer", { class: "session-foot" },
      el("div", { class: "foot-actions" },
        el("button", { class: "btn ghost", type: "button", onClick: () => go(-1) }, "← Назад"),
        el("button", { class: "btn ghost", type: "button", onClick: () => { speech.stop(); speak(); } }, "🔊 Прослушать"),
        el("button", { class: "btn primary big", type: "button", onClick: () => go(1) }, "Дальше →"),
      ),
    ),
  );
  container.append(root);

  let alive = true;
  let speakRun = 0; // only the newest read-aloud may continue; flipping or moving on cancels the old one
  const v0 = () => cards[i];

  /**
   * Read the card aloud, matching the side Ali is looking at:
   * front — the word, then the German example;
   * back  — the Russian meaning, then the German example and its translation.
   * Russian uses Mia's own multilingual voice, so both sides sound like the same person.
   */
  async function speak() {
    if (!alive) return;
    const run = ++speakRun;
    const v = v0();
    const say = async (text, opts) => {
      if (!alive || run !== speakRun || !text) return false;
      await speech.speak(text, opts); // respects the "Озвучка" switch in the profile
      return alive && run === speakRun;
    };
    if (!flipped) {
      const first = say(v.de, { rate: RATES.word });    // request the word first
      speech.prefetch(v.example, { rate: RATES.example }); // then warm the example behind it
      if (!(await first)) return;
      await say(v.example, { rate: RATES.example });
      return;
    }
    const firstBack = say(v.ru, { lang: "ru-RU", rate: RATES.translation });
    speech.prefetch(v.example, { rate: RATES.example });
    if (!(await firstBack)) return;
    speech.prefetch(v.exampleRu, { lang: "ru-RU", rate: RATES.translation });
    if (!(await say(v.example, { rate: RATES.example }))) return;
    await say(v.exampleRu, { lang: "ru-RU", rate: RATES.translation });
  }
  function render(dir = 0) {
    const v = cards[i];
    flipped = false;
    seen.add(i);
    counter.textContent = `${i + 1} / ${cards.length}`;
    bar.style.width = `${((i + 1) / cards.length) * 100}%`;
    const art = articleOf(v.de);
    cardEl.className = `flashcard ${dir > 0 ? "slide-in-right" : dir < 0 ? "slide-in-left" : "pop-in"}`;
    cardEl.innerHTML = "";
    cardEl.append(
      el("div", { class: "fc-inner" },
        el("div", { class: "fc-face fc-front" },
          art ? el("span", { class: `article art-${art}` }, art) : null,
          el("div", { class: "fc-word", lang: "de" }, art ? stripArticle(v.de) : v.de),
          v.plural ? el("div", { class: "fc-plural muted" }, `мн. ч.: ${v.plural}`) : null,
          el("div", { class: "fc-tap muted" }, "перевернуть ↻"),
        ),
        el("div", { class: "fc-face fc-back" },
          el("div", { class: "fc-ru" }, v.ru),
          el("div", { class: "fc-example", lang: "de" }, v.example),
          el("div", { class: "fc-example-ru muted" }, v.exampleRu),
        ),
      ),
    );
    cardEl.onclick = () => flip();
    setTimeout(speak, 250);
    const next = cards[i + 1];
    // warm the next card while Ali reads this one — both sides, since he can flip either way
    if (next) setTimeout(async () => {
      await speech.prefetch(next.de, { rate: RATES.word });
      await speech.prefetch(next.example, { rate: RATES.example });
      await speech.prefetch(next.ru, { lang: "ru-RU", rate: RATES.translation });
      await speech.prefetch(next.exampleRu, { lang: "ru-RU", rate: RATES.translation });
    }, 1200);
  }
  function flip() {
    flipped = !flipped;
    cardEl.classList.toggle("flipped", flipped);
    sfx.pop();
    if (flipped) known.add(i);
    speech.stop();
    setTimeout(speak, 260); // let the flip animation land first
  }
  function go(d) {
    if (d > 0 && i === cards.length - 1) return finish();
    i = Math.max(0, Math.min(cards.length - 1, i + d));
    render(d);
  }
  function finish() {
    alive = false;
    speakRun++;
    document.removeEventListener("keydown", onKey);
    speech.stop();
    onDone?.({ seen: seen.size, total: cards.length });
  }
  function onKey(e) {
    // a focused button already handles Space/Enter itself — otherwise pressing «Дальше» would
    // advance twice and skip a word
    if (e.target?.closest?.("button, a, input, select, textarea")) return;
    if (e.key === " ") { e.preventDefault(); flip(); }
    else if (e.key === "ArrowRight" || e.key === "Enter") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  }
  document.addEventListener("keydown", onKey);
  render(0);
  return { destroy: () => { alive = false; speakRun++; document.removeEventListener("keydown", onKey); speech.stop(); } };
}

/**
 * Pick 3 distractors whose meaning cannot also be a correct answer
 * (e.g. "нога" must not offer both "das Bein" and "der Fuß").
 */
function distractorsFor(v, pool) {
  const words = (s) => new Set(String(s).toLowerCase().split(/[,;/]|\s+/).map((w) => w.trim()).filter((w) => w.length > 2));
  const mine = { ru: words(v.ru), de: words(stripArticle(v.de)) };
  const overlaps = (a, b) => [...a].some((w) => b.has(w));
  const safe = pool.filter((x) => x !== v && !overlaps(words(x.ru), mine.ru) && !overlaps(words(stripArticle(x.de)), mine.de));
  const chosen = shuffle(safe).slice(0, 3);
  // if the level is too small for 3 safe distractors, fall back to any other word
  if (chosen.length < 3) chosen.push(...shuffle(pool.filter((x) => x !== v && !chosen.includes(x))).slice(0, 3 - chosen.length));
  return chosen;
}

/** Build a quick vocab quiz (choice exercises) from a level's vocabulary */
export function buildVocabQuiz(level, count = 10) {
  const vocab = shuffle(level.vocab).slice(0, count);
  const all = level.vocab;
  return vocab.map((v, idx) => {
    const toRu = idx % 2 === 0;
    const distractors = distractorsFor(v, all);
    if (toRu) {
      const options = shuffle([v.ru, ...distractors.map((d) => d.ru)]);
      return { type: "choice", word: v.de, q: `Что значит «${v.de}»?`, options, answer: options.indexOf(v.ru), explain: `${v.de} — ${v.ru}. ${v.example}` };
    }
    const options = shuffle([v.de, ...distractors.map((d) => d.de)]);
    return { type: "choice", word: v.de, q: `Как по-немецки «${v.ru}»?`, options, answer: options.indexOf(v.de), explain: `${v.example} — ${v.exampleRu}` };
  });
}

/** Mixed review quiz across several levels (for the Words page) */
export function buildReviewQuiz(levels, count = 12) {
  const pool = levels.flatMap((l) => l.vocab.map((v) => ({ ...v, level: l })));
  // Due and weak words first. Drawing purely at random meant that by level 12 a given word came
  // back about once every 25 sessions — and one he kept failing no more often than one he knew.
  const due = store.dueWords(pool);
  const dueSet = new Set(due);
  const rest = shuffle(pool.filter((v) => !dueSet.has(v)));
  const chosen = shuffle([...due, ...rest].slice(0, count));
  return chosen.map((v, idx) => {
    const toRu = idx % 2 === 0;
    const distractors = distractorsFor(v, pool);
    if (toRu) {
      const options = shuffle([v.ru, ...distractors.map((d) => d.ru)]);
      return { type: "choice", word: v.de, q: `Что значит «${v.de}»?`, options, answer: options.indexOf(v.ru), explain: `${v.example} — ${v.exampleRu}` };
    }
    const options = shuffle([v.de, ...distractors.map((d) => d.de)]);
    return { type: "choice", word: v.de, q: `Как по-немецки «${v.ru}»?`, options, answer: options.indexOf(v.de), explain: `${v.example} — ${v.exampleRu}` };
  });
}
