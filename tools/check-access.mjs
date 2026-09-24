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
      body: JSON.stringify({ p_data: huge, p_saved_at: Date.now() }),
    });
    const text = await r.text();
    expect("сейв на 400 КБ отвергается", r.status === 400 && /too large/.test(text), true, "(проверяет сама база)");
  }

  /* --------------------------------------------- блокировка действительно блокирует */
  await service(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ blocked: true }) });
  expect("заблокированный у Мии", (await call("tutor.mjs", { messages: [{ role: "user", content: "salam" }] }, token)).status, 403);

  const save = await fetch(`${URL_}/rest/v1/rpc/save_progress`, {
    method: "POST",
    headers: { apikey: PUB, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ p_data: { xp: 1 }, p_saved_at: Date.now() }),
  });
  expect("заблокированный пишет прогресс", save.status, 400, "(отказывает сама база)");
} finally {
  if (id) {
    await service(`/auth/v1/admin/users/${id}`, { method: "DELETE" });
    console.log("\nвременный аккаунт удалён");
  }
}

console.log(failed ? `\n${failed} ПРОВАЛОВ — права разъехались, деплоить нельзя` : "\nвсе проверки прав пройдены");
process.exit(failed ? 1 : 0);
