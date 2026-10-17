// ============================================================
// ВАРД — UI
// ============================================================
import {
  parseWardBonus, calculateWard,
} from './ward-calc.js';

// ============ СОСТОЯНИЕ ============
const state = {
  lang: 'ru',
  classId: null,
  classHp: 0,
  classPvpHp: 0,
  classMana: 0,
  baseWard: 0,
  specId: null,
  specWard: 0,
  pvpMode: false,
  al: 0, // Возвышения
};

// ============ ДАННЫЕ ============
let allClasses = [];
let allSpecs = [];
let classStats = {}; // { "<id>": { hp, pvp_hp, mana, ward, name } }

const currentLang = () => localStorage.getItem('orna-lang') || 'ru';

async function loadJSON(path, fallback = []) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error(`Не удалось загрузить ${path}:`, e);
    return fallback;
  }
}

async function loadAllData() {
  state.lang = currentLang();
  const [classes, specs, stats] = await Promise.all([
    loadJSON(`../data/classes-${state.lang}.json`),
    loadJSON(`../data/specs-${state.lang}.json`),
    loadJSON(`../data/class-stats-${state.lang}.json`, {}),
  ]);
  allClasses = classes;
  allSpecs = specs;
  classStats = stats;

  console.log('📦 Загружено (ward):');
  console.log('   Классы:', allClasses.length);
  console.log('   Статы классов (ключей):', Object.keys(classStats).filter(k => !k.startsWith('_')).length);
  
  // Проверим, нашёлся ли Deity (id 58)
  const deityCheck = classStats['58'];
  console.log('   Deity (id 58) из JSON:', deityCheck || '❌ НЕ НАЙДЕН');
}

// ============ ПОЛУЧЕНИЕ СТАТОВ (ЕДИНАЯ ФУНКЦИЯ) ============
function getClassStats(clsId, clsName) {
  // 1. Ищем по id
  let s = classStats[String(clsId)];
  
  // 2. Если не нашли — ищем по имени (case-insensitive)
  if (!s && clsName) {
    const nameLower = String(clsName).toLowerCase();
    for (const [k, v] of Object.entries(classStats)) {
      if (k.startsWith('_')) continue;
      if (v.name && String(v.name).toLowerCase() === nameLower) {
        s = v;
        break;
      }
    }
  }

  // 3. Если всё ещё нет — возвращаем нули
  if (!s) return { hp: 0, pvp_hp: 0, mana: 0, ward: 0 };
  
  return {
    hp: s.hp || 0,
    pvp_hp: s.pvp_hp || s.hp || 0,
    mana: s.mana || 0,
    ward: s.ward || 0,
  };
}

// ============ КЛАССЫ ============
function isWardClass(cls) {
  return (cls.tier || 0) === 10;
}

function formatListBonuses(entity, type, lang) {
  const parts = [];
  const n = {
    ru: { ward: 'Вард', bb: 'Узы' },
    en: { ward: 'Ward', bb: 'Bonds' },
  }[lang] || { ward: 'Ward', bb: 'Bonds' };

  if (entity.bestialBondLevel > 0) {
    parts.push(`<span class="bonus-positive">★ ${n.bb} ${entity.bestialBondLevel}</span>`);
  }

  // Вард от класса — из class-stats.json или из effects (fallback)
  const stats = getClassStats(entity.id, entity.name);
  const totalWard = stats.ward || parseWardBonus(entity.effects, lang);

  if (totalWard > 0) {
    parts.push(`<span class="bonus-positive">${n.ward}: ${totalWard}</span>`);
  }

  return parts.join(' · ');
}

function openClassPicker() {
  const lang = currentLang();
  const classes = allClasses
    .filter(isWardClass)
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: lang === 'ru' ? '— нет —' : '— none —', sprite: '' },
    ...classes
  ];

  window.Modal.open({
    title: lang === 'ru' ? 'Класс' : 'Class',
    items: itemsWithEmpty,
    metaFormatter: (it) => {
      if (it.id === '__empty__') return '';
      return formatListBonuses(it, 'class', lang);
    },
    onPick: (cls) => applyClass(cls.id === '__empty__' ? '' : cls.id),
    onClear: () => applyClass('')
  });
}

