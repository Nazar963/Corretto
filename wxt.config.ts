import { defineConfig } from 'wxt';

// See docs/adr/0001-wxt-framework.md and docs/adr/0007-permissions.md.
export default defineConfig({
  manifestVersion: 3,
  // Preact JSX for extension pages (docs/adr/0006-ui-isolation.md).
  vite: () => ({
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  }),
  manifest: ({ mode }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    // FR-010: changeable by the user in the browser's shortcut settings.
    commands: {
      rewrite: {
        suggested_key: { default: 'Alt+Shift+C' },
        description: '__MSG_commandRewrite__',
      },
    },
    // Requested at runtime for the provider the user picks; no install-time warning.
    optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    // The e2e build talks to a local mock provider without a permission prompt.
    ...(mode === 'e2e' ? { host_permissions: ['http://127.0.0.1/*'] } : {}),
    browser_specific_settings: {
      gecko: {
        // Placeholder add-on ID; must stay stable once published on AMO.
        id: 'corretto@corretto.extension',
        strict_min_version: '128.0',
      },
    },
  }),
});
