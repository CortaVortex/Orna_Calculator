// scripts/parse-codex.js
// Парсер Orna Codex. Тянет предметы и питомцев вместе с их свойствами.
// Запуск: node scripts/parse-codex.js

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT_DIR = join(ROOT, 'data');

const BASE = 'https://playorna.com';
const LANGS = ['ru', 'en'];
const DELAY_MS = 150; // пауза между запросами

const CATEGORIES = [
  { key: 'items',     url: '/codex/items/',     file: 'items' },
  { key: 'followers', url: '/codex/followers/', file: 'followers' },
];

// ============ УТИЛИТЫ ============
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
  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error('  ⚠️ JSON parse error:', e.message);
    return null;
  }
}

// ============ СБОР СПИСКА (все страницы) ============
async function collectList(category, lang) {
  console.log(`  📜 Список: ${category.key} [${lang}]`);

  const all = [];
  let page = 1;
  let totalPages = 1;

  do {
    const path = `${category.url}?p=${page}&lang=${lang}`;
    const html = await fetchHtml(path);
    const data = extractBootstrap(html);

    if (!data) {
      console.error(`    ❌ Не найден bootstrap на стр. ${page}`);
      break;
    }

    totalPages = data.pages || 1;
    if (data.results?.length) all.push(...data.results);

    process.stdout.write(`\r    Страница ${page}/${totalPages}, собрано: ${all.length}   `);
    page++;
    await sleep(DELAY_MS);
  } while (page <= totalPages);

  console.log();
  return all;
}

// ============ ЗАГРУЗКА ДЕТАЛЕЙ ОДНОЙ ЗАПИСИ ============
async function fetchDetail(url, lang) {
  const path = `${url}?lang=${lang}`;
  try {
    const html = await fetchHtml(path);
    const data = extractBootstrap(html);
    return data?.detail || null;
  } catch (e) {
    return null;
  }
}

// ============ ОСНОВНАЯ ФУНКЦИЯ ДЛЯ ЯЗЫКА ============
async function parseAllForLang(lang) {
  console.log(`\n🌐 Язык: ${lang.toUpperCase()}`);

  const output = {};

  for (const cat of CATEGORIES) {
    const list = await collectList(cat, lang);
    const detailed = [];

    console.log(`  🔍 Загружаю детали (${list.length} шт.)...`);

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const detail = await fetchDetail(item.url, lang);

      detailed.push({
        id: item.id,
        name: item.name,
        url: item.url,
        sprite: item.sprite,
        tier: item.tier,
        rarity: item.rarity,
        exotic: item.exotic,
        arisen: item.arisen,
        community: item.community,
        description: detail?.description || item.description || '',
        facts: detail?.facts || [],
        effects: detail?.effects || [],
        sections: detail?.sections || [],
        tags: detail?.tags || [],
      });

      const pct = Math.round(((i + 1) / list.length) * 100);
      process.stdout.write(`\r    Детали: ${i + 1}/${list.length} (${pct}%)   `);
      await sleep(DELAY_MS);
    }

    console.log();
    output[cat.file] = detailed;
  }

  return output;
}

// ============ MAIN ============
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const lang of LANGS) {
    const data = await parseAllForLang(lang);

    for (const [key, arr] of Object.entries(data)) {
      const outPath = join(OUTPUT_DIR, `${key}-${lang}.json`);
      await writeFile(outPath, JSON.stringify(arr, null, 2), 'utf-8');
      console.log(`  💾 data/${key}-${lang}.json (${arr.length} записей)`);
    }
  }

  console.log('\n🎉 Готово.');
}

main().catch(err => {
  console.error('💥 Ошибка:', err);
  process.exit(1);
});