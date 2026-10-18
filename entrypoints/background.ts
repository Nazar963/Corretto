import { isRewriteRequest, type RewriteResponse } from '@/lib/messages';
import { mockRewrite } from '@/lib/providers/mock';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isRewriteRequest(message)) return false;
    // Slice 2: mock only. Real provider selection arrives in slice 3.
    mockRewrite(message.text).then(
      (rewrites) => sendResponse({ ok: true, rewrites } satisfies RewriteResponse),
      () => sendResponse({ ok: false, error: { code: 'unknown' } } satisfies RewriteResponse),
    );
    return true; // Keep the channel open for the async response.
  });
});
