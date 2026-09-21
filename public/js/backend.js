// Everything the app needs from the outside world, behind one small door.
//
// The site is static files on Netlify. Sign-in, progress and the leaderboard go straight from the
// browser to Supabase — no server of ours in between, because row-level security is what protects
// the rows, not a middleman. Claude and the voice go through Netlify functions, because they hold
// keys that must never reach a browser.
//
// If Supabase is not configured yet, none of this throws: the app falls back to a local save in
// localStorage and simply has no accounts. A half-configured deployment shows a working site, not
// a blank page.

const SUPABASE_CDN = "https://esm.sh/@supabase/supabase-js@2";

export const backend = {
  config: { ai: false, tts: false, supabaseUrl: "", supabaseAnonKey: "", canSetKey: false },
  sb: null,
  user: null,      // { id, email, name, publicBoard } or null
  accounts: 0,

  get cloud() { return Boolean(this.sb); },
  get guest() { return !this.user; },

  async init() {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (r.ok) this.config = { ...this.config, ...(await r.json()) };
    } catch { /* offline or not deployed yet — the app still runs on the local save */ }

    const { supabaseUrl, supabaseAnonKey } = this.config;
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createClient } = await import(SUPABASE_CDN);
        this.sb = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        });
        // The link in the reset letter comes back with «#access_token=…&type=recovery» — which
        // REPLACES whatever hash we asked to be sent to. Pointing redirectTo at «#/password» was
        // therefore pointless: the person landed on the home screen, signed in, with no way to
        // reach the screen that sets the new password. Supabase announces the recovery session
        // instead, so that is what we listen to.
        this.sb.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") location.hash = "#/password";
        });
        // …and the same again for the case where the event fired before this line ran.
        if (/[#&]type=recovery/.test(location.hash)) location.hash = "#/password";
        await this.refreshUser();
      } catch (e) {
        console.warn("[backend] Supabase недоступен:", e?.message || e);
        this.sb = null;
      }
    }
    return this;
  },

  /** Who is signed in, with their profile row merged in. */
  async refreshUser() {
    if (!this.sb) { this.user = null; return null; }
    const { data } = await this.sb.auth.getUser();
    const u = data?.user || null;
    if (!u) { this.user = null; return null; }
    const { data: profile } = await this.sb.from("profiles").select("name, public_board, is_admin").eq("id", u.id).maybeSingle();
    this.user = {
      id: u.id,
      email: u.email,
      name: profile?.name || u.user_metadata?.name || "Ученик",
      publicBoard: profile?.public_board !== false,
      isAdmin: profile?.is_admin === true,
    };
    return this.user;
  },

  /* ------------------------------------------------------------------ auth */

  async signUp({ email, name, password }) {
    if (!this.sb) throw new Error("Аккаунты пока не настроены на этом сайте.");
    const { error } = await this.sb.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: location.origin },
    });
    if (error) throw new Error(ruAuthError(error));
    // With email confirmation switched on there is no session yet — that is not a failure, it is
    // the person needing to open their mail. The caller tells them so.
    await this.refreshUser();
    return { needsConfirm: !this.user, user: this.user };
  },

  async signIn({ email, password }) {
    if (!this.sb) throw new Error("Аккаунты пока не настроены на этом сайте.");
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(ruAuthError(error));
    return this.refreshUser();
  },

  async signOut() {
    await this.sb?.auth.signOut().catch(() => {});
    this.user = null;
  },

  /** Supabase sends the letter; the link brings them back here with a recovery session. */
  async resetPassword(email) {
    if (!this.sb) throw new Error("Аккаунты пока не настроены на этом сайте.");
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(ruAuthError(error));
  },

  async setPassword(newPassword) {
    if (!this.sb) throw new Error("Аккаунты пока не настроены на этом сайте.");
    const { error } = await this.sb.auth.updateUser({ password: newPassword });
    if (error) throw new Error(ruAuthError(error));
  },

  async updateProfile(patch) {
    if (!this.sb || !this.user) throw new Error("Нужно войти.");
    const row = {};
    if (typeof patch.name === "string") row.name = patch.name.trim().slice(0, 40);
    if (typeof patch.publicBoard === "boolean") row.public_board = patch.publicBoard;
    const { error } = await this.sb.from("profiles").update(row).eq("id", this.user.id);
    if (error) throw new Error(error.message);
    return this.refreshUser();
  },

  /* -------------------------------------------------------------- progress */

  /**
   * The signed-in person's save, or null when there is none.
   *
   * Throws when the read FAILED, and that difference is the whole point: returning null for both
   * told the store «this account is brand new», and the store then helpfully saved an empty state
   * over a real one. One flaky moment used to cost everything the account had.
   */
  async loadProgress() {
    if (!this.sb || !this.user) return null;
    const { data, error } = await this.sb.from("progress").select("data").eq("user_id", this.user.id).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.data || null;
  },

  /**
   * Save, unless the stored copy is newer.
   *
   * The database decides, in one statement — see save_progress() in the migration. What comes back
   * is the other tab's state, which the store adopts instead of overwriting.
   */
  async saveProgress(state) {
    if (!this.sb || !this.user) return { skipped: true };
    const { data, error } = await this.sb.rpc("save_progress", {
      p_data: state,
      p_saved_at: Number(state.savedAt) || 0,
    });
    if (error) throw new Error(error.message);
    return data ? { stale: true, current: data } : { ok: true };
  },

  /** The access token Supabase already gave this browser, for the functions that check callers. */
  async token() {
    if (!this.sb) return null;
    const { data } = await this.sb.auth.getSession();
    return data?.session?.access_token || null;
  },

  /* ----------------------------------------------------------------- admin */

  /**
   * The owner's panel. The function checks the caller for itself — this only carries the token
   * Supabase already gave the browser, so there is nothing here worth faking.
   */
  async admin(action, payload = {}) {
    if (!this.sb) throw new Error("База не подключена.");
    const token = await this.token();
    if (!token) throw new Error("Нужно войти.");
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(out.error || "Не получилось.");
    return out;
  },

  /* ----------------------------------------------------------- leaderboard */

  async leaderboard() {
    if (!this.sb) return { rows: [], me: null, total: 0 };
    const { data, error } = await this.sb.rpc("leaderboard");
    if (error) { console.warn("[backend] leaderboard:", error.message); return { rows: [], me: null, total: 0 }; }
    const rows = (data || []).map((r) => ({
      id: r.id, name: r.name, xp: r.xp || 0, coins: r.coins || 0,
      streak: r.streak || 0, cefr: r.cefr || "A1", levels: r.levels || 0,
      words: r.words || 0, games: r.games || {}, lastSeen: r.last_seen,
    }));
    return { rows, me: this.user?.id || null, total: rows.length };
  },
};

/** Supabase speaks English; Emil does not. */
function ruAuthError(error) {
  const m = String(error?.message || "").toLowerCase();
  if (m.includes("invalid login")) return "Почта или пароль не подходят.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Такая почта уже зарегистрирована. Войди вместо регистрации.";
  if (m.includes("password") && m.includes("6")) return "Пароль слишком короткий — минимум 8 символов.";
  if (m.includes("valid email") || m.includes("invalid email")) return "Похоже, это не почта. Проверь адрес.";
  if (m.includes("email not confirmed")) return "Почта ещё не подтверждена — открой письмо от сайта и нажми ссылку.";
  if (m.includes("rate limit") || m.includes("too many")) return "Слишком много попыток. Подожди пару минут.";
  if (m.includes("network") || m.includes("fetch")) return "Нет связи с сервером. Проверь интернет.";
  return error?.message || "Не получилось. Попробуй ещё раз.";
}