function applyClass(clsId) {
  state.classId = clsId;
  const cls = allClasses.find(c => String(c.id) === String(clsId));
  const lang = currentLang();

  const iconEl = document.getElementById('class-icon');
  const placeholder = document.getElementById('class-icon-placeholder');
  const textEl = document.getElementById('class-text');
  const bonusEl = document.getElementById('class-bonus');

  if (!cls) {
    state.classId = null;
    state.classHp = 0;
    state.classPvpHp = 0;
    state.classMana = 0;
    state.baseWard = 0;
    textEl.textContent = lang === 'ru' ? '— нет —' : '— none —';
    textEl.classList.remove('custom-select-has-value');
    bonusEl.textContent = '—';
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
    updateHpManaDisplay();
    recalc();
    return;
  }

  state.classId = cls.id;
  const stats = getClassStats(cls.id, cls.name);
  
  // Сохраняем статы в состояние
  state.classHp = stats.hp;
  state.classPvpHp = stats.pvp_hp;
  state.classMana = stats.mana;
  state.baseWard = stats.ward;

  // Визуал
  textEl.textContent = `★${cls.tier || '?'} ${cls.name}`;
  textEl.classList.add('custom-select-has-value');

  if (cls.sprite && iconEl) {
    iconEl.src = cls.sprite;
    iconEl.hidden = false;
    if (placeholder) placeholder.hidden = true;
  } else {
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
  }

  const parts = [];
  if (state.baseWard > 0) parts.push(`Вард: ${state.baseWard}`);
  if (cls.bestialBondLevel > 0) parts.push(`Узы ${cls.bestialBondLevel}`);
  bonusEl.innerHTML = parts.length ? parts.join(' · ') : '—';

  updateHpManaDisplay();
  recalc();
}

// ============ СПЕЦИАЛИЗАЦИИ ============
function isWardSpec(spec) {
  return parseWardBonus(spec.effects, state.lang) > 0;
}

function openSpecPicker() {
  const lang = currentLang();
  const specs = allSpecs
    .filter(isWardSpec)
    .sort((a, b) => a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: lang === 'ru' ? '— нет —' : '— none —', sprite: '' },
    ...specs
  ];

  window.Modal.open({
    title: lang === 'ru' ? 'Специализация' : 'Specialization',
    items: itemsWithEmpty,
    metaFormatter: (it) => {
      if (it.id === '__empty__') return '';
      return formatListBonuses(it, 'spec', lang);
    },
    onPick: (spec) => applySpec(spec.id === '__empty__' ? '' : spec.id),
    onClear: () => applySpec('')
  });
}

function applySpec(specId) {
  state.specId = specId;
  const spec = allSpecs.find(s => s.id === specId);
  const lang = currentLang();

  const iconEl = document.getElementById('spec-icon');
  const placeholder = document.getElementById('spec-icon-placeholder');
  const textEl = document.getElementById('spec-text');
  const bonusEl = document.getElementById('spec-bonus');

  if (!spec) {
    state.specId = null;
    state.specWard = 0;
    textEl.textContent = lang === 'ru' ? '— нет —' : '— none —';
    textEl.classList.remove('custom-select-has-value');
    bonusEl.innerHTML = '—';
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
    recalc();
    return;
  }

  state.specId = spec.id;
  state.specWard = parseWardBonus(spec.effects, lang);

  textEl.textContent = spec.name;
  textEl.classList.add('custom-select-has-value');

  if (spec.sprite && iconEl) {
    iconEl.src = spec.sprite;
    iconEl.hidden = false;
    if (placeholder) placeholder.hidden = true;
  } else {
    if (iconEl) { iconEl.hidden = true; iconEl.removeAttribute('src'); }
    if (placeholder) placeholder.hidden = false;
  }

  const parts = [];
  if (state.specWard > 0) parts.push(`Вард +${state.specWard}%`);
  if (spec.bestialBondLevel > 0) parts.push(`Узы ${spec.bestialBondLevel}`);
  bonusEl.innerHTML = parts.length ? parts.join('<br>') : '—';

  recalc();
}

// ============ HP/МАНА ВИЗУАЛЬНО ============
function updateHpManaDisplay() {
  const hpEl = document.getElementById('ward-hp');
  const manaEl = document.getElementById('ward-mana');
  const locale = state.lang === 'ru' ? 'ru-RU' : 'en-US';
  
  const alMult = Math.pow(1.01, state.al || 0);

  const hp = (state.pvpMode ? state.classPvpHp : state.classHp) * alMult;
  const mana = state.classMana * alMult;

  if (hpEl) hpEl.textContent = Math.round(hp).toLocaleString(locale);
  if (manaEl) manaEl.textContent = Math.round(mana).toLocaleString(locale);
}

// ============ ЭКИПИРОВКА ============
function readEquipment() {
  const rows = document.querySelectorAll('.equipment-row');
  const result = [];
  rows.forEach(row => {
    const hp = parseFloat(row.querySelector('.eq-hp')?.value) || 0;
    const mana = parseFloat(row.querySelector('.eq-mana')?.value) || 0;
    const wardPct = parseFloat(row.querySelector('.eq-ward')?.value) || 0;
    result.push({ hp, mana, wardPct });
  });
  return result;
}

