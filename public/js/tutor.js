// Mia — the voice tutor. AI mode talks to /api/tutor (Claude); offline mode runs the level's script.
import { t as tr, lang as uiLang } from "./i18n.js";
import { el, normalize, sleep, nextTick, todayKey } from "./utils.js";
import { speech, STT_ERRORS } from "./speech.js";
import { sfx, confetti, toast, xpFloat } from "./fx.js";
import { store } from "./store.js";
import { understand, respond, opening } from "./brain.js";
import { check as moderate } from "./moderation.js";

const PRAISE = ["Super, Emil!", "Sehr gut!", "Genau so!", "Prima!", "Das klingt gut!", "Richtig!", "Klasse gemacht!"];
const PRAISE_RU = ["Супер, Эмиль!", "Очень хорошо!", "Вот именно так!", "Отлично!", "Звучит здорово!", "Правильно!", "Класс!"];

// Generic offline questions for free chat (A1)
const FREE_SCRIPT = [
  { say: "Hallo Emil! Wie geht es dir heute?", sayRu: "Привет, Эмиль! Как у тебя сегодня дела?", hint: "Mir geht es gut, danke. Und dir?", expect: ["gut", "super", "prima", "schlecht", "müde", "so la la", "geht"] },
  { say: "Was machst du heute?", sayRu: "Что ты сегодня делаешь?", hint: "Ich arbeite. / Ich lerne Deutsch.", expect: ["ich", "arbeite", "lerne", "gehe", "mache", "spiele", "treffe", "schlafe", "nichts"] },
  { say: "Woher kommst du und wo wohnst du jetzt?", sayRu: "Откуда ты и где ты сейчас живёшь?", hint: "Ich komme aus … und wohne in …", expect: ["komme", "aus", "wohne", "in"] },
  { say: "Was ist dein Lieblingsessen?", sayRu: "Какая твоя любимая еда?", hint: "Mein Lieblingsessen ist Pizza.", expect: ["lieblingsessen", "esse", "gern", "ist", "pizza", "fleisch", "suppe", "reis", "salat", "brot"] },
  { say: "Was machst du gern in deiner Freizeit?", sayRu: "Что ты любишь делать в свободное время?", hint: "Ich spiele gern Fußball. / Ich höre gern Musik.", expect: ["gern", "spiele", "höre", "lese", "schwimme", "koche", "reise", "sport", "musik", "fußball", "fussball"] },
  { say: "Wie spät ist es jetzt bei dir?", sayRu: "Сколько сейчас у тебя времени?", hint: "Es ist zehn Uhr.", expect: ["uhr", "halb", "viertel", "es ist"] },
  { say: "Wie ist das Wetter heute?", sayRu: "Какая сегодня погода?", hint: "Es ist sonnig und warm. / Es regnet.", expect: ["sonnig", "warm", "kalt", "regnet", "regen", "schnee", "wolkig", "schön", "gut", "heiß", "heiss"] },
  { say: "Hast du Geschwister?", sayRu: "У тебя есть братья или сёстры?", hint: "Ja, ich habe einen Bruder. / Nein, ich habe keine Geschwister.", expect: ["ja", "nein", "bruder", "schwester", "habe", "keine"] },
  { say: "Was trinkst du gern morgens: Kaffee oder Tee?", sayRu: "Что ты любишь пить по утрам: кофе или чай?", hint: "Ich trinke gern Kaffee.", expect: ["kaffee", "tee", "trinke", "wasser", "saft", "milch"] },
  { say: "Das war ein schönes Gespräch, Emil! Bis zum nächsten Mal. Tschüss!", sayRu: "Это был приятный разговор, Эмиль! До следующего раза. Пока!", hint: "Tschüss, Mia! Bis bald!", expect: ["tschüss", "tschuss", "bis", "ciao", "auf wiedersehen", "danke"] },
];

/**
 * Offline fallback for the oral exam / topic chat: build a turn list out of the level's own material,
 * so both modes still work when the AI backend is off.
 */
function buildLevelScript(level, talkMode) {
  const turns = [];
  const greetDe = talkMode === "exam"
    ? `Hallo Emil! Schön, dass du da bist. Wir üben jetzt zusammen: ${level.title}. Keine Sorge, das ist nur Übung.`
    : `Hallo Emil! Lass uns ein bisschen über ${level.title} plaudern.`;
  const greetRu = talkMode === "exam"
    ? tr`Привет, Эмиль! Рада тебя видеть. Сейчас потренируемся вместе по теме «${level.titleRu}». Не волнуйся, это просто практика.`
    : tr`Привет, Эмиль! Давай немного поболтаем на тему «${level.titleRu}».`;
  turns.push({
    say: `${greetDe} Sag einfach "ja", wenn du magst.`,
    sayRu: tr`${greetRu} Просто скажи «ja», когда будешь готов.`,
    hint: "Ja, ich bin bereit.",
    expect: ["ja", "bereit", "ok", "klar", "naturlich", "natürlich", "los", "da", "davai"],
  });

  const phrases = level.speaking.phrases;

  /** The phrase that shares the most words with the question — a far better guess than the next one in the list. */
  const closestPhrase = (question) => {
    const words = new Set(normalize(question).split(" ").filter((w) => w.length > 3));
    let best = phrases[0], score = -1;
    for (const p of phrases) {
      const s = normalize(p.de).split(" ").filter((w) => words.has(w)).length;
      if (s > score) { score = s; best = p; }
    }
    return best.de;
  };

  // One turn per line the other speaker really asks. The line has to *end* in a question mark:
  // "Zum Bahnhof? Das ist nicht weit. Gehen Sie geradeaus." is directions, not something Emil can
  // answer. The hint is the reply Emil actually gives next in the dialogue, so what Mia offers
  // after a wrong answer belongs to the question she just asked.
  const questions = level.dialogue.lines
    .map((l, i) => ({ l, next: level.dialogue.lines[i + 1] }))
    .filter(({ l }) => l.speaker !== "Emil" && /\?\s*$/.test(l.de))
    .map(({ l, next }) => ({
      de: l.de,
      ru: l.ru,
      hint: next && next.speaker === "Emil" ? next.de : closestPhrase(l.de),
    }));
  const wanted = Math.min(6, Math.max(questions.length, 5));
  for (let i = 0; i < wanted; i++) {
    const q = questions[i];
    if (q) {
      turns.push({
        say: q.de,
        sayRu: q.ru,
        hint: q.hint,
        // accept any content word from this level: offline we only check that he really answered
        expect: [...level.vocab.slice(0, 20).map((v) => stripArticleLower(v.de)), "ich", "ja", "nein", "mein", "das ist"],
      });
    } else {
      const w = level.vocab[i % level.vocab.length];
      turns.push({
        say: `Bilde bitte einen Satz mit "${w.de}".`,
        sayRu: tr`Составь, пожалуйста, предложение со словом «${w.de}» (${w.ru}).`,
        hint: w.example,
        expect: [stripArticleLower(w.de), "ich", "ist", "habe"],
      });
    }
  }
  turns.push({
    say: talkMode === "exam" ? "Das war alles, Emil. Du hast das richtig gut gemacht! Bis bald!" : "Das war ein schönes Gespräch, Emil. Bis bald!",
    sayRu: talkMode === "exam" ? "Это всё, Эмиль. Ты справился по-настоящему хорошо! До скорого!" : "Это был хороший разговор, Эмиль. До скорого!",
    hint: "Tschüss, Mia!",
    expect: ["tschuss", "tschüss", "danke", "bis", "ciao", "auf wiedersehen"],
  });
  return turns.slice(0, 8);
}

