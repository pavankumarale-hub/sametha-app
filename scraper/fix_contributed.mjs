/**
 * Renames Firestore saametha documents that had "(Contributed by ...)" suffixes.
 * Copies data to new doc ID (cleaned name), deletes old doc.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

function cleanName(s) {
  return s.replace(/\s*\(contributed by[^)]*\)/gi, '')
          .replace(/\s*\(saumya\)/gi, '')
          .trim();
}

const snap = await db.collection('saamethas').get();
let fixed = 0;

for (const docSnap of snap.docs) {
  const original = docSnap.id;
  const cleaned = cleanName(original);
  if (original !== cleaned) {
    const batch = db.batch();
    // Create cleaned doc
    batch.set(db.collection('saamethas').doc(cleaned), docSnap.data());
    // Delete old doc
    batch.delete(docSnap.ref);
    await batch.commit();
    console.log(`Renamed: "${original.slice(0,60)}" -> "${cleaned.slice(0,60)}"`);
    fixed++;
  }
}

console.log(`\nFixed ${fixed} saametha entries in Firestore.`);
process.exit(0);
