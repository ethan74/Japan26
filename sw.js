// Japan 2026 Service Worker
const CACHE = 'japan26-v2';
const OFFLINE_URL = '/Japan26/';

// Installation: App cachen
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll([
        '/Japan26/',
        '/Japan26/index.html',
      ]);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activation: alte Caches löschen
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-first für App, Network-first für APIs
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // APIs immer live versuchen, bei Fehler leere Antwort
  if (url.includes('open-meteo.com') || url.includes('frankfurter.app')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({}), {
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // App: Cache-first, dann Netzwerk
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200 && response.type !== 'opaque') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline und nicht gecacht: App-Shell zurückgeben
        return caches.match(OFFLINE_URL);
      });
    })
  );
});
