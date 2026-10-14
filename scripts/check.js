import { readFile } from 'node:fs/promises';

const items = JSON.parse(await readFile('data/items-en.json', 'utf-8'));
const followers = JSON.parse(await readFile('data/followers-en.json', 'utf-8'));

const viewItems = items.filter(it =>
  it.effects?.some(e => e.toLowerCase().includes('view distance'))
);

const viewPets = followers.filter(p =>
  p.sections?.some(s =>
    (s.title || '').toLowerCase().includes('bestial bond') &&
    (s.texts || []).some(t => t.toLowerCase().includes('view distance'))
  )
);

console.log('📦 Всего предметов:', items.length);
console.log('👁 Предметов с View Distance:', viewItems.length);
viewItems.slice(0, 20).forEach(it => {
  const view = it.effects.find(e => e.toLowerCase().includes('view distance'));
  console.log(`   ${it.name} — ${view}`);
});

console.log('\n🐾 Всего питомцев:', followers.length);
console.log('👁 Питомцев с View Distance в Bestial Bond:', viewPets.length);
viewPets.forEach(p => {
  const bond = p.sections.find(s => (s.title || '').toLowerCase().includes('bestial bond'));
  console.log(`   ${p.name}:`);
  bond.texts.forEach(t => console.log(`      ${t}`));
});