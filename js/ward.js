// ============================================================
// ВАРД — UI (Ручной ввод)
// ============================================================
import { calculateWard } from './ward-calc.js';

const state = { lang: 'ru' };
const currentLang = () => localStorage.getItem('orna-lang') || 'ru';

// ============ ЭКИПИРОВКА ============
function readEquipment() {
  const rows = document.querySelectorAll('.equipment-row');
  const result = {};
  rows.forEach(row => {
    const slot = row.dataset.slot;
    const hp = parseFloat(row.querySelector('.eq-hp')?.value) || 0;
    const mana = parseFloat(row.querySelector('.eq-mana')?.value) || 0;
    const wardPct = parseFloat(row.querySelector('.eq-ward')?.value) || 0;
    result[slot] = { hp, mana, wardPct };
  });
  return result;
}

// ============ ГЕМЫ ============
let gemRowCounter = { weapon: 0, head: 0, body: 0, legs: 0, 'accessory-1': 0, 'accessory-2': 0 };

function createGemRow(group, data = null) {
  gemRowCounter[group] = (gemRowCounter[group] || 0) + 1;
  const num = gemRowCounter[group];
  const lang = currentLang();

  const row = document.createElement('div');
  row.className = 'gem-row';
  row.dataset.group = group;

  row.innerHTML = `
    <span class="gem-label">${num}</span>
    <div class="gem-field">
      <span class="gem-field-label" data-ru="Кол-во" data-en="Count">${lang === 'ru' ? 'Кол-во' : 'Count'}</span>
      <input type="number" min="1" class="ward-input gem-count" value="1">
    </div>
    <div class="gem-field">
      <span class="gem-field-label" data-ru="Хп" data-en="HP">${lang === 'ru' ? 'Хп' : 'HP'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-hp" value="0">
    </div>
    <div class="gem-field">
      <span class="gem-field-label" data-ru="Мана" data-en="Mana">${lang === 'ru' ? 'Мана' : 'Mana'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-mana" value="0">
    </div>
    <div class="gem-field">
      <span class="gem-field-label" data-ru="Вард %" data-en="Ward %">${lang === 'ru' ? 'Вард %' : 'Ward %'}</span>
      <input type="text" inputmode="decimal" class="ward-input gem-ward" value="0">
    </div>
    <button type="button" class="gem-remove" title="${lang === 'ru' ? 'Удалить' : 'Remove'}">×</button>
  `;

  if (data) {
    row.querySelector('.gem-count').value = data.count || 1;
    row.querySelector('.gem-hp').value = data.hp || 0;
    row.querySelector('.gem-mana').value = data.mana || 0;
    // ИСПРАВЛЕНО: data.ward вместо data.wardPct
    row.querySelector('.gem-ward').value = data.ward || 0; 
  }

  row.querySelectorAll('input[type="text"]').forEach(inp => {
    inp.addEventListener('input', () => {
      let val = inp.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
        val = val.substring(1);
      }
      inp.value = val;
      recalc();
    });
  });

  row.querySelector('.gem-remove').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    row.remove();
    recalc();
  });

  return row;
}

function readGems(listId) {
  const list = document.getElementById(listId);
  if (!list) return [];
  
  const rows = list.querySelectorAll('.gem-row');
  const result = [];
  rows.forEach(row => {
    const slot = listId.replace('gems-', '').replace('-list', '');
    result.push({
      slot: slot,
      count: parseFloat(row.querySelector('.gem-count')?.value) || 0,
      hp: parseFloat(row.querySelector('.gem-hp')?.value) || 0,
      mana: parseFloat(row.querySelector('.gem-mana')?.value) || 0,
      wardPct: parseFloat(row.querySelector('.gem-ward')?.value) || 0,
    });
  });
  return result;
}

// ============ ПЕРЕСЧЁТ ============
function recalc() {
  const hp = parseFloat(document.getElementById('input-hp')?.value) || 0;
  const mana = parseFloat(document.getElementById('input-mana')?.value) || 0;
  const al = parseFloat(document.getElementById('input-al')?.value) || 0;

  const equipment = readEquipment();
  
  const gemsWeapon = readGems('gems-weapon-list');
  const gemsHead = readGems('gems-head-list');
  const gemsBody = readGems('gems-body-list');
  const gemsLegs = readGems('gems-legs-list');
  const gemsAcc1 = readGems('gems-accessory-1-list');
  const gemsAcc2 = readGems('gems-accessory-2-list');

  const allGems = [...gemsWeapon, ...gemsHead, ...gemsBody, ...gemsLegs, ...gemsAcc1, ...gemsAcc2];

  const total = calculateWard({
    hp: hp,
    mana: mana,
    al: al,
    equipment: equipment,
    gemsWeapon: allGems,
    gemsArmor: [],
  });

  const resultEl = document.getElementById('ward-result');
  const locale = state.lang === 'ru' ? 'ru-RU' : 'en-US';
  if (resultEl) resultEl.textContent = total.toLocaleString(locale);
}

