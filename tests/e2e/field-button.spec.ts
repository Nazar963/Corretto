import { HIDE_DELAY_MS } from '../../lib/controller';
import { expect, FIXTURE_ORIGIN, test } from './helpers';

const LONG = 'this sentence is long enough';

test.beforeEach(async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
});

test.describe('FR-001 / FR-002: supported fields', () => {
  for (const id of ['textarea', 'text', 'search']) {
    test(`button appears on #${id} once the minimum length is reached`, async ({ page }) => {
      const button = page.locator('corretto-button');
      await page.locator(`#${id}`).fill('hi');
      await expect(button).toBeHidden();
      await page.locator(`#${id}`).fill(LONG);
      await expect(button).toBeVisible();
    });
  }

  test('button appears on a field added after load within 500 ms', async ({ page }) => {
    await page.evaluate(() => {
      const field = document.createElement('textarea');
      field.id = 'dynamic';
      document.querySelector('#slot')!.append(field);
    });
    await page.locator('#dynamic').fill(LONG);
    await expect(page.locator('corretto-button')).toBeVisible({ timeout: 500 });
  });

  test('button appears on a field inside an iframe', async ({ page }) => {
    const frame = page.frameLocator('#frame');
    await frame.locator('#inner').fill(LONG);
    await expect(frame.locator('corretto-button')).toBeVisible();
  });
});

test.describe('FR-002: focus behaviour', () => {
  test('clicking the button keeps focus and selection in the field', async ({ page }) => {
    const field = page.locator('#textarea');
    await field.fill(LONG);
    await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(5, 13));
    await page.locator('corretto-button').click();
    const state = await field.evaluate((el: HTMLTextAreaElement) => ({
      focused: document.activeElement === el,
      start: el.selectionStart,
      end: el.selectionEnd,
    }));
    expect(state).toEqual({ focused: true, start: 5, end: 13 });
  });

  test('button is not in the Tab order', async ({ page }) => {
    await page.locator('#textarea').fill(LONG);
    await expect(page.locator('corretto-button')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('text');
  });

  test('button stays briefly after blur, then hides', async ({ page }) => {
    const button = page.locator('corretto-button');
    await page.locator('#textarea').fill(LONG);
    await page.locator('#textarea').blur();
    await expect(button).toBeVisible();
    await expect(button).toBeHidden({ timeout: HIDE_DELAY_MS + 1000 });
  });

  test('button sits inside the field, bottom-right', async ({ page }) => {
    await page.locator('#textarea').fill(LONG);
    const field = (await page.locator('#textarea').boundingBox())!;
    const button = (await page.locator('corretto-button').boundingBox())!;
    expect(button.x).toBeGreaterThan(field.x + field.width / 2);
    expect(button.x + button.width).toBeLessThanOrEqual(field.x + field.width);
    expect(button.y).toBeGreaterThan(field.y + field.height / 2);
    expect(button.y + button.height).toBeLessThanOrEqual(field.y + field.height);
  });
});

test.describe('FR-003: excluded fields', () => {
  for (const id of ['password', 'email', 'tel', 'url', 'readonly', 'cc', 'otp', 'newpass']) {
    test(`no button on #${id}`, async ({ page }) => {
      const field = page.locator(`#${id}`);
      await field.focus();
      if (id !== 'readonly') await page.keyboard.type(LONG);
      await page.waitForTimeout(300);
      await expect(page.locator('corretto-button')).toBeHidden();
    });
  }

  test('no button on #number', async ({ page }) => {
    await page.locator('#number').fill('123456789012345678');
    await page.waitForTimeout(300);
    await expect(page.locator('corretto-button')).toBeHidden();
  });
});

test('a field focused before the content script loaded gets the button', async ({ page }) => {
  await page.goto(`${FIXTURE_ORIGIN}/autofocus.html`);
  await expect(page.locator('#auto')).toBeFocused();
  await expect(page.locator('corretto-button')).toBeVisible();
});
