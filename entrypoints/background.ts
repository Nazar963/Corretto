import {
  isListModelsRequest,
  isOpenSettingsRequest,
  isRewriteRequest,
  isTestConnectionRequest,
  REWRITE_PORT,
  type ListModelsResponse,
  type RewriteResponse,
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

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) return false;
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
