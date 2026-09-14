import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const python = resolve(
  root,
  'backend/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
if (!existsSync(python)) {
  console.error('Run npm run setup first.');
  process.exit(1);
}
const children = [
  spawn(
    python,
    [
      '-m',
      'uvicorn',
      'app.main:app',
      '--reload',
      '--host',
      '127.0.0.1',
      '--port',
      process.env.API_PORT || '8000',
    ],
    { cwd: resolve(root, 'backend'), stdio: 'inherit' },
  ),
  spawn(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'dev', '--workspace', 'frontend'],
    { cwd: root, stdio: 'inherit' },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill('SIGTERM'));
  setTimeout(() => process.exit(code), 500).unref();
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
children.forEach((child) => {
  child.on('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on('exit', (code) => stop(code ?? 1));
});
