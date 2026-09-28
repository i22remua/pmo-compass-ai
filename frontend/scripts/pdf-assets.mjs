// Keep parser resources on the application origin; never fetch document data from a CDN.
import { cpSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const source = dirname(require.resolve('pdfjs-dist/package.json'));
const destination = fileURLToPath(new URL('../public/pdf-assets/', import.meta.url));
mkdirSync(destination, { recursive: true });
for (const folder of ['standard_fonts', 'cmaps']) {
  cpSync(join(source, folder), join(destination, folder), { recursive: true });
}