// ============ СПОЙЛЕР: ЧИСТЫЕ СТАТЫ ============
function updateCleanSpoilerResult() {
  const hp = parseFloat(document.getElementById('clean-input-hp')?.value) || 0;
  const mana = parseFloat(document.getElementById('clean-input-mana')?.value) || 0;
  const ward = parseFloat(document.getElementById('clean-input-ward')?.value) || 0;

  const cleanGems = readGems('clean-gems-list');
  
  let gemHp = 0, gemMana = 0, gemWard = 0;
  cleanGems.forEach(g => {
    gemHp += g.hp * g.count;
    gemMana += g.mana * g.count;
    gemWard += g.wardPct * g.count;
  });

  const cleanHp = Math.max(0, hp - gemHp);
  const cleanMana = Math.max(0, mana - gemMana);
  const cleanWard = Math.max(0, ward - gemWard);

  const resultEl = document.getElementById('clean-result-text');
  if (resultEl) {
    resultEl.textContent = `${cleanHp} / ${cleanMana} / ${cleanWard}%`;
  }
}

function createCleanGemRow() {
  const list = document.getElementById('clean-gems-list');
  if (!list) return;

  const row = document.createElement('div');
  row.className = 'gem-row';
  
  row.innerHTML = `
    <div class="equipment-fields">
      <label class="eq-field">
        <span class="gem-field-label">Кол-во</span>
        <input type="number" min="1" class="ward-input gem-count" value="1">
      </label>
      <label class="eq-field">
        <span class="gem-field-label">Хп</span>
        <input type="text" inputmode="decimal" class="ward-input gem-hp" value="0">
      </label>
      <label class="eq-field">
        <span class="gem-field-label">Мана</span>
        <input type="text" inputmode="decimal" class="ward-input gem-mana" value="0">
      </label>
      <label class="eq-field">
        <span class="gem-field-label">Вард %</span>
        <input type="text" inputmode="decimal" class="ward-input gem-ward" value="0">
      </label>
    </div>
    <button type="button" class="gem-remove">×</button>
  `;

  row.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      updateCleanSpoilerResult();
    });
  });

  row.querySelector('.gem-remove').addEventListener('click', () => {
    row.remove();
    updateCleanSpoilerResult();
  });

  list.appendChild(row);
  updateCleanSpoilerResult();
}

function initCleanSpoiler() {
  document.querySelectorAll('#clean-input-hp, #clean-input-mana, #clean-input-ward').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      updateCleanSpoilerResult();
    });
    inp.addEventListener('blur', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v)) v = 0;
      inp.value = v;
      updateCleanSpoilerResult();
    });
  });

  document.getElementById('clean-add-gem')?.addEventListener('click', createCleanGemRow);

  const applyBtn = document.getElementById('apply-clean-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const slot = document.getElementById('clean-slot-select').value;
      const hp = parseFloat(document.getElementById('clean-input-hp')?.value) || 0;
      const mana = parseFloat(document.getElementById('clean-input-mana')?.value) || 0;
      const ward = parseFloat(document.getElementById('clean-input-ward')?.value) || 0;

      const cleanGems = readGems('clean-gems-list');
      let gemHp = 0, gemMana = 0, gemWard = 0;
      cleanGems.forEach(g => {
        gemHp += g.hp * g.count;
        gemMana += g.mana * g.count;
        gemWard += g.wardPct * g.count;
      });

      const cleanHp = Math.max(0, hp - gemHp);
      const cleanMana = Math.max(0, mana - gemMana);
      const cleanWard = Math.max(0, ward - gemWard);

      const row = document.querySelector(`.equipment-row[data-slot="${slot}"]`);
      if (row) {
        row.querySelector('.eq-hp').value = cleanHp;
        row.querySelector('.eq-mana').value = cleanMana;
        row.querySelector('.eq-ward').value = cleanWard;
        recalc();
      }

      const details = document.querySelector('.clean-spoiler');
      if (details) details.removeAttribute('open');
    });
  }
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
function initWardPage() {
  state.lang = currentLang();

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('ward-input')) {
      e.target.value = e.target.value.replace(',', '.').replace(/[^0-9.\-]/g, '');
      if (e.target.closest('.clean-spoiler')) {
        updateCleanSpoilerResult();
      } else {
        recalc();
      }
    }
  });

  document.querySelectorAll('.add-row-btn[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const list = document.getElementById(`gems-${group}-list`);
      if (list) {
        list.appendChild(createGemRow(group));
        recalc();
      }
    });
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    const lang = currentLang();
    const msg = lang === 'ru' ? 'Очистить всё?' : 'Clear all?';
    if (!window.confirm(msg)) return;

    document.getElementById('input-hp').value = 0;
    document.getElementById('input-mana').value = 0;
    document.getElementById('input-al').value = 0;

    document.querySelectorAll('.equipment-row .ward-input').forEach(inp => inp.value = 0);
    
    document.querySelectorAll('.ward-gems-list').forEach(list => list.innerHTML = '');
    gemRowCounter = { weapon: 0, head: 0, body: 0, legs: 0, 'accessory-1': 0, 'accessory-2': 0 };
    
    const cleanHp = document.getElementById('clean-input-hp');
    const cleanMana = document.getElementById('clean-input-mana');
    const cleanWard = document.getElementById('clean-input-ward');
    const cleanList = document.getElementById('clean-gems-list');
    if (cleanHp) cleanHp.value = 0;
    if (cleanMana) cleanMana.value = 0;
    if (cleanWard) cleanWard.value = 0;
    if (cleanList) cleanList.innerHTML = '';
    updateCleanSpoilerResult();

    recalc();
  });

  initCleanSpoiler();

  document.addEventListener('click', () => {
    recalc();
  });

  recalc();
}

