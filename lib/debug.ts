/**
 * Diagnostic logging for `npm run build:debug` (WXT mode "debug"), used to find out how a real
 * site's editor reacts to a replacement. Compiled out of every other build. Logs editor text,
 * never settings or keys.
 */
export const debugLog: (...args: unknown[]) => void =
  import.meta.env?.MODE === 'debug' ? (...args) => console.info('[Corretto]', ...args) : () => {};
