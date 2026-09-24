// Five small games built on the words Emil has already unlocked. They are deliberately quick — two
// or three minutes each — so they work as a warm-up before a level or as something to do when he
// does not feel like a full lesson. All of them pay a little XP and a few coins, far less than a
// real lesson, so playing is a break and never a shortcut past the levels.
import { t as tr } from "./i18n.js";
import { el, shuffle, pick, normalize, stripArticle, sleep, plural } from "./utils.js";
import { sfx, confetti, toast, xpFloat } from "./fx.js";
import { store } from "./store.js";
import { LEVELS } from "./levels.js";
import { speech, RATES } from "./speech.js";

/* ------------------------------------------------------------------ helpers */

/** Every word from the levels Emil has opened — games never teach ahead of where he is. */
function wordPool() {
  const unlocked = LEVELS.filter((l) => store.isUnlocked(l.id));
  const seen = new Set();
  const out = [];
  for (const l of unlocked) {
    for (const v of l.vocab) {
      const key = normalize(v.de);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...v, level: l.id });
    }
  }
  return out;
}

const ARTICLES = ["der", "die", "das"];
/** Nouns only, with the article split off — for the der/die/das game. */
function nounPool() {
  return wordPool()
    .map((v) => {
      const m = String(v.de).match(/^(der|die|das)\s+(.+)$/i);
      return m ? { ...v, article: m[1].toLowerCase(), noun: m[2] } : null;
    })
    .filter(Boolean);
}

/** Single words, no spaces — for scrambling and for hangman. */
function singleWordPool(min = 3, max = 12) {
  return wordPool()
    .map((v) => ({ ...v, word: stripArticle(v.de) }))
    .filter((v) => /^[a-zäöüßA-ZÄÖÜ]+$/.test(v.word) && v.word.length >= min && v.word.length <= max);
}

/**
 * Pay out at the end of a game. Games are a side dish: the reward is capped low on purpose, and it
 * goes through grantXp so the shop's XP boosts apply here the same as everywhere else.
 */
function payout({ xp, coins, anchor, label }) {
  let gainedCoins = 0;
  store.update(() => { gainedCoins = store.addCoins(coins); });
  const unlocked = store.grantXp(xp);
  if (anchor && xp) xpFloat(anchor, Math.round(xp * store.xpMultiplier()));
  const parts = [];
  if (xp) parts.push(`+${Math.round(xp * store.xpMultiplier())} XP`);
  if (gainedCoins) parts.push(`+${gainedCoins} 🪙`);
  if (parts.length) toast(`${label}: ${parts.join(" · ")}`, { icon: "🎮" });
}

/** Remember the best result of a game so there is something to beat. */
function saveBest(id, score) {
  const prev = store.state.games?.[id]?.best ?? 0;
  if (score <= prev) return false;
  store.update((s) => {
    if (!s.games) s.games = {};
    s.games[id] = { ...(s.games[id] || {}), best: score };
  });
  return true;
}
const bestOf = (id) => store.state.games?.[id]?.best ?? 0;

/**
 * Say a German word out loud — hearing it is half the point of a vocabulary game.
 * No `force`: when Emil turns speech off in the settings he means everywhere, games included.
 */
const say = (word) => speech.speak(stripArticle(word), { rate: RATES.word });

/* --------------------------------------------------------------- game shell */

/**
 * Every game gets the same frame: a header with a way out, a body, and a footer line.
 * `finish()` swaps the body for the result card so each game only writes its own play logic.
 */
