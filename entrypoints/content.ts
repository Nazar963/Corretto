import { startController } from '@/lib/controller';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  main(ctx) {
    startController({
      label: browser.i18n.getMessage('buttonLabel'),
      // Popup and rewrite flow arrive in slice 2.
      onActivate: () => {},
      signal: ctx.signal,
    });
  },
});
