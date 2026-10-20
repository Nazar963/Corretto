import { useEffect, useState } from 'preact/hooks';
import type { ListModelsRequest, ListModelsResponse, RewriteResponse, TestConnectionRequest } from '@/lib/messages';
import { findPreset, PRESETS } from '@/lib/providers/presets';
import { loadSettings, originPattern, resolveProvider, saveSettings, type Settings } from '@/lib/settings';

const t = browser.i18n.getMessage;

type Status = { kind: 'ok' | 'err'; text: string; detail?: string } | null;

/**
 * Ask for the provider's host permission. Must run before any other await so the
 * click still counts as a user gesture (docs/adr/0007-permissions.md).
 */
function requestPermission(settings: Settings): Promise<boolean> {
  // A model is not needed to know which host to ask for.
  const provider = resolveProvider({ ...settings, model: settings.model || 'unused' });
  const pattern = provider && originPattern(provider.baseUrl);
  if (!pattern) return Promise.resolve(false);
  return browser.permissions.request({ origins: [pattern] });
}

export interface ProviderFormProps {
  /**
   * `settings`: Save and Test connection are separate (options page).
   * `guide`: one "Test and save" button; saves only after a successful test (FR-014).
   */
  mode: 'settings' | 'guide';
  /** Guide mode: the provider picked in the previous step; the select is hidden. */
  providerId?: string;
  /** Guide mode: called after a successful test has been saved. */
  onDone?: () => void;
}

/** Provider, server address, key and model, with permission, test and model listing (FR-011). */
export function ProviderForm({ mode, providerId, onDone }: ProviderFormProps) {
  const guide = mode === 'guide';
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [models, setModels] = useState<string[]>([]);

  useEffect(() => {
    void loadSettings().then((stored) => {
      if (!providerId || stored.providerId === providerId) {
        setSettings(stored);
        return;
      }
      // A different provider than the stored one: start from its defaults, keep nothing else.
      setSettings({ providerId, apiKey: '', model: findPreset(providerId)?.defaultModel ?? '', baseUrl: '' });
    });
  }, []);

  if (!settings) return null;
  const preset = findPreset(settings.providerId) ?? PRESETS[0]!;
  /** "Ollama (on this computer)" -> "Ollama", for sentences that already say where it runs. */
  const appName = preset.name.replace(/ \(.*\)$/, '');

  const update = (patch: Partial<Settings>) => {
    setSettings({ ...settings, ...patch });
    setStatus(null);
  };

  const onProviderChange = (providerId: string) => {
    const next = findPreset(providerId);
    // Switch to the new preset's suggested model unless the user typed their own.
    const keepModel = settings.model !== '' && settings.model !== preset.defaultModel;
    // A server address typed for one provider never applies to another.
    update({ providerId, model: keepModel ? settings.model : (next?.defaultModel ?? ''), baseUrl: '' });
    setModels([]);
  };

  const incomplete = !resolveProvider(settings);
  const noServer = !resolveProvider({ ...settings, model: settings.model || 'unused' });

  const showError = (error: { code: string; detail?: string }) =>
    setStatus({ kind: 'err', text: t(`error_${error.code}` as Parameters<typeof t>[0]), detail: error.detail });

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
      if (response.ok && guide) {
        await saveSettings(settings);
        setStatus({ kind: 'ok', text: t('options_testOk') });
        onDone?.();
      } else if (response.ok) setStatus({ kind: 'ok', text: t('options_testOk') });
      else if (response.error.code !== 'cancelled') showError(response.error);
    } finally {
      setBusy(false);
    }
  };

  const onTestAndSave = (event: Event) => {
    event.preventDefault();
    void onTest();
  };

  const onShowModels = async () => {
    const granted = requestPermission(settings);
    setBusy(true);
    setStatus({ kind: 'ok', text: t('options_loadingModels') });
    try {
      if (!(await granted)) {
        setStatus({ kind: 'err', text: t('options_permissionDenied') });
        return;
      }
      const response = (await browser.runtime.sendMessage({
        type: 'corretto/list-models',
        settings,
      } satisfies ListModelsRequest)) as ListModelsResponse;
      if (!response.ok) {
        showError(response.error);
        return;
      }
      setModels(response.models);
      setStatus(
        response.models.length > 0
          ? { kind: 'ok', text: t('options_modelsFound', [String(response.models.length)]) }
          : { kind: 'err', text: t('options_noModels') },
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <form onSubmit={guide ? onTestAndSave : onSave} aria-labelledby="provider-heading">
        <h2 id="provider-heading">{guide ? t('guide_connectHeading', [preset.name]) : t('options_providerHeading')}</h2>
        {!guide && (
          <label>
            {t('options_provider')}
            <select value={settings.providerId} onChange={(e) => onProviderChange(e.currentTarget.value)}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.free && !p.local ? `${p.name} — ${t('options_freeTier')}` : p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {preset.local && <p class="hint">{t('options_localHint', [appName])}</p>}

        {preset.editableBaseUrl && (
          <label>
            {t('options_baseUrl')}
            <span class="hint">{t('options_baseUrlHint')}</span>
            <input
              type="url"
              value={settings.baseUrl}
              placeholder={preset.baseUrl || 'https://example.com/v1'}
              onInput={(e) => update({ baseUrl: e.currentTarget.value })}
            />
          </label>
        )}

        <label>
          {t('options_apiKey')}
          {preset.local ? (
            <span class="hint">
              {t('options_keyOptional')}{' '}
              <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                {t('options_download', [appName])}
              </a>
            </span>
          ) : (
            preset.keyUrl && (
              <span class="hint">
                <a href={preset.keyUrl} target="_blank" rel="noreferrer">
                  {t('options_getKey', [preset.name])}
                </a>
              </span>
            )
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
          <span class="key">
            <input
              type="text"
              list="model-options"
              value={settings.model}
              placeholder={preset.defaultModel}
              spellcheck={false}
              onInput={(e) => update({ model: e.currentTarget.value })}
            />
            <button type="button" disabled={busy || noServer} onClick={onShowModels}>
              {t('options_showModels')}
            </button>
          </span>
          <datalist id="model-options">
            {models.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </label>

        <div class="actions">
          {guide ? (
            <button type="submit" class="primary" disabled={busy || incomplete}>
              {t('guide_testAndSave')}
            </button>
          ) : (
            <>
              <button type="submit" class="primary" disabled={busy || incomplete}>
                {t('options_save')}
              </button>
              <button type="button" disabled={busy || incomplete} onClick={onTest}>
                {t('options_test')}
              </button>
            </>
          )}
        </div>
        <p class={`status ${status?.kind ?? ''}`} role="status">
          {status?.text}
          {status?.detail && <span class="detail">{t('options_providerSaid', [status.detail])}</span>}
        </p>
      </form>
    </>
  );
}
