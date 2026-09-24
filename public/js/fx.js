// Visual + audio effects: confetti, synth sounds, toasts, XP count-up, background particles
import { t as tr } from "./i18n.js";
import { el, nextTick } from "./utils.js";

let audioCtx = null;
let soundEnabled = true;
export function setSoundEnabled(v) { soundEnabled = v; }

function ctx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone(freq, { t = 0, dur = 0.12, type = "sine", gain = 0.12 } = {}) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + t);
  g.gain.setValueAtTime(0.0001, c.currentTime + t);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + t);
  o.stop(c.currentTime + t + dur + 0.05);
}

export const sfx = {
  correct() { if (!soundEnabled) return; tone(660, { dur: 0.1 }); tone(880, { t: 0.09, dur: 0.16 }); },
  wrong() { if (!soundEnabled) return; tone(220, { dur: 0.18, type: "triangle", gain: 0.1 }); tone(180, { t: 0.12, dur: 0.2, type: "triangle", gain: 0.08 }); },
  click() { if (!soundEnabled) return; tone(520, { dur: 0.05, gain: 0.05 }); },
  levelUp() { if (!soundEnabled) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, { t: i * 0.11, dur: 0.22, gain: 0.1 })); },
  achievement() { if (!soundEnabled) return; [784, 988, 1175, 1568].forEach((f, i) => tone(f, { t: i * 0.08, dur: 0.3, gain: 0.09, type: "triangle" })); },
  pop() { if (!soundEnabled) return; tone(900, { dur: 0.06, gain: 0.06 }); },
  mic() { if (!soundEnabled) return; tone(440, { dur: 0.08, gain: 0.06 }); tone(660, { t: 0.08, dur: 0.1, gain: 0.06 }); },
};

/* ---------- confetti ---------- */
let confettiCanvas = null;
export function confetti({ count = 140, duration = 2200, colors = ["#7c5cff", "#4dabf7", "#51cf66", "#ffd43b", "#ff6b9d", "#22b8cf"] } = {}) {
  if (!confettiCanvas) {
    confettiCanvas = el("canvas", { class: "confetti-canvas" });
    document.body.append(confettiCanvas);
  }
  const c = confettiCanvas;
  const dpr = window.devicePixelRatio || 1;
  c.width = window.innerWidth * dpr;
  c.height = window.innerHeight * dpr;
  const g = c.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = window.innerWidth, H = window.innerHeight;
  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.5,
    y: H * 0.35,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const start = performance.now();
  let prev = start;
  c.style.opacity = "1";
  function frame(now) {
    const t = now - start;
    // step by real time, not by frame: the fade is measured in milliseconds, so frame-based
    // physics made the whole burst play at double speed on a 120 Hz screen
    const dt = Math.min(2.5, (now - prev) / 16.67);
    prev = now;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.35 * dt;
      p.vx *= Math.pow(0.99, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.color;
      g.globalAlpha = Math.max(0, 1 - t / duration);
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      g.restore();
    }
    if (t < duration) requestAnimationFrame(frame);
    else { g.clearRect(0, 0, W, H); c.style.opacity = "0"; }
  }
  requestAnimationFrame(frame);
}

/* ---------- toasts ---------- */
let toastHost = null;
export function toast(text, { icon = "✨", kind = "info", ms = 3200, title = null } = {}) {
  if (!toastHost) {
    toastHost = el("div", { class: "toast-host" });
    document.body.append(toastHost);
  }
  const t = el("div", { class: `toast toast-${kind}` },
    el("div", { class: "toast-icon" }, icon),
    el("div", { class: "toast-body" }, title ? el("div", { class: "toast-title" }, title) : null, el("div", { class: "toast-text" }, text)),
  );
  toastHost.append(t);
  nextTick(() => t.classList.add("show"));
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 400);
  }, ms);
  return t;
}

export function achievementToast(a) {
  sfx.achievement();
  toast(a.ru, { icon: a.icon, kind: "achievement", title: tr`Достижение: ${a.title}`, ms: 4200 });
}

/* ---------- XP fly + count-up ---------- */
export function countUp(node, from, to, ms = 800, fmt = (n) => Math.round(n)) {
  const start = performance.now();
  let finished = false;
  function frame(now) {
    if (finished) return;
    const p = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    // Число, а не фраза: через словарь ему идти незачем. tr() здесь ронял первый же кадр, и на
    // экране итогов после каждого задания оставалось «0 XP получено» — при начисленном опыте.
    node.textContent = String(fmt(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(frame);
    else finished = true;
  }
  requestAnimationFrame(frame);
  // guarantee the final value even if rAF is paused (hidden tab)
  setTimeout(() => { if (!finished) { finished = true; node.textContent = String(fmt(to)); } }, ms + 60);
}

export function xpFloat(anchor, amount) {
  const r = anchor?.getBoundingClientRect?.();
  const f = el("div", { class: "xp-float" }, `+${amount} XP`);
  // The number is drawn above its anchor and then rises another ~70px. Anchored to something that
  // starts at the top of the screen — a whole game board — it used to animate straight off the top
  // and he never saw what he had earned, so it is kept inside the viewport here.
  const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
  const vh = window.innerHeight || document.documentElement.clientHeight || 768;
  const cx = r ? r.left + r.width / 2 : vw / 2;
  const cy = r ? r.top : vh / 2;
  // Math.max on the upper bound too: a window that reports no size at all must not invert the clamp
  f.style.left = Math.min(Math.max(cx, 60), Math.max(60, vw - 60)) + "px";
  f.style.top = Math.min(Math.max(cy, 100), Math.max(100, vh - 30)) + "px";
  document.body.append(f);
  setTimeout(() => f.remove(), 1300);
}

/* ---------- ambient particles ---------- */
export function startParticles(canvas) {
  if (!canvas) return;
  const g = canvas.getContext("2d");
  let W, H, dpr;
  const dots = [];
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);
  const N = Math.min(70, Math.floor((W * H) / 22000));
  for (let i = 0; i < N; i++) {
    dots.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.25, vy: -0.1 - Math.random() * 0.25, a: 0.2 + Math.random() * 0.5, hue: 230 + Math.random() * 80 });
  }
  let last = 0;
  function frame(now) {
    if (document.hidden) { requestAnimationFrame(frame); return; }
    if (now - last < 33) { requestAnimationFrame(frame); return; }
    last = now;
    g.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      if (d.x < -5) d.x = W + 5; else if (d.x > W + 5) d.x = -5;
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fillStyle = `hsla(${d.hue}, 90%, 75%, ${d.a})`;
      g.fill();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
