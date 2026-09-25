// Accounts on the client: who is signed in, and the screen that gets them signed in.
//
// The work is done by Supabase (see backend.js). This file is the part Emil sees — and the part
// that speaks Russian. Registering stays optional: without an account the app keeps a local save
// in this browser, exactly as it always did. Nobody is stopped at a login wall.
import { t as tr } from "./i18n.js";
import { el, nextTick } from "./utils.js";
import { toast, sfx, confetti } from "./fx.js";
import { backend } from "./backend.js";
import { markCarryOver } from "./store.js";
import { logoSvg } from "./logo.js";

export const session = {
  get user() { return backend.user; },
  get guest() { return !backend.user; },
  get available() { return backend.cloud; },   // are accounts configured on this deployment at all
  get isAdmin() { return backend.user?.isAdmin === true; },

  async load() { return backend.refreshUser(); },

  async logout() {
    await backend.signOut();
    location.href = location.pathname + "#/";
    location.reload();
  },
};

export const patchMe = (patch) => backend.updateProfile(patch);
export const changePassword = (newPassword) => backend.setPassword(newPassword);
export const requestReset = (email) => backend.resetPassword(email);

/* ------------------------------------------------------------------ pieces */

/**
 * A labelled field. Emil fills these in on a phone, one-handed, in the evening — so the label stays
 * visible above the input instead of disappearing into a placeholder the moment he starts typing.
 */
function field({ label, type = "text", placeholder = "", autocomplete, icon, hint }) {
  const input = el("input", { class: "auth-input", type, placeholder, autocomplete, spellcheck: "false" });
  let reveal = null;
  if (type === "password") {
    // One less reason to mistype a password he cannot see.
    reveal = el("button", { class: "auth-reveal", type: "button", tabIndex: -1, title: "Показать пароль",
      onClick: () => {
        const shown = input.type === "text";
        input.type = shown ? "password" : "text";
        reveal.textContent = tr(shown ? "👁" : "🙈");
        reveal.title = tr(shown ? "Показать пароль" : "Скрыть пароль");
        input.focus();
      } }, "👁");
  }
  const wrap = el("label", { class: "auth-field" },
    el("span", { class: "auth-label" }, icon ? el("span", { class: "auth-label-icon" }, icon) : null, label),
    el("span", { class: "auth-input-wrap" }, input, reveal),
    hint ? el("span", { class: "auth-hint" }, hint) : null,
  );
  return { wrap, input };
}

/**
 * Чего не хватает паролю. null — всё в порядке.
 *
 * Раньше требовалась только длина в восемь символов, а полоска силы была советом,
 * который ничего не решал: «password» проходил.
 *
 * \p{Ll} и \p{Lu} с флагом u, а не [a-z]/[A-Z]: пароль вполне может быть русским или
 * азербайджанским, и требовать именно латинскую заглавную было бы странно.
 */
export function passwordProblem(value) {
  const v = String(value ?? "");
  if (v.length < 8) return "Пароль — минимум 8 символов.";
  if (!/\p{Ll}/u.test(v)) return "В пароле нужна строчная буква.";
  if (!/\p{Lu}/u.test(v)) return "В пароле нужна заглавная буква.";
  if (!/\d/.test(v)) return "В пароле нужна цифра.";
  return null;
}

/**
 * Похож ли адрес на настоящий. null — похож.
 *
 * Это проверка формы, а не существования: существование проверяет письмо с подтверждением —
 * без перехода по ссылке аккаунта не будет. Здесь отсеивается мусор и опечатки вроде
 * «sam@gmail» или «sam@@gmail.com», чтобы человек узнал об этом сразу, а не ждал письма,
 * которое никуда не ушло.
 */
