import { chromium, expect, test } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

test('Chromium build loads with a running background worker', async () => {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const name = await worker.evaluate(
      () => (globalThis as unknown as { chrome: typeof browser }).chrome.runtime.getManifest().name,
    );
    expect(name).toBe('Corretto');
  } finally {
    await context.close();
  }
});
