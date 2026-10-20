import type { Page } from '@playwright/test';
import { configure, expect, test } from './helpers';

async function openOptions(page: Page, extensionId: string) {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('heading', { name: 'Corretto settings' })).toBeVisible();
}

const providerForm = (page: Page) => page.getByRole('form', { name: 'AI provider' });

const fields = (page: Page) => ({
  provider: providerForm(page).getByLabel('Provider'),
  baseUrl: page.getByLabel('Server address'),
  key: page.getByLabel('API key'),
  model: page.getByLabel('Model'),
  status: providerForm(page).getByRole('status'),
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
    await providerForm(page).getByRole('button', { name: 'Save' }).click();
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

  test('a local server needs no key and lists its models (FR-015)', async ({ page, extensionId, worker, provider }) => {
    await configure(worker, { providerId: 'ollama', apiKey: '', model: '', baseUrl: provider.baseUrl });
    await openOptions(page, extensionId);
    const f = fields(page);
    await expect(f.provider).toHaveValue('ollama');
    await expect(page.getByText('Start Ollama on this computer, then click “Show models”')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Ollama' })).toHaveAttribute('href', 'https://ollama.com/download');
    await expect(f.baseUrl).toHaveAttribute('placeholder', 'http://localhost:11434/v1');

    await page.getByRole('button', { name: 'Show models' }).click();
    await expect(f.status).toHaveText('Found 2 models. Pick one in the Model field.');
    const options = await page.locator('#model-options option').evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value));
    expect(options).toEqual(['mock-model', 'mock-model-small']);
    expect(provider.requests).toHaveLength(0); // listing models is a GET, not a rewrite

    await f.model.fill('mock-model-small');
    await page.getByRole('button', { name: 'Test connection' }).click();
    await expect(f.status).toHaveText('Connection works.');
    expect(provider.requests[0]!.headers.authorization).toBeUndefined();
    expect(provider.requests[0]!.body.model).toBe('mock-model-small');
  });

  test('switching provider clears a typed server address', async ({ page, extensionId }) => {
    await openOptions(page, extensionId);
    await fields(page).provider.selectOption('lmstudio');
    await expect(fields(page).baseUrl).toHaveValue('');
    await expect(fields(page).baseUrl).toHaveAttribute('placeholder', 'http://localhost:1234/v1');
  });

  test('Anthropic shows a key link and its suggested model', async ({ page, extensionId }) => {
    await openOptions(page, extensionId);
    const f = fields(page);
    await f.model.fill('');
    await f.provider.selectOption('anthropic');
    await expect(f.model).toHaveValue('claude-haiku-5-5');
    await expect(f.baseUrl).toBeHidden();
    await expect(page.getByRole('link', { name: 'Get a key from Anthropic (Claude)' })).toBeVisible();
  });
});
