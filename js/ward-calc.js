export function calculateWard(input) {
  const {
    hp = 0,
    mana = 0,
    al = 0,
    equipment = {},
    gemsWeapon = [],
    gemsArmor = [],
  } = input;

  const alMult = 1 + (al * 0.01);

  // 1. Суммируем Хп/Ману от экипировки
  let totalEqHp = 0, totalEqMana = 0;
  for (const slot in equipment) {
    const eq = equipment[slot];
    totalEqHp += eq.hp || 0;
    totalEqMana += eq.mana || 0;
  }

  // 2. Собираем статы гемов (Хп, Мана) и проценты по слотам
  let totalGemHp = 0, totalGemMana = 0;
  const gemsBySlot = {};
  
  for (const g of [...gemsWeapon, ...gemsArmor]) {
    const c = g.count || 0;
    
    // Суммируем Хп и Ману гемов
    totalGemHp += (g.hp || 0) * c;
    totalGemMana += (g.mana || 0) * c;
    
    // Суммируем проценты варда гемов по слотам
    const gWard = (g.wardPct || 0) * c;
    if (!gemsBySlot[g.slot]) gemsBySlot[g.slot] = 0;
    gemsBySlot[g.slot] += gWard;
  }

  // 3. Базовая половина (Хп + Мана + шмотки с AL + гемы с AL)
  let baseHpMana = hp + mana;
  
  // Прибавляем шмотки с AL
  baseHpMana += Math.floor(totalEqHp * alMult);
  baseHpMana += Math.floor(totalEqMana * alMult);
  
  // Прибавляем гемы с AL
  baseHpMana += Math.floor(totalGemHp * alMult);
  baseHpMana += Math.floor(totalGemMana * alMult);

  let currentWard = Math.floor(baseHpMana / 2);

  // 4. Умножаем на проценты шмоток (чистый процент + гемы)
  const allSlots = new Set([...Object.keys(equipment), ...Object.keys(gemsBySlot)]);

  for (const slot of allSlots) {
    const eqWard = equipment[slot]?.wardPct || 0;
    const gemWard = gemsBySlot[slot] || 0;
    
    const totalWardPct = eqWard + gemWard;
    
    if (totalWardPct > 0) {
      currentWard = Math.floor(currentWard * (1 + totalWardPct / 100));
    }
  }

  return currentWard;
}