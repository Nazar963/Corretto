import { startController } from '@/lib/controller';
import { fieldText, isEligibleField } from '@/lib/fields';
import { createRewriteFlow } from '@/lib/flow';
import { isShortcutMessage, isSiteInfoRequest, type OpenSettingsRequest, type SiteInfoResponse } from '@/lib/messages';
import { Panel } from '@/lib/panel';
import { loadPrefs, watchPrefs } from '@/lib/prefs';
import { requestRewrite } from '@/lib/rewrite-client';
import { deepActiveElement, frameHosts } from '@/lib/site-hosts';
import { siteState } from '@/lib/sites';
import { loadStrings } from '@/lib/strings';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  async main(ctx) {
    const strings = loadStrings();
    const panel = new Panel(strings);
    ctx.onInvalidated(() => panel.destroy());
    const activate = createRewriteFlow({
      panel,
      strings,
      request: requestRewrite,
      openSettings: () => void browser.runtime.sendMessage({ type: 'corretto/open-settings' } satisfies OpenSettingsRequest),
    });

    const hosts = frameHosts();
    let prefs = await loadPrefs();
    // Present while Corretto is on for this site; aborting removes the button (FR-012, FR-013).
    let running: AbortController | null = null;

    const apply = () => {
      const on = siteState(hosts, prefs) === 'on';
      if (on && !running && ctx.isValid) {
        running = new AbortController();
        startController({
          label: strings.buttonLabel,
          onActivate: activate,
          signal: AbortSignal.any([ctx.signal, running.signal]),
          minimum: () => prefs,
        });
      } else if (!on && running) {
        running.abort();
        running = null;
        panel.close();
      }
    };
    apply();
    ctx.onInvalidated(
      watchPrefs((next) => {
        prefs = next;
        apply();
      }),
    );

    const onMessage = (message: unknown, _sender: unknown, sendResponse: (response: SiteInfoResponse) => void) => {
      if (isSiteInfoRequest(message)) {
        // Only the top frame answers, so the popup gets the site the user is on.
        if (window !== window.top) return false;
        sendResponse({ host: location.hostname, state: siteState(hosts, prefs) });
        return false;
      }
      if (isShortcutMessage(message) && running && document.hasFocus()) {
        // Every frame receives the shortcut; only the one holding focus acts (FR-010).
        const field = deepActiveElement();
        if (isEligibleField(field) && fieldText(field).trim() !== '') activate(field);
      }
      return false;
    };
    browser.runtime.onMessage.addListener(onMessage);
    ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(onMessage));
  },
});
