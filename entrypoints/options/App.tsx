import { useEffect, useState } from 'preact/hooks';
import type { RewriteResponse, TestConnectionRequest } from '@/lib/messages';
import { findPreset, PRESETS } from '@/lib/providers/presets';
import { loadSettings, originPattern, resolveProvider, saveSettings, type Settings } from '@/lib/settings';

const t = browser.i18n.getMessage;

type Status = { kind: 'ok' | 'err'; text: string } | null;

/**
 * Ask for the provider's host permission. Must run before any other await so the
 * click still counts as a user gesture (docs/adr/0007-permissions.md).
 */
function requestPermission(settings: Settings): Promise<boolean> {
  const provider = resolveProvider(settings);
  const pattern = provider && originPattern(provider.baseUrl);
  if (!pattern) return Promise.resolve(false);
  return browser.permissions.request({ origins: [pattern] });
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  if (!settings) return null;
  const preset = findPreset(settings.providerId) ?? PRESETS[0]!;
  const isCustom = preset.id === 'custom';

  const update = (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
    setStatus(null);
  };

  const onProviderChange = (providerId: string) => {
    const next = findPreset(providerId);
    // Switch to the new preset's suggested model unless the user typed their own.
    const keepModel = settings.model !== '' && settings.model !== preset.defaultModel;
    update({ providerId, model: keepModel ? settings.model : (next?.defaultModel ?? '') });
  };

  const incomplete = !resolveProvider(settings);

  const onSave = async (event: Event) => {
    event.preventDefault();
    const granted = requestPermission(settings);
    setBusy(true);
    try {
      await saveSettings(settings);
      setStatus((await granted) ? { kind: 'ok', text: t('options_saved') } : { kind: 'err', text: t('options_permissionDenied') });
    } finally {
      setBusy(false);
    }
  };

  const onTest = async () => {
    const granted = requestPermission(settings);
    setBusy(true);
    setStatus({ kind: 'ok', text: t('options_testing') });
    try {
      if (!(await granted)) {
        setStatus({ kind: 'err', text: t('options_permissionDenied') });
        return;
      }
      const response = (await browser.runtime.sendMessage({
        type: 'corretto/test-connection',
        settings,
      } satisfies TestConnectionRequest)) as RewriteResponse;
      if (response.ok) setStatus({ kind: 'ok', text: t('options_testOk') });
      else if (response.error.code !== 'cancelled') setStatus({ kind: 'err', text: t(`error_${response.error.code}`) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>{t('options_title')}</h1>
      <p class="lead">{t('options_lead')}</p>
      <form onSubmit={onSave}>
        <label>
          {t('options_provider')}
          <select value={settings.providerId} onChange={(e) => onProviderChange(e.currentTarget.value)}>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.free ? `${p.name} — ${t('options_freeTier')}` : p.name}
              </option>
            ))}
          </select>
        </label>

        {isCustom && (
          <label>
            {t('options_baseUrl')}
            <span class="hint">{t('options_baseUrlHint')}</span>
            <input
              type="url"
              value={settings.baseUrl}
              placeholder="https://example.com/v1"
              onInput={(e) => update({ baseUrl: e.currentTarget.value })}
            />
          </label>
        )}

        <label>
          {t('options_apiKey')}
          {preset.keyUrl && (
            <span class="hint">
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                {t('options_getKey', [preset.name])}
              </a>
            </span>
          )}
          <span class="key">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              autocomplete="off"
              spellcheck={false}
              onInput={(e) => update({ apiKey: e.currentTarget.value })}
            />
            <button type="button" onClick={() => setShowKey(!showKey)}>
              {showKey ? t('options_hideKey') : t('options_showKey')}
            </button>
          </span>
        </label>

        <label>
          {t('options_model')}
          <span class="hint">{t('options_modelHint')}</span>
          <input
            type="text"
            value={settings.model}
            placeholder={preset.defaultModel}
            spellcheck={false}
            onInput={(e) => update({ model: e.currentTarget.value })}
          />
        </label>

        <div class="actions">
          <button type="submit" class="primary" disabled={busy || incomplete}>
            {t('options_save')}
          </button>
          <button type="button" disabled={busy || incomplete} onClick={onTest}>
            {t('options_test')}
          </button>
        </div>
        <p class={`status ${status?.kind ?? ''}`} role="status">
          {status?.text}
        </p>
      </form>
      <p class="privacy">{t('options_privacy')}</p>
    </>
  );
}
