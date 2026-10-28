import {
  doc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  query,
  where,
} from 'firebase/firestore';
import type { ProjectInput, ProjectSource, SourceExcerpt, User } from '@/types';
import { getFirebase } from './firebase';
import { loadProjectHistory } from './repository';
import { buildAnalysisSnapshot } from './review-context';
import type { Project, ProjectRecord, ProjectReview } from '@/types';
import type { ProjectControl } from './project-controls';
import { AppError, readStorage } from './errors';

// Re-read consent immediately before transmission; a stale generator must not use revoked consent.
export async function projectContext(
  user: User | null,
  input: ProjectInput,
  cutoff = new Date().toISOString().slice(0, 10),
) {
  if (!user || !('id' in input) || typeof input.id !== 'string')
    return { access: input.aiAccess || 'external', sources: [] as SourceExcerpt[] };
  let access = input.aiAccess || 'external';
  let currentProject = input as Project;
  let sources: ProjectSource[];
  let records: ProjectRecord[] = [],
    controls: ProjectControl[] = [];
  if (user.mode === 'demo') {
    const data = JSON.parse(readStorage(`pmo.workspace.v1.${user.uid}`) || '{}');
    const parent = data.projects?.find(
      (p: { id: string; ownerId: string }) => p.id === input.id && p.ownerId === user.uid,
    );
    if (!parent || parent.deleting) throw new AppError('permission-denied');
    access = parent.aiAccess || 'external';
    currentProject = parent;
    records = (data.records || []).filter(
      (x: ProjectRecord) => x.projectId === input.id && x.ownerId === user.uid,
    );
    controls = (data.controls || []).filter(
      (x: ProjectControl) => x.projectId === input.id && x.ownerId === user.uid,
    );
    sources = (data.sources || []).filter(
      (s: ProjectSource) => s.projectId === input.id && s.ownerId === user.uid,
    );
  } else {
    const db = getFirebase().db;
    const snapshots = await getDocsFromServer(
      query(
        collection(db, 'sources'),
        where('ownerId', '==', user.uid),
        where('projectId', '==', input.id),
      ),
    );
    const parent = await getDocFromServer(doc(db, 'projects', input.id));
    if (!parent.exists() || parent.data().ownerId !== user.uid || parent.data().deleting)
      throw new AppError('permission-denied');
    access = parent.data().aiAccess || 'external';
    currentProject = { ...parent.data(), id: parent.id } as Project;
    const children = await Promise.all(
      ['records', 'controls'].map((name) =>
        getDocsFromServer(
          query(
            collection(db, name),
            where('ownerId', '==', user.uid),
            where('projectId', '==', input.id),
          ),
        ),
      ),
    );
    records = children[0].docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectRecord);
    controls = children[1].docs.map(
      (d) =>
        ({
          ...d.data(),
          id: d.id,
          createdAt: d.data().createdAt.toDate().toISOString(),
          updatedAt: d.data().updatedAt.toDate().toISOString(),
        }) as ProjectControl,
    );
    sources = snapshots.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectSource);
  }
  if (sources.length > 20 || sources.reduce((n, s) => n + s.text.length, 0) > 20000)
    throw new AppError('context_limit');
  const history = (await loadProjectHistory(
    user,
    input as Project,
    'reviewHistory',
  )) as ProjectReview[];
  const snapshot = await buildAnalysisSnapshot(
    currentProject,
    sources,
    records,
    controls,
    history,
    cutoff,
    history.length === 100,
  );
  return {
    snapshot,
    access,
    sources: snapshot.sources.map(({ id, label, locator, text, reviewed }) => ({
      id,
      label,
      locator,
      text,
      reviewed,
    })),
  };
}
