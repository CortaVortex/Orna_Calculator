// ============================================================
// ОБЗОР — ЛОГИКА (UI)
// ============================================================

import {
  BASE_VIEW, VIEW_CAP,
  parseViewBonus, getItemViewMultiplier, isViewItem,
  getBBLevels, hasViewBonus, getFollowerViewMultiplier, getAvailableBB as calcAvailableBB,
  isRelevantViewClass, isRelevantViewSpec,
  MNEM_VIEW_MIN, MNEM_VIEW_MAX, getMnemViewMultiplier,
  getViewGemsFromItems, getGemsMultiplier,
  getStepsMultiplier,
  isItemAllowedInSlot, getItemSlot, isTwoHanded, isBannedView,
  calculateView, getEquipmentViewMultiplier,
  getDynamicViewConsumables,
} from './view-calc.js';

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
  brazier: false,
  mnemView: [0, 0, 0, 0, 0, 0],
  consumablesMult: 1,
};

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

// ============ КЛАССЫ ============
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
    .filter(c => isRelevantViewClass(c, state.lang))
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

  allSpecs.filter(isRelevantViewSpec).forEach(s => {
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

// ============ ПЕРЕСЧЁТ ============
function recalc() {
  // 1. Экипировка — собираем предметы из слотов
  const equipment = [];
  document.querySelectorAll('.slot[data-slot]').forEach(slotEl => {
    const key = slotEl.dataset.slot;
    if (key === 'mnem-1' || key === 'mnem-2') return;
    if (!slotEl.dataset.itemId) return;

    const item = allItems.find(i => String(i.id) === String(slotEl.dataset.itemId));
    if (!item) return;
    equipment.push({ slotKey: key, item });
  });

  // 2. Питомец
  const petBox = document.getElementById('pet-box');
  const followerMult = parseFloat(petBox?.dataset.mult) || 1;

  // 3. Считаем
  const result = calculateView({
    classView: state.classView,
    specView: state.specView,
    followerMult,
    mnemView: state.mnemView,
    gemsMult: state.gemsMultiplier || 1,
    stepsMult: getStepsMultiplier({
      steps3000: state.steps3000,
      steps6000: state.steps6000,
    }) * (state.brazier ? 1.2 : 1),
    equipmentMult: getEquipmentViewMultiplier(equipment, state.lang),
    consumablesMult: state.consumablesMult || 1,
  });

  // 4. Вывод
  const actualViewEl = document.getElementById('actual-view');
  const baseViewEl = document.getElementById('base-view');
  const capLabelEl = document.getElementById('view-cap-label');
  const actualLineEl = actualViewEl?.closest('.result-line-actual');

  if (baseViewEl) baseViewEl.textContent = `${result.base} м`;
  if (actualViewEl) actualViewEl.textContent = `${Math.floor(result.capped)} м`;
  if (capLabelEl) capLabelEl.classList.toggle('visible', result.isCapped);
  if (actualLineEl) actualLineEl.classList.toggle('is-capped', result.isCapped);
}

// ============================================================
// МНЕМЫ
// ============================================================
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
      updateFollowerLock();
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
let gemItems = [];

function initGems() {
  const listEl = document.getElementById('gems-list');
  const totalEl = document.getElementById('gems-total-slots');
  const summaryEl = document.getElementById('gems-summary');

  if (!listEl) return;

  gemItems = getViewGemsFromItems(allItems, state.lang);

  if (!gemItems.length) {
    listEl.innerHTML = '<div class="gems-empty">Нет гемм с обзором</div>';
    return;
  }

  const lang = currentLang();

  listEl.innerHTML = gemItems.map(gem => {
    const name = lang === 'ru'
      ? (gem.name || gem.nameEn || '—')
      : (gem.nameEn || gem.name || '—');

    return `
      <div class="gem-row">
        <img class="gem-icon" src="${gem.icon}" alt="" onerror="this.style.display='none'">
        <span class="gem-name">${name}</span>
        <span class="gem-percent">+${gem.percent}%</span>
        <input type="number" class="gem-count" data-gem-id="${gem.id}" min="0" max="99" value="0" placeholder="0">
      </div>
    `;
  }).join('');

  let totalSlots = 0;

  function update() {
    let used = 0;
    const gemCounts = {};

    listEl.querySelectorAll('.gem-count').forEach(inp => {
      const count = parseInt(inp.value) || 0;
      used += count;

      const gemId = inp.dataset.gemId;
      if (gemId && count > 0) gemCounts[gemId] = count;
    });

    const over = used > totalSlots;

    listEl.querySelectorAll('.gem-count').forEach(inp => {
      inp.classList.toggle('is-error', over);
    });

    if (summaryEl) {
      if (totalSlots === 0 && used === 0) {
        summaryEl.textContent = '';
      } else if (over) {
        summaryEl.innerHTML = `<span class="error">Использовано ${used} из ${totalSlots}</span>`;
      } else {
        summaryEl.innerHTML = `<span class="ok">Использовано ${used} из ${totalSlots}</span>`;
      }
    }

    state.gemsMultiplier = getGemsMultiplier(gemCounts, gemItems);
    recalc();
  }

  listEl.querySelectorAll('.gem-count').forEach(inp => {
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
// ШАГИ + ЖАРОВНЯ
// ============================================================
function initSteps() {
  document.querySelectorAll('.step-check').forEach(chk => {
    chk.addEventListener('change', () => {
      if (chk.classList.contains('brazier-check')) {
        state.brazier = chk.checked;
        recalc();
        return;
      }

      const label = chk.parentElement.textContent.trim();
      if (label.includes('3000')) state.steps3000 = chk.checked;
      if (label.includes('6000')) state.steps6000 = chk.checked;
      recalc();
    });
  });
}

// ============================================================
// РАСХОДНИКИ
// ============================================================
const SPELUNKER_TORCHES = [
  {
    id: 'spelunker-emerald',
    name: 'Изумрудный факел',
    nameEn: 'Emerald Spelunking Torch',
    effect: 'Обзор +20% · События +25%',
    effectEn: 'View +20% · Events +25%',
    viewPercent: 20,
    icon: 'https://playorna.com/static/img/useables/spelunkers_torch2.png',
  },
  {
    id: 'spelunker-azure',
    name: 'Лазурный факел',
    nameEn: 'Azure Spelunking Torch',
    effect: 'Обзор +20% · Орда +25%',
    effectEn: 'View +20% · Horde +25%',
    viewPercent: 20,
    icon: 'https://playorna.com/static/img/useables/spelunkers_torch3.png',
  },
  {
    id: 'spelunker-crimson',
    name: 'Багровый факел',
    nameEn: 'Crimson Spelunking Torch',
    effect: 'Обзор +20% · Награды +25%',
    effectEn: 'View +20% · Rewards +25%',
    viewPercent: 20,
    icon: 'https://playorna.com/static/img/useables/spelunkers_torch4.png',
  },
];

function renderConsumablesGrid(gridEl, items, prefix) {
  if (!gridEl) return;

  if (!items.length) {
    gridEl.innerHTML = '<div class="consumables-empty">—</div>';
    return;
  }

  const lang = currentLang();

  gridEl.innerHTML = items.map(item => {
    const iconHtml = item.icon
      ? `<img class="consumable-icon" src="${item.icon}" alt="" onerror="this.style.display='none'">`
      : '<span class="consumable-icon consumable-icon-empty">✦</span>';

    return `
      <label class="consumable-item">
        <input type="checkbox" data-consumable-id="${item.id}" data-consumable-group="${prefix}">
        ${iconHtml}
        <div class="consumable-info">
          <div class="consumable-name">${lang === 'ru' ? item.name : (item.nameEn || item.name)}</div>
          <div class="consumable-effect">${lang === 'ru' ? item.effect : (item.effectEn || item.effect)}</div>
        </div>
      </label>
    `;
  }).join('');

  gridEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => recalcConsumables());
  });
}

function initConsumables() {
  const spelunkerGrid = document.getElementById('spelunker-grid');
  renderConsumablesGrid(spelunkerGrid, SPELUNKER_TORCHES, 'spelunker');

  const dynamicGrid = document.getElementById('consumables-grid');
  renderConsumablesGrid(dynamicGrid, getDynamicViewConsumables(allItems, state.lang), 'dynamic');
}

function recalcConsumables() {
  let multiplier = 1;

  document.querySelectorAll('.consumables-grid input[type="checkbox"]:checked').forEach(chk => {
    const id = chk.dataset.consumableId;
    const group = chk.dataset.consumableGroup;

    let item = null;
    if (group === 'spelunker') {
      item = SPELUNKER_TORCHES.find(i => i.id === id);
    } else {
      item = getDynamicViewConsumables(allItems, state.lang).find(i => i.id === id);
    }
    if (!item) return;

    let pct = item.viewPercent;
    if (pct == null && item.effect) {
      const m = item.effect.match(/\+?(\d+(?:\.\d+)?)%/);
      if (m) pct = parseFloat(m[1]);
    }
    if (pct) multiplier *= 1 + pct / 100;
  });

  state.consumablesMult = multiplier;
  recalc();
}

// ============================================================
// ПРЕДМЕТЫ
// ============================================================
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
      !isBannedView(it) &&
      allowed.includes(getItemSlot(it))
    )
    .filter(it => {
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
    const mult = getItemViewMultiplier(item, state.lang);
    if (mult !== 1) {
      const lang = currentLang();
      const label = lang === 'ru' ? 'Обзор' : 'View Distance';
      statsEl.textContent = `${label} ${Math.round((mult - 1) * 100)}%`;
    } else {
      statsEl.textContent = '';
    }
  }

  slotEl.dataset.itemId = item.id;
  slotEl.dataset.itemMult = String(getItemViewMultiplier(item, state.lang));
  slotEl.classList.add('has-item');

  const itemSlot = getItemSlot(item);
  const isWeapon = itemSlot === 'weapon';

  if (isWeapon && qualitySel) {
    qualitySel.hidden = false;
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
  if (slotKey !== 'weapon-1' && slotKey !== 'weapon-2') return;

  const otherKey = slotKey === 'weapon-1' ? 'weapon-2' : 'weapon-1';
  const otherSlot = document.querySelector(`[data-slot="${otherKey}"]`);
  if (!otherSlot) return;

  if (isTwoHanded(item)) {
    clearSlot(otherKey);
    otherSlot.classList.add('is-locked');

    if (otherKey === 'weapon-2') {
      const toggle = otherSlot.querySelector('.slot-mode-toggle');
      if (toggle) toggle.style.display = 'none';
    }
  } else {
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
  delete slotEl.dataset.atonement;

  slotEl.style.backgroundImage = '';
  slotEl.style.backgroundBlendMode = '';

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
  const item = allItems.find(i => String(i.id) === String(itemId));
  const socketsFact = item?.facts?.find(f =>
    f.label === 'Сокеты' ||
    f.label === 'Adornment Slots' ||
    f.label === 'Sockets'
  );
  const baseSockets = parseInt(socketsFact?.value) || 0;
  const total = baseSockets + bonus;

  slotEl.dataset.sockets = String(total);

  if (quality === 'atonement') {
    slotEl.dataset.atonement = '1';
  } else {
    delete slotEl.dataset.atonement;
  }

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
function getMnemBondsLevel() {
  let max = 0;
  document.querySelectorAll('.mnem-select').forEach(sel => {
    if (sel.value === 'bonds') max = Math.max(max, 1);
  });
  return max;
}

function getAvailableBBLocal() {
  return calcAvailableBB({
    classBB: state.classBB || 0,
    specBB: state.specBB || 0,
    mnemBonds: getMnemBondsLevel(),
  });
}

function formatFollowerMeta(follower) {
  if (!follower) return '';

  const lang = currentLang();
  const label = lang === 'ru' ? 'Обзор' : 'View';

  const lines = [];

  for (let lvl = 1; lvl <= 3; lvl++) {
    const line = getBBLevels(follower).find(t =>
      new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
    );
    if (!line) continue;

    const key = lang === 'ru' ? 'Обзор' : 'View Distance';
    const m = line.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (!m) continue;

    lines.push(`BB${lvl}: ${label} +${m[1]}%`);
  }

  return lines.join(' · ');
}

function openFollowerPicker() {
  const availableBB = getAvailableBBLocal();
  if (availableBB === 0) return;

  const pets = allFollowers
    .filter(f => hasViewBonus(f, state.lang))
    .filter(f => !isBannedView(f))
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: 'Пусто', sprite: '', tier: null, effects: [] },
    ...pets,
  ];

  Modal.open({
    title: `Питомец (доступно BB${availableBB})`,
    items: itemsWithEmpty,
    metaFormatter: (it) => {
      if (it.id === '__empty__') return '';
      return formatFollowerMeta(it);
    },
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

  const { multiplier, perLevel } = getFollowerViewMultiplier(follower, bbLevel, state.lang);

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
      const pct = perLevel[lvl - 1] || 0;
      if (pct > 0) lines.push(`${lvl}:  ${pct}%`);
    }
    if (lines.length) {
      petBonus.innerHTML = lines.join('<br>');
      petBonus.hidden = false;
    } else {
      petBonus.hidden = true;
    }
  }

  petBox.dataset.mult = String(multiplier);
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

  const availableBB = getAvailableBBLocal();
  const caption = petBox.querySelector('.pet-caption');

  if (petBox.dataset.followerId) {
    const savedBB = parseInt(petBox.dataset.bbLevel) || 0;
    if (savedBB > availableBB) {
      if (availableBB === 0) {
        clearFollower();
      } else {
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
  initConsumables();
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

// ============ СМЕНА ЯЗЫКА ============
  const savedState = {
    classId: state.classId,
    specId: state.specId,
    followerId: null,
    slots: {},
    gems: {},
    brazier: state.brazier,
    steps3000: state.steps3000,
    steps6000: state.steps6000,
    consumables: [],   // ← чекбоксы расходников
  };

  // Сохраняем чекбоксы расходников (копатели + парсерные)
  document.querySelectorAll('.consumables-grid input[type="checkbox"]:checked').forEach(chk => {
    savedState.consumables.push({
      id: chk.dataset.consumableId,
      group: chk.dataset.consumableGroup,
    });
  });

  document.querySelectorAll('#gems-list .gem-count').forEach(inp => {
    const gemId = inp.dataset.gemId;
    if (gemId) savedState.gems[gemId] = inp.value;
  });

  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');
  if (classSel) savedState.classId = classSel.value;
  if (specSel) savedState.specId = specSel.value;

  const petBox = document.getElementById('pet-box');
  if (petBox?.dataset.followerId) {
    savedState.followerId = petBox.dataset.followerId;
    savedState.followerBB = parseInt(petBox.dataset.bbLevel) || 0;
  }

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

  await loadAllData();

  document.querySelectorAll('select option[value=""]').forEach(opt => {
    const lang = currentLang();
    opt.textContent = opt.dataset[lang] || opt.dataset.ru || opt.textContent;
  });

  fillClassSelect();
  fillSpecSelect();

  if (classSel && savedState.classId) {
    classSel.value = savedState.classId;
    updateClassInfo();
  }
  if (specSel && savedState.specId) {
    specSel.value = savedState.specId;
    updateSpecInfo();
  }

  for (const [slotKey, data] of Object.entries(savedState.slots)) {
    const item = allItems.find(i => String(i.id) === String(data.itemId));
    if (!item) continue;

    if (data.mode) {
      const toggle = document.querySelector(`[data-slot="${slotKey}"] .slot-mode-toggle`);
      if (toggle) {
        toggle.dataset.mode = data.mode;
        toggle.querySelectorAll('.mode-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.mode === data.mode)
        );
      }
    }

    applyItemToSlot(slotKey, item);

    const qualitySel = document.querySelector(`[data-slot="${slotKey}"] .slot-quality`);
    if (qualitySel && data.quality) {
      qualitySel.value = data.quality;
      updateSlotQuality(slotKey);
    }
  }

  if (savedState.followerId) {
    const follower = allFollowers.find(f => f.id === savedState.followerId);
    if (follower) {
      applyFollower(follower, savedState.followerBB);
    }
  }

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

  updateLeftMnemLock();
  updateFollowerLock();

  ['1', '2'].forEach(id => refreshMnemOptions(id));
  syncMnemState();
  initConsumables();
  recalcConsumables();
  initGems();

  document.querySelectorAll('#gems-list .gem-count').forEach(inp => {
    const gemId = inp.dataset.gemId;
    if (gemId && savedState.gems[gemId] != null) {
      inp.value = savedState.gems[gemId];
    }
  });

  const totalSlots = parseInt(document.getElementById('gems-total-slots')?.textContent) || 0;
  if (window.setGemsTotalSlots) window.setGemsTotalSlots(totalSlots);

  // Восстанавливаем жаровню
  const brazierChk = document.querySelector('.brazier-check');
  if (brazierChk) {
    brazierChk.checked = !!savedState.brazier;
    state.brazier = !!savedState.brazier;
  }

  // Восстанавливаем шаги
  state.steps3000 = !!savedState.steps3000;
  state.steps6000 = !!savedState.steps6000;
  document.querySelectorAll('.step-check').forEach(chk => {
    const label = chk.parentElement.textContent.trim();
    if (label.includes('3000')) chk.checked = state.steps3000;
    if (label.includes('6000')) chk.checked = state.steps6000;
  });

  // Восстанавливаем расходники
  savedState.consumables.forEach(({ id, group }) => {
    const chk = document.querySelector(
      `.consumables-grid input[data-consumable-id="${id}"][data-consumable-group="${group}"]`
    );
    if (chk) chk.checked = true;
  });
  recalcConsumables();

  recalc();

// ============ СЛУШАТЕЛЬ СБРОСА СЛОТА ============
window.addEventListener('orna-slot-cleared', (e) => {
  const slotEl = e.detail.slot;
  if (slotEl) {
    delete slotEl.dataset.sockets;
  }
  updateTotalGemsSlots();
  recalc();
});

// ============================================================
// ПОЛНЫЙ СБРОС СТРАНИЦЫ
// ============================================================
function resetAll() {
  const lang = currentLang();
const msg = lang === 'ru'
  ? 'Очистить всё? Это действие нельзя отменить.'
  : 'Clear all? This action cannot be undone.';
  if (!window.confirm(msg)) return;

  // 1. Класс
  const classSel = document.getElementById('class-select');
  if (classSel) classSel.value = '';

  // 2. Спека
  const specSel = document.getElementById('spec-select');
  if (specSel) specSel.value = '';

  // 3. Питомец
  clearFollower();

  // 4. Слоты
  ['weapon-1', 'weapon-2', 'head', 'body', 'legs', 'accessory-1', 'accessory-2']
    .forEach(sk => {
      const slotEl = document.querySelector(`[data-slot="${sk}"]`);
      if (slotEl?.dataset.itemId) clearSlot(sk);
    });

  // 5. Мнемы
  document.querySelectorAll('.mnem-select').forEach(sel => {
    sel.value = '';
  });
  document.querySelectorAll('.mnem-input').forEach(inp => {
    inp.value = '';
  });
  syncMnemState();

  // 6. Геммы
  document.querySelectorAll('#gems-list .gem-count').forEach(inp => {
    inp.value = 0;
  });
  if (window.setGemsTotalSlots) {
    const totalSlots = parseInt(document.getElementById('gems-total-slots')?.textContent) || 0;
    window.setGemsTotalSlots(totalSlots);
  }

  // 7. Шаги + жаровня
  state.steps3000 = false;
  state.steps6000 = false;
  state.brazier = false;
  document.querySelectorAll('.step-check').forEach(chk => {
    chk.checked = false;
  });

  // 8. Расходники
  document.querySelectorAll('.consumables-grid input[type="checkbox"]:checked').forEach(chk => {
    chk.checked = false;
  });
  state.consumablesMult = 1;

  // 9. Обновляем UI
  updateClassInfo();
  updateSpecInfo();
  updateLeftMnemLock();
  updateFollowerLock();
  updateTotalGemsSlots();

  // 10. Пересчёт
  recalc();
}

function initResetButton() {
  const btn = document.getElementById('reset-btn');
  if (!btn) return;
  btn.addEventListener('click', resetAll);
}

initResetButton();