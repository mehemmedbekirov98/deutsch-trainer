// Два языка объяснения, один изучаемый.
//
// Сайт учит немецкому. Объясняет он по-русски или по-азербайджански — это выбор человека, и
// переключается он целиком: интерфейс, все 36 уроков, игры, тест уровня и Мия. Немецкий при этом
// не трогается никогда — он и есть предмет.
//
// Как это устроено, коротко: русский текст остаётся в коде первоисточником, а перевод живёт
// отдельными словарями «русская строка → азербайджанская». Ничего не нужно размечать ключами
// вида `screen.profile.title`, которые всегда расходятся со смыслом и которые невозможно
// вычитывать. Подстановка идёт в двух местах:
//
//   · el() из utils.js — весь интерфейс рисуется через него, так что одного крючка хватает;
//   · translateLevels() — уроки переводятся в данных, а не на экране, потому что русский текст
//     в уроке бывает не подписью, а ПРАВИЛЬНЫМ ОТВЕТОМ. Перевести только надпись значило бы
//     показывать азербайджанский вопрос и ждать русский ответ.
//
// Шаблонные строки с подстановкой (`Урок ${id} из ${n}`) переводятся тегированным вызовом:
// t`Урок ${id} из ${n}` — ключом служит сама строка с метками вместо значений.

const STORAGE_KEY = "lingua-lang";
const SLOT = "\u0001"; // место значения внутри шаблонного ключа

export const LANGS = {
  ru: { code: "ru", label: "Русский", short: "RU", flag: "🇷🇺", htmlLang: "ru", speech: "ru-RU" },
  az: { code: "az", label: "Azərbaycanca", short: "AZ", flag: "🇦🇿", htmlLang: "az", speech: "az-AZ" },
};

const DICT = new Map();

// Выбранный язык определяется на этапе загрузки модуля, а не внутри initI18n(): другие модули
// читают его прямо в теле (speech.js собирает из него локаль голоса), и они выполняются раньше,
// чем boot() дойдёт до инициализации. Здесь только чтение localStorage — побочных эффектов нет.
let current = detect();

/** Язык, на котором человек читает сайт. Немецкий сюда не входит — он изучаемый. */
export const lang = () => current;
export const isAz = () => current === "az";
export const langInfo = () => LANGS[current];

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGS[saved]) return saved;
  } catch {}
  // Ни разу не выбирал — спросим у браузера. Азербайджанский ставим только если он там прямо есть;
  // во всех остальных случаях русский, потому что он для обоих понятнее, чем чужой язык.
  const nav = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
  return /\baz\b|az-/.test(nav) ? "az" : "ru";
}

/**
 * Загрузить язык. Вызывается один раз при старте, до первой отрисовки.
 *
 * Словари подгружаются динамически и только для азербайджанского: русскому переводить нечего,
 * и человек, который им пользуется, не должен качать ничего лишнего.
 */
export async function initI18n() {
  // Тесты запускают это в Node, где документа нет.
  if (typeof document !== "undefined") {
    document.documentElement.lang = LANGS[current].htmlLang;
    document.body?.setAttribute("data-lang", current);
  }
  if (current === "ru") return current;
  await loadAz();
  translateDocument();
  return current;
}

/**
 * Перевести то, что уже лежит в index.html: меню, логотип, заголовок вкладки.
 *
 * Эта часть страницы не строится через el() — она приезжает готовой разметкой, и крючок в el()
 * её не видит. Проход разовый и по маленькому дереву: в index.html только оболочка, всё
 * остальное рисуется приложением.
 */
function translateDocument(root = typeof document === "undefined" ? null : document.body) {
  if (!root || current === "ru" || !DICT.size) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const hit = DICT.get(n.nodeValue.trim());
    if (hit) hits.push([n, hit]);
  }
  // сначала собираем, потом правим: менять узлы во время обхода — значит обходить их дважды
  for (const [node, text] of hits) node.nodeValue = node.nodeValue.replace(node.nodeValue.trim(), text);
  for (const el of root.querySelectorAll("[title],[placeholder],[aria-label]")) {
    for (const attr of ["title", "placeholder", "aria-label"]) {
      const v = el.getAttribute(attr);
      const hit = v && DICT.get(v);
      if (hit) el.setAttribute(attr, hit);
    }
  }
  const title = DICT.get(document.title);
  if (title) document.title = title;
}

/**
 * Загрузить азербайджанские словари, НЕ переключая язык.
 *
 * Нужно двум разным вещам: самому переключению языка и двуязычному поиску в офлайн-Мие —
 * она ищет и по азербайджанскому слову, даже когда интерфейс русский. Второй вызов ничего
 * не делает: словари уже в памяти.
 */
