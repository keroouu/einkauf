// Service Worker: hält die App offline startfähig (z. B. im Funkloch im Supermarkt).
// Bei Änderungen an der App VERSION hochzählen, damit die iPhones die neue Version laden.
const VERSION = 'einkauf-v2';
const SDK = 'https://www.gstatic.com/firebasejs/11.0.2/';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'backend.js', 'categories.js', 'firebase-config.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // Firebase-Bausteine gleich mit sichern – ohne sie startet die App offline nicht.
  SDK + 'firebase-app.js', SDK + 'firebase-auth.js', SDK + 'firebase-firestore.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Erst Netz, bei Fehler Cache – so gibt es immer die neueste Version, wenn online.
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const firebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');
  if (!sameOrigin && !firebaseSdk) return;

  const fromCache = () => caches.match(request, { ignoreSearch: true })
    .then(r => r || (request.mode === 'navigate' ? caches.match('index.html') : undefined));

  const network = fetch(request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(request, copy)); }
    return res;
  });

  // Bei schlechtem Empfang nicht ewig warten: nach 3 Sekunden die gespeicherte Version nehmen.
  const timeout = new Promise(resolve => setTimeout(resolve, 3000)).then(fromCache);

  e.respondWith(
    Promise.race([network.catch(fromCache), timeout])
      .then(r => r || network)
      .catch(fromCache)
  );
});
