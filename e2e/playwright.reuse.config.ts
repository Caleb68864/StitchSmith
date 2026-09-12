/**
 * Same suite, but reuse a preview server already running on 4173 (start one
 * with `npx vite preview --port 4173 --strictPort` after `vite build`). For
 * runs where the base config's `npm run build` cannot be used — e.g. when an
 * unrelated tsc error elsewhere in the tree blocks the build step.
 */
import { defineConfig } from '@playwright/test';
import base from '../playwright.config.js';

export default defineConfig({
  ...base,
  testDir: '.',
  // 127.0.0.1, not localhost: the reachability probe otherwise tries ::1, misses the IPv4 preview and tries to start a second server on the busy port.
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173' },
  webServer: { ...base.webServer!, url: 'http://127.0.0.1:4173', command: 'npx vite preview --port 4173 --strictPort', reuseExistingServer: true },
});
