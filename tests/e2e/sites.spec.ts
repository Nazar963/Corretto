import type { Page } from '@playwright/test';
import { configurePrefs, expect, FIXTURE_ORIGIN, pressShortcut, readPrefs, tabIdFor, test } from './helpers';

const HOST = 'corretto.test';
const button = (page: Page) => page.locator('corretto-button');
const panel = (page: Page) => page.locator('corretto-panel');

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
});

test.describe('FR-002: configurable minimum length', () => {
  test('a stored minimum applies, and a change applies without reloading', async ({ page, worker }) => {
    await configurePrefs(worker, { minWords: 6, minChars: 100 });
    await page.reload();
    await page.locator('#textarea').fill('one two three');
    await page.waitForTimeout(300);
    await expect(button(page)).toBeHidden();
    await page.locator('#textarea').fill('one two three four five six');
    await expect(button(page)).toBeVisible();

    await configurePrefs(worker, { minWords: 2 });
    await page.locator('#textarea').fill('one two');
    await expect(button(page)).toBeVisible();
  });
});

test.describe('FR-013: sensitive sites', () => {
  test('no button on a site in the sensitive list, and the popup says why', async ({ page, worker, context, extensionId }) => {
    await configurePrefs(worker, { sensitiveSites: ['example.org', HOST] });
    await page.reload();
    await page.locator('#textarea').fill('this sentence is long enough');
    await page.waitForTimeout(300);
    await expect(button(page)).toBeHidden();

    const tabId = await tabIdFor(worker, HOST);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
    await expect(popup.getByText(HOST)).toBeVisible();
    await expect(popup.getByText('this site is on your sensitive-sites list')).toBeVisible();
    await expect(popup.getByRole('checkbox')).toHaveCount(0);
  });

  test('an iframe follows the top-level site', async ({ page, worker }) => {
    await configurePrefs(worker, { sensitiveSites: [HOST] });
    await page.reload();
    const frame = page.frameLocator('#frame');
    await frame.locator('#inner').fill('this sentence is long enough');
    await page.waitForTimeout(300);
    await expect(frame.locator('corretto-button')).toBeHidden();
  });
});

test.describe('FR-012: per-site off switch in the toolbar popup', () => {
  test('turning a site off removes the button right away; turning it on brings it back', async ({
    page,
    worker,
    context,
    extensionId,
  }) => {
    const tabId = await tabIdFor(worker, HOST);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
    const toggle = popup.getByRole('checkbox', { name: 'Corretto on this site' });
    await expect(toggle).toBeChecked();
    // Chrome does not assign suggested shortcuts to extensions loaded from the command line,
    // so no shortcut line is shown here (see docs/features/sites-and-shortcut.md).
    await expect(popup.getByText(/^Shortcut:/)).toHaveCount(0);

    await toggle.uncheck();
    await expect.poll(async () => (await readPrefs(worker))?.disabledSites).toEqual([HOST]);
    await page.bringToFront();
    await page.locator('#textarea').fill('this sentence is long enough');
    await page.waitForTimeout(300);
    await expect(button(page)).toBeHidden();

    await toggle.check();
    await expect.poll(async () => (await readPrefs(worker))?.disabledSites).toEqual([]);
    await page.locator('#textarea').fill('this sentence is long enough again');
    await expect(button(page)).toBeVisible();
  });

  test('the popup explains pages where Corretto cannot run', async ({ context, extensionId }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=999999`);
    await expect(popup.getByText("Corretto can't run on this page.")).toBeVisible();
  });
});

test.describe('FR-010: keyboard shortcut', () => {
  test('opens the popup for the focused field, even below the minimum length', async ({ page, worker }) => {
    await page.locator('#textarea').fill('hi there');
    await expect(button(page)).toBeHidden();
    await pressShortcut(worker, await tabIdFor(worker, HOST));
    await expect(panel(page).getByRole('button', { name: /More fluid/ })).toContainText('[fluent] hi there');
  });

  test('acts in the focused iframe only', async ({ page, worker }) => {
    const frame = page.frameLocator('#frame');
    await frame.locator('#inner').fill('hello from the frame');
    await pressShortcut(worker, await tabIdFor(worker, HOST));
    await expect(frame.locator('corretto-panel').getByRole('button', { name: /Minimal fix/ })).toBeVisible();
    await expect(panel(page)).toBeHidden();
  });

  test('does nothing on excluded fields, empty fields, or sites turned off', async ({ page, worker }) => {
    const tabId = await tabIdFor(worker, HOST);
    await page.locator('#password').fill('secret words here');
    await pressShortcut(worker, tabId);
    await page.locator('#text').focus();
    await pressShortcut(worker, tabId);

    await configurePrefs(worker, { disabledSites: [HOST] });
    await page.locator('#textarea').fill('this sentence is long enough');
    await pressShortcut(worker, tabId);
    await page.waitForTimeout(600);
    await expect(panel(page)).toBeHidden();
  });
});

test.describe('settings: where Corretto appears', () => {
  test('edits the minimum, the disabled list and the sensitive list', async ({ page, worker, extensionId }) => {
    await configurePrefs(worker, { disabledSites: ['github.com', HOST] });
    const options = page;
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    const form = options.getByRole('form', { name: 'Where Corretto appears' });

    await form.getByLabel('Words').fill('5');
    await form.getByRole('button', { name: `Turn Corretto back on for ${HOST}` }).click();
    await expect(form.getByText(HOST)).toBeHidden();
    const sensitive = form.getByLabel('Sensitive sites (always off)');
    await expect(sensitive).toHaveValue(/paypal\.com/);
    await sensitive.fill('Example.org\nhttps://bank.example.com/login\n\nexample.org');
    await form.getByRole('button', { name: 'Save' }).click();
    await expect(form.getByRole('status')).toHaveText('Saved.');
    await expect(sensitive).toHaveValue('example.org\nbank.example.com');

    const saved = await readPrefs(worker);
    expect(saved).toMatchObject({ minWords: 5, disabledSites: ['github.com'], sensitiveSites: ['example.org', 'bank.example.com'] });

    await form.getByRole('button', { name: 'Restore default list' }).click();
    await expect(sensitive).toHaveValue(/paypal\.com/);
    // No shortcut is assigned in the test browser; the page says so and explains where to set one.
    await expect(form.getByText(/No shortcut is set\. Change it in your browser's extension shortcut settings/)).toBeVisible();
  });
});
