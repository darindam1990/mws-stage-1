const CACHE = 'mws-v1';

// A list of local resources we always want to be cached.
const CACHE_URLS = [
  '/',
  'js/common.js',
  'js/dbhelper.js',
  'js/main.js',
  'js/restaurant_info.js',
  'css/styles.css',
  'data/restaurants.json',
  '/restaurant.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('fetch', function (event) {
  const fetchPromise = () => {
    const fetchPromise = fetch(event.request);
    fetchPromise.then(response => {
      if (event.request.url.endsWith('.jpg')) {
        const clonedResponse = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clonedResponse));
      }
    });
    return fetchPromise;
  };
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetchPromise();
    })
  );
});