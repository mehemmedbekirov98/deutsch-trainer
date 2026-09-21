// A static preview of the site, for working on the interface without anything else running.
//
// This is NOT the app's server — the app has no server any more. Netlify serves public/ and the
// two functions; `npm run dev` (netlify dev) reproduces all of that properly. This is the smaller
// thing you want when you are moving a button around: no functions, no Supabase, no keys. The page
// then finds no configuration, runs as a guest on a save in localStorage, and says so.
//
//   npm run preview        → http://localhost:4173
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public");
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  // The functions are not running here. Answering "nothing is configured" is honest and lets the
  // app boot; a 404 would leave it waiting on a request that is never coming.
  if (url.pathname === "/api/status") {
    res.writeHead(200, { "content-type": TYPES[".json"] });
    return res.end(JSON.stringify({ ai: false, tts: false, supabaseUrl: "", supabaseAnonKey: "", canSetKey: false }));
  }
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(503, { "content-type": TYPES[".json"] });
    return res.end(JSON.stringify({ error: "Функции здесь не запущены — используй npm run dev (netlify dev)." }));
  }

  // Everything under public/, and index.html for anything else (the app routes on the hash).
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const file = path.join(ROOT, rel);
  // never serve anything above public/, whatever the path pretends to be
  const target = file.startsWith(ROOT) ? file : path.join(ROOT, "index.html");

  try {
    const body = await fs.readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[path.extname(target)] || "application/octet-stream",
      // Never cache here. Editing a file and then staring at the old one because the browser kept
      // it is the single most confusing thing a preview server can do.
      "cache-control": "no-store, must-revalidate",
    });
    res.end(body);
  } catch {
    const html = await fs.readFile(path.join(ROOT, "index.html")).catch(() => null);
    if (!html) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": TYPES[".html"] });
    res.end(html);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  Превью интерфейса:  http://localhost:${PORT}`);
  console.log("  Без функций и без базы — только вёрстка и офлайн-Мия.");
  console.log("  Полный запуск, как на проде:  npm run dev\n");
});
