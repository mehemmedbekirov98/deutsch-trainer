// Text-to-speech and speech recognition.
// TTS: Microsoft neural voices. Almost every line is already in the public bucket (put there by
// tools/pregen-audio.mjs), so the usual path is a CDN file; anything new goes through /api/tts, and
// the browser's own speechSynthesis is the last resort. STT: Web Speech API (Chrome/Edge).
import { lang as uiLang } from "./i18n.js";
import { store } from "./store.js";
import { backend } from "./backend.js";

// Only female German voices are ever used, in the browser fallback as well.
const FEMALE_HINTS = ["katja", "hedda", "anna", "petra", "vicki", "marlene", "amala", "google deutsch",
  "seraphina", "elke", "ingrid", "leni", "gisela", "kerstin", "louisa", "maja", "tanja", "birgit",
  "female", "weiblich", "frau"];
// Names of male system voices. "\bmale\b" deliberately does not match "female".
// Edge ships Christoph and Kasper among its German voices; without them here, a machine with no
// Katja would have handed Mia a man's voice.
const MALE_NAMES = /\b(conrad|christoph|kasper|stefan|markus|hans|klaus|killian|florian|yannick|michael|bernd|ralf|jan|thomas|daniel|pavel|dmitri|dmitry|artemi|maxim|yuri|male|мужской)\b/i;

// Mia always speaks with a female voice. Seraphina is multilingual, so the same voice
// carries both her German and her Russian explanations.
export const MIA_VOICE = "de-DE-SeraphinaMultilingualNeural";
export const NEURAL_CHOICES = [
  { id: "de-DE-SeraphinaMultilingualNeural", label: "Seraphina · мягкий и живой (по умолчанию)" },
  { id: "de-DE-AmalaNeural", label: "Amala · мягкий, молодой" },
  { id: "de-DE-KatjaNeural", label: "Katja · спокойный, чёткий" },
  { id: "de-AT-IngridNeural", label: "Ingrid · австрийский акцент" },
  { id: "de-CH-LeniNeural", label: "Leni · швейцарский акцент" },
];
/**
 * Mia's other language — the learner's own.
 *
 * Seraphina is a multilingual HD voice: told xml:lang="ru-RU" she reads Russian with her own
 * model, so the Russian is literally the same person heard in German, not a second, flatter voice.
 * Azerbaijani she does not speak, so that falls back to a dedicated Azerbaijani voice; it is a
 * different timbre, but a real Azerbaijani one, which matters more than matching.
 */
const MULTILINGUAL = new Set(["de-DE-SeraphinaMultilingualNeural"]);
export const FALLBACK_VOICE_RU = "ru-RU-SvetlanaNeural";
export const FALLBACK_VOICE_AZ = "az-AZ-BanuNeural";

/**
 * Локаль того языка, на котором человек читает сайт. Всё, что не немецкое, говорится на ней:
 * переводы, объяснения Мии, микрофон в «родном» режиме.
 */
export const NATIVE_LOCALE = uiLang() === "az" ? "az-AZ" : "ru-RU";
export const isNativeLocale = (l) => String(l || "").startsWith(NATIVE_LOCALE.slice(0, 2));

/**
 * Как звучит Мия. Одинаково у всех, и менять это некому.
 *
 * Раньше здесь лежали четыре тембра на выбор, голос из списка и ползунок скорости. Выбор убран
 * намеренно: голос — это часть того, как курс звучит, а не настройка. Заодно он перестал быть
 * ловушкой. Скорость и тембр входят в ключ кэша озвучки, так что человек, сдвинувший ползунок,
 * молча терял ВСЮ предгенерацию: каждое слово шло через синтез с ожиданием, потому что клип под
 * его скорость никто заранее не делал.
 *
 * Значения — ровно те, под которые озвучен весь курс (см. TONES и pctFor в tools/pregen-audio.mjs).
 * Менять их можно только вместе с новым прогоном предгенерации.
 *
 * Сам список четырёх тембров остаётся здесь как данные: под них озвучен курс, и этим списком
 * живут tools/pregen-audio.mjs и tools/check-audio.mjs. Приложение берёт из него ровно первый
 * и никогда не спрашивает человека.
 */