function shell({ container, title, subtitle, onExit }) {
  const body = el("div", { class: "game-body" });
  const foot = el("div", { class: "game-foot" });
  const root = el("div", { class: "session game" },
    el("header", { class: "session-head" },
      el("button", { class: "icon-btn", type: "button", title: "Выйти", onClick: () => onExit?.() }, "✕"),
      el("div", { class: "session-title" }, title,
        // Отдельными кусками, а не шаблоном: перевод ищется по ЦЕЛОЙ строке, и « · найди пары» в словаре
        // не находилось, хотя «найди пары» там есть. Подзаголовки игр оставались русскими.
        subtitle ? el("span", { class: "muted" }, " · ", subtitle) : null),
      el("div", { class: "game-score" }, ""),
    ),
    body, foot,
  );
  container.innerHTML = "";
  container.append(root);
  // The router fires this when Emil navigates away. Every game has async steps waiting on sleep(),
  // so without a shared flag an abandoned game would still pay out, toast and throw confetti over
  // whatever page he opened next.
  let dead = false;
  root.addEventListener("game:destroy", () => { dead = true; });
  return {
    root, body, foot,
    get alive() { return !dead && root.isConnected; },
    score: root.querySelector(".game-score"),
    setScore(text) { root.querySelector(".game-score").textContent = tr(text); },
    finish({ icon, headline, lines, isRecord, onAgain }) {
      if (dead) return;
      body.innerHTML = "";
      foot.innerHTML = "";
      body.append(el("div", { class: "game-result" },
        el("div", { class: "game-result-icon" }, icon),
        el("div", { class: "game-result-head" }, headline),
        isRecord ? el("div", { class: "game-record" }, "🏆 Новый рекорд!") : null,
        el("div", { class: "game-result-lines" }, lines.map((t) => el("div", {}, t))),
        el("div", { class: "foot-actions" },
          el("button", { class: "btn ghost", type: "button", onClick: () => onExit?.() }, "К играм"),
          el("button", { class: "btn primary", type: "button", onClick: () => onAgain?.() }, "Ещё раз"),
        ),
      ));
    },
  };
}

/* ------------------------------------------------------------ 1 · память */

/**
 * Memory: twelve cards, six German/Russian pairs. Turning a pair over reads the German word aloud,
 * so the word gets tied to its sound and not just to its spelling.
 */
function playMemory({ container, onExit, onAgain }) {
  const PAIRS = 6;
  const pool = wordPool();
  const words = shuffle(pool).slice(0, PAIRS);
  const ui = shell({ container, title: "🧩 Память", subtitle: "найди пары", onExit });

  const cards = shuffle(words.flatMap((w, i) => [
    { pair: i, side: "de", text: w.de, word: w },
    { pair: i, side: "ru", text: w.ru, word: w },
  ]));

  let open = [];      // cards turned face up right now
  let found = 0;
  let moves = 0;
  let locked = false;
  const startedAt = performance.now();
  ui.setScore(`0 / ${PAIRS}`);

  const grid = el("div", { class: "memo-grid" });
  const nodes = cards.map((c) => {
    const face = el("div", { class: "memo-face", lang: c.side === "de" ? "de" : "ru" }, c.text);
    const node = el("button", { class: "memo-card", type: "button", "aria-label": "Карточка рубашкой вверх" },
      el("div", { class: "memo-back" }), face);
    node.addEventListener("click", () => turn(c, node));
    return node;
  });
  grid.append(...nodes);
  ui.body.append(grid);
  ui.foot.append(el("div", { class: "muted small" }, "Открывай по две карточки: немецкое слово и его перевод."));

  async function turn(card, node) {
    if (locked || node.classList.contains("open") || node.classList.contains("done")) return;
    sfx.pop();
    node.classList.add("open");
    node.setAttribute("aria-label", card.text);
    open.push({ card, node });
    if (open.length < 2) return;

    moves++;
    locked = true;
    const [a, b] = open;
    if (a.card.pair === b.card.pair) {
      found++;
      ui.setScore(`${found} / ${PAIRS}`);
      sfx.correct();
      a.node.classList.add("done");
      b.node.classList.add("done");
      say(a.card.word.de);
      open = [];
      locked = false;
      if (found === PAIRS) return done();
    } else {
      sfx.wrong();
      a.node.classList.add("miss");
      b.node.classList.add("miss");
      await sleep(750);
      if (!ui.alive) return;
      [a, b].forEach((x) => { x.node.classList.remove("open", "miss"); x.node.setAttribute("aria-label", "Карточка рубашкой вверх"); });
      open = [];
      locked = false;
    }
  }

  function done() {
    if (!ui.alive) return;
    const seconds = Math.round((performance.now() - startedAt) / 1000);
    // a perfect game is 6 moves; score rewards remembering, not luck
    const score = Math.max(10, Math.round((PAIRS / moves) * 100));
    const record = saveBest("memory", score);
    confetti();
    sfx.levelUp();
    payout({ xp: 12, coins: score >= 60 ? 8 : 4, anchor: ui.root, label: "Память" });
    ui.finish({
      icon: "🧩",
      headline: tr`Все пары найдены за ${moves} ${plural(moves, "ход", "хода", "ходов")}`,
      isRecord: record,
      lines: [tr`Точность: ${score}%`, tr`Время: ${seconds} сек.`, tr`Лучший результат: ${bestOf("memory")}%`],
      onAgain,
    });
  }
}

