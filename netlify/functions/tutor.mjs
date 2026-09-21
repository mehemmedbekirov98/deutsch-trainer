// Mia's turn. Everything that decides what she says is in lib/tutor.js; this only moves it in and out.
import { askMia, friendlyError, fallbackReply } from "../../lib/tutor.js";
import { configured, getSetting, learnerFromRequest } from "../../lib/supa.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Не удалось прочитать запрос." }, 400); }

  // Every turn here costs the owner money, so the door is shut to strangers. Guests are not
  // turned away from Mia — the browser falls back to her offline self, which is free and honest
  // about what it is. `needsAuth` is what tells it to do that instead of showing an error.
  if (configured()) {
    const learner = await learnerFromRequest(req).catch(() => null);
    if (!learner) return json({ error: "Войди в аккаунт — живая Мия отвечает только своим.", needsAuth: true }, 401);
    if (learner.blocked) return json({ error: "Аккаунт заблокирован." }, 403);
  }

  try {
    // The key is either an environment variable set once at deploy time, or one the owner pasted
    // into the admin panel. Looking it up costs a query only when the variable is absent.
    const apiKey = process.env.ANTHROPIC_API_KEY
      || (configured() ? await getSetting("anthropic_key").catch(() => null) : null);
    return json(await askMia(body, { apiKey }));
  } catch (error) {
    if (error?.noKey) return json({ error: "Умный режим не настроен: у сайта нет ключа Anthropic." }, 503);
    if (error?.badRequest) return json({ error: "messages must alternate and end with a user message" }, 400);
    if (error?.truncated) return json({ error: "Ответ Мии оборвался. Попробуй ещё раз." }, 502);
    console.error("[tutor]", error);
    const [status, message] = friendlyError(error);
    // A refusal or a parse problem is not worth an error screen — she just asks him to repeat.
    if (status >= 500 && status !== 503 && status !== 504) return json(fallbackReply(body?.profile?.uiLang));
    return json({ error: message }, status);
  }
};

export const config = { path: "/api/tutor" };
