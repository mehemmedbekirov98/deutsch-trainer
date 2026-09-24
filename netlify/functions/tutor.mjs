// Mia's turn. Everything that decides what she says is in lib/tutor.js; this only moves it in and out.
import { askMia, friendlyError, fallbackReply } from "../../lib/tutor.js";
import { configured, getSetting, learnerFromRequest, takeQuota } from "../../lib/supa.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// Сколько реплик живой Мии один человек может получить за сутки.
//
// Настоящий ученик за занятие говорит два-три десятка раз; 250 — это потолок, до которого он не
// дойдёт, и одновременно предел, за который не уедет счёт, если аккаунт заведут ради скрипта в
// цикле. Окно скользящее, считает база — см. take_quota в 0004_limits.sql.
const DAILY_TURNS = 250;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "Не удалось прочитать запрос." }, 400); }

  // Дверь заперта по умолчанию, а не при условии.
  //
  // Раньше проверка «кто пришёл» стояла ВНУТРИ `if (configured())`. Это не защита, а защита с
  // выключателем: стоит переменной SUPABASE_SERVICE_ROLE_KEY пропасть или приехать с опечаткой —
  // и проверка не падает, она молча исчезает, а /api/tutor становится бесплатным Claude для
  // всего интернета. Сайт при этом выглядит работающим. Поэтому теперь наоборот: не можем
  // проверить — не отвечаем. Гостя это не обижает: браузер переходит на офлайн-Мию, которая
  // бесплатна и честно говорит, кто она.
  if (!configured()) {
    return json({ error: "Живая Мия сейчас не настроена — поговорим в обычном режиме.", needsAuth: true }, 503);
  }
  let learner;
  try {
    learner = await learnerFromRequest(req);
  } catch {
    return json({ error: "Не получается проверить аккаунт. Попробуй чуть позже." }, 503);
  }
  if (!learner) return json({ error: "Войди в аккаунт — живая Мия отвечает только своим.", needsAuth: true }, 401);
  if (learner.blocked) return json({ error: "Аккаунт заблокирован." }, 403);
  if (!(await takeQuota(learner.id, "tutor", DAILY_TURNS))) {
    return json({ error: "На сегодня хватит — живая Мия вернётся завтра. Офлайн-режим работает без ограничений." }, 429);
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