/* --------------------------------------------------------- 2 · der/die/das */

/**
 * Article sorter. Gender is the thing Russian speakers get wrong most often and the only cure is
 * volume, so this is a fast streak game: twenty nouns, one tap each, instant feedback.
 */
function playArticles({ container, onExit, onAgain }) {
  const ROUNDS = 20;
  const pool = nounPool();
  if (pool.length < 5) return notEnough(container, onExit, "существительных");
  const items = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
  const ui = shell({ container, title: "🎯 der · die · das", subtitle: "выбери артикль", onExit });

  let i = 0, correct = 0, streak = 0, bestStreak = 0;
  const wordEl = el("div", { class: "art-word", lang: "de" }, "");
  const ruEl = el("div", { class: "art-ru" }, "");
  const hintEl = el("div", { class: "art-hint" }, "");
  const buttons = ARTICLES.map((a) =>
    el("button", { class: `btn art-btn art-opt-${a}`, type: "button", onClick: () => answer(a) }, a));

  ui.body.append(el("div", { class: "art-stage" },
    wordEl, ruEl, el("div", { class: "art-buttons" }, buttons), hintEl,
  ));
  ui.foot.append(el("div", { class: "muted small" }, "Подсказка: -ung, -heit, -keit, -schaft — всегда die. -chen и -lein — всегда das."));

  function show() {
    const it = items[i];
    ui.setScore(tr`${i + 1} / ${items.length} · серия ${streak}`);
    wordEl.textContent = tr(it.noun);
    ruEl.textContent = tr(it.ru);
    hintEl.textContent = "";
    hintEl.className = "art-hint";
    buttons.forEach((b) => { b.disabled = false; b.classList.remove("right", "wrong"); });
  }

  async function answer(a) {
    const it = items[i];
    buttons.forEach((b) => (b.disabled = true));
    const ok = a === it.article;
    const chosen = buttons[ARTICLES.indexOf(a)];
    if (ok) {
      correct++; streak++; bestStreak = Math.max(bestStreak, streak);
      chosen.classList.add("right");
      hintEl.textContent = tr(`✅ ${it.article} ${it.noun}`);
      hintEl.className = "art-hint ok";
      sfx.correct();
    } else {
      streak = 0;
      chosen.classList.add("wrong");
      buttons[ARTICLES.indexOf(it.article)].classList.add("right");
      hintEl.textContent = tr`Правильно: ${it.article} ${it.noun} — ${it.ru}`;
      hintEl.className = "art-hint bad";
      sfx.wrong();
    }
    say(it.de);
    await sleep(ok ? 650 : 1500);
    if (!ui.alive) return;
    i++;
    if (i >= items.length) return done();
    show();
  }

  function done() {
    if (!ui.alive) return;
    const pct = Math.round((correct / items.length) * 100);
    const record = saveBest("articles", pct);
    if (pct >= 80) { confetti(); sfx.levelUp(); }
    payout({ xp: Math.round(correct * 1.5), coins: Math.max(2, Math.round(correct / 2)), anchor: ui.root, label: "Артикли" });
    ui.finish({
      icon: pct >= 80 ? "🏆" : "🎯",
      headline: tr`${correct} из ${items.length} — ${pct}%`,
      isRecord: record,
      lines: [tr`Лучшая серия: ${bestStreak}`, tr`Рекорд: ${bestOf("articles")}%`,
        pct >= 80 ? "Артикли ты чувствуешь уже хорошо." : "Артикли просто нужно встретить много раз — это нормально."],
      onAgain,
    });
  }

  show();
}

/* ------------------------------------------------------------ 3 · анаграмма */

/**
 * Scramble: the letters of a German word, shuffled. The Russian translation is the clue, so this
 * drills spelling — the umlauts and the double consonants that are easy to read past.
 */
