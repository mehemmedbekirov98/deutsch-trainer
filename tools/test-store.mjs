// Прогресс нельзя потерять молча.
//
//   node tools/test-store.mjs
//
// Самая дорогая поломка в этом проекте не видна ни на одном экране: человек занимается, всё
// выглядит правильно, а на сервер уезжает пустое состояние поверх настоящего. Узнают о ней
// только когда зайдут с другого устройства — и там ноль.
//
// Сценарий был такой. Новый телефон, аккаунт есть, локальной копии нет. Первое чтение облака
// срывается (моргнул интернет) — состояние остаётся пустым. Дальше init() всё равно зовёт
// save(), а save() первой строкой ставит savedAt = Date.now(). Отложенная проверка конфликта
// сравнивала настоящую вчерашнюю копию с этой свежей отметкой — и она, разумеется, никогда не
// оказывалась «новее». Пустышка уезжала на сервер и затирала всё.
//
// Здесь это проверяется на подставных backend и localStorage: без сети, без базы, за миллисекунды.

/* ----------------------------------------------------------------- окружение браузера */
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
};
globalThis.window = { addEventListener() {}, speechSynthesis: null, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = { addEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, append() {} }), documentElement: {} };
Object.defineProperty(globalThis, "navigator", { value: { language: "ru-RU", userAgent: "node" }, configurable: true });

const { backend } = await import("../public/js/backend.js");
const { store } = await import("../public/js/store.js");

let failed = 0;
const fail = (m) => { failed++; console.log("ПРОВАЛ " + m); };
const eq = (got, want, what) => { if (got !== want) fail(`${what}: получили ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`); };

/** Подставной сервер: считает обращения и позволяет сорвать любое из них. */
function fakeBackend({ stored = null, failReads = 0 }) {
  let reads = 0;
  const saved = [];
  backend.sb = {};                       // достаточно, чтобы cloud стал true
  backend.user = { id: "u1", email: "probe@example.com", name: "Проба" };
  backend.loadProgress = async () => {
    reads++;
    if (reads <= failReads) throw new Error("сеть моргнула");
    return stored;
  };
  backend.saveProgress = async (state) => {
    saved.push(JSON.parse(JSON.stringify(state)));
    return { ok: true };
  };
  return { saved, reads: () => reads };
}

const settle = () => new Promise((r) => setTimeout(r, 700)); // save() откладывает запись на 400 мс

/* ============================================ 1. сорванное чтение не затирает облако */
{
  mem.clear();
  const real = { xp: 4200, coins: 300, savedAt: Date.now() - 86400000, levels: { 1: { examBest: 90 } } };
  const srv = fakeBackend({ stored: real, failReads: 1 });

  await store.init();
  await settle();

  const wrote = srv.saved.filter((s) => (s.xp || 0) === 0);
  if (wrote.length) fail(`на сервер ушло пустое состояние (${wrote.length} раз) поверх ${real.xp} XP`);
  eq(store.state.xp, 4200, "после повторного чтения приняли настоящую копию");
  const last = srv.saved[srv.saved.length - 1];
  if (last && (last.xp || 0) !== 4200) fail(`последним на сервер ушло ${last.xp} XP вместо 4200`);
}

/* ============================================ 2. обычный случай не сломан */
{
  mem.clear();
  const real = { xp: 900, coins: 10, savedAt: Date.now() - 1000, levels: {} };
  const srv = fakeBackend({ stored: real, failReads: 0 });

  await store.init();
  await settle();

  eq(store.state.xp, 900, "чтение прошло — прогресс на месте");
  if (!srv.saved.length) fail("при удачном чтении сохранение на сервер вообще не произошло");
}

/* ============================================ 3. совсем новый аккаунт всё-таки сохраняется */
{
  mem.clear();
  const srv = fakeBackend({ stored: null, failReads: 0 });

  await store.init();
  store.grantXp(25);
  await settle();

  if (!srv.saved.some((s) => (s.xp || 0) > 0)) fail("у нового аккаунта заработанный опыт не уехал на сервер");
}

/* ============================================ 4. читать не удалось совсем — не пишем пустоту */
{
  mem.clear();
  const real = { xp: 7000, savedAt: Date.now() - 5000, levels: {} };
  const srv = fakeBackend({ stored: real, failReads: 99 });   // не прочитается никогда

  await store.init();
  await settle();

  const wrote = srv.saved.filter((s) => (s.xp || 0) === 0);
  if (wrote.length) fail(`облако недоступно, а пустое состояние всё равно отправлено (${wrote.length} раз)`);
}

/* ============================================ 5. локальная копия переживает недоступное облако */
{
  mem.clear();
  const mine = { v: 2, xp: 1500, coins: 40, savedAt: Date.now() - 2000, levels: {}, settings: {}, stats: {}, streak: {}, inventory: {}, daily: {}, games: {}, words: {} };
  mem.set("deutsch-ali-v1:u1", JSON.stringify(mine));
  fakeBackend({ stored: null, failReads: 99 });

  await store.init();
  await settle();

  eq(store.state.xp, 1500, "локальный прогресс не потерялся из-за недоступного облака");
}

console.log(failed ? `\n${failed} FAILURES` : "Прогресс не теряется: сорванное чтение, недоступное облако, новый аккаунт");
process.exit(failed ? 1 : 0);
