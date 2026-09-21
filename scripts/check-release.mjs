import { execFileSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let temporary;
let gitArgs = [];
const issues = [];
const git = (args) =>
  execFileSync('git', [...gitArgs, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
try {
  let top;
  try {
    top = git(['rev-parse', '--show-toplevel']).trim();
  } catch {
    /* No repository yet. */
  }
  if (!top || relative(resolve(top), resolve(root)) !== '') {
    // Evaluate Git's real ignore rules before the user has created their repository.
    temporary = mkdtempSync(join(tmpdir(), 'pmo-release-'));
    execFileSync('git', ['init', '--bare', '--quiet', temporary]);
    gitArgs = [`--git-dir=${temporary}`, `--work-tree=${root}`];
  }
  const files = [
    ...new Set(
      git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
        .split('\0')
        .filter(Boolean),
    ),
  ];
  const forbidden =
    /(?:^|\/)(?:node_modules|\.next(?:-[^/]*)?|__pycache__|\.?venv|logs|tmp|temp|\.vercel|\.firebase|test-results|playwright-report|delivery)(?:\/|$)|\.(?:log|pyc|pyo|tmp|temp|swp|swo|pem|key)$|~$/;
  const credentials =
    /(?:service[-_]?account.*|.*firebase-adminsdk.*|credentials|.*-credentials)\.json$/i;
  const patterns = [
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['service-account key', /"private_key"\s*:\s*"-----/],
    ['provider token', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}/],
    ['Groq token', /\bgsk_[A-Za-z0-9]{40,}/],
    ['Google API key', /\bAIza[A-Za-z0-9_-]{35}/],
    ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
    ['AWS access ID', /\bAKIA[0-9A-Z]{16}\b/],
  ];
  const indexed = new Set(git(['ls-files', '--cached', '-z']).split('\0').filter(Boolean));
  let textFiles = 0;
  for (const file of files) {
    if (
      forbidden.test(file) ||
      basename(file) === 'next-env.d.ts' ||
      credentials.test(basename(file)) ||
      (basename(file).startsWith('.env') && basename(file) !== '.env.example')
    ) {
      issues.push(`${file}: private configuration or generated file would be published`);
      continue;
    }
    let buffer;
    try {
      if (lstatSync(resolve(root, file)).isSymbolicLink()) {
        issues.push(`${file}: review symbolic links before public distribution`);
        continue;
      }
      buffer = readFileSync(resolve(root, file));
    } catch {
      issues.push(`${file}: listed file cannot be read; review staged deletions`);
      continue;
    }
    if (buffer.includes(0)) continue;
    textFiles++;
    const versions = [['working tree', buffer.toString('utf8')]];
    // A secret may still be staged after its working copy has been cleaned.
    if (indexed.has(file)) versions.push(['index', git(['show', `:${file}`])]);
    for (const [source, text] of versions) {
      for (const [name, pattern] of patterns)
        if (pattern.test(text))
          issues.push(`${file} (${source}): possible ${name} (value not printed)`);
      if (/NEXT_PUBLIC_(?:GEMINI|GROQ|OPENROUTER|OPENAI)(?:_[A-Z]+)*_KEY\s*=/.test(text))
        issues.push(`${file} (${source}): AI keys must never be public environment variables`);
      if (basename(file) === '.env.example') {
        for (const line of text.split('\n')) {
          const match = line.match(/^([A-Z_]*(?:KEY|SECRET|TOKEN|CREDENTIALS)[A-Z_]*)\s*=\s*(.*)$/);
          if (match && match[2].trim())
            issues.push(
              `${file} (${source}): ${match[1]} must be blank or documented in a comment`,
            );
        }
      }
    }
  }
  // Check representative paths even if these artifacts do not exist on this machine.
  const excluded = [
    '.env',
    'backend/.env',
    'frontend/.env.local',
    'backend/.env.production',
    'node_modules/example.js',
    'frontend/.next/build.json',
    'frontend/next-env.d.ts',
    'delivery/linkedin/demo.mp4',
    'backend/__pycache__/model.pyc',
    'backend/venv/bin/python',
    'backend/.venv/bin/python',
    'logs/app.log',
    'debug.log',
    'tmp/report.txt',
    'report.tmp',
    'serviceAccountKey.json',
    'credentials.json',
  ];
  const ignored = new Set(
    git(['check-ignore', '--no-index', ...excluded])
      .trim()
      .split('\n'),
  );
  for (const file of excluded)
    if (!ignored.has(file)) issues.push(`${file}: missing .gitignore protection`);
  for (const file of ['.env.example', 'backend/.env.example', 'frontend/.env.example']) {
    if (!files.includes(file))
      issues.push(`${file}: safe environment example is missing or ignored`);
  }
  const rootEnv = readFileSync(resolve(root, '.env.example'), 'utf8');
  const backendEnv = readFileSync(resolve(root, 'backend/.env.example'), 'utf8');
  const frontendEnv = readFileSync(resolve(root, 'frontend/.env.example'), 'utf8');
  for (const [label, text, values] of [
    ['root', rootEnv, { AI_PROVIDER: 'auto', AUTH_MODE: 'demo', NEXT_PUBLIC_DATA_MODE: 'demo' }],
    ['backend', backendEnv, { AI_PROVIDER: 'auto', AUTH_MODE: 'demo', APP_ENV: 'development' }],
    [
      'frontend',
      frontendEnv,
      { NEXT_PUBLIC_DATA_MODE: 'demo', NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'false' },
    ],
  ]) {
    for (const [key, value] of Object.entries(values)) {
      if (!new RegExp(`^${key}=${value}$`, 'm').test(text))
        issues.push(`${label} example: expected ${key}=${value}`);
    }
  }
  if (issues.length) {
    issues.forEach((issue) => console.error(issue));
    process.exitCode = 1;
  } else {
    console.log(
      `Release files PASS: ${files.length} publishable files, ${textFiles} text files scanned; ignore rules and offline-safe defaults verified.`,
    );
    console.log(
      'Local .env files are excluded. Pattern checks do not replace reviewing the staged diff or Git history.',
    );
  }
} catch (error) {
  console.error(`Release check failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
