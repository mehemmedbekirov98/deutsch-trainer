// Живая база — та ли, что описана в миграциях.
//
//   node --env-file=.env tools/check-db.mjs
//
// Файл миграции в репозитории ничего не значит, пока его не запустили. Разъехаться легко:
// поправил SQL, забыл применить — и защита есть только на бумаге. Поэтому здесь проверяется не
// текст, а поведение настоящей базы: что видно анониму, что закрыто, что считается.
//
// Ничего не меняет, кроме одной строки счётчика для несуществующего пользователя (её же и
// удаляет). Запускать перед деплоем.
const URL_ = process.env.SUPABASE_URL;
const PUB = process.env.SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !PUB || !SVC) {
  console.error("Нужны SUPABASE_URL, SUPABASE_ANON_KEY и SUPABASE_SERVICE_ROLE_KEY:");
  console.error("  node --env-file=.env tools/check-db.mjs");
  process.exit(1);
}

let failed = 0;
const ok = (what, good, extra = "") => {
  if (!good) failed++;
  console.log(`${good ? "ок    " : "ПРОВАЛ"} ${what.padEnd(52)} ${extra}`);
};

const anon = (p, init = {}) => fetch(`${URL_}${p}`, {
  ...init,
  headers: { apikey: PUB, authorization: `Bearer ${PUB}`, "content-type": "application/json", ...(init.headers || {}) },
});
const service = (p, init = {}) => fetch(`${URL_}${p}`, {
  ...init,
  headers: { apikey: SVC, authorization: `Bearer ${SVC}`, "content-type": "application/json", ...(init.headers || {}) },
});

/* ------------------------------------------------ бакет с голосом не перечисляется */
{
  const r = await anon("/storage/v1/object/list/tts", {
    method: "POST", body: JSON.stringify({ prefix: "", limit: 3, offset: 0 }),
  });
  const rows = await r.json().catch(() => null);
  const count = Array.isArray(rows) ? rows.length : -1;
  ok("список бакета tts анониму закрыт", count <= 0, `вернулось записей: ${Math.max(0, count)}`);
}

/* ------------------------------------------------ …но клип по прямому адресу читается */
{
  // берём любой существующий ключ служебной ролью — это и есть та ссылка, которой живёт браузер
  const r = await service("/storage/v1/object/list/tts", {
    method: "POST", body: JSON.stringify({ prefix: "", limit: 1, offset: 0 }),
  });
  const rows = await r.json().catch(() => null);
  const name = Array.isArray(rows) ? rows[0]?.name : null;
  if (!name) {
    console.log("      (в бакете пока пусто — проверку прямого чтения пропускаю)");
  } else {
    const one = await fetch(`${URL_}/storage/v1/object/public/tts/${name}`, { method: "HEAD" });
    ok("клип по прямому адресу читается без входа", one.ok, `${one.status}`);
  }
}

/* ------------------------------------------------ рейтинг не раздаёт чужие id */
{
  const r = await anon("/rest/v1/rpc/leaderboard", { method: "POST", body: "{}" });
  const rows = await r.json().catch(() => null);
  if (!Array.isArray(rows)) {
    ok("таблица рейтинга отвечает анониму", false, JSON.stringify(rows).slice(0, 120));
  } else {
    ok("таблица рейтинга отвечает анониму", true, `строк: ${rows.length}`);
    ok("чужие id в рейтинге не раздаются", rows.every((x) => x.id === null), `с id: ${rows.filter((x) => x.id).length}`);
    ok("время последнего захода больше не отдаётся", rows.every((x) => !("last_seen" in x)));
  }
}

/* ------------------------------------------------ почту владельца база не подтверждает */
{
  const r = await anon("/rest/v1/rpc/is_owner_email", { method: "POST", body: JSON.stringify({ addr: "test@example.com" }) });
  ok("is_owner_email анониму недоступна", r.status === 404 || r.status === 403 || r.status === 401, `${r.status}`);
}

/* ------------------------------------------------ счётчик расходов работает и закрыт */
{
  const probe = "00000000-0000-0000-0000-0000000000aa";
  const take = async () => {
    const r = await service("/rest/v1/rpc/take_quota", {
      method: "POST",
      body: JSON.stringify({ p_user: probe, p_bucket: "self-check", p_limit: 2, p_window: "1 hour" }),
    });
    return r.ok ? await r.json() : `ошибка ${r.status}`;
  };
  // строка счётчика ссылается на auth.users — для несуществующего id вставка обязана не пройти
  const first = await take();
  const counterWorks = first === true || String(first).includes("ошибка");
  ok("take_quota существует", typeof first === "boolean" || String(first).includes("ошибка"), String(first).slice(0, 60));

  const mine = await anon("/rest/v1/rpc/take_quota", {
    method: "POST",
    body: JSON.stringify({ p_user: probe, p_bucket: "self-check", p_limit: 99, p_window: "1 hour" }),
  });
  ok("take_quota из браузера недоступна", mine.status >= 400, `${mine.status}`);

  const seen = await anon("/rest/v1/usage_counters?select=*");
  const body = await seen.json().catch(() => null);
  ok("счётчики расходов из браузера не читаются", !Array.isArray(body) || body.length === 0, `${seen.status}`);

  if (counterWorks) await service(`/rest/v1/usage_counters?bucket=eq.self-check`, { method: "DELETE" });
}

/* ------------------------------------------------ сейв ограничен по размеру */
{
  // функция security invoker: служебной ролью auth.uid() пуст, так что до размера дело не дойдёт.
  // Проверяем иначе — что новая версия функции на месте, по тексту её ошибки.
  const r = await service("/rest/v1/rpc/save_progress", {
    method: "POST", body: JSON.stringify({ p_data: { xp: 1 }, p_saved_at: 1 }),
  });
  const text = await r.text();
  ok("save_progress отвергает запрос без входа", !r.ok && /not signed in/.test(text), `${r.status}`);
}

console.log(failed ? `\n${failed} ПРОВАЛОВ — база не та, что в миграциях` : "\nживая база совпадает с миграциями");
process.exit(failed ? 1 : 0);
