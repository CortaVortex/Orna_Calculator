// ============================================================
// ФАРМ — ЛОГИКА (UI)
// ============================================================

import {
  QUALITY_MULT, QUALITY_BG, DUAL_WIELD_PENALTY,
  parseFarmBonuses, extractOurBonuses,
  boostByQuality, applyPenalty,
  getBBLevels, hasFarmBonus, getFollowerMultiplier,
  isTwoHanded, getItemSlot, isFarmItem,
  getFarmConsumables, getAllConsumables,
  calculateFarm,
  checkSpecRequirement,
  HARDCODED_ITEMS,
} from './farm-calc.js';

console.log('🌾 Farm page loaded');

// ============ ДАННЫЕ ============
let allItems = [];
let allClasses = [];
let allSpecs = [];
let allFollowers = [];

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
  const lang = currentLang();
  const [items, classes, specs, followers] = await Promise.all([
    loadJSON(`../data/items-${lang}.json`),
    loadJSON(`../data/classes-${lang}.json`),
    loadJSON(`../data/specs-${lang}.json`),
    loadJSON(`../data/followers-${lang}.json`),
  ]);
  allItems = [...HARDCODED_ITEMS, ...items];
  allClasses = classes;
  allSpecs = specs;
  allFollowers = followers;

  console.log('📦 Загружено:');
  console.log('   Предметы:', allItems.length);
  console.log('   Классы:', allClasses.length);
  console.log('   Специализации:', allSpecs.length);
  console.log('   Питомцы:', allFollowers.length);
}

// ============ СОСТОЯНИЕ ============
const farmState = {
  steps: { 3000: false, 6000: false },
};

// ============ ХРАМЫ ============
const TEMPLES = [
  { id: 'temple-luck', name: 'Храм удачи', nameEn: 'Temple of Luck',
    icon: 'https://playorna.com/static/img/research/temple_luck.png',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 2 } },
  { id: 'temple-knowledge', name: 'Храм знаний', nameEn: 'Temple of Knowledge',
    icon: 'https://playorna.com/static/img/research/temple_wisdom.png',
    multipliers: { orns: 1, gold: 1, exp: 1.15, luck: 1 } },
  { id: 'temple-wealth', name: 'Храм богатства', nameEn: 'Temple of Wealth',
    icon: 'https://playorna.com/static/img/research/temple_wealth.png',
    multipliers: { orns: 1.2, gold: 1.2, exp: 1, luck: 1 } },
];

// ============ СТАТУИ ============
const STATUES = [
  { id: 'statue-luck', name: 'Статуя удачи', nameEn: 'Shrine of Luck',
    icon: 'https://playorna.com/static/img/items/shrine_of_luck.png',
    multipliers: { orns: 2, gold: 2, exp: 1, luck: 2 } },
  { id: 'statue-wisdom', name: 'Статуя мудрости', nameEn: 'Shrine of Wisdom',
    icon: 'https://playorna.com/static/img/items/shrine_of_wisdom.png',
    multipliers: { orns: 1, gold: 1, exp: 2, luck: 1 } },
];

// ============ ИВЕНТЫ ============
const EVENTS = [
  { id: 'event-enlightenment', name: 'Дни просветления', nameEn: 'Days of Enlightenment',
    icon: 'https://playorna.com/static/img/items/exp.png',
    multipliers: { orns: 1, gold: 1, exp: 1.25, luck: 1 } },
  { id: 'event-happy', name: 'Счастливые дни', nameEn: 'Happy Days',
    icon: 'https://playorna.com/static/img/items/loot.png',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 1.2 } },
  { id: 'event-ornabirth', name: 'Орнабилей', nameEn: 'Ornabirth',
    icon: 'https://playorna.com/static/img/packs/nfs/odie_2024.png',
    multipliers: { orns: 1.2, gold: 1.2, exp: 1.2, luck: 1 } },
  { id: 'event-ornopad', name: 'Орнопад', nameEn: 'Ornopad',
    icon: 'https://playorna.com/static/img/items/orns.png',
    multipliers: { orns: 1.25, gold: 1, exp: 1, luck: 1 } },
  { id: 'event-cave', name: 'Исследование пещер', nameEn: 'Cave Exploration',
    icon: 'https://playorna.com/static/img/bosses/dweller.png',
    multipliers: { orns: 1.25, gold: 1, exp: 1, luck: 1 } },
];

// Взаимоисключающие ивенты: Орнопад и Исследование пещер
const MUTEX_EVENTS = ['event-ornopad', 'event-cave'];

function updateEventMutex() {
  const checked = new Set();
  MUTEX_EVENTS.forEach(id => {
    const chk = document.querySelector(`#events-grid input[data-event-id="${id}"]`);
    if (chk?.checked) checked.add(id);
  });

  MUTEX_EVENTS.forEach(id => {
    const chk = document.querySelector(`#events-grid input[data-event-id="${id}"]`);
    if (!chk) return;

    const isSelected = checked.has(id);
    const isOtherSelected = [...checked].some(x => x !== id);

    chk.disabled = !isSelected && isOtherSelected;

    const label = chk.closest('.consumable-item');
    if (label) {
      label.classList.toggle('is-mutex-disabled', chk.disabled);
    }
  });
}

// ============ АСТРОДЕРЕВО ============
const ASTRAL_TREE = [
  { id: 'astral-luck', name: 'Бонус удачи', nameEn: 'Luck Bonus',
    icon: 'https://playorna.com/static/img/items/loot.png',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 2 } },
  { id: 'astral-orns', name: 'Бонус орн', nameEn: 'Orns Bonus',
    icon: 'https://playorna.com/static/img/items/orns.png',
    multipliers: { orns: 1.15, gold: 1, exp: 1, luck: 1 } },
  { id: 'astral-gold', name: 'Бонус золота', nameEn: 'Gold Bonus',
    icon: 'https://playorna.com/static/img/items/gold.png',
    multipliers: { orns: 1, gold: 1.15, exp: 1, luck: 1 } },
  { id: 'astral-exp', name: 'Бонус опыта', nameEn: 'Exp Bonus',
    icon: 'https://playorna.com/static/img/items/exp.png',
    multipliers: { orns: 1, gold: 1, exp: 1.05, luck: 1 } },
];

