// Lingua Mia — app shell, router and views
import { $, $$, el, append, nextTick, shuffle, plural, todayKey, articleOf, stripArticle, escapeHtml, sleep, personalise } from "./utils.js";
import { store, ACHIEVEMENTS, refuseGuestOffer } from "./store.js";
import { speech, NATIVE_LOCALE } from "./speech.js";
import { sfx, confetti, toast, achievementToast, countUp, startParticles, setSoundEnabled } from "./fx.js";
import { ExerciseSession, ringSvg } from "./exercises.js";
import { Tutor } from "./tutor.js";
import { renderFlashcards, buildVocabQuiz, buildReviewQuiz } from "./vocab.js";
import { renderDialogue } from "./dialogue.js";
import { renderGames, gameCatalogue } from "./games.js";
import { LEVELS, LEVEL_BY_ID, missionsOf } from "./levels.js";
import { SHOP, TITLE_NAMES, COINS, priceOf, applyTheme } from "./game.js";
import { RATES } from "./speech.js";
import { logoSvg } from "./logo.js";
import { session, renderAuth, renderNewPassword, patchMe, changePassword } from "./auth.js";
import { renderPlacement } from "./placement.js";
import { backend } from "./backend.js";
import { CEFR, CEFR_TITLE, CEFR_FIRST, CEFR_LAST } from "./store.js";
// t импортируется как tr: в этом файле t уже занято — и переменной под Tutor, и параметром
// в списке тембров голоса. Молчаливое затенение тега перевода нашлось бы не скоро.
import { initI18n, translateLevels, setLang, lang, langInfo, LANGS, t as tr, loadLevelDict, loadLevelDicts, loadBrainDict } from "./i18n.js";

let AI = false;
let NEURAL = false;
let micState = "unknown";
let saveWarned = false;
// when the next achievement toast may appear, shared across emits (see below)
let nextAchievementAt = 0;
let cleanup = null;
const view = () => $("#view");

/* ------------------------------------------------------------------ boot */
async function boot() {
  // Язык — самое первое: на нём и интерфейс, и все 36 уроков, и Мия. Словари грузятся до первой
  // отрисовки, потому что переводить уже нарисованный экран пришлось бы по живому DOM.
  await initI18n();
  translateLevels(LEVELS);
  // Who is signed in has to be known BEFORE the progress is read — the save belongs to an account
  // when there is one, and to this browser when there is not. backend.init() also brings back what
  // this deployment has: Claude, the voice, and which Supabase project it talks to.
  await backend.init();
  await store.init();
  // Живая Мия — только для вошедших: каждая её реплика стоит владельцу денег, и функция на
  // сервере всё равно откажет гостю. Показывать «умный режим» тому, кому он не достанется, —
  // обещание, которого сайт не держит.
  AI = Boolean(backend.config.ai) && (!backend.cloud || Boolean(backend.user));
  NEURAL = Boolean(backend.config.tts);
  speech.serverTts = NEURAL;
  // Синтез голоса — платный и пишет в хранилище владельца, поэтому функция спрашивает, кто пришёл.
  speech.authToken = () => backend.token();
  speech.needsAuth = Boolean(backend.cloud) && !backend.user;
  document.body.dataset.ai = AI ? "1" : "0";
  micState = await speech.micPermission();
  if (micState === "granted") speech.micGranted = true;
  $("#logo-mark")?.append(logoSvg(44, "logo"));
  $("#loader-mark")?.append(logoSvg(84, "loader"));
  setSoundEnabled(store.state.settings.sound);
  applyTheme(store.state.theme);
  startParticles($("#particles"));
  store.subscribe((event) => {
    renderSidebarStats();
    // Every achievement is announced here and only here. Call sites used to forward the list
    // themselves, so the ones that called store.update()/addCoins() — the coin achievements,
    // «Klare Stimme» — unlocked in total silence.
    // Every achievement is spaced out on one shared clock. Two store writes in the same moment —
    // finishing an exam pays XP and coins separately — each used to schedule its own toast at
    // +600 ms, and the two landed exactly on top of each other.
    for (const a of store.takePending()) {
      const now = Date.now();
      nextAchievementAt = Math.max(nextAchievementAt, now + 600);
      setTimeout(() => achievementToast(a), nextAchievementAt - now);
      nextAchievementAt += 650;
    }
    if (event === "save-failed" && !saveWarned) {
      saveWarned = true;
      toast("Прогресс сейчас сохраняется только в этом браузере — нет связи с сервером. Как появится интернет, он догонит сам.", { icon: "💾", kind: "warn", ms: 9000, title: "Сохранение" });
    }
  });
  renderSidebarStats();
  window.addEventListener("hashchange", route);
  document.addEventListener("click", () => { try { speech.germanVoices(); } catch {} }, { once: true });
  route();
  const loader = $("#loader");
  loader.classList.add("hide");
  setTimeout(() => loader.remove(), 700);
  // …но не поверх экранов, на которые человек пришёл осознанно: тест уровня, вход, новый пароль.
  // Перезагрузка посреди теста прежде накрывала его этим оверлеем и ответы пропадали.
  const askedElsewhere = /^#\/(test|login|password)/.test(location.hash);
  // Предложение перенести прогресс нельзя «съесть» приветствием.
  //
  // Раньше это была одна цепочка else if: у нового человека сперва показывался выбор уровня, а
  // предложение — нет. После выбора introSeen становился true, опыт оставался нулевым, и на
  // следующем заходе условие вроде бы снова срабатывало… но только если человек не начал
  // заниматься. Начал — xp стал больше нуля, и всё заработанное без аккаунта пропадало навсегда.
  // Теперь приветствие само зовёт предложение, когда закончится.
  if (!store.state.introSeen && !askedElsewhere) showWelcome();
  else if (store.guestOffer) askGuestTransfer();
  else if (store.dailyBonus) {
    const b = store.dailyBonus;
    setTimeout(() => toast(tr`+${b.coins} монет за ${b.streak}-й день подряд`, { icon: "🪙", title: "Ежедневный бонус" }), 900);
  }
}

/**
 * «В этом браузере есть прогресс без аккаунта — перенести?»
 *
 * Появляется, когда в аккаунте пусто, а в браузере лежит непустой гостевой сейв. Так бывает
 * чаще, чем кажется: письмо с подтверждением открывают на телефоне, первый вход происходит там,
 * на сервере заводится пустая строка — а всё заработанное остаётся на компьютере.
 *
 * Именно вопрос, а не тихий перенос: на общем компьютере молчаливое «взять что лежит» отдало бы
 * чужой прогресс следующему вошедшему. Отказ запоминается — переспрашивать каждый заход хуже,
 * чем не спросить вовсе.
 */
function askGuestTransfer() {
  const guest = store.guestOffer;
  if (!guest) return;
  const who = session.user?.id;

  const close = () => { box.remove(); document.removeEventListener("keydown", onEsc); };
  // Escape закрывает окно, но НЕ считается отказом: случайное нажатие не должно
  // навсегда лишать человека его же прогресса. Отказ — это только кнопка «Не надо».
  const onEsc = (e) => { if (e.key === "Escape") close(); };

  const box = el("div", { class: "modal-back" },
    el("div", { class: "modal-card" },
      el("h2", {}, "Перенести прогресс в аккаунт?"),
      el("p", { class: "muted" }, tr`В этом браузере остались занятия без аккаунта: ${guest.xp} XP и ${Object.keys(guest.levels || {}).length} ${plural(Object.keys(guest.levels || {}).length, "урок", "урока", "уроков")}. В самом аккаунте пока пусто.`),
      el("p", { class: "muted small" }, "Если компьютер общий и это занимался не ты — откажись: чужой прогресс тебе не нужен."),
      el("div", { class: "row-btns" },
        el("button", { class: "btn primary", type: "button", onClick: () => {
          store.adopt(guest);
          // И убираем гостевой сейв: он уже в аккаунте. Оставшись лежать, он предлагался бы
          // каждому следующему, кто войдёт в этом браузере.
          store.clearGuestSave();
          close();
          toast(tr`Перенесено: ${guest.xp} XP`, { icon: "📥" });
          route();
        } }, "Перенести"),
        el("button", { class: "btn ghost", type: "button", onClick: () => { refuseGuestOffer(who); close(); } }, "Не надо"),
      ),
    ),
  );
  document.addEventListener("keydown", onEsc);
  document.body.append(box);
}

/* ---------------------------------------------------------------- router */
/**
 * Navigate. `replace` swaps the current history entry instead of adding one — used when a session
 * is finished, so pressing Back does not drop Emil straight back into the exercise he just passed.
 */
function go(hash, { replace = false } = {}) {
  if (replace) location.replace(location.pathname + location.search + hash);
  else location.hash = hash;
}


/* ------------------------------------------------------- тренировка (hub) */

/**
 * Everything that is practice rather than a lesson, in one place and sorted by what it trains.
 * The games used to sit in a flat grid of five where nothing told Emil what any of them was for.
 */
const GAME_GROUPS = [
  { id: "words", title: "Слова", sub: "Узнавать и вспоминать", games: ["memory", "blitz"] },
  { id: "writing", title: "Правописание", sub: "Как слово пишется", games: ["scramble", "hangman"] },
  { id: "grammar", title: "Грамматика", sub: "Артикли и формы", games: ["articles"] },
];

function viewPractice(v) {
  const unlocked = LEVELS.filter((l) => store.isUnlocked(l.id));
  const pool = unlocked.flatMap((l) => l.vocab);
  const due = store.dueCount(pool);
  const games = gameCatalogue();

  append(v,
    el("div", { class: "page-head" },
      el("h1", {}, "🎯 Тренировка"),
      el("p", { class: "muted" }, "Короткие упражнения на словах, которые ты уже открыл. Пара минут — и слова держатся крепче."),
    ),
    el("section", { class: "practice-top" },
      el("a", { class: "card practice-hero", href: "#/review" },
        el("div", { class: "practice-hero-icon" }, "🔁"),
        el("div", {},
          el("div", { class: "cta-kicker" }, "Интервальное повторение"),
          el("div", { class: "big-cta-title" }, due ? `${due} ${plural(due, "слово ждёт", "слова ждут", "слов ждут")}` : "Повторить слова"),
          el("div", { class: "cta-sub" }, due
            ? "Это те, что ты начал забывать. Чем раньше вернёшься, тем дешевле."
            : "Пока ничего не горит — можно просто пройтись по словам."),
        ),
        el("div", { class: "cta-arrow" }, "→"),
      ),
      el("a", { class: "card practice-side", href: "#/words" },
        el("div", { class: "practice-hero-icon" }, "📚"),
        el("div", {},
          el("div", { class: "big-cta-title" }, `${pool.length}`),
          el("div", { class: "cta-sub" }, "слов открыто — посмотреть весь словарь"),
        ),
      ),
    ),
    ...GAME_GROUPS.map((group) => {
      const items = group.games.map((id) => games.find((g) => g.id === id)).filter(Boolean);
      if (!items.length) return null;
      return el("section", { class: "practice-group" },
        el("div", { class: "card-head" }, el("h2", {}, group.title), el("span", { class: "muted small" }, group.sub)),
        el("div", { class: "game-grid" }, items.map((g) => {
          const blocked = g.ready ? g.ready() : null;
          const best = store.state.games?.[g.id]?.best ?? 0;
          return el("a", { class: `game-card${blocked ? " locked" : ""}`, href: blocked ? null : `#/games/${g.id}`, title: blocked || "" },
            el("div", { class: "game-card-icon" }, blocked ? "🔒" : g.icon),
            el("div", { class: "game-card-body" },
              el("div", { class: "game-card-name" }, g.name),
              el("div", { class: "game-card-desc" }, g.desc),
              el("div", { class: "game-card-best" }, blocked ? tr`🔒 ${blocked}` : best ? tr`${g.label || "Рекорд"} ${best}${typeof g.unit === "function" ? g.unit(best) : g.unit}` : "Ещё не играл"),
            ));
        })));
    }),
  );
}

