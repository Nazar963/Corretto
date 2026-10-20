import {
  isListModelsRequest,
  isOpenSettingsRequest,
  isRewriteRequest,
  isTestConnectionRequest,
  REWRITE_PORT,
  type ListModelsResponse,
  type RewriteResponse,
  type ShortcutMessage,
} from '@/lib/messages';
import { availableModels, rewrite, type ServiceDeps } from '@/lib/rewrite-service';
import { loadSettings } from '@/lib/settings';

/** Short sample used by "Test connection" (FR-011 AC-002). */
const TEST_TEXT = 'This are a short test sentence.';

export default defineBackground(() => {
  const deps: ServiceDeps = {
    hasPermission: (pattern) => browser.permissions.contains({ origins: [pattern] }),
  };
  const isExtensionPage = (sender: { id?: string; url?: string }) =>
    sender.id === browser.runtime.id && !!sender.url?.startsWith(browser.runtime.getURL('/'));

  // One port per rewrite; disconnecting it aborts the provider request (FR-009 Cancel).
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== REWRITE_PORT || port.sender?.id !== browser.runtime.id) return;
    const controller = new AbortController();
    port.onDisconnect.addListener(() => controller.abort());
    port.onMessage.addListener(async (message) => {
      if (!isRewriteRequest(message)) return;
      const response = await rewrite(message.text, await loadSettings(), controller.signal, deps);
      if (!controller.signal.aborted) port.postMessage(response);
    });
  });

  // FR-014: the setup guide opens once, on first install; not on updates or browser restarts.
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') void browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
  });

  // Keyboard shortcut (FR-010): tell the tab; the frame holding focus opens the popup.
  const onCommand = async (command: string, tab?: { id?: number }) => {
    if (command !== 'rewrite') return;
    const tabId = tab?.id ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (tabId === undefined) return;
    // Pages where content scripts cannot run (browser pages, stores) have no listener.
    await browser.tabs.sendMessage(tabId, { type: 'corretto/shortcut' } satisfies ShortcutMessage).catch(() => {});
  };
  browser.commands.onCommand.addListener((command, tab) => void onCommand(command, tab));
  // Browser shortcuts cannot be pressed from Playwright; the e2e build exposes the handler.
  if (import.meta.env.MODE === 'e2e') Object.assign(globalThis, { correttoTest: { onCommand } });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return false;
    // e2e build only (see entrypoints/content.ts): configure from Firefox tests.
    if (import.meta.env.MODE === 'e2e' && (message as { type?: string }).type === 'corretto/e2e') {
      const request = message as { action: string; settings?: unknown };
      void (async () => {
        if (request.action === 'configure') await browser.storage.local.set({ settings: request.settings });
        sendResponse({
          settings: (await browser.storage.local.get('settings')).settings,
          local: await browser.permissions.contains({ origins: ['http://127.0.0.1/*'] }),
          all: await browser.permissions.contains({ origins: ['<all_urls>'] }),
        });
      })();
      return true;
    }
    if (isOpenSettingsRequest(message)) {
      void browser.runtime.openOptionsPage();
      return false;
    }
    // Unsaved settings may only come from our own pages, never from a content script.
    if (isTestConnectionRequest(message) && isExtensionPage(sender)) {
      rewrite(TEST_TEXT, message.settings, new AbortController().signal, deps).then(
        sendResponse,
        () => sendResponse({ ok: false, error: { code: 'unknown' } } satisfies RewriteResponse),
      );
      return true; // Keep the channel open for the async response.
    }
    if (isListModelsRequest(message) && isExtensionPage(sender)) {
      availableModels(message.settings, new AbortController().signal, deps).then(
        sendResponse,
        () => sendResponse({ ok: false, error: { code: 'unknown' } } satisfies ListModelsResponse),
      );
      return true;
    }
    return false;
  });
});
