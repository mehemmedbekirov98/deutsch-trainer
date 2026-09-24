// Exercise session engine: renders one exercise at a time, checks answers, tracks XP/combo.
import { t as tr, lang as uiLang, langInfo } from "./i18n.js";
import { el, $, append, nextTick, normalize, matchAnswer, similarity, spokenSimilarity, digitsToWords, shuffle, pick, sleep } from "./utils.js";
import { speech, STT_ERRORS, RATES } from "./speech.js";
import { sfx, confetti, xpFloat, countUp, toast } from "./fx.js";
import { store } from "./store.js";
import { backend } from "./backend.js";
import { COINS } from "./game.js";

const PRAISE = ["Richtig!", "Super!", "Genau!", "Sehr gut!", "Prima!", "Perfekt!", "Klasse!", "Toll!"];
const OOPS = ["Nicht ganz.", "Fast!", "Schau mal:", "Hmm, nein."];
const XP = { choice: 10, fill: 12, translate: 14, order: 12, match: 12, listen: 14, speak: 16 };

// RATES.example, not the settings speed: the speed is part of the TTS cache key, so a 🔊 that
// invented its own rate threw away every file the screen had warmed and made Emil wait again.
const speakBtn = (text, gender = "f", cls = "icon-btn speak-btn") =>
  el("button", { class: cls, title: "Прослушать", type: "button", onClick: (e) => { e.stopPropagation(); sfx.click(); speech.speak(text, { gender, rate: RATES.example }); } }, "🔊");

export class ExerciseSession {
  /**
   * @param {object} o
   * @param {HTMLElement} o.container
   * @param {Array} o.exercises
   * @param {string} o.title
   * @param {(result)=>void} o.onDone  result = {correct,total,xp,accuracy,wrong:[]}
   * @param {()=>void} o.onExit
   * @param {boolean} [o.exam]
   */
  constructor(o) {
    Object.assign(this, { xpMult: 1, exam: false }, o);
    this.i = 0;
    this.correct = 0;
    this.answered = 0;
    this.xp = 0;
    this.coins = 0;
    this.combo = 0;
    this.prevCombo = 0;
    this.bestCombo = 0;
    this.isRetry = false;
    this.firstResult = null;
    this.hintUsed = false;
    this.wrong = [];
    this.current = null;
    this.state = "answer"; // answer | feedback
    this._keyHandler = (e) => this.onKey(e);
  }

  renderItemBar() {
    if (!this.itemBar) return;
    const inv = store.state.inventory;
    this.itemBar.innerHTML = "";
    const canHint = this.state === "answer" && !this.hintUsed && inv.hint > 0 && this.current?.hint;
    append(this.itemBar,
      el("button", { class: `item-btn ${inv.hint ? "" : "empty"}`, type: "button", disabled: !canHint, title: "Подсказка (из магазина)", onClick: () => this.useHint() }, "💡", el("span", { class: "item-count" }, String(inv.hint || 0))),
      el("div", { class: `item-btn static ${inv.shield ? "" : "empty"}`, title: "Щит комбо: сработает сам при ошибке" }, "🛡️", el("span", { class: "item-count" }, String(inv.shield || 0))),
      el("div", { class: `item-btn static ${inv.retry ? "" : "empty"}`, title: "Вторая попытка: появится после ошибки" }, "🔁", el("span", { class: "item-count" }, String(inv.retry || 0))),
      store.boostActive() ? el("div", { class: "item-btn static boost", title: "XP-буст активен" }, "⚡×2") : null,
      el("div", { class: "item-btn static coins", title: "Монеты за эту сессию" }, "🪙", el("span", { class: "item-count" }, String(this.coins))),
    );
  }

  useHint() {
    if (this.state !== "answer" || this.hintUsed || !this.current?.hint) return;
    if (!store.useItem("hint")) return;
    this.hintUsed = true;
    sfx.pop();
    this.current.hint();
    this.renderItemBar();
  }

  retryCurrent() {
    if (this.state !== "feedback" || !store.useItem("retry")) return;
    this.shieldPending = false; // the mistake is being undone — the shield is not spent after all
    this.pendingWords?.pop();    // …and so is the mark against the word
    this.answered--;
    this.wrong.pop();
    this.combo = this.prevCombo;
    store.update((s) => { s.stats.answered -= 1; }); // the wrong attempt is undone everywhere, as promised
    toast("🔁 Вторая попытка! Без штрафа.", { icon: "🔁" });
    this.renderCurrent();
  }