const stripArticleLower = (de) => String(de).replace(/^(der|die|das)\s+/i, "").toLowerCase();

/**
 * One shape for everything Mia says: what she says, in which language, and an optional quiet
 * translation underneath.
 *
 * The AI answers in whatever language Emil just used — that is the whole point of the free chat —
 * and arrives as {say, lang, translation}. The level scripts and the offline brain still think in
 * "German line + Russian translation + Russian explanation", which is exactly right for a
 * role-play, so they are adapted here rather than rewritten.
 */
function normalizeReply(r) {
  const base = { translation: "", explain: "", correction: r.correction || null, tip: r.tip || "", done: Boolean(r.done) };
  if (typeof r.say === "string") {
    return { ...base, say: r.say, lang: r.lang === "de" ? "de" : "ru", translation: r.translation || "" };
  }
  return { ...base, say: r.de || "", lang: "de", translation: r.ru || "", explain: r.explainRu || "" };
}

export class Tutor {
  /**
   * @param {object} o
   * @param {HTMLElement} o.container
   * @param {object|null} o.level       level content object (for scenario) or null for free chat
   * @param {boolean} o.ai              is the AI backend available
   * @param {()=>void} o.onExit
   * @param {(result:{turns:number, first:boolean})=>void} [o.onScenarioDone]
   */
  constructor(o) {
    Object.assign(this, o);
    // talkMode: scenario (role-play from the level), exam (oral exam on the level),
    // topic (free chat around the finished level), free (anything at all)
    this.talkMode = this.talkMode || (this.level ? "scenario" : "free");
    this.mode = this.level ? "scenario" : "free";
    // "chat"   — just talking. She answers in the language Emil used and does not teach unless asked.
    // "german" — they are practising: she speaks German at his level and corrects real mistakes.
    // A level scenario or an oral exam is German by definition; free chat starts as a conversation.
    this.chatMode = this.talkMode === "free"
      ? (store.state.settings.chatMode === "german" ? "german" : "chat")
      : "german";
    this.history = []; // {role, content}
    this.turns = 0;
    this.scriptIndex = 0;
    this.scriptFails = 0;
    this.busy = false;
    this.listening = false;
    this.stopped = false;
    this.done = false;
    this.gen = 0; // conversation generation: bumps on restart so stale async work is ignored
    // The turn currently entitled to speak. Emil may grab the microphone while Mia is talking (that
    // is deliberate) — bumping this retires her turn so it does not resume over his answer.
    this.seq = 0;
    this.aiDropped = false; // the AI answered earlier turns and then failed — pick the script up mid-way
    // offline brain state: which topic we are on and what has already been asked
    this.brain = { topic: null, used: new Set(), lastDe: "", lastRu: "", lastHint: "", lastAnswer: "", sinceQuestion: 0 };
    this.useAi = this.ai;
    this.script = this.level
      ? (this.talkMode === "exam" || this.talkMode === "topic" ? buildLevelScript(this.level, this.talkMode) : this.level.speaking.script)
      : FREE_SCRIPT;
  }

