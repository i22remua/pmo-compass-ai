'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth, useLocale, useToast } from '@/components/providers';
import { useWorkspace } from '@/components/workspace-provider';
import { ConfirmDialog, EmptyState, PageHeading } from '@/components/ui';
import { SavedDocumentView } from '@/components/document-comparison';
import { formatDate } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { removeDocument } from '@/lib/repository';

export default function DocumentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLocale();
  const { notify } = useToast();
  const { projects, documents, refresh } = useWorkspace();
  const document = documents.find((d) => d.id === id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!document)
    return (
      <div className="page-content">
        <EmptyState title={t.noMatches} text={t.noMatchesText}>
          <Link className="button button-primary" href="/documents">
            {t.documents}
          </Link>
        </EmptyState>
      </div>
    );
  const project = projects.find((p) => p.id === document.projectId);
  const remove = async () => {
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      await removeDocument(user, id);
      await refresh();
      notify(t.docDeleted);
      router.push('/documents');
    } catch (error) {
      setError(errorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-content document-detail-page">
      <Link className="back-link" href="/documents">
        <ArrowLeft size={15} />
        {t.documents}
      </Link>
      <PageHeading
        title={t.documentTypes[document.type]}
        subtitle={`${project?.name || t.projectNotFound} · ${formatDate(document.createdAt, language)} · ${document.language.toUpperCase()}`}
      >
        <button
          className="icon-button danger-text"
          aria-label={t.deleteDocument}
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={19} />
        </button>
      </PageHeading>
      <SavedDocumentView
        key={document.id}
        document={document}
        documents={project && !project.deleting ? documents : []}
        projectName={project?.name || 'project'}
      />
      {confirm && (
        <ConfirmDialog
          title={t.deleteDocument}
          text={t.deleteDocText}
          onClose={() => setConfirm(false)}
          onConfirm={remove}
          busy={busy}
          error={error}
        />
      )}
    </div>
  );
}
