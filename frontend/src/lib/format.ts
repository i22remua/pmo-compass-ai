import type { GeneratedDocument, Language, ProjectInput } from '@/types';
import { AppError } from './errors';

export const emptyProject: ProjectInput = {
  aiAccess: 'offline',
  name: '',
  sector: '',
  description: '',
  objectives: '',
  startDate: '',
  endDate: '',
  status: 'planning',
  budget: null,
  stakeholders: '',
  notes: '',
};
export function projectTitle(description: string) {
  const text = description.trim().replace(/\s+/g, ' ');
  const clause =
    text
      .split(/[,;.!?]|\s+(?:y|and)\s+/i)
      .find((part) => part.trim().length >= 2)
      ?.trim() || text;
  if (clause.length <= 80) return clause;
  const short = clause.slice(0, 77);
  const boundary = short.lastIndexOf(' ');
  return `${boundary > 0 ? short.slice(0, boundary) : short}…`;
}

export function formatDate(value: string, language: Language) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
}
export function formatMoney(value: number | null, language: Language) {
  return value === null
    ? '—'
    : new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-GB', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
}
export function initials(name: string) {
  return name
    .split(/[\s·]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}
export async function copyContent(content: string) {
  try {
    await navigator.clipboard.writeText(content);
  } catch {
    throw new AppError('clipboard');
  }
}
export function exportMarkdown(
  document: Pick<GeneratedDocument, 'generatedContent' | 'type' | 'language'>,
  projectName: string,
) {
  const filename = `${projectName}-${document.type}-${document.language}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .slice(0, 160);
  const url = URL.createObjectURL(
    new Blob([document.generatedContent], { type: 'text/markdown;charset=utf-8' }),
  );
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.md`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