/* ----------------------------------------------------------------- рейтинг */

const BOARD_TABS = [
  { id: "xp", title: "Опыт", icon: "⚡", value: (r) => r.xp, fmt: (n) => `${n} XP` },
  { id: "streak", title: "Серия", icon: "🔥", value: (r) => r.streak, fmt: (n) => `${n} ${plural(n, "день", "дня", "дней")}` },
  { id: "levels", title: "Уроки", icon: "🗺️", value: (r) => r.levels, fmt: (n) => `${n} ${plural(n, "урок", "урока", "уроков")}` },
  { id: "words", title: "Слова", icon: "📚", value: (r) => r.words, fmt: (n) => `${n} ${plural(n, "слово", "слова", "слов")}` },
];

function viewBoard(v) {
  let tab = "xp";
  const host = el("div", { class: "board-host" }, el("div", { class: "muted" }, "Загружаю таблицу…"));
  const tabsRow = el("div", { class: "board-tabs" });

  const paint = (data) => {
    tabsRow.innerHTML = "";
    const games = gameCatalogue().map((g) => ({
      // Без .replace(). Он срезал всё до первого пробела — писался, когда эмодзи стояло в самом
      // названии («🧩 Память»), но эмодзи давно живёт в отдельном поле icon. Из пяти названий
      // пробелы есть ровно у одного — «der · die · das», — и на вкладке рейтинга от него
      // оставалось «· die · das».
      id: `game:${g.id}`, title: g.name, icon: g.icon,
      value: (r) => Number(r.games?.[g.id]?.best) || 0,
      fmt: (n) => `${n}${typeof g.unit === "function" ? g.unit(n) : g.unit}`,
    }));
    const all = [...BOARD_TABS, ...games];
    for (const t of all) {
      tabsRow.append(el("button", { class: `board-tab ${t.id === tab ? "on" : ""}`, type: "button",
        onClick: () => { tab = t.id; paint(data); } }, tr`${t.icon} ${t.title}`));
    }
    const t = all.find((x) => x.id === tab) || all[0];
    const rows = data.rows.slice().map((r) => ({ ...r, v: t.value(r) })).filter((r) => r.v > 0).sort((a, b) => b.v - a.v);
    host.innerHTML = "";
    if (!rows.length) {
      host.append(el("div", { class: "empty-state" },
        el("div", { class: "empty-icon" }, "🏆"),
        el("div", {}, data.total ? "Здесь пока пусто — этот рейтинг никто ещё не начал." : "Пока в таблице никого. Зарегистрируйся — и будешь первым."),
      ));
      return;
    }
    host.append(el("div", { class: "board-list" }, rows.map((r, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1);
      // `r.id` приходит только у твоей строки — у остальных он null. Сравнивать голым `===`
      // нельзя: у гостя `data.me` тоже null, и «это ты» загоралось бы у всех сразу.
      const mine = Boolean(r.id) && r.id === data.me;
      return el("div", { class: `board-row ${mine ? "me" : ""}` },
        el("div", { class: "board-place" }, medal),
        el("div", { class: "board-who" },
          el("div", { class: "board-name" }, r.name, mine ? el("span", { class: "board-you" }, "это ты") : null),
          el("div", { class: "board-sub muted small" }, `${r.cefr} · ${r.levels} ${plural(r.levels, "урок", "урока", "уроков")}`),
        ),
        el("div", { class: "board-val" }, t.fmt(r.v)),
      );
    })));
  };

  append(v,
    el("div", { class: "page-head" },
      el("h1", {}, "🏆 Рейтинг"),
      el("p", { class: "muted" }, "Все, кто занимается на этом сайте. Попасть сюда можно только с аккаунтом — и только если ты сам этого захотел."),
    ),
    session.guest ? el("div", { class: "card cta-join" },
      el("div", {}, el("strong", {}, "Ты занимаешься без аккаунта."), el("div", { class: "muted small" }, "Заведи его — и твой прогресс попадёт в таблицу, а заодно не потеряется.")),
      el("a", { class: "btn primary", href: "#/login" }, "Создать аккаунт"),
    ) : null,
    tabsRow,
    host,
  );

  backend.leaderboard()
    .then(paint)
    .catch(() => { host.innerHTML = ""; host.append(el("div", { class: "muted" }, "Не получилось загрузить таблицу — нет связи с сервером.")); });
}

/* ------------------------------------------------------------------- вход */

function viewLogin(v) {
  if (session.user) return go("#/profile", { replace: true });
  renderAuth(v, {
    localXp: store.state.xp || 0,
    // Carry what this browser has earned into the brand-new account. It runs before the reload,
    // while the guest state is still the one in memory.
    adoptLocal: async () => {
      store.state.savedAt = Date.now();
      await backend.saveProgress(store.state).catch(() => {});
    },
    onDone: (user) => {
      if (!user) return go("#/", { replace: true });
      // the account has its own save — reload so every view is built from it and nothing from the
      // guest session leaks across
      location.href = location.pathname + "#/";
      location.reload();
    },
  });
}


/* ------------------------------------------------------------------ админка */

/**
 * The owner's panel: the key, who is here, and the two switches worth having.
 *
 * Not linked from anywhere a normal account can see, and the function behind it refuses anyone
 * who is not an admin anyway — the hidden link is convenience, the check is the security.
 */
function viewAdmin(v) {
  if (!session.isAdmin) {
    append(v, el("div", { class: "empty-state" },
      el("div", { class: "empty-icon" }, "🔒"),
      el("div", {}, "Эта страница не для тебя."),
      el("a", { class: "btn ghost", href: "#/" }, "На главную")));
    return;
  }

  const host = el("div", {}, el("div", { class: "muted" }, "Загружаю…"));
  append(v,
    el("div", { class: "page-head" },
      el("h1", {}, "⚙️ Панель управления"),
      el("p", { class: "muted" }, "Видишь только ты. Здесь ключ Мии, люди и то, что с ними можно сделать.")),
    host,
  );

  const load = () => backend.admin("overview").then(paint).catch((e) => {
    host.innerHTML = "";
    host.append(el("div", { class: "card" }, el("div", { class: "muted" }, e.message)));
  });

  const paint = (d) => {
    host.innerHTML = "";

    /* --- ключ --- */
    const keyInput = el("input", { class: "auth-input", type: "password", placeholder: "sk-ant-…", autocomplete: "off", spellcheck: "false" });
    const keyMsg = el("div", { class: "auth-msg" });
    const save = el("button", { class: "btn primary", type: "button", onClick: async () => {
      const value = keyInput.value.trim();
      if (!value) { keyMsg.className = "auth-msg bad"; keyMsg.textContent = tr("Вставь ключ в поле."); return; }
      save.disabled = true;
      keyMsg.className = "auth-msg";
      keyMsg.textContent = tr("Проверяю ключ у Anthropic…");
      try {
        const out = await backend.admin("setKey", { key: value });
        if (out.error) throw new Error(out.error);
        keyInput.value = "";
        keyMsg.className = "auth-msg ok";
        keyMsg.textContent = tr("Ключ принят и сохранён. Обновляю страницу, чтобы Мия его подхватила…");
        // AI вычисляется один раз при загрузке из /api/status — без перезагрузки панель говорила
        // «Мия уже отвечает», а Мия продолжала отвечать офлайн.
        setTimeout(() => location.reload(), 1200);
      } catch (e) {
        keyMsg.className = "auth-msg bad";
        keyMsg.textContent = tr(e.message);
      }
      save.disabled = false;
    } }, "Проверить и сохранить");

    host.append(el("section", { class: "card" },
      el("div", { class: "card-head" },
        el("h2", {}, "🤖 Ключ Anthropic"),
        el("span", { class: d.hasKey ? "badge ai" : "badge offline" }, d.hasKey ? "подключён" : "нет ключа")),
      el("p", { class: "muted small" }, d.keyFromEnv
        ? "Ключ задан переменной ANTHROPIC_API_KEY в настройках Netlify. Она главнее того, что вводится здесь, — чтобы поменять, правь переменную."
        : "Свободный разговор Мии работает через Claude. Ключ берётся в консоли Anthropic, хранится в базе и в браузер никогда не отдаётся — здесь видно только, есть он или нет."),
      d.keyFromEnv ? null : el("div", { class: "auth-form", style: { marginTop: "12px" } },
        keyInput,
        el("div", { class: "account-actions" },
          save,
          d.hasKey ? el("button", { class: "btn ghost small", type: "button", onClick: async () => {
            if (!confirm(tr("Убрать ключ? Мия вернётся к офлайн-словарю."))) return;
            await backend.admin("clearKey").catch(() => {});
            load();
          } }, "Убрать ключ") : null),
        keyMsg),
    ));

    /* --- цифры --- */
    host.append(el("section", { class: "stats-grid" },
      statCard("👥", String(d.stats.total), "аккаунтов"),
      statCard("🟢", String(d.stats.today), "заходили сегодня"),
      statCard("📅", String(d.stats.week), "за неделю"),
      statCard("⚡", String(d.stats.xp), "XP у всех вместе"),
    ));

    /* --- люди --- */
    const rows = d.users.slice().sort((a, b) => b.xp - a.xp);
    host.append(el("section", { class: "card" },
      el("div", { class: "card-head" }, el("h2", {}, "👥 Люди"), el("span", { class: "muted small" }, `${rows.length}`)),
      el("div", { class: "board-list" }, rows.map((u) => {
        const act = (payload, ok) => async (e) => {
          e.currentTarget.disabled = true;
          try { await backend.admin("setUser", { id: u.id, ...payload }); toast(ok, { icon: "⚙️" }); load(); }
          catch (err) { toast(err.message, { icon: "⚠️", kind: "warn" }); e.currentTarget.disabled = false; }
        };
        return el("div", { class: `board-row ${u.id === session.user?.id ? "me" : ""}` },
          el("div", { class: "board-place" }, u.isAdmin ? "⚙️" : u.blocked ? "🚫" : "·"),
          el("div", { class: "board-who" },
            el("div", { class: "board-name" }, u.name,
              u.isAdmin ? el("span", { class: "board-you" }, "админ") : null,
              u.blocked ? el("span", { class: "board-you", style: { background: "rgba(251,113,133,.3)" } }, "заблокирован") : null),
            el("div", { class: "board-sub muted small" },
              // plural() переводит сам, а вот «был» и «ещё не занимался» приклеивались к строке
              // сырыми: склеенный текст уникален из-за даты, ключом словаря быть не может, и
              // el() его не переводил. Переводим эти два куска до склейки.
              `${u.cefr} · ${u.xp} XP · ${u.levels} ${plural(u.levels, "урок", "урока", "уроков")} · ${u.lastSeen ? tr`был ${new Date(u.lastSeen).toLocaleDateString(langInfo().speech)}` : tr("ещё не занимался")}`)),
          el("div", { class: "account-actions" },
            u.id === session.user?.id ? el("span", { class: "muted small" }, "это ты") : el("button",
              { class: "btn ghost small", type: "button", onClick: act({ blocked: !u.blocked }, u.blocked ? "Разблокирован" : "Заблокирован") },
              u.blocked ? "Разблокировать" : "Заблокировать"),
            u.id === session.user?.id ? null : el("button",
              { class: "btn ghost small", type: "button", onClick: act({ isAdmin: !u.isAdmin }, u.isAdmin ? "Права сняты" : "Теперь админ") },
              u.isAdmin ? "Снять админа" : "Сделать админом"),
          ));
      })),
    ));

    /* --- что фильтруется --- */
    host.append(el("section", { class: "card" },
      el("div", { class: "card-head" }, el("h2", {}, "🛡️ Фильтр содержимого")),
      el("p", { class: "muted small" }, "Работает всегда и выключить его нельзя. Сообщение отсеивается ещё до обращения к Claude, так что запрещённое не стоит ни копейки."),
      el("div", { class: "board-tabs", style: { marginTop: "10px" } },
        ["Порно и эротика", "Азартные игры", "Расизм и вражда", "Насилие и оружие", "Наркотики", "Политика и войны", "Мат в ответах"]
          .map((t) => el("span", { class: "board-tab on" }, t))),
      el("p", { class: "muted small", style: { marginTop: "10px" } },
        "Просьбы вида «как будет …» и «что значит …» не блокируются: спросить перевод грубого слова — это словарь, а не нарушение. Разговор о том, как устроены ведомства, страховка и договоры, политикой не считается."),
    ));
  };

  load();
}


