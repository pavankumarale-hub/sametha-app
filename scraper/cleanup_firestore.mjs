import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccount.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const toDelete = [
  s => s.includes('tho modalayye saamethalu'),
  s => s.includes('aksharamtho modalayye'),
];

const snap = await db.collection('saamethas').get();
let deleted = 0;
const batch = db.batch();
for (const doc of snap.docs) {
  const text = doc.data().text ?? doc.id;
  if (toDelete.some(fn => fn(text))) {
    batch.delete(doc.ref);
    console.log('Deleting:', text.slice(0, 60));
    deleted++;
  }
}
if (deleted > 0) {
  await batch.commit();
  console.log(`\nDeleted ${deleted} entries from Firestore.`);
} else {
  console.log('Nothing to delete in Firestore.');
}
process.exit(0);
