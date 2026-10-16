// ============================================================
// ФАРМ — ФОРМУЛЫ (чистые функции, без DOM)
// ============================================================

// ============ КАЧЕСТВО ============
export const QUALITY_MULT = {
  common:       1.0,
  superior:     1.1,
  famed:        1.15,
  legendary:    1.2,
  ornate:       1.25,
  masterforged: 1.3,
  demonforged:  1.4,
  godforged:    1.5,
};

export const QUALITY_BG = {
  common:       '',
  superior:     'https://playorna.com/static/img/fx/rare.png',
  famed:        'https://playorna.com/static/img/fx/famed.png',
  legendary:    'https://playorna.com/static/img/fx/legendary.png',
  ornate:       'https://playorna.com/static/img/fx/ornate.png',
  masterforged: 'https://playorna.com/static/img/fx/masterforged.png',
  demonforged:  'https://playorna.com/static/img/fx/demonforged.png',
  godforged:    'https://playorna.com/static/img/fx/godforged.png',
};

export const DUAL_WIELD_PENALTY = 0.65;

// ============ ХАРДКОД-ПРЕДМЕТЫ ============
export const HARDCODED_ITEMS = [
  {
    id: '__weapon_plain__',
    name: 'Оружие без бонусов',
    nameEn: 'Weapon without bonuses',
    sprite: 'https://playorna.com/static/img/weapons/was.png',
    tier: 0,
    effects: [],
    facts: [
      { label: 'Слот', value: 'Оружие' },
      { label: 'Place', value: 'Weapon' },
      { label: 'Тип', value: 'Мечи' },
      { label: 'Type', value: 'Swords' },
    ],
    tags: [],
  },
];

// ============ ЗАВИСИМОСТЬ ПРЕДМЕТ ↔ СПЕЦИАЛИЗАЦИЯ ============
export const SPEC_DEPENDENCIES = {
  'Туника беглого купца':        ['merchant-5'],
  "Beheaded Merchant's Tunic":   ['merchant-5'],
};

export function isSpecActive(specId, allowedSpecs) {
  if (!specId) return false;
  const id = String(specId).toLowerCase();
  return allowedSpecs.some(s => s.toLowerCase() === id);
}

export function checkSpecRequirement(item, activeSpecId) {
  if (!item) return { requires: false, satisfied: true, allowed: [] };

  const name = item.name || '';
  const allowed = SPEC_DEPENDENCIES[name];
  if (!allowed) return { requires: false, satisfied: true, allowed: [] };

  return {
    requires: true,
    satisfied: isSpecActive(activeSpecId, allowed),
    allowed,
  };
}

