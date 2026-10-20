import type { Page } from '@playwright/test';
import { MAX_INPUT_CHARS } from '../../lib/rewrite-service';
import { configure, expect, FIXTURE_ORIGIN, TEST_KEY, test } from './helpers';

const TEXT = 'i has a apple and it are red';

async function start(page: Page, text = TEXT) {
  await page.goto(`${FIXTURE_ORIGIN}/fields.html`);
  await page.locator('#textarea').fill(text);
  await page.locator('corretto-button').click();
}

const panel = (page: Page) => page.locator('corretto-panel');

test.describe('provider request (FR-005, FR-015)', () => {
  test('sends the text, key and model to the configured endpoint', async ({ page, provider }) => {
    await start(page);
    await expect(panel(page).getByRole('button', { name: /More fluid/ })).toBeVisible();
    expect(provider.requests).toHaveLength(1);
    const [request] = provider.requests;
    expect(request!.headers.authorization).toBe(`Bearer ${TEST_KEY}`);
    expect(request!.body.model).toBe('mock-model');
    expect(request!.body.messages.at(-1)).toEqual({ role: 'user', content: TEXT });
  });

  test('Cancel aborts the request at the provider', async ({ page, provider }) => {
    provider.behaviour.delayMs = 3000;
    await start(page);
    await expect(panel(page).getByText('Rewriting…')).toBeVisible();
    await expect.poll(() => provider.requests.length).toBe(1);
    await panel(page).getByRole('button', { name: 'Cancel' }).click();
    await expect.poll(() => provider.requests[0]!.aborted).toBe(true);
    await expect(page.locator('#textarea')).toHaveValue(TEXT);
  });
});

test.describe('FR-009: error states', () => {
  test('invalid key offers settings, which opens the options page', async ({ page, provider, context }) => {
    provider.behaviour.status = 401;
    await start(page);
    await expect(panel(page).getByText('Your API key was rejected')).toBeVisible();
    const opened = context.waitForEvent('page');
    await panel(page).getByRole('button', { name: 'Open settings' }).click();
    expect((await opened).url()).toContain('/options.html');
    await expect(page.locator('#textarea')).toHaveValue(TEXT);
  });

  test("shows the provider's own explanation", async ({ page, provider }) => {
    provider.behaviour.status = 404;
    provider.behaviour.errorBody = { error: { message: 'The model `mock-model` has been decommissioned' } };
    await start(page);
    await expect(panel(page).getByText('model was not found')).toBeVisible();
    await expect(panel(page).getByText('The model `mock-model` has been decommissioned')).toBeVisible();
  });

  test('a Gemini-style 400 for a bad key is reported as a rejected key', async ({ page, provider }) => {
    provider.behaviour.status = 400;
    provider.behaviour.errorBody = [{ error: { message: 'API key not valid. Please pass a valid API key.' } }];
    await start(page);
    await expect(panel(page).getByText('Your API key was rejected')).toBeVisible();
  });

  test('rate limit offers retry, and retry can succeed', async ({ page, provider }) => {
    provider.behaviour.status = 429;
    await start(page);
    await expect(panel(page).getByText('rate limit was reached')).toBeVisible();
    provider.behaviour.status = 200;
    await panel(page).getByRole('button', { name: 'Retry' }).click();
    await expect(panel(page).getByRole('button', { name: /More fluid/ })).toBeVisible();
  });

  test('unreadable output is retried once, then reported', async ({ page, provider }) => {
    provider.behaviour.content = () => 'Sorry, I cannot do that.';
    await start(page);
    await expect(panel(page).getByText("answer couldn't be read")).toBeVisible();
    expect(provider.requests).toHaveLength(2);
  });

  test('model not found offers settings', async ({ page, provider }) => {
    provider.behaviour.status = 404;
    await start(page);
    await expect(panel(page).getByText('model was not found')).toBeVisible();
    await expect(panel(page).getByRole('button', { name: 'Open settings' })).toBeVisible();
  });

  test('unreachable server reports a network error', async ({ page, worker, provider }) => {
    await provider.close();
    await configure(worker, { providerId: 'custom', apiKey: '', model: 'm', baseUrl: provider.baseUrl });
    await start(page);
    await expect(panel(page).getByText("Couldn't reach the provider")).toBeVisible();
    await expect(panel(page).getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('text over the limit is not sent', async ({ page, provider }) => {
    await start(page, 'word '.repeat(MAX_INPUT_CHARS / 5 + 1));
    await expect(panel(page).getByText('This text is too long')).toBeVisible();
    await expect(panel(page).getByRole('button')).toHaveCount(0);
    expect(provider.requests).toHaveLength(0);
  });

  test('a cloud preset without a key asks for one', async ({ page, worker, provider }) => {
    await configure(worker, { providerId: 'groq', apiKey: '', model: '', baseUrl: '' });
    await start(page);
    await expect(panel(page).getByText('Add your API key')).toBeVisible();
    await expect(panel(page).getByRole('button', { name: 'Open settings' })).toBeVisible();
    expect(provider.requests).toHaveLength(0);
  });

  test('a missing host permission is reported before any request', async ({ page, worker }) => {
    // The e2e build only grants 127.0.0.1; a custom https host has no permission.
    await configure(worker, { providerId: 'custom', apiKey: 'k', model: 'm', baseUrl: 'https://llm.example.com/v1' });
    await start(page);
    await expect(panel(page).getByText('needs permission')).toBeVisible();
  });
});
