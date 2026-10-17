// ========== ЯЗЫК ==========
(function initLang() {
    const btns = document.querySelectorAll('[data-lang]');
    if (!btns.length) return;

    // Определяем язык:
    // 1. Если в localStorage есть сохранённый — берём его.
    // 2. Иначе — по системному языку: ru* → 'ru', иначе — 'en'.
    function detectLang() {
        const saved = localStorage.getItem('orna-lang');
        if (saved === 'ru' || saved === 'en') return saved;

        const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        return browserLang.startsWith('ru') ? 'ru' : 'en';
    }

    let lang = detectLang();

    function applyLang() {
        // Меняем тексты на странице
        document.querySelectorAll('[data-ru]').forEach(el => {
            el.textContent = el.dataset[lang];
        });
        
        // Меняем атрибут lang у тега <html>
        document.documentElement.lang = lang;
        
        // Сохраняем выбор
        localStorage.setItem('orna-lang', lang);

        // Подсвечиваем активную кнопку (флаг)
        btns.forEach(btn => {
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Отправляем событие для других скриптов (farm.js, view.js и т.д.)
        window.dispatchEvent(new CustomEvent('orna-lang-changed', { detail: { lang } }));
    }

    // Вешаем обработчики на все кнопки с флагами
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newLang = btn.dataset.lang;
            if (lang === newLang) return; // Если язык уже этот — ничего не делаем
            
            lang = newLang;
            applyLang();
        });
    });

    applyLang();
})();


// ============ УТИЛИТЫ ============
window.formatNumber = function(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

window.getCurrentLang = function() {
  return localStorage.getItem('orna-lang') || 'ru';
};

// ============ ПЕРЕКЛЮЧАТЕЛЬ WEAPON / OFFHAND ============
// Обработчик навешивается на все .slot-mode-toggle в документе.
// Используется универсальный window.resetSlot(slot), который чистит:
//   - картинку (.slot-icon-img)
//   - название (.slot-name внутри .slot-wrapper)
//   - стат (.slot-stats внутри .slot-wrapper)
window.initSlotModeToggle = function() {
  document.querySelectorAll('.slot-mode-toggle').forEach(toggle => {
    if (toggle.dataset.boundShared === '1') return;
    toggle.dataset.boundShared = '1';

    toggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newMode = btn.dataset.mode;
        if (toggle.dataset.mode === newMode) return;

        toggle.dataset.mode = newMode;
        toggle.querySelectorAll('.mode-btn').forEach(b =>
          b.classList.toggle('active', b === newMode)
        );

        const slot = toggle.closest('.slot');
        resetSlot(slot);
      });
    });
  });
};

// ============ УНИВЕРСАЛЬНЫЙ СБРОС СЛОТА ============
// Не трогает recalc(), updateTotalGemsSlots() и т.п. — это на усмотрение страницы.
window.resetSlot = function(slotEl) {
  if (!slotEl) return;

  const wrapper = slotEl.closest('.slot-wrapper');
  const img = slotEl.querySelector('.slot-icon-img');
  // Название может быть внутри wrapper (новые слоты) или внутри slot (мнемы)
  const nameEl = wrapper?.querySelector('.slot-name') || slotEl.querySelector('.slot-name');
  const statsEl = wrapper?.querySelector('.slot-stats') || slotEl.querySelector('.slot-stats');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img) { img.hidden = true; img.removeAttribute('src'); }
  if (nameEl) {
    const lang = window.getCurrentLang();
    nameEl.textContent = nameEl.dataset[lang] || nameEl.dataset.ru || 'Пусто';
  }
  if (statsEl) statsEl.textContent = '';
  if (qualitySel) qualitySel.hidden = true;

  // Снимаем фон качества, если он был
  slotEl.style.backgroundImage = '';
  slotEl.style.backgroundBlendMode = '';

  // Убираем флаги данных
  slotEl.classList.remove('has-item');
  delete slotEl.dataset.itemId;
  delete slotEl.dataset.itemMult;
  delete slotEl.dataset.sockets;

  // Сообщаем странице, что слот сброшен — она сама решит, что пересчитать
  window.dispatchEvent(new CustomEvent('orna-slot-cleared', { detail: { slot: slotEl } }));
};

// Автозапуск при загрузке — если `.slot-mode-toggle` уже в DOM
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.initSlotModeToggle === 'function') {
    window.initSlotModeToggle();
  }
});