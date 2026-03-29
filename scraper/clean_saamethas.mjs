/**
 * Cleans saamethas.json:
 * 1. Removes trailing name attributions like (Name, City), (Dr Name), etc.
 * 2. Deletes entries that are clearly not proverbs (English-only, website junk, dates, etc.)
 */
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./saamethas.json', 'utf8'));

// ── STEP 1: Strip trailing name/location attributions ──────────────────────
function stripAttribution(s) {
  return s
    // (Name, City) / (Dr Name) / (Name - Place) / (Name)
    .replace(/\s*\([A-Z][^()]{2,60}(?:,\s*[A-Za-z\s]+)?\)\s*\.?$/g, '')
    // trailing period-free names like "Murali Tallapaka" at end
    .replace(/\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s*\.?$/, '')
    // Contributed by ... (any remaining)
    .replace(/\s*[Cc]ontibuited by[^)]*\)?\s*$/g, '')
    .replace(/\s*Contributed by[^)]*\)?\s*$/gi, '')
    .trim()
    // Remove trailing .. or . duplicates
    .replace(/\.{2,}$/, '.')
    .trim();
}

// ── STEP 2: Detect junk entries ────────────────────────────────────────────
function isJunk(s) {
  const t = s.trim();

  // Too short to be a proverb
  if (t.length < 10) return true;

  // Purely English sentences (website feedback, comments, etc.)
  // A real sametha in romanised Telugu has no pure English grammar patterns
  const pureEnglishPatterns = [
    /^(Hello|Hi|Dear|Thanks|Thank you|Regards|Sincerely)/i,
    /^(I visited|I found|I think|Please|Your site|This site|Great work)/i,
    /^(Page Last|Previous|Next|Site owned|Contact Us|Visitor Number)/i,
    /^(Four P|Chennai|India\.?$)/i,
    /^\d{1,2}(st|nd|rd|th)\s+\w+\s+\d{4}$/i,  // dates like "24th July 2001"
    /^\d{2}th\s+\w+/i,
    /^V\.\s*[A-Z][a-z]+\s+[A-Z][a-z]+\.?$/,    // "V.Ravi Kumar."
    /^[A-Z][a-z]+\s*\.?$/,                       // single name "Praveena."
    /^so that people/i,
    /^Telugu lo nenu/i,
    /^Meeku naa krithaj/i,
    /^Ilanti websites/i,
    /frameborder|scrolling|marginwidth|widget/i,  // HTML
    /www\.|http:|\.com|\.html/i,                  // URLs
    /^\d{2}\/\d{2}\/\d{4}/,                       // dates with slashes
  ];

  for (const pattern of pureEnglishPatterns) {
    if (pattern.test(t)) return true;
  }

  // Entries that are purely ASCII with no Telugu-ish words
  // Real romanised Telugu saamethas have characteristic patterns
  const hasTeluguWords = /\b(annatlu|andata|antaaru|aadhu|ledu|kaadu|undhi|vastundi|chesadu|chesindi|untundi|vaadu|vaari|meeda|lona|ante|aithe|kaani|chesthe|vachhi|poyindi|ayindi|chestadu|cheppadu|chestundi|tintadu|velladu|vachhaadu|chesaadu|ayyindi|poyyindi|padindi|cheppindi|chestae|aadae|pothae|vachhe|cheppae|lekka|tappa|bonka|vuntae|undae|kaadhu|laedhu|ledhu|undi|undu|anna|amma|nanna|akka|atta|maama|kodalu|pellaamu|pellam|bharya|bharta|koduku|kooturru|pillalu|manishi|manushulu|raja|deva|devudu|bhagavanthudu|brahmamu|loka|lokam|neti|neeti|sastra|vidya|dhanam|dhaanyam|sandhi|santosham|dukkham|sukham|paapam|punyam|dharma|karma|maya|moha|krodha|lobha)\b/i;

  // If it looks like only English words and no Telugu-ish words, mark as junk
  const wordsInLatin = t.match(/[a-zA-Z]+/g) ?? [];
  const englishOnlyWords = ['the', 'and', 'for', 'with', 'that', 'this', 'your', 'have', 'from', 'been', 'will', 'they', 'also', 'some', 'what', 'when', 'then', 'than', 'into', 'more', 'very', 'just', 'about', 'would', 'could', 'should', 'which', 'there', 'their', 'great', 'people'];
  const englishWordCount = wordsInLatin.filter(w => englishOnlyWords.includes(w.toLowerCase())).length;
  if (englishWordCount >= 3 && !hasTeluguWords.test(t)) return true;

  return false;
}

// ── Process ────────────────────────────────────────────────────────────────
const removed = [];
const cleaned = [];

for (const s of data) {
  if (isJunk(s)) {
    removed.push(s);
    continue;
  }
  const c = stripAttribution(s);
  cleaned.push(c);
}

// Deduplicate
const unique = [...new Set(cleaned)];

console.log(`Original: ${data.length}`);
console.log(`Removed as junk: ${removed.length}`);
console.log(`After cleaning: ${unique.length}`);
console.log('\nRemoved entries:');
removed.forEach(s => console.log(' -', JSON.stringify(s.slice(0, 80))));

writeFileSync('./saamethas.json', JSON.stringify(unique, null, 2));
console.log('\nsaamethas.json updated.');
