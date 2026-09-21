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
export async function synthesise({ text, voice, locale = "", rate = 0, pitch = 0, volume = 0 }) {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const options = { rate: `${sign(rate)}${rate}%`, pitch: `${sign(pitch)}${pitch}Hz`, volume: `${sign(volume)}${volume}%` };
  let last = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await withTimeout(
        tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, locale ? { voiceLocale: locale } : undefined),
        8000, "tts connect timeout",
      );
      const out = await withTimeout(readStream(tts.toStream(text, options)), 15000, "tts timeout");
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
export async function putClip(supabaseUrl, serviceKey, key, buffer) {
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
  if (!r.ok && r.status !== 409) throw new Error(`storage ${r.status}: ${await r.text().catch(() => "")}`);
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
