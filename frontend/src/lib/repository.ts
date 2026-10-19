import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type {
  GeneratedDocument,
  Language,
  Project,
  ProjectInput,
  ProjectSource,
  ProjectRecord,
  ProjectReview,
  SourceExcerpt,
  User,
} from '@/types';
import examples from './demo-projects.json';
import exampleDocuments from './demo-documents.json';
import { AppError, readStorage, writeStorage } from './errors';
import { getFirebase } from './firebase';
import { validateControl, type ControlInput, type ProjectControl } from './project-controls';
import { parseReview } from './project-review';

export interface WorkspaceData {
  projects: Project[];
  documents: GeneratedDocument[];
  sources: ProjectSource[];
  records: ProjectRecord[];
  reviews: ProjectReview[];
  controls: ProjectControl[];
  controlVersions: ProjectControl[];
}
const storageKey = (uid: string) => `pmo.workspace.v1.${uid}`;

function seed(uid: string, language: Language): WorkspaceData {
  const createdAt = new Date().toISOString();
  const projects = examples[language].map((p, i) => ({
    ...p,
    id: `demo-project-${i + 1}`,
    ownerId: uid,
    createdAt,
    updatedAt: createdAt,
  })) as Project[];
  const documents = exampleDocuments[language].map((d, i) => ({
    id: `demo-document-${i + 1}`,
    ownerId: uid,
    projectId: projects[d.projectIndex].id,
    type: d.type,
    language,
    inputContext: '',
    generatedContent: d.content,
    risks: d.risks,
    warnings: d.warnings,
    provider: 'offline',
    createdAt: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
  })) as GeneratedDocument[];
  return {
    projects,
    documents,
    sources: [],
    records: [],
    reviews: [],
    controls: [],
    controlVersions: [],
  };
}

function readDemo(user: User): WorkspaceData {
  const raw = readStorage(storageKey(user.uid));
  if (!raw) {
    const data: WorkspaceData = {
      projects: [],
      documents: [],
      sources: [],
      records: [],
      reviews: [],
      controls: [],
      controlVersions: [],
    };
    writeDemo(user, data);
    return data;
  }
  try {
    const data = JSON.parse(raw) as WorkspaceData;
    if (!Array.isArray(data.projects) || !Array.isArray(data.documents)) throw new Error();
    return {
      controls: (data.controls || []).filter((s) => s.ownerId === user.uid),
      controlVersions: (data.controlVersions || []).filter((s) => s.ownerId === user.uid),
      reviews: (data.reviews || []).filter((s) => s.ownerId === user.uid),
      sources: (data.sources || []).filter((s) => s.ownerId === user.uid),
      records: (data.records || []).filter((s) => s.ownerId === user.uid),
      projects: data.projects.filter((p) => p.ownerId === user.uid),
      documents: data.documents.filter((d) => d.ownerId === user.uid),
    };
  } catch {
    throw new AppError('storage');
  }
}
function writeDemo(user: User, data: WorkspaceData) {
  writeStorage(storageKey(user.uid), JSON.stringify(data));
}

export async function loadWorkspace(user: User): Promise<WorkspaceData> {
  if (user.mode === 'demo') return readDemo(user);
  const { db } = getFirebase();
  const [projects, documents, sources, records, reviews, controls, controlVersions] =
    await Promise.all([
      getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'documents'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'sources'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'records'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'reviews'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'controls'), where('ownerId', '==', user.uid))),
      getDocs(query(collection(db, 'controlVersions'), where('ownerId', '==', user.uid))),
    ]);
  return {
    controls: controls.docs.map((d) => decodeControl(d.data())),
    controlVersions: controlVersions.docs.map((d) => decodeControl(d.data())),
    reviews: reviews.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectReview),
    sources: sources.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectSource),
    records: records.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectRecord),
    projects: projects.docs.map((d) => ({ ...d.data(), id: d.id }) as Project),
    documents: documents.docs.map((d) => ({ ...d.data(), id: d.id }) as GeneratedDocument),
  };
}

