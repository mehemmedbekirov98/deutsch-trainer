// Progress store: XP, streak, per-level progress, achievements, settings.
// Kept in localStorage and mirrored to Supabase; whichever copy is newer wins on the next start.
import { todayKey, daysBetween } from "./utils.js";
import { backend } from "./backend.js";

// Days until a word comes back, by Leitner box. Missing it drops him to box 0 (tomorrow); each
// correct answer moves one rung up. Deliberately gentle at the top: this is A1 vocabulary he needs
// to keep, not trivia.
// Box 0 is 0 days on purpose: a word he just missed must be available again in the very next
// review, not locked out until tomorrow. After that the ladder stretches out.
const SRS_STEPS = [0, 1, 3, 7, 16, 30];

/** todayKey()-style date, n days from the given one. */
function addDays(key, n) {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const BASE_KEY = "deutsch-ali-v1";
// One browser, several accounts: the local mirror is per person, or signing in as somebody else
// would hand them the previous account's save.
const keyFor = () => (backend.user ? `${BASE_KEY}:${backend.user.id}` : BASE_KEY);

// «Перенести прогресс из этого браузера» at sign-up. Written before the account exists and read
// after the first sign-in, because with email confirmation switched on those are two different
// visits — the tick used to be honoured only when Supabase handed back a session immediately.
const CARRY_KEY = "lingua-carry-guest";
const CARRY_AT = CARRY_KEY + "-at";
const CARRY_TTL = 24 * 60 * 60 * 1000;

export const markCarryOver = (email) => {
  try {
    localStorage.setItem(CARRY_KEY, String(email || "").trim().toLowerCase());
    localStorage.setItem(CARRY_AT, String(Date.now()));
  } catch {}
};

/**
 * Забрать отметку «перенести прогресс» — и убрать её в любом случае.
 *
 * Раньше отметка стиралась только при совпадении адреса. Передумал на полпути, ошибся в почте,
 * вошёл под другим человеком — и чужая почта оставалась лежать в браузере навсегда, хотя нужна
 * была ровно на один вход. Заодно появился срок: через сутки отметка бессмысленна, письмо
 * подтверждения живёт меньше.
 */
/** Сейв, заработанный без аккаунта в этом браузере, — если в нём есть что переносить. */
function readGuestSave() {
  try {
    const guest = JSON.parse(localStorage.getItem(BASE_KEY) || "null");
    return guest && Number.isFinite(guest.xp) && guest.xp > 0 ? guest : null;
  } catch { return null; }
}

// «Нет, не переносить» — ответ на всю жизнь аккаунта в этом браузере, а не на один заход.
const REFUSED_KEY = "lingua-guest-offer-declined";
const refusedGuestOffer = (id) => {
  try { return (localStorage.getItem(REFUSED_KEY) || "").split(",").includes(String(id)); } catch { return false; }
};
export const refuseGuestOffer = (id) => {
  try {
    const was = (localStorage.getItem(REFUSED_KEY) || "").split(",").filter(Boolean);
    if (!was.includes(String(id))) localStorage.setItem(REFUSED_KEY, [...was, String(id)].join(","));
  } catch {}
};

function takeCarryOver(email) {
  try {
    const want = localStorage.getItem(CARRY_KEY);
    const at = Number(localStorage.getItem(CARRY_AT)) || 0;
    localStorage.removeItem(CARRY_KEY);
    localStorage.removeItem(CARRY_AT);
    if (!want) return false;
    if (at && Date.now() - at > CARRY_TTL) return false;
    return want === String(email || "").trim().toLowerCase();
  } catch { return false; }
}

// The three bands the course covers, and the last level of each. Levels 1–12 are A1, 13–24 A2,
// 25–36 B1 — so finishing level 12 is what makes someone an A2 learner, not a claim about himself.
export const CEFR = ["A1", "A2", "B1"];
export const CEFR_LAST = { A1: 12, A2: 24, B1: 36 };
export const CEFR_FIRST = { A1: 1, A2: 13, B1: 25 };
export const CEFR_TITLE = { A1: "Начальный", A2: "Базовый", B1: "Уверенный" };
const THEME_IDS = ["nacht", "gold", "alpen", "kaspi"];

export const RANKS = [
  { xp: 0, title: "Anfänger", ru: "Новичок", icon: "🌱" },
  { xp: 250, title: "Entdecker", ru: "Исследователь", icon: "🧭" },
  { xp: 700, title: "Kenner", ru: "Знаток", icon: "📘" },
  { xp: 1500, title: "Profi", ru: "Профи", icon: "⚡" },
  { xp: 3000, title: "Meister", ru: "Мастер", icon: "🏅" },
  { xp: 5500, title: "Legende", ru: "Легенда", icon: "👑" },
];

export const ACHIEVEMENTS = [
  { id: "first-step", icon: "👣", title: "Erster Schritt", ru: "Первое задание решено", test: (s) => s.stats.answered >= 1 },
  { id: "xp-100", icon: "✨", title: "100 XP", ru: "Набрано 100 XP", test: (s) => s.xp >= 100 },
  { id: "xp-500", icon: "💫", title: "500 XP", ru: "Набрано 500 XP", test: (s) => s.xp >= 500 },
  { id: "xp-1000", icon: "🌟", title: "1000 XP", ru: "Набрано 1000 XP", test: (s) => s.xp >= 1000 },
  { id: "xp-3000", icon: "🔥", title: "3000 XP", ru: "Набрано 3000 XP", test: (s) => s.xp >= 3000 },
  { id: "streak-3", icon: "🔥", title: "3 Tage", ru: "3 дня подряд", test: (s) => s.streak.best >= 3 },
  { id: "streak-7", icon: "🚀", title: "Eine Woche", ru: "7 дней подряд", test: (s) => s.streak.best >= 7 },
  { id: "streak-30", icon: "🏆", title: "Ein Monat", ru: "30 дней подряд", test: (s) => s.streak.best >= 30 },
  { id: "level-1", icon: "🎓", title: "Level 1", ru: "Первый уровень пройден", test: (s) => completedCount(s) >= 1 },
  { id: "level-3", icon: "🥉", title: "3 Level", ru: "Пройдено 3 уровня", test: (s) => completedCount(s) >= 3 },
  { id: "level-6", icon: "🥈", title: "Halbzeit", ru: "Половина пути: 6 уровней", test: (s) => completedCount(s) >= 6 },
  { id: "level-12", icon: "🥇", title: "A1 geschafft!", ru: "Уровень A1 пройден целиком", test: (s) => completedCount(s) >= 12 },
  { id: "level-24", icon: "🏵️", title: "A2 geschafft!", ru: "Уровень A2 пройден целиком", test: (s) => completedCount(s) >= 24 },
  { id: "level-36", icon: "👑", title: "B1 geschafft!", ru: "Весь курс пройден — от A1 до B1", test: (s) => completedCount(s) >= 36 },
  // Заработанный уровень, а не заявленный: тест уровня и переключатель в кабинете поднимают
  // cefr сразу, и медаль «Ты дошёл до B1» прилетала раньше первого урока.
  { id: "cefr-a2", icon: "🎓", title: "A2", ru: "Ты дошёл до уровня A2", test: (s) => topDoneLevel(s) >= CEFR_LAST.A1 },
  { id: "cefr-b1", icon: "🎖️", title: "B1", ru: "Ты дошёл до уровня B1", test: (s) => topDoneLevel(s) >= CEFR_LAST.A2 },
  { id: "perfect-exam", icon: "💯", title: "Perfekt!", ru: "Экзамен на 100%", test: (s) => Object.values(s.levels).some((l) => l.examBest === 100) },
  { id: "talk-1", icon: "🗣️", title: "Hallo, Mia!", ru: "Первый разговор с Мией", test: (s) => s.stats.tutorTurns >= 1 },
  { id: "talk-50", icon: "💬", title: "Plaudertasche", ru: "50 реплик в разговоре с Мией", test: (s) => s.stats.tutorTurns >= 50 },
  { id: "speak-10", icon: "🎤", title: "Klare Stimme", ru: "10 фраз произнесены правильно", test: (s) => s.stats.speakCorrect >= 10 },
  { id: "words-100", icon: "📚", title: "100 Wörter", ru: "Выучено 100 слов", test: (s) => s.stats.wordsLearned >= 100 },
  { id: "words-300", icon: "🧠", title: "300 Wörter", ru: "Выучено 300 слов", test: (s) => s.stats.wordsLearned >= 300 },
  { id: "combo-10", icon: "⚡", title: "Combo x10", ru: "10 правильных ответов подряд", test: (s) => s.stats.bestCombo >= 10 },
  { id: "coins-500", icon: "🪙", title: "Sparer", ru: "Заработано 500 монет", test: (s) => s.coinsEarned >= 500 },
  { id: "coins-2000", icon: "💰", title: "Reich", ru: "Заработано 2000 монет", test: (s) => s.coinsEarned >= 2000 },
  { id: "first-buy", icon: "🛍️", title: "Erster Einkauf", ru: "Первая покупка в магазине", test: (s) => s.purchases >= 1 },
  { id: "stylist", icon: "🎨", title: "Stilist", ru: "Куплена тема оформления", test: (s) => s.owned.some((o) => o.startsWith("theme-")) },
  { id: "oral-1", icon: "🎓", title: "Mündlich", ru: "Первый устный экзамен сдан", test: (s) => Object.values(s.levels).some((l) => l.oralDone) },
  { id: "oral-5", icon: "🗣️", title: "Redner", ru: "5 устных экзаменов сдано", test: (s) => Object.values(s.levels).filter((l) => l.oralDone).length >= 5 },
];

/** Какие медали вообще существуют — всё остальное в сейве осталось от прошлых версий. */
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));

