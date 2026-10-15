// ============================================================
// ОБЗОР — ФОРМУЛЫ (чистые функции, без DOM)
// ============================================================

// ============ КОНСТАНТЫ ============
export const BASE_VIEW = 180;
export const VIEW_CAP = 1600;

// ============ ПАРСИНГ ============
/**
 * Парсит эффекты предмета и возвращает множитель обзора.
 * "Обзор +10%" → 1.1
 * "View Distance +10%" → 1.1
 * Иначе → 1
 */
export function parseViewBonus(effects, lang) {
  if (!Array.isArray(effects)) return 1;
  const key = lang === 'ru' ? 'Обзор' : 'View Distance';
  for (const eff of effects) {
    if (typeof eff !== 'string') continue;
    const m = eff.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    if (m) return 1 + parseFloat(m[1]) / 100;
  }
  return 1;
}

/**
 * Возвращает множитель обзора для предмета (обёртка над parseViewBonus).
 */
export function getItemViewMultiplier(item, lang) {
  if (!item || !Array.isArray(item.effects)) return 1;
  return parseViewBonus(item.effects, lang);
}

/**
 * Проверка: есть ли у предмета эффект «Обзор».
 */
export function isViewItem(item) {
  if (!item || !Array.isArray(item.effects)) return false;
  return item.effects.some(e =>
    typeof e === 'string' && /Обзор|View Distance/i.test(e)
  );
}

// ============ ПИТОМЕЦ ============
/**
 * Возвращает массив строк BB-уровней питомца.
 */
export function getBBLevels(follower) {
  const sections = follower?.sections || [];
  const bbSection = sections.find(s => /Bestial Bond|Звериные узы/i.test(s.title || ''));
  return bbSection?.texts || [];
}

/**
 * Проверка: есть ли у питомца бонус «Обзор» хотя бы на одном BB-уровне.
 */
export function hasViewBonus(follower, lang) {
  const levels = getBBLevels(follower);
  const key = lang === 'ru' ? 'Обзор' : 'View Distance';
  return levels.some(line =>
    typeof line === 'string' && new RegExp(key, 'i').test(line)
  );
}

/**
 * Считает множитель обзора от питомца по указанному BB-уровню.
 * Возвращает { multiplier, perLevel } — общий множитель и проценты по уровням.
 */
export function getFollowerViewMultiplier(follower, bbLevel, lang) {
  if (bbLevel <= 0) return { multiplier: 1, perLevel: [] };

  const levels = getBBLevels(follower);
  const key = lang === 'ru' ? 'Обзор' : 'View Distance';
  const perLevel = [];
  let multiplier = 1;

  for (let lvl = 1; lvl <= bbLevel; lvl++) {
    const line = levels.find(t =>
      new RegExp(`^Уровень\\s*${lvl}|^Level\\s*${lvl}`, 'i').test(t)
    );
    if (!line) {
      perLevel.push(0);
      continue;
    }
    const m = line.match(new RegExp(`${key}[:\\s]+\\+?(\\d+(?:\\.\\d+)?)%`, 'i'));
    const pct = m ? parseFloat(m[1]) : 0;
    perLevel.push(pct);
    if (pct) multiplier *= 1 + pct / 100;
  }

  return { multiplier, perLevel };
}

/**
 * Считает уровень BB-уз для питомца на основе класса, спеки, мнемов.
 */
export function getAvailableBB({ classBB, specBB, mnemBonds }) {
  return Math.min(3, Math.max(classBB || 0, specBB || 0, mnemBonds || 0));
}

// ============ КЛАССЫ / СПЕКИ ============
/**
 * Проверка: релевантен ли класс для вкладки «Обзор».
 */
export function isRelevantViewClass(cls, lang) {
  const hasView = parseViewBonus(cls.effects, lang) !== 1;
  const hasBB = (cls.bestialBondLevel || 0) > 0;
  return hasView || hasBB;
}

/**
 * Проверка: релевантна ли специализация для вкладки «Обзор».
 */
export function isRelevantViewSpec(spec) {
  const hasView = (spec.viewMultiplier || 1) !== 1;
  const hasBB = (spec.bestialBondLevel || 0) > 0;
  const hasAmity = !!spec.unlocksSecondAmity;
  return hasView || hasBB || hasAmity;
}

// ============ МНЕМЫ ============
export const MNEM_VIEW_MIN = 1;
export const MNEM_VIEW_MAX = 5;

/**
 * Считает множитель обзора от мнемов.
 * `mnemView` — массив чисел (проценты).
 */
export function getMnemViewMultiplier(mnemView) {
  let m = 1;
  (mnemView || []).forEach(v => {
    if (v > 0) m *= 1 + v / 100;
  });
  return m;
}

// ============ ГЕММЫ ============
/**
 * Фильтрует предметы из парсера и оставляет только геммы с «Обзор».
 * Возвращает массив { id, name, percent, icon }.
 */
export function getViewGemsFromItems(allItems, lang) {
  return allItems
    .filter(item => {
      const sprite = item.sprite || '';
      const name = item.name || '';
      const facts = item.facts || [];

      const isWeaponSprite = /\/weapons\//.test(sprite);
      const isGemSprite = /\/(jewels|augments|runes)\//.test(sprite);
      const isGemName = /gem|jewel|символ|гемма|всевид|seer/i.test(name);

      const slotFact = facts.find(f => f.label === 'Слот' || f.label === 'Place');
      const slot = slotFact?.value || '';
      const hasSockets = facts.some(f =>
        f.label === 'Сокеты' || f.label === 'Adornment Slots'
      );
      const isWeaponWithoutSockets =
        (slot === 'Оружие' || slot === 'Weapon') && !hasSockets;

      if (isWeaponSprite) return false;

      return (isGemSprite || isGemName || isWeaponWithoutSockets)
             && isViewItem(item);
    })
    .map(item => {
      const viewEffect = item.effects?.find(e => /Обзор|View Distance/i.test(e)) || '';
      const m = viewEffect.match(/\+?(\d+(?:\.\d+)?)%/);
      return {
        id: item.id,
        name: item.name,
        nameEn: item.name,
        percent: m ? parseFloat(m[1]) : 0,
        icon: item.sprite,
      };
    })
    .filter(g => g.percent > 0)
    .sort((a, b) => a.percent - b.percent);
}

