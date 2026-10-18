import { defineConfig } from 'wxt';

// See docs/adr/0001-wxt-framework.md and docs/adr/0007-permissions.md.
export default defineConfig({
  manifestVersion: 3,
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage'],
    browser_specific_settings: {
      gecko: {
        // Placeholder add-on ID; must stay stable once published on AMO.
        id: 'corretto@corretto.extension',
        strict_min_version: '128.0',
      },
    },
  },
});
