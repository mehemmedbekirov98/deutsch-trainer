// Mia's voice: Microsoft neural TTS, no key, cached forever.
//
// The cache key is a hash of the text and every voice setting, so a line that has been said once
// is never synthesised again — by anybody. On the old local server that cache was a folder on
// Emil's laptop; here it is a public Supabase Storage bucket, which means the browser can fetch
// most lines straight from the CDN and this function is only ever asked for something genuinely new.
import { createHash } from "node:crypto";

export const cacheKey = (voice, rate, text, pitch = 0, volume = 0, locale = "") =>
  createHash("sha1").update(`${voice}|${locale}|${rate}|${pitch}|${volume}|${text}`).digest("hex");

const sign = (n) => (n >= 0 ? "+" : "");

/** Reject if a promise has not settled in time — a half-open socket otherwise hangs the whole request. */
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

async function readStream(result) {
  const chunks = [];
  for await (const c of (result.audioStream || result)) chunks.push(c);
  return Buffer.concat(chunks);
}

/**
 * Synthesise one line. Two attempts: the endpoint occasionally completes the handshake and then
 * returns nothing, which does not throw — an empty buffer counts as a failure and is retried.
 */
export async function synthesise({ text, voice, locale = "", rate = 0, pitch = 0, volume = 0, budgetMs = 0 }) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const options = { rate: `${sign(rate)}${rate}%`, pitch: `${sign(pitch)}${pitch}Hz`, volume: `${sign(volume)}${volume}%` };
  // A whole budget, not two independent timeouts.
  //
  // Connect 8 s + stream 15 s, twice over, is 46 s — and a Netlify function is killed at ten.
  // The caller never saw the honest 503 this function raises; it got a platform 502 instead,
  // which says nothing and cannot be retried intelligently. The second attempt now happens only
  // if there is time left for it. `budgetMs = 0` means no deadline — that is the pre-generation
  // script, which runs on a laptop and can wait.
  const deadline = budgetMs ? Date.now() + budgetMs : Infinity;
  const left = () => deadline - Date.now();
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt && left() < 3000) break; // не хватит даже на рукопожатие
    const connectMs = Math.min(8000, budgetMs ? Math.max(1500, left() * 0.35) : 8000);
    const streamMs = Math.min(15000, budgetMs ? Math.max(2000, left() - connectMs) : 15000);
    const tts = new MsEdgeTTS();
    try {
      await withTimeout(
        tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, locale ? { voiceLocale: locale } : undefined),
        connectMs, "tts connect timeout",
      );
      const out = await withTimeout(readStream(tts.toStream(text, options)), streamMs, "tts timeout");
      if (out.length) return out;
      last = new Error("empty audio");
    } catch (e) {
      last = e;
    } finally {
      try { tts.close?.(); } catch { /* the socket may already be gone */ }
    }
  }
  throw last || new Error("tts failed");
}

/** Where a finished clip lives, and where the browser can pick it up without asking anyone. */
export const storagePath = (key) => `${key}.mp3`;
export const publicUrl = (supabaseUrl, key) => `${supabaseUrl}/storage/v1/object/public/tts/${storagePath(key)}`;

/**
 * Put a clip in the bucket. Uses the service role, so this only ever runs on the server.
 *
 * Both headers on purpose. Storage reads `Authorization` as a JWT, and Supabase's newer
 * `sb_secret_…` keys are not JWTs — sent that way alone they come back "Invalid Compact JWS".
 * It accepts either key shape through `apikey`, so sending both works for old and new projects.
 */
export async function putClip(supabaseUrl, serviceKey, key, buffer, { attempts = 4 } = {}) {
  let last = "";
  for (let i = 0; i < attempts; i++) {
    const r = await fetch(`${supabaseUrl}/storage/v1/object/tts/${storagePath(key)}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "audio/mpeg",
        "cache-control": "public, max-age=31536000, immutable",
        // somebody else may have stored the same line a moment ago; that is a success, not a clash
        "x-upsert": "true",
      },
      body: buffer,
    });
    if (r.ok || r.status === 409) return;
    last = `storage ${r.status}: ${await r.text().catch(() => "")}`;

    // Storage answers 429 "too_many_connections" under load, and that is the one failure worth
    // waiting out: the audio is already synthesised, so giving up throws away the expensive half
    // of the work and leaves a line silent for everybody, forever. Back off and try again.
    const retriable = r.status === 429 || r.status >= 500;
    if (!retriable || i === attempts - 1) break;
    const after = Number(r.headers.get("retry-after")) * 1000;
    await new Promise((res) => setTimeout(res, Number.isFinite(after) && after > 0 ? after : 400 * 2 ** i));
  }
  throw new Error(last || "storage failed");
}

/** Is it already in the bucket? A HEAD against the CDN, so it costs nothing. */
export async function hasClip(supabaseUrl, key) {
  try {
    const r = await fetch(publicUrl(supabaseUrl, key), { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