// Разбором по частям, а не одним большим регексом: так видно, что именно не так,
// и одна потерянная обратная косая не превращает проверку в «отклонять всё».
const LABEL = /^[\p{L}\d]([\p{L}\d-]*[\p{L}\d])?$/u;
const USER  = /^[\p{L}\d._+-]+$/u;
const TLD   = /^[\p{L}]{2,}$/u;
export function emailProblem(value) {
  const v = String(value ?? "").trim();
  if (!v) return "Впиши почту.";
  const parts = v.split("@");
  if (parts.length !== 2) return "Это не похоже на адрес почты — проверь ещё раз.";
  const [user, domain] = parts;
  if (!USER.test(user) || user.startsWith(".") || user.endsWith(".") || user.includes("..")) return "Это не похоже на адрес почты — проверь ещё раз.";
  const labels = domain.split(".");
  if (labels.length < 2 || !labels.every((l) => LABEL.test(l))) return "Это не похоже на адрес почты — проверь ещё раз.";
  if (!TLD.test(labels[labels.length - 1])) return "Это не похоже на адрес почты — проверь ещё раз.";
  return null;
}

/**
 * Что показывать под полем пароля.
 *
 * Говорит ровно то же, что потом проверит форма. Раньше полоска хвалила пароль
 * словом «Сойдёт», а проверка была только на длину — два разных мнения об одном пароле.
 */
function strengthOf(value) {
  const v = String(value);
  if (!v) return null;
  if (v.length < 8) return { level: "weak", text: tr`Ещё ${8 - v.length} ${plural(8 - v.length)}` };
  const problem = passwordProblem(v);
  if (problem) return { level: "weak", text: problem };
  // Требования выполнены — дальше просто похвала за запас прочности.
  const strong = v.length >= 12 || /[^\p{L}\d]/u.test(v);
  return strong
    ? { level: "strong", text: "Хороший пароль" }
    : { level: "ok", text: "Подходит. Длиннее или со знаком — будет крепче" };
}
const plural = (n) => (n === 1 ? "символ" : n < 5 ? "символа" : "символов");

/* ------------------------------------------------------------- the screen */

/**
 * The sign-in screen.
 *
 * Two panels: what this place is, and the way in. Three states share the form — вход, регистрация,
 * забыл пароль — because anything more is a maze. The one thing worth real care: when there is
 * local progress and no account yet, registering carries it over. Losing three weeks of evenings
 * because you finally made an account is unforgivable.
 */