/* ------------------------------------------------------------ тест уровня */

function viewPlacement(v) {
  renderPlacement(v, {
    onExit: () => go("#/", { replace: true }),
    onDone: () => {
      // прогресс уже записан внутри теста — остаётся отвести туда, где начинать
      const from = CEFR_FIRST[store.state.cefrClaim] || 1;
      go(`#/level/${from}`, { replace: true });
    },
  });
}

/*
 * Какая отрисовка сейчас главная.
 *
 * route() стал асинхронным — он ждёт словарь урока, — и это открыло гонку: человек нажал «Уроки»,
 * не дождался и нажал «Мия»; вторая отрисовка успевает первой, а потом приезжает словарь и первая
 * дорисовывает СВОЙ экран поверх уже показанного. Номер обхода решает спор: всё, что пришло с
 * устаревшим номером, молча прекращается.
 */
let routeSeq = 0;

async function route() {
  const seq = ++routeSeq;
  cleanup?.();
  cleanup = null;
  speech.stop();
  speech.abortListening();
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [a, b, c, d] = parts;
  const v = view();
  v.className = "view";
  v.innerHTML = "";
  v.style.removeProperty("--accent");
  window.scrollTo({ top: 0 });
  let routeName = a || "home";
  if (["games", "words", "review", "shop"].includes(routeName)) routeName = routeName === "shop" ? "profile" : "practice";
  let focus = false;
  try {
    if (!a) renderHome(v);
    else if (a === "levels") renderLevels(v);
    else if (a === "level") {
      routeName = "levels";
      const level = LEVEL_BY_ID[Number(b)];
      if (!level) return go("#/levels");
      // Словарь этого урока — до отрисовки, иначе человек увидит русский текст, который через
      // мгновение подменится. На русском это не стоит ничего: словарей там нет вовсе.
      await loadLevelDict(level.id, level);
      if (seq !== routeSeq) return;
      if (!store.isUnlocked(level.id)) renderLocked(v, level);
      else if (!c) renderLevel(v, level);
      else {
        focus = true;
        if (c === "vocab") viewVocab(v, level);
        else if (c === "quiz") viewQuiz(v, level);
        else if (c === "grammar") { focus = false; viewGrammar(v, level); }
        else if (c === "mission") viewMission(v, level, Number(d) || 1);
        else if (c === "dialogue") viewDialogue(v, level);
        else if (c === "speak") { await loadBrainDict(); if (seq !== routeSeq) return; viewSpeak(v, level); }
        else if (c === "oral") { await loadBrainDict(); if (seq !== routeSeq) return; viewTalk(v, level, "exam"); }
        else if (c === "chat") { await loadBrainDict(); if (seq !== routeSeq) return; viewTalk(v, level, "topic"); }
        else if (c === "exam") viewExam(v, level);
        else return go(`#/level/${level.id}`);
      }
    // Словарь офлайн-Мии начал грузиться ещё на старте и к этому моменту почти наверняка уже здесь.
    // Ждём его только тут — там, где он действительно нужен.
    // Мия говорит о любом выученном слове и о любом правиле — значит ей нужны словари всех
    // открытых уроков, а не только свой собственный. Иначе офлайн-ответы про слова и
    // грамматику выходят по-русски посреди азербайджанского экрана.
    } else if (a === "tutor") {
      focus = true;
      await Promise.all([loadBrainDict(), loadLevelDicts(LEVELS.filter((l) => store.isUnlocked(l.id)))]);
      if (seq !== routeSeq) return;
      viewTutor(v);
    }
    else if (a === "practice") { await loadLevelDicts(LEVELS.filter((l) => store.isUnlocked(l.id))); if (seq !== routeSeq) return; viewPractice(v); }
    else if (a === "board") viewBoard(v);
    else if (a === "login") { focus = true; viewLogin(v); }
    else if (a === "password") { focus = true; renderNewPassword(v, { onDone: () => go("#/profile") }); }
    else if (a === "admin") { routeName = "profile"; viewAdmin(v); }
    else if (a === "test") { focus = true; viewPlacement(v); }
    // Игры, словарь и повторение берут слова из всех открытых уроков — значит и словари нужны всех открытых.
    else if (a === "games") { await loadLevelDicts(LEVELS.filter((l) => store.isUnlocked(l.id))); if (seq !== routeSeq) return; viewGames(v, b); }
    else if (a === "shop") renderShop(v);
    else if (a === "words") { await loadLevelDicts(LEVELS.filter((l) => store.isUnlocked(l.id))); if (seq !== routeSeq) return; renderWords(v); }
    else if (a === "review") { focus = true; await loadLevelDicts(LEVELS.filter((l) => store.isUnlocked(l.id))); if (seq !== routeSeq) return; viewReview(v); }
    else if (a === "profile") renderProfile(v);
    else return go("#/");
  } catch (e) {
    console.error(e);
    v.append(el("div", { class: "card error" }, el("h2", {}, "Ошибка"), el("pre", {}, String(e?.stack || e))));
  }
  document.body.classList.toggle("focus", focus);
  // move focus into the fresh view: otherwise it stays on whatever was clicked, and the first Tab
  // jumps somewhere unrelated. tabindex -1 keeps it out of the normal tab order.
  if (v.getAttribute("tabindex") === null) v.setAttribute("tabindex", "-1");
  nextTick(() => { try { v.focus({ preventScroll: true }); } catch {} });
  $$("#nav a").forEach((x) => x.classList.toggle("active", x.dataset.route === routeName));
  nextTick(() => v.classList.add("enter"));
}

/* --------------------------------------------------------------- sidebar */
function renderSidebarStats() {
  const host = $("#sidebar-stats");
  if (!host) return;
  const s = store.state;
  const { cur, next, pct } = store.rank();
  host.innerHTML = "";
  host.append(...[
    el("div", { class: "ss-row" }, el("span", { class: "ss-icon" }, "🔥"), el("span", {}, `${s.streak.count} ${plural(s.streak.count, "день", "дня", "дней")}`)),
    el("div", { class: "ss-row" }, el("span", { class: "ss-icon" }, "⚡"), el("span", {}, `${s.xp} XP`)),
    el("div", { class: "ss-row coins" }, el("span", { class: "ss-icon" }, "🪙"), el("span", {}, `${s.coins} ${plural(s.coins, "монета", "монеты", "монет")}`)),
    el("div", { class: "ss-rank" },
      el("div", { class: "ss-rank-title" }, `${cur.icon} ${cur.title}`, next ? el("span", { class: "muted" }, ` → ${next.title}`) : null),
      el("div", { class: "progress-track slim" }, el("div", { class: "progress-bar", style: { width: pct + "%" } })),
    ),
    store.boostActive() ? el("div", { class: "ss-boost" }, tr`⚡ XP ×2 ещё ${Math.ceil((s.boostUntil - Date.now()) / 60000)} мин`) : null,
    el("div", { class: `ss-ai ${AI ? "on" : ""}` }, AI ? "● Мия: умный режим" : "○ Мия: обычный режим"),
  ].filter(Boolean));
}

/* --------------------------------------------------------------- helpers */
function nextAction() {
  for (const L of activeLevels()) {
    if (!store.isUnlocked(L.id)) break;
    const p = store.level(L.id);
    if (!p.vocabDone) return { level: L, icon: "📖", label: "Выучить новые слова", route: `#/level/${L.id}/vocab` };
    if (!p.grammarDone) return { level: L, icon: "🧠", label: "Разобрать грамматику", route: `#/level/${L.id}/grammar` };
    const m = p.missions.findIndex((x) => !x);
    if (m >= 0) return { level: L, icon: "🎯", label: tr`Миссия ${m + 1}`, route: `#/level/${L.id}/mission/${m + 1}` };
    if (!p.dialogueDone) return { level: L, icon: "🎧", label: "Диалог", route: `#/level/${L.id}/dialogue` };
    if (!p.speakingDone) return { level: L, icon: "🗣️", label: "Поговорить с Мией", route: `#/level/${L.id}/speak` };
    if (p.examBest < 70) return { level: L, icon: "🏆", label: "Сдать экзамен уровня", route: `#/level/${L.id}/exam` };
  }
  return { level: null, icon: "📚", label: "Повторить все слова", route: "#/review" };
}

/**
 * The lessons he is actually working through, in order.
 *
 * Someone who said "I already speak some German" starts at the first lesson of his band, not at
 * "Hallo, ich heiße". The earlier bands stay open behind him — he can always drop back — but
 * "continue" has to mean the lesson he is on, not the one the list happens to begin with.
 */
function activeLevels() {
  const from = CEFR_FIRST[store.state.cefrClaim] || 1;
  const own = LEVELS.filter((l) => l.id >= from);
  // …unless he went back and is part-way through an earlier lesson; then that is where he is.
  const behind = LEVELS.find((l) => l.id < from && store.isUnlocked(l.id) && !store.isCompleted(l.id) && store.levelProgress(l.id) > 0);
  return behind ? [behind, ...own] : own;
}

function currentLevel() {
  return activeLevels().find((l) => store.isUnlocked(l.id) && !store.isCompleted(l.id)) || LEVELS[LEVELS.length - 1];
}

/**
 * Ask the server to synthesise a screen's lines ahead of time so playback is instant.
 *
 * Takes `{ text, rate, lang }` entries, not bare strings: the speed is part of the cache key, so a
 * line warmed at the wrong speed is simply a different file and Emil still waits for the
 * synthesiser. `rate` must be the very same RATES.* value the screen will play the line at.
 */
/**
 * Warm every German line an exercise screen can speak, at both speeds it uses: a listening item
 * plays through its ▶ box at RATES.listen, and every 🔊 replays at RATES.example. The speed is part
 * of the cache key, so warming only one of them still leaves the other waiting on the synthesiser.
 */
function prewarmExercises(list) {
  const items = [];
  for (const x of list) {
    const texts = [x.text, x.answer, x.answers?.[0], x.sentence?.replace("___", x.answers?.[0] ?? ""),
      x.type === "choice" && Array.isArray(x.options) ? x.options[x.answer] : null]
      .filter((t) => typeof t === "string" && /[a-zäöüß]/i.test(t));
    for (const text of texts) {
      items.push({ text, rate: RATES.example });
      if (x.type === "listen") items.push({ text, rate: RATES.listen });
    }
  }
  prewarm(items);
}

const prewarmed = new Set();
/**
 * Pull the lines a screen is about to speak into the browser cache.
 *
 * Almost the whole course is synthesised once by tools/pregen-audio.mjs and lives in a public
 * bucket, so warming means nothing more than asking the CDN for the file early. A line that is NOT
 * there yet is deliberately skipped: calling the synthesis function for something nobody has
 * played would spend money on audio that may never be heard.
 */
function prewarm(items) {
  const st = store.state.settings;
  if (st.neural === false || st.tts === false) return;
  if (st.voice && !String(st.voice).includes("Neural")) return; // a browser voice needs no files
  for (const it of items) {
    const text = typeof it === "string" ? it : it?.text;
    if (!text) continue;
    const rate = (typeof it === "object" && it.rate) || st.rate || 0.92;
    const lang = typeof it === "object" && String(it.lang || "").startsWith("ru") ? NATIVE_LOCALE : "de-DE";
    const plan = speech.plan(text, { rate, lang });
    if (prewarmed.has(plan.key)) continue;
    prewarmed.add(plan.key);
    speech.cdnUrl(plan).then((url) => {
      if (url) fetch(url, { mode: "cors", cache: "force-cache" }).catch(() => {});
    }).catch(() => {});
  }
}


