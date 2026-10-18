import { startController } from '@/lib/controller';
import { createRewriteFlow } from '@/lib/flow';
import type { RewriteRequest, RewriteResponse } from '@/lib/messages';
import { Panel } from '@/lib/panel';
import { loadStrings } from '@/lib/strings';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  main(ctx) {
    const strings = loadStrings();
    const panel = new Panel(strings);
    ctx.onInvalidated(() => panel.destroy());
    startController({
      label: strings.buttonLabel,
      onActivate: createRewriteFlow({
        panel,
        strings,
        request: (text) =>
          browser.runtime.sendMessage({ type: 'corretto/rewrite', text } satisfies RewriteRequest) as Promise<RewriteResponse>,
      }),
      signal: ctx.signal,
    });
  },
});