// ============ БАН ============
function isBannedFarm(item) {
  const name = item?.name || '';
  const BANNED_NAMES = [
    'Пакт НепоKonqорённых',
    'Unfelled Konqord',
  ];
  if (BANNED_NAMES.includes(name)) return true;
  if (/konq/i.test(name)) return true;
  return false;
}

// ============ КЛАССЫ ============
function isRelevantFarmClass(cls) {
  return (cls.bestialBondLevel || 0) > 0;
}

function fillClassSelect() {
  const sel = document.getElementById('class-select');
  if (!sel) return;
  const current = sel.value;
  Array.from(sel.options).forEach(opt => { if (opt.value) sel.removeChild(opt); });

  if (!sel.querySelector('option[value=""]')) {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— нет —';
    none.dataset.ru = '— нет —';
    none.dataset.en = '— none —';
    sel.insertBefore(none, sel.firstChild);
  }

  allClasses
    .filter(isRelevantFarmClass)
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
    bonusEl.textContent = '—';
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
    recalcFarm();
    return;
  }

  const parts = [];
  if (cls.bestialBondLevel > 0) parts.push(`Узы ${cls.bestialBondLevel}`);
  bonusEl.textContent = parts.length ? parts.join(' · ') : '—';

  if (cls.sprite && iconEl) {
    iconEl.src = cls.sprite;
    iconEl.hidden = false;
    if (placeholder) placeholder.hidden = true;
  }

  recalcFarm();
}

// ============ СПЕЦИАЛИЗАЦИИ ============
function isRelevantFarmSpec(spec) {
  const hasBB = (spec.bestialBondLevel || 0) > 0;
  const hasAmity = !!spec.unlocksSecondAmity;
  const m = spec.multipliers;
  const hasMult = m && (m.orns !== 1 || m.gold !== 1 || m.luck !== 1 || m.exp !== 1);
  return hasBB || hasAmity || hasMult;
}

