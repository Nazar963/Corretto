import { defineConfig } from 'wxt';

// See docs/adr/0001-wxt-framework.md and docs/adr/0007-permissions.md.
export default defineConfig({
  manifestVersion: 3,
  // AMO reviewers need only what builds the add-on; project notes and store assets stay out.
  zip: {
    excludeSources: [
      'docs/**',
      'store/**',
      'site/**',
      'user-level/**',
      'CLAUDE.md',
      '.claude/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  // Preact JSX for extension pages (docs/adr/0006-ui-isolation.md).
  vite: () => ({
    oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  }),
  manifest: ({ mode }) => ({
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // Toolbar icon; the popup entrypoint adds default_popup to the same key.
    action: { default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png' } },
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
        // 140: first version with Firefox's built-in data consent screen (and the current ESR).
        strict_min_version: '140.0',
        // Text the user asks to rewrite (often an email or post) goes to the provider they chose.
        // Chosen by the user on 2026-10-20; see docs/features/release.md.
        data_collection_permissions: {
          required: ['websiteContent', 'personalCommunications'],
        },
      },
      // Mobile is out of scope; if Android is ever enabled, 142 is the first version with the consent key.
      gecko_android: { strict_min_version: '142.0' },
    },
  }),
});
