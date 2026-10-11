/**
 * THE VARIABLE RULE, in a real browser against the real server
 * (`pnpm test:variable-rule:browser`).
 *
 * DELIBERATELY NOT `playwright.config.ts` — same reasoning as the kind-sandbox gate: one gate for
 * one boundary, run by name. It needs a RUNNING APP (`pnpm preview:start`, port 3001, the live
 * database, signed in as admin@admin.com) and does not start one — a second dev server in a shared
 * checkout fights the first. It drives the page on this session's OWN host
 * (`variable-rule-gate.localhost:3001`) so its cookie jar is never another agent's; name another with
 * `MATRX_VARIABLE_RULE_BASE_URL=http://<label>.localhost:3001`.
 *
 * Needs `AI_ADMIN_USERNAME` / `AI_ADMIN_PASSWORD` in `.env.local` (never printed). The server half of
 * the same rule is aidream's `tests/test_the_variable_rule_reaches_the_model_live.py`; this file proves
 * the half only a browser can: what the editor shows, and that the UI's own run reaches the model
 * byte-exact.
 */
import { defineConfig, devices } from "@playwright/test";

import { agentTrafficStorageState } from "../../scripts/lib/agent-traffic.mjs";

const baseURL =
  process.env.MATRX_VARIABLE_RULE_BASE_URL ??
  "http://variable-rule-gate.localhost:3001";

export default defineConfig({
  testDir: "../../features/agents/components/variables-management/__tests__/browser",
  outputDir: "../../.cache/playwright/variable-rule",
  testMatch: /.*\.spec\.ts$/,
  // One serial story on one agent; retries would only hide a flaky boundary.
  retries: 0,
  workers: 1,
  // The shared preview compiles each route on first use (minutes under load) and a real turn is paid.
  timeout: 15 * 60_000,
  expect: { timeout: 120_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    // Our agent traffic, said by cookie (scripts/lib/agent-traffic.mjs).
    storageState: agentTrafficStorageState("variable-rule-gate", baseURL),
    ...devices["Desktop Chrome"],
    viewport: { width: 1600, height: 1000 },
    screenshot: "only-on-failure",
    actionTimeout: 120_000,
    navigationTimeout: 240_000,
  },
});
