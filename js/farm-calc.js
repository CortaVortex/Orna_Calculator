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
// Пустое одноручное оружие — для слотов без бонусов
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
// Если предмет в списке — он даёт бонусы ТОЛЬКО когда активна указанная спека.
// Без спеки — бонусы НЕ применяются, а в UI показывается красная обводка.
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
  // Хардкод-предметы — их слот определяем по facts
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

    // ... остальной код для парсерных предметов
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
  // Хардкод-предметы всегда проходят
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
        nameEn: item.name,
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

// ============ ГЛАВНЫЙ РАСЧЁТ ============
export function calculateFarm(input) {
  // 1. БАЗА
  const base = {
    orns: 100 + (input.anguish?.orns || 0),
    gold: 100 + (input.anguish?.gold || 0),
    exp:  100 + (input.anguish?.exp  || 0),
    luck: 100 + (input.anguish?.luck || 0),
  };

  // 2. ЭКИПИРОВКА — каждый предмет × качество, потом перемножаем между собой
  const equipmentMult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  const w1 = (input.equipment || []).find(e => e.slotKey === 'weapon-1');
  const w2 = (input.equipment || []).find(e => e.slotKey === 'weapon-2');
  const bothOneHand = w1 && w2 &&
                       w2.mode === 'weapon' &&
                       !isTwoHanded(w1.item) &&
                       !isTwoHanded(w2.item);

  const mnemVals = input.mnemVals || { acc: 0, orns: 0, gold: 0, exp: 0, luck: 0, bonds: 0 };
  const accBoost = 1 + (mnemVals.acc || 0) / 100;

  const activeSpecId = input.specId || null;

  (input.equipment || []).forEach(({ slotKey, item, quality }) => {
    if (!item) return;

    // 2.0. Проверка зависимости от специализации
    const req = checkSpecRequirement(item, activeSpecId);
    if (req.requires && !req.satisfied) {
      return;   // предмет требует спеку, но её нет — не даёт бонусов
    }

    // 2.1. Базовые эффекты предмета
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

    // 2.4. Мнем «Аксессуары» — для аксессуаров
    if (slotKey === 'accessory-1' || slotKey === 'accessory-2') {
      baseB = {
        orns: boostByQuality(baseB.orns, accBoost),
        gold: boostByQuality(baseB.gold, accBoost),
        exp:  boostByQuality(baseB.exp,  accBoost),
        luck: boostByQuality(baseB.luck, accBoost),
      };
    }

    // 2.5. Перемножаем в equipmentMult
    equipmentMult.orns *= baseB.orns;
    equipmentMult.gold *= baseB.gold;
    equipmentMult.exp  *= baseB.exp;
    equipmentMult.luck *= baseB.luck;
  });

  // 3. ПРОЧИЕ БОНУСЫ (спека, питомец, шаги, храмы, статуи, ивенты, расходники, астрал)
  const otherMult = { orns: 1, gold: 1, exp: 1, luck: 1 };

  function applyOther(m) {
    if (!m) return;
    otherMult.orns *= m.orns ?? 1;
    otherMult.gold *= m.gold ?? 1;
    otherMult.exp  *= m.exp  ?? 1;
    otherMult.luck *= m.luck ?? 1;
  }

  if (input.specMultipliers) {
    applyOther(input.specMultipliers);
  }

  if (input.follower && input.follower.item && input.follower.bbLevel > 0) {
    applyOther(getFollowerMultiplier(input.follower.item, input.follower.bbLevel));
  }

  if (input.steps?.['3000']) applyOther({ exp: 1.25 });
  if (input.steps?.['6000']) applyOther({ orns: 1.25, luck: 1.25 });

  const applyAll = (arr) => (arr || []).forEach(x => applyOther(x.multipliers));
  applyAll(input.temples);
  applyAll(input.statues);
  applyAll(input.events);
  applyAll(input.consumables);
  applyAll(input.astral);

  // 4. ИТОГ
  const LUCK_CAP = 400;

  const luckRaw = base.luck * equipmentMult.luck * otherMult.luck;
  const luck = Math.min(luckRaw, LUCK_CAP);

  return {
    orns: base.orns * equipmentMult.orns * otherMult.orns,
    gold: base.gold * equipmentMult.gold * otherMult.gold,
    exp:  base.exp  * equipmentMult.exp  * otherMult.exp,
    luck,
    luckRaw,          // ← для определения «достигнут ли кап»
    luckCapped: luckRaw > LUCK_CAP,   // ← флаг: обрезано
  };
}