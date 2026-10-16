// sw.js — Service Worker для PWA с автообновлением
// ВАЖНО: __BUILD_DATE__ заменяется на дату сборки при деплое через GitHub Actions.
// При локальной разработке он не подставляется — используйте dev-версию.

const CACHE_NAME = 'orna-calc-__BUILD_DATE__';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',

  './pages/view.html',
  './pages/farm.html',
  './pages/ward.html',

  './css/shared.css',
  './css/home.css',
  './css/view.css',
  './css/farm.css',
  './css/ward.css',

  './js/shared.js',
  './js/modal.js',
  './js/view.js',
  './js/view-calc.js',
  './js/farm.js',
  './js/farm-calc.js',
  './js/ward.js',
];

// Установка — кешируем файлы, сразу активируемся
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Не удалось закешировать некоторые файлы:', err);
      });
    })
  );
  self.skipWaiting();
});

// Активация — удаляем ВСЕ старые кеши, сразу берём контроль
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first для HTML/JS/CSS, cache-fallback при оффлайне
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Пропускаем внешние домены (playorna.com и т.д.)
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Network-first
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Обновляем кеш свежей копией
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});