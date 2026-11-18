/* Service worker Mata Rantai Islam.
   Halaman (HTML/JSON/JS/CSS): jaringan dulu supaya selalu terbaru, cadangan dari cache bila offline.
   Gambar & font: cache dulu, diperbarui di latar belakang.
   Naikkan VERSI setiap ada perubahan agar cache lama dibuang. */
var VERSI = 'mri-v7';
var INTI = ['./', 'index.html', 'css/styles.css', 'js/app-1.js', 'js/app-2.js', 'js/tema-kartu.js',
            'manifest.webmanifest', 'logo/ikon-192.png', 'logo/ikon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) {
    return Promise.all(INTI.map(function (u) {
      return fetch(new Request(u, { cache: 'no-cache' })).then(function (res) {
        if (res && res.ok) return c.put(u, res);
      }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  var p = new URL(r.url).pathname;
  var penting = r.mode === 'navigate' || /\.(html|json|js|css)$/i.test(p) || /\/$/.test(p);
  e.respondWith(caches.open(VERSI).then(function (c) {
    if (penting) {
      return fetch(r, { cache: 'no-cache' }).then(function (res) {
        if (res && res.ok) c.put(r, res.clone());
        return res;
      }).catch(function () {
        return c.match(r, { ignoreSearch: true }).then(function (hit) { return hit || c.match('index.html'); });
      });
    }
    return c.match(r, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(r).then(function (res) {
        if (res && res.ok) c.put(r, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  }));
});
