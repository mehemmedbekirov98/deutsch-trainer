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

/**
 * Состояние между блоками не течёт.
 *
 * store — синглтон: xp, rev, guestOffer и таймер сохранения живут в нём между проверками. Пока
 * блоки не сбрасывали его, два из них не проверяли ничего — они видели то, что осталось от
 * соседа сверху, и проходили по случайности. Поэтому каждый блок начинается с чистого листа.
 */
const fresh = () => {
  mem.clear();
  clearTimeout(store._saveTimer);
  // Через adopt(), а не вручную: он достраивает состояние из настоящего freshState(), и
  // проверка не начинает жить в выдуманной форме данных, которой в приложении не бывает.
  store.adopt({ xp: 0 }, false);
  store.rev = 0;
  store.guestOffer = null;
  store.remoteUnknown = false;
  store.saveFails = 0;
  backend.user = null;
  backend.sb = null;
};

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
  fresh();
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
  fresh();
  const real = { xp: 900, coins: 10, savedAt: Date.now() - 1000, levels: {} };
  const srv = fakeBackend({ stored: real, failReads: 0 });

  await store.init();
  await settle();

  eq(store.state.xp, 900, "чтение прошло — прогресс на месте");
  if (!srv.saved.length) fail("при удачном чтении сохранение на сервер вообще не произошло");
}

/* ============================================ 3. совсем новый аккаунт всё-таки сохраняется */
{
  fresh();
  const srv = fakeBackend({ stored: null, failReads: 0 });

  await store.init();
  store.grantXp(25);
  await settle();

  if (!srv.saved.some((s) => (s.xp || 0) > 0)) fail("у нового аккаунта заработанный опыт не уехал на сервер");
}

/* ============================================ 4. читать не удалось совсем — не пишем пустоту */
{
  fresh();
  const real = { xp: 7000, savedAt: Date.now() - 5000, levels: {} };
  const srv = fakeBackend({ stored: real, failReads: 99 });   // не прочитается никогда

  await store.init();
  await settle();

  const wrote = srv.saved.filter((s) => (s.xp || 0) === 0);
  if (wrote.length) fail(`облако недоступно, а пустое состояние всё равно отправлено (${wrote.length} раз)`);
}

/* ============================================ 5. локальная копия переживает недоступное облако */
{
  fresh();
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
  fresh();
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
  fresh();
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
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 2600, coins: 55, levels: { 1: {}, 2: {} }, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 0, levels: {}, savedAt: Date.now() }, rev: 1, failReads: 0 });

  await store.init();
  await settle();

  if (!store.guestOffer) fail("гостевой прогресс есть, аккаунт пуст — а перенос не предложен");
  eq(store.guestOffer?.xp, 2600, "предложено именно то, что заработано");
  eq(store.state.xp, 0, "но молча ничего не перенесено — это должен решить человек");
}

/* ============================================ 9. …и не предлагается, когда предлагать нечего */
//
// Правило — «в браузере БОЛЬШЕ, чем в аккаунте». Если в аккаунте столько же или больше, переносить
// нечего и спрашивать не о чем.
{
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 900, levels: {}, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 2600, levels: {}, savedAt: Date.now() }, rev: 4, failReads: 0 });

  await store.init();
  await settle();

  if (store.guestOffer) fail("в аккаунте прогресса больше, а перенос всё равно предложен");
}

/* ============================================ 9б. …но предлагается, если человек уже начал */
//
// С прежним условием «в аккаунте ровно ноль» предложение исчезало навсегда после первого же
// решённого задания — и всё, наработанное до регистрации, пропадало молча.
{
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, xp: 3000, levels: {}, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 40, levels: {}, savedAt: Date.now() }, rev: 2, failReads: 0 });

  await store.init();
  await settle();

  eq(store.guestOffer?.xp, 3000, "человек успел решить задание — перенос всё равно предложен");
}

