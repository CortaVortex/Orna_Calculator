// js/sw-register.js
// Регистрирует Service Worker и обновляет страницу при выходе новой версии.

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Проверяем обновления при каждой загрузке страницы
      reg.update().catch(() => {});

      // Следим за появлением нового SW
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        if (!newSW) return;

        newSW.addEventListener('statechange', () => {
          // Новый SW активировался — обновляем страницу
          if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch((err) => {
      console.warn('[SW] Registration failed:', err);
    });

    // Смена контроллера — перезагрузка (один раз)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}