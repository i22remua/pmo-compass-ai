import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const forbiddenFiles = files.filter(
  (file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.env.example'),
);
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
  ['GitHub token', /gh(?:p|o|u|s|r)_[0-9A-Za-z]{30,}/],
  ['OpenAI key', /sk-(?:proj-)?[0-9A-Za-z_-]{20,}/],
  ['Groq key', /gsk_[0-9A-Za-z]{20,}/],
  ['OpenRouter key', /sk-or-v1-[0-9A-Za-z]{20,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{20,}/],
  ['service account private key', /"private_key"\s*:\s*"(?!")/],
];
const findings = forbiddenFiles.map((file) => ({ file, kind: 'tracked environment file' }));
for (const file of files) {
  if (/\.(?:png|jpg|jpeg|gif|webp|ico|pdf|lock)$/i.test(file)) continue;
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const [kind, pattern] of patterns) {
    if (pattern.test(content)) findings.push({ file, kind });
  }
  if (/NEXT_PUBLIC_(?:GEMINI|GROQ|OPENROUTER|OPENAI)[A-Z0-9_]*\s*=\s*\S+/.test(content))
    findings.push({ file, kind: 'frontend AI credential' });
}
if (findings.length) {
  console.error(
    'Secret scan failed. Potential credentials were found (values are intentionally hidden):',
  );
  for (const finding of findings) console.error(`- ${finding.file}: ${finding.kind}`);
  process.exit(1);
}
console.log(`Secret scan passed (${files.length} tracked files checked).`);
