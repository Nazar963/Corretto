import type { Locator, Page } from '@playwright/test';
import { expect, FIXTURE_ORIGIN, test } from './helpers';

const TEXT = 'i has a apple and it are red';
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

const panel = (page: Page) => page.locator('corretto-panel');
const option = (page: Page, name: RegExp) => panel(page).getByRole('button', { name });

async function typeInto(editor: Locator, text: string) {
  await editor.click();
  await editor.press('Control+a');
  await editor.pressSequentially(text);
}

async function innerText(editor: Locator) {
  return normalize(await editor.evaluate((el: HTMLElement) => el.innerText.replace(/\u200b/g, '')));
}

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/editable.html`);
});

test.describe('FR-001: contenteditable detection', () => {
  for (const id of ['plain', 'empty-attr', 'plaintext', 'rich', 'model']) {
    test(`button appears on #${id}`, async ({ page }) => {
      await typeInto(page.locator(`#${id}`), TEXT);
      await expect(page.locator('corretto-button')).toBeVisible();
    });
  }

  test('button appears on an editable iframe body', async ({ page }) => {
    const frame = page.frameLocator('#frame');
    await typeInto(frame.locator('body'), TEXT);
    await expect(frame.locator('corretto-button')).toBeVisible();
  });

  test('no button on an editor marked aria-readonly', async ({ page }) => {
    await page.locator('#readonly').click();
    await page.waitForTimeout(300);
    await expect(page.locator('corretto-button')).toBeHidden();
  });
});

test.describe('FR-007: replacement in contenteditable', () => {
  test('replaces the whole content of a plain editor', async ({ page }) => {
    const editor = page.locator('#plain');
    await typeInto(editor, TEXT);
    await page.locator('corretto-button').click();
    await option(page, /More fluid/).click();
    expect(await innerText(editor)).toBe(`[fluent] ${TEXT}`);
    await expect(panel(page).getByText('Replaced')).toBeVisible();
  });

  test('replaces multi-paragraph rich text and keeps line breaks', async ({ page }) => {
    const editor = page.locator('#rich');
    await editor.click();
    await page.locator('corretto-button').click();
    await option(page, /More formal/).click();
    const text = await editor.evaluate((el: HTMLElement) => el.innerText);
    expect(text.split('\n').filter(Boolean)).toEqual(['[formal] Hello wrld how', 'are you today']);
  });

  test('replaces only the selection inside formatted text', async ({ page }) => {
    const editor = page.locator('#rich');
    await editor.evaluate((el) => {
      const word = el.querySelector('b')!.firstChild!;
      const range = document.createRange();
      range.setStart(word, 0);
      range.setEnd(word, 4);
      (el as HTMLElement).focus();
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(range);
    });
    await page.locator('corretto-button').click();
    await expect(option(page, /Minimal fix/)).toContainText('[minimal] wrld');
    await option(page, /Minimal fix/).click();
    expect(await innerText(editor)).toBe('Hello [minimal] wrld how are you today');
  });

  test('a re-rendering editor model sees the replacement', async ({ page }) => {
    await typeInto(page.locator('#model'), TEXT);
    await page.locator('corretto-button').click();
    await option(page, /More fluid/).click();
    const model = await page.evaluate(() => (window as unknown as { editorModel: { value: string } }).editorModel.value);
    expect(normalize(model)).toBe(`[fluent] ${TEXT}`);
  });

  test('works in an editable iframe body', async ({ page }) => {
    const frame = page.frameLocator('#frame');
    await typeInto(frame.locator('body'), TEXT);
    await frame.locator('corretto-button').click();
    await frame.locator('corretto-panel').getByRole('button', { name: /More formal/ }).click();
    expect(await innerText(frame.locator('body'))).toBe(`[formal] ${TEXT}`);
  });

  test('typing while the provider works blocks the stale replacement', async ({ page, provider }) => {
    provider.behaviour.delayMs = 1000;
    const editor = page.locator('#plain');
    await typeInto(editor, TEXT);
    await page.locator('corretto-button').click();
    await expect(panel(page).getByText('Rewriting…')).toBeVisible();
    await page.keyboard.type(' too');
    await option(page, /More fluid/).click();
    await expect(panel(page).getByText('The text changed')).toBeVisible();
    expect(await innerText(editor)).toBe(`${TEXT} too`);
  });
});

test.describe('FR-008: undo in contenteditable', () => {
  test('Undo restores rich text, formatting included', async ({ page }) => {
    const editor = page.locator('#rich');
    const before = await editor.innerHTML();
    await editor.click();
    await page.locator('corretto-button').click();
    await option(page, /More fluid/).click();
    await panel(page).getByRole('button', { name: 'Undo' }).click();
    expect(await innerText(editor)).toBe('Hello wrld how are you today');
    expect(await editor.innerHTML()).toBe(before);
  });

  test('native Ctrl+Z undoes the replacement', async ({ page }) => {
    const editor = page.locator('#plain');
    await typeInto(editor, TEXT);
    await page.locator('corretto-button').click();
    await option(page, /More fluid/).click();
    expect(await innerText(editor)).toBe(`[fluent] ${TEXT}`);
    await page.keyboard.press('Control+z');
    expect(await innerText(editor)).toBe(TEXT);
  });

  test('Undo restores the original wording in a re-rendering editor', async ({ page }) => {
    const editor = page.locator('#model');
    await typeInto(editor, TEXT);
    await page.locator('corretto-button').click();
    await option(page, /More formal/).click();
    await panel(page).getByRole('button', { name: 'Undo' }).click();
    expect(await innerText(editor)).toBe(TEXT);
    const model = await page.evaluate(() => (window as unknown as { editorModel: { value: string } }).editorModel.value);
    expect(normalize(model)).toBe(TEXT);
  });
});
