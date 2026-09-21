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
  const ai = Boolean(process.env.ANTHROPIC_API_KEY)
    || (configured() ? Boolean(await getSetting("anthropic_key").catch(() => null)) : false);
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