export const VOICE_PRESETS = [
  { id: "sanft", label: "Мягкий", desc: "по умолчанию — тихо и спокойно", rate: -12, pitch: -3, volume: -12 },
  { id: "warm", label: "Тёплый", desc: "чуть живее", rate: -8, pitch: -2, volume: -6 },
  { id: "normal", label: "Обычный", desc: "как есть", rate: -4, pitch: 0, volume: 0 },
  { id: "klar", label: "Чёткий", desc: "громче и бодрее", rate: 0, pitch: 1, volume: 4 },
];
export const presetById = (id) => VOICE_PRESETS.find((p) => p.id === id) || VOICE_PRESETS[0];

/**
 * Тембр, которым Мия говорит у всех.
 *
 * Был «sanft»: −12 % скорости, −3 по высоте, −12 по громкости. Вместе это звучит медленно,
 * тихо и на низком тоне — живой голос, замедленный на десятую, теряет живость и начинает
 * отдавать роботом. Взят «klar»: обычная скорость, чуть выше тон и громче.
 *
 * Менять тембр без перегенерации можно только потому, что весь курс заранее озвучен во
 * всех четырёх тембрах — 37 тысяч клипов. Возьмёшь значения вне этого списка — кеш
 * обнулится целиком и каждое слово пойдёт через синтез с ожиданием.
 */
export const TONE = presetById("klar");
export const BASE_RATE = 0.92;
const isNeural = (id) => typeof id === "string" && id.includes("Neural");

/**
 * How fast each kind of line is read. These live here and nowhere else on purpose: the speed is
 * part of the cache key, so if a screen plays a phrase at a speed the prewarm did not ask for,
 * every warmed file is thrown away and Emil waits for the synthesiser after all. Screens must use
 * these constants and prewarm must warm the same ones.
 */
export const RATES = {
  word: 0.8,          // flashcard headword — slow and very clear
  example: 0.85,      // example sentence, and the phrase of a speaking drill
  translation: 0.9,   // the Russian side of a flashcard
  dialogueAli: 0.8,   // Emil's own lines, a touch slower than the other speaker
  dialogueOther: 0.88,
  listen: 0.9,        // listening exercise — never faster than this
};

/**
 * Break a long line into natural speech chunks at sentence ends. Each chunk stays under `max`
 * characters so the first one is ready in about a second; a trailing fragment shorter than `min`
 * is folded into the previous chunk so we never synthesise a two-word snippet on its own.
 */
function splitForSpeech(text, max = 130, min = 45) {
  const clean = String(text).trim();
  if (clean.length <= max) return [clean];
  const sentences = (clean.match(/[^.!?…]+[.!?…]+\s*|[^.!?…]+$/g) || [clean]).map((x) => x.trim()).filter(Boolean);
  const out = [];
  for (const part of sentences) {
    const last = out[out.length - 1];
    // extend the previous chunk only while the result still fits comfortably
    if (last && last.length + 1 + part.length <= max) out[out.length - 1] = `${last} ${part}`;
    else out.push(part);
  }
  // a tiny tail on its own sounds clipped: attach it to the chunk before
  if (out.length > 1 && out[out.length - 1].length < min) {
    const tail = out.pop();
    out[out.length - 1] = `${out[out.length - 1]} ${tail}`;
  }
  return out;
}


class Speech {
  constructor() {
    this.voices = [];
    this.synth = window.speechSynthesis || null;
    this.rec = null;
    this.listening = false;
    this.lastLang = "de-DE"; // which language the last recognised utterance was in
    this.audio = null;
    this.fetchCtrl = null;
    this.serverTts = null; // null = unknown; app sets it from /api/status at boot
    // Откуда взять токен вошедшего. Ставит app.js при запуске. Модуль озвучки намеренно ничего
    // не знает про аккаунты — иначе речь перестала бы работать там, где нет Supabase.
    this.authToken = null;
    // Требует ли этот сайт входа для синтеза. Ставит app.js: на сайте без Supabase вход не нужен
    // никому, и просить его было бы странно.
    this.needsAuth = false;
    this.serverFailUntil = 0;
    this.micGranted = false;
    this.micError = null;
    this.speakRun = 0;
    this.cache = new Map(); // "voice|rate|text" -> object URL
    this._loadVoices();
    if (this.synth) this.synth.addEventListener?.("voiceschanged", () => this._loadVoices());
  }

  get settings() {
    try { return store.state.settings || {}; } catch { return {}; }
  }

