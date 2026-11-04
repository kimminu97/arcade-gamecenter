# Third-party Skill source attribution and scope

These are **project-specific shortened adaptations**, not copies of upstream full distributions. Refer to source repositories for license details and updates; do not imply official endorsement. The upstream authors' respective terms must be checked before redistributing beyond private development. No executable files, hooks, MCP configuration, dependencies or third-party binary launchers are included.

| Local Skill | Upstream | Source reviewed (Git tree SHA, 2026-11-04) |
|---|---|---|
| ponytail | https://github.com/DietrichGebert/ponytail | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` |
| change-impact, frontend-patterns, verification-loop, e2e-testing | https://github.com/affaan-m/ECC | `b38be6a7f6350964d59328b52f0624e1d1d552d1` |
| security-audit | https://github.com/cloudflare/security-audit-skill | `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` |
| impeccable-lite | https://github.com/pbakaus/impeccable | `f864521bbb1c9350e8f6cf7742c139a04a1020af` |

**Important**: the full Cloudflare Skill has strict execution sandbox requirements; do not run full audit tasks in a non-isolated environment. The upstream impeccable launcher can download a binary; no such executable is shipped here. Always obtain separate approval before external network access, package installation, or hooks.