  render() {
    const s = store.state.settings;
    this.container.innerHTML = "";
    const scenario = this.level?.speaking;
    const isExam = this.talkMode === "exam";
    const isTopic = this.talkMode === "topic";
    const subtitle = !this.level ? "Свободный разговор"
      : isExam ? tr`${this.level.emoji} Устный экзамен · ${this.level.titleRu}`
      : isTopic ? tr`${this.level.emoji} Разговор по теме · ${this.level.titleRu}`
      : `${this.level.emoji} ${scenario.title}`;
    const intro = isExam
      ? { title: "🎓 Устный экзамен", text: tr`Мия задаст 5–7 вопросов по теме «${this.level.titleRu}». Отвечай по-немецки как можешь — она поправит и объяснит по-русски. Это тренировка, а не оценка.` }
      : isTopic
        ? { title: "💬 Разговор по теме", text: tr`Свободная беседа вокруг темы «${this.level.titleRu}». Мия расспросит тебя, расскажет, как это устроено в Германии, и объяснит всё непонятное по-русски.` }
        : scenario ? { title: "🎬 Ситуация", text: scenario.scenario } : null;
    // Layout: a compact header, a small orb, then the CHAT as the main area, then the controls.
    // Anything optional (scenario text, phrases, the key offer) lives in a side column on wide
    // screens and collapses under the chat on narrow ones, so the conversation is never squeezed.
    this.root = el("div", { class: `tutor ${this.useAi ? "" : "no-ai"}` },
      el("header", { class: "tutor-head" },
        el("button", { class: "icon-btn", title: "Назад", type: "button", onClick: () => this.exit() }, "←"),
        el("div", { class: "tutor-orb-mini" },
          (this.orb = el("div", { class: "orb idle" }, el("div", { class: "orb-glow" }), el("div", { class: "orb-core" }), el("div", { class: "orb-ring r1" }), el("div", { class: "orb-ring r2" }))),
        ),
        el("div", { class: "tutor-title" },
          el("div", { class: "tutor-name" }, "Мия", (this.badge = el("span", { class: `badge ${this.useAi ? "ai" : "offline"}` }, this.useAi ? "умный режим" : "обычный режим"))),
          el("div", { class: "tutor-sub" }, subtitle),
          (this.status = el("div", { class: "orb-status" }, "…")),
        ),
        el("div", { class: "tutor-toggles" },
          // Free chat only: a role-play IS German, so offering to leave German there makes no sense.
          this.talkMode === "free" ? (this.modeBtn = el("button", {
            class: `mode-switch ${this.chatMode === "german" ? "de" : ""}`, type: "button",
            title: "Просто разговор или практика немецкого. Можно и словами: «давай на немецком».",
            onClick: () => this.setChatMode(this.chatMode === "german" ? "chat" : "german"),
          }, this.chatMode === "german" ? "🇩🇪 Немецкий" : "💬 Разговор")) : null,
          toggle("Авто-микрофон", s.autoListen, (v) => store.update((st) => (st.settings.autoListen = v))),
          toggle("Перевод", s.showRu, (v) => { store.update((st) => (st.settings.showRu = v)); this.root.classList.toggle("hide-ru", !v); }),
        ),
      ),

      el("div", { class: "tutor-body" },
        el("div", { class: "tutor-main" },
          (this.chat = el("div", { class: "tutor-chat" })),
          el("div", { class: "tutor-controls" },
            el("div", { class: "mic-col" },
              (this.mic = el("button", { class: "mic-btn large", type: "button", title: "Говорить", onClick: () => this.toggleListen() }, el("span", { class: "mic-icon" }, "🎤"))),
              this.micLangSwitch(),
            ),
            el("form", { class: "tutor-form", onSubmit: (e) => { e.preventDefault(); const v = this.input.value.trim(); if (v && this.handleUser(v)) this.input.value = ""; } },
              (this.input = el("input", {
                class: "text-input", type: "text", autocomplete: "off",
                lang: this.chatMode === "german" ? "de" : "ru",
                placeholder: this.chatMode === "german" ? "Пиши по-немецки — Мия поправит…" : "Говори или пиши на любом языке…",
              })),
              (this.sendBtn = el("button", { class: "btn primary", type: "submit", title: "Отправить" }, "➤")),
            ),
            el("div", { class: "tutor-actions" },
              el("button", { class: "btn ghost small", type: "button", onClick: () => this.replayLast() }, "🔊 Повторить"),
              el("button", { class: "btn ghost small", type: "button", onClick: () => this.showHint() }, "💡 Подсказка"),
              el("button", { class: "btn ghost small", type: "button", onClick: () => this.restart() }, "↺ Заново"),
            ),
          ),
        ),

        el("aside", { class: "tutor-side" },
          intro ? el("div", { class: `scenario-box ${isExam ? "exam-box" : ""}` }, el("div", { class: "scenario-title" }, intro.title), el("div", {}, intro.text)) : null,
          scenario && !isExam ? el("div", { class: "phrases" },
            el("div", { class: "phrases-title" }, "Полезные фразы"),
            el("div", { class: "phrase-list" }, scenario.phrases.map((p) => el("button", { class: "phrase", type: "button", title: "Прослушать", onClick: () => speech.speak(p.de, { force: true }) }, el("span", { lang: "de" }, p.de), el("span", { class: "phrase-ru" }, p.ru)))),
          ) : null,
          this.useAi ? null : (this.keySlot = el("div", { class: "tutor-key-slot" })),
        ),
      ),
    );
    this.root.classList.toggle("hide-ru", !s.showRu);
    this.container.append(this.root);
    if (this.keySlot) import("./app.js").then((m) => {
      const card = m.aiKeyCard({ compact: true });
      if (card) this.keySlot?.append(card);
    }).catch(() => {});
    if (!speech.sttSupported) {
      this.mic.disabled = true;
      this.mic.title = tr(STT_ERRORS.unsupported);
      toast(STT_ERRORS.unsupported, { icon: "🎤", kind: "warn", ms: 6000 });
    }
    this.begin();
  }

  exit() {
    this.stop();
    this.onExit?.();
  }

  /** Stop all async activity (used by the router on navigation and by exit) */
  stop() {
    this.stopped = true;
    this.gen++;
    speech.stop();
    speech.abortListening();
  }

  setState(state, text) {
    if (this.stopped) return;
    this.orb.className = `orb ${state}`;
    this.status.textContent = tr(text);
    this.mic.classList.toggle("listening", state === "listening");
    const waiting = state === "thinking" || state === "speaking";
    this.sendBtn.disabled = waiting;
    this.sendBtn.textContent = tr(waiting ? "…" : "➤");
  }

