import type { Page } from '@playwright/test';
import { expect, FIXTURE_ORIGIN, test } from './helpers';

// Real Lexical editor (WhatsApp Web, Messenger): the replacement must reach the editor's model,
// not only the DOM, or the app keeps (and sends) the old text.

const TEXT = 'i has a apple and it are red';
const panel = (page: Page) => page.locator('corretto-panel');
const modelText = (page: Page) => page.evaluate(() => (window as unknown as { lexicalText: () => string }).lexicalText());
const domText = (page: Page) => page.locator('#lexical').evaluate((el: HTMLElement) => el.innerText.trim());

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/lexical.html`);
  await page.locator('#lexical').click();
  await page.keyboard.type(TEXT);
  await expect.poll(() => modelText(page)).toBe(TEXT);
});

test('picking a rewrite updates the editor model and survives further typing', async ({ page }) => {
  await page.locator('corretto-button').click();
  await panel(page).getByRole('button', { name: /More fluid/ }).click();
  await expect.poll(() => modelText(page)).toBe(`[fluent] ${TEXT}`);
  expect(await domText(page)).toBe(`[fluent] ${TEXT}`);
  await page.keyboard.type('!');
  await expect.poll(() => modelText(page)).toBe(`[fluent] ${TEXT}!`);
});

test('replaces only the selected words', async ({ page }) => {
  // Select "a apple" with the keyboard, as a user would.
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 7; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.locator('corretto-button').click();
  await expect(panel(page).getByRole('button', { name: /Minimal fix/ })).toContainText('[minimal] a apple');
  await panel(page).getByRole('button', { name: /Minimal fix/ }).click();
  await expect.poll(() => modelText(page)).toBe('i has [minimal] a apple and it are red');
});

test('Undo restores the original text in the editor model', async ({ page }) => {
  await page.locator('corretto-button').click();
  await panel(page).getByRole('button', { name: /More formal/ }).click();
  await expect.poll(() => modelText(page)).toBe(`[formal] ${TEXT}`);
  await panel(page).getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => modelText(page)).toBe(TEXT);
});