export function renderAuth(container, { onDone, localXp = 0, adoptLocal = null } = {}) {
  let tab = "login";
  const formHost = el("div", { class: "auth-form-host" });

  const draw = () => {
    const isReg = tab === "register";
    const isForgot = tab === "forgot";
    formHost.innerHTML = "";

    const msg = el("div", { class: "auth-msg" });
    const name = field({ label: "Как тебя зовут", icon: "🙂", placeholder: "Имя", autocomplete: "name" });
    const email = field({ label: "Почта", icon: "📧", type: "email", placeholder: "ali@example.com", autocomplete: "username" });
    const pass = field({
      label: isForgot ? "" : "Пароль", icon: "🔒", type: "password",
      placeholder: isReg ? "От 8 символов, с заглавной и цифрой" : "Твой пароль",
      autocomplete: isReg ? "new-password" : "current-password",
    });
    const strength = el("div", { class: "auth-strength" });
    if (isReg) {
      pass.input.addEventListener("input", () => {
        const s = strengthOf(pass.input.value);
        strength.className = `auth-strength ${s ? s.level : ""}`;
        strength.textContent = tr(s ? s.text : "");
      });
    }

    const keep = el("input", { type: "checkbox" });
    keep.checked = true;

    const submit = el("button", { class: "btn primary big auth-submit", type: "submit" },
      isForgot ? "Прислать ссылку" : isReg ? "Создать аккаунт" : "Войти");
    const busy = (on, label) => {
      submit.disabled = on;
      submit.classList.toggle("loading", on);
      submit.textContent = tr(on ? label : (isForgot ? "Прислать ссылку" : isReg ? "Создать аккаунт" : "Войти"));
    };

    const form = el("form", { class: "auth-form", onSubmit: async (e) => {
      e.preventDefault();
      msg.className = "auth-msg";
      msg.textContent = "";
      try {
        if (isForgot) {
          const badMail = emailProblem(email.input.value);
          if (badMail) throw new Error(badMail);
          busy(true, "Отправляю…");
          await requestReset(email.input.value.trim());
          msg.className = "auth-msg ok";
          msg.textContent = tr("Письмо отправлено. Открой ссылку из него — и задашь новый пароль.");
          busy(false);
          return;
        }
        if (isReg) {
          if (name.input.value.trim().length < 2) throw new Error("Напиши, как тебя зовут — хотя бы две буквы.");
          // Верхняя граница есть в базе (колонка на 40 символов), и без этой проверки она
          // возвращалась английским текстом ошибки Postgres прямо на экран регистрации.
          if (name.input.value.trim().length > 40) throw new Error("Имя длинновато — до 40 символов.");
          const badMail = emailProblem(email.input.value);
          if (badMail) throw new Error(badMail);
          const badPass = passwordProblem(pass.input.value);
          if (badPass) throw new Error(badPass);
          busy(true, "Создаю аккаунт…");
          // Remember the tick BEFORE the account exists: with email confirmation on, sign-up ends
          // here and the person comes back in a separate visit, by which time this screen — and
          // everything it knew — is gone. store.init() honours it on that next visit.
          if (keep.checked && localXp > 0) markCarryOver(email.input.value.trim());
          const { needsConfirm } = await backend.signUp({
            email: email.input.value.trim(), name: name.input.value.trim(), password: pass.input.value,
          });
          if (needsConfirm) {
            formHost.innerHTML = "";
            formHost.append(el("div", { class: "auth-done" },
              el("div", { class: "auth-done-icon" }, "📬"),
              el("h2", {}, "Проверь почту"),
              el("p", { class: "muted" }, tr`Отправил письмо на ${email.input.value.trim()}. Нажми ссылку в нём, чтобы подтвердить адрес — и возвращайся сюда.`),
              keep.checked && localXp > 0
                ? el("p", { class: "muted small" }, tr`Прогресс из этого браузера — ${localXp} XP — перенесётся, как только ты первый раз войдёшь.`)
                : null,
              el("button", { class: "btn ghost", type: "button", onClick: () => { tab = "login"; draw(); } }, "← Ко входу"),
            ));
            return;
          }
          if (keep.checked && localXp > 0) await adoptLocal?.();
          sfx.levelUp();
          confetti({ count: 140, duration: 2000 });
          toast(tr`Аккаунт создан. Рад знакомству, ${backend.user.name}!`, { icon: "👤", kind: "achievement" });
        } else {
          busy(true, "Проверяю…");
          await backend.signIn({ email: email.input.value.trim(), password: pass.input.value });
          sfx.levelUp();
          toast(tr`С возвращением, ${backend.user.name}!`, { icon: "👤", kind: "achievement" });
        }
        onDone?.(backend.user);
      } catch (err) {
        msg.className = "auth-msg bad";
        msg.textContent = tr(err.message);
        busy(false);
      }
    } },
      isReg ? name.wrap : null,
      email.wrap,
      isForgot ? null : pass.wrap,
      isReg ? strength : null,
      // Only shown when there is something to lose.
      isReg && localXp > 0 ? el("label", { class: "auth-keep" },
        keep,
        el("span", { class: "auth-keep-box" }),
        el("span", {}, tr`Перенести прогресс из этого браузера — ${localXp} XP`)) : null,
      submit,
      msg,
    );

    formHost.append(
      el("div", { class: "auth-switch" },
        el("button", { class: `auth-tab ${tab === "login" ? "on" : ""}`, type: "button", onClick: () => { tab = "login"; draw(); } }, "Вход"),
        el("button", { class: `auth-tab ${isReg ? "on" : ""}`, type: "button", onClick: () => { tab = "register"; draw(); } }, "Регистрация"),
        el("div", { class: `auth-switch-pill ${isReg ? "right" : ""}` }),
      ),
      el("h2", { class: "auth-heading" }, isForgot ? "Восстановить доступ" : isReg ? "Заведём аккаунт" : "С возвращением"),
      el("p", { class: "auth-sub muted" }, isForgot
        ? "Напиши почту, на которую регистрировался — пришлю ссылку для нового пароля."
        : isReg
          ? "Прогресс будет с тобой на любом устройстве, а ты — в общем рейтинге."
          : "Заходи и продолжай с того места, где остановился."),
      form,
      el("div", { class: "auth-links" },
        isForgot
          ? el("button", { class: "link-btn", type: "button", onClick: () => { tab = "login"; draw(); } }, "← Вернуться ко входу")
          : el("button", { class: "link-btn", type: "button", onClick: () => { tab = "forgot"; draw(); } }, "Забыл пароль?"),
        el("button", { class: "link-btn quiet", type: "button", onClick: () => onDone?.(null) }, "Пока без аккаунта →"),
      ),
    );
    nextTick(() => (isReg ? name.input : email.input).focus());
  };

  const brand = el("div", { class: "auth-brand" },
    el("div", { class: "auth-brand-top" },
      el("div", { class: "auth-brand-mark" }),
      el("div", {}, el("div", { class: "auth-brand-name" }, "Lingua Mia"), el("div", { class: "auth-brand-tag" }, "немецкий от A1 до B1")),
    ),
    el("h1", { class: "auth-brand-title" }, "Каждый вечер — ", el("span", { class: "grad" }, "на шаг ближе"), " к Германии."),
    el("ul", { class: "auth-points" },
      el("li", {}, el("span", {}, "🗺️"), el("div", {}, el("strong", {}, "36 уроков"), el("span", { class: "muted" }, "Слова, грамматика, диалоги и экзамены — от «Hallo» до уверенного B1."))),
      el("li", {}, el("span", {}, "🎙️"), el("div", {}, el("strong", {}, "Мия"), el("span", { class: "muted" }, "Живой голос. Говори с ней о чём угодно — по-русски или по-немецки."))),
      el("li", {}, el("span", {}, "🏆"), el("div", {}, el("strong", {}, "Рейтинг и прогресс"), el("span", { class: "muted" }, "Серия дней, опыт, достижения — и таблица, где видно, кто как идёт."))),
    ),
  );

  container.append(el("div", { class: "auth-screen" },
    el("div", { class: "auth-glow" }),
    el("div", { class: "auth-split" },
      brand,
      el("div", { class: "auth-panel" },
        backend.cloud ? formHost : el("div", { class: "auth-done" },
          el("div", { class: "auth-done-icon" }, "🌱"),
          el("h2", {}, "Занимайся прямо сейчас"),
          el("p", { class: "muted" }, "Аккаунты на этом сайте ещё не настроены. Прогресс сохранится в этом браузере, а когда аккаунты появятся — можно будет перенести его одним нажатием."),
          el("button", { class: "btn primary big", type: "button", onClick: () => onDone?.(null) }, "Начать"),
        ),
      ),
    ),
  ));
  if (backend.cloud) draw();
  nextTick(() => container.querySelector(".auth-brand-mark")?.append(logoSvg(46, "auth")));
}