  start() {
    // closing the window or reloading never reaches destroy(); localStorage is written synchronously
    this._bankHandler = () => { this.recordResult(); this.bankPartial(); };
    window.addEventListener("pagehide", this._bankHandler);
    this.container.innerHTML = "";
    this.root = el("div", { class: "session" },
      el("header", { class: "session-head" },
        el("button", { class: "icon-btn", title: "Выйти", onClick: () => this.exit() }, "✕"),
        el("div", { class: "session-title" }, this.title),
        el("div", { class: "progress-track" }, (this.bar = el("div", { class: "progress-bar" }))),
        (this.comboEl = el("div", { class: "combo" }, "")),
      ),
      (this.body = el("div", { class: "session-body" })),
      (this.foot = el("footer", { class: "session-foot" },
        (this.feedback = el("div", { class: "feedback" })),
        (this.itemBar = el("div", { class: "item-bar" })),
        el("div", { class: "foot-actions" },
          (this.skipBtn = el("button", { class: "btn ghost", type: "button", onClick: () => this.skip() }, "Пропустить")),
          (this.mainBtn = el("button", { class: "btn primary big", type: "button", onClick: () => this.mainAction() }, "Проверить")),
        ),
      )),
    );
    this.container.append(this.root);
    document.addEventListener("keydown", this._keyHandler);
    this.renderCurrent();
  }

  /** Stop everything without navigating (used when the router leaves the page) */
  destroy() {
    if (this._destroyed) return; // exit() and the router both call this
    this._destroyed = true;
    this.recordResult();
    this.bankPartial();
    this._token = null; // pending timers/promises become no-ops
    speech.stop();
    speech.abortListening();
    document.removeEventListener("keydown", this._keyHandler);
    if (this._bankHandler) window.removeEventListener("pagehide", this._bankHandler);
  }

  /**
   * Keep what a half-finished session already earned. Leaving mid-way used to throw away every XP
   * and coin the screen had already shown him — five right answers then quitting paid nothing.
   */
  bankPartial() {
    if (this._banked || this.answered <= 0) return;
    this._banked = true;
    this.settleWords();
    this.settleShield();
    const xp = this.xp, coins = this.coins;
    this.xp = 0; this.coins = 0;
    const gainedCoins = store.addCoins(coins);
    if (xp) store.addXp(xp); else store.save(); // addXp bails on 0, so persist the answer stats anyway
    if (xp || gainedCoins) toast(tr`Прогресс сохранён: +${xp} XP · +${gainedCoins} 🪙`, { icon: "💾" });
  }

  exit() {
    // Once the results screen is up, the session is over and its score is real. Closing it with ✕
    // has to count exactly like «Продолжить», or a passed exam pays out its XP on the spot and
    // still shows up as never taken.
    if (this.result) return this.done();
    this.destroy();
    this.onExit?.();
  }

  /**
   * Write the score down.
   *
   * Deliberately separate from onDone, which navigates. Emil leaves the results screen in ways that
   * never touch a button — Back, Alt+←, the mouse's side button, F5, closing the window — and all
   * of those only tear the view down through the router. Recording here means a passed exam counts
   * however he walks away from it; navigation stays with whoever actually asked to navigate.
   */
  recordResult() {
    if (this._recorded || !this.result) return;
    this._recorded = true;
    this.onRecord?.(this.firstResult);
  }

  /** Leave the results screen with the score recorded. */
  done() {
    if (this._doneCalled) return;
    this._doneCalled = true;
    this.destroy(); // records the score
    this.onDone?.(this.firstResult);
  }

  onKey(e) {
    const t = e.target;
    if (t && ["INPUT", "TEXTAREA"].includes(t.tagName) && e.key !== "Enter") return;
    if (e.key === "Enter") {
      // let a focused control (retry, ask-Mia, 🔊, an option) handle its own Enter
      if (t && t !== this.mainBtn && t.closest?.("button, a, select")) return;
      if (!this.mainBtn.disabled) { e.preventDefault(); this.mainAction(); }
      return;
    }
    if (this.state === "answer" && this.current?.selectByKey && /^[1-4]$/.test(e.key)) this.current.selectByKey(Number(e.key) - 1);
  }

  setReady(ready) {
    this.mainBtn.disabled = !ready;
  }

  updateCombo() {
    if (this.combo > (this.bestCombo || 0)) this.bestCombo = this.combo;
    this.comboEl.textContent = tr(this.combo >= 2 ? `🔥 x${this.combo}` : "");
    this.comboEl.classList.toggle("hot", this.combo >= 3);
  }

  renderCurrent() {
    const ex = this.exercises[this.i];
    if (!ex) return this.finish();
    this.state = "answer";
    this.feedback.innerHTML = "";
    this.foot.className = "session-foot";
    this.mainBtn.textContent = tr("Проверить");
    this.skipBtn.hidden = !(ex.type === "speak" || ex.type === "listen");
    this.bar.style.width = `${(this.i / this.exercises.length) * 100}%`;
    this.updateCombo();
    this.body.innerHTML = "";
    // token identity: callbacks from a previous exercise's timers/promises must not touch the new one
    const token = {};
    this._token = token;
    const live = () => this._token === token && !this._destroyed;
    const api = {
      setReady: (r) => { if (live()) this.setReady(r); },
      autoCheck: () => { if (live() && this.state === "answer") this.mainAction(); },
      later: (fn, ms) => setTimeout(() => { if (live()) fn(); }, ms),
      session: this,
    };
    this.current = RENDER[ex.type](ex, api);
    this.hintUsed = false;
    const card = el("div", { class: "ex-card" }, el("div", { class: "ex-kind" }, KIND_LABEL[ex.type], el("span", { class: "ex-count" }, `${this.i + 1} / ${this.exercises.length}`)), this.current.node);
    this.body.append(card);
    nextTick(() => card.classList.add("enter"));
    this.setReady(Boolean(this.current.ready));
    this.renderItemBar();
    this.current.focus?.();
  }

