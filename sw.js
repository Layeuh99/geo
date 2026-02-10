// ============================================
// SERVICE WORKER - GéoWeb Kaffrine PWA
// Version: 3.1.0 - Optimisé pour performances
// ============================================

// 🔥 VERSION ET CONFIGURATION
const VERSION = 'v3.1';
const CACHE_NAME   = `web-gis-kaffrine-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const DATA_CACHE   = `data-${VERSION}`;

// ⚡ PERFORMANCE SETTINGS
const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms
const MAX_ENTRIES = 100; // Limite d'entrées par cache

// ============================================
// RESSOURCES STATIQUES OPTIMISÉES
// ============================================
const STATIC_ASSETS = [
  '/css/leaflet.css',
  '/css/app-modern.css',
  '/css/qgis2web.css',
  '/css/mobile-responsive.css',
  '/css/fullscreen-responsive.css',
  '/js/app-modern.js',
  '/js/leaflet.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 🗂️ POLICY DES CACHE
const CACHE_POLICY = {
  static: { strategy: 'cacheFirst', maxAge: MAX_AGE },
  data: { strategy: 'networkFirst', maxAge: MAX_AGE / 7 }, // 1 jour pour les données
  tiles: { strategy: 'staleWhileRevalidate', maxAge: MAX_AGE / 24 } // 6 heures pour les tuiles
};

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation', VERSION);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATE — SUPPRIME TOUS LES ANCIENS CACHES
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation', VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (
            cache !== CACHE_NAME &&
            cache !== STATIC_CACHE &&
            cache !== DATA_CACHE
          ) {
            console.log('[SW] Suppression ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================
// FETCH — STRATÉGIES
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // ❗ index.html TOUJOURS depuis le réseau
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request));
    return;
  }

  // Ressources statiques
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Données SIG
  if (isDataRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Tuiles de carte
  if (isTileRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Fallback
  event.respondWith(fetch(request));
});

// ============================================
// HELPERS
// ============================================
function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2')
  );
}

function isDataRequest(url) {
  return url.pathname.includes('/data/') || url.pathname.endsWith('.geojson');
}

function isTileRequest(url) {
  return (
    url.hostname.includes('tile') ||
    url.hostname.includes('openstreetmap') ||
    url.hostname.includes('google') ||
    url.hostname.includes('cartocdn')
  );
}

// ============================================
// STRATÉGIES CACHE OPTIMISÉES
// ============================================

// Cache First avec expiration
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  if (cached && !isExpired(cached)) {
    console.log('[SW] Cache HIT:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache MISS:', request.url);
  const response = await fetch(request);
  if (response.ok) {
    const responseToCache = response.clone();
    responseToCache.headers.set('Cache-Control', `public, max-age=${MAX_AGE / 1000}`);
    cache.put(request, responseToCache);
  }
  return response;
}

// Network First avec fallback intelligent
async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      console.log('[SW] Network HIT:', request.url);
      const responseToCache = response.clone();
      responseToCache.headers.set('Cache-Control', `public, max-age=${CACHE_POLICY.data.maxAge / 1000}`);
      cache.put(request, responseToCache);
      return response;
    }
    throw new Error('Réponse réseau invalide');
  } catch (error) {
    console.log('[SW] Network FALLBACK:', request.url);
    const cached = await cache.match(request);
    if (cached && !isExpired(cached)) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate optimisé
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      console.log('[SW] Revalidate SUCCESS:', request.url);
      const responseToCache = response.clone();
      responseToCache.headers.set('Cache-Control', `public, max-age=${CACHE_POLICY.tiles.maxAge / 1000}`);
      cache.put(request, responseToCache);
    }
    return response;
  }).catch((error) => {
    console.warn('[SW] Revalidate FAILED:', request.url, error);
    return cached;
  });
  
  return cached || networkFetch;
}

// Vérification d'expiration
function isExpired(response) {
  if (!response || !response.headers) return false;
  
  const cacheControl = response.headers.get('Cache-Control');
  if (!cacheControl) return false;
  
  const maxAge = cacheControl.match(/max-age=(\d+)/);
  if (!maxAge) return false;
  
  const date = response.headers.get('Date');
  if (!date) return false;
  
  const age = (Date.now() - new Date(date).getTime()) / 1000;
  return age > parseInt(maxAge[1]);
}

// ============================================
// FONCTIONNALITÉS PWA AVANCÉES
// ============================================

// 🎯 Gestion des raccourcis clavier
self.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey) {
    switch(event.key) {
      case 'k':
      case 'K':
        toggleLeftPanel();
        event.preventDefault();
        break;
      case 'l':
      case 'L':
        toggleRightPanel();
        event.preventDefault();
        break;
      case 'h':
      case 'H':
        showHome();
        event.preventDefault();
        break;
      case 'a':
      case 'A':
        showAbout();
        event.preventDefault();
        break;
      case 's':
      case 'S':
        showSpatialQuery();
        event.preventDefault();
        break;
      case '/':
        toggleSearch();
        event.preventDefault();
        break;
    }
  }
});

// 🔔 Notifications push avancées
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text : 'Nouvelle mise à jour disponible pour GéoWeb Kaffrine',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'geoweb-kaffrine-update',
    requireInteraction: true,
    actions: [
      {
        action: 'explore',
        title: 'Explorer',
        icon: '/icons/shortcut-locate.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
        icon: '/icons/shortcut-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GéoWeb Kaffrine', options)
  );
});

// 📱 Gestion du focus pour l'accessibilité
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
  
  if (event.data === 'requestNotificationPermission') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('[SW] Permission notifications accordée');
      }
    });
  }
});