/** The screen Supabase's password-reset link lands on. */
export function renderNewPassword(container, { onDone } = {}) {
  const pass = field({ label: "Новый пароль", icon: "🔒", type: "password", placeholder: "От 8 символов, с заглавной и цифрой", autocomplete: "new-password" });
  const strength = el("div", { class: "auth-strength" });
  pass.input.addEventListener("input", () => {
    const s = strengthOf(pass.input.value);
    strength.className = `auth-strength ${s ? s.level : ""}`;
    strength.textContent = tr(s ? s.text : "");
  });
  const msg = el("div", { class: "auth-msg" });
  const submit = el("button", { class: "btn primary big auth-submit", type: "submit" }, "Сохранить пароль");

  container.append(el("div", { class: "auth-screen" },
    el("div", { class: "auth-glow" }),
    el("div", { class: "auth-panel solo" },
      el("div", { class: "auth-done-icon" }, "🔒"),
      el("h2", { class: "auth-heading" }, "Новый пароль"),
      el("p", { class: "auth-sub muted" }, "Придумай новый — и сразу войдёшь."),
      el("form", { class: "auth-form", onSubmit: async (e) => {
        e.preventDefault();
        submit.disabled = true;
        submit.classList.add("loading");
        submit.textContent = tr("Сохраняю…");
        try {
          const badPass = passwordProblem(pass.input.value);
          if (badPass) throw new Error(badPass);
          await changePassword(pass.input.value);
          toast("Пароль изменён.", { icon: "🔒" });
          onDone?.();
        } catch (err) {
          msg.className = "auth-msg bad";
          msg.textContent = tr(err.message);
          submit.disabled = false;
          submit.classList.remove("loading");
          submit.textContent = tr("Сохранить пароль");
        }
      } }, pass.wrap, strength, submit, msg),
    ),
  ));
  nextTick(() => pass.input.focus());
}
