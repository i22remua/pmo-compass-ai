import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

let env;
const project = (uid = 'alice') => ({ ownerId: uid, name: 'Test project', sector: 'Technology', description: '', objectives: '', startDate: '', endDate: '', status: 'planning', budget: null, stakeholders: '', notes: '', createdAt: '2026-09-12T12:00:00Z', updatedAt: '2026-09-12T12:00:00Z' });
const document = (uid = 'alice', projectId = 'p1') => ({ ownerId: uid, projectId, type: 'risk_register', language: 'es', inputContext: '', generatedContent: '# Draft', createdAt: '2026-09-12T12:00:00Z', provider: 'demo', risks: [], warnings: [] });
const db = (uid = 'alice') => env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore();
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-pmo-compass', firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); await env.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), 'projects/p1'), project()); await setDoc(doc(context.firestore(), 'documents/d1'), document()); }); });
after(async () => { await env?.cleanup(); });

test('anonymous users cannot read projects or documents', async () => {
  const guest = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(guest, 'projects/p1')));
  await assertFails(getDoc(doc(guest, 'documents/d1')));
});
test('owners can CRUD projects; other users cannot access them', async () => {
  await assertSucceeds(getDoc(doc(db(), 'projects/p1')));
  await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { notes: 'Updated' }));
  await assertFails(getDoc(doc(db('bob'), 'projects/p1')));
  await assertFails(updateDoc(doc(db('bob'), 'projects/p1'), { notes: 'Attack' }));
  await assertFails(deleteDoc(doc(db('bob'), 'projects/p1')));
  await assertSucceeds(deleteDoc(doc(db(), 'projects/p1')));
});
test('queries must be scoped to the authenticated owner', async () => {
  await assertFails(getDocs(collection(db(), 'projects')));
  await assertSucceeds(getDocs(query(collection(db(), 'projects'), where('ownerId', '==', 'alice'))));
  await assertFails(getDocs(query(collection(db('bob'), 'projects'), where('ownerId', '==', 'alice'))));
  await assertFails(getDocs(collection(db(), 'documents')));
  await assertSucceeds(getDocs(query(collection(db(), 'documents'), where('ownerId', '==', 'alice'))));
});
test('project owner and creation timestamp are immutable', async () => {
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { ownerId: 'bob' }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { createdAt: 'tomorrow' }));
  await assertFails(setDoc(doc(db('bob'), 'projects/p2'), project('alice')));
});
test('document creation requires an active project owned by the same user', async () => {
  await assertSucceeds(setDoc(doc(db(), 'documents/valid'), document()));
  await assertFails(setDoc(doc(db('bob'), 'documents/foreign'), document('bob')));
  await assertFails(setDoc(doc(db(), 'documents/orphan'), document('alice', 'missing')));
});
test('saved documents cannot be reassigned, modified or accessed by another owner', async () => {
  await assertSucceeds(setDoc(doc(db(), 'documents/d1'), document()));
  await assertFails(getDoc(doc(db('bob'), 'documents/d1')));
  await assertFails(updateDoc(doc(db(), 'documents/d1'), { generatedContent: 'Changed' }));
  await assertFails(updateDoc(doc(db(), 'documents/d1'), { ownerId: 'bob' }));
  await assertFails(deleteDoc(doc(db('bob'), 'documents/d1')));
  await assertSucceeds(deleteDoc(doc(db(), 'documents/d1')));
});
test('deletion tombstone prevents new documents and cannot be undone', async () => {
  await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { deleting: true }));
  await assertFails(setDoc(doc(db(), 'documents/new'), document()));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { deleting: false }));
  const ownerDb = db();
  const batch = writeBatch(ownerDb); batch.delete(doc(ownerDb, 'documents/d1')); batch.delete(doc(ownerDb, 'projects/p1'));
  await assertSucceeds(batch.commit());
});
test('invalid fields and oversized notes are rejected', async () => {
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { budget: -1 }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { notes: 'x'.repeat(20001) }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { status: 'invalid' }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { startDate: '2026-12-01', endDate: '2026-01-01' }));
  await assertFails(setDoc(doc(db(), 'documents/invalid'), { ...document(), language: 'fr' }));
});
test('profiles are private and validated', async () => {
  const profile = { uid: 'alice', name: 'Alice', email: 'alice@example.com', preferredLanguage: 'es', createdAt: '2026-09-12T12:00:00Z' };
  await assertSucceeds(setDoc(doc(db(), 'users/alice'), profile));
  await assertSucceeds(updateDoc(doc(db(), 'users/alice'), { preferredLanguage: 'en' }));
  await assertFails(getDoc(doc(db('bob'), 'users/alice')));
  await assertFails(setDoc(doc(db('bob'), 'users/alice'), profile));
  await assertFails(updateDoc(doc(db(), 'users/alice'), { email: 'fake@example.com' }));
});