/* ============================================ 10. отказ запоминается */
{
  fresh();
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

/* ============================================ 11. перенос действительно доезжает до сервера */
//
// Самая злая из найденных: версию выдаёт сервер, а у гостевого сейва её нет — там ноль. adopt()
// брал ноль себе, следующее сохранение предъявляло его серверу, сервер отвечал «устарело» и
// возвращал ПУСТУЮ строку аккаунта, а мы её принимали. Человек видел «Перенесено: 2400 XP» и
// через полсекунды ноль. Причём отказ не записывался — и обман повторялся при каждом заходе.
{
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, rev: 0, xp: 2400, coins: 70, levels: { 1: {}, 2: {} }, savedAt: Date.now() - 5000 }));
  const srv = fakeBackend({ stored: { xp: 0, levels: {}, savedAt: Date.now() }, rev: 3, failReads: 0 });

  await store.init();
  await settle();
  if (!store.guestOffer) fail("перенос не предложен");

  store.adopt(store.guestOffer);          // ровно то, что делает кнопка «Перенести»
  await settle();

  eq(store.state.xp, 2400, "после переноса опыт остался на экране, а не откатился");
  const onServer = srv.saved[srv.saved.length - 1];
  eq(onServer?.xp, 2400, "и уехал на сервер");
}

/* ============================================ 12. вторая вкладка не откатывает работу первой */
//
// localStorage пишется ДО сетевого запроса, значит в нём версия на шаг позади. Соседняя вкладка
// читала этот блоб и ПОНИЖАЛА себе версию, после чего её собственное сохранение получало отказ и
// она принимала серверную копию — стирая всё, что человек только что сделал именно в ней.
{
  fresh();
  const srv = fakeBackend({ stored: { xp: 1000, levels: {}, savedAt: Date.now() - 1000 }, rev: 5, failReads: 0 });

  await store.init();
  await settle();
  const было = store.rev;

  // соседняя вкладка прислала свой блоб — с версией на шаг позади, как оно и бывает
  store.adopt({ ...store.state, xp: 1000, rev: было - 1 }, false);
  eq(store.rev, было, "версия не понизилась от блоба соседней вкладки");

  store.grantXp(50);
  await settle();

  eq(store.state.xp >= 1050, true, `заработанное осталось (${store.state.xp} XP)`);
  const last = srv.saved[srv.saved.length - 1];
  eq(last?.xp >= 1050, true, `и уехало на сервер (${last?.xp} XP)`);
}

/* ============================================ 13. импорт из файла доезжает до сервера */
//
// У выгруженного файла версии нет вовсе (или она старая — файл сохранён неделю назад). Если
// принять её как свою, сервер ответит «устарело» и вернёт то, что лежит, — импорт отменится сам
// через полсекунды, и человек об этом даже не узнает.
{
  fresh();
  const srv = fakeBackend({ stored: { xp: 500, levels: {}, savedAt: Date.now() }, rev: 9, failReads: 0 });
  await store.init();
  await settle();

  store.adopt({ v: 2, xp: 7777, coins: 12, levels: {}, savedAt: Date.now() - 999999, rev: 2 });
  await settle();

  eq(store.state.xp, 7777, "импортированный прогресс остался");
  eq(srv.saved[srv.saved.length - 1]?.xp, 7777, "и уехал на сервер");
}

/* ============================================ 14. сброс не воскресает после перезагрузки */
//
// «Сбросить прогресс» — необратимое действие по замыслу. Если сброс не доедет до сервера,
// первая же перезагрузка вернёт всё обратно, и кнопка окажется обманом.
{
  fresh();
  const srv = fakeBackend({ stored: { xp: 3000, levels: { 1: {}, 2: {} }, savedAt: Date.now() }, rev: 4, failReads: 0 });
  await store.init();
  await settle();

  store.reset();
  await settle();

  eq(store.state.xp, 0, "после сброса на экране ноль");
  eq(srv.saved[srv.saved.length - 1]?.xp, 0, "и на сервере ноль — сброс доехал");
}

