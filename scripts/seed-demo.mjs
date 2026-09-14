import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const python = resolve(
  root,
  'backend/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
const result = spawnSync(python, [resolve(root, 'scripts/seed-demo.py')], {
  cwd: root,
  stdio: 'inherit',
});
if (result.error) console.error('Run npm run setup first.', result.error.message);
process.exit(result.status ?? 1);
