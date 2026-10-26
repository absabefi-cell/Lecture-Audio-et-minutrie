const CACHE = "lecteur-v3";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord : la dernière version est toujours chargée si internet est dispo,
// sinon on sert la copie en cache (mode hors ligne).
self.addEventListener("fetch", e => {
  const req = e.request;

  // On ne touche qu'aux GET de notre propre site, sans requêtes partielles (audio)
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.headers.has("range")) return;

  e.respondWith(
    fetch(req)
      .then(r => {
        // On met en cache seulement les réponses complètes et valides (200)
        if (r && r.status === 200 && r.type === "basic") {
          const copie = r.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(req, copie)));
        }
        return r;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(rep => {
          if (rep) return rep;
          // Hors ligne sur une page : on renvoie l'app
          if (req.mode === "navigate") return caches.match("./index.html");
          return Response.error();
        })
      )
  );
});
