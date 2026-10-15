// What this deployment has, and which Supabase project it belongs to.
//
// The page is static, so it cannot read environment variables — this is how it learns them. Only
// the public ones: the Supabase URL and the anon key are meant to be in the browser (they are what
// row-level security is built around). The service role key and the Anthropic key never leave here.

import { configured, getSetting } from "../../lib/supa.mjs";
import { synthesise } from "../../lib/tts.mjs";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", ...headers },
  });

/*
 * ВРЕМЕННО. Жив ли синтез речи ИЗ САМОЙ функции.
 *
 * Синтез идёт через чужой сервис, и с ноутбука он отвечает, а из облака может и не ответить:
 * адреса дата-центров там блокируют отдельно. Снаружи эти два случая неотличимы — человек
 * просто слышит голос браузера вместо Мии. /api/tts спрашивает вход и ответить на этот вопрос
 * не может, а лазить в чужой аккаунт, чтобы прочитать одну строку ошибки, — не дело.
 *
 * Поэтому зонд: ОДНА неизменная короткая строка, одним неизменным голосом, без записи в
 * хранилище и не чаще раза в минуту. Текст фиксирован нарочно — через это поле нельзя
 * прогнать ни чужой текст, ни чужой голос. Убрать, как только причина найдена.
 */
const PROBE_TEXT = "Hallo";
const PROBE_VOICE = "de-DE-SeraphinaMultilingualNeural";
const PROBE_EVERY_MS = 60_000;
let probeAt = 0;
let probeWas = null;

async function probeVoice() {
  if (probeWas && Date.now() - probeAt < PROBE_EVERY_MS) return { ...probeWas, cached: true };
  const started = Date.now();
  try {
    const out = await synthesise({ text: PROBE_TEXT, voice: PROBE_VOICE, budgetMs: 9000 });
    probeWas = { ok: true, bytes: out.length, ms: Date.now() - started };
  } catch (e) {
    probeWas = { ok: false, error: String(e?.message || e), ms: Date.now() - started };
  }
  probeAt = Date.now();
  return probeWas;
}

export default async (req) => {
  if (new URL(req.url).searchParams.get("probe") === "voice") {
    return json(await probeVoice(), 200, { "cache-control": "no-store" });
  }

  const url = process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  // Умная Мия отвечает ТОЛЬКО вошедшим, а входить некуда, пока нет Supabase. Ключ Anthropic сам
  // по себе её не включает: /api/tutor без базы отказывает всем (он не может проверить, кто
  // пришёл), и обещать на экране умный режим значило бы обещать то, чего не будет ни одной
  // реплики. Так бывает на промежуточном деплое, где ключ уже вписали, а базу ещё нет.
  const ai = configured()
    && (Boolean(process.env.ANTHROPIC_API_KEY) || Boolean(await getSetting("anthropic_key").catch(() => null)));
  return json({
    ai,
    tts: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseUrl: url,
    supabaseAnonKey: anon,
    // The owner can paste a key in the admin panel when there is a database to keep it in. The
    // environment variable still wins, so a deployment set up by hand is never overridden.
    canSetKey: configured() && !process.env.ANTHROPIC_API_KEY,
    // Два тира: быстрая модель для разговора, умная для уроков, разбора ошибок и картинок.
    model: process.env.CLAUDE_MODEL || "claude-opus-5",
    modelFast: process.env.CLAUDE_MODEL_FAST || "claude-sonnet-5",
  });
};

export const config = { path: "/api/status" };