/**
 * Считает множитель гемм.
 * `gemCounts` — { [gemId]: count }
 * `gems` — массив из getViewGemsFromItems
 */
export function getGemsMultiplier(gemCounts, gems) {
  let multiplier = 1;
  Object.entries(gemCounts || {}).forEach(([id, count]) => {
    const gem = gems.find(g => g.id === id);
    if (gem && count > 0) {
      multiplier *= Math.pow(1 + gem.percent / 100, count);
    }
  });
  return multiplier;
}

// ============ ШАГИ ============
export function getStepsMultiplier({ steps3000, steps6000 }) {
  let m = 1;
  if (steps3000) m *= 1.1;
  if (steps6000) m *= 1.1;
  return m;
}

// ============ СЛОТЫ ============
/**
 * Проверка: подходит ли предмет под слот.
 * `allowed` — массив допустимых типов.
 */
export function isItemAllowedInSlot(item, allowed, lang) {
  if (!item || !Array.isArray(allowed)) return false;
  const slot = getItemSlot(item);
  return allowed.includes(slot);
}

/**
 * Определяет слот предмета (weapon / offhand / head / body / legs / accessory / adornment).
 * Аналогично farm-calc.js.
 */
export function getItemSlot(item) {
  const facts = item.facts || [];

  const slotFact = facts.find(f =>
    f.label === 'Слот' || f.label === 'Place' || f.label === 'Slot'
  );
  const typeFact = facts.find(f => f.label === 'Тип' || f.label === 'Type');

  const slot = slotFact?.value || '';
  const type = typeFact?.value || '';

  const hasSockets = facts.some(f =>
    f.label === 'Сокеты' ||
    f.label === 'Adornment Slots' ||
    f.label === 'Sockets'
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

export function isTwoHanded(item) {
  if (!item) return false;
  if (Array.isArray(item.tags)) {
    if (item.tags.some(t => /Двуручное|Two[\s-]?Handed|Two handed/i.test(t))) {
      return true;
    }
  }
  return false;
}

/**
 * Бан-лист (Konq и т.п.).
 */
export function isBannedView(item) {
  const name = item?.name || '';
  if (/konq/i.test(name)) return true;
  return false;
}

// ============ ГЛАВНЫЙ РАСЧЁТ ============
/**
 * Считает итоговый обзор.
 *
 * input = {
 *   classView: 1.0,                  // множитель класса
 *   specView: 1.0,                   // множитель спеки
 *   followerMult: 1.0,               // множитель питомца (или 1)
 *   mnemView: [0,0,0,0,0,0],         // проценты мнемов
 *   gemsMult: 1.0,                   // множитель гемм
 *   stepsMult: 1.0,                  // множитель шагов
 *   equipmentMult: 1.0,              // множитель экипировки (уже посчитан)
 *   consumablesMult: 1.0,            // множитель расходников
 * }
 *
 * @returns { base, raw, capped, isCapped }
 */
export function calculateView(input) {
  const mnemMult = getMnemViewMultiplier(input.mnemView);

  const mult =
    (input.classView || 1) *
    (input.specView || 1) *
    (input.followerMult || 1) *
    mnemMult *
    (input.gemsMult || 1) *
    (input.stepsMult || 1) *
    (input.equipmentMult || 1) *
    (input.consumablesMult || 1);

  const raw = BASE_VIEW * mult;
  const capped = Math.min(raw, VIEW_CAP);
  const isCapped = raw >= VIEW_CAP;

  return {
    base: BASE_VIEW,
    raw,
    capped,
    isCapped,
  };
}

/**
 * Считает множитель экипировки: перемножает обзор от каждого предмета в слоте.
 * `equipment` — массив { slotKey, item }
 */
export function getEquipmentViewMultiplier(equipment, lang) {
  let m = 1;
  (equipment || []).forEach(({ item }) => {
    if (!item) return;
    m *= getItemViewMultiplier(item, lang);
  });
  return m;
}

// ============ РАСХОДНИКИ ============
/**
 * Фильтрует расходники из парсера по наличию «Обзор» + useables.
 */
export function getDynamicViewConsumables(allItems, lang) {
  return allItems
    .filter(item => {
      const sprite = item.sprite || '';
      const facts = item.facts || [];

      const isUseable = /\/useables\//.test(sprite);
      if (!isUseable) return false;

      const slotFact = facts.find(f => f.label === 'Слот' || f.label === 'Place');
      const slot = (slotFact?.value || '').toLowerCase();
      const isRealSlot = slot !== '' && slot !== 'расходник' && slot !== 'consumable';
      if (isRealSlot) return false;

      return isViewItem(item);
    })
    .map(item => {
      const viewEffect = item.effects?.find(e => /Обзор|View Distance/i.test(e)) || '';
      const m = viewEffect.match(/\+?(\d+(?:\.\d+)?)%/);
      return {
        id: item.id,
        name: item.name,
        nameEn: item.name,
        effect: viewEffect,
        effectEn: viewEffect,
        viewPercent: m ? parseFloat(m[1]) : null,
        icon: item.sprite,
      };
    });
}