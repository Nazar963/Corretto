import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { defaultPrefs, loadPrefs, sanitizePrefs, savePrefs, watchPrefs } from '@/lib/prefs';
import { DEFAULT_SENSITIVE_SITES } from '@/lib/sites';

describe('prefs', () => {
  beforeEach(() => fakeBrowser.reset());

  it('defaults to 3 words / 15 characters, no disabled sites and the default sensitive list', async () => {
    expect(await loadPrefs()).toEqual({
      minWords: 3,
      minChars: 15,
      disabledSites: [],
      sensitiveSites: [...DEFAULT_SENSITIVE_SITES],
    });
  });

  it('round-trips, separately from provider settings', async () => {
    const prefs = { ...defaultPrefs(), minWords: 6, disabledSites: ['github.com'] };
    await savePrefs(prefs);
    expect(await loadPrefs()).toEqual(prefs);
    expect(Object.keys(await fakeBrowser.storage.local.get(null))).toEqual(['prefs']);
  });

  it('repairs damaged values', () => {
    expect(sanitizePrefs({ minWords: -2, minChars: 'x' as unknown as number, disabledSites: [1, 'a.com'] as unknown as string[] })).toEqual({
      minWords: 3,
      minChars: 15,
      disabledSites: ['a.com'],
      sensitiveSites: [...DEFAULT_SENSITIVE_SITES],
    });
  });

  it('keeps an emptied sensitive list empty', async () => {
    await savePrefs({ ...defaultPrefs(), sensitiveSites: [] });
    expect((await loadPrefs()).sensitiveSites).toEqual([]);
  });

  it('notifies watchers of changes', async () => {
    const onChange = vi.fn();
    const stop = watchPrefs(onChange);
    await savePrefs({ ...defaultPrefs(), minWords: 9 });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minWords: 9 }));
    stop();
  });
});