/**
 * One-time microphone card: the browser can only grant the mic from a real click, so we ask once here.
 * Chrome and Edge remember the grant for localhost, and Emil is never prompted again.
 */
function micCard() {
  if (!speech.sttSupported || speech.micGranted || micState === "granted") return null;
  const card = el("section", { class: "card mic-card" });
  const btn = el("button", { class: "btn primary", type: "button", onClick: async () => {
    btn.disabled = true;
    btn.textContent = tr("Запрашиваю…");
    const ok = await speech.requestMic();
    micState = ok ? "granted" : "denied";
    if (ok) {
      sfx.correct();
      toast("Микрофон разрешён — теперь можно говорить с Мией", { icon: "🎤" });
      card.remove();
    } else {
      btn.disabled = false;
      btn.textContent = tr("Разрешить микрофон");
      card.querySelector(".mic-card-text").textContent =
        "Браузер отказал. Нажми на значок замка слева в адресной строке → «Микрофон» → «Разрешить», затем обнови страницу.";
    }
  } }, "🎤 Разрешить микрофон");
  append(card,
    el("div", { class: "mic-card-icon" }, "🎤"),
    el("div", {},
      el("div", { class: "cta-title" }, "Включи микрофон один раз"),
      el("div", { class: "mic-card-text muted" }, "Разговоры с Мией, произношение и диалоги работают через микрофон. Браузер спросит разрешение один раз и запомнит его."),
    ),
    btn,
  );
  return card;
}


/**
 * One-field setup for the smart Mia: Emil pastes the key here, the server checks it,
 * saves it and switches on immediately — no files, no restart.
 */
/**
 * Why the smart mode is off, and what to do about it.
 *
 * On the old local server Emil could paste a key and the server wrote it to .env. There is no file
 * to write to now — the key is an environment variable on Netlify — so pretending otherwise would
 * just be a form that never works. It says what is true instead.
 */
/**
 * Shown when Mia has no model behind her.
 *
 * For an ordinary person this is a fact about the app, not a task: telling them about environment
 * variables and API keys is noise they can do nothing with. The owner gets the panel instead.
 */
