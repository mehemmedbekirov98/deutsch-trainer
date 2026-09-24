// Кто что может — проверка на живой базе.
//
//   node --env-file=.env tools/check-access.mjs
//
// Обычные тесты сюда не достают: права живут не в коде, а в правилах доступа Postgres и в двух
// серверных функциях, и «выглядит правильно» там ничего не значит. Поэтому проверка настоящая —
// заводит временный аккаунт служебным ключом, входит им, дёргает функции его настоящим токеном
// и удаляет за собой.
//
// ОСТОРОЖНО: работает с тем проектом Supabase, который указан в .env, и делает один платный
// запрос к Claude (короткий). Запускать руками перед деплоем и после любой правки прав —
// не в CI и не в `npm test`.
//
// Что должно получиться:
//   · вошедший человек получает ответ Мии          → 200
//   · он же в админке                              → 403
//   · он же меняет ключ Anthropic                   → 403
//   · заблокированный говорит с Мией                → 403
//   · заблокированный пишет прогресс                → отказ самой базы, а не функции
import path from "node:path";
import { fileURLToPath } from "node:url";

const URL_ = process.env.SUPABASE_URL;
const PUB = process.env.SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !PUB || !SVC) {
  console.error("Нужны SUPABASE_URL, SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY. Запускай так:");
  console.error("  node --env-file=.env tools/check-access.mjs");
  process.exit(1);
}

const FUNCTIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "netlify", "functions");
const fnUrl = (name) => new URL(`file://${path.join(FUNCTIONS, name).replace(/\\/g, "/")}`).href;

// Адрес заведомо ничей: домен example.com зарезервирован стандартом и почту не принимает.
const email = `access-probe-${Date.now().toString(36)}@example.com`;
const password = "Pr0be-" + "q".repeat(14);

