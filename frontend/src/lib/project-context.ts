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
import { AppError, readStorage } from './errors';

// Re-read consent immediately before transmission; a stale generator must not use revoked consent.
export async function projectContext(user: User | null, input: ProjectInput) {
  if (!user || !('id' in input) || typeof input.id !== 'string')
    return { access: input.aiAccess || 'external', sources: [] as SourceExcerpt[] };
  let access = input.aiAccess || 'external';
  let sources: ProjectSource[];
  if (user.mode === 'demo') {
    const data = JSON.parse(readStorage(`pmo.workspace.v1.${user.uid}`) || '{}');
    const parent = data.projects?.find(
      (p: { id: string; ownerId: string }) => p.id === input.id && p.ownerId === user.uid,
    );
    if (!parent || parent.deleting) throw new AppError('permission-denied');
    access = parent.aiAccess || 'external';
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
    sources = snapshots.docs.map((d) => ({ ...d.data(), id: d.id }) as ProjectSource);
  }
  if (sources.length > 20 || sources.reduce((n, s) => n + s.text.length, 0) > 20000)
    throw new AppError('context_limit');
  return {
    access,
    sources: sources
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(({ id, label, locator, text, reviewed }) => ({ id, label, locator, text, reviewed })),
  };
}