/* ============================================ 15. строка, созданная до миграции версий */
//
// У строк, лежавших в базе до 0006, rev равен нулю — как и у того, кто ещё ничего не читал. По
// одним версиям такая строка не считается новее, и настоящий прогресс был бы затёрт. Запасное
// правило — опыт: он только растёт, так что больше опыта значит больше сделанной работы.
{
  fresh();
  const srv = fakeBackend({ stored: { xp: 6100, levels: { 1: {} }, savedAt: Date.now() - 86400000 }, rev: 0, failReads: 1 });

  await store.init();
  await settle();

  eq(store.state.xp, 6100, "старая строка без версии не потерялась");
  const wrote = srv.saved.filter((s) => (s.xp || 0) === 0);
  if (wrote.length) fail("поверх старой строки ушёл ноль");
}

/* ============================================ 16. гостевой сейв не раздаётся следующему */
//
// После переноса гостевая копия должна исчезнуть. Иначе она предлагается каждому, кто войдёт в
// этом браузере дальше, — а галочка «перенести» при регистрации включена по умолчанию. На общем
// компьютере это раздача чужого прогресса всем подряд.
{
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, rev: 0, xp: 1200, levels: {}, savedAt: Date.now() - 1000 }));
  fakeBackend({ stored: { xp: 0, levels: {}, savedAt: Date.now() }, rev: 2, failReads: 0 });

  await store.init();
  await settle();
  store.adopt(store.guestOffer);
  store.clearGuestSave();
  await settle();

  eq(mem.get("deutsch-ali-v1"), undefined, "гостевой сейв убран после переноса");

  // следующий человек в том же браузере
  backend.user = { id: "u2", email: "other@example.com", name: "Другой" };
  await store.init();
  await settle();
  if (store.guestOffer) fail("следующему аккаунту предложили чужой прогресс");
}

/* ============================================ 17. удаление аккаунта не трогает гостевой сейв */
{
  fresh();
  mem.set("deutsch-ali-v1", JSON.stringify({ v: 2, rev: 0, xp: 800, levels: {}, savedAt: Date.now() }));
  mem.set("deutsch-ali-v1:u1", JSON.stringify({ v: 2, rev: 3, xp: 5000, levels: {}, savedAt: Date.now() }));

  store.forgetAccountSave("u1");

  eq(mem.get("deutsch-ali-v1:u1"), undefined, "копия удалённого аккаунта убрана");
  eq(JSON.parse(mem.get("deutsch-ali-v1") || "{}").xp, 800, "а гостевой прогресс чужого человека цел");
}

/* ============================================ 18. стёртая заметка не возвращается */
//
// Заметки Мии — это личное. Принять серверную копию можно по многим поводам: конфликт
// сохранения, соседняя вкладка, повторное чтение облака, — и в каждой из них лежит список ДО
// удаления. Строка, которую человек убрал из кабинета, появлялась снова и молча.
{
  fresh();
  fakeBackend({ stored: { xp: 100, levels: {}, miaNotes: ["Переезжает в Лейпциг", "Работает поваром"], savedAt: Date.now() }, rev: 3, failReads: 0 });

  await store.init();
  await settle();
  eq((store.state.miaNotes || []).length, 2, "заметки приехали с сервера");

  store.forgetNote("Работает поваром");
  eq((store.state.miaNotes || []).length, 1, "заметка убрана");

  // сервер прислал свою копию — со старым списком
  store.adopt({ xp: 100, levels: {}, miaNotes: ["Переезжает в Лейпциг", "Работает поваром"], rev: 4 }, false);

  eq((store.state.miaNotes || []).includes("Работает поваром"), false, "стёртая заметка не вернулась с чужой копией");
  eq((store.state.miaNotes || []).length, 1, "а остальные на месте");
}

console.log(failed ? `\n${failed} FAILURES` : "Прогресс не теряется: чтение, облако, чужая запись, часы, перенос, вкладки, импорт, сброс, старая строка, чужой гость, стёртая заметка");
process.exit(failed ? 1 : 0);