initWardPage();

// ============ КНОПКА ПОМОЩИ В ЭКИПИРОВКЕ ============
document.getElementById('equip-help-btn')?.addEventListener('click', () => {
  const lang = currentLang();
  const popup = document.getElementById('calc-popup');
  const popupTitle = document.getElementById('calc-popup-title');
  const popupBody = document.getElementById('calc-popup-body');
  
  if (!popup || !popupTitle || !popupBody) return;

  const titleRu = "Как заполнять экипировку";
  const titleEn = "How to fill equipment";

  const textRu = `
    <p>Вставляем значения с экипированных предметов (можно посмотреть в окне с экипировкой под самим предметом). Можно вставлять значения сразу с геммами.</p>
    <p>Если хотите узнать статы предмета без гемм, воспользуйтесь калькулятором чистых статов. Оттуда можно вставить получившееся значение сразу в калькулятор варда по кнопке.</p>
    <p>Если хотите смоделировать возможное количество варда, внесите ниже геммы, которые не вставлены в предмет. В этом случае лучше использовать чистые статы.</p>
  `;
  
  const textEn = `
    <p>Enter the values from your equipped items (you can find them in the equipment window below the item itself). You can enter values with adornments already included.</p>
    <p>If you want to know the stats of an item without adornments, use the clean stats calculator. From there, you can apply the calculated value directly to the ward calculator using the button.</p>
    <p>If you want to simulate the potential amount of ward, enter the adornments that are not inserted into the item below. In this case, it is better to use clean stats.</p>
  `;

  popupTitle.textContent = lang === 'ru' ? titleRu : titleEn;
  popupBody.innerHTML = lang === 'ru' ? textRu : textEn;
  
  popup.removeAttribute('hidden');
});

// Закрытие попапа
document.querySelector('.calc-popup-close')?.addEventListener('click', () => {
  document.getElementById('calc-popup')?.setAttribute('hidden', '');
});

// Закрытие по клику вне окна
document.getElementById('calc-popup')?.addEventListener('click', (e) => {
  if (e.target.id === 'calc-popup') {
    e.target.setAttribute('hidden', '');
  }
});

// Закрытие попапа
document.querySelector('.calc-popup-close')?.addEventListener('click', () => {
  document.getElementById('calc-popup')?.setAttribute('hidden', '');
});

// Закрытие по клику вне окна
document.getElementById('calc-popup')?.addEventListener('click', (e) => {
  if (e.target.id === 'calc-popup') {
    e.target.setAttribute('hidden', '');
  }
});

// ============ СМЕНА ЯЗЫКА ============
window.addEventListener('orna-lang-changed', () => {
  state.lang = currentLang();
  
  const savedGems = {};
  document.querySelectorAll('.ward-gems-list').forEach(list => {
    const id = list.id;
    savedGems[id] = [];
    list.querySelectorAll('.gem-row').forEach(row => {
      savedGems[id].push({
        count: row.querySelector('.gem-count')?.value,
        hp: row.querySelector('.gem-hp')?.value,
        mana: row.querySelector('.gem-mana')?.value,
        ward: row.querySelector('.gem-ward')?.value,
      });
    });
  });

  document.querySelectorAll('.ward-gems-list').forEach(list => {
    const id = list.id;
    if (!savedGems[id] || savedGems[id].length === 0) return;
    
    list.innerHTML = '';
    const group = id.replace('gems-', '').replace('-list', '');
    gemRowCounter[group] = 0;
    
    savedGems[id].forEach(g => {
      const row = createGemRow(group, g);
      list.appendChild(row);
    });
  });

  document.querySelectorAll('[data-ru][data-en]').forEach(el => {
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'OPTION') return;
    
    const ruText = el.getAttribute('data-ru');
    const enText = el.getAttribute('data-en');
    if (ruText && enText) {
      el.textContent = state.lang === 'ru' ? ruText : enText;
    }
  });

  recalc();
});