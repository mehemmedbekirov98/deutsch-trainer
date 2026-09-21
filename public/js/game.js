// RPG layer: story (lore), coins, shop items, themes, loot
import { CHAPTERS_MORE, EPILOGUE_B1 } from "./story-more.js";

/* ------------------------------------------------------------------ story */
export const STORY = {
  prologue: {
    title: "Пролог · Говсаны",
    emoji: "🌅",
    text: [
      "Али, 31 год. Говсаны — посёлок под Баку, где каждый знает каждого, а дни похожи друг на друга: работа, чай у моря, вечер, сон. Так было десять лет.",
      "Однажды ночью пришло сообщение от Рашида, друга детства, который два года назад уехал в Берлин: «Брат, тут есть работа и нормальная жизнь. Но без немецкого — никак. Начни учить. Сейчас.»",
      "Утром Али купил тетрадь и написал на первой странице: «Deutsch. Уровень 1». Он ещё не знал ни одного слова. Но знал, зачем.",
      "Это история о том, как один человек шаг за шагом меняет свою жизнь. Каждый уровень — новая глава. Каждое слово — шаг к Берлину.",
    ],
    cta: "Начать путь",
  },
  chapters: {
    1: { title: "Глава 1 · Первые слова", text: "Рашид познакомил Али с Мией — репетитором из Берлина, которая согласилась заниматься с ним по вечерам онлайн. «Hallo, ich bin Ali», — первая фраза, которую он сказал вслух. Голос дрожал, но Мия улыбнулась: «Sehr gut, Ali. Weiter!»", loot: { id: "notebook", icon: "📓", name: "Тетрадь «Deutsch»", ru: "Первая страница уже исписана." } },
    2: { title: "Глава 2 · Цифры и цели", text: "Али посчитал всё: сколько стоит билет, сколько нужно на первые месяцы, сколько ему лет и сколько лет он ждал. Цифры по-немецки давались тяжело, но с ними план стал реальным: накопить, выучить, уехать.", loot: { id: "piggy", icon: "🐷", name: "Копилка", ru: "Первые манаты на билет." } },
    3: { title: "Глава 3 · Семья", text: "Мама не понимала, зачем всё это. Отец молчал. Сестра Лейла сказала: «Если не ты — то кто?» Али учился рассказывать о семье по-немецки — и впервые объяснил им свой план так, чтобы они услышали.", loot: { id: "photo", icon: "📷", name: "Семейное фото", ru: "Лежит в кармане куртки — на удачу." } },
    4: { title: "Глава 4 · Пекарня", text: "В Баку открылась немецкая пекарня. Али зашёл и заказал по-немецки: «Einen Kaffee und ein Brötchen, bitte.» Продавец-немец ответил слишком быстро, Али понял половину — но это был первый настоящий разговор.", loot: { id: "pretzel", icon: "🥨", name: "Брецель", ru: "Вкус первой победы." } },
    5: { title: "Глава 5 · Новый распорядок", text: "Подъём в шесть. Полчаса немецкого до работы. Вечером — Мия. Друзья звали к морю, Али отвечал: «Am Abend lerne ich Deutsch.» Дисциплина стала его вторым языком.", loot: { id: "alarm", icon: "⏰", name: "Будильник", ru: "Звонит в 6:00. Без исключений." } },
    6: { title: "Глава 6 · Квартира в Берлине", text: "Рашид присылал объявления: «2 Zimmer, Küche, Bad, 3. Stock». Али читал их как приключенческий роман и представлял, как его вещи стоят в комнате с большим окном на берлинскую улицу.", loot: { id: "key", icon: "🔑", name: "Ключ", ru: "Пока от старой квартиры. Но это ненадолго." } },
    7: { title: "Глава 7 · Покупки", text: "Али продал старую машину — на неё копил три года. Теперь на счету была сумма на билет и первые недели. Он учил цены, размеры, цвета: «Wie viel kostet das?» — пригодится с первого дня.", loot: { id: "jacket", icon: "🧥", name: "Куртка для Берлина", ru: "Тёплая. Там осенью холодно." } },
    8: { title: "Глава 8 · Карта города", text: "На стене висела карта Берлина. Али учил дорогу от аэропорта до квартиры Рашида: «Mit der S-Bahn bis Alexanderplatz, dann links…» Он проходил этот маршрут в голове десятки раз.", loot: { id: "map", icon: "🗺️", name: "Карта Берлина", ru: "Маршрут отмечен красным." } },
    9: { title: "Глава 9 · Разговорный клуб", text: "Мия пригласила Али в онлайн-клуб. Впервые он говорил с группой незнакомых людей по-немецки. Тема — хобби. «Ich spiele gern Fußball», — сказал он, и кто-то из Мюнхена ответил: «Ich auch!»", loot: { id: "ball", icon: "⚽", name: "Мяч", ru: "Общий язык, который понятен без слов." } },
    10: { title: "Глава 10 · Осень и виза", text: "Документы на визу поданы. Осень, дожди, ожидание. Али рассказывал Мие, что делал на выходных — в прошедшем времени. «Ich habe Deutsch gelernt», — и это была правда каждую неделю.", loot: { id: "umbrella", icon: "☂️", name: "Зонт", ru: "В Берлине без него никуда." } },
    11: { title: "Глава 11 · Медосмотр", text: "Для визы нужен медосмотр. Али учился говорить о здоровье — чтобы не бояться врачей в чужой стране. «Mir geht es gut. Ich bin gesund.» Врач в Баку удивился: «Зачем тебе это по-немецки?» — «Скоро узнаете».", loot: { id: "cert", icon: "🩺", name: "Медицинская справка", ru: "Здоров. Готов." } },
    12: { title: "Глава 12 · Виза одобрена", text: "Письмо из посольства: виза одобрена. Али купил билет Баку — Берлин. Осталось последнее: экзамен A1. Он открыл тетрадь на первой странице: «Deutsch. Уровень 1». Год назад он не знал ни слова.", loot: { id: "visa", icon: "🛂", name: "Виза", ru: "Штамп, который меняет всё." } },
  },
  // Arriving in Germany is no longer the end of the book — it is where the second act starts, so
  // this sits between chapter 12 and chapter 13 instead of closing the story.
  interlude: {
    title: "Эпилог · Берлин",
    emoji: "✈️",
    text: [
      "Аэропорт Берлин-Бранденбург. Рашид машет рукой из-за стеклянных дверей.",
      "«Hallo, Ali! Willkommen in Deutschland!» — «Danke, Rashid. Ich bin bereit.»",
      "Он был готов. Двенадцать уровней, сотни слов, десятки разговоров с Мией. Уровень A1 — сдан.",
      "Но это только первая глава. Впереди — A2, работа, новые люди и новая жизнь. Weiter, Ali. Immer weiter.",
    ],
    loot: { id: "ticket", icon: "✈️", name: "Билет Баку — Берлин", ru: "В один конец." },
  },
};

