// ============================================================
// ФАРМ — ЛОГИКА
// ============================================================

console.log('🌾 Farm page loaded');

// ============ ДАННЫЕ ============
let allItems = [];
let allClasses = [];
let allSpecs = [];
let allFollowers = [];

// ============ КАЧЕСТВО ============
const QUALITY_MULT = {
  common:       1.0,
  superior:     1.1,
  famed:        1.15,
  legendary:    1.2,
  ornate:       1.25,
  masterforged: 1.3,
  demonforged:  1.4,
  godforged:    1.5,
  atonement:    1.5,
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
};

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
  allItems = items;
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

// ============ ПАРСИНГ ============
function parseFarmBonuses(text) {
  const m = { orns: 1, gold: 1, exp: 1, luck: 1 };
  if (typeof text !== 'string') return m;

  const patterns = [
    { key: 'orns', re: /(?:Бонус орн|Orn Bonus|Орны|Orns)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'gold', re: /(?:Бонус золота|Gold Bonus|Золото|Gold)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'exp',  re: /(?:Бонус опыта|EXP Bonus|Опыт(?!\s+на\s+ходу)|Experience)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'luck', re: /(?:Бонус удачи|Luck Bonus|Удача|Luck)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
  ];

  patterns.forEach(({ key, re }) => {
    let match;
    while ((match = re.exec(text)) !== null) {
      const pct = parseFloat(match[1]);
      m[key] *= 1 + pct / 100;
    }
  });

  return m;
}

function extractOurBonuses(text, lang) {
  if (typeof text !== 'string') return [];

  const labels = {
    ru: { orns: 'Орны', gold: 'Золото', exp: 'Опыт', luck: 'Удача' },
    en: { orns: 'Orns', gold: 'Gold', exp: 'Exp', luck: 'Luck' },
  };
  const L = labels[lang] || labels.ru;

  const result = [];
  const patterns = [
    { key: 'orns', re: /(?:Бонус орн|Orn Bonus|Орны|Orns)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'gold', re: /(?:Бонус золота|Gold Bonus|Золото|Gold)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'exp',  re: /(?:Бонус опыта|EXP Bonus|Опыт(?!\s+на\s+ходу)|Experience)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
    { key: 'luck', re: /(?:Бонус удачи|Luck Bonus|Удача|Luck)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/gi },
  ];

  patterns.forEach(({ key, re }) => {
    let match;
    while ((match = re.exec(text)) !== null) {
      result.push(`${L[key]} +${match[1]}%`);
    }
  });

  return result;
}

// ============ РАСХОДНИКИ ============
function getFarmConsumables() {
  return allItems
    .filter(item => {
      const facts = item.facts || [];
      const slotFact = facts.find(f => f.label === 'Слот' || f.label === 'Place');
      const slot = (slotFact?.value || '').toLowerCase();
      const isRealSlot = slot !== '' &&
                         slot !== 'расходник' &&
                         slot !== 'consumable' &&
                         slot !== 'useable' &&
                         slot !== 'curative' &&
                         slot !== 'field';
      if (isRealSlot) return false;

      const effects = item.effects || [];
      return effects.some(e =>
        typeof e === 'string' &&
        /Орн|Orn|Золот|Gold|Удач|Luck|Опыт|Experien|EXP/i.test(e)
      );
    })
    .map(item => {
      const m = { orns: 1, gold: 1, exp: 1, luck: 1 };
      (item.effects || []).forEach(eff => {
        const p = parseFarmBonuses(eff);
        m.orns *= p.orns;
        m.gold *= p.gold;
        m.exp  *= p.exp;
        m.luck *= p.luck;
      });

      return {
        id: item.id,
        name: item.name,
        nameEn: item.name,
        icon: item.sprite,
        multipliers: m,
      };
    });
}

function getAllConsumables() {
  return getFarmConsumables()
    .map(c => {
      if (/непоколебимой приверженности|undying allegiance/i.test(c.name)) {
        return { ...c, name: 'PoUA', nameEn: 'PoUA' };
      }
      return c;
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
function getBBLevels(follower) {
  const sections = follower.sections || [];
  const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
  return bbSection?.texts || [];
}

function hasFarmBonus(follower) {
  return getBBLevels(follower).some(line => {
    if (typeof line !== 'string') return false;
    const patterns = [
      /(?:Бонус орн|Orn Bonus|Орны|Orns)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/i,
      /(?:Бонус золота|Gold Bonus|Золото|Gold)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/i,
      /(?:Бонус опыта|EXP Bonus|Опыт(?!\s+на\s+ходу)|Experience)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/i,
      /(?:Бонус удачи|Luck Bonus|Удача|Luck)\s*[:\s]\s*\+?(\d+(?:\.\d+)?)%/i,
    ];
    return patterns.some(re => re.test(line));
  });
}

function getAvailableBB() {
  const classSel = document.getElementById('class-select');
  const specSel = document.getElementById('spec-select');
  const cls = allClasses.find(c => String(c.id) === classSel?.value);
  const spec = allSpecs.find(s => s.id === specSel?.value);
  const fromClass = cls?.bestialBondLevel || 0;
  const fromSpec = spec?.bestialBondLevel || 0;

  // Узы с мнемов (+1 если есть хоть один)
  const mnemVals = getMnemValues();
  const fromMnems = mnemVals.bonds > 0 ? 1 : 0;

  return Math.min(3, Math.max(fromClass, fromSpec, fromMnems));
}

function getFollowerMultiplier(follower, bbLevel) {
  if (bbLevel <= 0) return { orns: 1, gold: 1, exp: 1, luck: 1 };

  const levels = getBBLevels(follower);
  let total = { orns: 1, gold: 1, exp: 1, luck: 1 };

  for (let lvl = 1; lvl <= bbLevel; lvl++) {
    const line = levels.find(t =>
      new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
    );
    if (!line) continue;
    const m = parseFarmBonuses(line);
    total.orns *= m.orns;
    total.gold *= m.gold;
    total.exp  *= m.exp;
    total.luck *= m.luck;
  }

  return total;
}

function openFollowerPicker() {
  const availableBB = getAvailableBB();
  if (availableBB === 0) return;

  const pets = allFollowers
    .filter(hasFarmBonus)
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  const itemsWithEmpty = [
    { id: '__empty__', name: 'Пусто', sprite: '', tier: null, effects: [] },
    ...pets,
  ];

  window.Modal.open({
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

function initMnemsFarm() {
  document.querySelectorAll('.mnem-select').forEach(sel => {
    const mnem = sel.dataset.mnem;
    const row = sel.dataset.row;
    const input = document.querySelector(
      `.mnem-input[data-mnem="${mnem}"][data-row="${row}"]`
    );

    // Инициализация при загрузке
    function updateInputState() {
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
      }
    }

    updateInputState();

    sel.addEventListener('change', () => {
      updateInputState();
      updateFollowerLock();
      recalcFarm();
    });

    input.addEventListener('input', () => {
      const val = parseFloat(input.value) || 0;
      const min = parseFloat(input.min) || 0;
      const max = parseFloat(input.max) || 100;
      const isInvalid = val > 0 && (val < min || val > max);
      input.classList.toggle('is-error', isInvalid);
      recalcFarm();
    });
  });
}

// ============ ЗАВИСИМОСТЬ ЛЕВОГО МНЕМА ОТ СПЕЦИАЛИЗАЦИИ ============
const ORACLE_SPECS = ['oracle-5', 'great-oracle'];

function updateLeftMnemLock() {
  const leftMnemSlot = document.querySelector('[data-slot="mnem-1"]');
  if (!leftMnemSlot) return;

  const specSel = document.getElementById('spec-select');
  const unlocked = ORACLE_SPECS.includes(specSel?.value);

  leftMnemSlot.classList.toggle('is-locked', !unlocked);

  // Селекты и поля ввода
  leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => {
    sel.disabled = !unlocked;
  });
  leftMnemSlot.querySelectorAll('.mnem-input').forEach(inp => {
    inp.disabled = !unlocked;
  });

  if (!unlocked) {
    // Сбрасываем значения
    leftMnemSlot.querySelectorAll('.mnem-select').forEach(sel => sel.value = '');
    leftMnemSlot.querySelectorAll('.mnem-input').forEach(inp => {
      inp.value = '';
      inp.disabled = true;
      inp.classList.remove('is-error');
    });
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

  const base = {
    orns: 100 + anguish.orns,
    gold: 100 + anguish.gold,
    exp:  100 + anguish.exp,
    luck: 100 + anguish.luck,
  };

  const mult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  function applyMultipliers(m) {
    if (!m) return;
    mult.orns *= m.orns ?? 1;
    mult.gold *= m.gold ?? 1;
    mult.exp  *= m.exp  ?? 1;
    mult.luck *= m.luck ?? 1;
  }

  // Специализация
  const specSel = document.getElementById('spec-select');
  const selectedSpec = allSpecs.find(s => s.id === specSel?.value);
  if (selectedSpec?.multipliers) {
    applyMultipliers(selectedSpec.multipliers);
  }

  // Мнемы
  const mnemVals = getMnemValues();
  const accBoost = 1 + (mnemVals.acc || 0) / 100;

    // Проверяем, два ли одноручных оружия
  const w1El = document.querySelector('[data-slot="weapon-1"]');
  const w2El = document.querySelector('[data-slot="weapon-2"]');
  const w1Item = w1El?.dataset.itemId ? allItems.find(i => i.id === w1El.dataset.itemId) : null;
  const w2Item = w2El?.dataset.itemId ? allItems.find(i => i.id === w2El.dataset.itemId) : null;

  const w2Mode = w2El?.querySelector('.slot-mode-toggle')?.dataset.mode || 'weapon';
  const bothOneHand = w1Item && w2Item && w2Mode === 'weapon' &&
                       !isTwoHanded(w1Item) && !isTwoHanded(w2Item);

  const DUAL_WIELD_PENALTY = 0.65;

  // Все слоты экипировки
  document.querySelectorAll('.slot[data-item-id]').forEach(slotEl => {
    const slotKey = slotEl.dataset.slot;
    if (slotKey === 'mnem-1' || slotKey === 'mnem-2') return;

    const item = allItems.find(i => i.id === slotEl.dataset.itemId);
    if (!item) return;

    const quality = slotEl.dataset.quality || 'common';
    const qualityMult = QUALITY_MULT[quality] || 1;

    let baseB = parseFarmBonuses((item.effects || []).join(' '));

    // Качество
    baseB = {
      orns: boostByQuality(baseB.orns, qualityMult),
      gold: boostByQuality(baseB.gold, qualityMult),
      exp:  boostByQuality(baseB.exp,  qualityMult),
      luck: boostByQuality(baseB.luck, qualityMult),
    };

    // Штраф за два одноручных оружия
    const isWeaponSlot = slotKey === 'weapon-1' || slotKey === 'weapon-2';
    if (isWeaponSlot && bothOneHand) {
      baseB = {
        orns: applyPenalty(baseB.orns, DUAL_WIELD_PENALTY),
        gold: applyPenalty(baseB.gold, DUAL_WIELD_PENALTY),
        exp:  applyPenalty(baseB.exp,  DUAL_WIELD_PENALTY),
        luck: applyPenalty(baseB.luck, DUAL_WIELD_PENALTY),
      };
    }

    // Аксессуары — усиливаем осколком
    if (slotKey === 'accessory-1' || slotKey === 'accessory-2') {
      const accBoost = 1 + (mnemVals.acc || 0) / 100;
      const boostAcc = (m) => {
        const pct = (m - 1) * 100;
        return 1 + (pct * accBoost) / 100;
      };
      applyMultipliers({
        orns: boostAcc(baseB.orns),
        gold: boostAcc(baseB.gold),
        exp:  boostAcc(baseB.exp),
        luck: boostAcc(baseB.luck),
      });
    } else {
      applyMultipliers(baseB);
    }
  });

  // Питомец
  const petBox = document.getElementById('pet-box');
  if (petBox?.dataset.followerId) {
    const follower = allFollowers.find(f => f.id === petBox.dataset.followerId);
    const bbLevel = parseInt(petBox.dataset.bbLevel) || 0;
    if (follower && bbLevel > 0) {
      const followerMult = getFollowerMultiplier(follower, bbLevel);
      applyMultipliers(followerMult);
    }
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
  const allConsumables = getAllConsumables();
  document.querySelectorAll('#consumables-grid input[type="checkbox"]:checked').forEach(chk => {
    const c = allConsumables.find(x => x.id === chk.dataset.consumableId);
    if (c) applyMultipliers(c.multipliers);
  });

  // Астродерево
  document.querySelectorAll('#astral-grid input[type="checkbox"]:checked').forEach(chk => {
    const a = ASTRAL_TREE.find(x => x.id === chk.dataset.astralId);
    if (a) applyMultipliers(a.multipliers);
  });

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

function getItemSlot(item) {
  const facts = item.facts || [];
  const slotFact = facts.find(f =>
    f.label === 'Слот' || f.label === 'Place' || f.label === 'Slot'
  );
  const typeFact = facts.find(f => f.label === 'Тип' || f.label === 'Type');

  const slot = slotFact?.value || '';
  const type = typeFact?.value || '';

  const hasSockets = facts.some(f =>
    f.label === 'Сокеты' || f.label === 'Adornment Slots' || f.label === 'Sockets'
  );

  const sprite = item.sprite || '';

  // Гемма
  if (/\/(jewels|augments|runes)\//.test(sprite)) return 'adornment';
  if ((slot === 'Оружие' || slot === 'Weapon') && !hasSockets) return 'adornment';

  // Оффхенд
  if (['Оффхенд', 'Offhand', 'Off-hand', 'Левая рука', 'Left Hand', 'Вторая рука', 'Second Hand'].includes(slot)) {
    return 'offhand';
  }

  // Оффхенды по типу
  const offhandTypes = [
    'Щиты', 'Малые щиты', 'Факелы', 'Книги', 'Тотемы', 'Орбы',
    'Shields', 'Small Shields', 'Torches', 'Books', 'Totems', 'Orbs',
  ];
  if (offhandTypes.some(t => type.includes(t))) return 'offhand';

  // Основные слоты
  if (slot === 'Оружие' || slot === 'Weapon')       return 'weapon';
  if (slot === 'Голова' || slot === 'Head')         return 'head';
  if (['Торс', 'Тело', 'Body', 'Torso'].includes(slot)) return 'body';
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

// Проверка: предмет даёт фарм-бонусы?
function isFarmItem(item) {
  const effects = item.effects || [];
  return effects.some(e =>
    typeof e === 'string' &&
    /Орн|Orn|Золот|Gold|Удач|Luck|Опыт(?!\s+на\s+ходу)|Experien|EXP/i.test(e)
  );
}

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

function openSlotPicker(slotKey) {
  const allowed = getSlotAllowed(slotKey);

  const items = allItems
    .filter(it =>
      isFarmItem(it) &&
      allowed.includes(getItemSlot(it))
    )
    .sort((a, b) => (a.tier || 0) - (b.tier || 0) || a.name.localeCompare(b.name));

  window.Modal.open({
    title: 'Выбор предмета',
    items,
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
  const statsEl = wrapper?.querySelector('.slot-stats') || slotEl.querySelector('.slot-stats');
  const qualitySel = slotEl.querySelector('.slot-quality');

  if (img && item.sprite) { img.src = item.sprite; img.hidden = false; }
  if (nameEl) nameEl.textContent = item.name;
  if (qualitySel) qualitySel.hidden = false;

  slotEl.dataset.itemId = item.id;
  slotEl.classList.add('has-item');

    updateSlotQuality(slotKey);
  ensureSlotReset(slotEl);
  updateTwoHandedLock(slotKey, item);
  recalcFarm();
}

function updateSlotQuality(slotKey) {
  const slotEl = document.querySelector(`[data-slot="${slotKey}"]`);
  const qualitySel = slotEl?.querySelector('.slot-quality');
  if (!qualitySel) return;

  const quality = qualitySel.value || 'common';
  slotEl.dataset.quality = quality;

  // Фон качества
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

  const item = allItems.find(i => i.id === slotEl.dataset.itemId);
  const statsEl = slotEl.closest('.slot-wrapper')?.querySelector('.slot-stats') ||
                  slotEl.querySelector('.slot-stats');

  if (item && statsEl) {
    const base = parseFarmBonuses((item.effects || []).join(' '));
    const qualityMult = QUALITY_MULT[quality] || 1;

    const boosted = {
      orns: boostByQuality(base.orns, qualityMult),
      gold: boostByQuality(base.gold, qualityMult),
      exp:  boostByQuality(base.exp,  qualityMult),
      luck: boostByQuality(base.luck, qualityMult),
    };

    statsEl.textContent = formatEffect({ multipliers: boosted }, currentLang());
  }
}

function boostByQuality(m, qualityMult) {
  if (m === 1) return 1;
  const pct = (m - 1) * 100;
  return 1 + (pct * qualityMult) / 100;
}

function applyPenalty(m, penalty) {
  if (m === 1) return 1;
  const pct = (m - 1) * 100;
  return 1 + (pct * penalty) / 100;
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
    sel.addEventListener('change', () => updateSlotQuality(sel.dataset.slot));
  });
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

  const allConsumables = getAllConsumables();
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

  recalcFarm();
}

initFarmPage();

// ============ СМЕНА ЯЗЫКА ============
window.addEventListener('orna-lang-changed', async () => {
  console.log('🌐 Language changed, reloading farm...');

  // Сохраняем состояние
  const savedState = {
    classId: '',
    specId: '',
    followerId: null,
    followerBB: 0,
    slots: {},
    mnems: [],
  };

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

  // Слоты
  document.querySelectorAll('.slot[data-slot]').forEach(slotEl => {
    const key = slotEl.dataset.slot;
    if (key === 'mnem-1' || key === 'mnem-2') return;
    if (!slotEl.dataset.itemId) return;

    savedState.slots[key] = {
      itemId: slotEl.dataset.itemId,
      mode: slotEl.querySelector('.slot-mode-toggle')?.dataset.mode || null,
    };
  });

  // Мнемы
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

  // Перезагружаем данные
  await loadAllData();

  // Обновляем пустые опции
  document.querySelectorAll('select option[value=""]').forEach(opt => {
    const lang = currentLang();
    opt.textContent = opt.dataset[lang] || opt.dataset.ru || opt.textContent;
  });

  // Перерисовываем селекты
  fillClassSelect();
  fillSpecSelect();

  if (classSel && savedState.classId) classSel.value = savedState.classId;
  if (specSel && savedState.specId) specSel.value = savedState.specId;

  updateClassInfo();
  updateSpecInfo();

  // Питомец
  if (savedState.followerId) {
    const follower = allFollowers.find(f => f.id === savedState.followerId);
    if (follower) applyFollower(follower, savedState.followerBB);
  }
  updateFollowerLock();

  // Расходники
  const allConsumables = getAllConsumables();
  renderSimpleGrid(document.getElementById('consumables-grid'), allConsumables, 'consumable');

  // Храмы/статуи/ивенты/астродерево
  renderSimpleGrid(document.getElementById('temples-grid'), TEMPLES, 'temple');
  renderSimpleGrid(document.getElementById('statues-grid'), STATUES, 'statue');
  renderEventsGrid(document.getElementById('events-grid'), EVENTS);
  renderSimpleGrid(document.getElementById('astral-grid'), ASTRAL_TREE, 'astral');

  // Восстанавливаем мнемы
  savedState.mnems.forEach(m => {
    const sel = document.querySelector(
      `.mnem-select[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    const input = document.querySelector(
      `.mnem-input[data-mnem="${m.mnemId}"][data-row="${m.rowId}"]`
    );
    if (sel && m.value) sel.value = m.value;
    if (input && m.num) input.value = m.num;
  });

  // Восстанавливаем слоты
  for (const [slotKey, data] of Object.entries(savedState.slots)) {
    const item = allItems.find(i => i.id === data.itemId);
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
  }

  recalcFarm();
});