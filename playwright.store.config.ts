import { defineConfig } from '@playwright/test';

// Store screenshots: `npm run screenshots` writes store/screenshots/*.png (1280x800).
export default defineConfig({
  testDir: 'scripts',
  testMatch: 'store-screenshots.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
});
