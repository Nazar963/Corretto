import { chromium, test as base, type BrowserContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { FIXTURE_BUNDLE_DIR } from './global-setup';

// The e2e build opens shadow roots so tests can inspect the UI (lib/shadow.ts).
const extensionPath = path.resolve('.output/chrome-mv3-e2e');
const fixturesDir = path.resolve('tests/e2e/fixtures');

/** Fixture pages are served from this origin through request routing. */
export const FIXTURE_ORIGIN = 'http://corretto.test';

export const test = base.extend<{ context: BrowserContext }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await context.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const name = path.basename(new URL(route.request().url()).pathname);
      const isScript = name.endsWith('.js');
      const body = await readFile(path.join(isScript ? FIXTURE_BUNDLE_DIR : fixturesDir, name), 'utf8');
      await route.fulfill({ contentType: isScript ? 'text/javascript' : 'text/html', body });
    });
    // Content scripts register with the service worker; wait for it before tests navigate.
    if (context.serviceWorkers().length === 0) await context.waitForEvent('serviceworker');
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(await context.newPage());
  },
});

export { expect } from '@playwright/test';