function initEquipmentInputs() {
  document.querySelectorAll('.equipment-row .ward-input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      recalc();
    });
    inp.addEventListener('blur', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v)) v = 0;
      inp.value = v;
      recalc();
    });
  });
}

// ============ ГЕМЫ ============
let gemRowCounter = { weapon: 0, armor: 0 };

function createGemRow(group) {
  gemRowCounter[group]++;
  const num = gemRowCounter[group];
  const lang = currentLang();

  const row = document.createElement('div');
  row.className = 'gem-row';
  row.dataset.group = group;
  row.dataset.rowId = num;

  row.innerHTML = `
    <span class="gem-label">${lang === 'ru' ? 'Гем' : 'Gem'} ${num}</span>
    <div class="gem-field">
      <span class="gem-field-label">${lang === 'ru' ? 'Кол-во' : 'Count'}</span>
      <input type="number" min="0" class="ward-input gem-count" value="0">
    </div>
    <div class="gem-field">
      <span class="gem-field-label">${lang === 'ru' ? 'Хп' : 'HP'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-hp" value="0">
    </div>
    <div class="gem-field">
      <span class="gem-field-label">${lang === 'ru' ? 'Мана' : 'Mana'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-mana" value="0">
    </div>
    <div class="gem-field">
      <span class="gem-field-label">${lang === 'ru' ? 'Вард %' : 'Ward %'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-ward" value="0">
    </div>
    <button type="button" class="gem-remove" title="${lang === 'ru' ? 'Удалить' : 'Remove'}">×</button>
  `;

  row.querySelector('.gem-remove').addEventListener('click', () => {
    row.remove();
    recalc();
  });

  row.querySelectorAll('.ward-input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      recalc();
    });
    inp.addEventListener('blur', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v)) v = 0;
      inp.value = v;
      recalc();
    });
  });

  return row;
}

function readGems(group) {
  const rows = document.querySelectorAll(`#gems-${group}-list .gem-row`);
  const result = [];
  rows.forEach(row => {
    result.push({
      count: parseFloat(row.querySelector('.gem-count')?.value) || 0,
      hp: parseFloat(row.querySelector('.gem-hp')?.value) || 0,
      mana: parseFloat(row.querySelector('.gem-mana')?.value) || 0,
      wardPct: parseFloat(row.querySelector('.gem-ward')?.value) || 0,
    });
  });
  return result;
}

function initGems() {
  const weaponList = document.getElementById('gems-weapon-list');
  const armorList = document.getElementById('gems-armor-list');

  // Стартовая строка в каждой
  if (weaponList) {
    weaponList.innerHTML = '';
    weaponList.appendChild(createGemRow('weapon'));
  }
  if (armorList) {
    armorList.innerHTML = '';
    armorList.appendChild(createGemRow('armor'));
  }

  // Кнопки «+»
  document.querySelectorAll('.add-row-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const list = document.getElementById(`gems-${group}-list`);
      if (list) {
        list.appendChild(createGemRow(group));
        recalc();
      }
    });
  });
}

// ============ ПЕРЕСЧЁТ ============
function recalc() {
  const equipment = readEquipment();
  const gemsWeapon = readGems('weapon');
  const gemsArmor = readGems('armor');

  const alMult = Math.pow(1.01, state.al || 0);

  const hp = (state.pvpMode ? state.classPvpHp : state.classHp) * alMult;
  const mana = state.classMana * alMult;

  const total = calculateWard({
    hp,
    mana,
    baseWard: state.baseWard,
    wardClassPct: 0,
    wardSpecPct: state.specWard || 0,
    equipment,
    gemsWeapon,
    gemsArmor,
  });

  const resultEl = document.getElementById('ward-result');
  const locale = state.lang === 'ru' ? 'ru-RU' : 'en-US';
  if (resultEl) resultEl.textContent = total.toLocaleString(locale);
}

