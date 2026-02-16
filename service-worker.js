// ============================================
// SERVICE WORKER — Makes Mission Control work offline
// ============================================

// Cache name — change the version number when you update your app
// This forces the browser to download fresh copies of your files
var CACHE_NAME = 'mission-control-v14';

// List of files to cache — these will be available offline
var URLS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './icon-192.png',
    './icon-512.png'
];

// ---- INSTALL EVENT ----
// Fires when the service worker is first registered
// We use it to pre-cache all our files
self.addEventListener('install', function(event) {
    console.log('🛸 Service Worker: Installing...');

    // event.waitUntil() tells the browser:
    // "don't finish installing until this Promise resolves"
    event.waitUntil(
        // caches.open() creates or opens a named cache
        // Think of it like a named box where we store files
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('🛸 Service Worker: Caching app files');
            // addAll() fetches each URL and stores the response in the cache
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

// ---- ACTIVATE EVENT ----
// Fires when a new service worker takes over
// We use it to clean up old caches from previous versions
self.addEventListener('activate', function(event) {
    console.log('🛸 Service Worker: Activating...');

    event.waitUntil(
        // caches.keys() returns the names of ALL caches
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(name) {
                    // If this cache isn't our current one, delete it
                    // This cleans up old versions
                    if (name !== CACHE_NAME) {
                        console.log('🛸 Service Worker: Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});

// ---- FETCH EVENT ----
// Fires every time the app requests a file (HTML, JS, CSS, images, etc.)
// We intercept the request and serve from cache if available
self.addEventListener('fetch', function(event) {

    event.respondWith(
        // Try to find the requested file in our cache
        caches.match(event.request).then(function(cachedResponse) {

            // If we have it cached, return the cached version
            // BUT ALSO fetch a fresh copy from the network in the background
            // This is called "stale-while-revalidate" strategy:
            // - User gets instant response from cache (fast!)
            // - Cache gets updated with fresh version for next time

            if (cachedResponse) {
                // Fire off a background fetch to update the cache
                fetch(event.request).then(function(networkResponse) {
                    // Only cache successful responses
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(function() {
                    // Network failed — that's fine, we served from cache
                });

                return cachedResponse;
            }

            // Not in cache — fetch from network
            return fetch(event.request).then(function(networkResponse) {
                // Cache this new resource for next time
                if (networkResponse && networkResponse.status === 200) {
                    var responseToCache = networkResponse.clone();
                    // We clone because a response can only be consumed once
                    // We need one copy for the cache and one to return to the browser
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(function() {
                // Both cache AND network failed
                // You could return a custom offline page here
                console.log('🛸 Service Worker: Offline and not cached:', event.request.url);
            });
        })
    );
});
