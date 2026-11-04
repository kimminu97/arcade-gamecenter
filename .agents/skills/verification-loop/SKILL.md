---
name: verification-loop
description: Verification steps before declaring work complete. Adapted from affaan-m/ECC.
---
# Verification loop
Inspect `package.json` rather than blindly using upstream commands. Here, `npm run build` performs TypeScript checking and Vite build; `npm test` runs project unit tests, `npm run test:network` checks multiplayer networking and `npm run test:e2e` runs existing Playwright tests. Use only necessary checks; report PASS / FAIL / NOT RUN with evidence and risks. No assumed lint/coverage scripts. Review `git diff --check`, `git diff --stat` and unrelated changes. Upstream: https://github.com/affaan-m/ECC/tree/main/.agents/skills/verification-loop
