// Mia's turn. Everything that decides what she says is in lib/tutor.js; this only moves it in and out.
import { askMia, friendlyError, FALLBACK_REPLY } from "../../lib/tutor.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Не удалось прочитать запрос." }, 400); }

  try {
    return json(await askMia(body));
  } catch (error) {
    if (error?.noKey) return json({ error: "Умный режим не настроен: у сайта нет ключа Anthropic." }, 503);
    if (error?.badRequest) return json({ error: "messages must alternate and end with a user message" }, 400);
    if (error?.truncated) return json({ error: "Ответ Мии оборвался. Попробуй ещё раз." }, 502);
    console.error("[tutor]", error);
    const [status, message] = friendlyError(error);
    // A refusal or a parse problem is not worth an error screen — she just asks him to repeat.
    if (status >= 500 && status !== 503 && status !== 504) return json(FALLBACK_REPLY);
    return json({ error: message }, status);
  }
};

export const config = { path: "/api/tutor" };