function fillSpecSelect() {
  const sel = document.getElementById('spec-select');
  if (!sel) return;
  const current = sel.value;
  Array.from(sel.options).forEach(opt => { if (opt.value) sel.removeChild(opt); });

  if (!sel.querySelector('option[value=""]')) {
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '— нет —';
    none.dataset.ru = '— нет —';
    none.dataset.en = '— none —';
    sel.insertBefore(none, sel.firstChild);
  }

  allSpecs.filter(isRelevantFarmSpec).forEach(s => {
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
  if (!sel || !bonusEl) return;

  const spec = allSpecs.find(s => s.id === sel.value);
  if (!spec) {
    bonusEl.innerHTML = '—';
    recalcFarm();
    return;
  }

  const parts = [];
  if (spec.bestialBondLevel > 0) parts.push(`Узы ${spec.bestialBondLevel}`);
  if (spec.unlocksSecondAmity) parts.push('+Amity');

  const m = spec.multipliers;
  if (m) {
    if (m.orns !== 1) parts.push(`Орны ${m.orns >= 1 ? '+' : ''}${Math.round((m.orns - 1) * 100)}%`);
    if (m.gold !== 1) parts.push(`Золото ${m.gold >= 1 ? '+' : ''}${Math.round((m.gold - 1) * 100)}%`);
    if (m.exp !== 1)  parts.push(`Опыт ${m.exp >= 1 ? '+' : ''}${Math.round((m.exp - 1) * 100)}%`);
    if (m.luck !== 1) parts.push(`Удача ${m.luck >= 1 ? '+' : ''}${Math.round((m.luck - 1) * 100)}%`);
  }

  bonusEl.innerHTML = parts.length ? parts.join('<br>') : '—';
  recalcFarm();
}

// ============ ПИТОМЕЦ ============
function getAvailableBB() {
  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');
  const cls = allClasses.find(c => String(c.id) === classSel?.value);
  const spec = allSpecs.find(s => s.id === specSel?.value);
  const fromClass = cls?.bestialBondLevel || 0;
  const fromSpec = spec?.bestialBondLevel || 0;

  const mnemVals = getMnemValues();
  const fromMnems = mnemVals.bonds > 0 ? 1 : 0;

  return Math.min(3, Math.max(fromClass, fromSpec, fromMnems));
}

function formatFollowerMeta(follower, availableBB) {
  if (!follower) return '';

  const lang = currentLang();
  const names = {
    ru: { orns: 'Орны', gold: 'Золото', exp: 'Опыт', luck: 'Удача' },
    en: { orns: 'Orns', gold: 'Gold', exp: 'Exp', luck: 'Luck' },
  };
  const n = names[lang] || names.ru;

  const levels = getBBLevels(follower);
  const lines = [];

  const maxLevel = Math.max(availableBB || 0, 3);
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const line = levels.find(t =>
      new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
    );
    if (!line) continue;

    const m = parseFarmBonuses(line);
    const parts = [];
    ['orns', 'gold', 'exp', 'luck'].forEach(key => {
      const v = m[key];
      if (v != null && v !== 1) {
        const pct = Math.round((v - 1) * 100);
        const sign = pct >= 0 ? '+' : '';
        parts.push(`${n[key]} ${sign}${pct}%`);
      }
    });

    if (parts.length) lines.push(`BB${lvl}: ${parts.join(', ')}`);
  }

  return lines.join(' · ');
}

function openFollowerPicker() {
  const availableBB = getAvailableBB();
  if (availableBB === 0) return;

  const pets = allFollowers
    .filter(hasFarmBonus)
    .filter(f => !isBannedFarm(f))
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: 'Пусто', sprite: '', tier: null, effects: [] },
    ...pets,
  ];

  window.Modal.open({
    title: `Питомец (доступно BB${availableBB})`,
    items: itemsWithEmpty,
    metaFormatter: (it) => {
      if (it.id === '__empty__') return '';
      return formatFollowerMeta(it, availableBB);
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

  if (petImg) {
    petImg.src = '';
    petImg.hidden = true;
  }
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
    const bbLevels = getBBLevels(follower);

    for (let lvl = 1; lvl <= bbLevel; lvl++) {
      const line = bbLevels.find(t =>
        new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
      );
      if (!line) continue;
      const ourBonuses = extractOurBonuses(line, currentLang());
      if (ourBonuses.length) {
        lines.push(`${lvl}:  ${ourBonuses.join(', ')}`);
      }
    }

    if (lines.length) {
      petBonus.innerHTML = lines.join('<br>');
      petBonus.hidden = false;
    } else {
      petBonus.hidden = true;
    }
  }

  petBox.dataset.followerId = follower.id;
  petBox.dataset.bbLevel = String(bbLevel);
  petBox.classList.add('has-pet');

  ensurePetReset(petBox);
  recalcFarm();
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
  if (petPlaceholder) { petPlaceholder.hidden = false; petPlaceholder.textContent = '+'; }
  if (petName) { petName.textContent = ''; petName.hidden = true; }
  if (petBonus) { petBonus.textContent = ''; petBonus.hidden = true; }

  petBox.classList.remove('has-pet');
  delete petBox.dataset.followerId;
  delete petBox.dataset.bbLevel;

  const resetBtn = petBox.querySelector('.pet-reset');
  if (resetBtn) resetBtn.remove();

  recalcFarm();
}

function updateFollowerLock() {
  const petBox = document.getElementById('pet-box');
  if (!petBox) return;

  const availableBB = getAvailableBB();
  const caption = petBox.querySelector('.pet-caption');

  if (petBox.dataset.followerId) {
    const savedBB = parseInt(petBox.dataset.bbLevel) || 0;
    if (savedBB > availableBB) {
      if (availableBB === 0) clearFollower();
      else {
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

// ============ МНЕМЫ ============
function getMnemValues() {
  const result = { acc: 0, orns: 0, gold: 0, exp: 0, luck: 0, bonds: 0 };
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const row = sel.dataset.row;
    const mnem = sel.dataset.mnem;
    const input = document.querySelector(
      `.mnem-input[data-mnem="${mnem}"][data-row="${row}"]`
    );
    const value = sel.value;
    if (!value) return;
    if (value === 'bonds') {
      result.bonds += 1;
    } else {
      const pct = parseFloat(input?.value) || 0;
      if (pct > 0) result[value] += pct;
    }
  });
  return result;
}

function getMnemList() {
  const list = [];
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const row = sel.dataset.row;
    const mnem = sel.dataset.mnem;
    const input = document.querySelector(
      `.mnem-input[data-mnem="${mnem}"][data-row="${row}"]`
    );
    const type = sel.value;
    if (!type || type === 'bonds') return;
    const pct = parseFloat(input?.value) || 0;
    if (pct > 0) list.push({ type, value: pct });
  });
  return list;
}

function validateMnemInput(input) {
  if (!input || input.disabled) return;

  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  let val = parseFloat(input.value);

  if (isNaN(val)) {
    input.value = '';
    input.classList.remove('is-error');
    return;
  }

  if (val < 0) val = 0;
  if (val > max) val = max;
  input.value = val;

  const isInvalid = val > 0 && (val < min || val > max);
  input.classList.toggle('is-error', isInvalid);
}

function updateMnemInputState(sel) {
  const mnem = sel.dataset.mnem;
  const row = sel.dataset.row;
  const input = document.querySelector(
    `.mnem-input[data-mnem="${mnem}"][data-row="${row}"]`
  );
  if (!input) return;

  const v = sel.value;
  if (v === 'bonds' || v === '') {
    input.value = '';
    input.disabled = true;
    input.placeholder = '';
    input.classList.remove('is-error');
  } else {
    input.disabled = false;
    if (v === 'acc') {
      input.min = 5;
      input.max = 25;
      input.placeholder = '5–25';
    } else {
      input.min = 1;
      input.max = 5;
      input.placeholder = '1–5';
    }
    validateMnemInput(input);
  }
}

function refreshAllMnemOptions() {
  const groups = {};

  document.querySelectorAll('.mnem-select').forEach(sel => {
    const mnemId = sel.dataset.mnem || '1';
    if (!groups[mnemId]) groups[mnemId] = [];
    groups[mnemId].push(sel);
  });

  Object.values(groups).forEach(group => {
    const chosen = new Set();
    group.forEach(sel => { if (sel.value) chosen.add(sel.value); });

    group.forEach(sel => {
      const current = sel.value;
      sel.querySelectorAll('option').forEach(opt => {
        if (!opt.value) return;
        opt.disabled = chosen.has(opt.value) && opt.value !== current;
      });
    });
  });
}

function initMnemsFarm() {
  document.querySelectorAll('.mnem-select').forEach(sel => {
    updateMnemInputState(sel);

    sel.addEventListener('change', () => {
      updateMnemInputState(sel);
      refreshAllMnemOptions();
      updateFollowerLock();
      recalcFarm();
    });
  });

  document.querySelectorAll('.mnem-input').forEach(input => {
    input.addEventListener('input', () => {
      validateMnemInput(input);
      recalcFarm();
    });
  });

  refreshAllMnemOptions();
}

// ============ ЗАВИСИМОСТЬ ЛЕВОГО МНЕМА ОТ СПЕЦИАЛИЗАЦИИ ============
const ORACLE_SPECS = ['oracle-5', 'great-oracle'];

function updateLeftMnemLock() {
  const leftMnemSlot = document.querySelector('[data-slot="mnem-1"]');
  if (!leftMnemSlot) return;

  const specSel = document.getElementById('spec-select');
  const unlocked = ORACLE_SPECS.includes(specSel?.value);

  leftMnemSlot.classList.toggle('is-locked', !unlocked);

  leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => {
    sel.disabled = !unlocked;
  });
  leftMnemSlot.querySelectorAll('.mnem-input').forEach(inp => {
    inp.disabled = !unlocked;
  });

  if (!unlocked) {
    leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => sel.value = '');
    leftMnemSlot.querySelectorAll('.mnem-input').forEach(inp => {
      inp.value = '';
      inp.disabled = true;
      inp.classList.remove('is-error');
    });
    refreshAllMnemOptions();
  }
}

