import { useState } from 'preact/hooks';
import { ProviderForm } from '@/components/ProviderForm';
import { findPreset, type ProviderPreset } from '@/lib/providers/presets';

const t = browser.i18n.getMessage;
type Key = Parameters<typeof t>[0];

/** Order and grouping of the first step. Custom endpoints are left to the settings page. */
const GROUPS: { title: Key; ids: string[] }[] = [
  { title: 'guide_groupFree', ids: ['gemini', 'groq', 'mistral', 'openrouter'] },
  { title: 'guide_groupLocal', ids: ['ollama', 'lmstudio'] },
  { title: 'guide_groupPaid', ids: ['anthropic', 'openai'] },
];
/** Verified end to end with a real key (docs/features/provider-settings.md). */
const RECOMMENDED = 'gemini';

const appName = (preset: ProviderPreset) => preset.name.replace(/ \(.*\)$/, '');

function Instructions({ preset }: { preset: ProviderPreset }) {
  const name = appName(preset);
  const link = (
    <a href={preset.keyUrl} target="_blank" rel="noreferrer">
      {preset.local ? t('options_download', [name]) : t('guide_openSite', [name])}
    </a>
  );
  if (preset.id === 'ollama') {
    return (
      <ol class="steps">
        <li>{link}</li>
        <li>
          {t('guide_ollamaPull')} <code>ollama pull llama3.2</code>
        </li>
        <li>{t('guide_ollamaRun')}</li>
        <li>
          {t('guide_ollamaOrigins')} <code>OLLAMA_ORIGINS=chrome-extension://*,moz-extension://*</code>
        </li>
      </ol>
    );
  }
  if (preset.id === 'lmstudio') {
    return (
      <ol class="steps">
        <li>{link}</li>
        <li>{t('guide_lmstudioModel')}</li>
        <li>{t('guide_lmstudioServer')}</li>
      </ol>
    );
  }
  return (
    <ol class="steps">
      <li>
        {link} — {preset.free ? t('guide_signInFree') : t('guide_signInPaid')}
      </li>
      <li>{t('guide_createKey')}</li>
      <li>{t('guide_keepPrivate')}</li>
    </ol>
  );
}

function privacyNote(preset: ProviderPreset): string {
  if (preset.local) return t('guide_privacyLocal');
  return preset.free ? t('guide_privacyFree', [appName(preset)]) : t('guide_privacyPaid', [appName(preset)]);
}

/** First-run guide (FR-014): choose a provider, get a key or start a server, test, done. */
export function App() {
  const [step, setStep] = useState(1);
  const [providerId, setProviderId] = useState(RECOMMENDED);
  const preset = findPreset(providerId)!;

  return (
    <>
      <p class="progress">{t('guide_progress', [String(step), '4'])}</p>

      {step === 1 && (
        <section class="card" aria-labelledby="step-heading">
          <h1 id="step-heading">{t('guide_welcomeHeading')}</h1>
          <p>{t('guide_welcomeLead')}</p>
          <fieldset>
            <legend>{t('guide_chooseProvider')}</legend>
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p class="group-title">{t(group.title)}</p>
                <div class="choices">
                  {group.ids.map((id) => {
                    const p = findPreset(id)!;
                    return (
                      <label class="choice" key={id}>
                        <input
                          type="radio"
                          name="provider"
                          value={id}
                          checked={providerId === id}
                          onChange={() => setProviderId(id)}
                        />
                        <span>
                          <strong>
                            {appName(p)}
                            {id === RECOMMENDED && <span class="badge">{t('guide_recommended')}</span>}
                          </strong>
                          <span class="hint">{t(`guide_about_${id}` as Key)}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </fieldset>
          <div class="nav">
            <button type="button" class="primary" onClick={() => setStep(2)}>
              {t('guide_continue')}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section class="card" aria-labelledby="step-heading">
          <h1 id="step-heading">{preset.local ? t('guide_setUpHeading', [appName(preset)]) : t('guide_keyHeading', [appName(preset)])}</h1>
          <Instructions preset={preset} />
          <p class="note">{privacyNote(preset)}</p>
          <div class="nav">
            <button type="button" onClick={() => setStep(1)}>
              {t('guide_back')}
            </button>
            <button type="button" class="primary" onClick={() => setStep(3)}>
              {t('guide_continue')}
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <>
          <ProviderForm mode="guide" providerId={providerId} onDone={() => setStep(4)} />
          <div class="nav" style={{ marginTop: '12px' }}>
            <button type="button" onClick={() => setStep(2)}>
              {t('guide_back')}
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <section class="card" aria-labelledby="step-heading">
          <h1 id="step-heading">{t('guide_readyHeading')}</h1>
          <ul class="tips">
            <li>{t('guide_tipButton')}</li>
            <li>{t('guide_tipSelection')}</li>
            <li>{t('guide_tipShortcut')}</li>
            <li>{t('guide_tipToolbar')}</li>
            <li>{t('guide_tipUndo')}</li>
          </ul>
          <div class="nav">
            <button type="button" class="primary" onClick={() => window.close()}>
              {t('guide_finish')}
            </button>
            <button type="button" onClick={() => void browser.runtime.openOptionsPage()}>
              {t('popup_settings')}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