export async function deleteAllUserData(user: User) {
  if (user.mode !== 'firebase') {
    writeStorage(storageKey(user.uid), null);
    return;
  }
  const workspace = await loadWorkspace(user);
  for (const project of workspace.projects) await removeProject(user, project);
  const db = getFirebase().db;
  // Delete owner-scoped orphans left by an interrupted earlier project deletion.
  for (const name of [
    'documents',
    'sources',
    'records',
    'reviews',
    'controlVersions',
    'controls',
  ]) {
    const owned = await getDocs(query(collection(db, name), where('ownerId', '==', user.uid)));
    for (let offset = 0; offset < owned.docs.length; offset += 400) {
      const batch = writeBatch(db);
      owned.docs.slice(offset, offset + 400).forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, 'users', user.uid));
}

export function validateProject(input: ProjectInput) {
  if (
    input.name.trim().length < 2 ||
    input.name.length > 120 ||
    input.sector.trim().length < 2 ||
    input.sector.length > 80 ||
    input.notes.length > 20000 ||
    input.description.length > 5000 ||
    input.objectives.length > 5000 ||
    input.stakeholders.length > 4000 ||
    (input.budget !== null &&
      (!Number.isFinite(input.budget) || input.budget < 0 || input.budget > 1e12))
  )
    throw new AppError('validation_error');
  if (input.startDate && input.endDate && input.endDate < input.startDate)
    throw new AppError('dates');
}

export async function saveProject(
  user: User,
  input: ProjectInput,
  language: Language,
  existing?: Project,
): Promise<Project> {
  validateProject(input);
  if (existing && (existing.ownerId !== user.uid || existing.deleting))
    throw new AppError('permission-denied');
  const now = new Date().toISOString();
  const project: Project = {
    ...input,
    name: input.name.trim(),
    sector: input.sector.trim(),
    id: existing?.id ?? crypto.randomUUID(),
    ownerId: user.uid,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (user.mode === 'demo') {
    const data = readDemo(user);
    if (existing && !data.projects.some((p) => p.id === existing.id))
      throw new AppError('not-found');
    if (existing)
      project.aiAccess = data.projects.find((p) => p.id === existing.id)?.aiAccess || 'external';
    data.projects = existing
      ? data.projects.map((p) => (p.id === existing.id ? project : p))
      : [project, ...data.projects];
    writeDemo(user, data);
  } else {
    const { id, ...fields } = project;
    if (existing) {
      // Editing project details cannot overwrite a newer privacy choice in another tab.
      delete fields.aiAccess;
      await updateDoc(doc(getFirebase().db, 'projects', id), fields);
    } else await setDoc(doc(getFirebase().db, 'projects', id), fields);
  }
  return project;
}

export async function removeProject(user: User, project: Project) {
  if (project.ownerId !== user.uid) throw new AppError('permission-denied');
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, {
      controls: data.controls.filter((s) => s.projectId !== project.id),
      controlVersions: data.controlVersions.filter((s) => s.projectId !== project.id),
      reviews: data.reviews.filter((s) => s.projectId !== project.id),
      sources: data.sources.filter((s) => s.projectId !== project.id),
      records: data.records.filter((s) => s.projectId !== project.id),
      projects: data.projects.filter((p) => p.id !== project.id),
      documents: data.documents.filter((d) => d.projectId !== project.id),
    });
    return;
  }
  const { db } = getFirebase();
  const ref = doc(db, 'projects', project.id);
  // A tombstone prevents concurrent document creation while paged deletion runs.
  // On failure the project remains visible; repeating delete finishes safely.
  await updateDoc(ref, { deleting: true });
  for (const name of [
    'documents',
    'sources',
    'records',
    'reviews',
    'controlVersions',
    'controls',
  ]) {
    const children = await getDocs(
      query(
        collection(db, name),
        where('ownerId', '==', user.uid),
        where('projectId', '==', project.id),
      ),
    );
    for (let offset = 0; offset < children.docs.length; offset += 400) {
      const batch = writeBatch(db);
      children.docs.slice(offset, offset + 400).forEach((child) => batch.delete(child.ref));
      await batch.commit();
    }
  }
  await deleteDoc(ref);
}

