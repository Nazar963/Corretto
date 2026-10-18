import { chromium, test as base, type BrowserContext, type Worker } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '../../lib/settings';
import { FIXTURE_BUNDLE_DIR } from './global-setup';
import { startMockProvider, type MockProvider } from './mock-provider';

// The e2e build opens shadow roots so tests can inspect the UI (lib/shadow.ts),
// and grants http://127.0.0.1/* so the mock provider needs no permission prompt.
const extensionPath = path.resolve('.output/chrome-mv3-e2e');
const fixturesDir = path.resolve('tests/e2e/fixtures');

/** Fixture pages are served from this origin through request routing. */
export const FIXTURE_ORIGIN = 'http://corretto.test';

export const TEST_KEY = 'test-key-123';

export async function configure(worker: Worker, settings: Settings): Promise<void> {
  await worker.evaluate(
    (value) => (globalThis as unknown as { chrome: typeof browser }).chrome.storage.local.set({ settings: value }),
    settings,
  );
}

export const test = base.extend<{
  provider: MockProvider;
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  provider: async ({}, use) => {
    const provider = await startMockProvider();
    await use(provider);
    await provider.close();
  },
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
    await use(context);
    await context.close();
  },
  worker: async ({ context, provider }, use) => {
    // Content scripts register with the service worker; wait for it before tests navigate.
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    // Default: a configured custom provider pointing at the mock server.
    await configure(worker, { providerId: 'custom', apiKey: TEST_KEY, model: 'mock-model', baseUrl: provider.baseUrl });
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
  page: async ({ context, worker }, use) => {
    void worker;
    await use(await context.newPage());
  },
});

export { expect } from '@playwright/test';