  _loadVoices() {
    if (!this.synth) return;
    this.allVoices = this.synth.getVoices() || [];
    const german = this.allVoices.filter((v) => /^de[-_]/i.test(v.lang) || v.lang === "de");
    // Emil asked for a female voice only, no exceptions. If the system has no female German
    // voice we keep the list empty and stay silent rather than switching Mia to a man's voice —
    // the server voice (Seraphina) is the normal path anyway, this is only the offline fallback.
    this.voices = german.filter((v) => !MALE_NAMES.test(v.name));
  }

  /**
   * A female system voice for a language. Without this the browser picks the OS default, and on
   * Windows the default Russian voice is male (Pavel) — Mia must never suddenly sound like a man.
   */
  systemVoiceFor(lang) {
    const prefix = String(lang).slice(0, 2).toLowerCase();
    const matching = (this.allVoices || []).filter((v) => v.lang.toLowerCase().startsWith(prefix));
    if (!matching.length) return null;
    const female = matching.filter((v) => !MALE_NAMES.test(v.name));
    const pool = female.length ? female : [];
    if (!pool.length) return null; // only male voices available: better silent than the wrong person
    const score = (v) => (/(natural|online|neural)/i.test(v.name) ? 10 : 0) + (v.localService === false ? 2 : 0);
    return pool.slice().sort((a, b) => score(b) - score(a))[0];
  }

  get ttsSupported() {
    return Boolean(this.synth) || this.serverTts !== false;
  }

  germanVoices() {
    if (!this.voices.length) this._loadVoices();
    return this.voices;
  }

  /** Pick the warmest available female German browser voice, or a specific one by name */
  pickVoice(_gender = "f", preferredName = null) {
    const voices = this.germanVoices();
    if (!voices.length) return null;
    if (preferredName) {
      const v = voices.find((x) => x.name === preferredName);
      if (v) return v;
    }
    const hints = FEMALE_HINTS;
    const score = (v) => {
      const n = v.name.toLowerCase();
      let s = 0;
      hints.forEach((h, i) => { if (n.includes(h)) s += 100 - i; });
      if (n.includes("online") || n.includes("natural") || n.includes("neural")) s += 40; // Edge neural voices
      if (n.includes("google")) s += 30;
      if (v.localService === false) s += 10;
      if (/de[-_]de/i.test(v.lang)) s += 5;
      return s;
    };
    const best = voices.slice().sort((a, b) => score(b) - score(a))[0];
    // Surviving the blacklist is not proof a voice belongs to a woman. Mia speaks with a female
    // voice or she stays silent — warnNoVoice() then says why, which is honest; a stranger's male
    // voice reading her lines is not.
    const n = best.name.toLowerCase();
    return hints.some((h) => n.includes(h)) ? best : null;
  }

  /**
   * Speak text. Resolves when finished (or stopped). Uses the neural server voice when available,
   * otherwise the browser voice. `force` ignores the "TTS off" setting (profile preview).
   */
  async speak(text, { rate = null, pitch = 1, gender = "f", voiceName = null, lang = "de-DE", force = false, secret = false } = {}) {
    if (!text) return false;
    if (!force && this.settings.tts === false) return false;
    this.stop();
    this.abortListening(); // never transcribe our own voice
    const run = ++this.speakRun;

    // A long explanation is synthesised sentence by sentence: the first one starts playing after a
    // second instead of after ten, and the rest are ready by the time it ends. Without this the
    // pauses between chunks of a long Russian line make Mia sound like she is breaking up.
    const parts = splitForSpeech(text);
    if (parts.length > 1) {
      const plans = parts.map((t) => this.plan(t, { rate, voiceName, lang, secret }));
      if (plans.every((p) => p.server)) {
        for (let n = 0; n < plans.length; n++) {
          if (run !== this.speakRun) return true;
          // warm the next sentence while this one plays
          if (plans[n + 1] && !this.cache.has(plans[n + 1].key)) this.fetchAudio(plans[n + 1], { cancellable: false }).catch(() => {});
          const ok = await this.speakServer(plans[n]);
          if (ok === "stopped" || run !== this.speakRun) return true;
          if (ok === false) return this.speakBrowser(parts.slice(n).join(" "), { rate: plans[n].rate, pitch, gender, voiceName: plans[n].browserVoice, lang });
        }
        return true;
      }
    }

    const plan = this.plan(text, { rate, voiceName, lang, secret });
    if (plan.server) {
      const ok = await this.speakServer(plan);
      if (ok !== false) return true;
    }
    const spoke = await this.speakBrowser(text, { rate: plan.rate, pitch, gender, voiceName: plan.browserVoice, lang });
    // Neither the neural voice nor a female system voice could speak this. Silence with no
    // explanation looks like the app is broken, so say so once — not on every line.
    if (!spoke) this.warnNoVoice(lang);
    return spoke;
  }