  mainAction() {
    if (this.state === "answer") this.check();
    else this.next();
  }

  skip() {
    if (this.state !== "answer") return;
    speech.stop();
    speech.abortListening();
    // in the exam a skipped question counts as wrong, otherwise skipping would shrink the denominator
    if (this.exam) {
      this.answered++;
      this.combo = 0;
      this.wrong.push(this.exercises[this.i]);
      store.recordAnswer(false, 0);
      this.updateCombo();
    }
    this.i++;
    this.renderCurrent();
  }

  check() {
    if (!this.current?.check) return;
    const res = this.current.check();
    if (!res) return;
    this.state = "feedback";
    this.answered++;
    const ex = this.exercises[this.i];
    let earned = 0, coinsEarned = 0, shielded = false;
    if (res.ok) {
      this.correct++;
      this.combo++;
      const base = (XP[ex.type] || 10) * this.xpMult + (this.combo >= 6 ? 8 : this.combo >= 3 ? 4 : 0);
      earned = Math.round(base * store.xpMultiplier());
      this.xp += earned;
      coinsEarned = COINS.correct + (this.combo >= 3 ? COINS.comboBonus : 0);
      this.coins += coinsEarned;
      sfx.correct();
      if (ex.type === "speak") store.update((s) => { s.stats.speakCorrect += 1; });
    } else {
      this.prevCombo = this.combo;
      // Reserve the shield rather than spend it: if Emil undoes this attempt with «Вторая попытка»
      // the whole mistake is rewound, and a 40-coin item must not be burned for nothing.
      if (this.combo >= 2 && store.hasItem("shield")) {
        this.shieldPending = true;
        shielded = true;
        setTimeout(() => toast("Щит спас твоё комбо!", { icon: "🛡️" }), 200);
      } else this.combo = 0;
      this.wrong.push(ex);
      sfx.wrong();
    }
    store.recordAnswer(res.ok, this.combo);
    // Remember how this particular word went, so «Повторение» can bring back what he is losing —
    // but only once the attempt is final. «Вторая попытка» rewinds the whole mistake, and the
    // word's memory is part of it; recorded here and now, a word he then got right stayed marked
    // as failed and kept coming back, which is not what a paid-for retry promises.
    if (ex.word) (this.pendingWords ||= []).push({ de: ex.word, ok: res.ok });
    this.updateCombo();
    this.renderItemBar();
    this.foot.classList.add(res.ok ? "ok" : "bad");
    this.feedback.innerHTML = "";
    const expectedDe = res.expected;
    append(this.feedback,
      el("div", { class: "fb-head" }, el("span", { class: "fb-icon" }, res.ok ? "✅" : shielded ? "🛡️" : "❌"), el("strong", {}, res.ok ? pick(PRAISE) : pick(OOPS)), res.ok && earned ? el("span", { class: "fb-xp" }, `+${earned} XP · +${coinsEarned} 🪙`) : null),
      !res.ok && expectedDe ? el("div", { class: "fb-expected" }, el("span", { class: "muted" }, "Правильно: "), el("strong", { lang: "de" }, expectedDe), res.speakable !== false ? speakBtn(res.speakable || expectedDe) : null) : null,
      // also on a wrong answer: that is where «почти, но окончание другое» belongs
      res.note ? el("div", { class: res.ok ? "fb-note" : "fb-note near" }, res.note) : null,
      res.explain ? el("div", { class: "fb-explain" }, "💡 ", res.explain) : null,
    );
    if (!res.ok) {
      const row = el("div", { class: "fb-actions" });
      // Also in the exam: the exam can be retaken as often as he likes anyway, so a token he paid
      // for gives him nothing extra — while hiding it with no explanation just looks broken.
      if (store.hasItem("retry")) row.append(el("button", { class: "btn ghost small", type: "button", onClick: () => this.retryCurrent() }, tr`🔁 Вторая попытка (${store.state.inventory.retry})`));
      if (document.body.dataset.ai === "1") {
        const ask = el("button", { class: "btn ghost small", type: "button", onClick: () => this.askLena(ex, res, ask) }, "🧑‍🏫 Спросить Мию, почему");
        row.append(ask);
      }
      if (row.children.length) this.feedback.append(row);
    }
    if (earned) xpFloat(this.mainBtn, earned);
    this.skipBtn.hidden = true; // the answer is in: skipping is no longer a thing he can do
    this.mainBtn.textContent = tr(this.i + 1 >= this.exercises.length ? "Завершить" : "Дальше");
    this.setReady(true);
    this.mainBtn.focus();
  }

