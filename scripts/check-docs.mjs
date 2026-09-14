import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith('.md') ? [path] : [];
  });
}
const files = [resolve(root, 'README.md'), ...markdownFiles(resolve(root, 'docs'))];
const issues = [];
let checked = 0;
const withoutFences = (text) =>
  text.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1\s*$/gm, '');
function anchors(text) {
  const counts = new Map();
  const ids = new Set();
  for (const match of withoutFences(text).matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '')
      .replace(/\s/g, '-');
    const count = counts.get(slug) || 0;
    ids.add(count ? `${slug}-${count}` : slug);
    counts.set(slug, count + 1);
  }
  for (const match of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) ids.add(match[1]);
  return ids;
}
function checkTarget(file, rawTarget) {
  const target = rawTarget.replace(/^<|>$/g, '');
  if (/^(?:https?:|mailto:)/i.test(target)) return;
  checked++;
  const label = `${relative(root, file)}: ${target}`;
  if (/^(?:[a-z][\w+.-]*:|\/|\\|~)/i.test(target)) {
    issues.push(`${label} — internal links must be relative`);
    return;
  }
  try {
    const [path, fragment] = target.split('#');
    const destination = path
      ? resolve(dirname(file), decodeURIComponent(path.split('?')[0]))
      : file;
    const local = relative(root, destination);
    if (local.startsWith('..') || isAbsolute(local)) throw new Error('link escapes the repository');
    // Check every segment because macOS may accept casing that GitHub/Linux rejects.
    let directory = root;
    for (const segment of local.split(/[\\/]/).filter(Boolean)) {
      if (!readdirSync(directory).includes(segment))
        throw new Error('missing file or incorrect case');
      directory = resolve(directory, segment);
    }
    statSync(destination);
    if (fragment && extname(destination) === '.md') {
      if (!anchors(readFileSync(destination, 'utf8')).has(decodeURIComponent(fragment))) {
        throw new Error('missing heading anchor');
      }
    }
  } catch (error) {
    issues.push(`${label} — ${error.message}`);
  }
}
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (/(?:\/Users\/|\/home\/|file:\/\/|vscode:\/\/|[A-Z]:\\Users\\)/i.test(text)) {
    issues.push(`${relative(root, file)} — machine-specific filesystem reference`);
  }
  const prose = withoutFences(text);
  for (const match of prose.matchAll(
    /!?\[[^\]\n]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g,
  )) {
    checkTarget(file, match[1]);
  }
  for (const match of prose.matchAll(/^ {0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm))
    checkTarget(file, match[1]);
  for (const match of prose.matchAll(/\b(?:href|src)=["']([^"']+)["']/g))
    checkTarget(file, match[1]);
}
if (issues.length) {
  issues.forEach((issue) => console.error(issue));
  process.exitCode = 1;
} else {
  console.log(
    `Documentation PASS: ${files.length} Markdown files, ${checked} internal links, paths and anchors checked.`,
  );
}
