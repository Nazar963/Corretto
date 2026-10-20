import { describe, expect, it } from 'vitest';
import { DEFAULT_SENSITIVE_SITES, normalizeSite, parseSiteList, siteMatches, siteState } from '@/lib/sites';

describe('normalizeSite', () => {
  it.each([
    ['Mail.Google.com', 'mail.google.com'],
    ['https://www.paypal.com/signin?x=1', 'www.paypal.com'],
    ['*.example.org', 'example.org'],
    ['localhost:3000', 'localhost'],
    ['  .bank. ', 'bank'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeSite(input)).toBe(expected);
  });
});

describe('siteMatches', () => {
  it('matches the domain and its subdomains', () => {
    expect(siteMatches('paypal.com', 'paypal.com')).toBe(true);
    expect(siteMatches('www.paypal.com', 'paypal.com')).toBe(true);
    expect(siteMatches('notpaypal.com', 'paypal.com')).toBe(false);
    expect(siteMatches('paypal.com.evil.io', 'paypal.com')).toBe(false);
  });

  it('matches a whole top-level domain from a bare suffix', () => {
    expect(siteMatches('online.example.bank', 'bank')).toBe(true);
    expect(siteMatches('bank.example.com', 'bank')).toBe(false);
  });

  it('never matches an empty pattern', () => {
    expect(siteMatches('example.com', '  ')).toBe(false);
  });
});

describe('siteState', () => {
  const prefs = { disabledSites: ['github.com'], sensitiveSites: ['paypal.com'] };

  it('reports sensitive before disabled, and on otherwise', () => {
    expect(siteState(['www.paypal.com'], prefs)).toBe('sensitive');
    expect(siteState(['gist.github.com'], prefs)).toBe('disabled');
    expect(siteState(['example.com'], prefs)).toBe('on');
  });

  it('turns an iframe off when the top-level site matches', () => {
    expect(siteState(['widget.example.net', 'www.paypal.com'], prefs)).toBe('sensitive');
  });
});

describe('parseSiteList', () => {
  it('splits, normalizes, de-duplicates and drops blanks', () => {
    expect(parseSiteList('PayPal.com\n\n https://paypal.com/x \n*.bank, example.org')).toEqual(['paypal.com', 'bank', 'example.org']);
  });
});

describe('default sensitive list', () => {
  it('holds only normalized, unique entries', () => {
    expect(parseSiteList(DEFAULT_SENSITIVE_SITES.join('\n'))).toEqual([...DEFAULT_SENSITIVE_SITES]);
  });
});