const service = (p, init = {}) => fetch(`${URL_}${p}`, {
  ...init,
  headers: { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json", ...(init.headers || {}) },
});

/** Позвать функцию Netlify напрямую: это обычный модуль, которому нужен Request. */
async function call(name, body, token) {
  const { default: fn } = await import(fnUrl(name));
  const res = await fn(new Request(`http://localhost/api/${name.replace(".mjs", "")}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }));
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  return { status: res.status, body: parsed };
}

let failed = 0;
const expect = (what, got, want, extra = "") => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "ок    " : "ПРОВАЛ"} ${what.padEnd(40)} ${got} (ждём ${want}) ${extra}`);
};

let id = null;
try {
  const made = await service("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "Проба" } }),
  }).then((r) => r.json());
  if (!made?.id) { console.error("не удалось завести временный аккаунт:", JSON.stringify(made).slice(0, 200)); process.exit(1); }
  id = made.id;

  const { access_token: token } = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: PUB, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).then((r) => r.json());
  if (!token) { console.error("не удалось войти временным аккаунтом"); process.exit(1); }

  /* --------------------------------------------- чужой без токена никуда не проходит */
  expect("Мия без токена", (await call("tutor.mjs", { messages: [{ role: "user", content: "salam" }] })).status, 401);
  expect("админка без токена", (await call("admin.mjs", { action: "overview" })).status, 403);

  /* --------------------------------------------- вошедший получает Мию, но не админку */
  const mia = await call("tutor.mjs", {
    messages: [{ role: "user", content: "Salam! Bir sözlə: almanca çətindirmi?" }],
    scenario: null, notes: [], profile: { name: "Проба", cefr: "A2", mode: "chat", uiLang: "az" },
  }, token);
  expect("Мия вошедшему", mia.status, 200, `lang=${mia.body?.lang}`);
  expect("админка вошедшему", (await call("admin.mjs", { action: "overview" }, token)).status, 403);
  expect("ключ Anthropic вошедшему", (await call("admin.mjs", { action: "clearKey" }, token)).status, 403);

  /* --------------------------------------------- сам себя админом не сделает */
  const promote = await fetch(`${URL_}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: { apikey: PUB, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ is_admin: true }),
  });
  expect("сделать себя админом", promote.status, 403);

  /* --------------------------------------------- озвучка тоже только для своих */
  expect("озвучка без токена", (await call("tts.mjs", { text: "Hallo", store: false })).status, 401);

  /* --------------------------------------------- счётчик расходов действительно считает */
  //
  // Берём лимит в 1 на выдуманный вид расхода: первый раз проходит, второй обязан упереться.
  // Если счётчик молча пропускает всё подряд — защита от «скрипт в цикле» не работает, а узнать
  // об этом по-другому можно только по счёту от Anthropic.
  {
    const take = async () => {
      const r = await service("/rest/v1/rpc/take_quota", {
        method: "POST",
        body: JSON.stringify({ p_user: id, p_bucket: "probe", p_limit: 1, p_window: "1 hour" }),
      });
      return r.ok ? await r.json() : `HTTP ${r.status}`;
    };
    expect("счётчик: первое обращение проходит", await take(), true);
    expect("счётчик: второе упирается в лимит", await take(), false);
  }

  /* --------------------------------------------- гигантский сейв база не принимает */
  {
    const huge = { xp: 1, ballast: "я".repeat(400_000) };
    const r = await fetch(`${URL_}/rest/v1/rpc/save_progress`, {
      method: "POST",
      headers: { apikey: PUB, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ p_data: huge, p_rev: 0 }),
    });
    const text = await r.text();
    expect("сейв на 400 КБ отвергается", r.status === 400 && /too large/.test(text), true, "(проверяет сама база)");
  }

  /* --------------------------------------------- порядок решает сервер, а не часы */
  //
  // Версию выдаёт сервер; браузер предъявляет ту, что видел. Устаревшая версия не затирает — в
  // ответ приходит чужая копия. Часы устройства в этом больше не участвуют вообще.
  {
    const rpc = (fn, body) => fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: PUB, authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

    const first = await rpc("save_progress", { p_data: { xp: 10 }, p_rev: 0 });
    expect("первое сохранение", first.status, 200);
    expect("сервер выдал версию", Number(first.body?.rev) > 0, true, `(rev=${first.body?.rev})`);

    const rev = Number(first.body.rev);
    const second = await rpc("save_progress", { p_data: { xp: 20 }, p_rev: rev });
    expect("сохранение со свежей версией проходит", Number(second.body?.rev), rev + 1);

    // …а с устаревшей — нет, и в ответ приходит то, что лежит
    const stale = await rpc("save_progress", { p_data: { xp: 999 }, p_rev: rev });
    expect("устаревшая версия не затирает", stale.body?.stale, true);
    expect("и в ответ приходит лежащая копия", stale.body?.data?.xp, 20);

    const row = await service(`/rest/v1/progress?user_id=eq.${id}&select=data,saved_at,rev`).then((r) => r.json()).catch(() => []);
    expect("на сервере осталось верное", row?.[0]?.data?.xp, 20);
    const drift = Math.abs(Number(row?.[0]?.saved_at || 0) - Date.now());
    expect("время проставил сервер, а не браузер", drift < 120000, true, `(расхождение ${Math.round(drift / 1000)} с)`);

    const load = await rpc("load_progress", {});
    expect("чтение отдаёт и данные, и версию", Number(load.body?.rev), rev + 1);
  }

  /* --------------------------------------------- удалить можно только себя, и только подтвердив */
  expect("удаление аккаунта без токена", (await call("account.mjs", { action: "delete", confirmEmail: email })).status, 401);
  expect("удаление с чужой почтой", (await call("account.mjs", { action: "delete", confirmEmail: "someone-else@example.com" }, token)).status, 400);

  /* --------------------------------------------- блокировка действительно блокирует */
  await service(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ blocked: true }) });
  expect("заблокированный у Мии", (await call("tutor.mjs", { messages: [{ role: "user", content: "salam" }] }, token)).status, 403);

  const save = await fetch(`${URL_}/rest/v1/rpc/save_progress`, {
    method: "POST",
    headers: { apikey: PUB, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ p_data: { xp: 1 }, p_rev: 0 }),
  });
  expect("заблокированный пишет прогресс", save.status, 400, "(отказывает сама база)");

  /* --------------------------------------------- …а со своей почтой аккаунт действительно исчезает */
  //
  // Последней: после неё аккаунта уже нет. Проверяем не ответ функции, а саму базу — исчезла ли
  // строка. Удаление, которое отвечает «ок» и ничего не удаляет, хуже отсутствующей кнопки.
  await service(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ blocked: false }) });
  const gone = await call("account.mjs", { action: "delete", confirmEmail: email }, token);
  expect("удаление своего аккаунта", gone.status, 200);
  const left = await service(`/auth/v1/admin/users/${id}`).then((r) => r.status);
  expect("учётной записи больше нет", left === 404 || left === 400, true, `(ответ базы ${left})`);
  const rows = await service(`/rest/v1/progress?user_id=eq.${id}&select=user_id`).then((r) => r.json()).catch(() => []);
  expect("прогресс удалённого тоже исчез", Array.isArray(rows) && rows.length === 0, true);
  if (gone.status === 200) id = null; // убирать за собой уже нечего
} finally {
  if (id) {
    await service(`/auth/v1/admin/users/${id}`, { method: "DELETE" });
    console.log("\nвременный аккаунт удалён");
  }
}

console.log(failed ? `\n${failed} ПРОВАЛОВ — права разъехались, деплоить нельзя` : "\nвсе проверки прав пройдены");
process.exit(failed ? 1 : 0);
