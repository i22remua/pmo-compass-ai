import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { GeneratedDocument, Language, Project, ProjectInput, User } from '@/types';
import examples from './demo-projects.json';
import exampleDocuments from './demo-documents.json';
import { AppError, readStorage, writeStorage } from './errors';
import { getFirebase } from './firebase';

export interface WorkspaceData {
  projects: Project[];
  documents: GeneratedDocument[];
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
  return { projects, documents };
}

function readDemo(user: User): WorkspaceData {
  const raw = readStorage(storageKey(user.uid));
  if (!raw) {
    const data: WorkspaceData = { projects: [], documents: [] };
    writeDemo(user, data);
    return data;
  }
  try {
    const data = JSON.parse(raw) as WorkspaceData;
    if (!Array.isArray(data.projects) || !Array.isArray(data.documents)) throw new Error();
    return {
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
  const [projects, documents] = await Promise.all([
    getDocs(query(collection(db, 'projects'), where('ownerId', '==', user.uid))),
    getDocs(query(collection(db, 'documents'), where('ownerId', '==', user.uid))),
  ]);
  return {
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
    data.projects = existing
      ? data.projects.map((p) => (p.id === existing.id ? project : p))
      : [project, ...data.projects];
    writeDemo(user, data);
  } else {
    const { id, ...fields } = project;
    if (existing) await updateDoc(doc(getFirebase().db, 'projects', id), fields);
    else await setDoc(doc(getFirebase().db, 'projects', id), fields);
  }
  return project;
}

export async function removeProject(user: User, project: Project) {
  if (project.ownerId !== user.uid) throw new AppError('permission-denied');
  if (user.mode === 'demo') {
    const data = readDemo(user);
    writeDemo(user, {
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
  const children = await getDocs(
    query(
      collection(db, 'documents'),
      where('ownerId', '==', user.uid),
      where('projectId', '==', project.id),
    ),
  );
  for (let offset = 0; offset < children.docs.length; offset += 400) {
    const batch = writeBatch(db);
    children.docs.slice(offset, offset + 400).forEach((child) => batch.delete(child.ref));
    await batch.commit();
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
