# security — Security Practice

Eight vendored skills for securing application and agent code: threat modeling and hardening,
per-framework security rules, hardening for agent runtimes, static review of MCP configs,
a pre-install scanner for third-party skills, and two git guardrail hooks. Install the whole
thing or copy out the one you want.

```bash
claude plugin install security@skill-marketplace
```

## Skills

### Threat modeling and hardening

| Skill | Use it when |
|---|---|
| `security-and-hardening` | Building or auditing anything that takes untrusted input, manages sessions, stores personal data or calls third parties. Threat-models first (trust boundaries, STRIDE, abuse cases), then applies specific controls: SSRF and DNS rebinding, destructive operations on derived paths, shared-store rate limiting, install-script policy and audit triage, privacy and retention, OWASP LLM handling. Ships `references/hardening-patterns.md` (one implementation per rule) and `references/security-checklist.md` (sign-off checklist, package-manager matrix, OWASP quick references). |
| `security-threat-model` | You want a threat model of a repository or a path in it, not a checklist. Enumerates trust boundaries, assets, attacker capabilities and abuse paths with an evidence anchor per claim, asks you to confirm its assumptions, then writes `<repo>-threat-model.md` to a fixed output contract. |
| `security-best-practices` | Writing or reviewing code in a supported stack and you want the framework's own secure defaults, or a prioritised security report. Identifies the languages and frameworks in the project and loads the matching reference: Express, Next.js, React, Vue, jQuery, general JS frontend, Django, Flask, FastAPI, Go. About 400 KB of MUST/SHOULD rules with detection and fix guidance; the payload is the point. |

### Agent runtimes and supply chain

| Skill | Use it when |
|---|---|
| `agent-security-hardening` | Building or reviewing an agent runtime, tool gateway, memory service or multi-tenant agent deployment. Maps every `source -> parser -> validator -> side effect` boundary, gives containment code for identifiers, URLs and paths (including Windows reserved names), bounds temp data and tool output, and ends in a verification gate that wants evidence from the real entry point, not mocks. |
| `mcp-dependency-review` | Approving a new or changed `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` or similar. Static, never executes a server: classifies each npm, uvx, pipx and docker selector as SAFE, MEDIUM, HIGH or REVIEW with the option-boundary rules for each runner, and produces a bounded report that does not overclaim. |
| `skill-security-auditor` | You are about to install a skill from a source you do not control. A Python scanner over a skill directory or repo URL: code-execution, exfiltration, credential-harvesting and obfuscation patterns in scripts, prompt injection in `SKILL.md`, dependency supply chain, path escapes, binaries and symlinks. PASS, WARN or FAIL with a fix per finding; `references/threat-model.md` explains the attack classes. Python 3 only. |

### Git guardrails (hook installers)

| Skill | Use it when |
|---|---|
| `git-guardrails-claude-code` | You want Claude Code physically unable to run `git push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .` or `restore .` in a project or globally. Copies a bundled PreToolUse script into `.claude/hooks/` and wires it into settings. Needs `jq`. |
| `block-no-verify-hook` | You want commits to go through pre-commit hooks every time. Adds an inline PreToolUse hook that rejects `--no-verify`, `--no-gpg-sign`, their accepted prefixes and `commit -n`, per project or globally. No dependencies beyond `grep`. |

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. Two skills
install hooks, and only when you run them:

- **`git-guardrails-claude-code`** copies
  `skills/git-guardrails-claude-code/scripts/block-dangerous-git.sh` to `.claude/hooks/`
  (project) or `~/.claude/hooks/` (global) and adds a `PreToolUse` entry for the Bash tool to
  `.claude/settings.json` or `~/.claude/settings.json`. The skill tells Claude to merge into an
  existing `hooks.PreToolUse` array, not overwrite it. From then on every Claude Code session
  that loads that settings file has the listed git commands blocked (exit code 2), whether or not
  this plugin is still installed. Edit the copied script to change the pattern list.
- **`block-no-verify-hook`** writes a `PreToolUse` entry whose command is an inline `grep` into
  `.claude/settings.json` or `~/.claude/settings.json`. Its `cat >` snippets create a fresh
  file; the skill tells Claude to merge instead when one already exists. There is no script to
  copy, so nothing here depends on the plugin after installation.

Other things to know:

- **`skill-security-auditor`** runs `python3 skill_security_auditor.py` as a static scan; it
  never executes the code it reads. Given a git URL instead of a path it runs
  `git clone --depth 1` into a temporary directory (the one network call in this plugin) and
  removes the clone afterwards. It is the natural gate in front of `meta:harvest`: audit a
  skill, then let harvest copy it into `~/.claude/skills`.
- **`security-threat-model`** writes `<repo-or-dir>-threat-model.md`, and
  **`security-best-practices`** writes `security_best_practices_report.md` when you ask for a
  report, both into the project you are working in (or a path you give). `security-best-practices`
  may search the web for a framework it has no reference for.
- **`mcp-dependency-review`** reads config as text and is told not to run any `command` it
  finds, not to install packages, and not to look at user-level config unless you ask.

## Credits

Every skill here is a vendored, supply-chain-controlled copy: upstream repo, path, commit, date
and license are recorded in [NOTICE.md](NOTICE.md), along with each change made here. Upstream is
re-pulled deliberately, not tracked live; diff against upstream before pulling changes in. Sources:
addyosmani/agent-skills (`security-and-hardening`), affaan-m/ECC (`agent-security-hardening`,
`mcp-dependency-review`), alirezarezvani/claude-skills (`skill-security-auditor`), OpenAI's
openai/skills via davila7/claude-code-templates (`security-best-practices`,
`security-threat-model`, Apache-2.0), mattpocock/skills (`git-guardrails-claude-code`) and
wshobson/agents (`block-no-verify-hook`).

## Invoking

Namespaced under the plugin: `security:security-and-hardening`, `security:security-threat-model`,
`security:security-best-practices`, `security:agent-security-hardening`,
`security:mcp-dependency-review`, `security:skill-security-auditor`,
`security:git-guardrails-claude-code`, `security:block-no-verify-hook`.
