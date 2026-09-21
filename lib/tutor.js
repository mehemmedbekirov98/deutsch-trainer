// Everything Mia needs in order to answer, minus the transport.
//
// This used to live inside the Express server. It is a plain module now so the Netlify function
// stays three lines long and so the prompt, the reply shape and the error messages have exactly
// one home.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MIA_SYSTEM, profileBlock } from "./mia-prompt.js";
import { check as moderate, RULES as MODERATION_RULES } from "../public/js/moderation.js";

// Ali's account may not have every model. The first one that answers is the one we keep.
const MODEL_CANDIDATES = [process.env.CLAUDE_MODEL, "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"].filter(Boolean);
let MODEL = MODEL_CANDIDATES[0];

const TutorReply = z.object({
  say: z.string().describe("Everything Mia says out loud, in the language of `lang`. The whole reply."),
  lang: z.enum(["ru", "de"]).describe("Language of `say` — the same one Ali just used"),
  translation: z.string().describe("The other-language version of `say`, ONLY when it helps him. Empty string otherwise."),
  correction: z.object({
    original: z.string(),
    corrected: z.string(),
    explanationRu: z.string(),
  }).describe("A real mistake in Ali's GERMAN; all fields empty strings otherwise"),
  tip: z.string().describe("Short optional hint or a ready German phrase; usually an empty string"),
  memory: z.string().describe("New durable fact about Ali in one short Russian line, or empty string"),
  mode: z.enum(["chat", "german", "keep"]).describe('"german" when the talk should now run in German, "chat" to go back to normal talk, "keep" when nothing changes'),
  done: z.boolean(),
});

function notesBlock(notes) {
  if (!Array.isArray(notes) || !notes.length) return "";
  const lines = notes.slice(-40).map((n) => "- " + String(n).replace(/\s+/g, " ").slice(0, 160));
  return `\nWhat you already know about Ali from earlier conversations (use it naturally, do not recite it):\n${lines.join("\n")}`;
}

function scenarioBlock(scenario) {
  if (!scenario || typeof scenario !== "object") {
    return `Mode: just talking — Ali opened the chat to talk with you, not to study. No script, no topic limit. Follow him anywhere and answer in the language he used. Teach only if he asks.`;
  }
  const clean = (v, n) => String(v ?? "").replace(/\s+/g, " ").slice(0, n);
  const vocab = Array.isArray(scenario.vocab) ? scenario.vocab.slice(0, 40).map((v) => clean(v, 40)).join(", ") : "";
  const level = clean(scenario.levelTitle, 80);

  if (scenario.mode === "oral-exam") {
    return `Mode: ORAL EXAM for the level "${level}" (${clean(scenario.titleRu, 80)}).
Topic and target structures: ${clean(scenario.brief, 1200)}
This level's vocabulary: ${vocab}
You are checking what Ali can already say on THIS topic — and he should feel supported the whole way, not tested. Open by telling him warmly that this is just practice and nothing can go wrong. Then ask 5–7 questions, one at a time, that let him use this level's words and grammar, starting easy. Wait for each answer. React to every answer like a person would — a real reaction, not a grade — and name the specific thing he got right. Correct real mistakes through "correction", always gently. If he is stuck, immediately hand him the phrase in "translation" and move on cheerfully; never let him sit in silence feeling bad. Speak German here (lang = "de") with the Russian in "translation"; if he asks something in Russian, answer that in Russian and go back. After the last question, give him a warm verdict in German, and put 2–4 Russian sentences in "translation" — what he did well first, and only then one thing worth repeating. Then set done = true.`;
  }

  if (scenario.mode === "topic-chat") {
    return `Mode: free conversation on the topic of the level "${level}" (${clean(scenario.titleRu, 80)}), which Ali has just finished.
Topic and structures he has learned: ${clean(scenario.brief, 1200)}
This level's vocabulary: ${vocab}
This is NOT an exam — it is a relaxed chat that happens to stay near this topic so he can use his new words for real. Speak German (lang = "de") with the Russian in "translation", but the moment he writes in Russian, answer him in Russian — he is a person talking to you, not a candidate. Ask about his own life within the topic, tell him how it works in Germany, share a small story of your own, joke. If he wants to talk about something else, follow him and come back later. Let the conversation run until he says goodbye (then done = true).`;
  }

  return `Mode: role-play scenario for the level "${level}" — "${clean(scenario.title, 120)}".
Scenario brief: ${clean(scenario.brief, 1200)}
Prefer this level's vocabulary: ${vocab}
Play your role in the scenario from the first message (greet Ali in-character and open the scene). Speak German (lang = "de") with the Russian in "translation". Guide Ali through the scenario goals step by step; if he gets stuck, give a tip. If he asks you something in Russian, step out of the role for one turn, answer him properly in Russian, and step back in. When all goals are covered, wrap up with a goodbye and set done = true.`;
}

