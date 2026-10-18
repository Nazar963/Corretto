import { describe, expect, it } from 'vitest';
import messages from '../../public/_locales/en/messages.json';

describe('en locale', () => {
  it('defines every message the manifest references', () => {
    expect(messages.extName.message).toBe('Corretto');
    expect(messages.extDescription.message.length).toBeGreaterThan(0);
  });
});
