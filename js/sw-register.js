// js/sw-register.js
// Регистрирует Service Worker с правильным путём:
// - index.html в корне → './sw.js', scope './'
// - pages/*.html       → '../sw.js', scope '../'

const isLocalhost =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  location.hostname === '[::1]';

if (isLocalhost) {
  console.log('[SW] Localhost — SW отключён');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs =>
      regs.forEach(reg => reg.unregister())
    );
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const inPages = location.pathname.includes('/pages/');
    const swPath = inPages ? '../sw.js' : './sw.js';
    const swScope = inPages ? '../' : './';

    navigator.serviceWorker.register(swPath, { scope: swScope }).then((reg) => {
      console.log('[SW] Registered:', reg.scope);
      reg.update().catch(() => {});

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
            console.log('[SW] New version activated, reloading...');
            window.location.reload();
          }
        });
      });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}