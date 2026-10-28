import { after, before, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch, serverTimestamp } from 'firebase/firestore';

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
  // Decisions now support a confirmed deadline; risks still cannot carry one.
  await assertSucceeds(updateDoc(doc(db(), 'records/r'), { kind: 'decision' }));
  await assertFails(updateDoc(doc(db(), 'records/r'), { kind: 'risk' }));
  await assertFails(updateDoc(doc(db(), 'records/r'), { status: 'invented' }));
  await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { aiAccess: 'offline' }));
  await assertFails(updateDoc(doc(db(), 'projects/p1'), { aiAccess: 'unrestricted' }));
});

test('children cannot be moved or created under another user project', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'projects/p2'), project('bob'));
  });
  await assertFails(setDoc(doc(db(), 'sources/foreign-parent'), source('alice', 'p2')));
  await assertFails(setDoc(doc(db(), 'records/foreign-parent'), record('alice', 'p2')));
  await assertSucceeds(setDoc(doc(db(), 'records/owned'), record()));
  await assertFails(updateDoc(doc(db(), 'records/owned'), { projectId: 'p2' }));
  await assertFails(updateDoc(doc(db('bob'), 'records/owned'), { projectId: 'p2' }));
});

test('unexpected collections and unexpected fields are denied', async () => {
  await assertFails(setDoc(doc(db(), 'admin/config'), { ownerId: 'alice' }));
  await assertFails(setDoc(doc(db(), 'projects/unexpected'), { ...project(), role: 'admin' }));
  await assertFails(setDoc(doc(db(), 'documents/unexpected'), { ...document(), token: 'forged' }));
  await assertFails(setDoc(doc(db(), 'sources/unexpected'), { ...source(), hidden: true }));
  await assertFails(setDoc(doc(db(), 'records/unexpected'), { ...record(), userId: 'alice' }));
});

const review = (uid='alice', projectId='p1') => ({ownerId:uid,projectId,language:'es',engine:'offline',contextKey:'a'.repeat(64),payload:JSON.stringify({status:'active',risks:[],records:[]}),createdAt:'2026-10-02T12:00:00Z',updatedAt:'2026-10-02T12:00:00Z'});
test('project reviews require active owned parents, strict metadata and scoped queries', async () => {
  await assertSucceeds(getDoc(doc(db(),'reviews/p1')));
  await assertFails(getDoc(doc(db('bob'),'reviews/p1')));
  await assertSucceeds(setDoc(doc(db(),'reviews/p1'),review()));
  await assertSucceeds(getDocs(query(collection(db(),'reviews'),where('ownerId','==','alice'))));
  await assertFails(getDocs(collection(db(),'reviews')));
  await assertFails(getDoc(doc(db('bob'),'reviews/p1')));
  await assertFails(setDoc(doc(db('bob'),'reviews/p1'),review('bob')));
  await assertFails(setDoc(doc(db(),'reviews/missing'),review('alice','missing')));
  await assertFails(setDoc(doc(db(),'reviews/wrong-id'),review()));
  for (const fields of [{engine:'gemini'},{contextKey:'bad'},{payload:'x'.repeat(180001)},{extra:true},{language:'fr'}]) {
    await assertFails(updateDoc(doc(db(),'reviews/p1'),fields));
  }
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'reviews/p1')));
});
test('review ownership is immutable and tombstones preserve deletion retries', async () => {
  await assertSucceeds(setDoc(doc(db(),'reviews/p1'),review()));
  await assertSucceeds(updateDoc(doc(db(),'reviews/p1'),{updatedAt:'2026-10-03T12:00:00Z'}));
  await assertFails(updateDoc(doc(db(),'reviews/p1'),{createdAt:'changed'}));
  await assertFails(updateDoc(doc(db(),'reviews/p1'),{ownerId:'bob'}));
  await assertFails(updateDoc(doc(db(),'reviews/p1'),{projectId:'p2'}));
  await assertSucceeds(updateDoc(doc(db(),'projects/p1'),{deleting:true}));
  await assertFails(updateDoc(doc(db(),'reviews/p1'),{updatedAt:'changed'}));
  await assertFails(deleteDoc(doc(db('bob'),'reviews/p1')));
  await assertSucceeds(deleteDoc(doc(db(),'projects/p1')));
  await assertSucceeds(getDoc(doc(db(),'reviews/p1')));
  await assertSucceeds(deleteDoc(doc(db(),'reviews/p1')));
});

