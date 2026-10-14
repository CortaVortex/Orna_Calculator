// sw.js — Service Worker для PWA
const CACHE_NAME = 'orna-calc-v1';
const ASSETS = [
  './',
  './pages/view.html',
  './pages/farm.html',
  './pages/ward.html',
  './css/shared.css',
  './css/view.css',
  './css/farm.css',
  './css/ward.css',
  './js/shared.js',
  './js/modal.js',
  './js/view.js',
  './manifest.webmanifest',
];

// Установка — кешируем файлы
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Активация — удаляем старые кеши
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — сначала кеш, потом сеть
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});