export async function saveDocument(user: User, document: GeneratedDocument) {
  if (document.ownerId !== user.uid) throw new AppError('permission-denied');
  if (user.mode === 'demo') {
    const data = readDemo(user);
    if (!data.projects.some((p) => p.id === document.projectId && !p.deleting))
      throw new AppError('not-found');
    data.documents = [document, ...data.documents.filter((d) => d.id !== document.id)];
    writeDemo(user, data);
  } else {
    const { id, ...fields } = document;
    const ref = doc(getFirebase().db, 'documents', id);
    await setDoc(ref, fields);
  }
}

export async function removeDocument(user: User, id: string) {
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, { ...data, documents: data.documents.filter((d) => d.id !== id) });
  } else await deleteDoc(doc(getFirebase().db, 'documents', id));
}

export async function resetDemo(user: User, language: Language) {
  if (user.mode !== 'demo') throw new AppError('permission-denied');
  writeDemo(user, seed(user.uid, language));
}

/** Add missing examples only. Existing projects and documents are never replaced. */
export async function loadDemoExamples(user: User, language: Language) {
  if (user.mode !== 'demo') throw new AppError('permission-denied');
  const current = readDemo(user);
  const examples = seed(user.uid, language);
  const missing = examples.projects.filter(
    (example) => !current.projects.some((project) => project.id === example.id),
  );
  if (!missing.length) return;
  const missingIds = new Set(missing.map((project) => project.id));
  writeDemo(user, {
    ...current,
    projects: [...current.projects, ...missing],
    documents: [
      ...current.documents,
      ...examples.documents.filter(
        (example) =>
          missingIds.has(example.projectId) &&
          !current.documents.some((document) => document.id === example.id),
      ),
    ],
  });
}

async function ownedParent(user: User, projectId: string) {
  if (user.mode === 'demo') {
    const project = readDemo(user).projects.find((p) => p.id === projectId);
    if (!project || project.deleting) throw new AppError('permission-denied');
    return;
  }
  const snapshot = await getDoc(doc(getFirebase().db, 'projects', projectId));
  if (!snapshot.exists() || snapshot.data().ownerId !== user.uid || snapshot.data().deleting)
    throw new AppError('permission-denied');
}

export async function addSources(user: User, project: Project, excerpts: SourceExcerpt[]) {
  if (project.ownerId !== user.uid || project.deleting) throw new AppError('permission-denied');
  await ownedParent(user, project.id);
  if (
    !excerpts.length ||
    excerpts.length > 20 ||
    excerpts.some(
      (s) =>
        !s.text.trim() ||
        s.text.length > 2000 ||
        !s.label.trim() ||
        s.label.length > 120 ||
        !s.locator ||
        s.locator.length > 80,
    )
  )
    throw new AppError('validation_error');
  const createdAt = new Date().toISOString();
  // New context always revokes previous external-AI consent. Original files are never stored.
  const sources = excerpts.map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    ownerId: user.uid,
    projectId: project.id,
    createdAt,
  }));
  if (user.mode === 'demo') {
    const data = readDemo(user);
    data.sources.push(...sources);
    data.projects = data.projects.map((p) =>
      p.id === project.id ? { ...p, aiAccess: 'offline', updatedAt: createdAt } : p,
    );
    writeDemo(user, data);
  } else {
    const batch = writeBatch(getFirebase().db);
    for (const { id, ...fields } of sources)
      batch.set(doc(getFirebase().db, 'sources', id), fields);
    batch.update(doc(getFirebase().db, 'projects', project.id), {
      aiAccess: 'offline',
      updatedAt: createdAt,
    });
    await batch.commit();
  }
}

export async function removeSource(user: User, source: ProjectSource) {
  if (source.ownerId !== user.uid) throw new AppError('permission-denied');
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, { ...data, sources: data.sources.filter((s) => s.id !== source.id) });
  } else await deleteDoc(doc(getFirebase().db, 'sources', source.id));
}

export async function setProjectAIAccess(
  user: User,
  project: Project,
  access: 'offline' | 'external',
) {
  if (project.ownerId !== user.uid) throw new AppError('permission-denied');
  await ownedParent(user, project.id);
  const fields = { aiAccess: access, updatedAt: new Date().toISOString() };
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, {
      ...data,
      projects: data.projects.map((p) => (p.id === project.id ? { ...p, ...fields } : p)),
    });
  } else await updateDoc(doc(getFirebase().db, 'projects', project.id), fields);
}