// ============ ШАГИ ============
function initSteps() {
  document.querySelectorAll('.step-check').forEach(chk => {
    chk.addEventListener('change', () => {
      const stepValue = chk.dataset.steps;
      if (stepValue) farmState.steps[stepValue] = chk.checked;
      recalcFarm();
    });
  });
}

// ============ ФОРМАТ ============
function formatEffect(item, lang) {
  const names = {
    ru: { orns: 'Орны', gold: 'Золото', exp: 'Опыт', luck: 'Удача' },
    en: { orns: 'Orns', gold: 'Gold', exp: 'Exp', luck: 'Luck' },
  };
  const n = names[lang] || names.ru;
  const parts = [];

  ['orns', 'gold', 'exp', 'luck'].forEach(key => {
    const m = item.multipliers?.[key];
    if (m != null && m !== 1) {
      const pct = Math.round((m - 1) * 100);
      const sign = pct >= 0 ? '+' : '';
      parts.push(`${n[key]} ${sign}${pct}%`);
    }
  });

  return parts.join(' · ');
}

// ============ РЕНДЕР ============
function renderSimpleGrid(gridEl, items, group) {
  if (!gridEl) return;
  const lang = localStorage.getItem('orna-lang') || 'ru';

  if (!items.length) {
    gridEl.innerHTML = '<div class="consumables-empty">—</div>';
    return;
  }

  gridEl.innerHTML = items.map(item => {
    const iconHtml = item.icon
      ? `<img class="consumable-icon" src="${item.icon}" alt="" onerror="this.style.display='none'">`
      : '<span class="consumable-icon consumable-icon-empty">✦</span>';

    const effect = formatEffect(item, lang);

    return `
      <label class="consumable-item">
        <input type="checkbox" data-${group}-id="${item.id}">
        ${iconHtml}
        <div class="consumable-info">
          <div class="consumable-name">${lang === 'ru' ? item.name : (item.nameEn || item.name)}</div>
          <div class="consumable-effect">${effect}</div>
        </div>
      </label>
    `;
  }).join('');

  gridEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => recalcFarm());
  });
}

function renderEventsGrid(gridEl, events) {
  renderSimpleGrid(gridEl, events, 'event');
}

// ============ ПЕРЕСЧЁТ ============
function recalcFarm() {
  const anguish = {
    orns: parseFloat(document.querySelector('.anguish-input[data-currency="orns"]')?.value) || 0,
    gold: parseFloat(document.querySelector('.anguish-input[data-currency="gold"]')?.value) || 0,
    exp:  parseFloat(document.querySelector('.anguish-input[data-currency="exp"]')?.value)  || 0,
    luck: parseFloat(document.querySelector('.anguish-input[data-currency="luck"]')?.value) || 0,
  };

  const specSel = document.getElementById('spec-select');
  const selectedSpec = allSpecs.find(s => s.id === specSel?.value);
  const specMultipliers = selectedSpec?.multipliers || null;
  const specId = selectedSpec?.id || null;

  const mnemVals = getMnemValues();
  const mnemList = getMnemList();

  const equipment = [];
  document.querySelectorAll('.slot[data-item-id]').forEach(slotEl => {
    const slotKey = slotEl.dataset.slot;
    if (slotKey === 'mnem-1' || slotKey === 'mnem-2') return;

    const item = allItems.find(i => String(i.id) === String(slotEl.dataset.itemId));
    if (!item) return;

    equipment.push({
      slotKey,
      item,
      quality: slotEl.dataset.quality || 'common',
      mode: slotEl.querySelector('.slot-mode-toggle')?.dataset.mode || 'weapon',
    });
  });

  const petBox = document.getElementById('pet-box');
  let follower = null;
  if (petBox?.dataset.followerId) {
    const item = allFollowers.find(f => f.id === petBox.dataset.followerId);
    const bbLevel = parseInt(petBox.dataset.bbLevel) || 0;
    if (item) follower = { item, bbLevel };
  }

  updateEventMutex();
  const temples = collectChecked('#temples-grid', 'templeId', TEMPLES);
  const statues = collectChecked('#statues-grid', 'statueId', STATUES);
  const events  = collectChecked('#events-grid',  'eventId',  EVENTS);
  const consumables = collectChecked('#consumables-grid', 'consumableId', getAllConsumables(allItems));
  const astral  = collectChecked('#astral-grid',  'astralId', ASTRAL_TREE);

  const results = calculateFarm({
    lang: currentLang(),
    anguish,
    specMultipliers,
    specId,
    mnemVals,
    mnemList,
    equipment,
    follower,
    steps: farmState.steps,
    temples,
    statues,
    events,
    consumables,
    astral,
  });

  updateFarmResults(results);

  ['weapon-1', 'weapon-2', 'head', 'body', 'legs', 'accessory-1', 'accessory-2']
    .forEach(sk => {
      const el = document.querySelector(`[data-slot="${sk}"]`);
      if (el?.dataset.itemId) refreshSlotStats(sk);
    });

  updateSpecRequirementUI();
}

function collectChecked(gridSel, idAttr, sourceArr) {
  const result = [];
  document.querySelectorAll(`${gridSel} input[type="checkbox"]:checked`).forEach(chk => {
    const id = chk.dataset[idAttr];
    const item = sourceArr.find(x => x.id === id);
    if (item) result.push(item);
  });
  return result;
}

