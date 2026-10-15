// js/modal.js — универсальная модалка
(function() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="modal-window">
      <div class="modal-header">
        <h3 class="modal-title">Выбор</h3>
        <button type="button" class="modal-close" aria-label="Закрыть">×</button>
      </div>
      <div class="modal-search">
        <input type="text" class="modal-search-input" placeholder="Поиск...">
      </div>
      <div class="modal-body"></div>
      <div class="modal-footer">
        <button type="button" class="modal-clear">Очистить слот</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector('.modal-title');
  const searchEl = overlay.querySelector('.modal-search-input');
  const bodyEl = overlay.querySelector('.modal-body');
  const closeBtn = overlay.querySelector('.modal-close');
  const clearBtn = overlay.querySelector('.modal-clear');

  // ============ СОСТОЯНИЕ ============
  let currentItems = [];
  let currentFilter = '';
  let onPick = null;
  let onClear = null;
  let metaFormatter = null;   // ← вынесено наверх

  // ============ РЕНДЕР ============
  function renderList() {
    const filtered = currentFilter
      ? currentItems.filter(it => it.name.toLowerCase().includes(currentFilter.toLowerCase()))
      : currentItems;

    if (!filtered.length) {
      bodyEl.innerHTML = '<div class="modal-empty">Ничего не найдено</div>';
      return;
    }

    bodyEl.innerHTML = filtered.map(it => {
      const idx = currentItems.indexOf(it);
      return `
        <div class="modal-item" data-idx="${idx}">
          <img class="modal-item-icon" src="${it.sprite || ''}" alt="" onerror="this.style.display='none'">
          <div class="modal-item-info">
            <div class="modal-item-name">${it.name}</div>
            <div class="modal-item-meta">${formatMeta(it)}</div>
          </div>
        </div>
      `;
    }).join('');

    bodyEl.querySelectorAll('.modal-item').forEach(el => {
      el.addEventListener('click', () => {
        const item = currentItems[parseInt(el.dataset.idx)];
        if (onPick) onPick(item);
        close();
      });
    });
  }

  // ============ ФОРМАТ МЕТЫ ============
  function formatMeta(it) {
    const parts = [];
    if (it.tier) parts.push(`★${it.tier}`);

    // Если родитель передал свой форматтер — используем его
    if (metaFormatter) {
      const custom = metaFormatter(it);
      if (custom) parts.push(custom);
      return parts.join(' · ');
    }

    // Фолбэк — старое поведение (обзор)
    if (it.effects) {
      for (const eff of it.effects) {
        if (typeof eff !== 'string') continue;
        if (/Обзор|View Distance/i.test(eff)) { parts.push(eff); break; }
      }
    }
    return parts.join(' · ');
  }

  // ============ ОТКРЫТИЕ / ЗАКРЫТИЕ ============
  function open({ title, items, onPick: pickCb, onClear: clearCb, metaFormatter: metaFn }) {
    titleEl.textContent = title || 'Выбор';
    currentItems = (items || []).slice().sort((a, b) =>
      (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name)
    );
    onPick = pickCb;
    onClear = clearCb;
    metaFormatter = metaFn || null;   // ← всегда сбрасываем
    currentFilter = '';
    searchEl.value = '';
    renderList();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  // ============ СОБЫТИЯ ============
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  searchEl.addEventListener('input', () => { currentFilter = searchEl.value; renderList(); });
  clearBtn.addEventListener('click', () => { if (onClear) onClear(); close(); });

  window.Modal = { open, close };
})();