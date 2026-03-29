/**
 * Generates meanings for all saamethas using Gemini API and uploads to Firestore.
 * Usage: node generate_meanings.mjs YOUR_GEMINI_API_KEY
 * Resumes automatically — skips saamethas that already have meanings in Firestore.
 */
import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const apiKey = process.argv[2];
if (!apiKey) {
  console.error('Usage: node generate_meanings.mjs YOUR_ANTHROPIC_API_KEY');
  process.exit(1);
}

const BATCH = 100;      // Claude is fast, do more per run
const DELAY_MS = 500;   // Claude API has generous rate limits
const MODEL = 'claude-haiku-4-5-20251001'; // fastest + cheapest Claude model

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const saamethas = JSON.parse(readFileSync('./saamethas.json', 'utf8'));
console.log(`Total saamethas: ${saamethas.length}`);

// Find which ones already have meanings
const existing = new Set();
const snap = await db.collection('meanings').select().stream();
await new Promise(resolve => {
  snap.on('data', doc => existing.add(doc.id));
  snap.on('end', resolve);
});
console.log(`Already have meanings: ${existing.size}`);

const remaining = saamethas.filter(s => !existing.has(s));
console.log(`Remaining: ${remaining.length}`);

const toProcess = remaining.slice(0, BATCH);
console.log(`Processing ${toProcess.length} this run...\n`);

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getMeaning(sametha) {
  const prompt = `You are an expert in Telugu proverbs (saamethas).
For the Telugu proverb: "${sametha}"

Respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "meaning": "Clear English explanation of what this proverb means and when it is used (2-3 sentences)",
  "example": {
    "context": "One sentence describing a situation where this proverb applies",
    "conversation": [
      { "speaker": "Name1", "line": "dialogue line" },
      { "speaker": "Name2", "line": "dialogue line that naturally uses this proverb" },
      { "speaker": "Name1", "line": "response dialogue line" }
    ]
  }
}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 429 || res.status === 529) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '10', 10);
        console.log(`  Rate limited — waiting ${retryAfter}s...`);
        await sleep((retryAfter + 2) * 1000);
        continue;
      }

      const json = await res.json();
      if (!res.ok) {
        console.warn(`  HTTP ${res.status}: ${json?.error?.message?.slice(0, 120)}`);
        return null;
      }

      const raw = json?.content?.[0]?.text ?? '';
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const data = JSON.parse(cleaned);
      if (data?.meaning && data?.example?.conversation?.length) return data;
    } catch (e) {
      console.warn(`  Error: ${e.message}`);
      await sleep(3000);
    }
  }
  return null;
}

let success = 0;
for (let i = 0; i < toProcess.length; i++) {
  const sametha = toProcess[i];
  process.stdout.write(`[${i + 1}/${toProcess.length}] ${sametha.slice(0, 60)}... `);
  const data = await getMeaning(sametha);
  if (data) {
    await db.collection('meanings').doc(sametha).set(data);
    success++;
    console.log('OK');
  } else {
    console.log('SKIPPED');
  }
  await new Promise(r => setTimeout(r, DELAY_MS));
}

console.log(`\nDone: ${success}/${toProcess.length} uploaded.`);
console.log(`Remaining: ${remaining.length - success}`);
if (remaining.length > BATCH) console.log(`Run again to continue the next batch.`);
process.exit(0);