  /**
   * Сказать один раз за сеанс, что голоса нет, — и про ТОТ язык, который не зазвучал.
   *
   * Веток было две: «русский» и «всё остальное». Азербайджанец, у которого отвалился сервер
   * озвучки, получал объяснение про женский немецкий голос — притом что молчал у него
   * азербайджанский, которого в системе нет почти ни у кого, так что запасного пути у него нет
   * вовсе. Сообщение про чужой язык в такой момент — это не мелочь: человек идёт искать в
   * настройках немецкий голос, которого ему не нужно.
   */
  warnNoVoice(lang) {
    if (this._warnedNoVoice) return;
    this._warnedNoVoice = true;
    const l = String(lang || "");
    const text = l.startsWith("az")
      ? "Азербайджанский голос сейчас недоступен: нет связи с сервисом озвучки, а в системе азербайджанского голоса нет. Текст весь на экране."
      : l.startsWith("ru")
        ? "Русский голос сейчас недоступен — читай текст, он весь на экране."
        : "Голос Мии сейчас недоступен: нет связи с сервисом озвучки или в системе нет женского немецкого голоса. Текст весь на экране.";
    import("./fx.js").then(({ toast }) => toast(text, { icon: "🔇", kind: "warn", ms: 7000 })).catch(() => {});
  }

  /**
   * Fetch and cache a line WITHOUT playing it. Used to synthesise Mia's next sentence while the
   * current one is still playing, so her German and Russian run together instead of leaving a
   * silent gap that makes her sound like she is stuttering.
   */
  async prefetch(text, { rate = null, voiceName = null, lang = "de-DE", secret = false } = {}) {
    if (!text || this.settings.tts === false) return;
    for (const part of splitForSpeech(text)) {
      const plan = this.plan(part, { rate, voiceName, lang, secret });
      if (!plan.server || this.cache.has(plan.key)) continue;
      try { await this.fetchAudio(plan, { cancellable: false }); } catch { return; }
    }
  }

  /** Work out which voice, locale and prosody a line should use. */
  plan(text, { rate = null, voiceName = null, lang = "de-DE", secret = false } = {}) {
    const r = rate ?? BASE_RATE;
    const isDe = lang.startsWith("de");
    const isAz = lang.startsWith("az");
    /*
     * Выбранный голос звучит там, где речь живая, — и только там.
     *
     * Голос входит в ключ кэша наравне с текстом. Пять голосов в кабинете на четыре тембра — это
     * 176 тысяч клипов вместо 35 тысяч: озвучить столько нельзя ни за какое время. Пока голос
     * применялся и к курсу, любой выбор кроме Серафины обнулял ВСЮ предгенерацию: каждое слово,
     * каждый пример, каждая реплика диалога шли через функцию с ожиданием.
     *
     * Курс — это запись, сделанная заранее, как в любом языковом курсе; Мия в разговоре говорит
     * вживую, и там голос ничего не стоит. `secret` как раз и помечает живую речь. Голос,
     * переданный вызовом напрямую (voiceName), уважается всегда — это прослушивание в кабинете.
     */
    // voiceName приходит только из прослушивания в кабинете; выбора голоса больше нет.
    const chosen = voiceName ?? null;
    const german = isNeural(chosen) ? chosen : MIA_VOICE;
    // The native language keeps Mia's own voice when it is multilingual; Azerbaijani never is.
    const voice = isDe ? german
      : isAz ? FALLBACK_VOICE_AZ
      : (MULTILINGUAL.has(german) ? german : FALLBACK_VOICE_RU);
    const locale = isDe ? "" : isAz ? "az-AZ" : "ru-RU";
    const p = TONE;
    const ratePct = Math.round(p.rate + (r - 0.92) * 100);
    const server = this.serverTts !== false && Date.now() > this.serverFailUntil && (!chosen || isNeural(chosen));
    return {
      text, voice, locale, rate: r, ratePct, pitch: p.pitch, volume: p.volume, server, secret,
      browserVoice: isNeural(chosen) ? null : chosen,
      key: `${voice}|${locale}|${ratePct}|${p.pitch}|${p.volume}|${text}`,
    };
  }