/**
 * Словарь офлайн-Мии — 57 КБ, и первой отрисовке он не нужен.
 *
 * Нужен он в одном месте: когда Мия отвечает без ключа Claude. До этого экрана человек идёт
 * секунды, а ждать его на главной приходилось всем. Поэтому загрузка начинается сразу, но её
 * никто не ждёт; экран разговора ждёт вот это обещание — и к тому моменту оно почти всегда
 * уже выполнено.
 */
let brainLoaded = null;
// Для проверок: им словарь Мии нужен даже при русском языке — офлайн-Мия ищет по азербайджанскому
// слову независимо от того, на каком языке интерфейс.
const loadBrainDictForTools = () => {
  if (!brainLoaded) brainLoaded = load(() => import("./i18n/az-brain.js"));
  return brainLoaded;
};

export function loadBrainDict() {
  if (current === "ru") return Promise.resolve();
  if (!brainLoaded) brainLoaded = load(() => import("./i18n/az-brain.js"));
  return brainLoaded;
}

let azLoaded = null;
export function loadAz() {
  if (!azLoaded) {
    loadBrainDict();          // пошла, но никто её не ждёт
    azLoaded = Promise.all([
      load(() => import("./i18n/az-ui.js")),
      // Только названия уроков, темы и цели — 15 КБ вместо 236.
      //
      // Весь словарь уроков приезжал ДО первой отрисовки: человек, выбравший азербайджанский,
      // ждал четверть мегабайта ради главного экрана, где из него нужны 213 строк. Остальное —
      // слова, грамматика, задания, диалог — грузится по одному уроку, когда урок открывают
      // (loadLevelDict ниже), и весит около семи килобайт.
      load(() => import("./i18n/az-content-index.js")),
    ]);
  }
  return azLoaded;
}

/**
 * Словарь одного урока: догрузить и перевести этот урок на месте.
 *
 * Зовётся перед тем, как показать любой экран урока. На русском не делает ничего — словарей там
 * нет вовсе. Повторный вызов бесплатен: файл уже в памяти, а перевод идемпотентен (после первого
 * прохода в данных лежит азербайджанский, и ключом словаря он не является).
 */
const levelDicts = new Map();
export function loadLevelDict(id, level = null) {
  if (current === "ru") return Promise.resolve();
  const nn = String(id).padStart(2, "0");
  if (!levelDicts.has(nn)) {
    levelDicts.set(nn, load(() => import(`./i18n/az-content-${nn}.js`)).then(() => {
      if (level) walk(level);
    }));
  }
  return levelDicts.get(nn);
}

/** То же для нескольких уроков разом: игры и повторение берут слова из всех открытых. */
export const loadLevelDicts = (levels) =>
  current === "ru" ? Promise.resolve() : Promise.all(levels.map((l) => loadLevelDict(l.id ?? l, l.id ? l : null)));

/**
 * Весь словарь сразу — для проверок и предгенерации, не для браузера.
 *
 * Сайт грузит словари по мере надобности, и это правильно: человеку не нужен урок 34, пока он на
 * первом. А вот проверке полноты перевода, предгенерации звука и тесту решаемости нужен весь
 * текст разом — иначе они будут отчитываться о том, чего не видели.
 *
 * Язык при этом НЕ переключается: половине проверок азербайджанский нужен как второй словарь при
 * русском интерфейсе — так офлайн-Мия ищет по азербайджанскому слову. Кому нужен переключённый
 * язык, зовёт setLangForTest() сам.
 */
export async function loadAzFull(levelCount = 36) {
  await Promise.all([loadAz(), loadBrainDictForTools()]);
  const ids = Array.from({ length: levelCount }, (_, i) => String(i + 1).padStart(2, "0"));
  await Promise.all(ids.map((nn) => load(() => import(`./i18n/az-content-${nn}.js`))));
  return DICT.size;
}

/** Перевод независимо от выбранного языка: для тех, кто ищет ПО азербайджанскому тексту. */
export const azOf = (s) => DICT.get(s) || null;

/**
 * Переключить язык без перезагрузки — только для tools/test-brain.mjs.
 *
 * В браузере язык меняет setLang(), и он перезагружает страницу: переводить надо не только
 * интерфейс, но и данные уроков, а половина экранов уже нарисована. В проверке перезагружаться
 * некуда, а состояние «выбран азербайджанский» воспроизвести необходимо.
 */
export function setLangForTest(next) {
  if (LANGS[next]) current = next;
}

async function load(importer) {
  try {
    const mod = await importer();
    const table = mod.default || mod.DICT || {};
    for (const [ru, az] of Object.entries(table)) if (az) DICT.set(ru, az);
  } catch (e) {
    // Перевод не доехал — сайт обязан остаться рабочим и русским, а не пустым.
    console.warn("[i18n] словарь не загрузился:", e?.message || e);
  }
}

