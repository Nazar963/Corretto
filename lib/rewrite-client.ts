// Content-script side of the rewrite port (lib/messages.ts REWRITE_PORT).

import { REWRITE_PORT, type RewriteRequest, type RewriteResponse } from './messages';

export function requestRewrite(text: string, signal: AbortSignal): Promise<RewriteResponse> {
  return new Promise((resolve) => {
    const port = browser.runtime.connect({ name: REWRITE_PORT });
    const onAbort = () => {
      port.disconnect();
      resolve({ ok: false, error: { code: 'cancelled' } });
    };
    signal.addEventListener('abort', onAbort, { once: true });
    port.onMessage.addListener((response: RewriteResponse) => {
      signal.removeEventListener('abort', onAbort);
      port.disconnect();
      resolve(response);
    });
    // The background went away (e.g. extension reloaded) before answering.
    port.onDisconnect.addListener(() => resolve({ ok: false, error: { code: 'unknown' } }));
    port.postMessage({ type: 'corretto/rewrite', text } satisfies RewriteRequest);
  });
}
