// Service worker: guarda o app no aparelho para funcionar sem internet.
const VERSAO = "aep-v8";
const ARQUIVOS = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/logo.js", "js/config.js", "js/auth.js", "js/produtos.js", "js/vendor/supabase.js", "js/store-local.js", "js/app.js",
  "js/vendor/jszip.min.js", "js/vendor/jspdf.umd.min.js", "js/vendor/jspdf.plugin.autotable.min.js",
  "img/logo.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/maskable-192.png", "icons/favicon-32.png"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO && k !== "pl-fontes").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Fontes do Google: guarda na primeira vez que carregar com internet.
  if (url.host === "fonts.googleapis.com" || url.host === "fonts.gstatic.com") {
    e.respondWith(caches.open("pl-fontes").then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }
      catch (err) { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // Arquivos do app: rede primeiro (pega atualizações), aparelho se estiver sem internet.
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
