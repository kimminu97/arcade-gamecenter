---
name: security-audit
description: Defensive, evidence-based security review. Safe project-specific guide adapted from cloudflare/security-audit-skill.
---
# Security audit guidance
Default to focused, read-only inspection. Check Socket.IO event authentication, Host privileges, player identity derivation from authenticated sockets, secret role and vote projections, replay/deduplication, input validation, chat privacy and persistent data boundaries. Report each issue with file evidence, attacker, affected boundary, impact and smallest fix. Do not claim a finding without proof. Do NOT execute scripts, fuzzers, browser tests, or a full audit without explicit authorization and a properly network-isolated, resource-limited sandbox. Upstream full suite: https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit . This lite guidance deliberately omits full-audit subagent orchestration and report validators.
