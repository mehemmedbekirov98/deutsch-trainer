// What this deployment has, and which Supabase project it belongs to.
//
// The page is static, so it cannot read environment variables — this is how it learns them. Only
// the public ones: the Supabase URL and the anon key are meant to be in the browser (they are what
// row-level security is built around). The service role key and the Anthropic key never leave here.

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60", ...headers },
  });

export default async () => {
  const url = process.env.SUPABASE_URL || "";
  const anon = process.env.SUPABASE_ANON_KEY || "";
  return json({
    ai: Boolean(process.env.ANTHROPIC_API_KEY),
    tts: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseUrl: url,
    supabaseAnonKey: anon,
    // The key lives in Netlify's environment now; there is no file on a server to write it to,
    // so the app must not offer to take one from the person using it.
    canSetKey: false,
    model: process.env.CLAUDE_MODEL || "claude-opus-5",
  });
};

export const config = { path: "/api/status" };