/** Сменить язык. Перезагрузка честнее точечной перерисовки: переводится в том числе контент уроков. */
export function setLang(next) {
  if (!LANGS[next] || next === current) return;
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  location.reload();
}

/**
 * Перевести. Работает в двух видах:
 *   t("Войти")                     — обычная строка
 *   t`Урок ${id} из ${n}`          — шаблон с подстановкой
 */
export function t(input, ...values) {
  if (typeof input === "string") return current === "ru" ? input : DICT.get(input) || input;
  // Вызов не строкой и не шаблоном. Так писать не надо — но раньше это была не опечатка, а падение:
  // `input.raw` у числа undefined, и строка `node.textContent = tr(счёт)` роняла весь кадр анимации.
  // Из-за одной такой на экране итогов всегда горело «0 XP», а переключатель языка у Мии
  // срабатывал наполовину. Цена этой ветки — ноль, цена её отсутствия — молчаливо сломанный экран.
  if (!input || !Array.isArray(input.raw)) {
    const s = String(input ?? "");
    return current === "ru" ? s : DICT.get(s) || s;
  }
  if (current === "ru") return join(input.raw, values);

  // Подставляемые значения тоже проходят через словарь. Половина из них — не числа и не имена, а
  // русские строки из соседних таблиц: CEFR_TITLE, названия рангов, подписи игр. Без этого фраза
  // получалась наполовину переведённой — «Səviyyə A1 · Начальный».
  const vals = values.map((v) => (typeof v === "string" ? translateText(v) : v));

  const tpl = DICT.get(input.raw.join(SLOT));
  if (!tpl) return join(input.raw, vals);

  // Перевод может ставить подстановки в другом порядке — в азербайджанском он и есть другой:
  // «Уровень 5 из 36» → «Dərs 5 / 36», но «5 XP до «Мастера»» → ««Usta»-ya qədər 5 XP».
  // Явная нумерация {0}, {1} читается в словаре и не зависит от порядка слов.
  if (tpl.includes("{0}") || tpl.includes("{1}")) {
    return tpl.replace(/\{(\d+)\}/g, (m, i) => (i < vals.length ? String(vals[i] ?? "") : m));
  }
  const parts = tpl.split(SLOT);
  let out = parts[0] ?? "";
  for (let i = 0; i < vals.length; i++) out += String(vals[i] ?? "") + (parts[i + 1] ?? "");
  return out;
}

const join = (raw, values) => raw.reduce((a, part, i) => a + part + (i < values.length ? String(values[i] ?? "") : ""), "");

/**
 * Русские числительные склоняются, азербайджанские — нет: «5 дней» против «5 gün».
 * Поэтому в азербайджанском три формы схлопываются в одну.
 */
export function plural(n, one, few, many) {
  if (current !== "ru") return t(one);
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/* ------------------------------------------------------------------ уроки */

// Служебные поля: не текст, а устройство урока.
//
// Немецкого в этом списке нет и быть не должно. Словарь состоит только из пар «русская строка →
// азербайджанская», немецкая строка в нём не ключ, и подставить ей что-либо физически нечем —
// так что защищать немецкий отдельным списком полей значило бы городить вторую стену там, где
// первая и так не пробиваема. А вот русский текст встречается в полях, которые на вид служебные:
// `answer` бывает и немецким предложением, и русским переводом, и переводить надо именно второй,
// иначе вопрос будет азербайджанский, а правильный ответ — русский.
const SKIP_KEYS = new Set(["id", "emoji", "cefr", "color", "type", "voice", "speaker"]);

/**
 * Перевести все уроки на месте.
 *
 * На месте — потому что LEVELS импортируется статически и весь остальной код держит ссылки на те
 * же объекты; подменить массив значило бы оставить половину приложения с русскими данными.
 *
 * Немецкий не трогается: в словаре нет ни одного немецкого ключа, поэтому подменить его нечем.
 */
export function translateLevels(levels) {
  if (current === "ru" || !DICT.size) return levels;
  for (const level of levels) walk(level);
  return levels;
}

function walk(node, key = "") {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") { if (!SKIP_KEYS.has(key)) node[i] = DICT.get(v) || v; }
      else if (v && typeof v === "object") walk(v, key);
    }
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === "string") {
      if (SKIP_KEYS.has(k)) continue;
      const hit = DICT.get(v);
      if (hit) node[k] = hit;
    } else if (v && typeof v === "object") walk(v, k);
  }
}

/** Крючок для el(): ровно один вход, чтобы весь интерфейс переводился сам. */
export const translateText = (s) => (current === "ru" ? s : DICT.get(s) || s);
