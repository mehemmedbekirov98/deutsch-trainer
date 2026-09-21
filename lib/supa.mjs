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

/** The caller, but only if they own the place. Returns null for everyone else. */
export async function adminFromRequest(req) {
  const user = await userFromRequest(req);
  if (!user) return null;
  const rows = await rest(`profiles?id=eq.${user.id}&select=id,name,is_admin`).catch(() => null);
  const profile = rows?.[0];
  if (!profile?.is_admin) return null;
  return { ...user, name: profile.name };
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
  rest(`profiles?id=eq.${id}`, { method: "PATCH", body: patch });