function playScramble({ container, onExit, onAgain }) {
  const ROUNDS = 8;
  const pool = singleWordPool(4, 11);
  if (pool.length < 4) return notEnough(container, onExit, "подходящих слов");
  const items = shuffle(pool).slice(0, Math.min(ROUNDS, pool.length));
  const ui = shell({ container, title: "🔤 Анаграмма", subtitle: "собери слово", onExit });

  let i = 0, solved = 0, usedHint = 0;
  // The letters stay on screen while the round settles. Without this guard a click during that
  // pause re-checks the finished word, counts it a second time and pays the round out twice.
  let resolving = false;
  const clue = el("div", { class: "scr-clue" }, "");
  const line = el("div", { class: "scr-line" });
  const bank = el("div", { class: "scr-bank" });
  const note = el("div", { class: "art-hint" }, "");
  const hintBtn = el("button", { class: "btn ghost small", type: "button", onClick: hint }, "💡 Открыть букву");
  const skipBtn = el("button", { class: "btn ghost small", type: "button", onClick: () => reveal(false) }, "Пропустить");

  ui.body.append(el("div", { class: "scr-stage" }, clue, line, bank, note));
  ui.foot.append(el("div", { class: "foot-actions" }, hintBtn, skipBtn));

  function show() {
    const it = items[i];
    resolving = false;
    ui.setScore(`${i + 1} / ${items.length}`);
    clue.textContent = tr(it.ru);
    note.textContent = "";
    note.className = "art-hint";
    line.innerHTML = "";
    bank.innerHTML = "";
    hintBtn.disabled = false;
    skipBtn.disabled = false;

    // shuffle until the letters are not already in the right order
    let letters = it.word.split("");
    for (let n = 0; n < 8 && letters.join("") === it.word; n++) letters = shuffle(letters);
    letters.forEach((ch, idx) => {
      const chip = el("button", { class: "chip letter", type: "button", lang: "de" }, ch);
      chip.dataset.i = idx;
      chip.addEventListener("click", () => {
        if (resolving) return;
        sfx.pop();
        if (chip.parentElement === bank) line.append(chip); else bank.append(chip);
        check();
      });
      bank.append(chip);
    });
  }

  function current() {
    return Array.from(line.querySelectorAll(".letter")).map((c) => c.textContent).join("");
  }

  function check() {
    const it = items[i];
    const got = current();
    if (got.length < it.word.length) return;
    if (normalize(got) === normalize(it.word)) { solved++; return reveal(true); }
    note.textContent = tr("Пока не то — попробуй переставить.");
    note.className = "art-hint bad";
    sfx.wrong();
  }

  /** Move the next correct letter into place for him. */
  function hint() {
    if (resolving) return;
    const it = items[i];
    // Only a correct prefix can be built on. If he has already put a wrong letter down, the
    // "next" letter would land behind it and spell nonsense — so the wrong tail goes back to the
    // bank first and the hint always lands where it belongs.
    const chips = Array.from(line.querySelectorAll(".letter"));
    let k = 0;
    while (k < chips.length && chips[k].textContent.toLowerCase() === (it.word[k] || "").toLowerCase()) k++;
    for (let j = chips.length - 1; j >= k; j--) bank.append(chips[j]);
    const need = it.word[k];
    if (!need) return;
    const chip = Array.from(bank.querySelectorAll(".letter")).find((c) => c.textContent.toLowerCase() === need.toLowerCase());
    if (!chip) return;
    usedHint++;
    line.append(chip);
    sfx.click();
    check();
  }

  async function reveal(ok) {
    if (resolving) return;
    resolving = true;
    const it = items[i];
    hintBtn.disabled = true;
    skipBtn.disabled = true;
    line.classList.add(ok ? "correct" : "wrong");
    note.textContent = tr(ok ? `✅ ${it.de} — ${it.ru}` : tr`Это было: ${it.de} — ${it.ru}`);
    note.className = `art-hint ${ok ? "ok" : "bad"}`;
    if (ok) sfx.correct(); else sfx.wrong();
    say(it.de);
    await sleep(ok ? 1100 : 1700);
    if (!ui.alive) return;
    line.classList.remove("correct", "wrong");
    i++;
    if (i >= items.length) return done();
    show();
  }

  function done() {
    if (!ui.alive) return;
    const pct = Math.round((solved / items.length) * 100);
    const record = saveBest("scramble", pct);
    if (pct >= 75) { confetti(); sfx.levelUp(); }
    payout({ xp: solved * 3, coins: Math.max(2, solved), anchor: ui.root, label: "Анаграмма" });
    ui.finish({
      icon: "🔤",
      headline: tr`Собрано ${solved} из ${items.length}`,
      isRecord: record,
      lines: [
        usedHint ? tr`Подсказок использовано: ${usedHint}`
          : solved ? "Без подсказок — отлично!"
            : "Эти слова пока новые — вернись к ним позже, это нормально.",
        tr`Рекорд: ${bestOf("scramble")}%`,
      ],
      onAgain,
    });
  }

  show();
}