// A1 is twelve chapters. A2 and B1 carry the story to its end, and the real epilogue is theirs —
// arriving in Germany turned out to be the middle of the book, not the last page.
Object.assign(STORY.chapters, CHAPTERS_MORE);
STORY.epilogue = EPILOGUE_B1;

/* ------------------------------------------------------------------ coins */
export const COINS = {
  correct: 2,
  comboBonus: 1, // extra per correct answer while combo >= 3
  mission: 15,
  vocab: 10,
  grammar: 5,
  dialogue: 10,
  speaking: 20,
  examPass: 60,
  levelComplete: 100,
  dailyLogin: 10,
};

/* ------------------------------------------------------------------- shop */
export const THEMES = {
  nacht: { name: "Berliner Nacht", accent: "#7c5cff", accent2: "#22d3ee", blobs: ["#5b3cff", "#0ea5e9", "#ec4899"] },
  gold: { name: "Goldener Herbst", accent: "#f59e0b", accent2: "#fb7185", blobs: ["#b45309", "#be123c", "#f59e0b"] },
  alpen: { name: "Alpen", accent: "#10b981", accent2: "#38bdf8", blobs: ["#047857", "#0369a1", "#a3e635"] },
  kaspi: { name: "Kaspisches Meer", accent: "#0ea5e9", accent2: "#a78bfa", blobs: ["#0c4a6e", "#1d4ed8", "#7c3aed"] },
};