export function validRecord(
  record: Pick<ProjectRecord, 'title' | 'kind' | 'status' | 'dueDate' | 'severity' | 'evidence'>,
) {
  const date = record.dueDate;
  return (
    record.title.trim().length >= 2 &&
    record.title.length <= 300 &&
    record.evidence.length <= 2000 &&
    ['action', 'decision', 'risk'].includes(record.kind) &&
    ['open', 'closed'].includes(record.status) &&
    ['unspecified', 'low', 'medium', 'high'].includes(record.severity) &&
    (!date ||
      (/^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) &&
        new Date(date).toISOString().slice(0, 10) === date)) &&
    (record.kind === 'action' || !date) &&
    (record.kind === 'risk' || record.severity === 'unspecified')
  );
}
export async function saveRecord(
  user: User,
  project: Project,
  input: Pick<ProjectRecord, 'title' | 'kind' | 'status' | 'dueDate' | 'severity' | 'evidence'>,
  existing?: ProjectRecord,
) {
  if (
    project.ownerId !== user.uid ||
    (existing && (existing.ownerId !== user.uid || existing.projectId !== project.id))
  )
    throw new AppError('permission-denied');
  await ownedParent(user, project.id);
  if (!validRecord(input)) throw new AppError('validation_error');
  const now = new Date().toISOString();
  const record: ProjectRecord = {
    ...input,
    title: input.title.trim(),
    id: existing?.id || crypto.randomUUID(),
    ownerId: user.uid,
    projectId: project.id,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const checkPrevious = (previous?: ProjectRecord) => {
    if (
      existing &&
      (!previous ||
        previous.ownerId !== user.uid ||
        previous.projectId !== project.id ||
        (['title', 'kind', 'status', 'dueDate', 'severity', 'evidence', 'updatedAt'] as const).some(
          (key) => previous[key] !== existing[key],
        ))
    )
      throw new AppError('control_conflict');
  };
  if (user.mode === 'demo') {
    const save = () => {
      const data = readDemo(user);
      checkPrevious(data.records.find((item) => item.id === record.id));
      if (!data.projects.some((parent) => parent.id === project.id && !parent.deleting))
        throw new AppError('permission-denied');
      writeDemo(user, {
        ...data,
        records: [record, ...data.records.filter((r) => r.id !== record.id)],
      });
    };
    if (typeof navigator !== 'undefined' && navigator.locks)
      await navigator.locks.request(`pmo-records-${user.uid}`, save);
    else save();
  } else {
    const { id, ...fields } = record;
    const db = getFirebase().db,
      ref = doc(db, 'records', id);
    if (existing)
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        checkPrevious(
          snapshot.exists() ? ({ ...snapshot.data(), id } as ProjectRecord) : undefined,
        );
        transaction.set(ref, fields);
      });
    else await setDoc(ref, fields);
  }
  return record;
}
export async function removeRecord(user: User, record: ProjectRecord) {
  if (record.ownerId !== user.uid) throw new AppError('permission-denied');
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, { ...data, records: data.records.filter((r) => r.id !== record.id) });
  } else await deleteDoc(doc(getFirebase().db, 'records', record.id));
}

