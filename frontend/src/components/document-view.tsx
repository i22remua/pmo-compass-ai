'use client';
import { Copy, Download, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { GeneratedDocument } from '@/types';
import { copyContent, exportMarkdown } from '@/lib/format';
import { errorMessage } from '@/lib/errors';
import { useLocale, useToast } from './providers';

export function safeMarkdownUrl(url: string) {
  if (url.startsWith('#')) return url;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol) ? url : '';
  } catch {
    return '';
  }
}

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content" tabIndex={0}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeMarkdownUrl}
        components={{
          img: () => null,
          h3: ({ children, node }) => {
            const first = node?.children[0];
            const source = first?.type === 'text' ? /^\[S(\d+)\]/.exec(first.value) : null;
            return <h3 id={source ? `context-source-${source[1]}` : undefined}>{children}</h3>;
          },
          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith('#') ? undefined : '_blank'}
              rel="noopener noreferrer"
            >
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