// ============ ПАРСИНГ ============
export function parseFarmBonuses(text) {
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

export function extractOurBonuses(text, lang) {
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

// ============ МОДИФИКАТОРЫ ============
export function boostByQuality(m, qualityMult) {
  if (m === 1) return 1;
  return m * qualityMult;
}

export function applyPenalty(m, penalty) {
  if (m === 1) return 1;
  const pct = (m - 1) * 100;
  return 1 + (pct * penalty) / 100;
}

// ============ ПИТОМЕЦ ============
export function getBBLevels(follower) {
  const sections = follower.sections || [];
  const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
  return bbSection?.texts || [];
}

export function hasFarmBonus(follower) {
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

export function getFollowerMultiplier(follower, bbLevel) {
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

// ============ ДВУРУЧКИ ============
export function isTwoHanded(item) {
  if (!item) return false;
  if (Array.isArray(item.tags)) {
    if (item.tags.some(t => /Двуручное|Two[\s-]?Handed|Two handed/i.test(t))) {
      return true;
    }
  }
  return false;
}

// ============ СЛОТЫ ============
export function getItemSlot(item) {
  if (item?.id?.startsWith('__')) {
    const facts = item.facts || [];
    const slotFact = facts.find(f =>
      f.label === 'Слот' || f.label === 'Place' || f.label === 'Slot'
    );
    const slot = slotFact?.value || '';

    if (slot === 'Оружие' || slot === 'Weapon')       return 'weapon';
    if (slot === 'Голова' || slot === 'Head')         return 'head';
    if (['Торс', 'Тело', 'Body', 'Torso'].includes(slot)) return 'body';
    if (slot === 'Ноги' || slot === 'Legs')           return 'legs';
    if (slot === 'Аксессуар' || slot === 'Accessory') return 'accessory';
    return 'unknown';
  }

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

  if (/\/(jewels|augments|runes)\//.test(sprite)) return 'adornment';
  if ((slot === 'Оружие' || slot === 'Weapon') && !hasSockets) return 'adornment';

  if (['Оффхенд', 'Offhand', 'Off-hand', 'Левая рука', 'Left Hand', 'Вторая рука', 'Second Hand'].includes(slot)) {
    return 'offhand';
  }

  const offhandTypes = [
    'Щиты', 'Малые щиты', 'Факелы', 'Книги', 'Тотемы', 'Орбы',
    'Shields', 'Small Shields', 'Torches', 'Books', 'Totems', 'Orbs',
  ];
  if (offhandTypes.some(t => type.includes(t))) return 'offhand';

  if (slot === 'Оружие' || slot === 'Weapon')       return 'weapon';
  if (slot === 'Голова' || slot === 'Head')         return 'head';
  if (['Торс', 'Тело', 'Body', 'Torso'].includes(slot)) return 'body';
  if (slot === 'Ноги' || slot === 'Legs')           return 'legs';
  if (slot === 'Аксессуар' || slot === 'Accessory') return 'accessory';

  return 'unknown';
}

export function isFarmItem(item) {
  if (item?.id?.startsWith('__')) return true;

  const effects = item.effects || [];
  return effects.some(e =>
    typeof e === 'string' &&
    /Орн|Orn|Золот|Gold|Удач|Luck|Опыт(?!\s+на\s+ходу)|Experien|EXP/i.test(e)
  );
}

// ============ РАСХОДНИКИ ============
export function getFarmConsumables(allItems) {
  if (!Array.isArray(allItems)) {
    console.warn('getFarmConsumables: allItems is not an array:', allItems);
    return [];
  }
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
        nameEn: item.nameEn || item.name,
        icon: item.sprite,
        multipliers: m,
      };
    });
}

export function getAllConsumables(allItems) {
  return getFarmConsumables(allItems)
    .map(c => {
      if (/непоколебимой приверженности|undying allegiance/i.test(c.name)) {
        return { ...c, name: 'PoUA', nameEn: 'PoUA' };
      }
      return c;
    });
}

// ============ ЛОКАЛИЗАЦИЯ ЛОГА ============
const LANG_LABELS = {
  ru: {
    base: 'База',
    total: 'Итог',
    penalty: 'штраф',
    spec: 'Специализация',
    follower: 'Питомец',
    steps3000: '3000 шагов',
    steps6000: '6000 шагов',
    mnem: 'Осколок',
    anguish: 'Настрадание',
    quality: {
      common:       'Обычное',
      superior:     'Хорошее',
      famed:        'Добротное',
      legendary:    'Эпичное',
      ornate:       'Орнатное',
      masterforged: 'Травленое',
      demonforged:  'Закаленное',
      godforged:    'Божественное',
    },
  },
  en: {
    base: 'Base',
    total: 'Total',
    penalty: 'penalty',
    spec: 'Specialization',
    follower: 'Follower',
    steps3000: '3000 steps',
    steps6000: '6000 steps',
    mnem: 'Amity',
    anguish: 'Anguish',
    quality: {
      common:       'common',
      superior:     'superior',
      famed:        'famed',
      legendary:    'legendary',
      ornate:       'ornate',
      masterforged: 'masterforged',
      demonforged:  'demonforged',
      godforged:    'godforged',
    },
  },
};

// ============ ГЛАВНЫЙ РАСЧЁТ ============
export function calculateFarm(input) {
  const lang = input.lang || 'ru';
  const L = LANG_LABELS[lang] || LANG_LABELS.ru;

  // Лог для подсказки — по каждому стату
  const log = {
    orns: [{ label: L.base, value: 100 }],
    gold: [{ label: L.base, value: 100 }],
    exp:  [{ label: L.base, value: 100 }],
    luck: [{ label: L.base, value: 100 }],
  };

function logStep(stat, label, before, after, steps) {
  const coef = before === 0 ? 1 : after / before;
  log[stat].push({ label, coef, before, after, steps });
}

  // 1. БАЗА
  const base = {
    orns: 100 + (input.anguish?.orns || 0),
    gold: 100 + (input.anguish?.gold || 0),
    exp:  100 + (input.anguish?.exp  || 0),
    luck: 100 + (input.anguish?.luck || 0),
  };

// Логируем настрадание — как ПРИБАВКУ
['orns', 'gold', 'exp', 'luck'].forEach(stat => {
  const ang = input.anguish?.[stat] || 0;
  if (ang > 0) {
    const sign = ang >= 0 ? '+' : '';
    // Округляем до 2 знаков, чтобы float-погрешность не лезла в UI
    const after = Math.round((100 + ang) * 100) / 100;
    log[stat].push({
      label: `${L.anguish} ${sign}${ang}%`,
      add: ang,
      before: 100,
      after,
    });
  }
});

  // 2. ЭКИПИРОВКА
  const equipmentMult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  const w1 = (input.equipment || []).find(e => e.slotKey === 'weapon-1');
  const w2 = (input.equipment || []).find(e => e.slotKey === 'weapon-2');
  const bothOneHand = w1 && w2 &&
                       w2.mode === 'weapon' &&
                       !isTwoHanded(w1.item) &&
                       !isTwoHanded(w2.item);

  const mnemVals = input.mnemVals || {};
  const accBoost = 1 + (mnemVals.acc || 0) / 100;

  const activeSpecId = input.specId || null;

  (input.equipment || []).forEach(({ slotKey, item, quality }) => {
    if (!item) return;

    const req = checkSpecRequirement(item, activeSpecId);
    if (req.requires && !req.satisfied) return;

    // 2.1. Базовые эффекты
    let baseB = parseFarmBonuses((item.effects || []).join(' '));

    // 2.2. × качество
    const qualityMult = QUALITY_MULT[quality] || 1;
    baseB = {
      orns: boostByQuality(baseB.orns, qualityMult),
      gold: boostByQuality(baseB.gold, qualityMult),
      exp:  boostByQuality(baseB.exp,  qualityMult),
      luck: boostByQuality(baseB.luck, qualityMult),
    };

    // 2.3. Штраф двуручки
    const isWeaponSlot = slotKey === 'weapon-1' || slotKey === 'weapon-2';
    if (isWeaponSlot && bothOneHand) {
      baseB = {
        orns: applyPenalty(baseB.orns, DUAL_WIELD_PENALTY),
        gold: applyPenalty(baseB.gold, DUAL_WIELD_PENALTY),
        exp:  applyPenalty(baseB.exp,  DUAL_WIELD_PENALTY),
        luck: applyPenalty(baseB.luck, DUAL_WIELD_PENALTY),
      };
    }

// 2.4. Мнем «Аксессуары» — формула:
// new = (base × quality) + ((base × quality) × amity%)
// где base × quality уже применено выше в 2.2,
// а amity% = (accBoost - 1) × 100
if (slotKey === 'accessory-1' || slotKey === 'accessory-2') {
  const amityPct = accBoost - 1;   // например, 0.25 → 25%
  baseB = {
    orns: baseB.orns + baseB.orns * amityPct,
    gold: baseB.gold + baseB.gold * amityPct,
    exp:  baseB.exp  + baseB.exp  * amityPct,
    luck: baseB.luck + baseB.luck * amityPct,
  };
}

    // 2.5. Тэги (одинаковые для всех статов)
    const tags = [];

    if (quality && quality !== 'common') {
      const qName = L.quality[quality] || quality;
      tags.push({ name: qName, coef: qualityMult });
    }
    if (isWeaponSlot && bothOneHand) {
      tags.push({ name: L.penalty, coef: DUAL_WIELD_PENALTY });
    }
    if ((slotKey === 'accessory-1' || slotKey === 'accessory-2') && accBoost !== 1) {
      tags.push({ name: 'amity', coef: accBoost });
    }

    // 2.6. Перемножаем + формируем лог по каждому стату
    ['orns', 'gold', 'exp', 'luck'].forEach(stat => {
      const itemCoef = baseB[stat];
      if (Math.abs(itemCoef - 1) < 1e-9) return;

      const before = equipmentMult[stat];
      const after = before * itemCoef;

      // Базовый коэффициент (без качества, штрафа, amity)
      let baseCoef = itemCoef;
      tags.forEach(t => { baseCoef /= t.coef; });

      // Формируем пошаговую формулу
const steps = [];
const basePct = Math.round((baseCoef - 1) * 1000) / 10;
const baseSign = basePct >= 0 ? '+' : '';
steps.push(`base: ${baseSign}${basePct}% (×${baseCoef.toFixed(4).replace(/\.?0+$/, '')})`);

let running = baseCoef;
tags.forEach(t => {
  const prev = running;
  running *= t.coef;
  const prevStr = prev.toFixed(4).replace(/\.?0+$/, '');
  const runStr = running.toFixed(4).replace(/\.?0+$/, '');

  if (t.name === 'amity') {
    // Развёрнутая формула: prev + (prev × amity%)
    const amityPct = t.coef - 1;
    steps.push(
      `amity: ${prevStr} + (${prevStr} × ${amityPct.toFixed(2)}) = ${runStr}`
    );
  } else {
    steps.push(`× ${t.name} ×${t.coef.toFixed(2)} → ${runStr}`);
  }
});

      // Короткий label
      const tagsShort = tags.map(t => `${t.name} ×${t.coef.toFixed(2)}`).join(', ');
      let label = slotKey;
      if (tagsShort) label += ` (${tagsShort})`;

      logStep(stat, label, before, after, steps);
      equipmentMult[stat] = after;
    });
  });

  // 3. ПРОЧИЕ БОНУСЫ
  const otherMult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  function applyOther(m, label) {
    if (!m) return;
    ['orns', 'gold', 'exp', 'luck'].forEach(stat => {
      const before = otherMult[stat];
      const after = before * (m[stat] ?? 1);
      if (Math.abs(after - before) > 1e-9) {
        logStep(stat, label || '—', before, after);
        otherMult[stat] = after;
      }
    });
  }

  // Мнемы
const mnemList = input.mnemList || [];
const statNames = {
  orns: lang === 'en' ? 'Orns'  : 'Орны',
  gold: lang === 'en' ? 'Gold'  : 'Золото',
  exp:  lang === 'en' ? 'Exp'   : 'Опыт',
  luck: lang === 'en' ? 'Luck'  : 'Удача',
};
mnemList.forEach(({ type, value }) => {
  if (!type || !value || type === 'bonds') return;
  if (type === 'acc') return;
  const name = statNames[type] || type;
  applyOther({ [type]: 1 + value / 100 }, `${L.mnem} ${name} +${value}%`);
});

  if (input.specMultipliers) {
    applyOther(input.specMultipliers, L.spec);
  }

  if (input.follower && input.follower.item && input.follower.bbLevel > 0) {
    applyOther(
      getFollowerMultiplier(input.follower.item, input.follower.bbLevel),
      `${L.follower} BB${input.follower.bbLevel}`
    );
  }

  if (input.steps?.['3000']) applyOther({ exp: 1.25 }, L.steps3000);
  if (input.steps?.['6000']) applyOther({ orns: 1.25, luck: 1.25 }, L.steps6000);

  // Храмы, статуи, ивенты, расходники, астрал — используем name / nameEn
  const applyList = (arr) => (arr || []).forEach(x => {
    const n = (lang === 'en' && x.nameEn) ? x.nameEn : x.name;
    applyOther(x.multipliers, n);
  });
  applyList(input.temples);
  applyList(input.statues);
  applyList(input.events);
  applyList(input.consumables);
  applyList(input.astral);

  // 4. ИТОГ
  const LUCK_CAP = 400;

  const luckRaw = base.luck * equipmentMult.luck * otherMult.luck;
  const luck = Math.min(luckRaw, LUCK_CAP);

  return {
    orns: base.orns * equipmentMult.orns * otherMult.orns,
    gold: base.gold * equipmentMult.gold * otherMult.gold,
    exp:  base.exp  * equipmentMult.exp  * otherMult.exp,
    luck,
    luckRaw,
    luckCapped: luckRaw > LUCK_CAP,
    log,
  };
}