// Site matching for the per-site off switch and the sensitive-site list (FR-012, FR-013,
// docs/adr/0009-sensitive-fields.md).

/**
 * Domains where the button never appears by default: banking, payments, health records and
 * government identity. Deliberately short and known to be incomplete (accepted by the user);
 * users can edit it in settings. A pattern matches the domain and all its subdomains;
 * a bare suffix such as "bank" matches a whole top-level domain.
 */
export const DEFAULT_SENSITIVE_SITES: readonly string[] = [
  // Payments and banking
  'bank',
  'paypal.com',
  'stripe.com',
  'wise.com',
  'revolut.com',
  'n26.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'hsbc.com',
  'barclays.co.uk',
  'ing.com',
  'santander.com',
  'bnpparibas.com',
  'unicredit.it',
  'intesasanpaolo.com',
  'deutsche-bank.de',
  'commerzbank.de',
  'sparkasse.de',
  'credit-agricole.fr',
  'societegenerale.fr',
  'bbva.com',
  'caixabank.es',
  'poste.it',
  // Health records
  'mychart.org',
  'healthcare.gov',
  'nhs.uk',
  'doctolib.fr',
  'doctolib.de',
  'doctolib.it',
  'ameli.fr',
  // Government identity and tax
  'login.gov',
  'id.me',
  'irs.gov',
  'gov.uk',
  'agenziaentrate.gov.it',
  'impots.gouv.fr',
  'elster.de',
];

/** Lowercase hostname or pattern without scheme, port, path, leading "*." or trailing dot. */
export function normalizeSite(input: string): string {
  let site = input.trim().toLowerCase();
  site = site.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '');
  return site.replace(/^\*\./, '').replace(/^\.+|\.+$/g, '');
}

/** Whether `host` is `pattern` or a subdomain of it. */
export function siteMatches(host: string, pattern: string): boolean {
  const h = normalizeSite(host);
  const p = normalizeSite(pattern);
  return p !== '' && (h === p || h.endsWith(`.${p}`));
}

export type SiteState = 'on' | 'disabled' | 'sensitive';

export function siteState(hosts: string[], prefs: { disabledSites: string[]; sensitiveSites: string[] }): SiteState {
  const any = (patterns: string[]) => hosts.some((host) => patterns.some((pattern) => siteMatches(host, pattern)));
  if (any(prefs.sensitiveSites)) return 'sensitive';
  if (any(prefs.disabledSites)) return 'disabled';
  return 'on';
}

/** Parse the settings textarea: one site per line, normalized, de-duplicated, blanks dropped. */
export function parseSiteList(text: string): string[] {
  return [...new Set(text.split(/[\n,]/).map(normalizeSite).filter(Boolean))];
}