  /**
   * «Почему?» — по конкретной ошибке, к той же Мии, что и в разговоре.
   *
   * Раньше кнопка стучалась в /api/explain, которого не существует со времён переезда с Express:
   * нажатие всегда заканчивалось надписью «Не удалось спросить Мию». Теперь это обычная реплика
   * в /api/tutor — один вопрос, один ответ, без истории.
   */
  async askLena(ex, res, btn) {
    btn.disabled = true;
    btn.textContent = tr("Мия думает…");
    const question = [
      "Объясни коротко мою ошибку в упражнении.",
      tr`Задание: ${ex.q || ex.text || ex.de || ""}`,
      res.given ? tr`Я написал: ${res.given}` : null,
      res.expected ? tr`Правильно: ${res.expected}` : null,
      "Ответь одним-двумя предложениями: в чём правило и как запомнить.",
    ].filter(Boolean).join("\n");
    try {
      const token = await backend.token().catch(() => null);
      const r = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          scenario: null,
          notes: [],
          profile: { name: store.state.name || "", cefr: store.cefr(), mode: "chat", uiLang: uiLang() },
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "error");
      const text = data.say || data.translation || "";
      if (!text) throw new Error("пусто");
      btn.replaceWith(el("div", { class: "fb-lena" }, el("div", { class: "fb-lena-name" }, "Мия"), el("div", {}, text)));
    } catch (e) {
      btn.disabled = false;
      btn.textContent = tr("Не получилось — нажми ещё раз");
    }
  }

  next() {
    this.settleShield();
    speech.stop();
    this.i++;
    this.renderCurrent();
  }

  /** Charge a shield that was reserved for a mistake Emil did not undo with «Вторая попытка». */
  /** Hand the finished attempts to the word memory. See the note in check(). */
  settleWords() {
    if (!this.pendingWords || !this.pendingWords.length) return;
    for (const w of this.pendingWords) store.recordWord(w.de, w.ok);
    this.pendingWords = [];
  }

  settleShield() {
    if (!this.shieldPending) return;
    this.shieldPending = false;
    store.useItem("shield");
    this.renderItemBar();
  }

  finish() {
    document.removeEventListener("keydown", this._keyHandler);
    this._token = null;
    this.bar.style.width = "100%";
    this.settleWords();
    const total = this.answered;
    const accuracy = total ? Math.round((this.correct / total) * 100) : 0;
    const bonus = accuracy >= 90 && total >= 5 ? 20 : 0;
    const xpTotal = this.xp + bonus;
    const coinsTotal = store.addCoins(this.coins + (accuracy >= 90 && total >= 5 ? 10 : 0));
    this.coins = 0; // already credited: a retry round must not pay them again
    const result = { correct: this.correct, total, xp: xpTotal, coins: coinsTotal, accuracy, wrong: this.wrong, isRetry: Boolean(this.isRetry) };
    // the score that counts for missions/quizzes is the first pass, not a replay of the wrong items
    if (!this.firstResult) this.firstResult = result;
    // addXp bails out on 0, and so does addCoins — so a round he got nothing right on used to be
    // saved by nobody, losing exactly the spaced-repetition marks for the words he keeps forgetting.
    const unlocked = xpTotal ? store.addXp(xpTotal) : (store.save(), []);
    this._banked = true; // finish() has paid — the destroy() that follows must not pay again
    if (accuracy >= 80 && total >= 3) { confetti(); sfx.levelUp(); }
    this.body.innerHTML = "";
    this.foot.hidden = true;
    const ring = ringSvg(accuracy, 140);
    const xpEl = el("div", { class: "result-xp" }, "0");
    const msg = accuracy >= 90 ? "Ausgezeichnet! Великолепно!" : accuracy >= 70 ? "Sehr gut! Отличная работа!" : accuracy >= 50 ? "Gut gemacht! Есть над чем поработать." : "Weiter üben! Повтори слова и попробуй ещё раз.";
    const wrap = el("div", { class: "result" },
      el("div", { class: "result-ring" }, ring, el("div", { class: "result-pct" }, `${accuracy}%`)),
      el("h2", {}, msg),
      el("div", { class: "result-stats" },
        el("div", { class: "stat" }, el("div", { class: "stat-val" }, `${this.correct}/${total}`), el("div", { class: "stat-label" }, "правильно")),
        el("div", { class: "stat" }, el("div", { class: "stat-val xp" }, xpEl), el("div", { class: "stat-label" }, "XP получено")),
        el("div", { class: "stat" }, el("div", { class: "stat-val coins" }, `+${coinsTotal} 🪙`), el("div", { class: "stat-label" }, "монет")),
        el("div", { class: "stat" }, el("div", { class: "stat-val" }, `x${this.bestCombo || 0}`), el("div", { class: "stat-label" }, "комбо в этой сессии")),
      ),
      bonus ? el("div", { class: "result-bonus" }, tr`🎯 Бонус за точность: +${bonus} XP · +10 🪙`) : null,
      this.isRetry ? el("div", { class: "muted small" }, tr`Зачтён первый результат: ${this.firstResult.correct}/${this.firstResult.total} (${this.firstResult.accuracy}%)`) : null,
      el("div", { class: "result-actions" },
        this.wrong.length && !this.exam ? el("button", { class: "btn ghost", type: "button", onClick: () => this.retryWrong() }, tr`Повторить ошибки (${this.wrong.length})`) : null,
        el("button", { class: "btn primary big", type: "button", onClick: () => this.done() }, "Продолжить"),
      ),
    );
    this.body.append(wrap);
    nextTick(() => wrap.classList.add("enter"));
    countUp(xpEl, 0, xpTotal, 900);
    this.result = result;
  }

  retryWrong() {
    const wrong = this.wrong.slice();
    this.exercises = wrong;
    this.i = 0; this.correct = 0; this.answered = 0; this.xp = 0; this.coins = 0;
    this.combo = 0; this.prevCombo = 0; this.bestCombo = 0; this.wrong = []; this.hintUsed = false;
    this._banked = false; // a retry round earns afresh — abandoning it must still bank what it earned
    this.xpMult = 0.5;
    this.isRetry = true;
    this.foot.hidden = false;
    document.addEventListener("keydown", this._keyHandler);
    this.renderCurrent();
  }
}