  /**
   * Where a line already lives, if it has ever been spoken before.
   *
   * Every clip is stored under a hash of the text and the voice settings, in a public bucket. Most
   * of the course is put there once by tools/pregen-audio.mjs, so the usual case is a CDN file the
   * browser can play straight away — no function invoked, nothing synthesised, no wait.
   */
  async cdnUrl(plan) {
    const base = backend.config.supabaseUrl;
    if (!base || !globalThis.crypto?.subtle) return null;
    try {
      const raw = `${plan.voice}|${plan.locale}|${plan.ratePct}|${plan.pitch}|${plan.volume}|${plan.text}`;
      const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(raw));
      const key = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${base}/storage/v1/object/public/tts/${key}.mp3`;
    } catch {
      return null;
    }
  }

  /** Download one line's audio into the cache. Returns a URL the player can use. */
  async fetchAudio(plan, { cancellable = true } = {}) {
    const ctrl = new AbortController();
    // Record why we aborted. A cancelled line must be dropped silently, while one that timed out
    // has to fall back to the browser voice — both arrive as the same AbortError.
    ctrl.reason = null;
    if (cancellable) this.fetchCtrl = ctrl;
    const timer = setTimeout(() => { ctrl.reason = "timeout"; ctrl.abort("timeout"); }, 15000);
    try {
      // The CDN first. A hit is a plain URL — no blob, no object URL to revoke, and the browser
      // caches it across sessions the way it caches any other file.
      // Личную реплику в общем хранилище не ищем и туда не кладём: см. `secret` ниже.
      const cdn = plan.secret ? null : await this.cdnUrl(plan);
      if (cdn) {
        const head = await fetch(cdn, { method: "HEAD", signal: ctrl.signal }).catch(() => null);
        if (head?.ok) {
          this.cache.set(plan.key, cdn);
          return cdn;
        }
      }
      // Кто просит. Синтез стоит денег владельцу и пишет файл в его хранилище, поэтому функция
      // на сервере спрашивает токен. Гость не остаётся без звука: весь курс озвучен заранее и
      // читается из хранилища напрямую — этот путь выше, до сюда доходят только новые строки.
      const token = await this.authToken?.().catch(() => null);
      // …и вот на них гостю идти некуда. Спрашивать сервер, зная, что он откажет, — это две
      // лишние секунды ожидания и пятнадцать секунд штрафа на голос, который и так работает.
      if (!token && this.needsAuth) {
        const e = new Error("tts: guest");   // в лог, не на экран — человек просто слышит голос браузера
        e.noAuth = true;
        throw e;
      }
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        // `store: false` — это разговор, а не курс. Реплика Мии, сказанная одному человеку, не
        // должна навсегда лечь в общий бакет: повторно её никто не попросит, а лежать она будет
        // вечно и рядом со всем остальным.
        body: JSON.stringify({ text: plan.text, voice: plan.voice, rate: plan.ratePct, pitch: plan.pitch, volume: plan.volume, locale: plan.locale, store: !plan.secret }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error("tts " + r.status);
      const blob = await r.blob();
      if (!blob.size) throw new Error("empty");
      const url = URL.createObjectURL(blob);
      if (this.cache.size > 80) {
        const first = this.cache.keys().next().value;
        const stale = this.cache.get(first);
        if (String(stale).startsWith("blob:")) URL.revokeObjectURL(stale);
        this.cache.delete(first);
      }
      this.cache.set(plan.key, url);
      return url;
    } catch (e) {
      // carry the reason out with the error — the caller cannot tell an abort apart otherwise
      if (e && typeof e === "object") e.cancelReason = ctrl.reason;
      throw e;
    } finally {
      clearTimeout(timer);
      if (this.fetchCtrl === ctrl) this.fetchCtrl = null;
    }
  }

  /**
   * returns true (played), "stopped" (cancelled by stop()), or false (unavailable → caller falls back).
   * One retry before giving up: the built-in browser voice sounds like a broken robot next to Mia's,
   * so we only fall back to it when the neural voice really cannot be reached.
   */
  async speakServer(plan) {
    let url = this.cache.get(plan.key);
    if (!url) {
      for (let attempt = 0; attempt < 2 && !url; attempt++) {
        try {
          url = await this.fetchAudio(plan);
        } catch (e) {
          const aborted = e?.name === "AbortError" || String(e?.message).includes("abort");
          // cancelled on purpose (Emil moved on, or the mic opened) → nothing more to do here
          if (aborted && e?.cancelReason !== "timeout") return "stopped";
          // Гость на строке, которой нет в хранилище. Сервер тут ни при чём и штрафовать его не
          // за что: просто читаем голосом браузера, сразу и без повтора.
          if (e?.noAuth) return false;
          if (attempt === 0) continue; // one quiet retry
          console.warn("[tts] neural voice unreachable, falling back:", e?.message || e);
          this.serverFailUntil = Date.now() + 15_000; // short penalty, then try the good voice again
          return false;
        }
      }
    }
    return url ? this.playUrl(url) : false;
  }

  playUrl(url) {
    return new Promise((resolve) => {
      const a = new Audio(url);
      this.audio = a;
      let done = false;
      const finish = (v = true) => { if (!done) { done = true; if (this.audio === a) this.audio = null; resolve(v); } };
      a._finish = finish;
      a.onended = () => finish(true);
      a.onerror = () => finish(false);
      a.play().catch((e) => { console.warn("[tts] play blocked:", e?.message); finish(false); });
    });
  }

  speakBrowser(text, { rate = 0.92, pitch = 1, gender = "f", voiceName = null, lang = "de-DE" } = {}) {
    return new Promise((resolve) => {
      if (!this.synth) return resolve(false);
      try {
        this.synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        // always a female voice, in any language — never fall through to the OS default
        const v = lang.startsWith("de") ? this.pickVoice(gender, voiceName) : this.systemVoiceFor(lang);
        if (!v) { resolve(false); return; } // no female voice for this language: stay silent
        if (v) u.voice = v;
        u.lang = v?.lang || lang;
        // The tone Emil picked has to reach this path too, otherwise all four presets sound
        // identical whenever the neural voice is unavailable. The preset is in SSML units
        // (rate %, pitch Hz, volume %); the Web Speech API wants plain multipliers.
        const p = TONE;
        // the built-in voices are harsh: slow them down and soften the pitch a little
        u.rate = Math.max(0.5, Math.min(2, (rate - 0.05) * (1 + p.rate / 100)));
        u.pitch = Math.max(0.5, Math.min(2, (pitch - 0.05) * (1 + p.pitch / 24)));
        u.volume = Math.max(0.3, Math.min(1, 0.9 * (1 + p.volume / 100)));
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(true); } };
        u.onend = finish;
        u.onerror = finish;
        // Safety: some browsers never fire onend; scale the timeout with the speaking rate
        setTimeout(finish, Math.max(3000, (text.length * 120) / Math.max(0.5, rate) + 1500));
        this.synth.speak(u);
      } catch {
        resolve(false);
      }
    });
  }

  stop() {
    this.speakRun++;
    try { this.synth?.cancel(); } catch {}
    if (this.fetchCtrl) { this.fetchCtrl.reason = "stop"; try { this.fetchCtrl.abort("stop"); } catch {} this.fetchCtrl = null; }
    if (this.audio) {
      const a = this.audio;
      this.audio = null;
      try { a.pause(); } catch {}
      a._finish?.("stopped");
    }
  }

  get speaking() {
    return Boolean(this.audio) || Boolean(this.synth?.speaking);
  }

  get sttSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /** "granted" | "denied" | "prompt" | "unknown" */
  async micPermission() {
    try {
      const st = await navigator.permissions.query({ name: "microphone" });
      return st.state;
    } catch {
      return "unknown";
    }
  }

  /**
   * Ask the browser for the microphone once and release it immediately.
   * On localhost Chrome/Edge remember the grant, so Emil is never asked again.
   * Must be called from a user gesture. Returns true when the mic is available.
   */
  async requestMic() {
    if (this.micGranted) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      this.micGranted = true;
      return true;
    } catch (e) {
      this.micError = e?.name || "error";
      return false;
    }
  }

  /**
   * Listen once. onInterim(text) receives partial results.
   * Resolves with the final transcript ("" if nothing was heard). Rejects with {code} on hard errors.
   */
  /**
   * Listen once and return what was said.
   *
   * One recogniser, one language. The browser runs a single recognition session per page, so two
   * languages at once cannot work: the second start silently kills the first. Which language to
   * listen for is therefore the caller's decision — the tutor lets Emil pick it with a DE/RU switch
   * next to the microphone, while pronunciation drills always listen in German.
   */
  async listen({ lang = "de-DE", onInterim = null, timeoutMs = 12000 } = {}) {
    // make sure the browser permission is settled before the recogniser starts,
    // so Emil sees one prompt at most and never a silent failure
    if (!this.micGranted) {
      const ok = await this.requestMic();
      if (!ok && this.micError) throw { code: this.micError === "NotAllowedError" ? "not-allowed" : this.micError === "NotFoundError" ? "audio-capture" : "start-failed" };
    }
    // Mia must fall silent before the microphone opens, or she transcribes herself as Emil.
    this.stop();
    this.abortListening();
    this.lastLang = lang;
    return this._listen({ lang, onInterim, timeoutMs });
  }

  _listen({ lang = "de-DE", onInterim = null, timeoutMs = 12000 } = {}) {
    return new Promise((resolve, reject) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return reject({ code: "unsupported" });
      this.abortListening(); // never two sessions at once — the browser allows only one
      const rec = new SR();
      this.rec = rec;
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;
      let finalText = "";
      let settled = false;
      const settle = (fn, val) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.rec === rec) { this.listening = false; this.rec = null; } // ignore stale callbacks of an older recognizer
        fn(val);
      };
      const timer = setTimeout(() => { try { rec.stop(); } catch {} }, timeoutMs);
      rec.onresult = (e) => {
        if (this.rec !== rec) return;
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        onInterim?.(finalText || interim);
      };
      rec.onerror = (e) => {
        const code = e.error || "error";
        // Сервис не знает этого языка. Для азербайджанского это вероятный исход, и он не должен
        // выглядеть как поломка микрофона: берём турецкий и повторяем ту же попытку молча.
        if (code === "language-not-supported" && !STT_FALLBACK.has(rec.lang)) {
          const next = STT_ALTERNATIVE[rec.lang];
          if (next) {
            STT_FALLBACK.set(rec.lang, next);
            settled = true;
            clearTimeout(timer);
            if (this.rec === rec) { this.listening = false; this.rec = null; }
            this._listen({ lang: next, onInterim, timeoutMs }).then(resolve, reject);
            return;
          }
        }
        // "aborted" means something cancelled us (Mia started speaking, Emil pressed stop, the view
        // changed) — that is NOT the same as hearing nothing, and callers must not treat it as an error
        if (code === "aborted") return settle(reject, { code: "aborted" });
        if (code === "no-speech") return settle(resolve, finalText.trim());
        settle(reject, { code });
      };
      rec.onend = () => settle(resolve, finalText.trim());
      try {
        this.listening = true;
        rec.start();
      } catch (err) {
        settle(reject, { code: "start-failed", err });
      }
    });
  }

  stopListening() {
    if (this.rec) {
      try { this.rec.stop(); } catch {}
    }
  }

  abortListening() {
    if (this.rec) {
      const rec = this.rec;
      this.rec = null;
      this.listening = false;
      try { rec.abort(); } catch {}
    }
  }
}

export const speech = new Speech();

/**
 * Чем заменить язык, которого нет у сервиса распознавания.
 *
 * Турецкий и азербайджанский — близкие родственники; турецкая модель разбирает азербайджанскую
 * речь несопоставимо лучше, чем русская или немецкая. Это компромисс, а не решение, но молчащий
 * микрофон — вообще не вариант.
 */
const STT_ALTERNATIVE = { "az-AZ": "tr-TR" };
/** Что уже пришлось заменить: спрашивать сервис второй раз про то же — только терять время. */
const STT_FALLBACK = new Map();

export const STT_ERRORS = {
  "language-not-supported": "Этот браузер не распознаёт речь на твоём языке. Пиши текстом — так тоже всё работает.",
  unsupported: "Распознавание речи не поддерживается в этом браузере. Открой сайт в Google Chrome или Microsoft Edge.",
  "not-allowed": "Нет доступа к микрофону. Разреши микрофон в адресной строке браузера и попробуй снова.",
  "service-not-allowed": "Браузер запретил сервис распознавания. Проверь настройки микрофона.",
  network: "Нет связи с сервисом распознавания. Проверь интернет.",
  "audio-capture": "Микрофон не найден. Подключи микрофон и обнови страницу.",
  "start-failed": "Не удалось запустить микрофон. Попробуй ещё раз.",
  aborted: "Микрофон выключился. Нажми 🎤 ещё раз.",
};