function completedCount(s) {
  return Object.values(s.levels).filter((l) => l.examBest >= 70).length;
}

/** Самый дальний СДАННЫЙ урок. Заявленный уровень сюда не входит — медаль даётся за работу. */
function topDoneLevel(s) {
  const done = Object.entries(s.levels).filter(([, l]) => (l.examBest || 0) >= 70).map(([id]) => Number(id));
  return done.length ? Math.max(...done) : 0;
}

function freshLevel() {
  return {
    vocabDone: false,
    vocabQuizBest: 0,
    grammarDone: false,
    missions: [false, false, false],
    dialogueDone: false,
    dialogueListened: false, // the listening bonus is paid once per level, not per visit
    speakingDone: false,
    examBest: 0,
    examTries: 0,
    oralDone: false,
    chatDone: false,
  };
}

function freshState() {
  return {
    v: 2,
    // Версия серверной строки, которую этот браузер видел последней. Её увеличивает только
    // сервер (см. save_progress в 0006_revisions.sql) — ею и решается, чья копия главнее, без
    // участия часов устройства. Ноль значит «с сервером ещё не говорили».
    rev: 0,
    // Имя по умолчанию пустое, а не чужое. Раньше здесь стояло «Emil», и каждый новый человек
    // до первой правки профиля назывался чужим именем — в приветствии, в кабинете и в репликах
    // Мии. Пустое сайт умеет: обращение тогда просто не произносится (см. personalise в utils.js).
    name: "",
    xp: 0,
    coins: 0,
    coinsEarned: 0,
    inventory: { hint: 0, shield: 0, retry: 0 },
    owned: [],
    theme: "nacht",
    title: null,
    boostUntil: 0,
    introSeen: false,
    purchases: 0,
    miaNotes: [],
    freeChatDay: null,
    streak: { count: 0, best: 0, lastDay: null },
    levels: {},
    achievements: [],
    stats: { answered: 0, correct: 0, tutorTurns: 0, speakCorrect: 0, wordsLearned: 0, bestCombo: 0, days: [], minutes: 0, hintsUsed: 0 },
    // Голоса, скорости, тембра и языка микрофона здесь больше нет: Мия звучит одинаково у всех,
    // а микрофон выбирает язык сам. Старые сейвы с этими полями ничего не ломают —
    // adopt() просто пронесёт их мимо, их больше никто не читает.
    settings: { sound: true, tts: true, autoListen: true, showRu: true },
    // What he told us about himself on the very first screen. Someone who already has school
    // German should not have to grind through "Hallo, ich heiße Emil" to reach the level he is at.
    cefrClaim: "A1",
    cefr: "A1", // earned ∪ claimed — kept in the save so the leaderboard can read it
    dailyGoal: 60,
    daily: { day: null, xp: 0 },
    games: {}, // best result per mini-game, see games.js
    words: {}, // per-word memory for spaced repetition: de -> { box, right, wrong, due, last }
  };
}