const control = (uid = 'alice', projectId = 'p1') => ({ id: 'c1', ownerId: uid, projectId, kind: 'cost', title: 'Delivery costs', evidence: 'Invoice register', recordId: '', archived: false, data: { approved: 1000, actual: 0, forecast: 1200, asOf: '2026-10-11' }, revision: 1, versionId: 'v1', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const writeControl = (database, value) => {
  const batch = writeBatch(database);
  batch.set(doc(database, 'controls', value.id), value);
  batch.set(doc(database, 'controlVersions', value.versionId), value);
  return batch.commit();
};
test('controls require atomic matching history and reject foreign/anonymous ownership and orphan projects', async () => {
  await assertFails(setDoc(doc(db(), 'controls/c1'), control()));
  await assertFails(writeControl(db('bob'), control('bob')));
  await assertFails(writeControl(env.unauthenticatedContext().firestore(), control()));
  await assertFails(writeControl(db(), control('alice', 'missing')));
  await assertSucceeds(writeControl(db(), control()));
  for (const name of ['controls', 'controlVersions']) {
    await assertSucceeds(getDocs(query(collection(db(), name), where('ownerId','==','alice'))));
    await assertFails(getDocs(collection(db(), name)));
    await assertFails(getDocs(query(collection(db('bob'), name), where('ownerId','==','alice'))));
    await assertFails(getDoc(doc(db('bob'), name, name === 'controls' ? 'c1' : 'v1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), name, name === 'controls' ? 'c1' : 'v1')));
  }
});
test('control versions are immutable and concurrency checks reject stale/skipped revisions', async () => {
  await assertSucceeds(writeControl(db(), control()));
  const stored = (await getDoc(doc(db(), 'controls/c1'))).data();
  const next = { ...stored, revision: 2, versionId: 'v2', updatedAt: serverTimestamp(), data: { ...stored.data, actual: 300 } };
  await assertFails(updateDoc(doc(db(), 'controlVersions/v1'), { title: 'Rewrite history' }));
  await assertFails(writeControl(db(), { ...next, ownerId: 'bob' }));
  await assertFails(writeControl(db(), { ...next, revision: 3 }));
  await assertFails(writeControl(db(), { ...next, createdAt: serverTimestamp() }));
  await assertSucceeds(writeControl(db(), next));
  await assertFails(writeControl(db(), { ...next, versionId: 'v3' }));
  await assertFails(deleteDoc(doc(db(), 'controls/c1')));
  await assertFails(deleteDoc(doc(db(), 'controlVersions/v1')));
  await assertSucceeds(updateDoc(doc(db(), 'projects/p1'), { deleting: true }));
  await assertFails(writeControl(db(), { ...next, revision: 3, versionId: 'v3' }));
  await assertSucceeds(deleteDoc(doc(db(), 'controlVersions/v1')));
  await assertSucceeds(deleteDoc(doc(db(), 'controlVersions/v2')));
  await assertSucceeds(deleteDoc(doc(db(), 'controls/c1')));
});
test('costs and observed benefits reject invalid values, dates and missing evidence', async () => {
  for (const patch of [{ actual: -1 }, { forecast: 1e13 }, { asOf: '2026-02-30' }, { asOf: '2025-02-29' }, { asOf: '2026-13-01' }]) {
    await assertFails(writeControl(db(), { ...control(), data: { ...control().data, ...patch } }));
  }
  await assertFails(writeControl(db(), { ...control(), evidence: '' }));
  const benefit = { ...control(), kind: 'benefit', data: { objective: 'Prepare reports faster', unit: 'minutes', baseline: 60, target: 30, actual: null, measuredOn: '', direction: 'decrease' } };
  await assertFails(writeControl(db(), { ...benefit, data: { ...benefit.data, actual: 0 } }));
  await assertFails(writeControl(db(), { ...benefit, evidence: '', data: { ...benefit.data, actual: 0, measuredOn: '2026-10-11' } }));
  await assertSucceeds(writeControl(db(), benefit));
});
test('decision resolution requires review, evidence and a declared decision date/role', async () => {
  const data = { status: 'proposed', reason: 'Vendor delay', alternatives: '', scopeImpact: '', timeImpact: '', costImpact: '', baseline: '', resolution: '', decidedOn: '', decisionRole: '' };
  const change = { ...control(), kind: 'change', data };
  await assertFails(writeControl(db(), { ...change, data: { ...data, status: 'accepted', alternatives: 'Reduce scope', resolution: 'Retain scope', decidedOn: '2026-10-11', decisionRole: 'Sponsor' } }));
  await assertSucceeds(writeControl(db(), change));
  const stored = (await getDoc(doc(db(), 'controls/c1'))).data();
  const reviewed = { ...stored, revision: 2, versionId: 'v2', updatedAt: serverTimestamp(), data: { ...data, status: 'reviewed', alternatives: 'Reduce scope or change schedule' } };
  await assertSucceeds(writeControl(db(), reviewed));
  const resolved = { ...reviewed, revision: 3, versionId: 'v3', data: { ...reviewed.data, status: 'accepted', resolution: 'Retain scope', decidedOn: '2026-10-11', decisionRole: 'Sponsor' } };
  await assertFails(writeControl(db(), { ...resolved, evidence: '' }));
  await assertSucceeds(writeControl(db(), resolved));
  await assertFails(writeControl(db(), { ...resolved, revision: 4, versionId: 'v4', data: { ...resolved.data, status: 'rejected' } }));
});
test('milestone baseline is immutable and links require the same owned project', async () => {
  const milestone = { ...control(), kind: 'milestone', data: { baselineDate: '2026-10-30', forecastDate: '', actualDate: '', dependency: '' } };
  await assertFails(writeControl(db(), { ...milestone, recordId: 'missing' }));
  await assertSucceeds(setDoc(doc(db(), 'projects/p2'), project()));
  await assertSucceeds(setDoc(doc(db(), 'records/r2'), record('alice', 'p2')));
  await assertFails(writeControl(db(), { ...milestone, recordId: 'r2' }));
  await assertSucceeds(writeControl(db(), milestone));
  const stored = (await getDoc(doc(db(), 'controls/c1'))).data();
  await assertFails(writeControl(db(), { ...stored, revision: 2, versionId: 'v2', updatedAt: serverTimestamp(), data: { ...stored.data, baselineDate: '2026-11-04' } }));
  await assertSucceeds(writeControl(db(), { ...stored, revision: 2, versionId: 'v2', updatedAt: serverTimestamp(), data: { ...stored.data, actualDate: '2026-11-04' } }));
});

test('review snapshots are immutable, owner scoped, migrate the actual old head and permit tombstone cleanup', async () => {
  const database=db(), old=review(), oldId=`p1--${old.contextKey}`;
  await assertSucceeds(setDoc(doc(database,'reviews/p1'),old));
  const next={...old,contextKey:'b'.repeat(64),updatedAt:'2026-10-08T12:00:00Z'};
  const batch=writeBatch(database);
  batch.set(doc(database,'reviewHistory',oldId),old);
  batch.set(doc(database,'reviews/p1'),next);
  batch.set(doc(database,'reviewHistory',`p1--${next.contextKey}`),next);
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(database,'reviewHistory',oldId),{payload:'rewritten'}));
  await assertFails(getDoc(doc(db('bob'),'reviewHistory',oldId)));
  await assertFails(getDocs(collection(database,'reviewHistory')));
  await assertSucceeds(getDocs(query(collection(database,'reviewHistory'),where('ownerId','==','alice'),where('projectId','==','p1'))));
  await assertFails(setDoc(doc(database,'reviewHistory',`p1--${'c'.repeat(64)}`),{...old,contextKey:'c'.repeat(64)}));
  await assertFails(deleteDoc(doc(database,'reviewHistory',oldId)));
  await assertSucceeds(updateDoc(doc(database,'projects/p1'),{deleting:true}));
  await assertSucceeds(deleteDoc(doc(database,'reviewHistory',oldId)));
});

const finding=(revision=1)=>({id:'p1--cost-variance:control-aaaaaaaaaaaaaaaaaaaaaaaa',ownerId:'alice',projectId:'p1',findingId:'cost-variance:control-aaaaaaaaaaaaaaaaaaaaaaaa',fingerprint:'a'.repeat(64),status:'dismissed',reason:'Approved correction evidenced in the minutes',revision,versionId:`finding-v${revision}`,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-08T00:00:00Z'});
const writeFinding=(database,value)=>{const b=writeBatch(database);b.set(doc(database,'findingStates',value.id),value);b.set(doc(database,'findingVersions',value.versionId),value);return b.commit();};
test('finding resolutions require a matching immutable version and reject stale or foreign writes', async()=>{
 const database=db(), f=finding();
 await assertFails(setDoc(doc(database,'findingStates',f.id),f));
 await assertSucceeds(writeFinding(database,f));
 await assertFails(writeFinding(database,{...finding(3),reason:'Skipped revision'}));
 await assertSucceeds(writeFinding(database,{...finding(2),fingerprint:'b'.repeat(64),status:'pending'}));
 await assertFails(writeFinding(database,{...finding(2),versionId:'stale'}));
 await assertFails(updateDoc(doc(database,'findingVersions',f.versionId),{reason:'Rewrite'}));
 await assertFails(getDoc(doc(db('bob'),'findingStates',f.id)));
 await assertFails(getDoc(doc(db('bob'),'findingVersions',f.versionId)));
 await assertFails(deleteDoc(doc(database,'findingVersions',f.versionId)));
 await assertFails(writeFinding(database,{...finding(3),reason:''}));
 await assertSucceeds(updateDoc(doc(database,'projects/p1'),{deleting:true}));
 await assertSucceeds(deleteDoc(doc(database,'findingVersions',f.versionId)));
});

test('commitment updates pair versions, migrate legacy records and reject skipped revisions',async()=>{
 const database=db();const r={ownerId:'alice',projectId:'p1',kind:'action',title:'Validate checklist',status:'open',dueDate:'2026-10-02',severity:'unspecified',evidence:'Minutes',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'};
 await assertSucceeds(setDoc(doc(database,'records/r1'),r));
 const write=(revision,changes={})=>{const value={...r,revision,versionId:`rv${revision}`,ownerRole:'PM',closureCriteria:'Signed checklist',completionEvidence:'',...changes};const b=writeBatch(database);b.set(doc(database,'records/r1'),value);b.set(doc(database,'recordVersions',value.versionId),{...value,id:'r1'});return b.commit();};
 await assertSucceeds(write(1,{status:'closed'}));
 await assertFails(write(3));
 await assertSucceeds(write(2));
 await assertFails(updateDoc(doc(database,'records/r1'),{title:'Unversioned edit'}));
 await assertFails(updateDoc(doc(database,'recordVersions/rv1'),{status:'open'}));
 await assertFails(getDoc(doc(db('bob'),'recordVersions/rv1')));
 await assertFails(deleteDoc(doc(database,'recordVersions/rv1')));
 await assertSucceeds(updateDoc(doc(database,'projects/p1'),{deleting:true}));
 await assertSucceeds(deleteDoc(doc(database,'recordVersions/rv1')));
});

test('confirmed delivery links cannot point to another project, owner or non-milestone',async()=>{
 const database=db();await assertSucceeds(setDoc(doc(database,'projects/p2'),project()));
 const m={...control(),id:'m1',versionId:'mv1',kind:'milestone',data:{baselineDate:'2026-10-10',forecastDate:'2026-10-12',actualDate:'',dependency:''}};
 await assertSucceeds(writeControl(database,m));
 const d={...control(),id:'d1',versionId:'dv1',kind:'decision',data:{status:'proposed',reason:'Authorise delivery',alternatives:'',scopeImpact:'',timeImpact:'',costImpact:'',baseline:'',resolution:'',decidedOn:'',decisionRole:'',requiredRole:'Sponsor',dueDate:'2026-10-09',deliveryId:'m1'}};
 await assertFails(writeControl(database,{...d,projectId:'p2'}));
 await assertFails(writeControl(db('bob'),{...d,ownerId:'bob'}));
 await assertSucceeds(writeControl(database,d));
 await assertFails(writeControl(database,{...d,id:'d2',versionId:'dv2',data:{...d.data,deliveryId:'d1'}}));
});
