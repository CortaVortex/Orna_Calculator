// scripts/parse-classes.js
// Парсер классов и специализаций Orna Codex.
// Запуск: node scripts/parse-classes.js

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'data');

const BASE = 'https://playorna.com';
const LANGS = ['ru', 'en'];
const DELAY_MS = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchHtml(path) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OrnaCalcParser/1.0)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function extractBootstrap(html) {
  const match = html.match(
    /<script[^>]*id=["']codex-bootstrap["'][^>]*>([\s\S]*?)<\/script>/
  );
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

// ============ ПОИСК BB В EFFECTS ============
// Ищем строку вида "Звериные узы: Уровень 3" или "Bestial Bond: Level 3"
function findBestialBondLevel(effects) {
  if (!Array.isArray(effects)) return null;
  for (const eff of effects) {
    if (typeof eff !== 'string') continue;

    // Русский вариант
    let m = eff.match(/Звериные\s+узы[:\s]+Уровень\s*(\d)/i);
    if (m) return parseInt(m[1]);

    // Английский вариант
    m = eff.match(/Bestial\s+Bond[:\s]+Level\s*(\d)/i);
    if (m) return parseInt(m[1]);
  }
  return null;
}

// ============ ПОИСК ORACLE ============
// Оракул/Великий Оракул — специализация. У классов её нет,
// но проверим на всякий случай.
function isOracle(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  return text.includes('оракул') || text.includes('oracle');
}

// ============ СОБРАТЬ СПИСОК КЛАССОВ ============
async function collectClasses(lang) {
  console.log(`  📜 Список классов [${lang}]`);
  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const path = `/codex/classes/?p=${page}&lang=${lang}`;
    const html = await fetchHtml(path);
    const data = extractBootstrap(html);
    if (!data) break;

    totalPages = data.pages || 1;
    if (data.results?.length) all.push(...data.results);
    page++;
    await sleep(DELAY_MS);
  } while (page <= totalPages);

  console.log(`    Найдено: ${all.length}`);
  return all;
}

// ============ ЗАГРУЗИТЬ ДЕТАЛИ КЛАССА ============
async function fetchClassDetail(url, lang) {
  try {
    const html = await fetchHtml(`${url}?lang=${lang}`);
    const data = extractBootstrap(html);
    return data?.detail || null;
  } catch { return null; }
}

// ============ ОСНОВНАЯ ЛОГИКА ============
async function parseAllForLang(lang) {
  console.log(`\n🌐 Язык: ${lang.toUpperCase()}`);
  const list = await collectClasses(lang);
  const result = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const detail = await fetchClassDetail(item.url, lang);

    const effects = detail?.effects || [];
    const bbLevel = findBestialBondLevel(effects);

    result.push({
      id: item.id,
      name: item.name,
      url: item.url,
      sprite: item.sprite,
      tier: item.tier,
      description: detail?.description || item.description || '',
      facts: detail?.facts || [],
      effects: effects,
      bestialBondLevel: bbLevel,
      isOracle: isOracle(item.name, detail?.description || ''),
    });

    const bbLabel = bbLevel ? `BB${bbLevel}` : '—';
    process.stdout.write(`\r    Детали: ${i + 1}/${list.length}  (${bbLabel})   `);
    await sleep(DELAY_MS);
  }

  console.log();
  return result;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const lang of LANGS) {
    const data = await parseAllForLang(lang);
    const outPath = join(OUTPUT_DIR, `classes-${lang}.json`);
    await writeFile(outPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`  💾 data/classes-${lang}.json (${data.length} записей)`);
  }

  console.log('\n🎉 Готово.');
}

main().catch(err => {
  console.error('💥 Ошибка:', err);
  process.exit(1);
});