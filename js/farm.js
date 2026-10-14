// ============================================================
// ФАРМ — ЛОГИКА
// ============================================================

console.log('🌾 Farm page loaded');

// ============ СОСТОЯНИЕ ============
const farmState = {
  steps: { 3000: false, 6000: false },
};

// ============ ХРАМЫ (множители) ============
const TEMPLES = [
  {
    id: 'temple-luck',
    name: 'Храм удачи',
    nameEn: 'Temple of Luck',
    effect: 'Удача ×2',
    effectEn: 'Luck ×2',
    icon: '',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 2 },
  },
  {
    id: 'temple-knowledge',
    name: 'Храм знаний',
    nameEn: 'Temple of Knowledge',
    effect: 'Опыт ×1.15',
    effectEn: 'Exp ×1.15',
    icon: '',
    multipliers: { orns: 1, gold: 1, exp: 1.15, luck: 1 },
  },
  {
    id: 'temple-wealth',
    name: 'Храм богатства',
    nameEn: 'Temple of Wealth',
    effect: 'Орны ×1.2 · Золото ×1.2',
    effectEn: 'Orns ×1.2 · Gold ×1.2',
    icon: '',
    multipliers: { orns: 1.2, gold: 1.2, exp: 1, luck: 1 },
  },
];

// ============ СТАТУИ (множители) ============
const STATUES = [
  {
    id: 'statue-luck',
    name: 'Статуя удачи',
    nameEn: 'Shrine of Luck',
    effect: 'Орны ×2 · Золото ×2 · Удача ×2',
    effectEn: 'Orns ×2 · Gold ×2 · Luck ×2',
    icon: 'https://playorna.com/static/img/items/shrine_of_luck.png',
    multipliers: { orns: 2, gold: 2, exp: 1, luck: 2 },
  },
  {
    id: 'statue-wisdom',
    name: 'Статуя мудрости',
    nameEn: 'Shrine of Wisdom',
    effect: 'Опыт ×2',
    effectEn: 'Exp ×2',
    icon: 'https://playorna.com/static/img/items/shrine_of_wisdom.png',
    multipliers: { orns: 1, gold: 1, exp: 2, luck: 1 },
  },
];

// ============ ИВЕНТЫ (2×3) ============
const EVENTS = [
  { id: 'event-enlightenment', name: 'Дни просветления', nameEn: 'Days of Enlightenment',
    multipliers: { orns: 1, gold: 1, exp: 1.25, luck: 1 } },
  { id: 'event-happy', name: 'Счастливые дни', nameEn: 'Happy Days',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 1.2 } },
  { id: 'event-ornabirth', name: 'Орнабилей', nameEn: 'Ornabirth',
    multipliers: { orns: 1.2, gold: 1.2, exp: 1.2, luck: 1 } },
  { id: 'event-ornolad', name: 'Орнолад', nameEn: 'Ornolad',
    multipliers: { orns: 1.25, gold: 1, exp: 1, luck: 1 } },
  { id: 'event-cave', name: 'Исследование пещер', nameEn: 'Cave Exploration',
    multipliers: { orns: 1.25, gold: 1, exp: 1, luck: 1 } },
  { id: 'event-witch', name: 'Ведьмина лоза', nameEn: 'Witch Vine',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 4 } },
];

// ============ РАСХОДНИКИ (хардкод, часть) ============
const CONSUMABLES_STATIC = [
  { id: 'cons-exp-potion', name: 'Зелье опыта', nameEn: 'Exp Potion',
    effect: 'Опыт ×2', effectEn: 'Exp ×2', icon: '',
    multipliers: { orns: 1, gold: 1, exp: 2, luck: 1 } },
  { id: 'cons-chervonets', name: 'Неразменный червонец', nameEn: 'Chervonets',
    effect: 'Золото ×2', effectEn: 'Gold ×2', icon: '',
    multipliers: { orns: 1, gold: 2, exp: 1, luck: 1 } },
  { id: 'cons-lucky-coin', name: 'Счастливая монета', nameEn: 'Lucky Coin',
    effect: 'Орны ×2', effectEn: 'Orns ×2', icon: '',
    multipliers: { orns: 2, gold: 1, exp: 1, luck: 1 } },
  { id: 'cons-vine', name: 'Лоза', nameEn: 'Vine',
    effect: 'Удача ×1.5', effectEn: 'Luck ×1.5', icon: '',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 1.5 } },
  { id: 'cons-candle', name: 'Сакральная свеча', nameEn: 'Sacred Candle',
    effect: 'Опыт ×1.05', effectEn: 'Exp ×1.05', icon: '',
    multipliers: { orns: 1, gold: 1, exp: 1.05, luck: 1 } },
  { id: 'cons-vulcan', name: 'Напиток Вулкана', nameEn: 'Vulcan Drink',
    effect: 'Всё ×1.2', effectEn: 'All ×1.2', icon: '',
    multipliers: { orns: 1.2, gold: 1.2, exp: 1.2, luck: 1.2 } },
];

