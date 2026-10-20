import { useEffect, useState } from 'preact/hooks';
import type { SiteInfoRequest, SiteInfoResponse } from '@/lib/messages';
import { loadPrefs, savePrefs } from '@/lib/prefs';
import { normalizeSite, siteMatches } from '@/lib/sites';

const t = browser.i18n.getMessage;

type View = { kind: 'loading' } | { kind: 'unavailable' } | ({ kind: 'site' } & SiteInfoResponse);

async function activeTabId(): Promise<number | undefined> {
  // `?tab=` lets tests point the popup at a specific tab; it only asks that tab's content script.
  const fromQuery = Number(new URLSearchParams(location.search).get('tab'));
  if (fromQuery) return fromQuery;
  return (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
}

export function App() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [shortcut, setShortcut] = useState('');

  useEffect(() => {
    void (async () => {
      const tabId = await activeTabId();
      // Browser pages and stores have no content script: the message fails there.
      const info =
        tabId === undefined
          ? undefined
          : ((await browser.tabs
              .sendMessage(tabId, { type: 'corretto/site-info' } satisfies SiteInfoRequest)
              .catch(() => undefined)) as SiteInfoResponse | undefined);
      setView(info ? { kind: 'site', ...info } : { kind: 'unavailable' });
    })();
    void browser.commands.getAll().then((commands) => setShortcut(commands.find((c) => c.name === 'rewrite')?.shortcut ?? ''));
  }, []);

  const toggle = async (on: boolean) => {
    if (view.kind !== 'site') return;
    const prefs = await loadPrefs();
    const host = normalizeSite(view.host);
    // Turning on removes every entry that covers this site, e.g. a parent domain added in settings.
    const others = prefs.disabledSites.filter((pattern) => !siteMatches(host, pattern));
    await savePrefs({ ...prefs, disabledSites: on ? others : [...others, host] });
    setView({ ...view, state: on ? 'on' : 'disabled' });
  };

  return (
    <>
      <h1>{t('extName')}</h1>
      {view.kind === 'unavailable' && <p class="muted">{t('popup_unavailable')}</p>}
      {view.kind === 'site' && (
        <>
          <p class="host">{view.host}</p>
          {view.state === 'sensitive' ? (
            <p class="muted">{t('popup_sensitive')}</p>
          ) : (
            <label class="switch">
              <input type="checkbox" checked={view.state === 'on'} onChange={(e) => void toggle(e.currentTarget.checked)} />
              {t('popup_onForSite')}
            </label>
          )}
        </>
      )}
      {shortcut && <p class="muted">{t('popup_shortcut', [shortcut])}</p>}
      <div class="footer">
        <button type="button" class="link" onClick={() => void browser.runtime.openOptionsPage()}>
          {t('popup_settings')}
        </button>
      </div>
    </>
  );
}
