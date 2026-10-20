import { useEffect, useState } from 'preact/hooks';
import { loadPrefs, savePrefs, watchPrefs, type Prefs } from '@/lib/prefs';
import { DEFAULT_SENSITIVE_SITES, parseSiteList } from '@/lib/sites';

const t = browser.i18n.getMessage;

/** Minimum length (FR-002), sites turned off (FR-012), sensitive sites (FR-013), shortcut (FR-010). */
export function SitesSection() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [sensitiveText, setSensitiveText] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const show = (next: Prefs) => {
      setPrefs(next);
      setSensitiveText(next.sensitiveSites.join('\n'));
    };
    void loadPrefs().then(show);
    void browser.commands.getAll().then((commands) => setShortcut(commands.find((c) => c.name === 'rewrite')?.shortcut ?? ''));
    // The toolbar popup can change the list while this page is open.
    return watchPrefs((next) => setPrefs((current) => (current ? { ...current, disabledSites: next.disabledSites } : next)));
  }, []);

  if (!prefs) return null;

  const update = (patch: Partial<Prefs>) => {
    setPrefs({ ...prefs, ...patch });
    setSaved(false);
  };

  const onSave = async (event: Event) => {
    event.preventDefault();
    const next = { ...prefs, sensitiveSites: parseSiteList(sensitiveText) };
    await savePrefs(next);
    setSensitiveText(next.sensitiveSites.join('\n'));
    setPrefs(next);
    setSaved(true);
  };

  const count = (value: string, fallback: number) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) && n >= 1 ? n : fallback;
  };

  return (
    <form onSubmit={onSave} aria-labelledby="sites-heading">
      <h2 id="sites-heading">{t('options_sitesHeading')}</h2>

      <fieldset>
        <legend>{t('options_minimumLegend')}</legend>
        <span class="inline">
          <label>
            {t('options_minWords')}
            <input
              type="number"
              min={1}
              max={1000}
              value={prefs.minWords}
              onInput={(e) => update({ minWords: count(e.currentTarget.value, prefs.minWords) })}
            />
          </label>
          <label>
            {t('options_minChars')}
            <input
              type="number"
              min={1}
              max={1000}
              value={prefs.minChars}
              onInput={(e) => update({ minChars: count(e.currentTarget.value, prefs.minChars) })}
            />
          </label>
        </span>
        <span class="hint">{t('options_minimumHint')}</span>
      </fieldset>

      <div class="group">
        <h3>{t('options_disabledHeading')}</h3>
        {prefs.disabledSites.length === 0 ? (
          <p class="hint">{t('options_disabledEmpty')}</p>
        ) : (
          <ul class="sites">
            {prefs.disabledSites.map((site) => (
              <li key={site}>
                <span>{site}</span>
                <button
                  type="button"
                  aria-label={t('options_removeSite', [site])}
                  onClick={() => update({ disabledSites: prefs.disabledSites.filter((s) => s !== site) })}
                >
                  {t('options_remove')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label>
        {t('options_sensitiveHeading')}
        <span class="hint">{t('options_sensitiveHint')}</span>
        <textarea
          rows={8}
          spellcheck={false}
          value={sensitiveText}
          onInput={(e) => {
            setSensitiveText(e.currentTarget.value);
            setSaved(false);
          }}
        />
      </label>
      <div class="actions">
        <button
          type="button"
          onClick={() => {
            setSensitiveText(DEFAULT_SENSITIVE_SITES.join('\n'));
            setSaved(false);
          }}
        >
          {t('options_restoreDefaults')}
        </button>
      </div>

      <div class="group">
        <h3>{t('options_shortcutHeading')}</h3>
        <p class="hint">
          {shortcut ? t('options_shortcutCurrent', [shortcut]) : t('options_shortcutNone')} {t('options_shortcutChange')}
        </p>
      </div>

      <div class="actions">
        <button type="submit" class="primary">
          {t('options_save')}
        </button>
      </div>
      <p class="status ok" role="status">
        {saved ? t('options_saved') : ''}
      </p>
    </form>
  );
}

