// What this deployment has, and which Supabase project it belongs to.
//
// The page is static, so it cannot read environment variables — this is how it learns them. Only
// the public ones: the Supabase URL and the anon key are meant to be in the browser (they are what
// row-level security is built around). The service role key and the Anthropic key never leave here.

import { configured, getSetting } from "../../lib/supa.mjs";

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", ...headers },
  });

export default async () => {
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
    model: process.env.CLAUDE_MODEL || "claude-opus-5",
  });
};

export const config = { path: "/api/status" };
