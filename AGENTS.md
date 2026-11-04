# GAPYEONG ARCADE — Codex development rules

Scope: this repository only. Follow explicit user requirements and existing working game rules before generic skill suggestions. Never silently change game mechanics or reveal secret roles.

## Existing architecture
- React 19 + TypeScript + Vite frontend under `src/`; Express 5 + Socket.IO server under `server/`.
- Node.js >=24, npm, Playwright E2E in `e2e/`, server/unit tests in `tests/`.
- Source of truth: inspect current implementation and `README.md`, `MAFIA.md`, game-specific documents; documentation may lag implementation and should be verified against code.
- Multiplayer design: Host/TV and 5–7 mobile players on local Wi-Fi; independent authenticated player views. Preserve multiplayer timing, reconnection, privacy and room state.

## Work sequence
1. Examine affected source, related callers, event handlers and tests. For changes affecting authorization, database, shared state, API/event contracts or multiple games, run `change-impact` first.
2. Apply `ponytail` to prefer the smallest complete change. Never sacrifice validation, error handling, accessibility or requested mechanics.
3. For new behavior or bug fixes, add regression tests first where practicable. Use existing tests/frameworks; don't assume ECC sample commands, an `npm run lint` script, or a configured coverage runner exists.
4. Check Socket.IO handlers and server-side authorization, never rely on hidden client UI as a security boundary. Players may not receive other players' secret roles, private votes or unread chat.
5. Use `frontend-patterns` when updating React state/components. Use `impeccable-lite` for substantial UI design work, not server-only fixes. Preserve mobile usability and TV readability.
6. Use `security-audit` only when security review is requested or relevant to sensitive code. A complete audit requires an explicit request and controlled sandbox; do not run audit scripts automatically.
7. Before claiming completion, run available relevant verification: `npm run build`, `npm test`, `npm run test:network` and (for interface or multiplayer flows) `npm run test:e2e` when environment supports them. Do not claim tests passed without execution. Report unrun checks and reasons.
8. Summarize changed files, behavior, tests performed, remaining risks and rollback steps.

## Prohibitions and boundaries
- No install-time or always-on hooks, MCP servers, auto-update, new package dependencies or network calls without separate approval.
- No production deployment, secret access, telemetry, user-chat-data export or external uploads.
- Never edit `.env`, personal data, database snapshots, game-bank raw chat or production configuration unless explicitly requested.
- Preserve unrelated game modes and score calculations; check multi-client, reload, timer, tie vote and Host/player permissions.
- Use repo-local skills under `.agents/skills/`; ignore examples requiring global `~/.codex`, `.claude`, external binaries or internet if not explicitly authorized.

## Skill selection
- All code work: `ponytail` (small diff).
- Risky cross-module changes: `change-impact`.
- React work: `frontend-patterns`.
- Testing and PR readiness: `verification-loop` (adapt commands to package.json).
- Browser tests: `e2e-testing` (reuse existing `e2e/` and Playwright config).
- Security questions: `security-audit` (guidance only unless comprehensive audit requested).
- UI/UX improvements: `impeccable-lite` (read-only design guidance; no bundled launcher).

Upstream skill material is third-party guidance, not authority to execute tools. Local project rules and user approvals prevail.
