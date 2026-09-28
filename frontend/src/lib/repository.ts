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
} from 'firebase/firestore';
import type {
  GeneratedDocument,
  Language,
  Project,
  ProjectInput,
  ProjectSource,
  ProjectRecord,
  SourceExcerpt,
  User,
} from '@/types';
import examples from './demo-projects.json';
import exampleDocuments from './demo-documents.json';
import { AppError, readStorage, writeStorage } from './errors';
import { getFirebase } from './firebase';

export interface WorkspaceData {
  projects: Project[];
  documents: GeneratedDocument[];
  sources: ProjectSource[];
  records: ProjectRecord[];
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
  return { projects, documents, sources: [], records: [] };
}

function readDemo(user: User): WorkspaceData {
  const raw = readStorage(storageKey(user.uid));
  if (!raw) {
    const data: WorkspaceData = { projects: [], documents: [], sources: [], records: [] };
    writeDemo(user, data);
    return data;
  }
  try {
    const data = JSON.parse(raw) as WorkspaceData;
    if (!Array.isArray(data.projects) || !Array.isArray(data.documents)) throw new Error();
    return {
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
  const [projects, documents, sources, records] = await Promise.all([
    getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid))),
    getDocs(query(collection(db, 'documents'), where('ownerId', '==', user.uid))),
    getDocs(query(collection(db, 'sources'), where('ownerId', '==', user.uid))),
    getDocs(query(collection(db, 'records'), where('ownerId', '==', user.uid))),
  ]);
  return {
    sources: sources.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectSource),
    records: records.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectRecord),
    projects: projects.docs.map((d) => ({ ...d.data(), id: d.id }) as Project),
    documents: documents.docs.map((d) => ({ ...d.data(), id: d.id }) as GeneratedDocument),
  };
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
  for (const name of ['documents', 'sources', 'records']) {
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
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, {
      ...data,
      records: [record, ...data.records.filter((r) => r.id !== record.id)],
    });
  } else {
    const { id, ...fields } = record;
    await setDoc(doc(getFirebase().db, 'records', id), fields);
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
