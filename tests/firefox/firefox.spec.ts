import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { startMockProvider, type MockProvider } from '../e2e/mock-provider';
import { Firefox, waitFor, type Ref } from './webdriver';

// Smoke test of the Firefox build (slice 9): install, setup guide, settings, rewrite flows.
// Run with `npm run test:firefox` (builds .output/firefox-mv3-e2e first).

const ADDON_ID = 'corretto@corretto.extension';
const UUID = '6b7c1e2a-3f4d-4e5a-9b8c-0d1e2f3a4b5c';
const EXT = `moz-extension://${UUID}`;
const BINARY = process.env.FIREFOX_BINARY ?? '/snap/firefox/current/usr/lib/firefox/firefox';
const TEXT = 'i has a apple and it are red';

let firefox: Firefox;
let provider: MockProvider;
let server: Server;
let origin: string;
/** The setup-guide tab: an extension page where the test can call extension APIs. */
let guideHandle: string;

test.beforeAll(async () => {
  provider = await startMockProvider();
  const fixtures = path.resolve('tests/e2e/fixtures');
  server = createServer(async (req, res) => {
    try {
      const body = await readFile(path.join(fixtures, path.basename(req.url ?? '/')), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  firefox = await Firefox.start({
    binary: BINARY,
    // A fixed internal UUID makes moz-extension:// URLs predictable.
    prefs: { 'extensions.webextensions.uuids': JSON.stringify({ [ADDON_ID]: UUID }) },
  });
  await firefox.installAddon(path.resolve('.output/firefox-mv3-e2e'));
});

test.afterAll(async () => {
  await firefox?.quit();
  await provider?.close();
  server?.close();
});

const host = (tag: string) => firefox.find(tag);
const shadow = async (tag: string) => firefox.shadowRoot(await host(tag));

async function buttonVisible(): Promise<boolean> {
  return firefox.run<boolean>(`return document.querySelector('corretto-button')?.style.display === 'block';`);
}

async function option(tone: 'minimal' | 'fluent' | 'formal'): Promise<Ref> {
  return waitFor(`${tone} option`, async () => firefox.find(`[data-tone="${tone}"]`, await shadow('corretto-panel')));
}

test('opens the setup guide on install (FR-014)', async () => {
  guideHandle = (await waitFor('guide tab', async () => {
    for (const handle of await firefox.handles()) {
      await firefox.switchTo(handle);
      if ((await firefox.url()) === `${EXT}/welcome.html`) return handle;
    }
    return null;
  }))!;
  expect(guideHandle).toBeTruthy();
  // Later tests use another tab for web pages; WebDriver cannot navigate a tab to moz-extension://.
  const handles = await firefox.handles();
  await firefox.switchTo(handles.find((h) => h !== guideHandle)!);
});

/** Send a request to the e2e-only hook in the content script (see entrypoints/content.ts). */
async function hook(request: object): Promise<{ settings: unknown; local: boolean; all: boolean } | null> {
  return firefox.run(
    `
    const reply = new Promise((resolve) => {
      const onMessage = (event) => {
        if (event.data && 'correttoTestResult' in event.data) {
          window.removeEventListener('message', onMessage);
          resolve(event.data.correttoTestResult);
        }
      };
      window.addEventListener('message', onMessage);
    });
    window.postMessage({ correttoTest: arguments[0] }, '*');
    return await Promise.race([reply, new Promise((r) => setTimeout(() => r(null), 3000))]);`,
    request,
  );
}

test('runs on web pages, has its permissions and accepts settings', async () => {
  await firefox.goto(`${origin}/fields.html`);
  const result = await waitFor('content script answer', () =>
    hook({ action: 'configure', settings: { providerId: 'ollama', apiKey: '', model: 'mock-model', baseUrl: provider.baseUrl } }),
  );
  expect(result).toMatchObject({ local: true, all: true, settings: { providerId: 'ollama', baseUrl: provider.baseUrl } });
});

test('textarea: button, three options, replace, undo', async () => {
  await firefox.goto(`${origin}/fields.html`);
  const field = await firefox.find('#textarea');
  await firefox.type(field, TEXT);
  await waitFor('button', buttonVisible);
  await firefox.click(await host('corretto-button'));
  await firefox.click(await option('fluent'));
  const value = () => firefox.run<string>(`return document.querySelector('#textarea').value;`);
  expect(await value()).toBe(`[fluent] ${TEXT}`);
  expect(provider.requests.at(-1)!.body.messages.at(-1)!.content).toBe(TEXT);

  await firefox.click(await waitFor('undo', async () => firefox.find('button.action', await shadow('corretto-panel'))));
  await waitFor('original text', async () => (await value()) === TEXT);
});

test('textarea: Esc closes the popup and keeps the text', async () => {
  await firefox.goto(`${origin}/fields.html`);
  await firefox.type(await firefox.find('#textarea'), TEXT);
  await waitFor('button', buttonVisible);
  await firefox.click(await host('corretto-button'));
  await option('minimal');
  await firefox.keys('');
  await waitFor('panel closed', () =>
    firefox.run<boolean>(`return document.querySelector('corretto-panel').style.display === 'none';`),
  );
  expect(await firefox.run(`return document.querySelector('#textarea').value;`)).toBe(TEXT);
});

test('contenteditable: replaces rich text and undo restores formatting', async () => {
  await firefox.goto(`${origin}/editable.html`);
  const before = await firefox.run<string>(`return document.querySelector('#rich').innerHTML;`);
  await firefox.click(await firefox.find('#rich'));
  await waitFor('button', buttonVisible);
  await firefox.click(await host('corretto-button'));
  await firefox.click(await option('formal'));
  const text = await firefox.run<string>(`return document.querySelector('#rich').innerText;`);
  expect(text.split('\n').filter(Boolean)).toEqual(['[formal] Hello wrld how', 'are you today']);
  await firefox.click(await waitFor('undo', async () => firefox.find('button.action', await shadow('corretto-panel'))));
  await waitFor('original markup', async () => (await firefox.run<string>(`return document.querySelector('#rich').innerHTML;`)) === before);
});

test('contenteditable inside a shadow root: selection only', async () => {
  await firefox.goto(`${origin}/shadow.html`);
  const editor = await firefox.find('#shadow-editable', await shadow('#widget'));
  await firefox.click(editor);
  await firefox.type(editor, TEXT);
  await firefox.run(`
    const el = document.querySelector('#widget').shadowRoot.querySelector('#shadow-editable');
    const node = el.firstChild;
    const range = document.createRange();
    range.setStart(node, 6);
    range.setEnd(node, 13);
    getSelection().removeAllRanges();
    getSelection().addRange(range);`);
  await waitFor('button', buttonVisible);
  await firefox.click(await host('corretto-button'));
  const minimal = await option('minimal');
  const label = await firefox.run<string>(
    `return document.querySelector('corretto-panel').shadowRoot.querySelector('[data-tone="minimal"] .text').textContent;`,
  );
  expect(label).toBe('[minimal] a apple');
  await firefox.click(minimal);
  const text = await firefox.run<string>(
    `return document.querySelector('#widget').shadowRoot.querySelector('#shadow-editable').innerText;`,
  );
  expect(text.replace(/\s+/g, ' ').trim()).toBe('i has [minimal] a apple and it are red');
});
