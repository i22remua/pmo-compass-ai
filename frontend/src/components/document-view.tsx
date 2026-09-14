'use client';
import { Copy, Download, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GeneratedDocument } from '@/types';
import { copyContent, exportMarkdown } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useLocale, useToast } from './providers';

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          img: () => null,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="markdown-table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
export function DocumentWarnings({
  document,
}: {
  document: Pick<GeneratedDocument, 'generatedContent' | 'warnings'>;
}) {
  const warnings = document.warnings.filter(
    (warning) => !document.generatedContent.includes(warning),
  );
  return warnings.length ? (
    <div className="output-warnings">
      {warnings.map((warning, index) => (
        <p key={index}>
          <Info size={15} />
          {warning}
        </p>
      ))}
    </div>
  ) : null;
}
export function DocumentActions({
  document,
  projectName,
  children,
}: {
  document: Pick<GeneratedDocument, 'generatedContent' | 'type' | 'language'>;
  projectName: string;
  children?: React.ReactNode;
}) {
  const { t } = useLocale();
  const { notify } = useToast();
  const copy = async () => {
    try {
      await copyContent(document.generatedContent);
      notify(t.copied);
    } catch (error) {
      notify(errorMessage(error, t), 'error');
    }
  };
  return (
    <div className="document-actions">
      <button className="button button-secondary button-small" onClick={copy}>
        <Copy size={15} />
        {t.copy}
      </button>
      <button
        className="button button-secondary button-small"
        onClick={() => exportMarkdown(document, projectName)}
      >
        <Download size={15} />
        {t.export}
      </button>
      {children}
    </div>
  );
}
