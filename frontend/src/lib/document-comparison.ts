import type { GeneratedDocument } from '@/types';

export function comparisonCandidates(current: GeneratedDocument, documents: GeneratedDocument[]) {
  const currentTime = Date.parse(current.createdAt);
  return documents
    .filter(
      (item) =>
        item.id !== current.id &&
        item.ownerId === current.ownerId &&
        item.projectId === current.projectId &&
        item.type === current.type &&
        item.language === current.language &&
        Date.parse(item.createdAt) <= currentTime,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
}

export type TextChange = { kind: 'unchanged' | 'removed' | 'added'; lines: string[] };

// Compare stored text, not project facts. Bound the alignment matrix so long
// documents cannot freeze the workspace; the grouped fallback remains lossless.
export function compareDocumentText(before: string, after: string) {
  const lines = (text: string) => (text ? text.replace(/\r\n?/g, '\n').split('\n') : []);
  const a = lines(before);
  const b = lines(after);
  const changes: TextChange[] = [];
  const append = (kind: TextChange['kind'], content: string[]) => {
    if (!content.length) return;
    const last = changes.at(-1);
    if (last?.kind === kind) last.lines.push(...content);
    else changes.push({ kind, lines: [...content] });
  };
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  append('unchanged', a.slice(0, start));
  const oldLines = a.slice(start, endA);
  const newLines = b.slice(start, endB);
  const grouped = (oldLines.length + 1) * (newLines.length + 1) > 250_000;
  if (grouped) {
    append('removed', oldLines);
    append('added', newLines);
  } else {
    const width = newLines.length + 1;
    const table = new Uint32Array((oldLines.length + 1) * width);
    for (let i = oldLines.length - 1; i >= 0; i--) {
      for (let j = newLines.length - 1; j >= 0; j--) {
        table[i * width + j] =
          oldLines[i] === newLines[j]
            ? table[(i + 1) * width + j + 1] + 1
            : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        append('unchanged', [oldLines[i++]]);
        j++;
      } else if (
        i < oldLines.length &&
        (j === newLines.length || table[(i + 1) * width + j] >= table[i * width + j + 1])
      ) {
        append('removed', [oldLines[i++]]);
      } else append('added', [newLines[j++]]);
    }
  }
  append('unchanged', a.slice(endA));
  return { changes, grouped, identical: changes.every((change) => change.kind === 'unchanged') };
}
