import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { configurePrefs, expect, FIXTURE_ORIGIN, tabIdFor, test } from './helpers';

// NFR accessibility: WCAG 2.1 AA checks with axe-core on every extension page and on the
// injected UI (open shadow roots in the e2e build), in light and dark mode.

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function audit(page: Page, include?: string[]) {
  let builder = new AxeBuilder({ page }).withTags(WCAG);
  for (const selector of include ?? []) builder = builder.include(selector);
  const { violations } = await builder.analyze();
  return violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('settings page', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      await expect(page.getByRole('heading', { name: 'Corretto settings' })).toBeVisible();
      expect(await audit(page)).toEqual([]);
    });

    test('setup guide, steps 1 to 3', async ({ page, extensionId }) => {
      await page.goto(`chrome-extension://${extensionId}/welcome.html`);
      expect(await audit(page)).toEqual([]);
      await page.getByRole('button', { name: 'Continue' }).click();
      expect(await audit(page)).toEqual([]);
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByRole('button', { name: 'Test and save' })).toBeVisible();
      expect(await audit(page)).toEqual([]);
    });

    test('toolbar popup', async ({ page, worker, context, extensionId }) => {
      await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
      const popup = await context.newPage();
      await popup.emulateMedia({ colorScheme: scheme });
      await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${await tabIdFor(worker, 'corretto.test')}`);
      await expect(popup.getByRole('checkbox')).toBeVisible();
      expect(await audit(popup)).toEqual([]);
    });

    test('in-page button, popup states and toast', async ({ page, provider, worker }) => {
      await configurePrefs(worker, {});
      await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
      await page.locator('#textarea').fill('i has a apple and it are red');
      await expect(page.locator('corretto-button')).toBeVisible();
      expect(await audit(page, ['corretto-button'])).toEqual([]);

      provider.behaviour.delayMs = 1500;
      await page.locator('corretto-button').click();
      await expect(page.locator('corretto-panel').getByText('Rewriting…')).toBeVisible();
      expect(await audit(page, ['corretto-panel'])).toEqual([]);

      const fluent = page.locator('corretto-panel').getByRole('button', { name: /More fluid/ });
      await expect(fluent).toBeVisible();
      expect(await audit(page, ['corretto-panel'])).toEqual([]);

      await fluent.click();
      await expect(page.locator('corretto-panel').getByRole('button', { name: 'Undo' })).toBeVisible();
      expect(await audit(page, ['corretto-panel'])).toEqual([]);

      provider.behaviour.delayMs = 0;
      provider.behaviour.status = 401;
      await page.locator('#textarea').fill('another sentence that is long enough');
      await page.locator('corretto-button').click();
      await expect(page.locator('corretto-panel').getByText('Your API key was rejected')).toBeVisible();
      expect(await audit(page, ['corretto-panel'])).toEqual([]);
    });
  });
}