/* ---------------------------------------------------------------- 4 · блиц */

/**
 * Blitz: sixty seconds, German word, four Russian options. Speed is the point — it pushes
 * recognition from "I can work it out" towards "I just know it".
 */
function playBlitz({ container, onExit, onAgain }) {
  const SECONDS = 60;
  const pool = wordPool();
  if (pool.length < 6) return notEnough(container, onExit, "слов");
  const ui = shell({ container, title: "⚡ Блиц", subtitle: "60 секунд", onExit });

  let score = 0, answered = 0, streak = 0, bestStreak = 0, over = false;
  let left = SECONDS;
  const timerEl = el("div", { class: "blitz-timer" }, `${SECONDS}`);
  const bar = el("div", { class: "blitz-bar-fill" });
  const wordEl = el("div", { class: "art-word", lang: "de" }, "");
  const opts = el("div", { class: "blitz-options" });

  ui.body.append(el("div", { class: "blitz-stage" },
    el("div", { class: "blitz-top" }, timerEl, el("div", { class: "blitz-bar" }, bar)),
    wordEl, opts,
  ));
  ui.foot.append(el("div", { class: "muted small" }, "Выбирай перевод как можно быстрее. Ошибка обнуляет серию и стоит 2 секунды."));

  /** One place that draws the clock, so a penalty shows the moment it is taken. */
  function drawTime() {
    timerEl.textContent = tr(String(Math.max(0, left)));
    bar.style.width = `${(Math.max(0, left) / SECONDS) * 100}%`;
    timerEl.classList.toggle("hurry", left <= 5);
  }
  const tick = setInterval(() => {
    left--;
    drawTime();
    if (left <= 0) done();
  }, 1000);

  function show() {
    if (over) return;
    const right = pick(pool);
    const wrong = shuffle(pool.filter((w) => w.ru !== right.ru)).slice(0, 3);
    wordEl.textContent = tr(stripArticle(right.de));
    ui.setScore(tr`${score} · серия ${streak}`);
    opts.innerHTML = "";
    shuffle([right, ...wrong]).forEach((w) => {
      const b = el("button", { class: "btn blitz-opt", type: "button" }, w.ru);
      b.addEventListener("click", () => answer(b, w === right));
      opts.append(b);
    });
  }

  function answer(btn, ok) {
    if (over) return;
    answered++;
    Array.from(opts.querySelectorAll("button")).forEach((b) => (b.disabled = true));
    if (ok) {
      streak++; bestStreak = Math.max(bestStreak, streak);
      score += 1 + Math.min(4, Math.floor(streak / 3)); // a run is worth more than single hits
      btn.classList.add("right");
      sfx.correct();
    } else {
      streak = 0;
      btn.classList.add("wrong");
      sfx.wrong();
      left = Math.max(0, left - 2); // a wrong answer costs two seconds
      drawTime();                    // …and the clock must show it now, not a second later
      if (left <= 0) return done();  // …and end the game at zero, not on the next tick
    }
    ui.setScore(tr`${score} · серия ${streak}`); // show it now, not when the next word appears
    setTimeout(show, ok ? 180 : 500);
  }

  function done() {
    if (over) return;
    over = true;
    clearInterval(tick);
    if (!ui.alive) return;
    const record = saveBest("blitz", score);
    if (score >= 25) { confetti(); sfx.levelUp(); }
    payout({ xp: Math.min(30, score), coins: Math.max(2, Math.round(score / 3)), anchor: ui.root, label: "Блиц" });
    ui.finish({
      icon: "⚡",
      headline: `${score} ${plural(score, "очко", "очка", "очков")}`,
      isRecord: record,
      lines: [tr`Ответов: ${answered}`, tr`Лучшая серия: ${bestStreak}`, tr`Рекорд: ${bestOf("blitz")}`],
      onAgain,
    });
  }

  // the interval must not outlive the view
  ui.root.addEventListener("game:destroy", () => { over = true; clearInterval(tick); });
  show();
}

/* ------------------------------------------------------------- 5 · виселица */

/**
 * Hangman, with the Russian translation as the clue. Six lives, the German alphabet including the
 * umlauts and ß — which is exactly where a Russian speaker needs the practice.
 */
