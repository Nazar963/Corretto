// Hostnames that decide whether Corretto is on in this frame: the frame's own host and,
// in an iframe, the top-level site the user is visiting where the browser exposes it.

export function frameHosts(): string[] {
  const hosts = [location.hostname];
  if (window === window.top) return hosts;
  try {
    // Same-origin parent.
    hosts.push(window.top!.location.hostname);
  } catch {
    // Cross-origin parent: Chromium exposes ancestor origins; Firefox does not.
    const ancestors = (location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
    const top = ancestors?.length ? ancestors[ancestors.length - 1] : null;
    if (top) {
      try {
        hosts.push(new URL(top).hostname);
      } catch {
        // Opaque origin ("null"): nothing to add.
      }
    }
  }
  return hosts.filter(Boolean);
}

/** The focused element, following focus into open shadow roots. */
export function deepActiveElement(): Element | null {
  let element = document.activeElement;
  while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
  return element;
}
