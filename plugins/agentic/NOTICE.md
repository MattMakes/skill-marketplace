# Third-party notices

The skills listed below are vendored, supply-chain-controlled copies of upstream skills; a skill
that is not listed (`harvest`, `rules-from-code`, `engineering-rules`, `model-router`, `persona`)
is first-party. Each row names the repository and path it was copied from, the commit and date, the license
verified in that repository, and the author.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `loop-design-check` | [affaan-m/ECC — skills/loop-design-check](https://github.com/affaan-m/ECC/tree/2d515e4/skills/loop-design-check) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `agent-architecture-audit` | [affaan-m/ECC — skills/agent-architecture-audit](https://github.com/affaan-m/ECC/tree/2d515e4/skills/agent-architecture-audit) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa; the skill's own metadata names `oh-my-agent-check` as its origin |
| `agent-memory` | [alirezarezvani/claude-skills — engineering/agent-memory/skills/agent-memory](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/agent-memory/skills/agent-memory) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani. Concept derived from [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) (MIT); upstream states no code was taken from it |
| `autoresearch-agent` | [alirezarezvani/claude-skills — engineering/autoresearch-agent/skills/autoresearch-agent](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/autoresearch-agent/skills/autoresearch-agent) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani; inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch) |
| `book-to-skill` | [alirezarezvani/claude-skills — engineering/book-to-skill/skills/book-to-skill](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/book-to-skill/skills/book-to-skill) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani; adapted from [virgiliojr94/book-to-skill](https://github.com/virgiliojr94/book-to-skill) (MIT) |
| `llm-friendly-context` | [shinpr/claude-code-workflows — skills/llm-friendly-context](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/llm-friendly-context) | `a4ecd62` (2026-10-01) | MIT (repo LICENSE) | Shinsuke Kagawa |
| `stow` | [kunchenguid/firstmate — skills/stow](https://github.com/kunchenguid/firstmate/tree/1a86871/skills/stow) | `1a86871` (2026-10-10) | MIT (repo LICENSE) | Kun Chen |
| `writing-for-agents` | [mattpocock/skills — skills/productivity/writing-for-agents](https://github.com/mattpocock/skills/tree/49dd158/skills/productivity/writing-for-agents) | `49dd158` (2026-10-09) | MIT (repo LICENSE) | Matt Pocock |
| `cli-for-agents` | [cursor/plugins — cli-for-agent/skills/cli-for-agents](https://github.com/cursor/plugins/tree/9d76bca/cli-for-agent/skills/cli-for-agents) | `9d76bca` (2026-10-11) | MIT (per-plugin LICENSE, copyright Cursor) | Eric Zakariasson (Cursor) |
| `retro` | [mattpocock/skills — skills/engineering/retro](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/retro) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `correct` | [cursor/plugins pstack/skills/correct](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/correct) | `9d76bca` | MIT | Lauren Tan |
| `skill-creator` | [anthropics/skills — skills/skill-creator](https://github.com/anthropics/skills/tree/41bbe19/skills/skill-creator) | `41bbe19` (2026-09-03) | Apache-2.0 (`license:` in the skill) | Anthropic |
| `mcp-builder` | [anthropics/skills — skills/mcp-builder](https://github.com/anthropics/skills/tree/41bbe19/skills/mcp-builder) | `41bbe19` (2026-09-03) | Apache-2.0 (`license:` in the skill) | Anthropic |
| `keys` | [agent0ai/dox](https://github.com/agent0ai/dox) — the DOX `AGENTS.md` framework, renamed KEYS and made `AGENTS.md`-only | not recorded | MIT | agent0ai |

## Changes made here

Every skill keeps its upstream `name:` (equal to its directory) and had its frontmatter
reduced to the keys Claude Code reads. Beyond that:

- `loop-design-check` — dropped the `origin: ECC` metadata (provenance lives here); the
  pointers to the upstream `autonomous-loops` / `continuous-agent-loop` mechanism skills and
  the `/goal` and `/schedule` commands became plain prose (Claude Code's `/loop` is kept);
  the closing pointer names `verify:human-gate` and `agentic:agent-architecture-audit`.
- `agent-architecture-audit` — dropped the non-standard `tools:` key; "do not use for" and
  "related skills" now point at `dev:debug`, `security:security-sweep` and
  `agentic:loop-design-check` instead of unvendored upstream skills; the report schema id lost
  its `ecc.` prefix; a note that the Grep tool is equivalent to `rg`.
- `agent-memory` — the upstream `DESIGN.md` was copied to the skill root (the 69-check
  validator anchors on it) with its relative links repointed; the three hook scripts were
  copied from the upstream plugin root into `scripts/` with their import path fixed, and an
  opt-in `scripts/hooks.json` template replaces the upstream auto-wired hooks; the
  `/cs:memory` command (status, why, contested, adopt, forget) was folded into `SKILL.md` as
  script invocations; the `distinct_from` metadata naming unvendored siblings was dropped;
  references to sibling skills became prose naming the upstream repository.
- `autoresearch-agent` — the eight evaluator scripts were copied from the upstream plugin
  root into `evaluators/` (where `setup_experiment.py` already looks); the five sibling
  slash-command skills (`/ar:setup`, `/ar:run`, `/ar:loop`, `/ar:ar-status`, `/ar:ar-resume`)
  were folded into `SKILL.md` as flows of this skill; script paths rewritten to
  `${CLAUDE_PLUGIN_ROOT}`; the upstream install section (git clone, `convert.sh`, clawhub)
  and its related-skills list were removed; two printed hints inside the scripts now name
  the script's real location.
- `book-to-skill` — `SKILL_ROOT` rewritten to `${CLAUDE_PLUGIN_ROOT}`; "claude-skills
  plugin" became "Claude Code plugin" and the emitter invocation shows the `--author`,
  `--author-url` and `--repository` flags (the script's defaults are the upstream author's);
  related skills now `agentic:skill-creator` and `agentic:writing-for-agents`; the pointer to the
  upstream plugin README became a URL. The placeholder links in `assets/master_skill_template.md`
  and the workflow reference's template block (`chapters/ch01-<slug>.md`, `glossary.md`, …) are
  written with spaces inside the parentheses so link checkers do not read them as dangling;
  CommonMark and the skill's own validator accept that form. Scripts untouched.
- `stow` — removed the maintainers' HTML comment that named the Firstmate-internal twin.
- `writing-for-agents` — dropped `agents/openai.yaml` (Codex interface metadata).
- `llm-friendly-context`, `cli-for-agents` — unchanged.
- `retro`: `writing-for-agents` → `agentic:writing-for-agents`; the description gained its
  triggers; a note that Claude Code keeps session logs under `~/.claude/projects/`.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `correct`: `disable-model-invocation: true` was removed from the frontmatter (upstream set it
  for Cursor's `poteto-mode` router, not vendored; in Claude Code the flag hides the skill from
  the model and blocks skill-to-skill invocation); otherwise frontmatter only. The pstack folder's
  MIT license is reproduced as `LICENSE-pstack.txt`. Moved here from the `pstack` plugin in the v3
  taxonomy (2026-11-05).
- `skill-creator`, `mcp-builder`: copied from anthropics/skills at `41bbe19` into the `meta`
  plugin; moved here when `meta` dissolved in the v3 taxonomy (2026-11-05).
- `keys`: written for this marketplace on the DOX framework (agent0ai/dox, MIT), renamed KEYS
  and made `AGENTS.md`-only, with `keys.py` for scan, install and check. The provenance was
  recorded in the commit that added it to the `code` plugin (`4c3afe0`); moved here from `code`
  in the v3 taxonomy (2026-11-05).
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `retro`. Moved: `codebase-design` to `architecture`, `diagnosing-bugs` to `dev`, `domain-modeling` to `architecture`, `prototype` to `craft`, `improve-codebase-architecture` to `architecture`.
- `skill-creator`, `mcp-builder`: the `LICENSE.txt` that each SKILL.md names was missing in this repository; the Apache-2.0 text, copied from the anthropics/skills `webapp-testing` LICENSE.txt (commit `dbd4588`), was added to each folder on 2026-11-05.