/** Upper case, except ß — it has no capital here, so it stays a letter of its own on the board. */
const upperDe = (s) => String(s).split("").map((c) => (c === "ß" ? c : c.toUpperCase())).join("");

function playHangman({ container, onExit, onAgain }) {
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß".split("");
  const LIVES = 6;
  const pool = singleWordPool(4, 12);
  if (!pool.length) return notEnough(container, onExit, "подходящих слов");
  const item = pick(pool);
  const target = upperDe(item.word); // "heißen" -> "HEIßEN", not "HEISSEN"
  const ui = shell({ container, title: "🎪 Виселица", subtitle: "угадай слово", onExit });

  let lives = LIVES, over = false;
  const guessed = new Set();

  const hearts = el("div", { class: "hang-lives" }, "");
  const wordEl = el("div", { class: "hang-word", lang: "de" }, "");
  const clue = el("div", { class: "scr-clue" }, item.ru);
  const note = el("div", { class: "art-hint" }, "");
  const keys = el("div", { class: "hang-keys" });

  ALPHABET.forEach((ch) => {
    const b = el("button", { class: "chip key", type: "button", lang: "de" }, ch);
    b.addEventListener("click", () => guess(ch, b));
    keys.append(b);
  });
  ui.body.append(el("div", { class: "hang-stage" }, hearts, clue, wordEl, note, keys));
  ui.foot.append(el("div", { class: "muted small" }, "Можно нажимать буквы прямо на клавиатуре. ä, ö, ü и ß — отдельные кнопки, они не заменяются на ae, oe, ue, ss."));

  // Typing is faster than hunting for the letter with a mouse, and a physical keyboard has ä/ö/ü/ß
  // on a German layout anyway. Removed together with the view.
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const ch = upperDe(String(e.key || "")); // the physical ß key works too
    if (ch.length !== 1 || !ALPHABET.includes(ch)) return;
    const btn = Array.from(keys.querySelectorAll(".key")).find((k) => k.textContent === ch);
    if (btn && !btn.disabled) { e.preventDefault(); guess(ch, btn); }
  };
  document.addEventListener("keydown", onKey);
  ui.root.addEventListener("game:destroy", () => document.removeEventListener("keydown", onKey));

  function draw() {
    hearts.textContent = tr("❤️".repeat(lives) + "🖤".repeat(LIVES - lives));
    wordEl.textContent = tr(target.split("").map((c) => (guessed.has(c) ? c : "•")).join(" "));
    ui.setScore(tr`${lives} / ${LIVES} жизней`);
  }

  function guess(ch, btn) {
    if (over || guessed.has(ch)) return;
    guessed.add(ch);
    btn.disabled = true;
    if (target.includes(ch)) {
      btn.classList.add("right");
      sfx.correct();
    } else {
      btn.classList.add("wrong");
      lives--;
      sfx.wrong();
    }
    draw();
    if (target.split("").every((c) => guessed.has(c))) return done(true);
    if (lives <= 0) return done(false);
  }

  function done(won) {
    over = true;
    if (!ui.alive) return;
    Array.from(keys.querySelectorAll("button")).forEach((b) => (b.disabled = true));
    wordEl.textContent = tr(target.split("").join(" "));
    say(item.de);
    if (won) {
      confetti();
      sfx.levelUp();
      saveBest("hangman", (store.state.games?.hangman?.best ?? 0) + 1); // best = words guessed in total
      payout({ xp: 10, coins: 5, anchor: ui.root, label: "Виселица" });
    }
    ui.finish({
      icon: won ? "🎉" : "😔",
      headline: won ? tr`Угадал: ${item.de}` : tr`Это было: ${item.de}`,
      isRecord: false,
      lines: [item.ru, item.example ? `${item.example} — ${item.exampleRu}` : null,
        tr`Угадано всего: ${bestOf("hangman")} ${plural(bestOf("hangman"), "слово", "слова", "слов")}`].filter(Boolean),
      onAgain,
    });
  }

  draw();
}

/* ----------------------------------------------------------------- catalogue */

function notEnough(container, onExit, what) {
  container.innerHTML = "";
  container.append(el("div", { class: "empty-state" },
    el("div", { class: "empty-icon" }, "🔒"),
    el("div", {}, tr`Для этой игры пока мало ${what}. Пройди ещё немного слов — и она откроется.`),
    el("button", { class: "btn primary", type: "button", onClick: () => onExit?.() }, "Назад"),
  ));
}

