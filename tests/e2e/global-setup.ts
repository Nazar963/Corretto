import path from 'node:path';
import { build } from 'vite';

/** Output directory for bundled fixture scripts, served by tests/e2e/helpers.ts. */
export const FIXTURE_BUNDLE_DIR = path.resolve('.output/e2e-fixtures');

export default async function globalSetup() {
  await build({
    configFile: false,
    logLevel: 'warn',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      outDir: FIXTURE_BUNDLE_DIR,
      emptyOutDir: true,
      lib: {
        entry: path.resolve('tests/e2e/fixtures/react/main.js'),
        formats: ['iife'],
        name: 'ReactFixture',
        fileName: () => 'react.js',
      },
    },
  });
}
