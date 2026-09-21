// Dialogue player: listen to the level dialogue, then play Ali's role with the microphone
import { el, normalize, similarity, spokenSimilarity, digitsToWords, sleep } from "./utils.js";
import { speech, STT_ERRORS, RATES } from "./speech.js";
import { sfx, confetti, xpFloat } from "./fx.js";
import { store } from "./store.js";

export function renderDialogue({ container, level, onDone, onExit }) {
  const d = level.dialogue;
  const other = d.lines.find((l) => l.speaker !== "Ali")?.speaker || "Mia";
  // one warm female voice reads everything; Ali's lines are read a touch slower so the two are still easy to tell apart
  const rateFor = (speaker) => (speaker === "Ali" ? RATES.dialogueAli : RATES.dialogueOther);
  /**
   * Replay a single line. It takes over from a running playback: speech.speak() stops whatever is
   * playing, so without this the loop would wake up 350 ms later and talk over the very line Ali
   * asked to hear again.
   */
  const replayLine = (l) => {
    if (playing) stopped = true;
    speech.speak(l.de, { rate: rateFor(l.speaker), force: true });
  };
  let mode = "listen"; // listen | play
  let playing = false;
  let stopped = false;
  let aliDone = 0;
  const aliLines = d.lines.filter((l) => l.speaker === "Ali").length;
  container.innerHTML = "";

  const lines = d.lines.map((l, i) =>
    el("div", { class: `dl-line ${l.speaker === "Ali" ? "ali" : "other"}` },
      el("div", { class: "dl-speaker" }, l.speaker),
      el("div", { class: "dl-bubble" },
        el("div", { class: "dl-de", lang: "de" }, l.de, el("button", { class: "icon-btn tiny", type: "button", onClick: () => replayLine(l) }, "🔊")),
        el("div", { class: "dl-ru" }, l.ru),
        l.speaker === "Ali" ? el("div", { class: "dl-mic-row" }, el("button", { class: "mic-btn small", type: "button", onClick: () => speakLine(i) }, "🎤"), el("span", { class: "dl-status muted" }, "")) : null,
      ),
    ),
  );

  const playBtn = el("button", { class: "btn primary big", type: "button", onClick: () => playAll() }, "▶ Прослушать диалог");
  const roleBtn = el("button", { class: "btn ghost", type: "button", onClick: () => setMode("play") }, "🎭 Сыграть роль Али");
  // The stage must never dead-end: the mic can be denied, missing or the recogniser offline.
  // The button is always present but only offered once Ali has actually listened to the dialogue.
  const noMicBtn = el("button", { class: "btn", hidden: true, type: "button", onClick: () => {
    if (store.level(level.id).dialogueDone) return;
    confetti(); sfx.levelUp();
    store.update(() => { store.level(level.id).dialogueDone = true; });
    store.grantXp(30);
    root_msg.textContent = `🎉 Диалог отмечен как пройденный! +${Math.round(30 * store.xpMultiplier())} XP`;
    onDone?.();
  } }, "✓ Я прочитал реплики Али вслух");
  const showRu = el("label", { class: "toggle" }, (() => { const c = el("input", { type: "checkbox" }); c.checked = store.state.settings.showRu; c.addEventListener("change", () => { store.update((st) => { st.settings.showRu = c.checked; }); root.classList.toggle("hide-ru", !c.checked); }); return c; })(), el("span", { class: "toggle-track" }, el("span", { class: "toggle-thumb" })), el("span", { class: "toggle-label" }, "Перевод"));

  const root = el("div", { class: "session dialogue" },
    el("header", { class: "session-head" },
      el("button", { class: "icon-btn", title: "Выйти", onClick: () => { stopped = true; speech.stop(); speech.abortListening(); onExit?.(); } }, "✕"),
      el("div", { class: "session-title" }, `🎧 ${d.title}`, el("span", { class: "muted" }, ` · ${d.titleRu}`)),
      showRu,
    ),
    el("div", { class: "session-body" }, el("div", { class: "dl-list" }, lines)),
    el("footer", { class: "session-foot" },
      (root_msg = el("div", { class: "feedback dl-msg" }, "Сначала послушай весь диалог, потом сыграй роль Али — произнеси его реплики в микрофон.")),
      el("div", { class: "foot-actions" }, noMicBtn, roleBtn, playBtn),
    ),
  );
  var root_msg;
  root.classList.toggle("hide-ru", !store.state.settings.showRu);
  container.append(root);

  function setMode(m) {
    mode = m;
    root.classList.toggle("play-mode", m === "play");
    if (m === "play") {
      root_msg.textContent = `Нажимай 🎤 у реплик Али и произноси их. Произнесено: ${aliDone}/${aliLines}`;
      roleBtn.textContent = "🎧 Режим прослушивания";
      roleBtn.onclick = () => setMode("listen");
      playBtn.textContent = "▶ Диалог с моими репликами";
      playBtn.onclick = () => playAll(true);
    } else {
      root_msg.textContent = "Сначала послушай весь диалог, потом сыграй роль Али.";
      roleBtn.textContent = "🎭 Сыграть роль Али";
      roleBtn.onclick = () => setMode("play");
      playBtn.textContent = "▶ Прослушать диалог";
      playBtn.onclick = () => playAll(false);
    }
  }

  async function playAll(interactive = false) {
    if (playing) { stopped = true; speech.stop(); speech.abortListening(); return; }
    playing = true; stopped = false;
    playBtn.textContent = "⏹ Стоп";
    for (let i = 0; i < d.lines.length; i++) {
      if (stopped) break;
      const l = d.lines[i];
      lines.forEach((x) => x.classList.remove("active"));
      lines[i].classList.add("active");
      lines[i].scrollIntoView({ behavior: "smooth", block: "center" });
      if (interactive && l.speaker === "Ali") {
        const ok = await speakLine(i, true);
        if (stopped) break;
        if (!ok) await sleep(300);
      } else {
        await speech.speak(l.de, { rate: rateFor(l.speaker) });
        await sleep(350);
      }
    }
    lines.forEach((x) => x.classList.remove("active"));
    playing = false;
    setMode(mode);
    if (!stopped && !interactive) {
      // Once per level, not once per visit: the flag used to live in this closure, so leaving the
      // screen and coming back paid the bonus again, for ever.
      if (!store.level(level.id).dialogueListened) {
        store.update(() => { store.level(level.id).dialogueListened = true; });
        store.grantXp(15);
        // show what actually landed — a coffee or a boost multiplies it
        xpFloat(playBtn, Math.round(15 * store.xpMultiplier()));
      }
      if (!store.level(level.id).dialogueDone) noMicBtn.hidden = false;
      root_msg.textContent = speech.sttSupported
        ? "Отлично! Теперь попробуй сыграть роль Али 🎭 Если микрофон не работает, отметь диалог кнопкой слева."
        : "Отлично! Микрофон недоступен, поэтому отметь диалог кнопкой слева, когда прочитаешь реплики Али вслух.";
    }
  }

  async function speakLine(i, inFlow = false) {
    const l = d.lines[i];
    const row = lines[i];
    const status = row.querySelector(".dl-status");
    const mic = row.querySelector(".mic-btn");
    if (!speech.sttSupported) {
      status.textContent = STT_ERRORS.unsupported;
      if (!store.level(level.id).dialogueDone) noMicBtn.hidden = false;
      return false;
    }
    mic.classList.add("listening");
    status.textContent = "Слушаю…";
    sfx.mic();
    let heard = "";
    try {
      heard = await speech.listen({ onInterim: (t) => (status.textContent = t) });
    } catch (e) {
      status.textContent = STT_ERRORS[e.code] || "Ошибка микрофона";
      mic.classList.remove("listening");
      if (!store.level(level.id).dialogueDone) noMicBtn.hidden = false; // never leave him stuck here
      return false;
    }
    mic.classList.remove("listening");
    const score = heard ? spokenSimilarity(heard, l.de) : 0;
    const h = normalize(digitsToWords(heard));
    const ok = score >= 0.68 || (heard && normalize(l.de).includes(h) && h.length > 4);
    if (ok) {
      const firstTime = !row.classList.contains("done");
      if (firstTime) { row.classList.add("done"); aliDone++; }
      status.textContent = `✅ ${Math.round(Math.max(score, 0.68) * 100)}% — «${heard}»`;
      sfx.correct();
      if (firstTime) {
        store.update((s) => { s.stats.speakCorrect += 1; });
        store.grantXp(8);
        xpFloat(mic, 8);
      }
      if (aliDone >= aliLines && !store.level(level.id).dialogueDone) {
        confetti(); sfx.levelUp();
        store.update(() => { store.level(level.id).dialogueDone = true; });
        store.grantXp(30);
        root_msg.textContent = `🎉 Ты сыграл весь диалог! +${Math.round(30 * store.xpMultiplier())} XP`;
        onDone?.();
      } else if (mode === "play") root_msg.textContent = `Произнесено: ${aliDone}/${aliLines}`;
    } else {
      status.textContent = heard ? `❌ Я услышала: «${heard}». Попробуй ещё раз.` : "Ничего не услышала. Попробуй ещё раз.";
      sfx.wrong();
    }
    return ok;
  }

  setMode("listen");
  return { destroy: () => { stopped = true; speech.stop(); speech.abortListening(); } };
}