export function aiKeyCard({ compact = false } = {}) {
  if (!session.isAdmin) {
    // Nothing for them to do, so do not put a card in their way at all.
    if (compact) return null;
    return el("section", { class: `card key-card ${compact ? "compact" : ""}` },
      el("div", { class: "card-head" }, el("h2", {}, "💬 Мия сейчас без интернета")),
      el("p", { class: "muted small" },
        "Она отвечает из своего словаря: объясняет слова и грамматику, ведёт разговоры по урокам и рассказывает про Германию. ",
        "Свободная беседа на любые темы появится, когда сайту включат её."),
    );
  }
  return el("section", { class: `card key-card ${compact ? "compact" : ""}` },
    el("div", { class: "card-head" }, el("h2", {}, "🤖 Свободный разговор выключен")),
    el("p", { class: "muted small" }, "У сайта нет ключа Anthropic. Вставь его в панели — проверю и сохраню."),
    el("a", { class: "btn primary small", href: "#/admin", style: { marginTop: "10px" } }, "⚙️ Открыть панель"),
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Gute Nacht";
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Single place where XP and coins are granted outside an exercise session: goes through addXp so the daily goal counts it. */
function reward({ xp = 0, coins = 0, label = "", icon = "✨" }) {
  const gainedXp = Math.round(xp * store.xpMultiplier());
  let gainedCoins = 0;
  store.update(() => { gainedCoins = store.addCoins(coins); });
  const unlocked = store.addXp(gainedXp);
  const parts = [];
  if (gainedXp) parts.push(`+${gainedXp} XP`);
  if (gainedCoins) parts.push(`+${gainedCoins} 🪙`);
  if (parts.length) toast(`${label ? label + " · " : ""}${parts.join(" · ")}`, { icon });
  return unlocked;
}

function statCard(icon, val, label, cls = "") {
  return el("div", { class: `card stat-card ${cls}` }, el("div", { class: "stat-icon" }, icon), el("div", { class: "stat-main" }, el("div", { class: "stat-val" }, val), el("div", { class: "stat-label" }, label)));
}

const KIND_SHORT = { choice: "выбор", fill: "пропуски", translate: "перевод", order: "порядок слов", match: "пары", listen: "аудирование", speak: "произношение" };

/* --------------------------------------------------------------- welcome */

/**
 * The very first screen, and the only question the app ever asks before letting someone in:
 * how much German do you already have?
 *
 * The course runs from A1 to B1, and making somebody who already speaks some German sit through
 * "Hallo, ich heiße…" is the fastest way to lose them. The answer also tells Mia how hard her
 * German may be, so it is worth asking properly instead of guessing.
 */
function showWelcome() {
  const overlay = el("div", { class: "prologue" });
  const choose = (band) => {
    store.update((s) => { s.introSeen = true; });
    store.claimCefr(band, { allowLower: true });
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 600);
    sfx.levelUp();
    route();
    // …и теперь очередь предложения перенести прогресс, если оно есть.
    if (store.guestOffer) setTimeout(() => askGuestTransfer(), 700);
    toast(band === "A1"
      ? "Начинаем с самого начала. Первый урок открыт!"
      : tr`Открыл уроки с уровня ${band}. Передумаешь — поменяешь в кабинете.`, { icon: "🎓", ms: 5000 });
  };
  append(overlay,
    el("div", { class: "prologue-inner" },
      // Первое, что видит человек, впервые открывший сайт. Если он азербайджаноязычный, ему
      // нужно суметь переключиться раньше, чем он прочтёт вопрос — поэтому выбор языка стоит
      // над вопросом, а не в кабинете, до которого ещё надо дойти.
      langSwitch({ compact: true }),
      el("div", { class: "prologue-emoji" }, "🎓"),
      el("div", { class: "prologue-kicker" }, "Lingua Mia"),
      el("h1", {}, "Сколько немецкого у тебя уже есть?"),
      el("p", { class: "welcome-text" }, "От этого зависит, с какого урока начать — и как Мия будет с тобой говорить. Поменять можно в любой момент в кабинете."),
      el("div", { class: "level-choice" },
        [["A1", "Совсем с нуля", "Не знаю ни одного слова или помню пару фраз."],
         ["A2", "Немного знаю", "Могу представиться, заказать кофе, понять простое предложение."],
         ["B1", "Уже говорю", "Держу бытовой разговор, но хочу свободнее и без ошибок."]]
          .map(([band, title, sub]) => el("button", { class: "card level-choice-btn", type: "button", onClick: () => choose(band) },
            el("div", { class: "cefr-badge" }, band),
            el("div", {}, el("div", { class: "cefr-name" }, title), el("div", { class: "muted small" }, sub)))),
        // Most people genuinely do not know, and guessing wrong costs them weeks either way.
        el("button", { class: "card level-choice-btn test", type: "button", onClick: () => {
          overlay.classList.remove("show");
          setTimeout(() => overlay.remove(), 500);
          go("#/test");
        } },
          el("div", { class: "cefr-badge test" }, "?"),
          el("div", {}, el("div", { class: "cefr-name" }, "Не знаю"), el("div", { class: "muted small" }, "Пройду короткий тест — 18 вопросов, минуты три."))),
      ),
    ),
  );
  document.body.append(overlay);
  nextTick(() => overlay.classList.add("show"));
}

async function typewriter(node, text, ms, isSkipped = () => false) {
  node.classList.add("show");
  for (let i = 0; i <= text.length; i++) {
    if (!node.isConnected || isSkipped()) return;
    node.textContent = tr(text.slice(0, i));
    await sleep(ms);
  }
}

/* ------------------------------------------------------------------ home */
/**
 * The home screen.
 *
 * One question answered loudly — "what do I do now?" — and then everything else, quietly. It used
 * to show nine competing cards; Emil said his eyes scattered and he could not tell what mattered,
 * and he was right. The rule here is: one big thing, three small ones, a thin line of numbers.
 */
function renderHome(v) {
  const s = store.state;
  const next = nextAction();
  const { cur, next: nextRank, pct } = store.rank();
  const today = s.daily.day === todayKey() ? s.daily.xp : 0;
  const goalPct = Math.min(100, Math.round((today / s.dailyGoal) * 100));
  const band = store.cefrProgress();
  const due = store.dueCount(LEVELS.filter((l) => store.isUnlocked(l.id)).flatMap((l) => l.vocab));
  const title = s.title ? TITLE_NAMES[s.title] : null;
  const name = session.user?.name || s.name || "";

  append(v,
    el("section", { class: "home-hero" },
      el("div", {},
        // Имя может быть пустым — гость, который его не вводил. Тогда и запятая не нужна:
        // «Guten Tag, !» выглядит как поломка, потому что это она и есть.
        el("h1", {}, `${greeting()}${name ? ", " + name : ""}! `, el("span", { class: "wave" }, "👋")),
        el("p", { class: "hero-sub" }, s.streak.count > 1
          ? tr`${s.streak.count} ${plural(s.streak.count, "день", "дня", "дней")} подряд — не бросай.`
          : "Пятнадцать минут сегодня — это уже много."),
      ),
      el("div", { class: "home-level" },
        el("div", { class: "cefr-badge", title: "Твой уровень немецкого" }, band.band),
        el("div", { class: "cefr-meta" },
          el("div", { class: "cefr-name" }, CEFR_TITLE[band.band]),
          el("div", { class: "progress-track slim" }, el("div", { class: "progress-bar", style: { width: Math.round((band.done / band.total) * 100) + "%" } })),
          el("div", { class: "muted small" }, tr`${band.done} из ${band.total} уроков уровня ${band.band}`),
        ),
      ),
    ),

    // The single obvious thing to do next.
    el("a", { class: "big-cta", href: next.route, style: next.level ? { "--accent": next.level.color } : null },
      el("div", { class: "big-cta-text" },
        el("div", { class: "cta-kicker" }, "Продолжить"),
        el("div", { class: "big-cta-title" }, tr`${next.icon} ${next.label}`),
        el("div", { class: "cta-sub" }, next.level ? tr`Урок ${next.level.id} · ${next.level.emoji} ${next.level.titleRu}` : "Курс пройден — закрепляй слова"),
      ),
      el("div", { class: "cta-arrow" }, "→"),
    ),

    el("section", { class: "home-tiles" },
      tile("🎙️", "Поговорить с Мией", AI ? "Обо всём, на любом языке" : "Разговор и подсказки", "#/tutor", "mia"),
      tile("🔁", "Повторить слова", due ? `${due} ${plural(due, "слово ждёт", "слова ждут", "слов ждут")}` : "Держать в памяти", "#/review", "review"),
      tile("🎯", "Тренировка", "Игры и словарь", "#/practice", "practice"),
    ),

    // A thin line of numbers instead of four competing cards.
    el("section", { class: "home-strip" },
      stripItem("🔥", s.streak.count, plural(s.streak.count, "день", "дня", "дней")),
      stripItem("⚡", s.xp, "XP"),
      el("a", { class: "strip-item", href: "#/shop" }, el("span", { class: "strip-icon" }, "🪙"), el("span", { class: "strip-val" }, String(s.coins)), el("span", { class: "strip-label" }, "монет")),
      el("a", { class: "strip-item", href: "#/profile" }, el("span", { class: "strip-icon" }, cur.icon), el("span", { class: "strip-val" }, title || cur.title), el("span", { class: "strip-label" }, nextRank ? tr`${nextRank.xp - s.xp} XP до «${nextRank.title}»` : "выше некуда")),
      el("div", { class: "strip-item goal" },
        el("div", { class: "goal-ring small" }, ringSvg(goalPct, 44, 6), el("div", { class: "goal-pct" }, `${goalPct}%`)),
        el("span", { class: "strip-val" }, `${today}/${s.dailyGoal}`), el("span", { class: "strip-label" }, "цель дня")),
    ),

    micState === "denied" || !speech.sttSupported ? micCard() : null,
    AI ? null : aiKeyCard({ compact: true }),

    // Only the band he is in — a strip of 36 dots is a wall, not a map.
    el("section", { class: "card path-card" },
      el("div", { class: "card-head" }, el("h2", {}, tr`Уровень ${band.band} · ${CEFR_TITLE[band.band]}`), el("a", { class: "link", href: "#/levels" }, "Все уроки →")),
      el("div", { class: "mini-path" }, LEVELS.filter((l) => l.id >= CEFR_FIRST[band.band] && l.id <= CEFR_LAST[band.band]).map((l) => {
        const st = store.isCompleted(l.id) ? "done" : store.isUnlocked(l.id) ? "open" : "locked";
        return el(st === "locked" ? "div" : "a", { class: `mini-node ${st}`, href: st === "locked" ? null : `#/level/${l.id}`, title: `${l.id}. ${l.titleRu}`, style: { "--accent": l.color } }, el("span", {}, st === "locked" ? "🔒" : l.emoji));
      })),
    ),
  );
}

const tile = (icon, title, sub, href, kind) =>
  el("a", { class: `home-tile ${kind}`, href },
    el("div", { class: "tile-icon" }, icon),
    el("div", { class: "tile-title" }, title),
    el("div", { class: "tile-sub" }, sub));

const stripItem = (icon, val, label) =>
  el("div", { class: "strip-item" }, el("span", { class: "strip-icon" }, icon), el("span", { class: "strip-val" }, String(val)), el("span", { class: "strip-label" }, label));

/* ---------------------------------------------------------------- levels */
function renderLevels(v) {
  const band = store.cefr();
  v.append(el("div", { class: "page-head" },
    el("h1", {}, "🗺️ Путь в Германию"),
    el("p", { class: "muted" }, tr`${LEVELS.length} уроков: A1 → A2 → B1. Каждый урок — слова → грамматика → 3 миссии → диалог → разговор с Мией → экзамен. Экзамен на 70% открывает следующий урок.`)));
  // Thirty-six nodes in one column is a wall. Three named stretches with a heading each is a map.
  const path = el("div", { class: "level-path" });
  let shown = null;
  LEVELS.forEach((l, i) => {
    if (l.cefr !== shown) {
      shown = l.cefr;
      const total = LEVELS.filter((x) => x.cefr === shown).length;
      const doneHere = LEVELS.filter((x) => x.cefr === shown && store.isCompleted(x.id)).length;
      path.append(el("div", { class: `band-head ${shown === band ? "now" : ""}` },
        el("div", { class: "cefr-badge small" }, shown),
        el("div", {},
          el("div", { class: "cefr-name" }, CEFR_TITLE[shown]),
          el("div", { class: "muted small" }, tr`${doneHere} из ${total} пройдено`)),
      ));
    }
    const done = store.isCompleted(l.id);
    const open = store.isUnlocked(l.id);
    const current = open && !done;
    const pct = store.levelProgress(l.id);
    const stars = store.stars(l.id);
    const node = el(open ? "a" : "div", { class: `level-node ${done ? "done" : open ? "open" : "locked"} ${current ? "current" : ""} ${i % 2 ? "right" : "left"}`, href: open ? `#/level/${l.id}` : null, style: { "--accent": l.color, "--i": i } },
      el("div", { class: "ln-badge" }, ringSvg(open ? pct : 0, 92, 6, l.color), el("div", { class: "ln-emoji" }, open ? l.emoji : "🔒"), el("div", { class: "ln-num" }, l.id)),
      el("div", { class: "ln-body" },
        el("div", { class: "ln-title" }, l.title),
        el("div", { class: "ln-ru muted" }, l.titleRu),
        el("div", { class: "ln-meta" }, done ? el("span", { class: "stars" }, "★".repeat(stars) + "☆".repeat(3 - stars)) : open ? el("span", { class: "tag" }, current ? tr`${pct}% · в процессе` : "открыт") : el("span", { class: "tag" }, tr`Сдай экзамен уровня ${l.id - 1}`)),
      ),
    );
    path.append(node);
  });
  v.append(path);
}

function renderLocked(v, level) {
  v.append(el("div", { class: "card center" }, el("div", { class: "big-emoji" }, "🔒"), el("h2", {}, tr`Уровень ${level.id} пока закрыт`), el("p", { class: "muted" }, tr`Сдай экзамен уровня ${level.id - 1} минимум на 70%, чтобы открыть «${level.titleRu}».`), el("a", { class: "btn primary", href: `#/level/${level.id - 1}` }, tr`К уровню ${level.id - 1}`)));
}

/* ----------------------------------------------------------------- level */
function renderLevel(v, level) {
  const p = store.level(level.id);
  // warm the voice cache for this level in the background
  prewarm([
    ...level.vocab.slice(0, 8).map((w) => ({ text: w.de, rate: RATES.word })),
    ...level.dialogue.lines.map((l) => ({ text: l.de, rate: l.speaker === "Emil" ? RATES.dialogueAli : RATES.dialogueOther })),
  ]);
  const pct = store.levelProgress(level.id);
  const missions = missionsOf(level);
  const examOpen = p.vocabDone && p.missions.every(Boolean);
  const completed = store.isCompleted(level.id);
  const stars = store.stars(level.id);
  const nextLevel = LEVEL_BY_ID[level.id + 1];
  v.style.setProperty("--accent", level.color);

  const stage = (icon, title, sub, href, { done = false, locked = false, badge = null, hint = null, reward = null } = {}) =>
    el(locked ? "div" : "a", { class: `stage ${done ? "done" : ""} ${locked ? "locked" : ""}`, href: locked ? null : href },
      el("div", { class: "stage-icon" }, locked ? "🔒" : icon),
      el("div", { class: "stage-body" }, el("div", { class: "stage-title" }, title, badge ? el("span", { class: "badge" }, badge) : null), el("div", { class: "stage-sub muted" }, locked && hint ? hint : sub), reward && !done ? el("div", { class: "stage-reward" }, reward) : null),
      el("div", { class: "stage-state" }, done ? "✓" : locked ? "" : "→"),
    );

  append(v,
    el("a", { class: "back", href: "#/levels" }, "← Все уровни"),
    el("section", { class: "level-hero card", style: { "--accent": level.color } },
      el("div", { class: "lh-emoji" }, level.emoji),
      el("div", { class: "lh-text" },
        el("div", { class: "lh-kicker" }, tr`Уровень ${level.id} из ${LEVELS.length}`),
        el("h1", {}, level.title),
        el("div", { class: "lh-ru" }, level.titleRu),
        el("p", { class: "lh-intro" }, level.intro),
        el("ul", { class: "goals" }, level.goals.map((g) => el("li", {}, g))),
      ),
      el("div", { class: "lh-progress" }, ringSvg(pct, 120, 10, level.color), el("div", { class: "lh-pct" }, `${pct}%`), completed ? el("div", { class: "stars big" }, "★".repeat(stars) + "☆".repeat(3 - stars)) : null),
    ),
    completed ? el("div", { class: "card done-banner" }, el("div", {}, tr`🎉 Уровень пройден! Лучший результат экзамена: ${p.examBest}%`), nextLevel ? el("a", { class: "btn primary", href: `#/level/${nextLevel.id}` }, tr`Уровень ${nextLevel.id}: ${nextLevel.titleRu} →`) : el("a", { class: "btn primary", href: "#/practice" }, "Закрепить слова →")) : null,
    el("div", { class: "stages" },
      stage("📖", "Слова", tr`${level.vocab.length} ${plural(level.vocab.length, "новое слово", "новых слова", "новых слов")} с карточками и озвучкой`, `#/level/${level.id}/vocab`, { done: p.vocabDone, badge: p.vocabQuizBest ? tr`квиз ${p.vocabQuizBest}%` : null, reward: `+25 XP · +${COINS.vocab} 🪙` }),
      stage("🧠", "Грамматика", level.grammar.map((g) => g.title).join(" · "), `#/level/${level.id}/grammar`, { done: p.grammarDone, reward: `+15 XP · +${COINS.grammar} 🪙` }),
      ...missions.map((m, i) => stage("🎯", tr`Миссия ${i + 1}`, tr`${m.length} ${plural(m.length, "задание", "задания", "заданий")} · нужно 60% · ${[...new Set(m.map((x) => KIND_SHORT[x.type]))].map(tr).join(", ")}`, `#/level/${level.id}/mission/${i + 1}`, { done: p.missions[i], reward: tr`+20 XP · +${COINS.mission} 🪙 + монеты за ответы` })),
      stage("🎧", "Диалог", tr`${level.dialogue.title} — послушай и сыграй роль Эмиля`, `#/level/${level.id}/dialogue`, { done: p.dialogueDone, reward: `+30 XP · +${COINS.dialogue} 🪙` }),
      stage("🗣️", "Разговор с Мией", level.speaking.title, `#/level/${level.id}/speak`, { done: p.speakingDone, badge: AI ? "AI" : "офлайн", reward: `+40 XP · +${COINS.speaking} 🪙` }),
      stage("🏆", "Экзамен", tr`10 заданий · нужно 70% · звёзды: 70 / 80 / 95% · ${p.examTries ? `попыток: ${p.examTries}, лучший: ${p.examBest}%` : "ещё не сдавал"}`, `#/level/${level.id}/exam`, { done: completed, locked: !examOpen, hint: "Сначала выучи слова и пройди все 3 миссии", reward: `+100 XP · +${COINS.examPass + COINS.levelComplete} 🪙` }),
      stage("🎓", "Устный экзамен с Мией", "Мия задаст 5–7 вопросов по теме голосом и объяснит ошибки по-русски", `#/level/${level.id}/oral`, { done: p.oralDone, locked: !completed, hint: "Откроется после письменного экзамена", badge: AI ? "AI" : null, reward: "+30 XP · +25 🪙" }),
      stage("💬", "Разговор по теме", tr`Свободная беседа с Мией про «${level.titleRu.toLowerCase()}» — можно спрашивать что угодно по-русски`, `#/level/${level.id}/chat`, { done: p.chatDone, locked: !completed, hint: "Откроется после письменного экзамена", badge: AI ? "AI" : null, reward: "+30 XP · +25 🪙" }),
    ),
  );
}

/* -------------------------------------------------------------- sub-views */
function viewVocab(v, level) {
  // Only the first cards: each card also prefetches the next one while Emil is reading, so warming
  // all 32 words here would just fill the background lane and make the early cards wait.
  const head = level.vocab.slice(0, 8);
  prewarm([
    ...head.map((w) => ({ text: w.de, rate: RATES.word })),
    ...head.map((w) => ({ text: w.example, rate: RATES.example })),
    ...head.slice(0, 4).flatMap((w) => [
      { text: w.ru, rate: RATES.translation, lang: NATIVE_LOCALE },
      { text: w.exampleRu, rate: RATES.translation, lang: NATIVE_LOCALE },
    ]),
  ]);
  const r = renderFlashcards({
    container: v, level,
    onExit: () => go(`#/level/${level.id}`),
    onDone: () => {
      const first = !store.level(level.id).vocabDone;
      store.update((s) => { store.level(level.id).vocabDone = true; if (first) s.stats.wordsLearned += level.vocab.length; });
      if (first) reward({ xp: 25, coins: COINS.vocab, label: `${level.vocab.length} ${plural(level.vocab.length, "новое слово", "новых слова", "новых слов")}`, icon: "📖" });
      go(`#/level/${level.id}/quiz`, { replace: true });
    },
  });
  cleanup = r.destroy;
}

function viewQuiz(v, level) {
  const quiz = buildVocabQuiz(level, 10);
  prewarmExercises(quiz);
  const s = new ExerciseSession({
    container: v, exercises: quiz, title: tr`${level.emoji} Квиз по словам`,
    onExit: () => go(`#/level/${level.id}`),
    // onRecord writes the score (it runs however he leaves), onDone only navigates
    onRecord: (res) => {
      store.update(() => { const p = store.level(level.id); p.vocabQuizBest = Math.max(p.vocabQuizBest || 0, res.accuracy); p.vocabDone = true; });
    },
    onDone: () => go(`#/level/${level.id}`, { replace: true }),
  });
  s.start();
  cleanup = () => s.destroy();
}

function viewGrammar(v, level) {
  const p = store.level(level.id);
  const pendingMission = p.missions.findIndex((x) => !x);
  const nextMissionLabel = pendingMission >= 0 ? tr`Понятно! К миссии ${pendingMission + 1} →` : "Понятно! Назад к уровню →";
  v.style.setProperty("--accent", level.color);
  prewarm(level.grammar.flatMap((g) => g.examples.map((e) => ({ text: e.de, rate: RATES.example }))));
  append(v,
    el("a", { class: "back", href: `#/level/${level.id}` }, tr`← Уровень ${level.id}`),
    el("div", { class: "page-head" }, el("h1", {}, "🧠 Грамматика"), el("p", { class: "muted" }, `${level.emoji} ${level.titleRu}`)),
    el("div", { class: "grammar-list" }, level.grammar.map((g, i) =>
      el("article", { class: "card grammar", style: { "--i": i } },
        el("h2", {}, g.title),
        el("div", { class: "grammar-body" }, renderText(g.body)),
        g.table ? el("div", { class: "table-wrap" }, el("table", { class: "gtable" }, el("thead", {}, el("tr", {}, g.table.headers.map((h) => el("th", {}, h)))), el("tbody", {}, g.table.rows.map((r) => el("tr", {}, r.map((c, j) => el("td", { lang: j ? "de" : null }, c))))))) : null,
        el("div", { class: "examples" }, g.examples.map((e) => el("div", { class: "example" }, el("span", { class: "ex-de", lang: "de" }, e.de), el("button", { class: "icon-btn tiny", type: "button", onClick: () => speech.speak(e.de, { rate: RATES.example }) }, "🔊"), el("span", { class: "ex-ru muted" }, e.ru)))),
      ))),
    el("div", { class: "actions-row" },
      el("button", { class: "btn primary big", type: "button", onClick: () => {
        const first = !p.grammarDone;
        store.update(() => { store.level(level.id).grammarDone = true; });
        if (first) reward({ xp: 15, coins: COINS.grammar, label: "Грамматика разобрана", icon: "🧠" });
        const nextMission = p.missions.findIndex((x) => !x);
        go(nextMission >= 0 ? `#/level/${level.id}/mission/${nextMission + 1}` : `#/level/${level.id}`);
      } }, nextMissionLabel),
    ),
  );
}

function renderText(text) {
  const frag = document.createDocumentFragment();
  for (const para of String(text).split(/\n{2,}|\n/)) {
    if (!para.trim()) continue;
    const pEl = el("p");
    pEl.innerHTML = escapeHtml(para).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code lang=\"de\">$1</code>");
    frag.append(pEl);
  }
  return frag;
}

