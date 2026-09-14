import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install']);
const py = process.platform === 'win32' ? 'python' : 'python3';
if (!existsSync(resolve(root, 'backend/.venv'))) run(py, ['-m', 'venv', 'backend/.venv']);
const venv = resolve(
  root,
  'backend/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
run(venv, ['-m', 'pip', 'install', '-r', 'backend/requirements-dev.txt']);
for (const [source, target] of [
  ['frontend/.env.example', 'frontend/.env.local'],
  ['backend/.env.example', 'backend/.env'],
]) {
  if (!existsSync(resolve(root, target)))
    copyFileSync(resolve(root, source), resolve(root, target));
}
console.log('\nReady. Run npm run dev, then open http://localhost:3000.');