  async begin({ speakFirst = this.talkMode !== "free" } = {}) {
    const gen = ++this.gen;
    // The AI greeting can take several seconds. Emil often presses 🎤 in that time, and without a
    // turn token of its own the greeting would arrive afterwards and talk over him.
    const seq = ++this.seq;
    this.stopped = false;
    this.chat.innerHTML = "";
    this.history = [];
    this.scriptIndex = 0;
    this.scriptFails = 0;
    this.turns = 0;
    this.done = false;
    this.busy = false;
    // «↺ Заново» has to start a genuinely fresh conversation: without this Mia carried on with the
    // previous chat's topic and «🔊 Повторить» still replayed the line from before the restart.
    // A new Set rather than .clear(), because respond() holds the old one by reference.
    this.brain = { topic: null, used: new Set(), lastDe: "", lastRu: "", lastHint: "", lastAnswer: "", sinceQuestion: 0 };
    this.lastReply = null;
    this.aiDropped = false;
    // …and forget that the hand-over was already announced, or a second conversation that loses
    // the AI would silently restart the script from the greeting instead of picking it up
    this.aiResumed = false;
    // Free conversation is a voice companion, not a lesson: Emil opens it when HE wants to say
    // something, so Mia waits quietly instead of launching into a monologue. The role-plays and
    // the oral exam still open the conversation themselves — there she is playing a part.
    if (!speakFirst) {
      this.chat.append(el("div", { class: "tutor-idle" },
        el("div", { class: "tutor-idle-icon" }, "🎙️"),
        el("div", { class: "tutor-idle-title" }, "Мия слушает"),
        el("div", { class: "tutor-idle-text" }, "Нажми микрофон и говори. Кнопка DE / RU под микрофоном переключает язык, который он слушает. Или просто напиши внизу — на любом языке."),
      ));
      this.setState("idle", "Нажми 🎤 или напиши — Мия ответит");
      return;
    }
    if (this.useAi) {
      const reply = await this.callAi(null);
      if (gen !== this.gen) return;
      if (reply) await this.miaSays(reply, gen, seq);
      else await this.offlineTurn(null, gen, seq);
    } else await this.offlineTurn(null, gen, seq);
  }

  restart() {
    speech.stop();
    speech.abortListening();
    this.listening = false;
    this.begin();
  }

  async callAi(userText) {
    if (userText !== null) this.history.push({ role: "user", content: userText });
    const body = {
      messages: this.history.length ? this.history : [{ role: "user", content: "(Эмиль зашёл. Поздоровайся и начни разговор.)" }],
      scenario: this.level ? {
        mode: this.talkMode === "exam" ? "oral-exam" : this.talkMode === "topic" ? "topic-chat" : "scenario",
        title: this.level.speaking.title,
        titleRu: this.level.titleRu,
        brief: this.talkMode === "scenario"
          ? this.level.speaking.tutorBrief
          : `${this.level.intro} Grammar of this level: ${this.level.grammar.map((g) => g.title).join("; ")}. Goals: ${this.level.goals.join("; ")}.`,
        levelTitle: this.level.title,
        vocab: this.level.vocab.map((v) => v.de),
      } : null,
      notes: store.state.miaNotes || [],
      // Who she is talking to today: his name, the CEFR level her German should match, and whether
      // this conversation is currently running in German or is just a conversation.
      // uiLang — на каком языке человек читает сайт. Мия отвечает на языке реплики, но объяснения,
      // перевод и разбор ошибок должны приходить на его языке, а не на угаданном.
      profile: { name: store.state.name || "", cefr: store.cefr(), mode: this.chatMode, uiLang: uiLang() },
    };
    if (!this.history.length) this.history.push(body.messages[0]);
    this.setState("thinking", "Мия думает…");
    try {
      // never leave him staring at "Мия думает…" — the server gives up at 30 s, this a little after
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort("timeout"), 35000);
      let r, data;
      try {
        // Живая Мия стоит денег за каждую реплику, поэтому функция спрашивает, кто пришёл.
        const token = await backend.token().catch(() => null);
        r = await fetch("/api/tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        data = await r.json();
      } finally { clearTimeout(timer); }
      if (!r.ok) { const err = new Error(data.error || "API error"); err.status = r.status; throw err; }
      // keep what she actually said, in the language she said it, so she stays consistent
      this.history.push({ role: "assistant", content: data.say || data.de || "" });
      // she may have asked to switch into (or out of) German — remember it for the next turn
      if (data.mode === "german" || data.mode === "chat") this.setChatMode(data.mode, true);
      if (data.memory) {
        store.update((s) => {
          if (!Array.isArray(s.miaNotes)) s.miaNotes = [];
          const note = String(data.memory).slice(0, 160);
          if (!s.miaNotes.includes(note)) s.miaNotes = [...s.miaNotes, note].slice(-40);
        });
      }
      return data;
    } catch (e) {
      console.error(e);
      // A slow turn is not a broken key. Switching smart Mia off permanently costs Emil the rest of
      // the conversation, and useAi is only re-armed when the page is re-mounted — so a timeout
      // falls back for THIS turn only and the next one tries her again.
      const transient = e?.name === "AbortError" || e?.status === 504 || e?.status === 429 || e?.status === 502;
      if (!this.stopped) {
        toast(transient
          ? "Мия задумалась дольше обычного — отвечу сама, а на следующей реплике попробую снова."
          : e?.status === 401
            ? "Живая Мия отвечает тем, кто вошёл в аккаунт. Пока поговорим в обычном режиме."
            : "Умный режим сейчас недоступен — Мия продолжит сама, без него.",
        { icon: "⚠️", kind: "warn", ms: 6000, title: !transient && e.message && /[а-я]/i.test(e.message) ? e.message : null });
      }
      if (!transient) {
        this.useAi = false;
        if (this.badge) { this.badge.className = "badge offline"; this.badge.textContent = tr("обычный режим"); }
      }
      // mid-conversation drop-out: the script has never advanced, so offlineTurn must not restart
      // it. Only the first drop-out announces the hand-over — on a flaky connection every later
      // failure would otherwise restate «Gut. Machen wir weiter…» with the very same question.
      if (this.turns > 0 && this.talkMode !== "free" && !this.aiResumed) this.aiDropped = true;
      return null;
    }
  }

