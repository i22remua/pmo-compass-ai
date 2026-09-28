import type { SourceExcerpt } from '@/types';
import { AppError } from './errors';

const MAX_TEXT = 120000;
export interface ExtractedExcerpt extends SourceExcerpt {
  relevant: boolean;
}
const relevant =
  /riesgo|risk|retras|delay|decision|decisi[oó]n|pendiente|pending|alcance|scope|action|acci[oó]n|debe|must|fecha|deadline|budget|presupuesto|acord|agreed|aprob|approv|objetiv|objectiv/i;
export function excerptsFromText(text: string, label: string, location = '¶'): ExtractedExcerpt[] {
  if (text.length > MAX_TEXT) throw new AppError('context_limit');
  if (/\u0000/.test(text)) throw new AppError('context_file');
  const paragraphs = text
    .split(/\n\s*\n|\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const result: ExtractedExcerpt[] = [];
  paragraphs.forEach((paragraph, index) => {
    // Keep boundaries explicit; long paragraphs retain their paragraph/fragment locator.
    for (let start = 0; start < paragraph.length; start += 1800) {
      const value = paragraph.slice(start, start + 1800);
      result.push({
        id: crypto.randomUUID(),
        label: label.slice(0, 120),
        locator: `${location} ${index + 1}${paragraph.length > 1800 ? ` / ${Math.floor(start / 1800) + 1}` : ''}`,
        text: value,
        reviewed: false,
        relevant: relevant.test(value),
      });
    }
  });
  if (!result.length) throw new AppError('context_empty');
  if (result.length > 500) throw new AppError('context_limit');
  return result;
}

function docxXML(data: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/docx.worker.ts', import.meta.url));
    const finish = (error?: boolean, value?: string) => {
      clearTimeout(timer);
      worker.terminate();
      if (error || !value) reject(new AppError('context_file'));
      else resolve(value);
    };
    const timer = setTimeout(() => finish(true), 15000);
    worker.onmessage = (event) => finish(!!event.data.error, event.data.xml);
    worker.onerror = () => finish(true);
    worker.postMessage(data, [data]);
  });
}

export async function extractFile(file: File): Promise<ExtractedExcerpt[]> {
  if (!file.size || file.size > 5_000_000) throw new AppError('context_limit');
  const extension = file.name.split('.').pop()?.toLowerCase();
  const data = await file.arrayBuffer();
  const header = new Uint8Array(data).slice(0, 5);
  const label = file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 120);
  if (extension === 'txt') {
    try {
      return excerptsFromText(new TextDecoder('utf-8', { fatal: true }).decode(data), label);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('context_file');
    }
  }
  if (extension === 'docx' && header[0] === 80 && header[1] === 75) {
    const xml = await docxXML(data);
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new AppError('context_file');
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    if (
      document.querySelector('parsererror') ||
      document.documentElement.localName !== 'document' ||
      document.documentElement.namespaceURI !== namespace
    )
      throw new AppError('context_file');
    const paragraphs = Array.from(document.getElementsByTagNameNS(namespace, 'p')).map((p) =>
      Array.from(p.getElementsByTagNameNS(namespace, 't'))
        .map((t) => t.textContent || '')
        .join(''),
    );
    return excerptsFromText(paragraphs.join('\n'), label);
  }
  if (extension === 'pdf' && new TextDecoder().decode(header) === '%PDF-') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
    const task = pdfjs.getDocument({
      data,
      standardFontDataUrl: '/pdf-assets/standard_fonts/',
      cMapUrl: '/pdf-assets/cmaps/',
      cMapPacked: true,
      disableFontFace: true,
      useSystemFonts: false,
      useWasm: false,
      isOffscreenCanvasSupported: false,
      stopAtErrors: true,
    });
    const timer = setTimeout(() => void task.destroy(), 20000);
    task.onPassword = () => void task.destroy();
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 100) throw new AppError('context_limit');
      const result: ExtractedExcerpt[] = [];
      let length = 0;
      for (let number = 1; number <= pdf.numPages; number++) {
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ('str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : ''))
          .join('')
          .trim();
        length += text.length;
        if (length > MAX_TEXT) throw new AppError('context_limit');
        if (text) result.push(...excerptsFromText(text, label, `p. ${number} · ¶`));
        page.cleanup();
      }
      if (!result.length) throw new AppError('context_empty');
      if (result.length > 500) throw new AppError('context_limit');
      return result;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('context_file');
    } finally {
      clearTimeout(timer);
      await task.destroy();
    }
  }
  throw new AppError('context_file');
}
