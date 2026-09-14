import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const python = resolve(
  'backend/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
);
const result = spawnSync(python, ['-m', 'pytest', '-q'], {
  cwd: resolve('backend'),
  stdio: 'inherit',
});
if (result.error) console.error('Run npm run setup first.', result.error.message);
process.exit(result.status ?? 1);