class Store {
  constructor() {
    this.state = freshState();
    this.listeners = new Set();
    // achievements earned but not yet announced — drained by the one subscriber in app.js, so a
    // call site that forgets to forward the returned list can no longer swallow them
    this.pending = [];
    this._saveTimer = null;
    this.serverOk = false;
    // Заметки Мии, стёртые в этот заход. Нужны ровно на те секунды, пока в воздухе висит уже
    // отправленный её ответ: он собран по старому списку и вернул бы стёртую строку обратно.
    this._forgotten = new Set();
  }

  /**
   * Забыть одну заметку Мии — и запомнить, что она забыта.
   *
   * Ответ Мии приезжает через несколько секунд после того, как она начала его составлять, и
   * заметка внутри собрана по СТАРОМУ списку. Если за это время человек успел открыть кабинет и
   * убрать строку, она возвращалась сама — и понять почему было невозможно.
   */
  forgetNote(text) {
    const note = String(text);
    this._forgotten.add(note);
    this.update((s) => { s.miaNotes = (s.miaNotes || []).filter((x) => x !== note); });
  }

  wasForgotten(text) {
    return this._forgotten.has(String(text));
  }

  async init() {
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(keyFor()) || "null");
    } catch {}
    let remote = null;
    // Did the read actually happen? A failed read looks exactly like an empty account from here,
    // and acting on the wrong one of those two wipes the save. When it failed we keep working
    // from the local copy and refuse to write to the cloud until a read succeeds.
    this.remoteUnknown = false;
    if (backend.cloud && backend.user) {
      try {
        remote = await backend.loadProgress();
        this.serverOk = true;
      } catch (e) {
        console.warn("[store] облако не прочиталось:", e?.message || e);
        this.remoteUnknown = true;
        this.serverOk = false;
      }
    }
    // A brand-new account on the browser where the progress was earned as a guest. Only when he
    // asked for it at sign-up — otherwise the next person to sign in on a shared computer would
    // inherit somebody else's XP.
    // Отметку забираем ВСЕГДА, а пользуемся ей только когда уместно.
    //
    // Раньше takeCarryOver стоял последним в цепочке `&&` и при живом облачном сейве просто не
    // вызывался — а значит и не стирал себя. Чужая почта продолжала лежать в браузере, хотя
    // нужна была ровно на один вход.
    const carried = backend.user ? takeCarryOver(backend.user.email) : false;
    const guest = readGuestSave();
    if (!remote && !local && !this.remoteUnknown && backend.user && carried && guest) local = guest;
    /*
     * Какая копия главнее — местная или серверная.
     *
     * Сначала по версии, и только потом по времени. `rev` увеличивает сервер, поэтому он
     * сравним всегда; `savedAt` у местной копии ставит этот браузер, и сравнивать его с
     * серверным — это сравнивать двое разных часов. Время остаётся запасным правилом для
     * случая, когда версий нет у обеих (старый сейв, сделанный до этой миграции).
     *
     * Равные версии значат, что местная копия — это та же серверная плюс несохранённая работа
     * этой вкладки. Тогда побеждает местная: на сервере ровно то же, а здесь ещё и свежее.
     */
    const cands = [local, remote].filter((x) => x && typeof x === "object" && Number.isFinite(x.xp));
    const best = cands.sort((a, b) => {
      const ra = Number(a.rev) || 0, rb = Number(b.rev) || 0;
      if (ra !== rb) return rb - ra;
      const ta = Number(a.savedAt) || 0, tb = Number(b.savedAt) || 0;
      if (ta !== tb) return tb - ta;
      return (b.xp || 0) - (a.xp || 0);
    })[0];
    if (best) this.adopt(best, false);

    /*
     * Гостевой прогресс, до которого отметка не доехала.
     *
     * Отметка «перенести» лежит в том браузере, где нажали «Создать аккаунт». Но письмо с
     * подтверждением человек часто открывает на телефоне — и первый вход происходит ТАМ, создавая
     * на сервере пустую строку. Возвращается он за компьютер, где всё заработанное и лежит, — а
     * условие выше уже ложно: серверная копия есть, просто она пустая.
     *
     * Тихо перетаскивать нельзя: на общем компьютере это отдало бы чужой прогресс следующему
     * вошедшему. Поэтому спрашиваем — и только когда спрашивать есть о чём: в аккаунте пусто, а
     * в браузере лежит непустой гостевой сейв. Отказ запоминается, чтобы не переспрашивать.
     */
    this.guestOffer = null;
    // Условие — «в браузере лежит БОЛЬШЕ, чем в аккаунте», а не «в аккаунте ровно ноль».
    //
    // С нулём предложение исчезало навсегда после первого же решённого задания: человек заходит,
    // не сразу понимает, о чём его спрашивают, начинает заниматься — и всё, что он наработал до
    // регистрации, больше не предложат никогда. Спрашивать при этом бесконечно тоже нельзя, и
    // не придётся: согласился — гостевой сейв стирается, отказался — отказ запомнен.
    if (backend.user && guest && Number(guest.xp) > Number(this.state.xp || 0) && !refusedGuestOffer(backend.user.id)) {
      this.guestOffer = guest;
    }
    // Версия, с которой мы начали работу: ею save() докажет серверу, что не затирает чужое.
    // Ноль значит «ничего не читали» — тогда любая строка в базе новее нас.
    this.rev = Number(best?.rev) || 0;
    this.touchStreak();
    this.save();
    if (this.remoteUnknown) this.emit("save-offline");
    this.watchOtherTabs();
    return this;
  }

  /**
   * Keep two open tabs from clobbering each other. Each tab holds its own copy of the state, so
   * whatever the other one saves has to be picked up here instead of being overwritten on the next
   * save — and two tabs of the same site is the normal case, not an edge case.
   */
  watchOtherTabs() {
    window.addEventListener("storage", (e) => {
      if (e.key !== keyFor() || !e.newValue) return;
      let incoming = null;
      try { incoming = JSON.parse(e.newValue); } catch { return; }
      if (!incoming || !Number.isFinite(incoming.xp)) return;
      if ((Number(incoming.savedAt) || 0) <= (Number(this.state.savedAt) || 0)) return;
      this.adopt(incoming, false);
      this.emit();
    });
  }

  /**
   * Replace the state with `data`, filling in every missing field from the defaults.
   *
   * `levels` — the container AND each level inside it — keeps its object identity on purpose. A
   * view grabs `store.level(id)` when it opens and writes the exam result into it minutes later;
   * if adopt() (from the 409 handler or another tab) swapped either one underneath, that write
   * would land in an orphan and the passed exam would pay out but never be recorded.
   */
  adopt(data, save = true) {
    /*
     * Версия только РАСТЁТ. Это правило, а не оптимизация.
     *
     * Здесь стояло простое присваивание — и оно ломало две вещи разом, потому что adopt()
     * зовут не только для серверной копии:
     *
     *   · перенос гостевого прогресса. У гостевого сейва rev всегда 0 — номер выдаёт сервер, а
     *     гостю он ничего не выдавал. Нажатие «Перенести» обнуляло версию, следующее сохранение
     *     предъявляло ноль, сервер отвечал «устарело» и возвращал ПУСТУЮ строку аккаунта, а мы
     *     её принимали. Человек видел «Перенесено: 2400 XP» — и через полсекунды ноль;
     *
     *   · вторая открытая вкладка. localStorage пишется ДО сетевого запроса, так что в нём
     *     всегда версия на шаг позади. Соседняя вкладка читала этот блоб и ПОНИЖАЛА себе
     *     версию, после чего её собственное сохранение получало отказ и она принимала серверную
     *     копию — стирая с экрана всё, что человек только что сделал.
     *
     * Оба случая — это «приняли данные, у которых версия хуже нашей». Данные принять можно,
     * версию понижать нельзя: она означает «какую серверную запись этот браузер уже видел», и
     * забывать увиденное незачем.
     */
    this.rev = Math.max(Number(this.rev) || 0, Number(data?.rev) || 0);
    const f = freshState();
    const incomingLevels = data.levels && typeof data.levels === "object" ? data.levels : {};
    const liveLevels = this.state?.levels;
    let levels = incomingLevels;
    if (liveLevels && typeof liveLevels === "object") {
      for (const k of Object.keys(liveLevels)) if (!(k in incomingLevels)) delete liveLevels[k];
      for (const [k, v] of Object.entries(incomingLevels)) {
        const live = liveLevels[k];
        // refill the object the views are holding instead of replacing it
        if (live && typeof live === "object" && v && typeof v === "object") {
          for (const key of Object.keys(live)) delete live[key];
          // Не Object.assign: он пишет через сеттер, а `__proto__` из разобранного JSON — это
          // сеттер прототипа. Файл выбирает сам человек, так что это скорее «скачал непонятно
          // что», чем чужая атака, — но обход стоит двух строк, а последствие невидимое.
          for (const [key, val] of Object.entries(v)) {
            if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
            live[key] = val;
          }
        } else liveLevels[k] = v;
      }
      levels = liveLevels;
    }
    this.state = {
      ...f, ...data,
      streak: { ...f.streak, ...(data.streak || {}) },
      stats: { ...f.stats, ...(data.stats || {}) },
      settings: { ...f.settings, ...(data.settings || {}) },
      inventory: { ...f.inventory, ...(data.inventory || {}) },
      daily: { ...f.daily, ...(data.daily || {}) },
      games: { ...f.games, ...(data.games || {}) },
      words: (data.words && typeof data.words === "object") ? data.words : {},
      // Поля исчезнувшего сюжета. Ошибки от них нет — их просто никто не читает, — но сейв таскал
      // бы их за собой вечно, включая на сервер.
      loot: undefined,
      storyRead: undefined,
      // Сейвы, сделанные до того, как из игры убрали сюжет, тащат в себе его поля и его медали.
      // Медали мало того что нельзя получить — их ещё и считали, и «собрано 41 из 38» выглядело
      // поломкой. Ничего заработанного это не трогает: выкидываются только исчезнувшие id.
      achievements: Array.isArray(data.achievements)
        ? data.achievements.filter((id) => ACHIEVEMENT_IDS.has(id))
        : [],
      levels, // the live container, reused so views holding store.level(id) keep writing to it
    };
    for (const k of ["owned", "achievements", "miaNotes"]) if (!Array.isArray(this.state[k])) this.state[k] = [];
    // Стёртая заметка не возвращается с чужой копией.
    //
    // Принять серверное состояние можно по многим поводам: конфликт сохранения, соседняя вкладка,
    // повторное чтение облака. В любом из них там лежит список заметок ДО удаления — и строка,
    // которую человек только что убрал из кабинета, молча появлялась снова.
    if (this._forgotten?.size) {
      this.state.miaNotes = this.state.miaNotes.filter((n) => !this._forgotten.has(String(n)));
    }
    for (const k of ["xp", "coins", "coinsEarned", "purchases", "dailyGoal", "boostUntil"]) if (!Number.isFinite(this.state[k])) this.state[k] = f[k];
    if (!THEME_IDS.includes(this.state.theme)) this.state.theme = "nacht";
    if (save) this.save();
    return this.state;
  }

  /* ---------------- coins / shop ---------------- */
  coinMultiplier() {
    return this.state.owned.includes("backpack") ? 1.25 : 1;
  }
  xpMultiplier() {
    let m = this.state.owned.includes("coffee") ? 1.1 : 1;
    if (this.state.boostUntil && Date.now() < this.state.boostUntil) m *= 2;
    return m;
  }
  boostActive() {
    return Boolean(this.state.boostUntil && Date.now() < this.state.boostUntil);
  }
  addCoins(n) {
    const amt = Math.round(n * this.coinMultiplier());
    if (!amt) return 0;
    this.state.coins += amt;
    this.state.coinsEarned += amt;
    return amt;
  }
  canAfford(price) {
    return this.state.coins >= price;
  }
  /** Buy a shop item; returns true on success */
  buy(item, price) {
    if (!this.canAfford(price)) return false;
    const s = this.state;
    if (item.kind === "consumable") {
      if (item.id === "boost") s.boostUntil = Math.max(Date.now(), s.boostUntil || 0) + 30 * 60 * 1000;
      else { const key = item.item || item.id; s.inventory[key] = (s.inventory[key] || 0) + (item.pack || 1); }
    } else {
      // a free item is owned by definition — putting it in `owned` would count as a purchase and
      // falsely unlock the «Stilist» achievement, which tests for any owned theme
      if (item.free) return false;
      if (s.owned.includes(item.id)) return false;
      s.owned.push(item.id);
      if (item.kind === "theme") s.theme = item.theme;
      if (item.kind === "title") s.title = item.id;
    }
    s.coins -= price;
    s.purchases += 1;
    const got = this.checkAchievements();
    this.save();
    return got;
  }
  useItem(key) {
    const inv = this.state.inventory;
    if (!inv[key]) return false;
    inv[key] -= 1;
    if (key === "hint") this.state.stats.hintsUsed += 1;
    this.save();
    return true;
  }
  hasItem(key) {
    return (this.state.inventory[key] || 0) > 0;
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(event = "change") {
    for (const fn of this.listeners) {
      try { fn(event, this.state); } catch (e) { console.error(e); }
    }
  }

  save() {
    this.state.savedAt = Date.now();
    // Mirror the computed level into the save: the leaderboard on the server reads the file, and
    // it has no way to run cefr() itself.
    this.state.cefr = this.cefr();
    try { localStorage.setItem(keyFor(), JSON.stringify(this.state)); } catch {}
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(async () => {
      // Emil has nobody to tell him the save failed, so a repeated failure surfaces on screen.
      try {
        // The cloud copy was never read this session, so we do not know what we would be
        // overwriting. Read it first; only a success unlocks writing.
        if (this.remoteUnknown) {
          const current = await backend.loadProgress();
          this.remoteUnknown = false;
          // Сравнивать надо с тем, что мы ЗНАЛИ, а не с тем, что только что проставили.
          //
          // Здесь стояло `> this.state.savedAt`, а save() первой же строкой пишет туда Date.now().
          // Значит настоящая вчерашняя копия никогда не оказывалась «новее» — условие не могло
          // стать истинным вообще никогда, — и следующей строкой на сервер уезжало пустое
          // состояние. Человек заходил с нового телефона, первое чтение срывалось, и весь его
          // опыт, уровни и словарь затирались нулями молча и необратимо.
          //
          // Теперь сравниваются версии, а не времена: `this.rev` — та, с которой мы начали.
          // Ноль означает «мы не читали ничего», и тогда новее нас любая строка в базе.
          //
          // Второе условие — про строки, созданные ДО миграции 0006: у них rev равен нулю, как и
          // у нас, и по одним версиям такая строка не считалась бы новее. Опыт для этого годится
          // как запасное правило: он только растёт, так что больше опыта значит больше сделанной
          // работы, и терять её нельзя.
          const theirs = Number(current?.rev) || 0;
          const ours = Number(this.rev) || 0;
          const newer = theirs > ours || (theirs === ours && Number(current?.xp) > Number(this.state.xp || 0));
          if (current && Number.isFinite(current.xp) && newer) {
            this.adopt(current, false);
            this.emit();
          }
        }
        // Пустое состояние поверх неизвестного — это не сохранение, это потеря.
        //
        // Второй замок на тот же случай: если прочитать облако так и не удалось, а писать мы
        // собираемся ноль, — не пишем ничего. Локальная копия уже на диске, а следующая попытка
        // снова начнётся с чтения.
        if (this.remoteUnknown && !(this.state.xp > 0)) { this.saveFails = 0; return; }
        const r = await backend.saveProgress(this.state, this.rev);
        // Nobody is signed in: the copy in this browser is the only one there is, and it is
        // already written. Not a failure, so the warning must not appear.
        if (r?.skipped) { this.saveFails = 0; return; }
        // The stored copy was newer — another tab of the same person. Take its state rather than
        // overwriting it: losing what he just earned is the worse outcome.
        if (r?.stale && r.current && Number.isFinite(r.current.xp)) {
          this.adopt(r.current, false);
          this.emit();
        } else if (r?.rev) {
          // Записали — запоминаем выданную сервером версию. Без этого следующее сохранение
          // предъявит устаревшую и получит «stale» на собственную же запись.
          this.rev = Math.max(Number(this.rev) || 0, Number(r.rev) || 0);
          this.state.rev = this.rev;
          // …и кладём её в localStorage.
          //
          // Блоб туда пишется ДО сетевого запроса, то есть с версией на шаг позади. Соседняя
          // вкладка читает именно его — и без этой строки она узнавала бы о каждой записи с
          // опозданием на одну и спорила с сервером устаревшим номером.
          try { localStorage.setItem(keyFor(), JSON.stringify(this.state)); } catch {}
        }
        this.saveFails = 0;
        this.serverOk = true;
      } catch (e) {
        this.saveFails = (this.saveFails || 0) + 1;
        this.serverOk = false;
        if (this.saveFails === 3) this.emit("save-failed");
      }
    }, 400);
    this.emit();
  }

  level(id) {
    if (!this.state.levels[id]) this.state.levels[id] = freshLevel();
    const l = this.state.levels[id];
    if (!Array.isArray(l.missions) || l.missions.length !== 3) l.missions = [false, false, false];
    return l;
  }

  /**
   * Emil's CEFR level.
   *
   * Earned, not claimed: it moves up when he finishes the last level of a band. The level he
   * declared when he started can lift it before he has earned it, and the higher of the two wins.
   * This is the number Mia reads to decide how hard her German may be.
   */
  cefr() {
    const done = Object.entries(this.state.levels)
      .filter(([, l]) => (l.examBest || 0) >= 70)
      .map(([id]) => Number(id));
    const top = done.length ? Math.max(...done) : 0;
    const earned = top >= CEFR_LAST.A2 ? "B1" : top >= CEFR_LAST.A1 ? "A2" : "A1";
    const claimed = CEFR.includes(this.state.cefrClaim) ? this.state.cefrClaim : "A1";
    return CEFR.indexOf(earned) >= CEFR.indexOf(claimed) ? earned : claimed;
  }

  /** How far through the current band he is, 0..1 — for the ring on his profile. */
  cefrProgress() {
    const band = this.cefr();
    const from = CEFR_FIRST[band], to = CEFR_LAST[band];
    let done = 0;
    for (let id = from; id <= to; id++) if (this.isCompleted(id)) done++;
    return { band, done, total: to - from + 1 };
  }

  isUnlocked(id) {
    if (id <= 1) return true;
    // The first level of the band he declared is open from the start — otherwise someone who
    // already speaks some German has to replay a whole band before the course is any use to him.
    if (id === CEFR_FIRST[this.state.cefrClaim]) return true;
    // Anything he has already opened stays open. Declaring a lower level used to lock the band's
    // first lesson again — including one he had already passed — so «пройденное остаётся
    // пройденным» was true of the XP and false of the door.
    const l = this.level(id);
    if ((l.examBest || 0) > 0 || this.levelProgress(id) > 0) return true;
    return this.level(id - 1).examBest >= 70;
  }

  /**
   * Declare a level. Raising it opens the band; lowering it is allowed but never takes anything
   * away — see isUnlocked(). Returns true when something actually changed.
   */
  claimCefr(band, { allowLower = false } = {}) {
    if (!CEFR.includes(band)) return false;
    const now = CEFR.includes(this.state.cefrClaim) ? this.state.cefrClaim : "A1";
    if (band === now) return false;
    if (!allowLower && CEFR.indexOf(band) < CEFR.indexOf(now)) return false;
    this.update((s) => { s.cefrClaim = band; });
    return true;
  }

  isCompleted(id) {
    return this.level(id).examBest >= 70;
  }

  stars(id) {
    const b = this.level(id).examBest;
    if (b >= 95) return 3;
    if (b >= 80) return 2;
    if (b >= 70) return 1;
    return 0;
  }

  /** 0..100 percentage of a level's parts done */
  levelProgress(id) {
    const l = this.level(id);
    const parts = [l.vocabDone, l.grammarDone, ...l.missions, l.dialogueDone, l.speakingDone, l.examBest >= 70];
    return Math.round((parts.filter(Boolean).length / parts.length) * 100);
  }

  rank() {
    const xp = this.state.xp;
    let cur = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) {
      if (xp >= RANKS[i].xp) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
    }
    const pct = next ? Math.min(100, Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100)) : 100;
    return { cur, next, pct };
  }

  /**
   * Award XP for an activity, applying whatever the shop promised (coffee +10%, boost ×2).
   * Use this everywhere XP is earned; addXp() is the raw version for callers that have already
   * multiplied, so calling both would pay the bonus twice.
   */
  grantXp(n, reason = "") {
    return this.addXp(Math.round(n * this.xpMultiplier()), reason);
  }

  addXp(n, reason = "") {
    if (!n) return [];
    this.state.xp += n;
    this.touchStreak();
    const today = todayKey();
    if (this.state.daily.day !== today) this.state.daily = { day: today, xp: 0 };
    this.state.daily.xp += n;
    const unlocked = this.checkAchievements();
    this.save();
    this.emit("xp");
    return unlocked;
  }

  touchStreak() {
    const today = todayKey();
    const s = this.state.streak;
    if (s.lastDay === today) return;
    if (s.lastDay && daysBetween(s.lastDay, today) === 1) s.count += 1;
    else if (!s.lastDay || daysBetween(s.lastDay, today) > 1) s.count = 1;
    s.lastDay = today;
    s.best = Math.max(s.best || 0, s.count);
    if (!this.state.stats.days.includes(today)) this.state.stats.days.push(today);
    // daily login bonus (grows with the streak)
    const bonus = 10 + Math.min(50, 5 * (s.count - 1));
    this.state.coins += bonus;
    this.state.coinsEarned += bonus;
    this.dailyBonus = { coins: bonus, streak: s.count };
  }

  /**
   * Remember how a single word went, and when it should come back.
   *
   * Without this, «Повторение» drew 15 words at random out of everything unlocked: by level 12 a
   * given word returned about once every 25 sessions, and one Emil kept failing was exactly as
   * likely to appear as one he knew cold. A Leitner ladder fixes that — a word he gets right moves
   * to a longer interval, a word he misses drops back to tomorrow.
   */
  recordWord(de, ok) {
    if (!de) return;
    const s = this.state;
    if (!s.words || typeof s.words !== "object") s.words = {};
    const w = s.words[de] || { box: 0, right: 0, wrong: 0, due: null, last: null };
    if (ok) { w.right += 1; w.box = Math.min(w.box + 1, SRS_STEPS.length - 1); }
    else { w.wrong += 1; w.box = 0; }
    w.last = todayKey();
    w.due = addDays(w.last, SRS_STEPS[w.box]);
    s.words[de] = w;
  }

  /** Words from `list` that are due today (or have never been quizzed), weakest first. */
  dueWords(list) {
    const today = todayKey();
    const words = this.state.words || {};
    const scored = list.map((v) => {
      const w = words[v.de];
      // never quizzed: worth including, but behind anything the schedule actually says is due
      if (!w) return { v, overdue: -0.5, fresh: true, box: 0, wrong: 0 };
      return { v, overdue: w.due ? daysBetween(w.due, today) : 0, fresh: false, box: w.box, wrong: w.wrong || 0 };
    });
    return scored
      .filter((x) => x.fresh || x.overdue >= 0)
      // most overdue first, then the ones he gets wrong most, then the lowest box
      .sort((a, b) => (b.overdue - a.overdue) || ((b.wrong || 0) - (a.wrong || 0)) || (a.box - b.box))
      .map((x) => x.v);
  }

  /** How many of these words are waiting to be reviewed right now. */
  dueCount(list) {
    const today = todayKey();
    const words = this.state.words || {};
    return list.reduce((n, v) => {
      const w = words[v.de];
      return n + (w && w.due && daysBetween(w.due, today) >= 0 ? 1 : 0);
    }, 0);
  }

  recordAnswer(correct, combo = 0) {
    this.state.stats.answered += 1;
    if (correct) this.state.stats.correct += 1;
    if (combo > (this.state.stats.bestCombo || 0)) this.state.stats.bestCombo = combo;
  }

  checkAchievements() {
    const got = [];
    for (const a of ACHIEVEMENTS) {
      if (this.state.achievements.includes(a.id)) continue;
      let ok = false;
      try { ok = a.test(this.state); } catch {}
      if (ok) { this.state.achievements.push(a.id); got.push(a); }
    }
    if (got.length) this.pending.push(...got);
    return got;
  }

  update(fn) {
    fn(this.state);
    const got = this.checkAchievements();
    this.save();
    return got;
  }

  /** Take the achievements earned since the last call, so one place can announce them all. */
  takePending() {
    const p = this.pending;
    this.pending = [];
    return p;
  }

  reset() {
    this.state = freshState();
    this.save();
  }

  /**
   * Убрать местную копию сейва одного аккаунта — и НИЧЬЮ больше.
   *
   * Нужно при удалении аккаунта. Раньше там звали reset(), но перед этим успевал пройти выход из
   * аккаунта, и keyFor() возвращал уже гостевой ключ: сброс обнулял прогресс человека, который
   * занимался в этом браузере БЕЗ аккаунта. Чужой и ни в чём не виноватый.
   */
  forgetAccountSave(userId) {
    if (!userId) return;
    try { localStorage.removeItem(`${BASE_KEY}:${userId}`); } catch {}
    this.state = freshState();
    this.rev = 0;
  }

  /**
   * Гостевой сейв больше не нужен: его перенесли в аккаунт.
   *
   * Без этого он остаётся лежать и предлагается КАЖДОМУ следующему, кто войдёт в этом браузере, —
   * а галочка «перенести» при регистрации включена по умолчанию. На общем компьютере это значит
   * раздачу чужого прогресса всем подряд.
   */
  clearGuestSave() {
    try { localStorage.removeItem(BASE_KEY); } catch {}
    this.guestOffer = null;
  }
}

export const store = new Store();
