import type { Page } from '@playwright/test';
import { expect, FIXTURE_ORIGIN, test } from './helpers';

const TEXT = 'i has a apple and it are red';

async function openResults(page: Page, selector = '#textarea') {
  await page.locator(selector).fill(TEXT);
  await page.locator('corretto-button').click();
}

function panel(page: Page) {
  return page.locator('corretto-panel');
}

function option(page: Page, name: RegExp) {
  return panel(page).getByRole('button', { name });
}

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
});

test.describe('FR-005 / FR-006: popup', () => {
  test('shows a loading state, then three labelled options', async ({ page }) => {
    await openResults(page);
    await expect(panel(page).getByText('Rewriting…')).toBeVisible();
    await expect(option(page, /Minimal fix/)).toBeVisible();
    await expect(option(page, /More fluid/)).toBeVisible();
    await expect(option(page, /More formal/)).toBeVisible();
    await expect(option(page, /More fluid/)).toContainText(`[fluent] ${TEXT}`);
  });

  test('Esc closes the popup, keeps the text and restores the selection', async ({ page }) => {
    await page.locator('#textarea').fill(TEXT);
    await page.locator('#textarea').evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 5));
    await page.locator('corretto-button').click();
    await expect(option(page, /Minimal fix/)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    const state = await page.locator('#textarea').evaluate((el: HTMLTextAreaElement) => ({
      value: el.value,
      focused: document.activeElement === el,
      start: el.selectionStart,
      end: el.selectionEnd,
    }));
    expect(state).toEqual({ value: TEXT, focused: true, start: 2, end: 5 });
  });

  test('clicking outside closes the popup and keeps the text', async ({ page }) => {
    await openResults(page);
    await expect(option(page, /Minimal fix/)).toBeVisible();
    await page.mouse.click(5, 600);
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#textarea')).toHaveValue(TEXT);
  });

  test('arrow keys and Enter pick an option', async ({ page }) => {
    await openResults(page);
    await expect(option(page, /Minimal fix/)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.locator('#textarea')).toHaveValue(`[fluent] ${TEXT}`);
  });

  test('Cancel during loading closes and ignores the late result', async ({ page }) => {
    await openResults(page);
    await panel(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(panel(page)).toBeHidden();
    await page.waitForTimeout(700);
    await expect(panel(page)).toBeHidden();
    await expect(page.locator('#textarea')).toHaveValue(TEXT);
  });
});

test.describe('FR-004 / FR-007: replacement', () => {
  for (const id of ['textarea', 'text', 'search']) {
    test(`picking an option replaces the whole value of #${id}`, async ({ page }) => {
      await openResults(page, `#${id}`);
      await option(page, /More formal/).click();
      await expect(page.locator(`#${id}`)).toHaveValue(`[formal] ${TEXT}`);
      await expect(panel(page).getByText('Replaced')).toBeVisible();
    });
  }

  test('only the selection is sent and replaced', async ({ page }) => {
    await page.locator('#textarea').fill(TEXT);
    await page.locator('#textarea').evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 13));
    await page.locator('corretto-button').click();
    await expect(option(page, /Minimal fix/)).toContainText('[minimal] a apple');
    await option(page, /Minimal fix/).click();
    await expect(page.locator('#textarea')).toHaveValue('i has [minimal] a apple and it are red');
  });

  test('a controlled field sees the new value through input events', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/controlled.html`);
    await openResults(page, '#controlled');
    await option(page, /More fluid/).click();
    expect(await page.evaluate(() => (window as unknown as { appState: { value: string } }).appState.value)).toBe(
      `[fluent] ${TEXT}`,
    );
  });
});

test.describe('FR-008: undo', () => {
  test('Undo restores the original text and selection', async ({ page }) => {
    await page.locator('#textarea').fill(TEXT);
    await page.locator('#textarea').evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 13));
    await page.locator('corretto-button').click();
    await option(page, /More fluid/).click();
    await panel(page).getByRole('button', { name: 'Undo' }).click();
    await expect(panel(page)).toBeHidden();
    const state = await page.locator('#textarea').evaluate((el: HTMLTextAreaElement) => ({
      value: el.value,
      start: el.selectionStart,
      end: el.selectionEnd,
    }));
    expect(state).toEqual({ value: TEXT, start: 6, end: 13 });
  });

  test('editing after replacement removes the Undo option', async ({ page }) => {
    await openResults(page);
    await option(page, /More fluid/).click();
    await expect(panel(page).getByRole('button', { name: 'Undo' })).toBeVisible();
    await page.keyboard.type('!');
    await expect(panel(page)).toBeHidden();
  });

  test('native Ctrl+Z undoes the replacement', async ({ page }) => {
    await openResults(page);
    await option(page, /More fluid/).click();
    await expect(page.locator('#textarea')).toHaveValue(`[fluent] ${TEXT}`);
    await page.keyboard.press('Control+z');
    await expect(page.locator('#textarea')).toHaveValue(TEXT);
  });
});

test.describe('FR-007 AC-001: real React controlled field', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/react.html`);
  });

  test('React state holds the replacement and survives a re-render', async ({ page }) => {
    await openResults(page, '#react');
    await expect(page.locator('#state')).toHaveText(TEXT);
    await option(page, /More fluid/).click();
    await expect(page.locator('#state')).toHaveText(`[fluent] ${TEXT}`);
    await page.locator('#rerender').click();
    await expect(page.locator('#react')).toHaveValue(`[fluent] ${TEXT}`);
  });

  test('Undo updates React state back to the original', async ({ page }) => {
    await openResults(page, '#react');
    await option(page, /More formal/).click();
    await expect(page.locator('#state')).toHaveText(`[formal] ${TEXT}`);
    await panel(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.locator('#state')).toHaveText(TEXT);
    await page.locator('#rerender').click();
    await expect(page.locator('#react')).toHaveValue(TEXT);
  });
});
