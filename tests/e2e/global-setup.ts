import path from 'node:path';
import { build } from 'vite';

/** Output directory for bundled fixture scripts, served by tests/e2e/helpers.ts. */
export const FIXTURE_BUNDLE_DIR = path.resolve('.output/e2e-fixtures');

/** Real third-party editors used as fixtures, bundled to `${FIXTURE_BUNDLE_DIR}/<name>.js`. */
const BUNDLES = {
  react: 'tests/e2e/fixtures/react/main.js',
  lexical: 'tests/e2e/fixtures/lexical/main.js',
};

export default async function globalSetup() {
  for (const [name, entry] of Object.entries(BUNDLES)) {
    await build({
      configFile: false,
      logLevel: 'warn',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        outDir: FIXTURE_BUNDLE_DIR,
        emptyOutDir: false,
        lib: {
          entry: path.resolve(entry),
          formats: ['iife'],
          name: `${name}Fixture`,
          fileName: () => `${name}.js`,
        },
      },
    });
  }
}
