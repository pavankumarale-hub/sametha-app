import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./saamethas.json', 'utf8'));

// These are outright junk — delete entirely
const junkExact = new Set([
  'Your Saamethalu page is fantastic.',
  'Loknath Sriparavastu',
  '7th Aug 2001.',
  'Site Updated Mar 06, 2001 09:30 IST',
  'YourBabysName Dot Com Pvt Ltd,',
]);

function isJunk(s) {
  if (junkExact.has(s.trim())) return true;
  if (s.trim().length < 8) return true;
  return false;
}

function stripAttribution(s) {
  return s
    // ( Created by Name, City ) or ( Contributed by Name, City )
    .replace(/\s*\(\s*[Cc]reated by[^)]*\)/g, '')
    .replace(/\s*\([Cc]ontr?ibu?i?ted by[^)]*\)/g, '')
    // trailing (Name Surname, City) — only if it looks like a person's name at the end
    .replace(/\s*\(\s*[A-Z][a-z]+ [A-Z][a-z]+(?: [A-Z][a-z]+)?,\s*[A-Za-z ]+\)\s*\.?$/g, '')
    // trailing ( Rama Rao Vemulakonda, Secunderabad) style
    .replace(/\s*\(\s*[A-Z][a-z]+(?: [A-Z][a-z]+){1,3},\s*[A-Za-z]+\)\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const result = [];
const removed = [];
const changed = [];

for (const s of data) {
  if (isJunk(s)) { removed.push(s); continue; }
  const c = stripAttribution(s);
  if (c !== s) changed.push({ from: s, to: c });
  result.push(c.length >= 8 ? c : s);
}

const unique = [...new Set(result)];

console.log(`Original: ${data.length} → Final: ${unique.length}`);
console.log(`Removed: ${removed.length}, Attribution stripped: ${changed.length}`);

if (removed.length) {
  console.log('\n--- REMOVED ---');
  removed.forEach(s => console.log(' -', s.slice(0, 80)));
}
if (changed.length) {
  console.log('\n--- ATTRIBUTION STRIPPED ---');
  changed.forEach(({from, to}) => console.log(` FROM: ${from.slice(0,80)}\n   TO: ${to.slice(0,80)}\n`));
}

writeFileSync('./saamethas.json', JSON.stringify(unique, null, 2));
console.log('\nDone.');
