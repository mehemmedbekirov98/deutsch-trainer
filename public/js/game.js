// RPG layer: coins, shop items, themes

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