let ringId = 0;
export function ringSvg(pct, size = 120, stroke = 10, color = null) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // A unique id per ring: twelve rings on the levels page all declared "ringGrad", and the theme
  // Emil bought never reached them because the stops were hard-coded violet-to-cyan.
  const gid = `ringGrad${++ringId}`;
  color = color || `url(#${gid})`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "ring");
  svg.innerHTML = `
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}"/>
    <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  nextTick(() => setTimeout(() => { svg.querySelector(".ring-fill").style.strokeDashoffset = c * (1 - Math.max(0, Math.min(100, pct)) / 100); }, 50));
  return svg;
}

const KIND_LABEL = {
  choice: "Выбери правильный вариант",
  fill: "Заполни пропуск",
  translate: "Переведи",
  order: "Собери предложение",
  match: "Соедини пары",
  listen: "Послушай",
  speak: "Произнеси вслух",
};

/* ------------------------------------------------------------------ renderers */
const RENDER = {
  choice: (ex, api) => choiceRenderer(ex, api, ex.q, null),
  listen: (ex, api) => (ex.mode === "choice" ? listenChoice(ex, api) : listenType(ex, api)),
  fill: fillRenderer,
  translate: translateRenderer,
  order: orderRenderer,
  match: matchRenderer,
  speak: speakRenderer,
};

function choiceRenderer(ex, api, question, extraTop) {
  let selected = null;
  const buttons = ex.options.map((o, i) =>
    el("button", { class: "opt", type: "button", onClick: () => select(i) }, el("span", { class: "opt-key" }, String(i + 1)), el("span", { class: "opt-text", lang: "de" }, o)),
  );
  function select(i) {
    if (locked) return;
    selected = i;
    buttons.forEach((b, j) => b.classList.toggle("selected", j === i));
    sfx.pop();
    api.setReady(true);
  }
  let locked = false;
  const node = el("div", { class: "ex ex-choice" }, extraTop, el("div", { class: "ex-q" }, question), el("div", { class: "opts" }, buttons));
  return {
    node,
    selectByKey: (i) => buttons[i] && !buttons[i].disabled && select(i),
    hint() {
      // Almost every task in the course has three options, so striking out both wrong ones left
      // exactly one clickable button — the right one. A hint narrows the choice; it must never
      // make it for him, so at least one wrong option always survives.
      const wrongIdx = ex.options.map((_, i) => i).filter((i) => i !== ex.answer && i !== selected);
      const remove = Math.max(1, Math.min(2, wrongIdx.length - 1));
      shuffle(wrongIdx).slice(0, remove).forEach((i) => { buttons[i].disabled = true; buttons[i].classList.add("eliminated"); });
    },
    check() {
      if (selected === null) return null;
      locked = true;
      const ok = selected === ex.answer;
      buttons.forEach((b, j) => { b.disabled = true; if (j === ex.answer) b.classList.add("correct"); else if (j === selected) b.classList.add("wrong"); });
      return { ok, expected: ex.options[ex.answer], explain: ex.explain, given: ex.options[selected], speakable: /[a-zäöüß]/i.test(ex.options[ex.answer]) ? ex.options[ex.answer] : false };
    },
  };
}

function playBox(text, api, { auto = true } = {}) {
  const btn = el("button", { class: "play-btn", type: "button", title: "Прослушать" }, el("span", { class: "play-icon" }, "▶"), el("span", { class: "play-waves" }, el("i"), el("i"), el("i"), el("i"), el("i")));
  const box = el("div", { class: "play-box" }, btn, el("div", { class: "play-hint" }, "Нажми, чтобы прослушать ещё раз"));
  const play = async () => {
    box.classList.add("playing");
    await speech.speak(text, { rate: Math.min(store.state.settings.rate, RATES.listen), force: true });
    box.classList.remove("playing");
  };
  btn.addEventListener("click", play);
  // api.later so the audio never starts after the learner already moved on
  if (auto) (api?.later || setTimeout)(play, 350);
  return box;
}

function listenChoice(ex, api) {
  const r = choiceRenderer(ex, api, ex.q, playBox(ex.text, api));
  const check = r.check;
  r.check = () => { const res = check(); if (res) { res.expected = res.ok ? res.expected : `${res.expected} — «${ex.text}»`; res.speakable = ex.text; res.note = tr`Текст: «${ex.text}» — ${ex.ru}`; } return res; };
  return r;
}

function textInput(placeholder, api) {
  const input = el("input", { class: "text-input", type: "text", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder, lang: "de" });
  input.addEventListener("input", () => api.setReady(input.value.trim().length > 0));
  return input;
}

function umlautBar(input) {
  const chars = ["ä", "ö", "ü", "ß"];
  return el("div", { class: "umlauts" }, chars.map((c) => el("button", { class: "chip small", type: "button", onClick: () => { if (input.disabled) return; const s = input.selectionStart ?? input.value.length; input.setRangeText(c, s, input.selectionEnd ?? s, "end"); input.dispatchEvent(new Event("input")); input.focus(); } }, c)));
}

function listenType(ex, api) {
  const input = textInput("Напиши, что услышал…", api);
  const node = el("div", { class: "ex ex-listen" }, playBox(ex.text, api), el("div", { class: "ex-q small" }, "Запиши предложение, которое услышал"), input, umlautBar(input));
  return {
    node,
    focus: () => input.focus(),
    hint() { node.append(el("div", { class: "hint-box" }, "💡 Текст: ", el("span", { lang: "de" }, ex.text))); },
    check() {
      const v = input.value.trim();
      if (!v) return null;
      const m = matchAnswer(v, ex.answers || [ex.text], 0.85);
      input.disabled = true;
      input.classList.add(m.ok ? "correct" : "wrong");
      return { ok: m.ok, expected: ex.text, explain: ex.explain, note: m.ok && !m.exact ? tr`Почти точно. Правильно: ${ex.text}` : tr`Перевод: ${ex.ru}`, given: v, speakable: ex.text };
    },
  };
}

function fillRenderer(ex, api) {
  const [before, after] = ex.sentence.split("___");
  let value = "";
  let locked = false; // after «Проверить» the answer stands — clicking another chip changed it under the feedback
  let blankEl, input = null, chips = [];
  if (ex.options) {
    blankEl = el("span", { class: "blank" }, "…");
    chips = shuffle(ex.options).map((o) => el("button", { class: "chip", type: "button" }, o));
    chips.forEach((c) => c.addEventListener("click", () => {
      if (locked) return;
      value = c.textContent;
      blankEl.textContent = tr(value);
      blankEl.classList.add("filled");
      chips.forEach((x) => x.classList.toggle("selected", x === c));
      sfx.pop();
      api.setReady(true);
    }));
    var chipsEl = el("div", { class: "chips" }, chips);
  } else {
    input = textInput("…", api);
    input.classList.add("inline");
    input.size = Math.max(6, (ex.answers[0] || "").length + 2);
    blankEl = input;
  }
  const node = el("div", { class: "ex ex-fill" },
    el("div", { class: "ex-sentence", lang: "de" }, before, blankEl, after),
    el("div", { class: "ex-ru muted" }, ex.ru),
    chipsEl || umlautBar(input),
  );
  return {
    node,
    focus: () => input?.focus(),
    hint() {
      const a = ex.answers[0];
      if (chips.length) {
        const accepted = ex.answers.map(normalize);
        // the shop promises "убирает два неверных варианта" — remove two, like the choice hint does
        const wrong = shuffle(chips.filter((c) => !accepted.includes(normalize(c.textContent)) && !c.classList.contains("selected")));
        // one wrong chip always stays: with three chips, removing two would simply be the answer
        wrong.slice(0, Math.max(1, wrong.length - 1)).forEach((c) => { c.disabled = true; c.classList.add("eliminated"); });
      } else {
        const n = Math.max(1, Math.ceil(a.length / 2));
        input.placeholder = tr(a.slice(0, n) + "…");
        node.append(el("div", { class: "hint-box" }, tr`💡 Начинается на «${a.slice(0, n)}…», всего букв: ${a.length}`));
      }
    },
    check() {
      const v = input ? input.value.trim() : value;
      if (!v) return null;
      locked = true;
      // the blank IS the grammar being tested, so the ending must be exactly right
      const m = matchAnswer(v, ex.answers, 1);
      const full = ex.sentence.replace("___", ex.answers[0]);
      if (input) { input.disabled = true; input.classList.add(m.ok ? "correct" : "wrong"); }
      else {
        blankEl.classList.add(m.ok ? "correct" : "wrong");
        const accepted = ex.answers.map(normalize);
        chips.forEach((c) => {
          c.disabled = true;
          if (accepted.includes(normalize(c.textContent))) c.classList.add("correct");
          else if (c.classList.contains("selected")) c.classList.add("wrong");
        });
      }
      const close = !m.ok && m.score >= 0.7 ? tr`Ты написал «${v}» — почти, но окончание другое.` : null;
      return { ok: m.ok, expected: full, explain: ex.explain, note: close, given: v, speakable: full };
    },
  };
}

function translateRenderer(ex, api) {
  const toDe = ex.dir === "ru-de";
  const input = textInput(toDe ? "Напиши по-немецки…" : "Напиши по-русски…", api);
  // подсказка браузеру, каким словарём проверять орфографию: родной язык, а не всегда русский
  if (!toDe) input.lang = uiLang();
  let hintShown = false;
  const hintBtn = ex.hint ? el("button", { class: "btn ghost small", type: "button", onClick: () => { hintShown = true; hintBtn.replaceWith(el("div", { class: "hint-box" }, "💡 ", ex.hint)); } }, "Подсказка") : null;
  const node = el("div", { class: "ex ex-translate" },
    // флаг родного языка, а не всегда русский: сайт бывает и азербайджанским
    el("div", { class: "dir-badge" }, toDe ? `${langInfo().flag} → 🇩🇪` : `🇩🇪 → ${langInfo().flag}`),
    el("div", { class: "ex-sentence", lang: toDe ? uiLang() : "de" }, ex.text, !toDe ? speakBtn(ex.text) : null),
    input,
    toDe ? umlautBar(input) : null,
    hintBtn,
  );
  return {
    node,
    focus: () => input.focus(),
    hint() {
      const words = ex.answers[0].split(" ");
      node.append(el("div", { class: "hint-box" }, "💡 ", ex.hint ? `${ex.hint} · ` : "", tr`Первое слово: «${words[0]}», всего слов: ${words.length}`));
    },
    check() {
      const v = input.value.trim();
      if (!v) return null;
      // matchAnswer rejects changed word endings outright (grammar), so the threshold only has to
      // forgive real typos; Russian stays more forgiving because wording varies more.
      const m = matchAnswer(v, ex.answers, toDe ? 0.85 : 0.8);
      input.disabled = true;
      input.classList.add(m.ok ? "correct" : "wrong");
      const alt = ex.answers.length > 1 ? tr`Также верно: ${ex.answers.slice(1, 3).join(" / ")}` : null;
      return { ok: m.ok, expected: ex.answers[0], explain: ex.explain || alt, note: m.ok && !m.exact ? tr`Есть небольшая опечатка. Точно: ${m.best}` : null, given: v, speakable: toDe ? ex.answers[0] : ex.text };
    },
  };
}

function orderRenderer(ex, api) {
  const bank = el("div", { class: "word-bank" });
  const line = el("div", { class: "word-line" });
  const placeholder = el("div", { class: "word-placeholder" }, "Нажимай на слова по порядку");
  line.append(placeholder);
  const chips = shuffle(ex.words.map((w, i) => ({ w, i }))).map(({ w, i }) => {
    const c = el("button", { class: "chip word", type: "button", lang: "de" }, w);
    c.dataset.i = i;
    c.addEventListener("click", () => {
      sfx.pop();
      if (c.parentElement === bank) { line.append(c); placeholder.remove(); }
      else { bank.append(c); if (!line.children.length) line.append(placeholder); }
      api.setReady(line.querySelectorAll(".chip").length === ex.words.length);
    });
    return c;
  });
  bank.append(...chips);
  const node = el("div", { class: "ex ex-order" }, el("div", { class: "ex-ru" }, ex.ru), line, bank);
  return {
    node,
    hint() {
      const first = ex.answer.replace(/[.!?]$/, "").split(" ").slice(0, 2).join(" ");
      node.append(el("div", { class: "hint-box" }, tr`💡 Начало: «${first} …»`));
    },
    check() {
      const words = Array.from(line.querySelectorAll(".chip")).map((c) => c.textContent);
      if (words.length !== ex.words.length) return null;
      // some sentences have a second, equally correct word order — the level may list it in `alt`
      const accepted = [ex.answer, ...(ex.alt || [])].map(normalize);
      const ok = accepted.includes(normalize(words.join(" ")));
      chips.forEach((c) => (c.disabled = true));
      line.classList.add(ok ? "correct" : "wrong");
      return { ok, expected: ex.answer, explain: ex.explain, given: words.join(" "), speakable: ex.answer };
    },
  };
}

function matchRenderer(ex, api) {
  const left = shuffle(ex.pairs.map((p, i) => ({ t: p.de, i })));
  const right = shuffle(ex.pairs.map((p, i) => ({ t: p.ru, i })));
  let selL = null, selR = null, errors = 0, done = 0, locked = false;
  const mk = (side, item) => {
    const b = el("button", { class: "match-item", type: "button", lang: side === "L" ? "de" : uiLang() }, item.t);
    b.addEventListener("click", () => {
      if (locked || b.classList.contains("locked")) return;
      sfx.pop();
      if (side === "L") { selL?.classList.remove("selected"); selL = b; }
      else { selR?.classList.remove("selected"); selR = b; }
      b.classList.add("selected");
      b.dataset.i = item.i;
      tryPair();
    });
    b.dataset.i = item.i;
    return b;
  };
  const colL = el("div", { class: "match-col" }, left.map((x) => mk("L", x)));
  const colR = el("div", { class: "match-col" }, right.map((x) => mk("R", x)));
  function tryPair() {
    if (!selL || !selR) return;
    const a = selL, b = selR;
    selL = selR = null;
    if (a.dataset.i === b.dataset.i) {
      a.classList.remove("selected"); b.classList.remove("selected");
      a.classList.add("locked"); b.classList.add("locked");
      sfx.correct();
      done++;
      if (done === ex.pairs.length) { locked = true; api.setReady(true); api.later(() => api.autoCheck(), 350); }
    } else {
      errors++;
      a.classList.add("shake"); b.classList.add("shake");
      sfx.wrong();
      setTimeout(() => {
        a.classList.remove("shake"); b.classList.remove("shake");
        // only clear the highlight if the item was not re-selected in the meantime
        if (selL !== a) a.classList.remove("selected");
        if (selR !== b) b.classList.remove("selected");
      }, 450);
    }
  }
  const node = el("div", { class: "ex ex-match" }, el("div", { class: "match-grid" }, colL, colR));
  return {
    node,
    hint() {
      const l = Array.from(colL.children).find((b) => !b.classList.contains("locked"));
      if (!l) return;
      const r = Array.from(colR.children).find((b) => b.dataset.i === l.dataset.i);
      [l, r].forEach((b) => { b.classList.remove("selected"); b.classList.add("locked"); });
      if (selL === l) selL = null;
      if (selR === r) selR = null;
      done++;
      if (done === ex.pairs.length) { locked = true; api.setReady(true); api.later(() => api.autoCheck(), 350); }
    },
    check() {
      if (done !== ex.pairs.length) return null;
      const ok = errors <= 1;
      return { ok, expected: ok ? null : ex.pairs.map((p) => `${p.de} — ${p.ru}`).join(", "), explain: errors ? tr`Ошибок: ${errors}` : "Без единой ошибки!", speakable: false };
    },
  };
}

function speakRenderer(ex, api) {
  let tries = 0, heard = "", best = 0, listening = false;
  const status = el("div", { class: "speak-status" }, speech.sttSupported ? "Нажми на микрофон и произнеси фразу" : STT_ERRORS.unsupported);
  const transcript = el("div", { class: "transcript" }, "");
  const mic = el("button", { class: "mic-btn", type: "button", disabled: !speech.sttSupported, title: "Говорить" }, el("span", { class: "mic-icon" }, "🎤"));
  const meter = el("div", { class: "sim-meter" }, el("div", { class: "sim-fill" }));
  async function listen() {
    if (listening) { speech.stopListening(); return; }
    listening = true;
    sfx.mic();
    mic.classList.add("listening");
    status.textContent = tr("Слушаю… говори!");
    transcript.textContent = "";
    let text = "";
    try {
      text = await speech.listen({ onInterim: (t) => (transcript.textContent = tr(t)) });
    } catch (e) {
      status.textContent = tr(STT_ERRORS[e.code] || "Ошибка микрофона. Попробуй ещё раз.");
      mic.classList.remove("listening");
      listening = false;
      // The microphone failing is not his fault and must not trap him: «Проверить» stays reachable
      // so the task can be closed, marked wrong, and left behind.
      tries++;
      api.setReady(true);
      return;
    }
    listening = false;
    mic.classList.remove("listening");
    heard = text;
    tries++;
    transcript.textContent = tr(heard || "(ничего не услышала)");
    // spokenSimilarity also matches when recognition wrote numbers as digits
    const score = heard ? spokenSimilarity(heard, ex.text) : 0;
    const h = normalize(digitsToWords(heard)), t = normalize(ex.text);
    // He said the whole phrase (possibly with filler around it) → count it as said. The reverse,
    // `t.includes(h)`, used to count too — but that is true of any single word of the sentence, so
    // saying just "ich" passed every speaking task in the course.
    const contains = Boolean(heard) && (h.includes(t) || (t.includes(h) && h.length >= t.length * 0.8));
    best = Math.max(best, contains ? Math.max(score, 0.85) : score);
    meter.querySelector(".sim-fill").style.width = `${Math.round(best * 100)}%`;
    if (best >= 0.72) {
      status.textContent = tr("Отлично, я тебя поняла!");
      api.setReady(true);
      api.later(() => api.autoCheck(), 300);
    } else {
      status.textContent = tr(tries >= 3 ? "Не получилось распознать. Можно проверить или пропустить." : tr`Похоже на ${Math.round(best * 100)}%. Попробуй ещё раз, чётче и ближе к микрофону.`);
      api.setReady(true);
    }
  }
  mic.addEventListener("click", listen);
  const node = el("div", { class: "ex ex-speak" },
    el("div", { class: "ex-sentence big", lang: "de" }, ex.text, speakBtn(ex.text)),
    el("div", { class: "ex-ru muted" }, ex.ru),
    mic, status, transcript, meter,
  );
  api.later(() => speech.speak(ex.text, { rate: RATES.example }), 400);
  // With no speech recognition at all there is nothing to wait for — let him listen, repeat out
  // loud and move on, instead of leaving him on a task with every button disabled.
  if (!speech.sttSupported) api.later(() => api.setReady(true), 0);
  return {
    node,
    hint() {
      status.textContent = tr("Слушай медленно и повторяй по частям");
      speech.speak(ex.text, { rate: 0.6, force: true });
    },
    check() {
      const ok = best >= 0.72;
      mic.disabled = true;
      return { ok, expected: ex.text, explain: ok ? null : tr`Я услышала: «${heard || "…"}». Прослушай ещё раз и повтори чётче.`, note: ok ? tr`Совпадение ${Math.round(best * 100)}%` : null, given: heard, speakable: ex.text };
    },
  };
}