for (const provider of ['offline', 'gemini', 'groq', 'openrouter', 'ollama']) {
  test(`provider provenance ${provider} is accepted only with an owned parent`, async () => {
    await assertSucceeds(setDoc(doc(db(), 'documents/provider'), { ...document(), provider }));
    await assertFails(setDoc(doc(db('bob'), 'documents/foreign-provider'), { ...document('bob'), provider }));
  });
}
test('unknown provider provenance cannot be stored', async () => {
  await assertFails(setDoc(doc(db(), 'documents/provider'), { ...document(), provider: 'invented' }));
});

const source = (uid = 'alice', projectId = 'p1') => ({ ownerId: uid, projectId, label: 'Meeting.txt', locator: '¶ 1', text: 'Vendor delayed.', reviewed: false, createdAt: '2026-09-28T12:00:00Z' });
const record = (uid = 'alice', projectId = 'p1') => ({ ownerId: uid, projectId, kind: 'action', title: 'Confirm delivery', status: 'open', dueDate: '2026-09-27', severity: 'unspecified', evidence: 'Meeting', createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z' });
for (const [name, fixture] of [['sources', source], ['records', record]]) {
  test(`${name}: owner and parent isolation, scoped queries and retryable cleanup`, async () => {
    const ref = doc(db(), name, 'item');
    await assertSucceeds(setDoc(ref, fixture()));
    await assertSucceeds(getDocs(query(collection(db(), name), where('ownerId', '==', 'alice'))));
    await assertFails(getDocs(collection(db(), name)));
    await assertFails(getDoc(doc(db('bob'), name, 'item')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), name, 'item')));
    await assertFails(deleteDoc(doc(db('bob'), name, 'item')));
    await assertFails(setDoc(doc(db('bob'), name, 'foreign'), fixture('bob')));
    await assertFails(setDoc(doc(db(), name, 'orphan'), fixture('alice', 'absent')));
    await assertFails(updateDoc(ref, { ownerId: 'bob' }));
    await assertFails(updateDoc(ref, { projectId: 'absent' }));
    await assertFails(updateDoc(ref, { createdAt: 'changed' }));
    await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { deleting: true }));
    await assertFails(setDoc(doc(db(), name, 'during-deletion'), fixture()));
    await assertSucceeds(deleteDoc(doc(db(), 'projects/p1')));
    await assertSucceeds(deleteDoc(ref));
  });
}
test('source snapshots are immutable and bounded; record lifecycle remains editable', async () => {
  await assertSucceeds(setDoc(doc(db(), 'sources/s'), source()));
  await assertFails(updateDoc(doc(db(), 'sources/s'), { text: 'Modified quote' }));
  await assertFails(setDoc(doc(db(), 'sources/large'), { ...source(), text: 'x'.repeat(2001) }));
  await assertSucceeds(setDoc(doc(db(), 'records/r'), record()));
  await assertSucceeds(updateDoc(doc(db(), 'records/r'), { status: 'closed' }));
  await assertFails(updateDoc(doc(db(), 'records/r'), { severity: 'high' }));
  await assertFails(updateDoc(doc(db(), 'records/r'), { kind: 'decision' }));
  await assertFails(updateDoc(doc(db(), 'records/r'), { status: 'invented' }));
  await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { aiAccess: 'offline' }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { aiAccess: 'unrestricted' }));
});