  /**
   * Say something. Accepts either shape and normalises it — see normalizeReply().
   * reply = {say, lang, translation?, ...} | {de, ru, explainRu?, ...}
   */
  async miaSays(raw, gen = this.gen, seq = this.seq) {
    if (this.stopped || gen !== this.gen || seq !== this.seq) return;
    const reply = normalizeReply(raw);
    this.lastReply = reply;
    const voice = reply.lang === "de" ? {} : { lang: "ru-RU" };
    const other = reply.lang === "de" ? { lang: "ru-RU" } : {};
    const bubble = el("div", { class: `bubble mia ${reply.lang === "ru" ? "mia-ru" : ""}` },
      el("div", { class: "bubble-name" }, "Мия"),
      el("div", { class: "bubble-de", lang: reply.lang }, reply.say,
        el("button", { class: "icon-btn tiny", type: "button", title: "Прослушать", onClick: () => speech.speak(reply.say, { ...voice, force: true }) }, "🔊")),
      // the other language, small and quiet — there to be read, not recited at him
      reply.translation ? el("div", { class: "bubble-ru", lang: reply.lang === "de" ? "ru" : "de" }, reply.translation,
        el("button", { class: "icon-btn tiny", type: "button", title: "Прослушать", onClick: () => speech.speak(reply.translation, { ...other, force: true }) }, "🔊")) : null,
      reply.explain ? el("div", { class: "explain-ru" }, el("span", { class: "explain-icon" }, "🇷🇺"), el("span", {}, reply.explain), el("button", { class: "icon-btn tiny", type: "button", title: "Прослушать по-русски", onClick: () => speech.speak(reply.explain, { lang: "ru-RU", force: true }) }, "🔊")) : null,
      reply.correction && reply.correction.corrected ? el("div", { class: "correction" },
        el("div", { class: "corr-row" }, el("span", { class: "corr-bad" }, reply.correction.original), el("span", {}, " → "), el("span", { class: "corr-good", lang: "de" }, reply.correction.corrected)),
        reply.correction.explanationRu ? el("div", { class: "corr-why" }, reply.correction.explanationRu) : null) : null,
      reply.tip ? el("div", { class: "tip" }, "💡 ", reply.tip) : null,
    );
    this.chat.append(bubble);
    nextTick(() => bubble.classList.add("show"));
    this.scrollChat();
    this.setState("speaking", "Мия говорит…");
    if (store.state.settings.tts) {
      // Her own line goes out FIRST so nothing queues ahead of it; a Russian follow-up explanation
      // is synthesised while it plays, so the two run together without a silent gap.
      const main = speech.speak(reply.say, { ...voice, gender: "f", rate: store.state.settings.rate });
      if (reply.explain) speech.prefetch(reply.explain, { lang: "ru-RU" });
      await main;
      // If Emil reached for the microphone while she was still talking, the turn is his. Speaking
      // the explanation now would abort the recogniser he just started (speak() always stops
      // listening first) and she would be talking over his answer.
      if (seq !== this.seq) return; // he took the turn while she was speaking
      if (!this.listening && !this.stopped && gen === this.gen && reply.explain) {
        this.setState("speaking", "Мия объясняет по-русски…");
        await speech.speak(reply.explain, { lang: "ru-RU" });
        if (seq !== this.seq) return;
      }
    }
    if (this.stopped || gen !== this.gen || seq !== this.seq) return;
    if (reply.done) return this.finishScenario();
    if (this.listening) return; // he is already answering — leave him to it
    this.setState("idle", "Твоя очередь — нажми на микрофон или напиши");
    if (store.state.settings.autoListen && speech.sttSupported) {
      await sleep(250);
      if (!this.stopped && gen === this.gen && !this.listening && !this.busy && !this.done) this.toggleListen();
    }
  }

  /**
   * Which language the microphone listens for. The browser runs one recognition session at a time
   * and cannot detect the language itself, so this is Emil's explicit choice, remembered between
   * sessions. Pronunciation drills elsewhere always listen in German; here he decides.
   */
  micLang() {
    return store.state.settings.micLang === "ru-RU" ? "ru-RU" : "de-DE";
  }

  /** The DE/RU switch under the microphone. */
  micLangSwitch() {
    const btn = el("button", { class: "mic-lang", type: "button" });
    const paint = () => {
      const ru = this.micLang() === "ru-RU";
      btn.textContent = tr(ru ? "RU" : "DE");
      btn.classList.toggle("ru", ru);
      btn.title = tr(ru ? "Микрофон слушает русский. Нажми, чтобы говорить по-немецки." : "Микрофон слушает немецкий. Нажми, чтобы говорить по-русски.");
      btn.setAttribute("aria-label", btn.title);
    };
    btn.addEventListener("click", () => {
      const next = this.micLang() === "ru-RU" ? "de-DE" : "ru-RU";
      store.update((st) => { st.settings.micLang = next; });
      paint();
      if (this.listening) {
        // Abort, never stop: stop() hands back whatever was captured so far, so the half-said
        // German sentence would be submitted to Mia as a finished turn instead of being dropped.
        this.relisten = true;
        speech.abortListening();
        this.setState("listening", next === "ru-RU" ? "Слушаю… говори по-русски" : "Слушаю… говори по-немецки");
      } else {
        this.setState("idle", next === "ru-RU" ? "Микрофон слушает по-русски" : "Микрофон слушает по-немецки");
      }
    });
    paint();
    this.micLangPaint = paint; // so switching the whole conversation to German repaints it too
    return btn;
  }

  scrollChat() {
    this.chat.scrollTo({ top: this.chat.scrollHeight, behavior: "smooth" });
  }

