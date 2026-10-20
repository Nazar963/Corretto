import { chromium, expect, test, type Browser as PlaywrightBrowser } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startMockProvider, type MockProvider } from './mock-provider';

// A tab that was already open when Corretto gets installed (e.g. Gmail left open while
// installing from the store) must get the button without being refreshed. The browser starts
// without the extension; the page opens first; then Corretto is installed through CDP.

const extensionPath = path.resolve(process.env.CORRETTO_EXTENSION_PATH ?? '.output/chrome-mv3-e2e');
const executable = process.env.CORRETTO_BROWSER ?? chromium.executablePath();
const TEXT = 'this sentence is long enough';

let chrome: ChildProcess;
let cdp: PlaywrightBrowser;
let profile: string;
let server: Server;
let origin: string;
let provider: MockProvider;

test.beforeEach(async () => {
  provider = await startMockProvider();
  const fixtures = path.resolve('tests/e2e/fixtures');
  server = createServer(async (req, res) => {
    const body = await readFile(path.join(fixtures, path.basename(req.url ?? '/'))).catch(() => null);
    if (body) res.writeHead(200, { 'Content-Type': 'text/html' }).end(body);
    else res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  profile = await mkdtemp(path.join(tmpdir(), 'corretto-'));
  chrome = spawn(executable, [
    '--headless=new',
    '--remote-debugging-port=0',
    '--enable-unsafe-extension-debugging',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]);
  const wsUrl = await new Promise<string>((resolve, reject) => {
    let log = '';
    chrome.stderr!.on('data', (chunk: Buffer) => {
      log += chunk.toString();
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) resolve(match[1]!);
    });
    chrome.once('exit', () => reject(new Error(`browser exited: ${log}`)));
  });
  cdp = await chromium.connectOverCDP(wsUrl);
});

test.afterEach(async () => {
  await cdp?.close().catch(() => {});
  chrome?.kill();
  await provider?.close();
  server?.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
});

async function installCorretto() {
  const context = cdp.contexts()[0]!;
  const ready = context.waitForEvent('serviceworker', (w) => w.url().endsWith('/background.js'));
  await (await cdp.newBrowserCDPSession()).send('Extensions.loadUnpacked', { path: extensionPath });
  const worker = await ready;
  await worker.evaluate(
    (settings) => (globalThis as unknown as { chrome: typeof browser }).chrome.storage.local.set({ settings }),
    { providerId: 'ollama', apiKey: '', model: 'mock-model', baseUrl: provider.baseUrl },
  );
}

test('a page that was open before install gets the button and replaces text', async () => {
  const page = await cdp.contexts()[0]!.newPage();
  await page.goto(`${origin}/fields.html`);
  await installCorretto();
  // No page reload.
  await page.locator('#textarea').fill(TEXT);
  await expect(page.locator('corretto-button')).toBeVisible();
  await page.locator('corretto-button').click();
  await page.locator('corretto-panel').getByRole('button', { name: /More fluid/ }).click();
  await expect(page.locator('#textarea')).toHaveValue(`[fluent] ${TEXT}`);
});

test('an editor and an iframe that were open before install get the button', async () => {
  const page = await cdp.contexts()[0]!.newPage();
  await page.goto(`${origin}/editable.html`);
  await installCorretto();
  await page.locator('#plain').click();
  await page.keyboard.type(TEXT);
  await expect(page.locator('corretto-button')).toBeVisible();
  const frame = page.frameLocator('#frame');
  await frame.locator('body').click();
  await frame.locator('body').pressSequentially(TEXT);
  await expect(frame.locator('corretto-button')).toBeVisible();
});
