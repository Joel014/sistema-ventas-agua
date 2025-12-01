const CACHE_NAME = 'awa-v3';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/script.js',
    './js/auth.js',
    './js/firebase-config.js',
    './img/logo.png',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/sweetalert2@11',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap'
];

// Install Event
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate Event
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request).then((fetchRes) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    // Cache new requests dynamically (optional, good for CDN scripts)
                    // cache.put(e.request, fetchRes.clone()); 
                    return fetchRes;
                });
            });
        })
    );
});
