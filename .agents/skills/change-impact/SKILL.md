---
name: change-impact
description: Investigate impact radius before cross-module, API, database or authorization changes. Adapted from affaan-m/ECC.
---
# Change impact
Read-only analysis first: identify affected entry points, callers, Socket.IO events, shared types, state transitions, database access, tests and docs. Classify impact as verified vs uncertain. Plan changes, tests and rollback; compare plan to final diff. No external calls or edits without task authorization. Upstream: https://github.com/affaan-m/ECC/tree/main/.agents/skills/change-impact
