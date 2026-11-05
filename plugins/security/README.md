# security — Security Practice

Is it safe? Nine skills for securing application and agent code. Start with `security-sweep`: a
multi-agent audit of the repository that ends in a CSO-style report. Go deeper with a threat model,
per-framework secure defaults and hardening patterns; review agent runtimes, MCP configs and
third-party skills; and install two git guardrail hooks for Claude Code.

```bash
claude plugin install security@skill-marketplace
```

## Skills

### Audit

| Skill | What it does |
|---|---|
| `security-sweep` | The entry point: "run a security sweep", "audit this repo for vulnerabilities", "check for secrets and CVEs". Orchestrates a multi-agent audit in seven phases: detect the stack, plan which auditors to run, run up to six in parallel (OWASP, secrets, supply chain, LLM security, STRIDE modelling), queue every finding for an independent verifier fan-out, write an exploit scenario for each confirmed high-confidence finding, and assemble a CSO-style report. Every agent reads the previous stage from disk, not from another agent's reply, so nothing drifts in transit. Language catalogs for Node, Python, Go and .NET give each auditor a concrete checklist. About ten minutes for a typical repo. |

### Threat modeling and hardening

| Skill | What it does |
|---|---|
| `security-threat-model` | You want a threat model of a repository or a path in it, not a checklist. Enumerates trust boundaries, assets, attacker capabilities and abuse paths with an evidence anchor per claim, asks you to confirm its assumptions, then writes `<repo>-threat-model.md` to a fixed output contract. |
| `security-and-hardening` | Building or auditing anything that takes untrusted input, manages sessions, stores personal data or calls third parties. Threat-models first (trust boundaries, STRIDE, abuse cases), then applies specific controls: SSRF and DNS rebinding, destructive operations on derived paths, shared-store rate limiting, install-script policy and audit triage, privacy and retention, OWASP LLM handling. Ships `references/hardening-patterns.md` (one implementation per rule) and `references/security-checklist.md` (sign-off checklist, package-manager matrix, OWASP quick references). |
| `security-best-practices` | Writing or reviewing code in a supported stack and you want the framework's own secure defaults, or a prioritised security report. Identifies the languages and frameworks in the project and loads the matching reference: Express, Next.js, React, Vue, jQuery, general JS frontend, Django, Flask, FastAPI, Go. About 400 KB of MUST/SHOULD rules with detection and fix guidance; the payload is the point. |

### Agent runtimes and supply chain

| Skill | What it does |
|---|---|
| `agent-security-hardening` | Building or reviewing an agent runtime, tool gateway, memory service or multi-tenant agent deployment. Maps every `source -> parser -> validator -> side effect` boundary, gives containment code for identifiers, URLs and paths (including Windows reserved names), bounds temp data and tool output, and ends in a verification gate that wants evidence from the real entry point, not mocks. |
| `mcp-dependency-review` | Approving a new or changed `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` or similar. Static, never executes a server: classifies each npm, uvx, pipx and docker selector as SAFE, MEDIUM, HIGH or REVIEW with the option-boundary rules for each runner, and produces a bounded report that does not overclaim. |
| `skill-security-auditor` | You are about to install a skill from a source you do not control. A Python scanner over a skill directory or repo URL: code-execution, exfiltration, credential-harvesting and obfuscation patterns in scripts, prompt injection in `SKILL.md`, dependency supply chain, path escapes, binaries and symlinks. PASS, WARN or FAIL with a fix per finding; `references/threat-model.md` explains the attack classes. Python 3 only. |

### Git guardrails (hook installers)

| Skill | What it does |
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

- **`security-sweep`** writes everything to `ai_docs/security-sweep/runs/<RUN_ID>/` inside the
  repo, one JSON or Markdown file per stage, ending in `08-cso-report.md`. Six Node scripts
  (Node 18.17 or newer, no dependencies) do the deterministic parts: stack detection, dispatch
  planning, queueing and report assembly. The auditor, verifier and exploit-author prompts are
  inline in the skill, so it dispatches only generic subagents. Nothing calls out to the network.
- **`skill-security-auditor`** runs `python3 skill_security_auditor.py` as a static scan; it
  never executes the code it reads. Given a git URL instead of a path it runs
  `git clone --depth 1` into a temporary directory (the one network call in this plugin) and
  removes the clone afterwards. It is the natural gate in front of `agentic:harvest`: audit a
  skill, then let harvest copy it into `~/.claude/skills`.
- **`security-threat-model`** writes `<repo-or-dir>-threat-model.md`, and
  **`security-best-practices`** writes `security_best_practices_report.md` when you ask for a
  report, both into the project you are working in (or a path you give). `security-best-practices`
  may search the web for a framework it has no reference for.
- **`mcp-dependency-review`** reads config as text and is told not to run any `command` it
  finds, not to install packages, and not to look at user-level config unless you ask.

## How it works with the other plugins

- **Shipping.** `ops:ship-gate` delegates its security section to `security-sweep` and reports
  its verdict; it keeps no security rules of its own.
- **Review.** `verify:code-sweep`'s vulnerability scanner looks at one change;
  `security-sweep` audits the whole repository.
- **Agents and skills.** `skill-security-auditor` gates `agentic:harvest` before a third-party
  skill is copied in; `mcp-dependency-review` reviews the servers you build with
  `agentic:mcp-builder`. `agent-security-hardening` and `mcp-dependency-review` point at
  `security-sweep` for a full audit.

## Credits

`security-sweep` is the marketplace owner's. Every other skill here is a vendored,
supply-chain-controlled copy: upstream repo, path, commit, date and license are recorded in
[NOTICE.md](NOTICE.md), along with each change made here. Upstream is re-pulled deliberately, not
tracked live; diff against upstream before pulling changes in. Sources:
addyosmani/agent-skills (`security-and-hardening`), affaan-m/ECC (`agent-security-hardening`,
`mcp-dependency-review`), alirezarezvani/claude-skills (`skill-security-auditor`), OpenAI's
openai/skills via davila7/claude-code-templates (`security-best-practices`,
`security-threat-model`, Apache-2.0), mattpocock/skills (`git-guardrails-claude-code`) and
wshobson/agents (`block-no-verify-hook`).

## Moved in v3

| Skill | Before | Now |
|---|---|---|
| `security-sweep` | `code:security-sweep` | `security:security-sweep` |

## Invoking

Namespaced under the plugin: `security:security-sweep`, `security:security-and-hardening`,
`security:security-threat-model`, `security:security-best-practices`,
`security:agent-security-hardening`, `security:mcp-dependency-review`,
`security:skill-security-auditor`, `security:git-guardrails-claude-code`,
`security:block-no-verify-hook`.
