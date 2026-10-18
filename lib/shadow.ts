/**
 * Shipped builds use closed shadow roots (docs/adr/0006-ui-isolation.md).
 * The `e2e` build mode opens them so Playwright can inspect the UI.
 * (`import.meta.env` is undefined when Playwright's Node runtime imports lib constants.)
 */
export const SHADOW_MODE: ShadowRootMode = import.meta.env?.MODE === 'e2e' ? 'open' : 'closed';