function viewMission(v, level, n) {
  const missions = missionsOf(level);
  const ex = missions[n - 1];
  if (!ex) return go(`#/level/${level.id}`, { replace: true });
  prewarmExercises(ex);
  const s = new ExerciseSession({
    container: v, exercises: ex, title: tr`${level.emoji} Миссия ${n} · ${level.titleRu}`,
    onExit: () => go(`#/level/${level.id}`),
    onRecord: (res) => {
      const p = store.level(level.id);
      const passed = res.accuracy >= 60;
      const first = passed && !p.missions[n - 1];
      store.update(() => { if (passed) p.missions[n - 1] = true; });
      if (first) reward({ xp: 20, coins: COINS.mission, label: tr`Миссия ${n} выполнена`, icon: "🎯" });
      else if (!passed) toast("Нужно минимум 60% — повтори слова и попробуй ещё раз", { icon: "💪", kind: "warn" });
    },
    onDone: (res) => {
      // read the plan back from the store — onRecord has already written this mission's result
      const next = store.level(level.id).missions.findIndex((x) => !x);
      if (res.accuracy >= 60 && next === n) go(`#/level/${level.id}/mission/${next + 1}`);
      else go(`#/level/${level.id}`, { replace: true });
    },
  });
  s.start();
  cleanup = () => s.destroy();
}

function viewDialogue(v, level) {
  prewarm(level.dialogue.lines.map((l) => ({ text: l.de, rate: l.speaker === "Emil" ? RATES.dialogueAli : RATES.dialogueOther })));
  const r = renderDialogue({ container: v, level, onExit: () => go(`#/level/${level.id}`), onDone: () => reward({ coins: COINS.dialogue, label: "Диалог сыгран", icon: "🎧" }) });
  cleanup = r.destroy;
}

function viewSpeak(v, level) {
  const t = new Tutor({
    container: v, level, ai: AI,
    onExit: () => go(`#/level/${level.id}`),
    onScenarioDone: ({ first }) => { if (first) reward({ coins: COINS.speaking, label: "Сценарий пройден", icon: "🗣️" }); },
  });
  t.render();
  cleanup = () => t.stop();
}

/** Oral exam with Mia (talkMode "exam") or a free chat around the finished level ("topic"). */
function viewTalk(v, level, talkMode) {
  const t = new Tutor({
    container: v, level, ai: AI, talkMode,
    onExit: () => go(`#/level/${level.id}`),
    // `first` comes from the tutor, which already knows whether this mode had been completed
    // before it marked it done — recomputing it here would always read false and pay nothing.
    // `first` already means "long enough AND not done before" — the tutor decides that once, so the
    // ✓, its own bonus and this reward can no longer disagree and leave the payout unreachable.
    onScenarioDone: ({ first }) => {
      if (first) {
        reward({ xp: 30, coins: 25, label: talkMode === "exam" ? "Устный экзамен сдан" : "Разговор по теме", icon: talkMode === "exam" ? "🎓" : "💬" });
      }
    },
  });
  t.render();
  cleanup = () => t.stop();
}

function viewExam(v, level) {
  const p = store.level(level.id);
  if (!(p.vocabDone && p.missions.every(Boolean))) { toast("Сначала слова и 3 миссии", { icon: "🔒", kind: "warn" }); return go(`#/level/${level.id}`, { replace: true }); }
  const exam = shuffle(level.exam);
  prewarmExercises(exam);
  const s = new ExerciseSession({
    container: v, exercises: exam, title: tr`🏆 Экзамен · Уровень ${level.id}`, exam: true, xpMult: 1.5,
    onExit: () => go(`#/level/${level.id}`),
    onRecord: (res) => {
      const wasDone = store.isCompleted(level.id);
      const passed = res.accuracy >= 70;
      let coinsGot = 0;
      let unlocked = store.update((st) => {
        p.examTries = (p.examTries || 0) + 1;
        p.examBest = Math.max(p.examBest || 0, res.accuracy);
        if (!wasDone && passed) {
          coinsGot = store.addCoins(COINS.examPass + COINS.levelComplete);
        }
      });
      if (!wasDone && passed) {
        unlocked = unlocked.concat(store.addXp(Math.round(100 * store.xpMultiplier())));
        confetti({ count: 260, duration: 3200 });
        sfx.levelUp();
        toast(tr`Уровень ${level.id} пройден! +100 XP · +${coinsGot} 🪙${LEVEL_BY_ID[level.id + 1] ? ` · открыт уровень ${level.id + 1}` : ""}`, { icon: "🏆", kind: "achievement", ms: 5500, title: "Glückwunsch!" });
        if (level.id === 12) setTimeout(() => toast("Ты прошёл весь A1. Дальше — A2!", { icon: "🎓", kind: "achievement", ms: 6000 }), 2600);
        if (level.id === LEVELS.length) setTimeout(() => toast("Весь курс пройден — от A1 до B1. Это была большая работа.", { icon: "🏁", kind: "achievement", ms: 7000 }), 2600);
      } else if (!passed) toast(tr`${res.accuracy}% — нужно 70%. Повтори миссии и попробуй снова!`, { icon: "💪", kind: "warn", ms: 4500 });
    },
    onDone: () => go(`#/level/${level.id}`, { replace: true }),
  });
  s.start();
  cleanup = () => s.destroy();
}

/* ----------------------------------------------------------------- tutor */
function viewTutor(v) {
  // The tutor owns the full width; its own side column hosts the scenario shortcuts,
  // so there is never a second sidebar competing with the chat.
  const t = new Tutor({
    container: v, level: null, ai: AI,
    onExit: () => go("#/"),
    onScenarioDone: ({ first }) => { if (first) reward({ coins: 15, label: "Разговор завершён", icon: "🗣️" }); },
  });
  t.render();

  const unlocked = LEVELS.filter((l) => store.isUnlocked(l.id));
  const passed = LEVELS.filter((l) => store.isCompleted(l.id));
  const side = t.root.querySelector(".tutor-side");
  if (side && unlocked.length) {
    append(side, el("div", { class: "scenario-picker" },
      el("div", { class: "sp-title" }, "Сценарии по уровням"),
      el("div", { class: "sp-list" }, unlocked.map((l) => el("a", { class: "sp-item", href: `#/level/${l.id}/speak`, style: { "--accent": l.color } },
        el("span", {}, l.emoji), el("span", {}, l.speaking.title), store.level(l.id).speakingDone ? el("span", { class: "sp-done" }, "✓") : null))),
      passed.length ? el("div", { class: "sp-title", style: { marginTop: "14px" } }, "Пройденные темы") : null,
      passed.length ? el("div", { class: "sp-list" }, passed.map((l) => el("div", { class: "sp-pair" },
        el("span", { class: "sp-pair-title" }, `${l.emoji} ${l.titleRu}`),
        el("div", { class: "sp-pair-btns" },
          el("a", { class: "btn ghost small", href: `#/level/${l.id}/oral` }, store.level(l.id).oralDone ? "🎓 ✓" : "🎓 экзамен"),
          el("a", { class: "btn ghost small", href: `#/level/${l.id}/chat` }, store.level(l.id).chatDone ? "💬 ✓" : "💬 разговор"),
        ),
      ))) : null,
    ));
  }
  cleanup = () => t.stop();
}

