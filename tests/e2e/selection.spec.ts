import type { FrameLocator, Locator, Page } from '@playwright/test';
import { expect, FIXTURE_ORIGIN, test } from './helpers';

// FR-004 edge cases: selections in iframes and in fields inside open shadow roots.

const TEXT = 'i has a apple and it are red';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

async function selectInTextField(field: Locator, start: number, end: number) {
  await field.evaluate((el: HTMLTextAreaElement, [s, e]) => el.setSelectionRange(s!, e!), [start, end]);
}

/** Select [start, end) of the first text node inside an editable element. */
async function selectInEditable(field: Locator, start: number, end: number) {
  await field.evaluate(
    (el: HTMLElement, [s, e]) => {
      el.focus();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const node = walker.nextNode()!;
      const range = document.createRange();
      range.setStart(node, s!);
      range.setEnd(node, e!);
      const selection = getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    },
    [start, end],
  );
}

async function pickMinimal(scope: Page | FrameLocator) {
  const panel = scope.locator('corretto-panel');
  await expect(panel.getByRole('button', { name: /Minimal fix/ })).toContainText('[minimal] a apple');
  await panel.getByRole('button', { name: /Minimal fix/ }).click();
}

const innerText = async (field: Locator) => normalize(await field.evaluate((el: HTMLElement) => el.innerText));

test.describe('selection inside iframes', () => {
  test('textarea in an iframe', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
    const frame = page.frameLocator('#frame');
    const field = frame.locator('#inner');
    await field.fill(TEXT);
    await selectInTextField(field, 6, 13);
    await frame.locator('corretto-button').click();
    await pickMinimal(frame);
    await expect(field).toHaveValue('i has [minimal] a apple and it are red');
  });

  test('editable iframe body', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/editable.html`);
    const frame = page.frameLocator('#frame');
    const body = frame.locator('body');
    await body.click();
    await body.pressSequentially(TEXT);
    await selectInEditable(body, 6, 13);
    await frame.locator('corretto-button').click();
    await pickMinimal(frame);
    expect(await innerText(body)).toBe('i has [minimal] a apple and it are red');
  });
});

test.describe('fields inside an open shadow root', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/shadow.html`);
  });

  test('textarea: whole text', async ({ page }) => {
    const field = page.locator('#shadow-textarea');
    await field.fill(TEXT);
    await page.locator('corretto-button').click();
    await page.locator('corretto-panel').getByRole('button', { name: /More fluid/ }).click();
    await expect(field).toHaveValue(`[fluent] ${TEXT}`);
  });

  test('textarea: selection only', async ({ page }) => {
    const field = page.locator('#shadow-textarea');
    await field.fill(TEXT);
    await selectInTextField(field, 6, 13);
    await page.locator('corretto-button').click();
    await pickMinimal(page);
    await expect(field).toHaveValue('i has [minimal] a apple and it are red');
  });

  test('contenteditable: whole text', async ({ page }) => {
    const field = page.locator('#shadow-editable');
    await field.click();
    await field.pressSequentially(TEXT);
    await page.locator('corretto-button').click();
    await page.locator('corretto-panel').getByRole('button', { name: /More fluid/ }).click();
    expect(await innerText(field)).toBe(`[fluent] ${TEXT}`);
  });

  test('contenteditable: selection only', async ({ page }) => {
    const field = page.locator('#shadow-editable');
    await field.click();
    await field.pressSequentially(TEXT);
    await selectInEditable(field, 6, 13);
    await page.locator('corretto-button').click();
    await pickMinimal(page);
    expect(await innerText(field)).toBe('i has [minimal] a apple and it are red');
  });

  test('contenteditable: undo restores the original', async ({ page }) => {
    const field = page.locator('#shadow-editable');
    await field.click();
    await field.pressSequentially(TEXT);
    await page.locator('corretto-button').click();
    await page.locator('corretto-panel').getByRole('button', { name: /More fluid/ }).click();
    await page.locator('corretto-panel').getByRole('button', { name: 'Undo' }).click();
    expect(await innerText(field)).toBe(TEXT);
  });
});