  async toggleListen() {
    // pressing the microphone again means "I am done / never mind" — it must not reopen below
    if (this.listening) { this.cancelListen = true; speech.stopListening(); return; }
    // Say why instead of ignoring the press: a button that does nothing looks broken, and he
    // presses it again and again while Mia is still thinking.
    if (this.done) { this.setState("idle", "Разговор завершён — нажми «Заново», чтобы поговорить ещё раз."); return; }
    if (this.busy) { this.setState("thinking", "Секунду — Мия ещё отвечает. Потом твоя очередь."); return; }
    if (this.stopped) return;
    const gen = this.gen;
    // Taking the turn retires Mia's: without this her queued Russian explanation resumes as soon
    // as the German line ends and talks straight over the answer he is giving.
    if (speech.speaking) { this.seq++; speech.stop(); }
    this.cancelListen = false;
    this.relisten = false;
    this.listening = true;
    sfx.mic();
    this.setState("listening", this.micLang().startsWith("ru") ? "Слушаю… говори по-русски" : "Слушаю… говори по-немецки");
    const live = el("div", { class: "bubble ali live" }, el("div", { class: "bubble-name" }, "Эмиль"), el("div", { class: "bubble-de" }, "…"));
    this.chat.append(live);
    this.scrollChat();
    let text = "";
    // Chrome closes the recogniser after a few seconds of silence. A beginner works out how to say
    // the sentence first, so the first tries are often silent — reopen the microphone instead of
    // making him press the button again for every single question.
    const TRIES = 3;
    for (let attempt = 0; attempt < TRIES && !text; attempt++) {
      if (attempt > 0 && !this.relisten) {
        if (this.stopped || gen !== this.gen || this.cancelListen || !this.listening) break;
        this.setState("listening", "Слушаю… не спеши, скажи когда будешь готов");
      }
      try {
        // German AND Russian at once: Emil is a Russian speaker, and a German-only recogniser
        // simply does not hear him when he asks something in his own language.
        text = await speech.listen({ lang: this.micLang(), onInterim: (t) => { live.querySelector(".bubble-de").textContent = tr(t || "…"); } });
      } catch (e) {
        if (e?.code === "aborted") {
          // the DE/RU switch, not a cancel: reopen in the chosen language without spending a try
          if (this.relisten && !this.cancelListen && !this.stopped && gen === this.gen && this.listening) {
            this.relisten = false;
            live.querySelector(".bubble-de").textContent = tr("…"); // drop the other language's interim text
            await sleep(200); // Chrome throws if start() follows abort() too closely
            if (this.stopped || gen !== this.gen || this.cancelListen || !this.listening) break;
            attempt--; // switching language is not one of his three tries
            continue;
          }
          // we aborted it ourselves (Mia started speaking, the view changed) — not worth reporting
          break;
        }
        // He pressed the button again to stop. Chrome reports that as "no-speech", which used to
        // surface as «Я тебя не слышу» — telling him the microphone is broken when he simply
        // changed his mind.
        if (this.cancelListen) {
          live.remove();
          this.listening = false;
          if (!this.stopped && gen === this.gen) this.setState("idle", "Хорошо. Нажми 🎤, когда будешь готов, или напиши.");
          return;
        }
        live.remove();
        this.listening = false;
        if (this.stopped || gen !== this.gen) return;
        this.setState("idle", STT_ERRORS[e.code] || "Ошибка микрофона");
        if (e.code === "unsupported") this.mic.disabled = true;
        return;
      }
      // he pressed the mic again to stop, or the conversation moved on: do not reopen
      if (this.cancelListen || !this.listening || this.stopped || gen !== this.gen) break;
    }
    this.listening = false;
    live.remove();
    if (this.stopped || gen !== this.gen) return;
    if (!text) {
      this.setState("idle", "Я ничего не услышала. Нажми 🎤 ещё раз или напиши — как тебе удобнее.");
      return;
    }
    this.handleUser(text);
  }

  /** returns true if the message was accepted */
  handleUser(text) {
    if (this.stopped) return false;
    if (this.done) { this.setState("idle", "Разговор завершён — нажми «Заново», чтобы поговорить ещё раз."); return false; }
    if (this.busy) { this.setState(this.orb.className.includes("thinking") ? "thinking" : "speaking", "Подожди, Мия ещё говорит…"); return false; }
    this.busy = true;
    const gen = this.gen;
    this.chat.querySelector(".tutor-idle")?.remove(); // the "Мия слушает" placeholder has served its purpose
    // he may well have said this in Russian — marking it lang="de" would have the browser and the
    // replay button pronounce Russian words with a German mouth
    const said = /[а-яё]/i.test(text) ? "ru" : "de";
    const bubble = el("div", { class: "bubble ali" }, el("div", { class: "bubble-name" }, "Эмиль"), el("div", { class: "bubble-de", lang: said }, text));
    this.chat.append(bubble);
    nextTick(() => bubble.classList.add("show"));
    this.scrollChat();
    const verdict = moderate(text);
    if (verdict.blocked) {
      this.turns++;
      store.update((s) => { s.stats.tutorTurns += 1; });
      const seqBlocked = ++this.seq;
      this.busy = false;
      this.miaSays({ say: verdict.reply, lang: "ru" }, gen, seqBlocked);
      return true;
    }
    this.turns++;
    // XP for real attempts only (at least 2 words), max 12 rewarded turns per conversation
    const gained = this.turns <= 12 && text.trim().split(/\s+/).length >= 2 ? 5 : 0;
    if (gained) {
      xpFloat(this.mic, gained);
      store.grantXp(gained);
    }
    store.update((s) => { s.stats.tutorTurns += 1; });
    const seq = ++this.seq; // this turn holds the floor until Emil takes it back
    (async () => {
      try {
        let reply = null;
        if (this.useAi) reply = await this.callAi(text);
        if (gen !== this.gen || this.stopped || seq !== this.seq) return;
        this.busy = false; // Mia's answer is ready: allow the mic again while she speaks
        if (reply) await this.miaSays(reply, gen, seq);
        else await this.offlineTurn(text, gen, seq);
      } finally {
        if (gen === this.gen) this.busy = false;
      }
    })();
    return true;
  }


