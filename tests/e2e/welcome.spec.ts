import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// FR-014: first-run setup guide.

const guideTab = (pages: Page[]) => pages.find((p) => p.url().endsWith('/welcome.html'));

async function storedSettings(page: Page) {
  return page.evaluate(async () => (await browser.storage.local.get('settings')).settings);
}

test('opens once on install', async ({ context, worker }) => {
  void worker;
  const tabs = context.pages().filter((p) => p.url().endsWith('/welcome.html'));
  expect(tabs).toHaveLength(1);
  await expect(tabs[0]!.getByRole('heading', { name: 'Welcome to Corretto' })).toBeVisible();
  await expect(tabs[0]!.getByText('Step 1 of 4')).toBeVisible();
});

test('recommends the verified provider and explains free-tier privacy', async ({ context, worker }) => {
  void worker;
  const guide = guideTab(context.pages())!;
  await expect(guide.getByRole('radio', { name: /Google Gemini.*Recommended/ })).toBeChecked();
  await guide.getByRole('button', { name: 'Continue' }).click();
  await expect(guide.getByRole('heading', { name: 'Get your Google Gemini API key' })).toBeVisible();
  await expect(guide.getByRole('link', { name: 'Open the Google Gemini key page' })).toHaveAttribute(
    'href',
    'https://aistudio.google.com/apikey',
  );
  await expect(guide.getByText(/Free tiers may use what you send to improve their models/)).toBeVisible();
});

test('a local server: set up, list models, test and save, then the ready page', async ({ context, worker, provider }) => {
  void worker;
  const guide = guideTab(context.pages())!;
  await guide.getByRole('radio', { name: /Ollama/ }).check();
  await guide.getByRole('button', { name: 'Continue' }).click();

  await expect(guide.getByRole('heading', { name: 'Set up Ollama' })).toBeVisible();
  await expect(guide.getByRole('link', { name: 'Download Ollama' })).toBeVisible();
  await expect(guide.getByText('Privacy: your text stays on this computer.')).toBeVisible();
  await guide.getByRole('button', { name: 'Continue' }).click();

  const form = guide.getByRole('form', { name: 'Connect Ollama' });
  await expect(form.getByLabel('Provider')).toBeHidden();
  await form.getByLabel('Server address').fill(provider.baseUrl);
  await form.getByRole('button', { name: 'Show models' }).click();
  await expect(form.getByRole('status')).toHaveText('Found 2 models. Pick one in the Model field.');
  await form.getByLabel('Model').fill('mock-model-small');
  await form.getByRole('button', { name: 'Test and save' }).click();

  await expect(guide.getByRole('heading', { name: 'You’re ready' })).toBeVisible();
  expect(await storedSettings(guide)).toEqual({
    providerId: 'ollama',
    apiKey: '',
    model: 'mock-model-small',
    baseUrl: provider.baseUrl,
  });
  expect(provider.requests).toHaveLength(1);
});

test('a failed test keeps the user on the step and saves nothing', async ({ context, worker }) => {
  void worker;
  const guide = guideTab(context.pages())!;
  const before = await storedSettings(guide);
  await guide.getByRole('radio', { name: /Ollama/ }).check();
  await guide.getByRole('button', { name: 'Continue' }).click();
  await guide.getByRole('button', { name: 'Continue' }).click();

  // Cloud presets would show the browser's permission prompt, which automation cannot accept;
  // a local address with nothing listening fails without one.
  const form = guide.getByRole('form', { name: 'Connect Ollama' });
  await form.getByLabel('Server address').fill('http://127.0.0.1:9/v1');
  await form.getByLabel('Model').fill('any-model');
  await form.getByRole('button', { name: 'Test and save' }).click();
  await expect(form.getByRole('status')).toHaveText(/Couldn't reach the provider/);
  await expect(guide.getByText('Step 3 of 4')).toBeVisible();
  expect(await storedSettings(guide)).toEqual(before);

  await guide.getByRole('button', { name: 'Back' }).click();
  await expect(guide.getByText('Step 2 of 4')).toBeVisible();
});

test('the settings page links back to the guide', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.getByRole('link', { name: 'Open the setup guide' })).toHaveAttribute(
    'href',
    `chrome-extension://${extensionId}/welcome.html`,
  );
});