function updateFarmResults(results) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = `${Math.round(val)}%`;
  };
  set('orns-result', results.orns);
  set('gold-result', results.gold);
  set('exp-result',  results.exp);
  set('luck-result', results.luck);

  const luckCard = document.querySelector('.farm-result-card[data-currency="luck"]');
  if (luckCard) {
    luckCard.classList.toggle('is-capped', !!results.luckCapped);
  }

  // Клик по карточке → popup с деталями
  ['orns', 'gold', 'exp', 'luck'].forEach(stat => {
    const card = document.querySelector(`.farm-result-card[data-currency="${stat}"]`);
    if (!card) return;
    if (card.dataset.boundCalc === '1') {
      card.dataset.calcStat = stat;
      return;
    }
    card.dataset.boundCalc = '1';
    card.dataset.calcStat = stat;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      showCalcPopup(stat);
    });
  });

  window.__lastCalcResults = results;
}

// ============ POPUP РАСЧЁТА ============
function showCalcPopup(stat) {
  const popup = document.getElementById('calc-popup');
  if (!popup) return;

  const results = window.__lastCalcResults;
  if (!results) return;

  const log = results.log?.[stat] || [];
  const lang = currentLang();

  const names = {
    ru: { orns: 'Орны', gold: 'Золото', exp: 'Опыт', luck: 'Удача' },
    en: { orns: 'Orns', gold: 'Gold', exp: 'Exp', luck: 'Luck' },
  };
  const n = names[lang] || names.ru;
  const total = results[stat];

  let html = `<div class="calc-popup-title">${n[stat]} — ${Math.round(total)}% <span style="opacity: 0.5; font-size: 0.8em;">(× ${(total/100).toFixed(5).replace(/\.?0+$/, '')})</span></div>`;

log.forEach(step => {
  if (step.coef !== undefined) {
    const coefStr = step.coef.toFixed(4).replace(/\.?0+$/, '');
    html += `
      <div class="calc-popup-step">
        <div class="calc-popup-step-row">
          <span class="calc-popup-step-label">${step.label}</span>
          <span class="calc-popup-step-value">× ${coefStr}</span>
        </div>
        ${step.steps ? `
          <div class="calc-popup-step-formula">
            ${step.steps.map(s => `<div>${s}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    html += `
      <div class="calc-popup-step">
        <div class="calc-popup-step-row">
          <span class="calc-popup-step-label">${step.label}</span>
          <span class="calc-popup-step-value">${step.value}</span>
        </div>
      </div>
    `;
  }
});

const totalCoef = (total / 100).toFixed(5).replace(/\.?0+$/, '');
const totalPct = Math.round(total * 1000) / 1000;
html += `
  <div class="calc-popup-total">
    <span>Итог</span>
    <span>× ${totalCoef} = ${totalPct}%</span>
  </div>
`;

  popup.querySelector('.calc-popup-body').innerHTML = html;
  popup.hidden = false;
}

function closeCalcPopup() {
  const popup = document.getElementById('calc-popup');
  if (popup) popup.hidden = true;
}

// ============ ЭКИПИРОВКА ============
const FARM_EQUIPMENT_SLOTS = {
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
  const conf = FARM_EQUIPMENT_SLOTS[slotKey];
  if (!conf) return [];

  if (slotKey === 'weapon-2') {
    const toggle = slotEl?.querySelector('.slot-mode-toggle');
    const mode = toggle?.dataset.mode || 'weapon';
    return mode === 'offhand' ? ['offhand'] : ['weapon'];
  }

  return conf.allowed;
}

function formatFarmMeta(item) {
  const m = parseFarmBonuses((item.effects || []).join(' '));
  const lang = currentLang();

  const names = {
    ru: { orns: 'Орны', gold: 'Золото', exp: 'Опыт', luck: 'Удача' },
    en: { orns: 'Orns', gold: 'Gold', exp: 'Exp', luck: 'Luck' },
  };
  const n = names[lang] || names.ru;

  const parts = [];
  ['orns', 'gold', 'exp', 'luck'].forEach(key => {
    const v = m[key];
    if (v != null && v !== 1) {
      const pct = Math.round((v - 1) * 100);
      const sign = pct >= 0 ? '+' : '';
      parts.push(`${n[key]}: ${sign}${pct}%`);
    }
  });

  return parts.join(' · ');
}

function openSlotPicker(slotKey) {
  const allowed = getSlotAllowed(slotKey);

  const items = allItems
    .filter(it =>
      isFarmItem(it) &&
      !isBannedFarm(it) &&
      allowed.includes(getItemSlot(it))
    )
    .filter(it => {
      if (slotKey === 'weapon-2' && isTwoHanded(it)) return false;
      return true;
    })
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  window.Modal.open({
    title: 'Выбор предмета',
    items,
    metaFormatter: formatFarmMeta,
    onPick: (item) => applyItemToFarmSlot(slotKey, item),
    onClear: () => clearFarmSlot(slotKey),
  });
}

function applyItemToFarmSlot(slotKey, item) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  if (!slotEl) return;

  const wrapper = slotEl.closest('.slot-wrapper');
  const img = slotEl.querySelector('.slot-icon-img');
  const nameEl = wrapper?.querySelector('.slot-name') || slotEl.querySelector('.slot-name');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img) {
    img.src = '';
    img.hidden = true;
    if (item.sprite) {
      img.src = item.sprite;
      img.hidden = false;
    }
  }
  if (nameEl) nameEl.textContent = item.name;
  if (qualitySel) qualitySel.hidden = false;

  slotEl.dataset.itemId = item.id;
  slotEl.classList.add('has-item');

  updateSlotQuality(slotKey);
  ensureSlotReset(slotEl);
  updateTwoHandedLock(slotKey, item);
  updateTwoHandedPenaltyBadge();
  recalcFarm();
}

function updateSlotQuality(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  const qualitySel = slotEl?.querySelector('.slot-quality');
  if (!qualitySel) return;

  const quality = qualitySel.value || 'common';
  slotEl.dataset.quality = quality;

  const bg = QUALITY_BG[quality] || '';
  if (bg) {
    slotEl.style.backgroundImage = `url('${bg}')`;
    slotEl.style.backgroundSize = 'cover';
    slotEl.style.backgroundPosition = 'center';
    slotEl.style.backgroundBlendMode = 'normal';
  } else {
    slotEl.style.backgroundImage = '';
    slotEl.style.backgroundBlendMode = '';
  }

  refreshSlotStats(slotKey);
}

function refreshSlotStats(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  if (!slotEl) return;

  const itemId = slotEl.dataset.itemId;
  const statsEl = slotEl.closest('.slot-wrapper')?.querySelector('.slot-stats') ||
                  slotEl.querySelector('.slot-stats');
  if (!statsEl) return;

  if (!itemId) {
    statsEl.textContent = '';
    return;
  }

  const item = allItems.find(i => String(i.id) === String(itemId));
  if (!item) {
    statsEl.textContent = '';
    return;
  }

  const specSel = document.getElementById('spec-select');
  const activeSpecId = specSel?.value || null;
  const req = checkSpecRequirement(item, activeSpecId);

  if (req.requires && !req.satisfied) {
    statsEl.textContent = currentLang() === 'ru'
      ? 'Требуется специализация: Купец'
      : 'Requires spec: Merchant';
    statsEl.classList.add('stats-requires-spec');
    return;
  } else {
    statsEl.classList.remove('stats-requires-spec');
  }

  const quality = slotEl.dataset.quality || 'common';
  const qualityMult = QUALITY_MULT[quality] || 1;

  let base = parseFarmBonuses((item.effects || []).join(' '));

  base = {
    orns: boostByQuality(base.orns, qualityMult),
    gold: boostByQuality(base.gold, qualityMult),
    exp:  boostByQuality(base.exp,  qualityMult),
    luck: boostByQuality(base.luck, qualityMult),
  };

  const isWeaponSlot = slotKey === 'weapon-1' || slotKey === 'weapon-2';
  if (isWeaponSlot && isBothOneHand()) {
    base = {
      orns: applyPenalty(base.orns, DUAL_WIELD_PENALTY),
      gold: applyPenalty(base.gold, DUAL_WIELD_PENALTY),
      exp:  applyPenalty(base.exp,  DUAL_WIELD_PENALTY),
      luck: applyPenalty(base.luck, DUAL_WIELD_PENALTY),
    };
  }

  if (slotKey === 'accessory-1' || slotKey === 'accessory-2') {
    const mnemVals = getMnemValues();
    const accBoost = 1 + (mnemVals.acc || 0) / 100;
    base = {
      orns: boostByQuality(base.orns, accBoost),
      gold: boostByQuality(base.gold, accBoost),
      exp:  boostByQuality(base.exp,  accBoost),
      luck: boostByQuality(base.luck, accBoost),
    };
  }

  statsEl.textContent = formatEffect({ multipliers: base }, currentLang());
}

function isBothOneHand() {
  const w1El = document.querySelector('[data-slot="weapon-1"]');
  const w2El = document.querySelector('[data-slot="weapon-2"]');
  const w1Item = w1El?.dataset.itemId ? allItems.find(i => String(i.id) === String(w1El.dataset.itemId)) : null;
  const w2Item = w2El?.dataset.itemId ? allItems.find(i => String(i.id) === String(w2El.dataset.itemId)) : null;

  const w2Mode = w2El?.querySelector('.slot-mode-toggle')?.dataset.mode || 'weapon';

  return !!(w1Item && w2Item && w2Mode === 'weapon' &&
            !isTwoHanded(w1Item) && !isTwoHanded(w2Item));
}

// ============ БЕЙДЖ ШТРАФА ДВУРУЧЕК ============
function updateTwoHandedPenaltyBadge() {
  const bothOneHand = isBothOneHand();
  ['weapon-1', 'weapon-2'].forEach(sk => {
    const slotEl = document.querySelector(`[data-slot="${sk}"]`);
    if (!slotEl) return;

    let badge = slotEl.querySelector('.slot-penalty-badge');

    if (bothOneHand) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'slot-penalty-badge';
        badge.textContent = '−35%';
        badge.title = currentLang() === 'ru'
          ? 'Штраф за два одноручных оружия (сила × 0.65)'
          : 'Dual wield penalty (strength × 0.65)';
        slotEl.appendChild(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  });
}

function updateSpecRequirementUI() {
  const specSel = document.getElementById('spec-select');
  const activeSpecId = specSel?.value || null;

  let anyRequires = false;
  let allSatisfied = true;

  document.querySelectorAll('.slot[data-item-id]').forEach(slotEl => {
    const slotKey = slotEl.dataset.slot;
    if (slotKey === 'mnem-1' || slotKey === 'mnem-2') return;

    const itemId = slotEl.dataset.itemId;
    const item = allItems.find(i => String(i.id) === String(itemId));
    if (!item) {
      slotEl.classList.remove('requires-spec', 'spec-satisfied');
      return;
    }

    const req = checkSpecRequirement(item, activeSpecId);

    if (req.requires) {
      anyRequires = true;
      slotEl.classList.add('requires-spec');
      slotEl.classList.toggle('spec-satisfied', req.satisfied);
      if (!req.satisfied) allSatisfied = false;
    } else {
      slotEl.classList.remove('requires-spec', 'spec-satisfied');
    }
  });

  if (specSel) {
    specSel.classList.toggle('spec-required', anyRequires);
    specSel.classList.toggle('spec-satisfied', anyRequires && allSatisfied);
  }
}

function ensureSlotReset(slotEl) {
  if (slotEl.querySelector('.slot-reset')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'slot-reset';
  btn.textContent = '×';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFarmSlot(slotEl.dataset.slot);
  });
  slotEl.appendChild(btn);
}

function clearFarmSlot(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  if (!slotEl) return;

  const wrapper = slotEl.closest('.slot-wrapper');
  const img = slotEl.querySelector('.slot-icon-img');
  const nameEl = wrapper?.querySelector('.slot-name') || slotEl.querySelector('.slot-name');
  const statsEl = wrapper?.querySelector('.slot-stats') || slotEl.querySelector('.slot-stats');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img) { img.hidden = true; img.removeAttribute('src'); }
  if (nameEl) {
    const lang = currentLang();
    nameEl.textContent = nameEl.dataset[lang] || nameEl.dataset.ru || 'Пусто';
  }
  if (statsEl) statsEl.textContent = '';
  if (qualitySel) { qualitySel.hidden = true; qualitySel.value = 'common'; }

  slotEl.style.backgroundImage = '';
  slotEl.style.backgroundBlendMode = '';

  slotEl.classList.remove('has-item');
  delete slotEl.dataset.itemId;
  delete slotEl.dataset.quality;

  const resetBtn = slotEl.querySelector('.slot-reset');
  if (resetBtn) resetBtn.remove();

  const badge = slotEl.querySelector('.slot-penalty-badge');
  if (badge) badge.remove();

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

  updateTwoHandedPenaltyBadge();
  recalcFarm();
}

function initFarmEquipment() {
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
    sel.addEventListener('change', () => {
      updateSlotQuality(sel.dataset.slot);
      recalcFarm();
    });
  });

  document.querySelectorAll('.slot-mode-toggle').forEach(toggle => {
    if (toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    toggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.mode;
        toggle.dataset.mode = mode;
        toggle.querySelectorAll('.mode-btn').forEach(b =>
          b.classList.toggle('active', b.dataset.mode === mode)
        );

        const slotEl = toggle.closest('.slot');
        const slotKey = slotEl?.dataset.slot;
        if (slotKey && slotEl.dataset.itemId) {
          clearFarmSlot(slotKey);
        }

        recalcFarm();
      });
    });
  });
}

function updateTwoHandedLock(slotKey, item) {
  if (slotKey !== 'weapon-1' && slotKey !== 'weapon-2') return;

  const otherKey = slotKey === 'weapon-1' ? 'weapon-2' : 'weapon-1';
  const otherSlot = document.querySelector(`[data-slot="${otherKey}"]`);
  if (!otherSlot) return;

  if (isTwoHanded(item)) {
    clearFarmSlot(otherKey);
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

// ============ ИНИЦИАЛИЗАЦИЯ ============
async function initFarmPage() {
  await loadAllData();

  fillClassSelect();
  fillSpecSelect();

  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');

  classSel?.addEventListener('change', () => {
    updateClassInfo();
    updateFollowerLock();
  });
  specSel?.addEventListener('change', () => {
    updateSpecInfo();
    updateLeftMnemLock();
    updateFollowerLock();
  });

  updateClassInfo();
  updateSpecInfo();
  updateLeftMnemLock();
  updateFollowerLock();
  initFollower();

  renderSimpleGrid(document.getElementById('temples-grid'), TEMPLES, 'temple');
  renderSimpleGrid(document.getElementById('statues-grid'), STATUES, 'statue');
  renderEventsGrid(document.getElementById('events-grid'), EVENTS);
  renderSimpleGrid(document.getElementById('astral-grid'), ASTRAL_TREE, 'astral');

  const allConsumables = getAllConsumables(allItems);
  console.log('📋 Расходников всего:', allConsumables.length);
  renderSimpleGrid(document.getElementById('consumables-grid'), allConsumables, 'consumable');

  initSteps();
  initMnemsFarm();
  initFarmEquipment();

  document.querySelectorAll('.anguish-input').forEach(inp => {
    inp.addEventListener('input', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v) || v < 0) v = 0;
      inp.value = v;
      recalcFarm();
    });
  });

  // Popup — обработчики закрытия
  const popup = document.getElementById('calc-popup');
  if (popup) {
    popup.querySelector('.calc-popup-close')?.addEventListener('click', closeCalcPopup);
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closeCalcPopup();
    });
  }

  recalcFarm();
}

initFarmPage();

// ============ СМЕНА ЯЗЫКА ============
window.addEventListener('orna-lang-changed', async () => {
  console.log('🌐 Language changed, reloading farm...');

  const savedState = {
    classId: '',
    specId: '',
    followerId: null,
    followerBB: 0,
    slots: {},
    mnems: [],
    steps: { 3000: false, 6000: false },
    anguish: { orns: 0, gold: 0, exp: 0, luck: 0 },
    consumables: [],
  };

  const step3000 = document.querySelector('.step-check[data-steps="3000"]');
  const step6000 = document.querySelector('.step-check[data-steps="6000"]');
  savedState.steps['3000'] = step3000?.checked || false;
  savedState.steps['6000'] = step6000?.checked || false;

  ['orns', 'gold', 'exp', 'luck'].forEach(cur => {
    const inp = document.querySelector(`.anguish-input[data-currency="${cur}"]`);
    savedState.anguish[cur] = parseFloat(inp?.value) || 0;
  });

  const CONSUMABLE_GROUPS = [
    { cssAttr: 'data-temple-id',     dataKey: 'templeId',     group: 'temple' },
    { cssAttr: 'data-statue-id',     dataKey: 'statueId',     group: 'statue' },
    { cssAttr: 'data-event-id',      dataKey: 'eventId',      group: 'event' },
    { cssAttr: 'data-astral-id',     dataKey: 'astralId',     group: 'astral' },
    { cssAttr: 'data-consumable-id', dataKey: 'consumableId', group: 'consumable' },
  ];

  CONSUMABLE_GROUPS.forEach(({ cssAttr, dataKey, group }) => {
    document.querySelectorAll(`.consumables-grid input[${cssAttr}]:checked`).forEach(chk => {
      savedState.consumables.push({ id: chk.dataset[dataKey], group });
    });
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
      quality: slotEl.dataset.quality || 'common',
      mode: slotEl.querySelector('.slot-mode-toggle')?.dataset.mode || null,
    };
  });

  document.querySelectorAll('.mnem-select').forEach(sel => {
    const input = document.querySelector(
      `.mnem-input[data-mnem="${sel.dataset.mnem}"][data-row="${sel.dataset.row}"]`
    );
    savedState.mnems.push({
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

  if (classSel && savedState.classId) classSel.value = savedState.classId;
  if (specSel && savedState.specId) specSel.value = savedState.specId;

  updateClassInfo();
  updateSpecInfo();

  if (savedState.followerId) {
    const follower = allFollowers.find(f => f.id === savedState.followerId);
    if (follower) applyFollower(follower, savedState.followerBB);
  }
  updateFollowerLock();

  const allConsumables = getAllConsumables(allItems);
  renderSimpleGrid(document.getElementById('consumables-grid'), allConsumables, 'consumable');
  renderSimpleGrid(document.getElementById('temples-grid'), TEMPLES, 'temple');
  renderSimpleGrid(document.getElementById('statues-grid'), STATUES, 'statue');
  renderEventsGrid(document.getElementById('events-grid'), EVENTS);
  renderSimpleGrid(document.getElementById('astral-grid'), ASTRAL_TREE, 'astral');

  const RESTORE_GROUPS = {
    temple:     'data-temple-id',
    statue:     'data-statue-id',
    event:      'data-event-id',
    astral:     'data-astral-id',
    consumable: 'data-consumable-id',
  };

  savedState.consumables.forEach(({ id, group }) => {
    const cssAttr = RESTORE_GROUPS[group];
    if (!cssAttr) return;
    const chk = document.querySelector(
      `.consumables-grid input[${cssAttr}="${id}"]`
    );
    if (chk) chk.checked = true;
  });
  updateEventMutex();

  farmState.steps['3000'] = savedState.steps['3000'];
  farmState.steps['6000'] = savedState.steps['6000'];
  document.querySelectorAll('.step-check').forEach(chk => {
    const stepVal = chk.dataset.steps;
    if (stepVal === '3000') chk.checked = savedState.steps['3000'];
    if (stepVal === '6000') chk.checked = savedState.steps['6000'];
  });

  ['orns', 'gold', 'exp', 'luck'].forEach(cur => {
    const inp = document.querySelector(`.anguish-input[data-currency="${cur}"]`);
    if (inp) inp.value = savedState.anguish[cur];
  });

  savedState.mnems.forEach(m => {
    const sel = document.querySelector(
      `.mnem-select[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    const input = document.querySelector(
      `.mnem-input[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    if (sel && m.value) sel.value = m.value;
    if (input && m.num) input.value = m.num;
    if (sel) updateMnemInputState(sel);
  });
  refreshAllMnemOptions();

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

    applyItemToFarmSlot(slotKey, item);

    const qualitySel = document.querySelector(`[data-slot="${slotKey}"] .slot-quality`);
    if (qualitySel && data.quality) {
      qualitySel.value = data.quality;
      updateSlotQuality(slotKey);
    }
  }

  updateTwoHandedPenaltyBadge();
  recalcFarm();
});

// ============ ЭКСПОРТ В WINDOW ============
window.openSlotPicker = openSlotPicker;
window.applyItemToFarmSlot = applyItemToFarmSlot;
window.clearFarmSlot = clearFarmSlot;
window.applyFollower = applyFollower;
window.clearFollower = clearFollower;
window.openFollowerPicker = openFollowerPicker;
window.updateSlotQuality = updateSlotQuality;
window.recalcFarm = recalcFarm;
window.formatEffect = formatEffect;
window.initFarmPage = initFarmPage;
window.updateClassInfo = updateClassInfo;
window.updateSpecInfo = updateSpecInfo;
window.updateFollowerLock = updateFollowerLock;
window.updateTwoHandedLock = updateTwoHandedLock;
window.updateLeftMnemLock = updateLeftMnemLock;

window.__farmDebug = {
  get allItems() { return allItems; },
  get allClasses() { return allClasses; },
  get allSpecs() { return allSpecs; },
  get allFollowers() { return allFollowers; },
};

// ============================================================
// ПОЛНЫЙ СБРОС СТРАНИЦЫ
// ============================================================
function resetAll() {
  const lang = currentLang();
  const msg = lang === 'ru'
    ? 'Очистить всё? Это действие нельзя отменить.'
    : 'Clear all? This action cannot be undone.';
  if (!window.confirm(msg)) return;

  const classSel = document.getElementById('class-select');
  if (classSel) classSel.value = '';

  const specSel = document.getElementById('spec-select');
  if (specSel) specSel.value = '';

  clearFollower();

  ['weapon-1', 'weapon-2', 'head', 'body', 'legs', 'accessory-1', 'accessory-2']
    .forEach(sk => {
      const slotEl = document.querySelector(`[data-slot="${sk}"]`);
      if (slotEl?.dataset.itemId) clearFarmSlot(sk);
    });

  document.querySelectorAll('.mnem-select').forEach(sel => {
    sel.value = '';
    sel.dispatchEvent(new Event('change'));
  });

  farmState.steps['3000'] = false;
  farmState.steps['6000'] = false;
  document.querySelectorAll('.step-check').forEach(chk => {
    chk.checked = false;
  });

  document.querySelectorAll('.anguish-input').forEach(inp => {
    inp.value = 0;
  });

  document.querySelectorAll('.consumable-item.is-mutex-disabled').forEach(el => {
    el.classList.remove('is-mutex-disabled');
  });
  document.querySelectorAll('#events-grid input[data-event-id]').forEach(chk => {
    chk.disabled = false;
  });

  updateClassInfo();
  updateSpecInfo();
  updateLeftMnemLock();
  updateFollowerLock();
  updateSpecRequirementUI();
  updateTwoHandedPenaltyBadge();

  recalcFarm();
}

function initResetButton() {
  const btn = document.getElementById('reset-btn');
  if (!btn) return;
  btn.addEventListener('click', resetAll);
}

initResetButton();