  /** A real (if local) conversation: Mia understands what Emil said and answers from her own knowledge. */
  async brainTurn(userText, gen = this.gen, seq = this.seq) {
    const b = this.brain;
    if (userText === null) {
      const o = opening(store.state.name);
      b.topic = o.topic;
      b.used.add(o.de);
      b.lastDe = o.de; b.lastRu = o.ru; b.lastHint = o.tip || "";
      b.sinceQuestion = 0; // the opener is itself a question
      return this.miaSays({ de: o.de, ru: o.ru }, gen, seq);
    }
    b.lastAnswer = userText;
    const u = understand(userText);
    const reply = respond(u, { ...b, turns: this.turns, lastAnswer: userText });
    // count the quiet turns, so she can hold back a question instead of interrogating him
    b.sinceQuestion = reply.asked ? 0 : (b.sinceQuestion ?? 0) + 1;
    if (reply.topic) b.topic = reply.topic;
    if (reply.de) { b.lastDe = reply.de; b.lastRu = reply.ru || ""; }
    // A new question replaces the hint; without this a leftover «Попробуй сказать …» from an
    // earlier word lookup was still offered for a completely unrelated later question.
    if (reply.topic) b.lastHint = reply.tip || "";
    else if (reply.tip && !reply.tip.startsWith("Это из уровня")) b.lastHint = reply.tip;
    // Offline she still thinks in German, but answering a Russian sentence with a German one is
    // the thing Emil asked me to stop doing. When he wrote in Russian and she has something real to
    // say in Russian, that is the answer; her German line becomes the 💡 suggestion beside it.
    const leadRu = this.chatMode !== "german" && u.lang === "ru" && reply.explainRu;
    if (leadRu) {
      return this.miaSays({
        say: reply.explainRu, lang: "ru", translation: "",
        tip: reply.de ? tr`По-немецки это звучит так: ${reply.de}` : reply.tip || "",
        correction: reply.correction, done: reply.done,
      }, gen, seq);
    }
    return this.miaSays(reply, gen, seq);
  }

  /** Offline conversation. Free chat uses the local brain; level modes follow their script. */
  async offlineTurn(userText, gen = this.gen, seq = this.seq) {
    if (this.talkMode === "free") return this.brainTurn(userText, gen, seq);

    // The AI carried the first turns and then dropped out. scriptIndex never moved, so the script
    // would replay Mia's opening greeting and restart the role-play from scratch. Pick it up where
    // the conversation actually is, and bridge with a neutral line — Emil's last answer was aimed at
    // the AI's question, so it must not be graded against a script turn he never heard.
    if (this.aiDropped) {
      this.aiDropped = false;
      this.aiResumed = true;
      this.scriptFails = 0;
      const lastQuestion = Math.max(1, this.script.length - 2); // never the greeting, never the goodbye
      this.scriptIndex = Math.min(Math.max(this.scriptIndex, this.turns, 1), lastQuestion);
      const t = this.script[this.scriptIndex];
      if (!t) return this.finishScenario();
      return this.miaSays({
        de: `Gut. Machen wir weiter: ${t.say}`,
        ru: tr`Хорошо. Продолжаем: ${t.sayRu}`,
        explainRu: tr`Можно ответить так: «${t.hint}»`,
      }, gen, seq);
    }
    const turn = this.script[this.scriptIndex];
    if (userText === null) {
      if (!turn) return this.finishScenario();
      return this.miaSays({ de: turn.say, ru: turn.sayRu }, gen, seq);
    }
    // The script can run out while the conversation is still open: if Emil speaks over Mia's last
    // line, her turn is retired before `done` reaches finishScenario(), and the next thing he says
    // arrives here with nothing left to match. Without this the reply below reads turn.say off
    // undefined, the conversation dies silently and the ✓ and the bonus are never granted.
    if (!turn) return this.miaSays({ de: "Bis bald, Emil!", ru: "До скорого, Эмиль!", done: true }, gen, seq);

    // Emil speaks Russian, and mid-role-play he asks real things: "что значит Termin?", "я не
    // понял", "повтори". Those are not attempts at the answer, and matching them against German
    // keywords only makes Mia repeat the question — so let her brain handle them, then ask again.
    const aside = understand(userText, this.brain);
    const ASIDE_INTENTS = ["word", "grammar", "site", "aboutHer", "aboutGerman", "aboutGermany",
      "confused", "help", "repeat", "openQuestion", "feelingBad"];
    if (ASIDE_INTENTS.includes(aside.intent)) {
      this.brain.lastHint = turn.hint;
      this.brain.lastDe = turn.say;
      this.brain.lastRu = turn.sayRu;
      // The script question follows immediately, so she must not add one of her own — and without
      // `turns` the reply shape (receive vs ask) is decided from a turn counter stuck at zero.
      const answer = respond(aside, { ...this.brain, turns: this.turns, noAsk: true });
      // "confused" and "repeat" already reply with the question itself (via lastDe), so repeating
      // it after them would have Mia ask the same thing twice in one breath.
      const echoes = aside.intent === "confused" || aside.intent === "repeat";
      return this.miaSays({
        de: echoes ? answer.de : `${answer.de} ${turn.say}`.trim(),
        ru: echoes ? answer.ru : `${answer.ru} ${turn.sayRu}`.trim(),
        explainRu: answer.explainRu || "",
        tip: answer.tip || "",
      }, gen, seq);
    }

    const n = normalize(userText);
    const meaningful = n.length >= 3;
    const passed = turn.expect.some((k) => n.includes(normalize(k)));
    if (passed || (meaningful && this.scriptFails >= 1)) {
      const wasLast = this.scriptIndex >= this.script.length - 1;
      this.scriptIndex++;
      this.scriptFails = 0;
      const next = this.script[this.scriptIndex];
      if (!next || wasLast) return this.miaSays({ de: "Bis bald, Emil!", ru: "До скорого, Эмиль!", done: true }, gen, seq);
      const i = Math.floor(Math.random() * PRAISE.length);
      return this.miaSays({ de: `${passed ? PRAISE[i] : "Okay, weiter!"} ${next.say}`, ru: `${passed ? PRAISE_RU[i] : "Хорошо, идём дальше!"} ${next.sayRu}`, tip: !passed ? tr`Можно было сказать так: ${turn.hint}` : "" }, gen, seq);
    }
    if (meaningful) this.scriptFails++;
    return this.miaSays({
      de: `Kein Problem. Noch einmal: ${turn.say}`,
      ru: tr`Ничего страшного. Ещё разок: ${turn.sayRu}`,
      explainRu: tr`Не переживай, Эмиль — с первого раза редко получается. Можешь ответить так: «${turn.hint}»`,
    }, gen, seq);
  }

