import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTs,
  // Effects synchronise browser storage/auth and initialise editable route data.
  { rules: { 'react-hooks/set-state-in-effect': 'off' } },
  globalIgnores(['.next/**', '.next-*/**', 'next-env.d.ts']),
]);