/* ------------------------------------------------------------------ shop */
function renderShop(v) {
  const s = store.state;
  v.innerHTML = "";
  const groups = [
    { kind: "consumable", title: "Расходники", sub: "Помогают в заданиях. Тратятся." },
    { kind: "perk", title: "Улучшения", sub: "Покупаются один раз, действуют всегда." },
    { kind: "title", title: "Титулы", sub: "Показываются в профиле и на главной." },
    { kind: "theme", title: "Темы оформления", sub: "Меняют цвета всего сайта." },
  ];
  const balance = el("div", { class: "shop-balance" }, el("span", { class: "sb-icon" }, "🪙"), el("span", { class: "sb-val" }, `${s.coins}`), el("span", { class: "muted" }, plural(s.coins, "монета", "монеты", "монет")));
  const inv = el("div", { class: "inventory" },
    el("div", { class: "inv-title" }, "Инвентарь"),
    el("div", { class: "inv-items" },
      invItem("💡", "Подсказки", s.inventory.hint), invItem("🛡️", "Щиты", s.inventory.shield), invItem("🔁", "Попытки", s.inventory.retry),
      store.boostActive() ? invItem("⚡", "XP ×2", tr`${Math.ceil((s.boostUntil - Date.now()) / 60000)} мин`) : null,
    ),
  );
  append(v,
    el("div", { class: "page-head shop-head" }, el("div", {}, el("h1", {}, "🛍️ Laden · Магазин"), el("p", { class: "muted" }, "Монеты даются за правильные ответы, миссии, диалоги, экзамены и ежедневные заходы.")), balance),
    inv,
    ...groups.map((g) => el("section", { class: "shop-group" },
      el("div", { class: "shop-group-head" }, el("h2", {}, g.title), el("span", { class: "muted small" }, g.sub)),
      el("div", { class: "shop-grid" }, SHOP.filter((it) => it.kind === g.kind).map((it, i) => shopCard(it, i))),
    )),
  );

  function invItem(icon, name, count) {
    return el("div", { class: "inv-item" }, el("span", { class: "inv-icon" }, icon), el("span", { class: "inv-count" }, String(count)), el("span", { class: "muted small" }, name));
  }
  function shopCard(it, i) {
    const price = priceOf(it, s);
    const owned = it.kind !== "consumable" && (s.owned.includes(it.id) || it.free);
    const active = (it.kind === "theme" && s.theme === it.theme) || (it.kind === "title" && s.title === it.id);
    const can = store.canAfford(price) && !owned;
    let btn;
    if (owned && it.kind === "theme") btn = el("button", { class: `btn small ${active ? "ghost" : "primary"}`, type: "button", disabled: active, onClick: () => { store.update((st) => (st.theme = it.theme)); applyTheme(it.theme); sfx.pop(); redrawShop(); } }, active ? "Активна" : "Применить");
    else if (owned && it.kind === "title") btn = el("button", { class: `btn small ${active ? "ghost" : "primary"}`, type: "button", disabled: active, onClick: () => { store.update((st) => (st.title = tr(it.id))); sfx.pop(); redrawShop(); } }, active ? "Активен" : "Надеть");
    else if (owned) btn = el("button", { class: "btn small ghost", type: "button", disabled: true }, "Куплено ✓");
    else btn = el("button", { class: `btn small ${can ? "primary" : "ghost"}`, type: "button", disabled: !can, onClick: () => buy(it, price) }, can ? tr`Купить · ${price} 🪙` : `${price} 🪙`);
    return el("div", { class: `shop-item ${owned ? "owned" : ""} ${it.kind === "theme" ? "theme-" + it.theme : ""}`, style: { "--i": i } },
      el("div", { class: "si-icon" }, it.icon),
      el("div", { class: "si-body" }, el("div", { class: "si-name" }, it.name, el("span", { class: "si-de" }, it.de)), el("div", { class: "si-desc muted" }, it.desc)),
      el("div", { class: "si-buy" }, btn),
    );
  }
  function buy(it, price) {
    const before = store.state.coins;
    const got = store.buy(it, price);
    if (got === false) { toast("Не хватает монет", { icon: "🪙", kind: "warn" }); return; }
    sfx.levelUp();
    if (it.kind === "theme") applyTheme(it.theme);
    toast(tr`${it.name} — куплено за ${price} 🪙`, { icon: it.icon, kind: "achievement", title: "Покупка" });
    // redraw first: the old balance node is discarded by redrawShop(), so counting on it animated
    // an element that was no longer in the document and Emil just saw the number jump
    redrawShop();
    const balanceNow = v.querySelector(".sb-val");
    if (balanceNow) countUp(balanceNow, before, store.state.coins, 600);
  }
  /** Re-render the shop in place, keeping the scroll position (route() would jump to the top) */
  function redrawShop() {
    const y = window.scrollY;
    renderShop(v);
    v.classList.add("enter");
    window.scrollTo({ top: y });
  }
}

/* ----------------------------------------------------------------- words */
function renderWords(v) {
  const levels = LEVELS.filter((l) => store.isUnlocked(l.id));
  const total = levels.reduce((n, l) => n + l.vocab.length, 0);
  const due = store.dueCount(levels.flatMap((l) => l.vocab));
  const search = el("input", { class: "text-input search", type: "search", placeholder: "Поиск по словам… (немецкий или русский)" });
  const list = el("div", { class: "words-list" });
  function draw() {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = "";
    for (const l of levels) {
      const items = l.vocab.filter((w) => !q || w.de.toLowerCase().includes(q) || w.ru.toLowerCase().includes(q));
      if (!items.length) continue;
      list.append(el("div", { class: "words-group", style: { "--accent": l.color } },
        el("div", { class: "wg-head" }, el("span", {}, `${l.emoji} ${l.title}`), el("span", { class: "muted" }, `${items.length}`)),
        el("div", { class: "wg-grid" }, items.map((w) => {
          const art = articleOf(w.de);
          return el("div", { class: "word-row", onClick: () => speech.speak(w.de, { rate: RATES.word }) },
            el("div", { class: "wr-de", lang: "de" }, art ? el("span", { class: `article art-${art}` }, art) : null, " ", art ? stripArticle(w.de) : w.de),
            el("div", { class: "wr-ru muted" }, w.ru),
            el("button", { class: "icon-btn tiny", type: "button" }, "🔊"),
          );
        })),
      ));
    }
    if (!list.children.length) list.append(el("div", { class: "muted center" }, "Ничего не найдено"));
  }
  search.addEventListener("input", draw);
  append(v,
    el("div", { class: "page-head" }, el("h1", {}, "📚 Мои слова"), el("p", { class: "muted" }, tr`${total} ${plural(total, "слово", "слова", "слов")} из открытых уровней. Нажми на слово, чтобы услышать.`)),
    el("div", { class: "words-tools" }, search,
      el("a", { class: "btn primary", href: "#/review" },
        due ? tr`⚡ Повторить ${due} ${plural(due, "слово", "слова", "слов")}` : "⚡ Повторить (квиз)"),
    ),
    // what the schedule says is slipping — silent when nothing is waiting
    due ? el("div", { class: "due-note" }, tr`🔁 ${due} ${plural(due, "слово ждёт", "слова ждут", "слов ждут")} повторения — те, что ты начал забывать. Квиз возьмёт сначала их.`) : null,
    list,
  );
  draw();
}

function viewGames(v, id) {
  const g = renderGames({ container: v, startId: id || null, onExit: () => go("#/practice") });
  cleanup = () => g.destroy();
}

function viewReview(v) {
  const levels = LEVELS.filter((l) => store.isUnlocked(l.id));
  const s = new ExerciseSession({
    container: v, exercises: buildReviewQuiz(levels, 15), title: "📚 Повторение слов",
    onExit: () => go("#/words"),
    onDone: () => go("#/words", { replace: true }),
  });
  s.start();
  cleanup = () => s.destroy();
}

/* --------------------------------------------------------------- profile */
/** The buttons in the cabinet hero — they depend on whether there is an account behind them. */
function accountActions() {
  if (!session.available) {
    return [el("span", { class: "muted small" },
      "Аккаунты на этом сайте ещё не настроены — прогресс сохраняется в этом браузере.")];
  }
  if (session.guest) {
    return [
      el("a", { class: "btn primary", href: "#/login" }, "Завести аккаунт"),
      el("span", { class: "muted small" }, "Чтобы прогресс был с тобой на любом устройстве и попал в рейтинг."),
    ];
  }
  return [
    session.isAdmin ? el("a", { class: "btn primary small", href: "#/admin" }, "⚙️ Панель") : null,
    el("a", { class: "btn ghost small", href: "#/board" }, "🏆 Рейтинг"),
    el("button", { class: "btn ghost small", type: "button", onClick: () => askNewPassword() }, "🔒 Сменить пароль"),
    el("button", { class: "btn ghost small", type: "button", onClick: () => session.logout() }, "Выйти"),
  ].filter(Boolean);
}

/** Whether this person appears in the shared table. Their own decision, so it lives in settings. */
function boardSetting() {
  if (session.guest) return null;
  const toggle = el("input", { type: "checkbox" });
  toggle.checked = session.user.publicBoard !== false;
  toggle.addEventListener("change", () => {
    patchMe({ publicBoard: toggle.checked })
      .then(() => toast(toggle.checked ? "Ты снова в общем рейтинге." : "Скрыл тебя из общего рейтинга.", { icon: "🏆" }))
      .catch((e) => { toggle.checked = !toggle.checked; toast(e.message, { icon: "⚠️", kind: "warn" }); });
  });
  return el("label", { class: "setting" },
    el("div", {},
      el("div", { class: "setting-label" }, "Показывать меня в рейтинге"),
      el("div", { class: "muted small" }, "Другие увидят имя, опыт и уровень — больше ничего")),
    el("span", { class: "toggle" }, toggle, el("span", { class: "toggle-track" }, el("span", { class: "toggle-thumb" }))));
}

/**
 * Новый пароль — в настоящем поле, а не в prompt() браузера.
 *
 * prompt() показывает набранное открытым текстом: пароль видит каждый, кто смотрит на экран, и
 * он же попадает в историю подсказок браузера. Менеджер паролей такое окно не видит, повторить
 * ввод нельзя, опечатку не поймать — а пароль после этого настоящий. Здесь обычная форма:
 * type="password", подтверждение и понятные ошибки.
 */
function askNewPassword() {
  // Supabase already knows who is signed in, so changing a password does not need the old one —
  // and asking for something it will not check would be theatre.
  const p1 = el("input", { class: "auth-input", type: "password", autocomplete: "new-password", placeholder: "Новый пароль" });
  const p2 = el("input", { class: "auth-input", type: "password", autocomplete: "new-password", placeholder: "Ещё раз" });
  const msg = el("div", { class: "muted small" }, "Минимум 8 символов.");
  const save = el("button", { class: "btn primary", type: "submit" }, "Сменить пароль");

  const form = el("form", { class: "auth-form pass-form" }, p1, p2, msg, el("div", { class: "row-btns" }, save,
    el("button", { class: "btn ghost", type: "button", onClick: () => close() }, "Отмена")));

  const box = el("div", { class: "modal-back", onClick: (e) => { if (e.target === box) close(); } },
    el("div", { class: "modal-card" }, el("h2", {}, "Новый пароль"), form));

  const close = () => { box.remove(); document.removeEventListener("keydown", onEsc); };
  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = String(p1.value);
    if (value.length < 8) { msg.className = "auth-msg bad"; msg.textContent = tr("Пароль — минимум 8 символов."); return; }
    if (value !== String(p2.value)) { msg.className = "auth-msg bad"; msg.textContent = tr("Пароли не совпали — проверь второе поле."); return; }
    save.disabled = true;
    save.textContent = tr("Меняю…");
    try {
      await changePassword(value);
      close();
      toast("Пароль изменён.", { icon: "🔒" });
    } catch (err) {
      msg.className = "auth-msg bad";
      msg.textContent = tr(err.message);
      save.disabled = false;
      save.textContent = tr("Сменить пароль");
    }
  });

  document.body.append(box);
  nextTick(() => p1.focus());
}

/**
 * The CEFR card: which band he is on, how far through it he is, and the one honest way to change
 * it — say that you already know more. Mia reads this number to decide how hard her German may be.
 */
function cefrCard() {
  const band = store.cefrProgress();
  const claim = store.state.cefrClaim || "A1";
  return el("section", { class: "card" },
    el("div", { class: "card-head" }, el("h2", {}, "Твой уровень немецкого"), el("span", { class: "muted small" }, tr`${band.done} / ${band.total} уроков уровня ${band.band}`)),
    el("div", { class: "home-level", style: { border: "none", padding: "6px 0 14px", background: "none" } },
      el("div", { class: "cefr-badge" }, band.band),
      el("div", { class: "cefr-meta" },
        el("div", { class: "cefr-name" }, CEFR_TITLE[band.band]),
        el("div", { class: "progress-track slim" }, el("div", { class: "progress-bar", style: { width: Math.round((band.done / band.total) * 100) + "%" } })),
        el("div", { class: "muted small" }, "Мия говорит с тобой по-немецки на этом уровне."),
      ),
    ),
    el("div", { class: "muted small", style: { marginBottom: "10px" } }, "Если ты уже знаешь больше — скажи, и курс откроется с нужного места. Ниже опустить нельзя: пройденное остаётся пройденным."),
    el("a", { class: "btn ghost small", href: "#/test", style: { marginBottom: "12px" } }, "🎯 Пройти тест уровня"),
    el("div", { class: "board-tabs" }, CEFR.map((c) => el("button", {
      class: `board-tab ${claim === c ? "on" : ""}`, type: "button",
      onClick: () => {
        if (claim === c) return;
        store.claimCefr(c, { allowLower: true });
        toast(CEFR.indexOf(c) < CEFR.indexOf(claim)
          ? tr`Ведём с уровня ${c}. Всё, что ты уже открыл, осталось открытым.`
          : tr`Открыл уроки с уровня ${c}.`, { icon: "🎓" });
        route();
      },
    }, tr`${c} · ${CEFR_TITLE[c]}`))),
  );
}