  /**
   * Switch between "we are just talking" and "we are practising German now".
   *
   * Emil can press the button, but the natural way to ask is to say it — «давай на немецком» — so
   * Mia flips it herself too, and this is where both arrive. Only free chat remembers the choice:
   * a role-play is always German.
   */
  setChatMode(mode, fromMia = false) {
    const next = mode === "german" ? "german" : "chat";
    if (next === this.chatMode) return;
    this.chatMode = next;
    if (this.talkMode === "free") store.update((s) => { s.settings.chatMode = next; });
    if (this.modeBtn) {
      this.modeBtn.textContent = tr(next === "german" ? "🇩🇪 Немецкий" : "💬 Разговор");
      this.modeBtn.classList.toggle("de", next === "german");
    }
    if (this.input) {
      this.input.lang = next === "german" ? "de" : "ru";
      this.input.placeholder = tr(next === "german")
        ? "Пиши по-немецки — Мия поправит…"
        : "Говори или пиши на любом языке…";
    }
    // German practice listens for German; a normal conversation listens for his own language
    if (this.talkMode === "free") {
      store.update((s) => { s.settings.micLang = next === "german" ? "de-DE" : "ru-RU"; });
      this.micLangPaint?.();
    }
    if (!fromMia) toast(next === "german" ? "Хорошо, дальше по-немецки." : "Хорошо, говорим как обычно.", { icon: next === "german" ? "🇩🇪" : "💬" });
  }

  replayLast() {
    // force: he pressed a button that says "say it again" — that is a request, not the ambient
    // narration the "звук выключен" switch turns off. Same rate as she used, so it comes straight
    // out of the cache instead of being synthesised a second time.
    const r = this.lastReply;
    if (r) speech.speak(r.say, { ...(r.lang === "ru" ? { lang: "ru-RU" } : {}), rate: store.state.settings.rate, force: true });
  }

  showHint() {
    let hint;
    // in free chat there is no script — the brain keeps the last suggestion instead
    if (!this.useAi && this.talkMode === "free") hint = this.brain.lastHint;
    else if (!this.useAi) hint = this.script[this.scriptIndex]?.hint;
    else hint = this.lastReply?.tip || this.level?.speaking?.phrases?.[Math.floor(Math.random() * this.level.speaking.phrases.length)]?.de;
    if (!hint) hint = "Отвечай коротко и просто. Например: Ja. / Nein. / Ich weiß nicht.";
    const b = el("div", { class: "bubble hint-bubble" }, "💡 ", hint);
    this.chat.append(b);
    nextTick(() => b.classList.add("show"));
    this.scrollChat();
  }

  finishScenario() {
    if (this.done || this.stopped) return;
    this.done = true;
    this.setState("idle", "Разговор завершён 🎉");
    // the completion bonus is paid once per mode (free chat: once per day, and only for a real conversation)
    const lvl = this.level ? store.level(this.level.id) : null;
    const flag = this.talkMode === "exam" ? "oralDone" : this.talkMode === "topic" ? "chatDone" : "speakingDone";
    const dayKey = todayKey(); // local day, the same boundary the streak and the daily goal use
    // A one-word conversation must not tick the stage off. The same rule decides the ✓, the
    // bonus here and the reward in app.js, so the three can no longer disagree.
    const longEnough = this.turns >= (this.level ? 4 : 6);
    const first = longEnough && (this.level ? !lvl[flag] : store.state.freeChatDay !== dayKey);
    // The level screen pays for the oral exam and the topic chat itself (30 XP + 25 🪙, exactly
    // what its card promises). A bonus here as well handed Emil 70 XP for a stage advertised as 30.
    const bonus = first ? (!this.level ? 20 : this.talkMode === "scenario" ? 40 : 0) : 0;
    const paidOutside = first && !bonus; // exam / topic chat: the reward comes from the level screen
    // Say WHY there is no bonus. "уже получен раньше" was shown even the very first time, when the
    // real reason was simply that the conversation had been too short to count.
    const noBonusWhy = !longEnough
      ? tr` · поговори подольше (от ${this.level ? 4 : 6} реплик) — тогда зачтётся`
      : this.level
        ? " · бонус за это уже получен раньше"
        : " · бонус за сегодня уже получен";
    confetti();
    sfx.levelUp();
    store.update((s) => {
      // only a real conversation ticks the stage off — a one-word one can be retried for the reward
      if (this.level && longEnough) lvl[flag] = true;
      else if (first) s.freeChatDay = dayKey;
    });
    if (bonus) store.grantXp(bonus);
    const card = el("div", { class: "bubble done-card" },
      el("div", { class: "done-title" }, "🎉 Отличный разговор!"),
      el("div", {}, tr`Реплик: ${this.turns}${bonus ? ` · бонус +${bonus} XP` : paidOutside ? " · зачтено ✓" : noBonusWhy}`),
      el("div", { class: "done-actions" },
        el("button", { class: "btn ghost small", type: "button", onClick: () => this.restart() }, "↺ Ещё раз"),
        el("button", { class: "btn primary small", type: "button", onClick: () => this.exit() }, "Готово"),
      ),
    );
    this.chat.append(card);
    nextTick(() => card.classList.add("show"));
    this.scrollChat();
    this.onScenarioDone?.({ turns: this.turns, first });
  }
}

function toggle(label, value, onChange) {
  const input = el("input", { type: "checkbox" });
  input.checked = value;
  input.addEventListener("change", () => onChange(input.checked));
  return el("label", { class: "toggle" }, input, el("span", { class: "toggle-track" }, el("span", { class: "toggle-thumb" })), el("span", { class: "toggle-label" }, label));
}
