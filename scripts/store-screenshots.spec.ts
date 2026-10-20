import type { Page } from '@playwright/test';
import path from 'node:path';
import { configurePrefs, expect, FIXTURE_ORIGIN, test } from '../tests/e2e/helpers';

// Generates store listing screenshots from the e2e build with realistic mock rewrites.

const OUT = path.resolve('store/screenshots');
const SIZE = { width: 1280, height: 800 };
const DRAFT = 'Hi Sara, i wanted to let you know that the report are ready and i send it to you tomorrow morning.';
const REWRITES = {
  minimal: 'Hi Sara, I wanted to let you know that the report is ready and I will send it to you tomorrow morning.',
  fluent: "Hi Sara, just a quick note: the report is ready, and I'll send it over tomorrow morning.",
  formal: 'Dear Sara, I am pleased to let you know that the report is ready. I will send it to you tomorrow morning.',
};

test.use({ viewport: SIZE });

async function compose(page: Page) {
  await page.setViewportSize(SIZE);
  await page.goto(`${FIXTURE_ORIGIN}/demo.html`);
  await page.locator('#body').click();
  await page.locator('#body').pressSequentially(DRAFT);
  await page.locator('corretto-button').click();
  await expect(page.locator('corretto-panel').getByRole('button', { name: /More fluid/ })).toBeVisible();
}

test('1-suggestions', async ({ page, provider }) => {
  provider.behaviour.content = () => JSON.stringify(REWRITES);
  await compose(page);
  await page.screenshot({ path: `${OUT}/1-suggestions.png` });
});

test('2-replaced', async ({ page, provider }) => {
  provider.behaviour.content = () => JSON.stringify(REWRITES);
  await compose(page);
  await page.locator('corretto-panel').getByRole('button', { name: /More fluid/ }).click();
  await expect(page.locator('corretto-panel').getByRole('button', { name: 'Undo' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/2-replaced-with-undo.png` });
});

test('3-setup-guide', async ({ page, extensionId }) => {
  await page.setViewportSize(SIZE);
  await page.goto(`chrome-extension://${extensionId}/welcome.html`);
  await page.screenshot({ path: `${OUT}/3-setup-guide.png` });
});

test('4-settings', async ({ page, extensionId, worker }) => {
  await configurePrefs(worker, {});
  await worker.evaluate(() =>
    (globalThis as unknown as { chrome: typeof browser }).chrome.storage.local.set({
      settings: { providerId: 'gemini', apiKey: 'demo-key-not-real', model: 'gemini-flash-lite-latest', baseUrl: '' },
    }),
  );
  await page.setViewportSize(SIZE);
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('heading', { name: 'Corretto settings' })).toBeVisible();
  await page.screenshot({ path: `${OUT}/4-settings.png` });
});

test('5-promo-tile', async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 280 });
  await page.goto(`file://${path.resolve('store/brand/promo-tile.html')}`);
  await page.screenshot({ path: path.resolve('store/promo/small-tile-440x280.png') });
});
