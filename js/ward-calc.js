// ============================================================
// ВАРД — ФОРМУЛЫ (чистые функции, без DOM)
// ============================================================

// Парсит вард из effects (проценты)
export function parseWardBonus(effects, lang) {
  if (!Array.isArray(effects)) return 0;
  const key = lang === 'ru' ? 'Вард' : 'Ward';
  for (const eff of effects) {
    if (typeof eff !== 'string') continue;
    const m = eff.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (m) return parseFloat(m[1]);
  }
  return 0;
}

// Главный расчёт
//
// input = {
//   hp, mana,                 // базовые статы (из класса)
//   equipment: [              // 5 слотов
//     { hp, mana, ward },     // по одному объекту на слот
//   ],
//   gemsWeapon: [             // строки гемов в оружии
//     { count, hp, mana, ward },
//   ],
//   gemsArmor: [              // строки гемов в шмотках
//     { count, hp, mana, ward },
//   ],
// }
//
// Формула:
//   baseHpMana = hp + mana + Σ(equipment.hp + equipment.mana) + Σ(gem.count × (gem.hp + gem.mana))
//   mult       = Π(1 + equipment.ward/100) × Π(1 + gemWard×count/100)
//   result     = floor(baseHpMana / 2 × mult)
export function calculateWard(input) {
  const {
    hp = 0,
    mana = 0,
    equipment = [],
    gemsWeapon = [],
    gemsArmor = [],
  } = input;

  // 1. Базовая сумма HP + Мана
  let baseHpMana = hp + mana;

  // Экипировка: +HP, +Мана
  for (const eq of equipment) {
    baseHpMana += (eq.hp || 0) + (eq.mana || 0);
  }

  // Гемы: +HP×count, +Мана×count
  for (const g of [...gemsWeapon, ...gemsArmor]) {
    const c = g.count || 0;
    baseHpMana += (g.hp || 0) * c + (g.mana || 0) * c;
  }

  // 2. Множители (проценты)
  let mult = 1;

  // Экипировка: вард как множитель
  for (const eq of equipment) {
    const w = eq.ward || 0;
    if (w !== 0) mult *= 1 + w / 100;
  }

  // Гемы: вард × count как множитель
  for (const g of [...gemsWeapon, ...gemsArmor]) {
    const c = g.count || 0;
    const w = g.ward || 0;
    if (w !== 0 && c > 0) mult *= 1 + (w * c) / 100;
  }

  // 3. Итог
  return Math.floor((baseHpMana / 2) * mult);
}