import { chromium, expect as baseExpect, test as base, type BrowserContext, type Worker } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prefs } from '../../lib/prefs';
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

export async function configurePrefs(worker: Worker, prefs: Partial<Prefs>): Promise<void> {
  await worker.evaluate(async (patch) => {
    const api = (globalThis as unknown as { chrome: typeof browser }).chrome;
    const current = ((await api.storage.local.get('prefs')).prefs ?? {}) as object;
    await api.storage.local.set({ prefs: { ...current, ...patch } });
  }, prefs);
}

export async function readPrefs(worker: Worker): Promise<Partial<Prefs> | undefined> {
  return worker.evaluate(
    async () => (await (globalThis as unknown as { chrome: typeof browser }).chrome.storage.local.get('prefs')).prefs as Partial<Prefs>,
  );
}

/** Tab id of the open page on `host`, found by asking each tab's content script (no tabs permission needed). */
export async function tabIdFor(worker: Worker, host: string): Promise<number> {
  const id = await worker.evaluate(async (wanted) => {
    const api = (globalThis as unknown as { chrome: typeof browser }).chrome;
    for (const tab of await api.tabs.query({})) {
      if (tab.id === undefined) continue;
      const info = (await api.tabs.sendMessage(tab.id, { type: 'corretto/site-info' }).catch(() => undefined)) as
        | { host: string }
        | undefined;
      if (info?.host === wanted) return tab.id;
    }
    return -1;
  }, host);
  if (id < 0) throw new Error(`no tab for ${host}`);
  return id;
}

/** Same handler the browser calls for the keyboard shortcut (exposed by the e2e build). */
export async function pressShortcut(worker: Worker, tabId: number): Promise<void> {
  await worker.evaluate(
    (id) =>
      (globalThis as unknown as { correttoTest: { onCommand: (c: string, t: { id: number }) => Promise<void> } }).correttoTest.onCommand(
        'rewrite',
        { id },
      ),
    tabId,
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
    // The setup guide opens once at install (FR-014). Wait for it, so tests that wait for a
    // new tab (e.g. "Open settings") never catch the guide by mistake.
    await baseExpect.poll(() => context.pages().some((p) => p.url().endsWith('/welcome.html'))).toBe(true);
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
