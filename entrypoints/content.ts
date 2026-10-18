import { startController } from '@/lib/controller';
import { createRewriteFlow } from '@/lib/flow';
import type { OpenSettingsRequest } from '@/lib/messages';
import { Panel } from '@/lib/panel';
import { requestRewrite } from '@/lib/rewrite-client';
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
        request: requestRewrite,
        openSettings: () => void browser.runtime.sendMessage({ type: 'corretto/open-settings' } satisfies OpenSettingsRequest),
      }),
      signal: ctx.signal,
    });
  },
});