// ============ АСТРОДЕРЕВО (множители) ============
const ASTRAL_TREE = [
  { id: 'astral-luck', name: 'Бонус удачи', nameEn: 'Luck Bonus',
    multipliers: { orns: 1, gold: 1, exp: 1, luck: 2 } },
  { id: 'astral-orns', name: 'Бонус орн', nameEn: 'Orns Bonus',
    multipliers: { orns: 1.15, gold: 1, exp: 1, luck: 1 } },
  { id: 'astral-gold', name: 'Бонус золота', nameEn: 'Gold Bonus',
    multipliers: { orns: 1, gold: 1.15, exp: 1, luck: 1 } },
  { id: 'astral-exp', name: 'Бонус опыта', nameEn: 'Exp Bonus',
    multipliers: { orns: 1, gold: 1, exp: 1.05, luck: 1 } },
];

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

// ============ РЕНДЕР ПРОСТОЙ СЕТКИ ============
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

    return `
      <label class="consumable-item">
        <input type="checkbox" data-${group}-id="${item.id}">
        ${iconHtml}
        <div class="consumable-info">
          <div class="consumable-name">${lang === 'ru' ? item.name : (item.nameEn || item.name)}</div>
          <div class="consumable-effect">${lang === 'ru' ? item.effect : (item.effectEn || item.effect)}</div>
        </div>
      </label>
    `;
  }).join('');

  gridEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => recalcFarm());
  });
}

// ============ РЕНДЕР ИВЕНТОВ ============
function renderEventsGrid(gridEl, events) {
  if (!gridEl) return;
  const lang = localStorage.getItem('orna-lang') || 'ru';

  gridEl.innerHTML = events.map(ev => `
    <label class="event-item">
      <input type="checkbox" data-event-id="${ev.id}">
      <span>${lang === 'ru' ? ev.name : (ev.nameEn || ev.name)}</span>
    </label>
  `).join('');

  gridEl.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => recalcFarm());
  });
}

// ============ ПЕРЕСЧЁТ ============
function recalcFarm() {
  // 1. Настрадание — прибавляется к 100%
  const anguish = {
    orns: parseFloat(document.querySelector('.anguish-input[data-currency="orns"]')?.value) || 0,
    gold: parseFloat(document.querySelector('.anguish-input[data-currency="gold"]')?.value) || 0,
    exp:  parseFloat(document.querySelector('.anguish-input[data-currency="exp"]')?.value)  || 0,
    luck: parseFloat(document.querySelector('.anguish-input[data-currency="luck"]')?.value) || 0,
  };

  const base = {
    orns: 100 + anguish.orns,
    gold: 100 + anguish.gold,
    exp:  100 + anguish.exp,
    luck: 100 + anguish.luck,
  };

  // 2. Множители
  const mult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  function applyMultipliers(m) {
    if (!m) return;
    mult.orns *= m.orns ?? 1;
    mult.gold *= m.gold ?? 1;
    mult.exp  *= m.exp  ?? 1;
    mult.luck *= m.luck ?? 1;
  }

  // Шаги
  if (farmState.steps['3000']) applyMultipliers({ exp: 1.25 });
  if (farmState.steps['6000']) applyMultipliers({ orns: 1.25, luck: 1.25 });

  // Храмы
  document.querySelectorAll('#temples-grid input[type="checkbox"]:checked').forEach(chk => {
    const t = TEMPLES.find(x => x.id === chk.dataset.templeId);
    if (t) applyMultipliers(t.multipliers);
  });

  // Статуи
  document.querySelectorAll('#statues-grid input[type="checkbox"]:checked').forEach(chk => {
    const s = STATUES.find(x => x.id === chk.dataset.statueId);
    if (s) applyMultipliers(s.multipliers);
  });

  // Ивенты
  document.querySelectorAll('#events-grid input[type="checkbox"]:checked').forEach(chk => {
    const e = EVENTS.find(x => x.id === chk.dataset.eventId);
    if (e) applyMultipliers(e.multipliers);
  });

  // Расходники
  document.querySelectorAll('#consumables-grid input[type="checkbox"]:checked').forEach(chk => {
    const c = CONSUMABLES_STATIC.find(x => x.id === chk.dataset.consumableId);
    if (c) applyMultipliers(c.multipliers);
  });

    // Астродерево
  document.querySelectorAll('#astral-grid input[type="checkbox"]:checked').forEach(chk => {
    const a = ASTRAL_TREE.find(x => x.id === chk.dataset.astralId);
    if (a) applyMultipliers(a.multipliers);
  });

  // 3. Итог
  const results = {
    orns: base.orns * mult.orns,
    gold: base.gold * mult.gold,
    exp:  base.exp  * mult.exp,
    luck: base.luck * mult.luck,
  };

  updateFarmResults(results);
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
}

// ============ ИНИЦИАЛИЗАЦИЯ ============
function initFarmPage() {
  renderSimpleGrid(document.getElementById('temples-grid'), TEMPLES, 'temple');
  renderSimpleGrid(document.getElementById('statues-grid'), STATUES, 'statue');
  renderEventsGrid(document.getElementById('events-grid'), EVENTS);
  renderSimpleGrid(document.getElementById('consumables-grid'), CONSUMABLES_STATIC, 'consumable');
  renderSimpleGrid(document.getElementById('astral-grid'), ASTRAL_TREE, 'astral');

  initSteps();

  document.querySelectorAll('.anguish-input').forEach(inp => {
    inp.addEventListener('input', () => {
      let v = parseFloat(inp.value);
      if (isNaN(v) || v < 0) v = 0;
      inp.value = v;
      recalcFarm();
    });
  });

  recalcFarm();
}

initFarmPage();