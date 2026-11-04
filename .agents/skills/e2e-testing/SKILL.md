---
name: e2e-testing
description: Existing Playwright test patterns adapted from affaan-m/ECC.
---
# E2E testing
Reuse `playwright.config.ts` and `e2e/` rather than moving tests to examples' paths. Cover independent Host and mobile sessions, permissions, reconnection, timer expiry, simultaneous actions and secret-data isolation. Prefer locator auto-waiting and deterministic fixtures over arbitrary delays. Report skipped browser checks where unavailable. Upstream: https://github.com/affaan-m/ECC/tree/main/.agents/skills/e2e-testing
