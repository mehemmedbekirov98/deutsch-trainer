// Уйти с сайта совсем.
//
// Кнопки «удалить аккаунт» не было нигде: завести можно, уйти нельзя. Для сайта, который хранит
// почту, имя, весь прогресс и заметки Мии о человеке, это неправильно — и по-человечески, и по
// закону в той же Германии, про которую здесь курс.
//
// Удалять может только служебный ключ (строка в auth.users браузеру недоступна), поэтому это
// серверная функция. Но она НЕ админская: она удаляет ровно того, чей токен предъявлен, и
// никого больше. Идентификатор берётся из токена, а не из тела запроса, — иначе это была бы
// кнопка «удалить любого».
import { configured, userFromRequest, deleteAccount } from "../../lib/supa.mjs";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!configured()) return json({ error: "База не подключена к этому сайту." }, 503);

  const user = await userFromRequest(req);
  if (!user) return json({ error: "Нужно войти." }, 401);

  let body;
  try { body = await req.json(); } catch { return json({ error: "bad body" }, 400); }
  if (body?.action !== "delete") return json({ error: "unknown action" }, 400);

  // Подтверждение отправляет сам браузер после диалога. Совпадение почты здесь — не защита от
  // злоумышленника (токен уже его), а защита от промаха: удаление необратимо.
  if (String(body?.confirmEmail || "").trim().toLowerCase() !== String(user.email || "").toLowerCase()) {
    return json({ error: "Почта не совпала — аккаунт не тронут." }, 400);
  }

  try {
    await deleteAccount(user.id);
    return json({ ok: true });
  } catch (e) {
    console.error("[account]", e);
    return json({ error: "Не получилось удалить аккаунт. Попробуй ещё раз." }, 500);
  }
};

export const config = { path: "/api/account" };
