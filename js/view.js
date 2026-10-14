// ============================================================
// ОБЗОР — ЛОГИКА
// ============================================================

// ============ СОСТОЯНИЕ ============
const state = {
  lang: 'ru',
  classId: null,
  classView: 1,
  classBB: 0,
  specId: null,
  specView: 1,
  specBB: 0,
  specAmity: false,
  gems1: 0,
  gems2: 0,
  steps3000: false,
  steps6000: false,
  mnemView: [0, 0, 0, 0, 0, 0],
};

const BASE_VIEW = 180;
const VIEW_CAP = 1600;

// ============ ДАННЫЕ ============
let allClasses = [];
let allSpecs = [];
let allFollowers = [];
let allItems = [];

const currentLang = () => localStorage.getItem('orna-lang') || 'ru';

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Не удалось загрузить ${path}:`, e);
    return [];
  }
}

async function loadAllData() {
  state.lang = currentLang();
  const [classes, specs, followers, items] = await Promise.all([
    loadJSON(`../data/classes-${state.lang}.json`),
    loadJSON(`../data/specs-${state.lang}.json`),
    loadJSON(`../data/followers-${state.lang}.json`),
    loadJSON(`../data/items-${state.lang}.json`),
  ]);
  allClasses = classes;
  allSpecs = specs;
  allFollowers = followers;
  allItems = items;

  console.log('📦 Загружено:');
  console.log('   Классы:', allClasses.length);
  console.log('   Специализации:', allSpecs.length);
  console.log('   Питомцы:', allFollowers.length);
  console.log('   Предметы:', allItems.length);
}

// ============ УТИЛИТЫ ============
function parseViewBonus(effects, lang) {
  if (!Array.isArray(effects)) return 1;
  const key = lang === 'ru' ? 'Обзор' : 'View Distance';
  for (const eff of effects) {
    if (typeof eff !== 'string') continue;
    const m = eff.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (m) return 1 + parseFloat(m[1]) / 100;
  }
  return 1;
}

// ============ КЛАССЫ ============
function isRelevantClass(cls) {
  const hasView = parseViewBonus(cls.effects, state.lang) !== 1;
  const hasBB = (cls.bestialBondLevel || 0) > 0;
  return hasView || hasBB;
}

function fillClassSelect() {
  const sel = document.getElementById('class-select');
  if (!sel) return;

  const current = sel.value;

  Array.from(sel.options).forEach(opt => {
    if (opt.value) sel.removeChild(opt);
  });

  if (!sel.querySelector('option[value=""]')) {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— нет —';
    none.dataset.ru = '— нет —';
    none.dataset.en = '— none —';
    sel.insertBefore(none, sel.firstChild);
  }

  allClasses
    .filter(isRelevantClass)
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name))
    .forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `★${c.tier || '?'} ${c.name}`;
      opt.dataset.sprite = c.sprite || '';
      opt.dataset.tier = c.tier || '';
      sel.appendChild(opt);
    });

  if (current) sel.value = current;
}

function updateClassInfo() {
  const sel = document.getElementById('class-select');
  const bonusEl = document.getElementById('class-bonus');
  const iconEl = document.getElementById('class-icon');
  const placeholder = iconEl?.parentElement.querySelector('.class-icon-placeholder');
  if (!sel || !bonusEl) return;

  const cls = allClasses.find(c => String(c.id) === sel.value);
  if (!cls) {
    state.classId = null; state.classView = 1; state.classBB = 0;
    bonusEl.textContent = '—';
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
    updateFollowerLock();
    recalc();
    return;
  }

  state.classId = cls.id;
  state.classView = parseViewBonus(cls.effects, state.lang);
  state.classBB = cls.bestialBondLevel || 0;

  const parts = [];
  if (state.classView !== 1) parts.push(`Обзор ${Math.round((state.classView - 1) * 100)}%`);
  if (state.classBB > 0) parts.push(`Узы ${state.classBB}`);
  bonusEl.textContent = parts.length ? parts.join(' · ') : '—';

  if (cls.sprite && iconEl) {
    iconEl.src = cls.sprite;
    iconEl.hidden = false;
    if (placeholder) placeholder.hidden = true;
  }

  updateFollowerLock();
  recalc();
}

// ============ СПЕЦИАЛИЗАЦИИ ============
function isRelevantSpec(spec) {
  const hasView = (spec.viewMultiplier || 1) !== 1;
  const hasBB = (spec.bestialBondLevel || 0) > 0;
  const hasAmity = !!spec.unlocksSecondAmity;
  return hasView || hasBB || hasAmity;
}

function fillSpecSelect() {
  const sel = document.getElementById('spec-select');
  if (!sel) return;

  const current = sel.value;

  Array.from(sel.options).forEach(opt => {
    if (opt.value) sel.removeChild(opt);
  });

  if (!sel.querySelector('option[value=""]')) {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— нет —';
    none.dataset.ru = '— нет —';
    none.dataset.en = '— none —';
    sel.insertBefore(none, sel.firstChild);
  }

  allSpecs.filter(isRelevantSpec).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sel.appendChild(opt);
  });

  if (current) sel.value = current;
}

function updateSpecInfo() {
  const sel = document.getElementById('spec-select');
  const bonusEl = document.getElementById('spec-bonus');
  const iconEl = document.getElementById('spec-icon');
  const placeholder = iconEl?.parentElement.querySelector('.class-icon-placeholder');
  if (!sel || !bonusEl) return;

  const spec = allSpecs.find(s => s.id === sel.value);
  if (!spec) {
    state.specId = null; state.specView = 1; state.specBB = 0; state.specAmity = false;
    bonusEl.textContent = '—';
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
    updateLeftMnemLock();
    updateFollowerLock();
    recalc();
    return;
  }

  state.specId = spec.id;
  state.specView = spec.viewMultiplier || 1;
  state.specBB = spec.bestialBondLevel || 0;
  state.specAmity = !!spec.unlocksSecondAmity;

  const parts = [];
  if (state.specView !== 1) parts.push(`Обзор ${Math.round((state.specView - 1) * 100)}%`);
  if (state.specBB > 0) parts.push(`Узы ${state.specBB}`);
  if (state.specAmity) parts.push('+Amity');
  bonusEl.textContent = parts.length ? parts.join(' · ') : '—';

  if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
  if (placeholder) placeholder.hidden = false;

  updateLeftMnemLock();
  updateFollowerLock();
  recalc();
}

// ============ МНОЖИТЕЛИ ============
function getFollowerMultiplier() {
  const petBox = document.getElementById('pet-box');
  if (!petBox || !petBox.dataset.mult) return 1;
  return parseFloat(petBox.dataset.mult) || 1;
}

function getMnemViewMultiplier() {
  let m = 1;
  state.mnemView.forEach(v => {
    if (v > 0) m *= (1 + v / 100);
  });
  return m;
}

function getGemsMultiplier() {
  return Math.pow(1.01, state.gems1) * Math.pow(1.02, state.gems2);
}

function getStepsMultiplier() {
  let m = 1;
  if (state.steps3000) m *= 1.1;
  if (state.steps6000) m *= 1.1;
  return m;
}

function getEquipmentMultiplier() {
  let m = 1;
  document.querySelectorAll('.slot[data-item-mult]').forEach(el => {
    m *= parseFloat(el.dataset.itemMult) || 1;
  });
  return m;
}

// ============ ПЕРЕСЧЁТ ============
function recalc() {
  const mult =
    state.classView *
    state.specView *
    getFollowerMultiplier() *
    getMnemViewMultiplier() *
    getGemsMultiplier() *
    getStepsMultiplier() *
    getEquipmentMultiplier();

  const raw = BASE_VIEW * mult;
  const capped = Math.min(raw, VIEW_CAP);
  const isCapped = raw >= VIEW_CAP;

  const actualViewEl = document.getElementById('actual-view');
  const baseViewEl = document.getElementById('base-view');
  const capLabelEl = document.getElementById('view-cap-label');
  const actualLineEl = actualViewEl?.closest('.result-line-actual');

  if (baseViewEl) baseViewEl.textContent = `${BASE_VIEW} м`;
  if (actualViewEl) actualViewEl.textContent = `${Math.floor(capped)} м`;
  if (capLabelEl) capLabelEl.classList.toggle('visible', isCapped);
  if (actualLineEl) actualLineEl.classList.toggle('is-capped', isCapped);
}

// ============================================================
// МНЕМЫ
// ============================================================
const MNEM_VIEW_MIN = 1;
const MNEM_VIEW_MAX = 5;

function getMnemSelects(mnemId) {
  return document.querySelectorAll(`.mnem-select[data-mnem="${mnemId}"]`);
}

function refreshMnemOptions(mnemId) {
  const selects = getMnemSelects(mnemId);
  const chosen = new Set();
  selects.forEach(sel => { if (sel.value) chosen.add(sel.value); });
  selects.forEach(sel => {
    const currentValue = sel.value;
    sel.querySelectorAll('option').forEach(opt => {
      const v = opt.value;
      if (!v) { opt.disabled = false; return; }
      opt.disabled = chosen.has(v) && v !== currentValue;
    });
  });
}

function validateMnemView(inputEl) {
  const v = inputEl.value.trim();
  if (v === '') { inputEl.classList.remove('is-error'); return; }
  const n = Number(v);
  if (Number.isNaN(n) || n < MNEM_VIEW_MIN || n > MNEM_VIEW_MAX || !Number.isInteger(n)) {
    inputEl.classList.add('is-error');
  } else {
    inputEl.classList.remove('is-error');
  }
}

function syncMnemState() {
  const inputs = document.querySelectorAll('.mnem-input');
  state.mnemView = [0, 0, 0, 0, 0, 0];
  inputs.forEach(inp => {
    const mnemId = parseInt(inp.dataset.mnem);
    const rowId = parseInt(inp.dataset.row);
    const idx = (mnemId - 1) * 3 + (rowId - 1);
    state.mnemView[idx] = parseInt(inp.value) || 0;
  });
  recalc();
}

function initMnems() {
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const mnemId = sel.dataset.mnem;
    const rowId = sel.dataset.row;
    const input = document.querySelector(`.mnem-input[data-mnem="${mnemId}"][data-row="${rowId}"]`);

    sel.addEventListener('change', () => {
  refreshMnemOptions(mnemId);
  if (sel.value !== 'view') {
    input.value = '';
    input.classList.remove('is-error');
  }
  syncMnemState();
  updateFollowerLock();   // ← добавить
});

    input.addEventListener('input', () => {
      validateMnemView(input);
      syncMnemState();
    });
  });

  ['1', '2'].forEach(id => refreshMnemOptions(id));
}

function updateLeftMnemLock() {
  const leftMnemSlot = document.querySelector('[data-slot="mnem-1"]');
  if (!leftMnemSlot) return;
  const unlocked = state.specAmity;

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
    syncMnemState();
  }
}

// ============================================================
// ГЕММЫ
// ============================================================
function initGems() {
  const gemInputs = document.querySelectorAll('.gem-count');
  const totalEl = document.getElementById('gems-total-slots');
  const summaryEl = document.getElementById('gems-summary');

  let totalSlots = 0;

  function update() {
    let used = 0;
    gemInputs.forEach(inp => { used += parseInt(inp.value) || 0; });
    const over = used > totalSlots;

    gemInputs.forEach(inp => inp.classList.toggle('is-error', over));

    if (summaryEl) {
      if (totalSlots === 0 && used === 0) {
        summaryEl.textContent = '';
      } else if (over) {
        summaryEl.innerHTML = `<span class="error">Использовано ${used} из ${totalSlots}</span>`;
      } else {
        summaryEl.innerHTML = `<span class="ok">Использовано ${used} из ${totalSlots}</span>`;
      }
    }

    state.gems1 = parseInt(document.getElementById('gem-1')?.value) || 0;
    state.gems2 = parseInt(document.getElementById('gem-2')?.value) || 0;
    recalc();
  }

  gemInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      let v = parseInt(inp.value);
      if (isNaN(v) || v < 0) v = 0;
      inp.value = v;
      update();
    });
    inp.addEventListener('change', update);
  });

  window.setGemsTotalSlots = function(n) {
    totalSlots = n;
    if (totalEl) totalEl.textContent = n;
    update();
  };

  window.setGemsTotalSlots(0);
}

// ============================================================
// ШАГИ
// ============================================================
function initSteps() {
  document.querySelectorAll('.step-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const label = chk.parentElement.textContent.trim();
      if (label.includes('3000')) state.steps3000 = chk.checked;
      if (label.includes('6000')) state.steps6000 = chk.checked;
      recalc();
    });
  });
}

// ============================================================
// ПРЕДМЕТЫ
// ============================================================
function isBanned(item) {
  const BANNED_NAMES = ['Пакт НепоKonqорённых'];
  return BANNED_NAMES.includes(item.name);
}

function getItemSlot(item) {
  const facts = item.facts || [];

  const slotFact = facts.find(f =>
    f.label === 'Слот' || f.label === 'Place' || f.label === 'Slot'
  );
  const typeFact = facts.find(f =>
    f.label === 'Тип' || f.label === 'Type'
  );

  const slot = slotFact?.value || '';
  const type = typeFact?.value || '';

  const hasSockets = facts.some(f =>
    f.label === 'Сокеты' ||
    f.label === 'Adornment Slots' ||
    f.label === 'Sockets'
  );

  const sprite = item.sprite || '';

  // Гемма
  if (/\/(jewels|augments|runes)\//.test(sprite)) return 'adornment';
  if ((slot === 'Оружие' || slot === 'Weapon') && !hasSockets) return 'adornment';

  // Оффхенд
  if (slot === 'Оффхенд' || slot === 'Offhand' || slot === 'Off-hand') return 'offhand';
  if (slot === 'Левая рука' || slot === 'Left Hand' || slot === 'Left-hand') return 'offhand';
  if (slot === 'Вторая рука' || slot === 'Second Hand' || slot === 'Second-hand') return 'offhand';

  // Оффхенды по типу
  const offhandTypes = [
    'Щиты', 'Малые щиты', 'Факелы', 'Книги', 'Тотемы', 'Орбы',
    'Shields', 'Small Shields', 'Torches', 'Books', 'Totems', 'Orbs',
  ];
  if (offhandTypes.some(t => type.includes(t))) return 'offhand';

  // Основные слоты
  if (slot === 'Оружие' || slot === 'Weapon')       return 'weapon';
  if (slot === 'Голова' || slot === 'Head')         return 'head';
  if (slot === 'Торс' || slot === 'Body')           return 'body';
  if (slot === 'Ноги' || slot === 'Legs')           return 'legs';
  if (slot === 'Аксессуар' || slot === 'Accessory') return 'accessory';

  return 'unknown';
}

function isTwoHanded(item) {
  if (!item) return false;
  if (Array.isArray(item.tags)) {
    if (item.tags.some(t => /Двуручное|Two[\s-]?Handed|Two handed/i.test(t))) {
      return true;
    }
  }
  return false;
}

function isViewItem(item) {
  if (!Array.isArray(item.effects)) return false;
  return item.effects.some(e =>
    typeof e === 'string' && /Обзор|View Distance/i.test(e)
  );
}

function getItemViewMultiplier(item) {
  if (!Array.isArray(item.effects)) return 1;
  const key = state.lang === 'ru' ? 'Обзор' : 'View Distance';
  for (const eff of item.effects) {
    if (typeof eff !== 'string') continue;
    const m = eff.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (m) return 1 + parseFloat(m[1]) / 100;
  }
  return 1;
}

const equipmentSlots = {
  'weapon-1':    { allowed: ['weapon'] },
  'weapon-2':    { allowed: ['weapon', 'offhand'] },
  'head':        { allowed: ['head'] },
  'body':        { allowed: ['body'] },
  'legs':        { allowed: ['legs'] },
  'accessory-1': { allowed: ['accessory'] },
  'accessory-2': { allowed: ['accessory'] },
};

function getSlotAllowed(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  const conf = equipmentSlots[slotKey];
  if (!conf) return [];

  if (slotKey === 'weapon-2') {
    const toggle = slotEl?.querySelector('.slot-mode-toggle');
    const mode = toggle?.dataset.mode || 'weapon';
    return mode === 'offhand' ? ['offhand'] : ['weapon'];
  }

  return conf.allowed;
}

function openSlotPicker(slotKey) {
  const allowed = getSlotAllowed(slotKey);
  const items = allItems
    .filter(it =>
      isViewItem(it) &&
      !isBanned(it) &&
      allowed.includes(getItemSlot(it))
    )
    .filter(it => {
      // Двуручное нельзя во вторую руку
      if (slotKey === 'weapon-2' && isTwoHanded(it)) return false;
      return true;
    })
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  Modal.open({
    title: 'Выбор предмета',
    items,
    onPick: (item) => applyItemToSlot(slotKey, item),
    onClear: () => clearSlot(slotKey),
  });
}

function applyItemToSlot(slotKey, item) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  if (!slotEl) return;

  const wrapper = slotEl.closest('.slot-wrapper');
  const img = slotEl.querySelector('.slot-icon-img');
  const nameEl = wrapper?.querySelector('.slot-name') || slotEl.querySelector('.slot-name');
  const statsEl = wrapper?.querySelector('.slot-stats') || slotEl.querySelector('.slot-stats');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img && item.sprite) { img.src = item.sprite; img.hidden = false; }
  if (nameEl) nameEl.textContent = item.name;

  if (statsEl) {
    const mult = getItemViewMultiplier(item);
    if (mult !== 1) {
      const lang = currentLang();
      const label = lang === 'ru' ? 'Обзор' : 'View Distance';
      statsEl.textContent = `${label} ${Math.round((mult - 1) * 100)}%`;
    } else {
      statsEl.textContent = '';
    }
  }

  slotEl.dataset.itemId = item.id;
  slotEl.dataset.itemMult = String(getItemViewMultiplier(item));
  slotEl.classList.add('has-item');

  const itemSlot = getItemSlot(item);
  const isWeapon = itemSlot === 'weapon';

  if (isWeapon && qualitySel) {
    qualitySel.hidden = false;
    // Пересчитываем сокеты сразу после установки оружия
    updateSlotQuality(slotKey);
  } else if (qualitySel) {
    qualitySel.hidden = true;
    delete slotEl.dataset.sockets;
    updateTotalGemsSlots();
  }

  ensureResetButton(slotEl);
  updateTwoHandedLock(slotKey, item);
  recalc();
}

function updateTwoHandedLock(slotKey, item) {
  // Работает только для оружейных слотов
  if (slotKey !== 'weapon-1' && slotKey !== 'weapon-2') return;

  const otherKey = slotKey === 'weapon-1' ? 'weapon-2' : 'weapon-1';
  const otherSlot = document.querySelector(`[data-slot="${otherKey}"]`);
  if (!otherSlot) return;

  if (isTwoHanded(item)) {
    // Двуручное — очищаем и блокируем вторую руку
    clearSlot(otherKey);
    otherSlot.classList.add('is-locked');

    // Прячем переключатель ⚔/🛡 у weapon-2
    if (otherKey === 'weapon-2') {
      const toggle = otherSlot.querySelector('.slot-mode-toggle');
      if (toggle) toggle.style.display = 'none';
    }
  } else {
    // Одноручное — разблокируем
    otherSlot.classList.remove('is-locked');

    if (otherKey === 'weapon-2') {
      const toggle = otherSlot.querySelector('.slot-mode-toggle');
      if (toggle) toggle.style.display = '';
    }
  }
}

function ensureResetButton(slotEl) {
  if (slotEl.querySelector('.slot-reset')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'slot-reset';
  btn.textContent = '×';
  btn.title = 'Очистить';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSlot(slotEl.dataset.slot);
  });
  slotEl.appendChild(btn);
}

function clearSlot(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  if (!slotEl) return;

  const wrapper = slotEl.closest('.slot-wrapper');
  const img = slotEl.querySelector('.slot-icon-img');
  const nameEl = wrapper?.querySelector('.slot-name') || slotEl.querySelector('.slot-name');
  const statsEl = wrapper?.querySelector('.slot-stats') || slotEl.querySelector('.slot-stats');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img) { img.hidden = true; img.removeAttribute('src'); }
  if (nameEl) {
    if (slotKey === 'weapon-2') {
      const toggle = slotEl.querySelector('.slot-mode-toggle');
      const mode = toggle?.dataset.mode || 'weapon';
      nameEl.textContent = mode === 'offhand' ? 'Оффхенд' : 'Пусто';
    } else {
      const lang = currentLang();
      nameEl.textContent = nameEl.dataset[lang] || nameEl.dataset.ru || 'Пусто';
    }
  }
  if (statsEl) statsEl.textContent = '';
  if (qualitySel) qualitySel.hidden = true;

  slotEl.classList.remove('has-item');
  delete slotEl.dataset.itemId;
  delete slotEl.dataset.itemMult;
  delete slotEl.dataset.sockets;

  slotEl.style.backgroundImage = '';
slotEl.style.backgroundBlendMode = '';

// Если очистили оружие — разблокируем вторую руку
if (slotKey === 'weapon-1' || slotKey === 'weapon-2') {
  const otherKey = slotKey === 'weapon-1' ? 'weapon-2' : 'weapon-1';
  const otherSlot = document.querySelector(`[data-slot="${otherKey}"]`);
  if (otherSlot) {
    otherSlot.classList.remove('is-locked');
    if (otherKey === 'weapon-2') {
      const toggle = otherSlot.querySelector('.slot-mode-toggle');
      if (toggle) toggle.style.display = '';
    }
  }
}

updateTotalGemsSlots();
recalc();
}

// ============ КАЧЕСТВО ОРУЖИЯ ============
const QUALITY_SOCKET_BONUS = {
  common: 0,
  superior: 1,
  famed: 1,
  legendary: 1,
  ornate: 2,
  masterforged: 3,
  demonforged: 3,
  godforged: 4,
  atonement: 4,
};

const QUALITY_BG = {
  common:       '',
  superior:     'https://playorna.com/static/img/fx/rare.png',
  famed:        'https://playorna.com/static/img/fx/famed.png',
  legendary:    'https://playorna.com/static/img/fx/legendary.png',
  ornate:       'https://playorna.com/static/img/fx/ornate.png',
  masterforged: 'https://playorna.com/static/img/fx/masterforged.png',
  demonforged:  'https://playorna.com/static/img/fx/demonforged.png',
  godforged:    'https://playorna.com/static/img/fx/godforged.png',
  atonement:    'https://playorna.com/static/img/fx/ornate.png',
};

function updateSlotQuality(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  const qualitySel = slotEl?.querySelector('.slot-quality');
  if (!qualitySel) return;

  const quality = qualitySel.value;
  const bonus = QUALITY_SOCKET_BONUS[quality] || 0;
  const bg = QUALITY_BG[quality] || '';

  qualitySel.dataset.quality = quality;

  if (bg) {
    slotEl.style.backgroundImage = `url('${bg}')`;
    slotEl.style.backgroundSize = 'cover';
    slotEl.style.backgroundPosition = 'center';
    slotEl.style.backgroundBlendMode = 'normal';
  } else {
    slotEl.style.backgroundImage = '';
    slotEl.style.backgroundBlendMode = '';
  }

  const itemId = slotEl.dataset.itemId;
  const item = allItems.find(i => i.id === itemId);
  const socketsFact = item?.facts?.find(f =>
  f.label === 'Сокеты' ||
  f.label === 'Adornment Slots' ||
  f.label === 'Sockets'
);
const baseSockets = parseInt(socketsFact?.value) || 0;
  const total = baseSockets + bonus;

  slotEl.dataset.sockets = String(total);
  updateTotalGemsSlots();
}

function updateTotalGemsSlots() {
  let total = 0;
  document.querySelectorAll('.slot[data-sockets]').forEach(el => {
    total += parseInt(el.dataset.sockets) || 0;
  });
  if (window.setGemsTotalSlots) window.setGemsTotalSlots(total);
}

function initEquipmentSlots() {
  document.querySelectorAll('.slot-wrapper').forEach(wrapper => {
    if (wrapper.dataset.bound === '1') return;
    wrapper.dataset.bound = '1';

    wrapper.addEventListener('click', (e) => {
      const slotEl = wrapper.querySelector('.slot');
      if (!slotEl) return;
      if (e.target.closest('.slot-mode-toggle')) return;
      if (e.target.closest('.slot-quality')) return;
      if (e.target.closest('.slot-reset')) return;
      if (slotEl.classList.contains('is-locked')) return;
      openSlotPicker(slotEl.dataset.slot);
    });
  });

  document.querySelectorAll('.slot-quality').forEach(sel => {
    if (sel.dataset.bound === '1') return;
    sel.dataset.bound = '1';
    sel.addEventListener('change', () => updateSlotQuality(sel.dataset.slot));
  });
}

// ============================================================
// ПИТОМЕЦ
// ============================================================
function getFollowerViewFromLevels(follower, bbLevel) {
  if (bbLevel <= 0) return 1;

  const sections = follower.sections || [];
  const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
  if (!bbSection || !Array.isArray(bbSection.texts)) return 1;

  let m = 1;
  for (let lvl = 1; lvl <= bbLevel; lvl++) {
    const line = bbSection.texts.find(t =>
      new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
    );
    if (!line) continue;
    const key = state.lang === 'ru' ? 'Обзор' : 'View Distance';
    const match = line.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (match) m *= 1 + parseFloat(match[1]) / 100;
  }
  return m;
}

function getFollowerViewPercentForLevel(follower, level) {
  const sections = follower.sections || [];
  const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
  if (!bbSection || !Array.isArray(bbSection.texts)) return 0;

  const line = bbSection.texts.find(t =>
    new RegExp(`^Уровень\\s*${level}|^Level\\s*${level}`, 'i').test(t)
  );
  if (!line) return 0;

  const key = state.lang === 'ru' ? 'Обзор' : 'View Distance';
  const match = line.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
  return match ? parseFloat(match[1]) : 0;
}

function getMnemBondsLevel() {
  // Ищем максимальный уровень узов среди всех мнемов.
  // У мнема с «Узами» уровень = 1.
  let max = 0;
  document.querySelectorAll('.mnem-select').forEach(sel => {
    if (sel.value === 'bonds') max = Math.max(max, 1);
  });
  return max;
}

function getAvailableBB() {
  const fromClass = state.classBB || 0;
  const fromSpec = state.specBB || 0;
  const fromMnems = getMnemBondsLevel();
  return Math.min(3, Math.max(fromClass, fromSpec, fromMnems));
}

function openFollowerPicker() {
  const availableBB = getAvailableBB();
  if (availableBB === 0) return;

  const pets = allFollowers
    .filter(f => {
      const sections = f.sections || [];
      const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
      if (!bbSection?.texts) return false;
      const key = state.lang === 'ru' ? 'Обзор' : 'View Distance';
      return bbSection.texts.some(t => new RegExp(key, 'i').test(t));
    })
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: 'Пусто', sprite: '', tier: null, effects: [] },
    ...pets,
  ];

  Modal.open({
    title: `Питомец (доступно BB${availableBB})`,
    items: itemsWithEmpty,
    onPick: (follower) => {
      if (follower.id === '__empty__') clearFollower();
      else applyFollower(follower, availableBB);
    },
    onClear: () => clearFollower(),
  });
}

function applyFollower(follower, bbLevel) {
  const petBox = document.getElementById('pet-box');
  const petImg = document.getElementById('pet-image');
  const petPlaceholder = document.getElementById('pet-placeholder');
  const petName = document.getElementById('pet-name');
  const petBonus = document.getElementById('pet-bonus');
  if (!petBox) return;

  const mult = getFollowerViewFromLevels(follower, bbLevel);

  if (follower.sprite && petImg) {
    petImg.src = follower.sprite;
    petImg.hidden = false;
    if (petPlaceholder) petPlaceholder.hidden = true;
  }

  if (petName) {
    petName.textContent = follower.name;
    petName.hidden = false;
  }

  if (petBonus) {
    const lines = [];
    for (let lvl = 1; lvl <= bbLevel; lvl++) {
      const pct = getFollowerViewPercentForLevel(follower, lvl);
    if (pct > 0) lines.push(`${lvl}:  ${pct}%`);
    }
    if (lines.length) {
      petBonus.innerHTML = lines.join('<br>');
      petBonus.hidden = false;
    } else {
      petBonus.hidden = true;
    }
  }

  petBox.dataset.mult = String(mult);
  petBox.dataset.followerId = follower.id;
  petBox.dataset.bbLevel = String(bbLevel);
  petBox.classList.add('has-pet');

  ensurePetReset(petBox);
  recalc();
}

function ensurePetReset(petBox) {
  if (petBox.querySelector('.pet-reset')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'pet-reset';
  btn.textContent = '×';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFollower();
  });
  petBox.appendChild(btn);
}

function clearFollower() {
  const petBox = document.getElementById('pet-box');
  const petImg = document.getElementById('pet-image');
  const petPlaceholder = document.getElementById('pet-placeholder');
  const petName = document.getElementById('pet-name');
  const petBonus = document.getElementById('pet-bonus');
  if (!petBox) return;

  if (petImg) { petImg.hidden = true; petImg.removeAttribute('src'); }
  if (petPlaceholder) {
    petPlaceholder.hidden = false;
    petPlaceholder.textContent = '+';
  }
  if (petName) { petName.textContent = ''; petName.hidden = true; }
  if (petBonus) { petBonus.textContent = ''; petBonus.hidden = true; }

  petBox.classList.remove('has-pet');
  delete petBox.dataset.mult;
  delete petBox.dataset.followerId;
  delete petBox.dataset.bbLevel;

  const resetBtn = petBox.querySelector('.pet-reset');
  if (resetBtn) resetBtn.remove();

  recalc();
}

function updateFollowerLock() {
  const petBox = document.getElementById('pet-box');
  if (!petBox) return;

  const availableBB = getAvailableBB();
  const caption = petBox.querySelector('.pet-caption');

  // Если питомец выбран, но его BB больше доступного — пересчитать
  if (petBox.dataset.followerId) {
    const savedBB = parseInt(petBox.dataset.bbLevel) || 0;
    if (savedBB > availableBB) {
      if (availableBB === 0) {
        clearFollower();
      } else {
        // Пересчитываем питомца с новым BB
        const follower = allFollowers.find(f => f.id === petBox.dataset.followerId);
        if (follower) applyFollower(follower, availableBB);
      }
    }
  }

  if (availableBB === 0) {
    petBox.classList.add('pet-locked');
    if (petBox.dataset.followerId) clearFollower();
    if (caption) {
      const lang = currentLang();
      caption.textContent = lang === 'ru' ? 'Питомец (нужны узы)' : 'Follower (bonds needed)';
    }
  } else {
    petBox.classList.remove('pet-locked');
    if (caption) {
      const lang = currentLang();
      caption.textContent = lang === 'ru' ? 'Питомец' : 'Follower';
    }
  }
}

function initFollower() {
  const petBox = document.getElementById('pet-box');
  if (!petBox) return;
  petBox.addEventListener('click', () => {
    if (petBox.classList.contains('pet-locked')) return;
    openFollowerPicker();
  });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initViewPage() {
  await loadAllData();

  fillClassSelect();
  fillSpecSelect();
  initMnems();
  initGems();
  initSteps();
  initEquipmentSlots();
  initFollower();

  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');
  classSel?.addEventListener('change', updateClassInfo);
  specSel?.addEventListener('change', updateSpecInfo);

  updateClassInfo();
  updateSpecInfo();
  recalc();
}

initViewPage();

window.addEventListener('orna-lang-changed', async () => {
  // 1. СОХРАНЯЕМ текущее состояние всех слотов
  const savedState = {
    classId: state.classId,
    specId: state.specId,
    followerId: null,
    slots: {},
  };

  // Класс / спец
  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');
  if (classSel) savedState.classId = classSel.value;
  if (specSel) savedState.specId = specSel.value;

  // Питомец
  const petBox = document.getElementById('pet-box');
  if (petBox?.dataset.followerId) {
    savedState.followerId = petBox.dataset.followerId;
    savedState.followerBB = parseInt(petBox.dataset.bbLevel) || 0;
  }

  // Слоты (кроме мнемов)
  document.querySelectorAll('.slot[data-slot]').forEach(slotEl => {
    const key = slotEl.dataset.slot;
    if (key === 'mnem-1' || key === 'mnem-2') return;
    if (!slotEl.dataset.itemId) return;

    savedState.slots[key] = {
      itemId: slotEl.dataset.itemId,
      quality: slotEl.querySelector('.slot-quality')?.value || 'common',
      mode: slotEl.querySelector('.slot-mode-toggle')?.dataset.mode || null,
    };
  });

  // Мнемы
  const mnemState = [];
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const input = document.querySelector(
      `.mnem-input[data-mnem="${sel.dataset.mnem}"][data-row="${sel.dataset.row}"]`
    );
    mnemState.push({
      mnemId: sel.dataset.mnem,
      rowId: sel.dataset.row,
      value: sel.value,
      num: input?.value || '',
    });
  });

  // 2. ПЕРЕЗАГРУЖАЕМ данные на новом языке
  await loadAllData();

  // 3. ОБНОВЛЯЕМ пустые опции
  document.querySelectorAll('select option[value=""]').forEach(opt => {
    const lang = currentLang();
    opt.textContent = opt.dataset[lang] || opt.dataset.ru || opt.textContent;
  });

  fillClassSelect();
  fillSpecSelect();

  // 4. ВОССТАНАВЛИВАЕМ класс / спец по id
  if (classSel && savedState.classId) {
    classSel.value = savedState.classId;
    updateClassInfo();
  }
  if (specSel && savedState.specId) {
    specSel.value = savedState.specId;
    updateSpecInfo();
  }

  // 5. ВОССТАНАВЛИВАЕМ слоты
  for (const [slotKey, data] of Object.entries(savedState.slots)) {
    const item = allItems.find(i => i.id === data.itemId);
    if (!item) continue;

    // Восстанавливаем режим weapon/offhand
    if (data.mode) {
      const toggle = document.querySelector(`[data-slot="${slotKey}"] .slot-mode-toggle`);
      if (toggle) {
        toggle.dataset.mode = data.mode;
        toggle.querySelectorAll('.mode-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.mode === data.mode)
        );
      }
    }

    // Применяем предмет
    applyItemToSlot(slotKey, item);

    // Восстанавливаем качество
    const qualitySel = document.querySelector(`[data-slot="${slotKey}"] .slot-quality`);
    if (qualitySel && data.quality) {
      qualitySel.value = data.quality;
      updateSlotQuality(slotKey);
    }
  }

  // 6. ВОССТАНАВЛИВАЕМ питомца
  if (savedState.followerId) {
    const follower = allFollowers.find(f => f.id === savedState.followerId);
    if (follower) {
      applyFollower(follower, savedState.followerBB);
    }
  }

  // 7. ВОССТАНАВЛИВАЕМ мнемы
  mnemState.forEach(m => {
    const sel = document.querySelector(
      `.mnem-select[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    const input = document.querySelector(
      `.mnem-input[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    if (sel && m.value) sel.value = m.value;
    if (input && m.num) input.value = m.num;
  });

  // Обновляем блокировку мнемов и питомца
  updateLeftMnemLock();
  updateFollowerLock();

  // Пересчитываем
  ['1', '2'].forEach(id => refreshMnemOptions(id));
  syncMnemState();
  recalc();
});

// ============ СЛУШАТЕЛЬ СБРОСА СЛОТА ============
// Срабатывает, когда shared.js вызвал resetSlot (например, при смене ⚔/🛡).
// view.js сам решает, что пересчитать.
window.addEventListener('orna-slot-cleared', (e) => {
  const slotEl = e.detail.slot;
  if (slotEl) {
    delete slotEl.dataset.sockets;
  }
  updateTotalGemsSlots();
  recalc();
});