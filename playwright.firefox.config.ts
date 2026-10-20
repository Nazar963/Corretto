import { defineConfig } from '@playwright/test';

// Firefox smoke tests: Playwright runs the tests, geckodriver drives Firefox (tests/firefox/webdriver.ts).
export default defineConfig({
  testDir: 'tests/firefox',
  timeout: 120_000,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
});