/**
 * `ready()` returns null when the game can be played, or the reason it cannot. Games draw on the
 * words Emil has unlocked, and the early levels simply do not have enough of some kinds yet — the
 * catalogue says so on the card instead of letting him open a dead end.
 */
export const GAMES = [
  { id: "memory", icon: "🧩", name: "Память", desc: "Найди пары: немецкое слово и перевод. Тренирует узнавание.", unit: "%", play: playMemory,
    ready: () => (wordPool().length >= 6 ? null : "нужно 6 слов") },
  { id: "blitz", icon: "⚡", name: "Блиц", desc: "60 секунд на скорость. Серия подряд приносит больше очков.", unit: "", play: playBlitz,
    ready: () => (wordPool().length >= 6 ? null : "нужно 6 слов") },
  { id: "articles", icon: "🎯", name: "der · die · das", desc: "20 существительных, один тап. Самое слабое место — артикли.", unit: "%", play: playArticles,
    ready: () => (nounPool().length >= 8 ? null : "откроется со 2-го уровня — нужно 8 существительных") },
  { id: "scramble", icon: "🔤", name: "Анаграмма", desc: "Собери слово из перемешанных букв. Тренирует написание.", unit: "%", play: playScramble,
    ready: () => (singleWordPool(4, 11).length >= 4 ? null : "нужно 4 слова подлиннее") },
  // hangman counts words guessed in total, so its label is not a record and needs a real plural
  { id: "hangman", icon: "🎪", name: "Виселица", desc: "Угадай слово по буквам. Шесть жизней, подсказка — перевод.", unit: (n) => ` ${plural(n, "слово", "слова", "слов")}`, label: "Угадано", play: playHangman,
    ready: () => (singleWordPool(4, 12).length >= 1 ? null : "нужно слово подлиннее") },
];

/**
 * Render the games page. Returns a destroy() the router calls on navigation, so a running timer
 * never outlives the view.
 */
/** The catalogue, so the practice page can lay the games out by what they train. */
export const gameCatalogue = () => GAMES;

export function renderGames({ container, onExit, startId = null }) {
  let current = null;

  const destroyCurrent = () => {
    const root = container.querySelector(".game");
    if (root) root.dispatchEvent(new CustomEvent("game:destroy"));
    speech.stop(); // ✕ back to the catalogue used to leave the last word still being spoken
    current = null;
  };

  function menu() {
    destroyCurrent();
    // the catalogue is a normal page with the sidebar; a game running takes the whole screen
    document.body.classList.remove("focus");
    container.innerHTML = "";
    const words = wordPool().length;
    container.append(
      el("div", { class: "page-head" },
        el("h1", {}, "🎮 Игры"),
        el("p", { class: "muted" }, tr`Короткие тренировки на словах, которые ты уже открыл — сейчас их ${words}. Пара минут, немного XP и монет.`),
      ),
      el("div", { class: "game-grid" }, GAMES.map((g) => {
        const best = bestOf(g.id);
        const blocked = g.ready ? g.ready() : null;
        return el("button", { class: `game-card${blocked ? " locked" : ""}`, type: "button", disabled: Boolean(blocked),
            title: blocked || "", onClick: () => (blocked ? null : start(g)) },
          el("div", { class: "game-card-icon" }, blocked ? "🔒" : g.icon),
          el("div", { class: "game-card-body" },
            el("div", { class: "game-card-name" }, g.name),
            el("div", { class: "game-card-desc" }, g.desc),
            el("div", { class: "game-card-best" }, blocked ? tr`🔒 ${blocked}`
              : best ? tr`${g.label || "Рекорд"} ${best}${typeof g.unit === "function" ? g.unit(best) : g.unit}`
                : "Ещё не играл"),
          ),
        );
      })),
    );
  }

  function start(g) {
    destroyCurrent();
    document.body.classList.add("focus");
    current = g;
    g.play({ container, onExit: menu, onAgain: () => start(g) });
  }

  // "#/games/blitz" opens that game straight away; the catalogue lives on the practice page now,
  // so landing on a second list of the same cards would just be a step in the way.
  const wanted = startId && GAMES.find((g) => g.id === startId);
  if (wanted && !(wanted.ready && wanted.ready())) start(wanted); else menu();
  return { destroy: () => { destroyCurrent(); document.body.classList.remove("focus"); speech.stop(); } };
}
