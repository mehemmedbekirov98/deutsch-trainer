// Talking to Supabase from inside a Netlify function.
//
// Plain REST rather than the JS client: the functions need three queries between them, and pulling
// a dependency into every cold start to save nine lines is a bad trade.
const url = () => process.env.SUPABASE_URL || "";
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const configured = () => Boolean(url() && serviceKey());

/** A REST call with the service role — bypasses row-level security, so never expose this directly. */
async function rest(path, { method = "GET", body, headers = {} } = {}) {
  const r = await fetch(`${url()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey(),
      authorization: `Bearer ${serviceKey()}`,
      "content-type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`supabase ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

/**
 * Who is making this request, according to Supabase itself.
 *
 * The browser sends the access token it already has; we ask Supabase whether it is real rather
 * than verifying a signature ourselves. One extra round trip, no key handling, no way to get it
 * subtly wrong.
 */
export async function userFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !configured()) return null;
  const r = await fetch(`${url()}/auth/v1/user`, {
    headers: { apikey: serviceKey(), authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ? u : null;
}

/**
 * The caller as a learner: signed in, and not blocked.
 *
 * Anything that costs money per call goes through here. Without it /api/tutor is a free Claude
 * endpoint on the open internet — anyone who finds the URL spends the owner's key, and a blocked
 * account carries on talking as if nothing happened.
 *
 * Returns { id, name, blocked } or null.
 */
export async function learnerFromRequest(req) {
  const user = await userFromRequest(req);
  if (!user) return null;
  // Сорвавшийся запрос — это НЕ «человек не заблокирован».
  //
  // Раньше здесь стоял `.catch(() => null)`, и дальше `Boolean(undefined?.blocked)` давало false.
  // То есть на любой моргнувшей связи с базой заблокированный аккаунт снова получал платную Мию,
  // и именно в тот момент, когда проверить это некому. Отказ в такую минуту стоит одной
  // непрочитанной реплики; открытая дверь стоит денег и не закрывается сама.
  let rows;
  try {
    rows = await rest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,name,blocked`);
  } catch (e) {
    const err = new Error("профиль не прочитался: " + (e?.message || e));
    err.unavailable = true;
    throw err;
  }
  const profile = rows?.[0];
  // no profile row yet (the trigger has not fired) is not a reason to refuse a paying learner
  return { id: user.id, name: profile?.name || "", blocked: Boolean(profile?.blocked) };
}

/**
 * Взять одну единицу дневного расхода. false — лимит исчерпан.
 *
 * Считает база (см. take_quota в 0004_limits.sql): функции Netlify между вызовами не помнят
 * ничего, и счётчику в памяти процесса грош цена — платформа поднимает их сколько угодно
 * параллельно. Отдельная строка на человека и вид расхода, окно скользящее.
 *
 * Не смогли посчитать — пропускаем. Здесь fail-open осознанный и обратный предыдущему: цена
 * ошибки — несколько лишних реплик, а не запертый снаружи ученик. Настоящий потолок по деньгам
 * ставится в консоли Anthropic, и он от нашей базы не зависит.
 */
export async function takeQuota(userId, bucket, limit, windowInterval = "24 hours") {
  if (!configured() || !userId) return true;
  try {
    const ok = await rest("rpc/take_quota", {
      method: "POST",
      body: { p_user: userId, p_bucket: bucket, p_limit: limit, p_window: windowInterval },
    });
    return ok !== false;
  } catch (e) {
    console.error("[quota]", e?.message || e);
    return true;
  }
}

/**
 * The owner's own address. Set with OWNER_EMAILS (comma separated) if it ever needs to change;
 * the default is the person this was built by.
 */
const OWNER_EMAILS = (process.env.OWNER_EMAILS || "mehemmedbekirov98@gmail.com")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** The caller, but only if they own the place. Returns null for everyone else. */
export async function adminFromRequest(req) {
  const user = await userFromRequest(req);
  if (!user) return null;
  const rows = await rest(`profiles?id=eq.${user.id}&select=id,name,is_admin`).catch(() => null);
  const profile = rows?.[0];
  const owner = OWNER_EMAILS.includes(String(user.email || "").toLowerCase());
  if (!profile?.is_admin && !owner) return null;
  // the database had not caught up yet — fix it now so the panel link shows next time too
  if (owner && profile && !profile.is_admin) await updateProfile(user.id, { is_admin: true }).catch(() => {});
  return { ...user, name: profile?.name || "Админ" };
}

export const getSetting = async (key) => {
  const rows = await rest(`app_settings?key=eq.${encodeURIComponent(key)}&select=value`).catch(() => null);
  return rows?.[0]?.value || null;
};

export const setSetting = (key, value, by) =>
  rest("app_settings", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates" },
    body: [{ key, value, updated_by: by || null, updated_at: new Date().toISOString() }],
  });

export const deleteSetting = (key) =>
  rest(`app_settings?key=eq.${encodeURIComponent(key)}`, { method: "DELETE" });

export const listUsers = () =>
  rest("profiles?select=id,name,is_admin,blocked,public_board,created_at&order=created_at.asc");

export const listProgress = () =>
  rest("progress?select=user_id,data,updated_at");

export const updateProfile = (id, patch) =>
  rest(`profiles?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch });

/**
 * Удалить человека и всё, что о нём хранится.
 *
 * Строки в progress, profiles и usage_counters завязаны на auth.users через `on delete cascade`,
 * так что формально достаточно удалить саму учётную запись. Но полагаться на одно только
 * каскадирование здесь не стоит: если в будущем появится таблица без такой связи, данные тихо
 * останутся без хозяина. Поэтому сначала явно убираем известное, потом учётную запись; отказ на
 * первых двух шагах не останавливает третий — учётная запись должна исчезнуть в любом случае.
 */
export async function deleteAccount(id) {
  const who = encodeURIComponent(id);
  await rest(`progress?user_id=eq.${who}`, { method: "DELETE" }).catch(() => {});
  await rest(`usage_counters?user_id=eq.${who}`, { method: "DELETE" }).catch(() => {});
  await rest(`profiles?id=eq.${who}`, { method: "DELETE" }).catch(() => {});

  const r = await fetch(`${url()}/auth/v1/admin/users/${who}`, {
    method: "DELETE",
    headers: { apikey: serviceKey(), authorization: `Bearer ${serviceKey()}` },
  });
  if (!r.ok) throw new Error(`удаление аккаунта: ${r.status} ${(await r.text().catch(() => "")).slice(0, 120)}`);
}
