const CACHE_VERSION = "v1";
const CACHE_NAME = `pwabuilder-precache-${CACHE_VERSION}`;

self.addEventListener("install", event => {
    console.log("[PWA Builder] Install Event processing");
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(precacheFiles))
            .then(() => console.log("[PWA Builder] Precaching complete"))
            .catch(error => console.error("[PWA Builder] Precaching failed:", error))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("[PWA Builder] Activate Event processing");
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.filter(name => name.startsWith("pwabuilder-precache-") && name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => console.log("[PWA Builder] Cache cleanup complete"))
            .catch(error => console.error("[PWA Builder] Cache cleanup failed:", error))
    );
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log("[PWA Builder] Resource found in cache:", event.request.url);
                    return response;
                }

                console.log("[PWA Builder] Resource not found in cache. Fetching from network:", event.request.url);
                return fetch(event.request)
                    .then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
                            return networkResponse;
                        }

                        const clonedResponse = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, clonedResponse))
                            .catch(error => console.error("[PWA Builder] Caching failed:", error));

                        return networkResponse;
                    })
                    .catch(error => {
                        console.error("[PWA Builder] Fetch failed. Serving offline fallback:", error);
                        return caches.match("offline.html");
                    });
            })
            .catch(error => console.error("[PWA Builder] Fetch failed:", error))
    );
});