// ============ СБРОС ============
function resetAll() {
  const lang = currentLang();
  const msg = lang === 'ru'
    ? 'Очистить всё? Это действие нельзя отменить.'
    : 'Clear all? This action cannot be undone.';
  if (!window.confirm(msg)) return;

  applyClass('');
  applySpec('');

  document.querySelectorAll('.equipment-row .ward-input').forEach(inp => {
    inp.value = 0;
  });

  const weaponList = document.getElementById('gems-weapon-list');
  const armorList = document.getElementById('gems-armor-list');
  gemRowCounter = { weapon: 0, armor: 0 };
  if (weaponList) {
    weaponList.innerHTML = '';
    weaponList.appendChild(createGemRow('weapon'));
  }
  if (armorList) {
    armorList.innerHTML = '';
    armorList.appendChild(createGemRow('armor'));
  }

  // Сбрасываем PVP
  const pvpCheck = document.getElementById('ward-pvp-check');
  if (pvpCheck) pvpCheck.checked = false;
  state.pvpMode = false;

  updateHpManaDisplay();
  recalc();

  const alInput = document.getElementById('ward-al-input');
  if (alInput) alInput.value = 0;
  state.al = 0;
}

function initResetButton() {
  const btn = document.getElementById('reset-btn');
  if (btn) btn.addEventListener('click', resetAll);
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
async function initWardPage() {
  await loadAllData();

  document.getElementById('class-row-trigger')?.addEventListener('click', openClassPicker);
  document.getElementById('spec-row-trigger')?.addEventListener('click', openSpecPicker);

  // Слушатель PVP
  document.getElementById('ward-pvp-check')?.addEventListener('change', (e) => {
    state.pvpMode = e.target.checked;
    updateHpManaDisplay();
    recalc();
  });

  applyClass('');
  applySpec('');

  initEquipmentInputs();
  initGems();
  initResetButton();

document.getElementById('ward-al-input')?.addEventListener('input', (e) => {
  let v = parseInt(e.target.value) || 0;
  if (v < 0) v = 0;
  if (v > 99) v = 99;
  state.al = v;
  updateHpManaDisplay();
  recalc();
});
}

initWardPage();

// ============ СМЕНА ЯЗЫКА ============
window.addEventListener('orna-lang-changed', async () => {
  // Сохраняем значения
  const savedEquipment = [];
  document.querySelectorAll('.equipment-row').forEach(row => {
    savedEquipment.push({
      hp: row.querySelector('.eq-hp')?.value || '0',
      mana: row.querySelector('.eq-mana')?.value || '0',
      ward: row.querySelector('.eq-ward')?.value || '0',
    });
  });

  const savedGems = { weapon: [], armor: [] };
  ['weapon', 'armor'].forEach(group => {
    const list = document.getElementById(`gems-${group}-list`);
    if (!list) return;
    list.querySelectorAll('.gem-row').forEach(row => {
      savedGems[group].push({
        count: row.querySelector('.gem-count')?.value || '0',
        hp: row.querySelector('.gem-hp')?.value || '0',
        mana: row.querySelector('.gem-mana')?.value || '0',
        ward: row.querySelector('.gem-ward')?.value || '0',
      });
    });
  });

  const savedClassId = state.classId;
  const savedSpecId = state.specId;
  const savedPvp = state.pvpMode;
  const savedAl = state.al;

  await loadAllData();

  applyClass(savedClassId || '');
  applySpec(savedSpecId || '');

    // Восстанавливаем PVP
  const pvpCheck = document.getElementById('ward-pvp-check');
  if (pvpCheck) pvpCheck.checked = savedPvp;
  state.pvpMode = savedPvp;

  // Восстанавливаем AL
  const alInput = document.getElementById('ward-al-input');
  if (alInput) alInput.value = savedAl || 0;
  state.al = savedAl || 0;

  // Восстанавливаем экипировку
  document.querySelectorAll('.equipment-row').forEach((row, i) => {
    if (!savedEquipment[i]) return;
    const hpInp = row.querySelector('.eq-hp');
    const manaInp = row.querySelector('.eq-mana');
    const wardInp = row.querySelector('.eq-ward');
    if (hpInp) hpInp.value = savedEquipment[i].hp;
    if (manaInp) manaInp.value = savedEquipment[i].mana;
    if (wardInp) wardInp.value = savedEquipment[i].ward;
  });

  // Восстанавливаем гемы
  gemRowCounter = { weapon: 0, armor: 0 };
  ['weapon', 'armor'].forEach(group => {
    const list = document.getElementById(`gems-${group}-list`);
    if (!list) return;
    list.innerHTML = '';
    const saved = savedGems[group].length ? savedGems[group] : [null];
    saved.forEach(g => {
      const row = createGemRow(group);
      if (g) {
        row.querySelector('.gem-count').value = g.count;
        row.querySelector('.gem-hp').value = g.hp;
        row.querySelector('.gem-mana').value = g.mana;
        row.querySelector('.gem-ward').value = g.ward;
      }
      list.appendChild(row);
    });
  });

  updateHpManaDisplay();
  recalc();
});