/**
 * Язык объяснения. Не язык курса — курс всегда немецкий, — а язык, на котором его объясняют.
 *
 * Переключение перезагружает страницу: переводится не только интерфейс, но и данные всех 36
 * уроков, а половина экранов уже нарисована. Перезагрузка честнее и быстрее, чем перерисовка
 * всего приложения, и человек видит понятный результат вместо мигания.
 */
function langSwitch({ compact = false } = {}) {
  const now = lang();
  return el("div", { class: `lang-switch ${compact ? "compact" : ""}` },
    Object.values(LANGS).map((L) => el("button", {
      class: `lang-btn ${L.code === now ? "on" : ""}`,
      type: "button",
      title: L.label,
      onClick: () => setLang(L.code),
    }, el("span", { class: "lang-flag" }, L.flag),
       el("span", { class: "lang-name" }, L.label),
       el("span", { class: "lang-short" }, L.short))),
  );
}

function renderProfile(v) {
  const s = store.state;
  const { cur, next, pct } = store.rank();
  const acc = s.stats.answered ? Math.round((s.stats.correct / s.stats.answered) * 100) : 0;
  const done = LEVELS.filter((l) => store.isCompleted(l.id)).length;
  const settings = s.settings;
  const title = s.title ? TITLE_NAMES[s.title] : null;

  const setting = (label, key, sub = null) => {
    const input = el("input", { type: "checkbox" });
    input.checked = Boolean(settings[key]);
    input.addEventListener("change", () => { store.update((st) => (st.settings[key] = input.checked)); if (key === "sound") setSoundEnabled(input.checked); });
    return el("label", { class: "setting" }, el("div", {}, el("div", { class: "setting-label" }, label), sub ? el("div", { class: "muted small" }, sub) : null), el("span", { class: "toggle" }, input, el("span", { class: "toggle-track" }, el("span", { class: "toggle-thumb" }))));
  };
  const goal = el("input", { type: "range", min: "20", max: "200", step: "10", value: String(s.dailyGoal) });
  const goalVal = el("span", { class: "muted" }, `${s.dailyGoal} XP`);
  goal.addEventListener("input", () => (goalVal.textContent = tr(`${goal.value} XP`)));
  goal.addEventListener("change", () => store.update((st) => (st.dailyGoal = Number(goal.value))));

  const band = store.cefrProgress();
  const who = session.user?.name || s.name || "";
  append(v,
    el("section", { class: "cabinet-hero" },
      el("div", { class: "cabinet-glow" }),
      el("div", { class: "cabinet-top" },
        // Имя может быть не задано: тогда в кружке смайл, а не пустота.
        el("div", { class: "cabinet-avatar" }, who ? who.slice(0, 1).toUpperCase() : "🙂"),
        el("div", { class: "cabinet-who" },
          el("h1", {}, who || "Без имени", title ? el("span", { class: "title-chip" }, title) : null),
          el("div", { class: "muted small" }, session.user ? session.user.email : "без аккаунта — прогресс в этом браузере"),
        ),
        el("div", { class: "cabinet-level" },
          el("div", { class: "cefr-badge" }, band.band),
          el("div", {},
            el("div", { class: "cefr-name" }, CEFR_TITLE[band.band]),
            el("div", { class: "muted small" }, tr`${band.done} / ${band.total} уроков`)),
        ),
      ),
      el("div", { class: "cabinet-rank" },
        el("div", { class: "cabinet-rank-line" },
          el("span", {}, `${cur.icon} ${cur.title}`),
          el("span", { class: "muted small" }, next ? tr`до «${next.title}» ещё ${next.xp - s.xp} XP` : "максимальный ранг")),
        el("div", { class: "progress-track" }, el("div", { class: "progress-bar", style: { width: pct + "%" } })),
      ),
      el("div", { class: "cabinet-actions" }, ...accountActions()),
    ),
    cefrCard(),
    el("section", { class: "home-tiles" },
      tile("🛍️", "Магазин", tr`${s.coins} монет — подсказки, щиты, темы`, "#/shop", "shop"),
      tile("🏆", "Рейтинг", "Как ты идёшь рядом с другими", "#/board", "board"),
    ),
    el("section", { class: "stats-grid" },
      statCard("🔥", `${s.streak.count}`, tr`${plural(s.streak.count, "день", "дня", "дней")} подряд · рекорд ${s.streak.best}`),
      statCard("🎯", `${acc}%`, tr`точность · ${s.stats.answered} ${plural(s.stats.answered, "ответ", "ответа", "ответов")}`),
      statCard("📚", `${s.stats.wordsLearned}`, `${plural(s.stats.wordsLearned, "слово выучено", "слова выучено", "слов выучено")}`),
      statCard("🏆", `${done}/${LEVELS.length}`, `${plural(done, "урок пройден", "урока пройдено", "уроков пройдено")}`),
      statCard("🗣️", `${s.stats.tutorTurns}`, tr`${plural(s.stats.tutorTurns, "реплика", "реплики", "реплик")} с Мией`),
      statCard("🪙", `${s.coinsEarned}`, `${plural(s.coinsEarned, "монета заработана", "монеты заработано", "монет заработано")} · ${s.purchases} ${plural(s.purchases, "покупка", "покупки", "покупок")}`),
      statCard("📅", `${s.stats.days.length}`, `${plural(s.stats.days.length, "день занятий", "дня занятий", "дней занятий")}`),
      statCard("💡", `${s.stats.hintsUsed}`, `${plural(s.stats.hintsUsed, "подсказка использована", "подсказки использовано", "подсказок использовано")}`),
    ),
    el("section", { class: "card" },
      el("div", { class: "card-head" }, el("h2", {}, "Достижения"), el("span", { class: "muted" }, `${s.achievements.length} / ${ACHIEVEMENTS.length}`)),
      el("div", { class: "ach-grid" }, ACHIEVEMENTS.map((a, i) => { const got = s.achievements.includes(a.id); return el("div", { class: `ach ${got ? "got" : ""}`, title: a.ru, style: { "--i": i } }, el("div", { class: "ach-icon" }, got ? a.icon : "🔒"), el("div", { class: "ach-title" }, a.title), el("div", { class: "ach-ru muted" }, a.ru)); })),
    ),
    el("section", { class: "card" },
      el("div", { class: "card-head" }, el("h2", {}, "Настройки")),
      el("div", { class: "settings" },
        el("div", { class: "setting" },
          el("div", {},
            el("div", { class: "setting-label" }, "Язык сайта"),
            el("div", { class: "muted small" }, "Интерфейс, все уроки, игры и Мия. Немецкий остаётся немецким.")),
          langSwitch()),
        boardSetting(),
        setting("Звуковые эффекты", "sound"),
        setting("Озвучка немецкого (TTS)", "tts"),
        setting("Авто-микрофон в разговоре", "autoListen", "После реплики Мии микрофон включается сам"),
        setting("Показывать перевод", "showRu", "Русский перевод под репликами Мии и в диалогах"),
        el("div", { class: "setting" }, el("div", {}, el("div", { class: "setting-label" }, "Цель на день"), goalVal), goal),
        el("div", { class: "setting" },
          el("div", {},
            el("div", { class: "setting-label" }, "Свободный разговор"),
            el("div", { class: "muted small" }, AI
              ? "Включён: Мия отвечает на любые темы и помнит ваши разговоры"
              : "Выключен: Мия отвечает из офлайн-словаря — слова, грамматика, Германия, сам сайт")),
          el("span", { class: AI ? "badge ai" : "badge offline" }, AI ? "включён" : "офлайн")),
      ),
    ),
    AI ? null : aiKeyCard(),
    el("section", { class: "card danger" },
      // Завести аккаунт было можно, уйти — нельзя: кнопки не было нигде. Для сайта, который
      // хранит почту, имя, весь прогресс и заметки Мии о человеке, это неправильно.
      session.user ? el("div", { class: "danger-part" },
        el("h2", {}, "Удалить аккаунт"),
        el("p", { class: "muted" }, "Исчезнет всё: аккаунт, прогресс на сервере, место в рейтинге и то, что Мия о тебе запомнила. Восстановить будет нечего."),
        el("button", { class: "btn danger", type: "button", onClick: () => askDeleteAccount(session.user.email) }, "Удалить аккаунт навсегда"),
      ) : null,
    ),
  );
}


/**
 * Удаление аккаунта: подтверждение собственной почтой.
 *
 * Не confirm() с одной кнопкой: отменить это нельзя ничем, и промах здесь стоит всего сразу.
 * Набрать свой адрес — три секунды, и они отделяют «хочу уйти» от «промахнулся по кнопке».
 */
function askDeleteAccount(email) {
  const field = el("input", { class: "auth-input", type: "email", autocomplete: "off", placeholder: email || "твоя почта" });
  const msg = el("div", { class: "muted small" }, tr`Набери ${email}, чтобы подтвердить.`);
  const go_ = el("button", { class: "btn danger", type: "submit" }, "Удалить навсегда");

  const form = el("form", { class: "auth-form pass-form" }, field, msg,
    el("div", { class: "row-btns" }, go_, el("button", { class: "btn ghost", type: "button", onClick: () => close() }, "Отмена")));
  const box = el("div", { class: "modal-back", onClick: (e) => { if (e.target === box) close(); } },
    el("div", { class: "modal-card" }, el("h2", {}, "Удалить аккаунт"), form));
  const close = () => { box.remove(); document.removeEventListener("keydown", onEsc); };
  const onEsc = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onEsc);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    go_.disabled = true;
    go_.textContent = tr("Удаляю…");
    try {
      // Кого именно удаляем — запоминаем ДО выхода из аккаунта.
      //
      // deleteAccount() в конце выходит, и после этого keyFor() указывает уже на ГОСТЕВОЙ сейв.
      // Стоявший здесь store.reset() обнулял прогресс того, кто занимался в этом браузере без
      // аккаунта, — человека, который ничего не удалял.
      const who = session.user?.id;
      await backend.deleteAccount(field.value.trim());
      store.forgetAccountSave(who);
      close();
      location.href = location.pathname;
    } catch (err) {
      msg.className = "auth-msg bad";
      msg.textContent = tr(err.message);
      go_.disabled = false;
      go_.textContent = tr("Удалить навсегда");
    }
  });

  document.body.append(box);
  nextTick(() => field.focus());
}

/**
 * Запуск без аварийного выхода — это чёрный экран навсегда.
 *
 * boot() асинхронный и ждёт четыре внешние вещи: словарь языка, Supabase с чужого CDN, чтение
 * прогресса и разрешение на микрофон. Любая из них может не ответить — чужой Wi-Fi, вырубленный
 * провайдером CDN, блокировщик рекламы. Раньше в этом случае не происходило ничего: заставка
 * «Lade… Загружаю» оставалась на экране навсегда, без единого слова о том, что случилось, и
 * человек видел мёртвый сайт.
 *
 * Поэтому запуск обёрнут: заставка уходит в любом случае, а вместо неё — понятная причина и
 * кнопка «Обновить». На двух языках, потому что до словаря дело могло и не дойти.
 */
boot().catch((e) => {
  console.error("[boot]", e);
  const loader = document.querySelector("#loader");
  if (loader) {
    loader.classList.remove("hide");
    loader.innerHTML = "";
    loader.append(
      el("div", { class: "loader-fail" },
        el("div", { class: "loader-fail-icon" }, "⚠️"),
        el("h1", {}, "Сайт не смог запуститься"),
        el("p", {}, "Скорее всего пропала связь. Проверь интернет и обнови страницу."),
        el("p", { class: "loader-fail-az" }, "Sayt işə düşə bilmədi. İnterneti yoxla və səhifəni yenilə."),
        el("button", { class: "btn primary", type: "button", onClick: () => location.reload() }, "Обновить · Yenilə"),
        el("p", { class: "loader-fail-why" }, String(e?.message || e || "").slice(0, 200)),
      ),
    );
  }
});