export async function saveProjectReview(
  user: User,
  project: Project,
  input: Pick<ProjectReview, 'language' | 'contextKey' | 'payload'>,
  expectedUpdatedAt?: string,
) {
  if (project.ownerId !== user.uid || project.deleting) throw new AppError('permission-denied');
  if (
    !['es', 'en'].includes(input.language) ||
    !/^[a-f0-9]{64}$/.test(input.contextKey) ||
    !parseReview(input.payload)
  )
    throw new AppError('validation_error');
  const build = (previous?: ProjectReview): ProjectReview => {
    if (previous?.updatedAt !== expectedUpdatedAt) throw new AppError('review_conflict');
    const now = new Date().toISOString();
    return {
      ...input,
      id: project.id,
      projectId: project.id,
      ownerId: user.uid,
      engine: 'offline',
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
  };
  if (user.mode === 'demo') {
    await ownedParent(user, project.id);
    const data = readDemo(user);
    const result = build(data.reviews.find((review) => review.projectId === project.id));
    writeDemo(user, {
      ...data,
      reviews: [result, ...data.reviews.filter((review) => review.projectId !== project.id)],
    });
    return result;
  }
  const db = getFirebase().db;
  return runTransaction(db, async (transaction) => {
    const parent = await transaction.get(doc(db, 'projects', project.id));
    if (!parent.exists() || parent.data().ownerId !== user.uid || parent.data().deleting)
      throw new AppError('permission-denied');
    const ref = doc(db, 'reviews', project.id);
    const stored = await transaction.get(ref);
    const result = build(
      stored.exists() ? ({ ...stored.data(), id: stored.id } as ProjectReview) : undefined,
    );
    const { id, ...fields } = result;
    transaction.set(doc(db, 'reviews', id), fields);
    return result;
  });
}

function decodeControl(data: Record<string, unknown>): ProjectControl {
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
  } as ProjectControl;
}

/** Immutable snapshots paired atomically with an optimistic-concurrency head. */
export async function saveControl(
  user: User,
  project: Project,
  input: ControlInput,
  existing?: ProjectControl,
  creationId?: string,
): Promise<void> {
  if (
    project.ownerId !== user.uid ||
    project.deleting ||
    (existing && (existing.ownerId !== user.uid || existing.projectId !== project.id))
  )
    throw new AppError('permission-denied');
  validateControl(input, existing);
  if (creationId && (existing || !/^cost-[a-f0-9]{64}$/.test(creationId)))
    throw new AppError('validation_error');
  const id = existing?.id || creationId || crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const build = (previous?: ProjectControl): ProjectControl => {
    if (previous?.revision !== existing?.revision) throw new AppError('control_conflict');
    validateControl(input, previous);
    const now = new Date().toISOString();
    return {
      kind: input.kind,
      data: input.data,
      title: input.title.trim(),
      evidence: input.evidence.trim(),
      recordId: input.recordId,
      archived: input.archived,
      id,
      ownerId: user.uid,
      projectId: project.id,
      revision: (previous?.revision || 0) + 1,
      versionId,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    } as ProjectControl;
  };
  if (user.mode === 'demo') {
    // The lock coordinates participating tabs; storage failure never switches to cloud.
    const save = () => {
      const workspace = readDemo(user);
      const parent = workspace.projects.find((p) => p.id === project.id);
      if (!parent || parent.deleting) throw new AppError('permission-denied');
      if (
        input.recordId &&
        !workspace.records.some((r) => r.id === input.recordId && r.projectId === project.id)
      )
        throw new AppError('permission-denied');
      const value = build(workspace.controls.find((c) => c.id === id));
      writeDemo(user, {
        ...workspace,
        controls: [value, ...workspace.controls.filter((c) => c.id !== id)],
        controlVersions: [...workspace.controlVersions, value],
      });
    };
    if (typeof navigator !== 'undefined' && navigator.locks)
      await navigator.locks.request(`pmo-controls-${user.uid}`, save);
    else save();
    return;
  }
  const db = getFirebase().db;
  await runTransaction(db, async (transaction) => {
    const parent = await transaction.get(doc(db, 'projects', project.id));
    if (!parent.exists() || parent.data().ownerId !== user.uid || parent.data().deleting)
      throw new AppError('permission-denied');
    const ref = doc(db, 'controls', id);
    // A new random ID has no owner-scoped document to read yet. Rules require
    // revision 1 on create and reject an accidental overwrite independently.
    const previous = existing ? await transaction.get(ref) : undefined;
    if (input.recordId) {
      const linked = await transaction.get(doc(db, 'records', input.recordId));
      if (
        !linked.exists() ||
        linked.data().ownerId !== user.uid ||
        linked.data().projectId !== project.id
      )
        throw new AppError('permission-denied');
    }
    const value = build(previous?.exists() ? decodeControl(previous.data()) : undefined);
    const fields = {
      ...value,
      createdAt: previous?.exists() ? previous.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    transaction.set(ref, fields);
    transaction.set(doc(db, 'controlVersions', versionId), fields);
  });
}
