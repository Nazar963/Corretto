import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

async function openOptions(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('heading', { name: 'Corretto settings' })).toBeVisible();
}

const fields = (page: Page) => ({
  provider: page.getByLabel('Provider'),
  baseUrl: page.getByLabel('Server address'),
  key: page.getByLabel('API key'),
  model: page.getByLabel('Model'),
  status: page.getByRole('status'),
});

test.describe('FR-011: settings page', () => {
  test('shows the stored configuration', async ({ page, extensionId, provider }) => {
    await openOptions(page, extensionId);
    const f = fields(page);
    await expect(f.provider).toHaveValue('custom');
    await expect(f.baseUrl).toHaveValue(provider.baseUrl);
    await expect(f.key).toHaveAttribute('type', 'password');
    await expect(f.model).toHaveValue('mock-model');
  });

  test('saves settings that persist after reload', async ({ page, extensionId, provider }) => {
    await openOptions(page, extensionId);
    const f = fields(page);
    await f.key.fill('new-key');
    await f.model.fill('other-model');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(f.status).toHaveText('Saved.');
    await page.reload();
    await expect(fields(page).key).toHaveValue('new-key');
    await expect(fields(page).model).toHaveValue('other-model');
    await expect(fields(page).baseUrl).toHaveValue(provider.baseUrl);
  });

  test('switching provider suggests that provider’s model and hides the server address', async ({ page, extensionId }) => {
    await openOptions(page, extensionId);
    const f = fields(page);
    await f.model.fill('');
    await f.provider.selectOption('mistral');
    await expect(f.model).toHaveValue('mistral-small-latest');
    await expect(f.baseUrl).toBeHidden();
    await expect(page.getByRole('link', { name: 'Get a key from Mistral' })).toHaveAttribute(
      'href',
      'https://console.mistral.ai/api-keys',
    );
  });

  test('Test connection reports success (FR-011 AC-002)', async ({ page, extensionId, provider }) => {
    await openOptions(page, extensionId);
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(fields(page).status).toHaveText('Connection works.');
    expect(provider.requests).toHaveLength(1);
  });

  test('Test connection uses unsaved values and reports the specific error', async ({ page, extensionId, provider }) => {
    provider.behaviour.status = 401;
    await openOptions(page, extensionId);
    await fields(page).key.fill('typed-but-not-saved');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(fields(page).status).toHaveText('Your API key was rejected. Check it in settings.');
    expect(provider.requests[0]!.headers.authorization).toBe('Bearer typed-but-not-saved');
  });

  test("Test connection shows the provider's explanation", async ({ page, extensionId, provider }) => {
    provider.behaviour.status = 404;
    provider.behaviour.errorBody = { error: { message: 'model `nope` does not exist' } };
    await openOptions(page, extensionId);
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(fields(page).status).toContainText('The model was not found.');
    await expect(fields(page).status).toContainText('Provider said: “model `nope` does not exist”');
  });
});
