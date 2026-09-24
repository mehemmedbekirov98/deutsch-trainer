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

/**
 * Подставной сервер — с той же договорённостью, что и настоящий.
 *
 * Главное здесь `rev`: версию выдаёт сервер, браузер предъявляет ту, что видел, и если она
 * устарела — запись не проходит, а в ответ приходит чужая копия. Подделывать это «попроще»
 * нельзя: проверка тогда проверяла бы выдуманный протокол, а не тот, по которому работает сайт.
 */
function fakeBackend({ stored = null, failReads = 0, rev = stored ? 7 : 0 }) {
  let reads = 0;
  let curRev = rev;
  let curData = stored;
  const saved = [];
  backend.sb = {};                       // достаточно, чтобы cloud стал true
  backend.user = { id: "u1", email: "probe@example.com", name: "Проба" };
  backend.loadProgress = async () => {
    reads++;
    if (reads <= failReads) throw new Error("сеть моргнула");
    return curData ? { ...curData, rev: curRev } : null;
  };
  backend.saveProgress = async (state, baseRev = 0) => {
    if (curRev > (Number(baseRev) || 0)) {
      return { stale: true, current: { ...curData, rev: curRev }, rev: curRev };
    }
    curRev += 1;
    curData = JSON.parse(JSON.stringify(state));
    saved.push(curData);
    return { ok: true, rev: curRev };
  };
  return { saved, reads: () => reads, rev: () => curRev };
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

/* ============================================ 6. часы устройства ничего не решают */
//
// Телефон с часами, убежавшими на год вперёд, раньше выигрывал любой спор: его `savedAt` был
// больше, значит «новее». Теперь спорят версиями, которые выдаёт сервер, и сбитые часы не дают
// никакого преимущества.
{
  mem.clear();
  const серверная = { xp: 5000, savedAt: Date.now() - 60000, levels: {} };   // сохранена минуту назад
  const srv = fakeBackend({ stored: серверная, rev: 9, failReads: 0 });

  // местная копия с часами из будущего, но со СТАРОЙ версией
  const сбитыеЧасы = {
    v: 2, rev: 4, xp: 10, coins: 0, savedAt: Date.now() + 365 * 86400000,
    levels: {}, settings: {}, stats: {}, streak: {}, inventory: {}, daily: {}, games: {}, words: {},
  };
  mem.set("deutsch-ali-v1:u1", JSON.stringify(сбитыеЧасы));

  await store.init();
  await settle();

  eq(store.state.xp, 5000, "победила серверная копия, а не та, у которой часы убежали");
}

/* ============================================ 7. чужая запись не затирается */
//
// Другая вкладка или другое устройство сохранили, пока мы держали экран открытым. Наша версия
// устарела — сервер обязан отказать и вернуть их копию, а мы обязаны её принять.
{
  mem.clear();
  const srv = fakeBackend({ stored: { xp: 100, savedAt: Date.now(), levels: {} }, rev: 3, failReads: 0 });

  await store.init();
  await settle();
  const свояВерсия = store.rev;

  // кто-то другой записал поверх, пока мы работали
  backend.loadProgress = async () => ({ xp: 8888, savedAt: Date.now(), levels: {}, rev: свояВерсия + 5 });
  backend.saveProgress = async (state, baseRev) => (
    (Number(baseRev) || 0) < свояВерсия + 5
      ? { stale: true, current: { xp: 8888, savedAt: Date.now(), levels: {}, rev: свояВерсия + 5 }, rev: свояВерсия + 5 }
      : { ok: true, rev: свояВерсия + 6 }
  );

  store.grantXp(10);
  await settle();

  eq(store.state.xp, 8888, "приняли чужую, более свежую копию вместо того чтобы её затереть");
  eq(store.rev, свояВерсия + 5, "и запомнили её версию");
}

/* ============================================ 8. гостевой прогресс предлагается, а не пропадает */
//
// Письмо с подтверждением открыли на телефоне: первый вход произошёл там, и на сервере появилась
// пустая строка. Человек возвращается за компьютер, где лежит всё заработанное, — и раньше видел
// ноль, потому что условие переноса требовало «серверной копии нет вовсе». Теперь предлагается.
{
  mem.clear();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 2600, coins: 55, levels: { 1: {}, 2: {} }, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 0, levels: {}, savedAt: Date.now() }, rev: 1, failReads: 0 });

  await store.init();
  await settle();

  if (!store.guestOffer) fail("гостевой прогресс есть, аккаунт пуст — а перенос не предложен");
  eq(store.guestOffer?.xp, 2600, "предложено именно то, что заработано");
  eq(store.state.xp, 0, "но молча ничего не перенесено — это должен решить человек");
}

/* ============================================ 9. …и не предлагается, когда предлагать нечего */
{
  mem.clear();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 2600, levels: {}, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 900, levels: {}, savedAt: Date.now() }, rev: 4, failReads: 0 });

  await store.init();
  await settle();

  if (store.guestOffer) fail("в аккаунте есть прогресс, а перенос всё равно предложен");
}

/* ============================================ 10. отказ запоминается */
{
  mem.clear();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 300, levels: {}, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 0, levels: {}, savedAt: Date.now() }, rev: 1, failReads: 0 });

  await store.init();
  await settle();
  if (!store.guestOffer) fail("перенос не предложен в первый раз");

  const { refuseGuestOffer } = await import("../public/js/store.js");
  refuseGuestOffer("u1");

  await store.init();
  await settle();
  if (store.guestOffer) fail("отказались — а спрашивают снова");
}

console.log(failed ? `\n${failed} FAILURES` : "Прогресс не теряется: сорванное чтение, недоступное облако, чужая запись, сбитые часы, гостевой перенос");
process.exit(failed ? 1 : 0);
