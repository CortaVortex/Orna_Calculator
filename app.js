// ============ ЯЗЫК ============
(function initLang() {
  const btn = document.getElementById('lang-toggle');
  let lang = 'ru';

  function applyLang() {
    document.querySelectorAll('[data-ru]').forEach(el => {
      el.textContent = el.dataset[lang];
    });
    document.documentElement.lang = lang;
    btn.textContent = lang === 'ru' ? 'EN' : 'RU';
  }

  btn.addEventListener('click', () => {
    lang = lang === 'ru' ? 'en' : 'ru';
    applyLang();
  });
})();

// ============ ПЕРЕКЛЮЧАТЕЛЬ WEAPON / OFFHAND ============
document.querySelectorAll('.slot-mode-toggle').forEach(toggle => {
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

function resetSlot(slot) {
  const img = slot.querySelector('.slot-icon-img');
  const name = slot.querySelector('.slot-name');
  const stats = slot.querySelector('.slot-stats');

  if (img) {
    img.hidden = true;
    img.removeAttribute('src');
  }
  if (name) {
    const lang = document.documentElement.lang || 'ru';
    name.textContent = name.dataset[lang] || name.dataset.ru || 'Пусто';
  }
  if (stats) stats.textContent = '';
}

// ============ КЛАСС, СПЕЦИАЛИЗАЦИЯ, ПИТОМЕЦ ============
const classSelect = document.getElementById('class-select');
const specSelect  = document.getElementById('spec-select');

const classIcon = document.getElementById('class-icon');
const specIcon  = document.getElementById('spec-icon');

// Универсальная функция: грузит картинку, при ошибке прячет и показывает «?»
function bindIcon(selectEl, imgEl, folder) {
  if (!selectEl || !imgEl) return;

  const wrap = imgEl.parentElement;
  const placeholder = wrap.querySelector('.class-icon-placeholder, .pet-placeholder');

  selectEl.addEventListener('change', () => {
    const val = selectEl.value;
    if (!val) {
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      if (placeholder) placeholder.hidden = false;
      return;
    }

    imgEl.onerror = () => {
      imgEl.hidden = true;
      imgEl.removeAttribute('src');
      if (placeholder) placeholder.hidden = false;
    };

    imgEl.src = `images/${folder}/${val}.png`;
    imgEl.hidden = false;
    if (placeholder) placeholder.hidden = true;
  });
}

bindIcon(classSelect, classIcon, 'classes');
bindIcon(specSelect,  specIcon,  'specs');

// ============ ПИТОМЕЦ — КЛИК ПО КАРТИНКЕ ============
const petBox = document.getElementById('pet-box');
const petImage = document.getElementById('pet-image');
const petPlaceholder = document.getElementById('pet-placeholder');
const petName = document.getElementById('pet-name');

// Проверка: можно ли сейчас выбирать питомца.
function canPickPet() {
  return true;
}

petBox?.addEventListener('click', () => {
  if (!canPickPet()) return;
  console.log('Клик по питомцу — здесь будет модалка выбора');
  if (petName.textContent.includes('Питомец') || petName.textContent.includes('Follower')) {
    petName.textContent = '★ Огонёк';
    petImage.src = 'images/pets/wisp.png';
    petImage.hidden = false;
    petImage.onerror = () => {
      petImage.hidden = true;
      petImage.removeAttribute('src');
      if (petPlaceholder) petPlaceholder.hidden = false;
    };
    if (petPlaceholder) petPlaceholder.hidden = true;
  } else {
    petName.textContent = '★ Питомец';
    petImage.hidden = true;
    petImage.removeAttribute('src');
    if (petPlaceholder) petPlaceholder.hidden = false;
  }
});

// ============ МНЕМЫ — ВЫБОР ЭФФЕКТОВ ============
const MNEM_VIEW_MIN = 1;
const MNEM_VIEW_MAX = 5;

function getMnemSelects(mnemId) {
  return document.querySelectorAll(`.mnem-select[data-mnem="${mnemId}"]`);
}

// Обновляет доступность опций: выбранный где-то эффект блокируется в остальных
function refreshMnemOptions(mnemId) {
  const selects = getMnemSelects(mnemId);
  const chosen = new Set();

  selects.forEach(sel => {
    if (sel.value) chosen.add(sel.value);
  });

  selects.forEach(sel => {
    const currentValue = sel.value;
    sel.querySelectorAll('option').forEach(opt => {
      const v = opt.value;
      if (!v) { opt.disabled = false; return; }
      opt.disabled = chosen.has(v) && v !== currentValue;
    });
  });
}

// Обновляет состояние поля ввода
function refreshMnemInput(selectEl, inputEl) {
  if (!inputEl) return;
  validateMnemView(inputEl);
}

// Проверка ввода обзора: 1–5
function validateMnemView(inputEl) {
  const v = inputEl.value.trim();
  if (v === '') {
    inputEl.classList.remove('is-error');
    return;
  }
  const n = Number(v);
  if (Number.isNaN(n) || n < MNEM_VIEW_MIN || n > MNEM_VIEW_MAX || !Number.isInteger(n)) {
    inputEl.classList.add('is-error');
  } else {
    inputEl.classList.remove('is-error');
  }
}

// Инициализация всех мнемов
function initMnems() {
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const mnemId = sel.dataset.mnem;
    const rowId = sel.dataset.row;
    const input = document.querySelector(`.mnem-input[data-mnem="${mnemId}"][data-row="${rowId}"]`);

    sel.addEventListener('change', () => {
      refreshMnemInput(sel, input);
      refreshMnemOptions(mnemId);
    });

    if (input) {
      input.addEventListener('input', () => {
        validateMnemView(input);
      });
    }
  });

  ['1', '2'].forEach(id => {
    refreshMnemOptions(id);
    getMnemSelects(id).forEach(sel => {
      const input = document.querySelector(`.mnem-input[data-mnem="${id}"][data-row="${sel.dataset.row}"]`);
      refreshMnemInput(sel, input);
    });
  });
}

initMnems();

// ============ ЗАВИСИМОСТЬ ЛЕВОГО МНЕМА ОТ СПЕЦИАЛИЗАЦИИ ============
const leftMnemSlot = document.querySelector('[data-slot="mnem-1"]');
const ORACLE_SPECS = ['oracle', 'grand-oracle'];

function updateLeftMnemLock() {
  if (!leftMnemSlot) return;
  const spec = specSelect?.value || '';
  const unlocked = ORACLE_SPECS.includes(spec);

  leftMnemSlot.classList.toggle('is-locked', !unlocked);

  leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => {
    sel.disabled = !unlocked;
  });

  if (!unlocked) {
    leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => sel.value = '');
    leftMnemSlot.querySelectorAll('.mnem-input').forEach(inp => {
      inp.value = '';
      inp.classList.remove('is-error');
    });
  } else {
    leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => {
      const input = leftMnemSlot.querySelector(
        `.mnem-input[data-mnem="${sel.dataset.mnem}"][data-row="${sel.dataset.row}"]`
      );
      refreshMnemInput(sel, input);
    });
    refreshMnemOptions('1');
  }
}

specSelect?.addEventListener('change', updateLeftMnemLock);
updateLeftMnemLock();

// ============ БАЗОВЫЙ И ФАКТИЧЕСКИЙ ОБЗОР ============
const BASE_VIEW = 180;
document.getElementById('base-view').textContent = `${BASE_VIEW} м`;
document.getElementById('actual-view').textContent = `${BASE_VIEW} м`;