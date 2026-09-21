// The owner's panel. Everything here refuses anyone who is not an admin, first line, every time.
import Anthropic from "@anthropic-ai/sdk";
import {
  configured, adminFromRequest, getSetting, setSetting, deleteSetting,
  listUsers, listProgress, updateProfile,
} from "../../lib/supa.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!configured()) return json({ error: "База не подключена к этому сайту." }, 503);

  const admin = await adminFromRequest(req);
  // Deliberately the same answer as "not signed in": whether an account is an admin is not
  // something a stranger gets to learn by probing.
  if (!admin) return json({ error: "Нет доступа." }, 403);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad body" }, 400); }

  try {
    switch (body?.action) {
      case "overview": return json(await overview());
      case "setKey":   return json(await setKey(body.key, admin.id));
      case "clearKey": await deleteSetting("anthropic_key"); return json({ ok: true, hasKey: false });
      case "setUser":  return json(await setUser(body));
      default: return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("[admin]", e);
    return json({ error: e?.message || "Что-то пошло не так." }, 500);
  }
};

/** Everything the panel shows in one call — it is a handful of rows, not a report. */
async function overview() {
  const [profiles, progress] = await Promise.all([listUsers(), listProgress()]);
  const byId = new Map(progress.map((p) => [p.user_id, p]));
  const day = 86_400_000;
  const now = Date.now();

  const users = profiles.map((p) => {
    const row = byId.get(p.id);
    const d = row?.data || {};
    return {
      id: p.id,
      name: p.name,
      isAdmin: p.is_admin,
      blocked: p.blocked,
      publicBoard: p.public_board,
      createdAt: p.created_at,
      lastSeen: row?.updated_at || null,
      xp: Number(d.xp) || 0,
      cefr: d.cefr || "A1",
      levels: Object.values(d.levels || {}).filter((l) => (l.examBest || 0) >= 70).length,
      streak: Number(d.streak?.best) || 0,
      minutes: Number(d.stats?.minutes) || 0,
    };
  });

  const active = (days) => users.filter((u) => u.lastSeen && now - Date.parse(u.lastSeen) < days * day).length;

  return {
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY) || Boolean(await getSetting("anthropic_key")),
    keyFromEnv: Boolean(process.env.ANTHROPIC_API_KEY),
    users,
    stats: {
      total: users.length,
      today: active(1),
      week: active(7),
      withProgress: users.filter((u) => u.xp > 0).length,
      xp: users.reduce((s, u) => s + u.xp, 0),
    },
  };
}

/** Save a key only after proving it actually works — a wrong one would break Mia silently. */
async function setKey(key, byId) {
  const value = String(key || "").trim();
  if (!value.startsWith("sk-")) return { error: "Это не похоже на ключ Anthropic — он начинается с sk-." };
  try {
    const test = new Anthropic({ apiKey: value, timeout: 10_000, maxRetries: 0 });
    await test.messages.create({
      model: process.env.CLAUDE_MODEL || "claude-opus-5",
      max_tokens: 16,
      messages: [{ role: "user", content: "ok" }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: "Ключ не принят. Скопируй его в консоли Anthropic кнопкой «Copy key»." };
    if (/credit|balance|quota/i.test(String(e?.message))) return { error: "Ключ верный, но на счёте Anthropic нет средств." };
    return { error: `Не получилось проверить ключ: ${e?.message || e}` };
  }
  await setSetting("anthropic_key", value, byId);
  return { ok: true, hasKey: true };
}

async function setUser({ id, blocked, isAdmin }) {
  const patch = {};
  if (typeof blocked === "boolean") patch.blocked = blocked;
  if (typeof isAdmin === "boolean") patch.is_admin = isAdmin;
  if (!Object.keys(patch).length) return { error: "нечего менять" };
  await updateProfile(id, patch);
  return { ok: true };
}

export const config = { path: "/api/admin" };