/** Keep the last ~40 turns, drop leading assistant turns, merge same-role neighbours; null if unusable. */
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const out = [];
  for (const m of messages.slice(-40)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    const content = String(m.content ?? "").slice(0, 2000);
    if (!content.trim()) continue;
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += "\n" + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}


const FALLBACK_REPLY = {
  say: "Ой, этого я не расслышала. Скажи ещё раз, пожалуйста — я слушаю.",
  lang: "ru",
  translation: "",
  correction: null, tip: "", memory: "", mode: "keep", done: false,
};


function friendlyError(error) {
  if (error instanceof Anthropic.AuthenticationError) return [401, "Ключ больше не принимается. Открой Профиль и вставь новый."];
  if (error instanceof Anthropic.RateLimitError) return [429, "Слишком много запросов — подожди минуту и попробуй снова."];
  // must come first: APIConnectionTimeoutError extends APIConnectionError
  if (error instanceof Anthropic.APIConnectionTimeoutError) return [504, "Мия задумалась слишком надолго — попробуй ещё раз."];
  if (error instanceof Anthropic.APIConnectionError) return [503, "Нет связи с сервисом Claude — проверь интернет."];
  if (error instanceof Anthropic.APIError) return [502, `Сервис Claude ответил ошибкой (${error.status || "?"}).`];
  return [500, "Внутренняя ошибка тренера."];
}


const TUTOR_FORMAT = zodOutputFormat(TutorReply);

export { FALLBACK_REPLY, friendlyError };

/**
 * Ask Mia. Returns the reply object the browser renders, or throws for friendlyError() to name.
 */
export async function askMia({ messages, scenario, notes, profile }, { apiKey } = {}) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) { const e = new Error("no key"); e.noKey = true; throw e; }
  const client = new Anthropic({ apiKey: key, timeout: 15_000, maxRetries: 1 });
  const clean = sanitizeMessages(messages);
  if (!clean) { const e = new Error("bad messages"); e.badRequest = true; throw e; }

  const verdict = moderate(clean[clean.length - 1].content);
  if (verdict.blocked) {
    return { say: verdict.reply, lang: "ru", translation: "", correction: null, tip: "", memory: "",
             mode: null, done: false, blocked: verdict.category };
  }

  const response = await client.messages.create({
    model: MODEL,
    // Her reply is a few sentences, but the budget is shared with the thinking that "medium"
    // effort does. A tight cap truncates the JSON and Ali gets an error instead of an answer;
    // unused budget costs nothing, so leave plenty of room.
    max_tokens: 8192,
    system: [
      { type: "text", text: MIA_SYSTEM + MODERATION_RULES, cache_control: { type: "ephemeral" } },
      { type: "text", text: [profileBlock(profile), scenarioBlock(scenario), notesBlock(notes)].join("\n\n") },
    ],
    messages: clean,
    // medium effort: Mia thinks about what Ali actually said instead of pattern-matching a reply
    output_config: { effort: "medium", format: TUTOR_FORMAT },
  });

  if (response.stop_reason === "refusal") return FALLBACK_REPLY;
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  let out = null;
  try { out = TutorReply.parse(JSON.parse(text)); } catch { /* unparsable — handled below */ }
  if (!out) {
    if (response.stop_reason === "max_tokens") { const e = new Error("truncated"); e.truncated = true; throw e; }
    return FALLBACK_REPLY;
  }
  const correction = out.correction && out.correction.corrected && out.correction.original ? out.correction : null;
  return {
    say: out.say,
    lang: out.lang === "de" ? "de" : "ru",
    translation: out.translation || "",
    correction, tip: out.tip || "", memory: out.memory || "",
    mode: ["chat", "german"].includes(out.mode) ? out.mode : null,
    done: Boolean(out.done),
  };
}