export const SHOP = [
  // consumables
  { id: "hint", kind: "consumable", icon: "💡", name: "Подсказка", de: "Hinweis", price: 25, desc: "Убирает два неверных варианта или открывает часть ответа. Одна штука = одно задание.", pack: 1 },
  { id: "hint3", kind: "consumable", item: "hint", icon: "💡", name: "3 подсказки", de: "3 Hinweise", price: 60, desc: "Набор из трёх подсказок со скидкой.", pack: 3 },
  { id: "shield", kind: "consumable", icon: "🛡️", name: "Щит комбо", de: "Schild", price: 40, desc: "Одна ошибка не сбросит твоё комбо. Срабатывает сам.", pack: 1 },
  { id: "retry", kind: "consumable", icon: "🔁", name: "Вторая попытка", de: "Zweite Chance", price: 35, desc: "Ошибся? Ответь на то же задание ещё раз без штрафа.", pack: 1 },
  { id: "boost", kind: "consumable", icon: "⚡", name: "XP-буст ×2", de: "XP-Boost", price: 120, desc: "Двойной опыт на 30 минут. Включается сразу после покупки.", pack: 1 },
  // permanent perks
  { id: "backpack", kind: "perk", icon: "🎒", name: "Рюкзак путешественника", de: "Rucksack", price: 300, desc: "+25% монет за все задания. Навсегда." },
  { id: "coffee", kind: "perk", icon: "☕", name: "Кофе с Мией", de: "Kaffee", price: 350, desc: "+10% XP за все задания. Навсегда." },
  { id: "dictionary", kind: "perk", icon: "📖", name: "Словарь Мии", de: "Wörterbuch", price: 250, desc: "Подсказки в магазине стоят вдвое дешевле." },
  // titles
  { id: "title-baku", kind: "title", icon: "🏙️", name: "Титул «Бакинец»", de: "der Bakuer", price: 150, desc: "Титул показывается в профиле и на главной." },
  { id: "title-berlin", kind: "title", icon: "🐻", name: "Титул «Берлинец»", de: "der Berliner", price: 400, desc: "Для тех, кто уже почти там." },
  { id: "title-held", kind: "title", icon: "🦸", name: "Титул «Герой языка»", de: "Sprachheld", price: 800, desc: "Легендарный титул." },
  // themes
  // The default palette, always available: without it a bought theme could never be undone.
  // `free` (not price 0) marks it, so store.buy() can refuse it and it never counts as a purchase.
  { id: "theme-nacht", kind: "theme", theme: "nacht", free: true, icon: "🌃", name: "Тема «Берлинская ночь»", de: "Berliner Nacht", price: 0, desc: "Палитра по умолчанию. Всегда доступна." },
  { id: "theme-gold", kind: "theme", theme: "gold", icon: "🍂", name: "Тема «Золотая осень»", de: "Goldener Herbst", price: 200, desc: "Тёплая янтарно-розовая палитра." },
  { id: "theme-alpen", kind: "theme", theme: "alpen", icon: "🏔️", name: "Тема «Альпы»", de: "Alpen", price: 200, desc: "Изумруд и небо." },
  { id: "theme-kaspi", kind: "theme", theme: "kaspi", icon: "🌊", name: "Тема «Каспий»", de: "Kaspisches Meer", price: 200, desc: "Глубокая синева родного моря." },
];

export const TITLE_NAMES = { "title-baku": "der Bakuer", "title-berlin": "der Berliner", "title-held": "Sprachheld" };

export function priceOf(item, state) {
  let p = item.price;
  if (item.kind === "consumable" && (item.id === "hint" || item.id === "hint3") && state.owned.includes("dictionary")) p = Math.round(p / 2);
  return p;
}

export function applyTheme(themeId) {
  const t = THEMES[themeId] || THEMES.nacht;
  const r = document.documentElement.style;
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent2", t.accent2);
  document.body.dataset.theme = themeId;
  const blobs = document.querySelectorAll(".bg .blob");
  blobs.forEach((b, i) => (b.style.background = t.blobs[i] || t.blobs[0]));
}
