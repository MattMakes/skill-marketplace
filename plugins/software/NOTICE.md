# Third-party notices

This plugin was assembled on 2026-11-05 from former plugins. Each section below is the
notice of one former plugin, kept as written, with the rows for skills that went elsewhere
removed. A skill that no row names is first-party.

Two renames apply across the sections. The sixteen `principle-*` skills are now topics of the
`principles` router skill, and the former `stack` skills except `dotnet-backend-patterns` are
topics of `animation`, `react-typescript`, `data` and `systems`; each topic lives at
`skills/<router>/topics/<topic>/GUIDE.md`, and a row naming a former skill credits that topic.
The section headings name the plugin a skill was credited in before it came here; the eight
skills from the former `agentic` plugin that now live here (`keys`, `rules-from-code`,
`engineering-rules`, `retro`, `correct`, `agent-memory`, `stow`, `persona`) are under its
section, and the rest of `agentic` is credited in the `agents` plugin's NOTICE.md.

## From the former `product` plugin

Every skill in this plugin except `adhd` is copied from an upstream repository at the commit
recorded below and adapted to run standalone inside Claude Code; `adhd` is the marketplace
owner's skill based on an upstream project. Each skill keeps its upstream license; a
`LICENSE.txt` already inside a skill directory stays there.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `spec` (PRD mode, was `write-spec`) | [anthropics/knowledge-work-plugins — product-management/skills/write-spec](https://github.com/anthropics/knowledge-work-plugins/tree/95bdacc/product-management/skills/write-spec) | `95bdacc` (2026-10-09) | Apache-2.0 (repo LICENSE) | Anthropic |
| `product-brainstorming` | [anthropics/knowledge-work-plugins — product-management/skills/product-brainstorming](https://github.com/anthropics/knowledge-work-plugins/tree/95bdacc/product-management/skills/product-brainstorming) | `95bdacc` (2026-10-09) | Apache-2.0 (repo LICENSE) | Anthropic |
| `interview-me` | [addyosmani/agent-skills — skills/interview-me](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/interview-me) | `1be8e34` (2026-10-10) | MIT (repo LICENSE) | Addy Osmani |
| `grilling` | [mattpocock/skills — skills/productivity/grilling](https://github.com/mattpocock/skills/tree/49dd158/skills/productivity/grilling) | `49dd158` (2026-10-09) | MIT (repo LICENSE) | Matt Pocock |
| `requirement-convergence` (acceptance-criteria mode, was `intent-driven-development`) | [affaan-m/ECC — skills/intent-driven-development](https://github.com/affaan-m/ECC/tree/2d515e4/skills/intent-driven-development) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `grilling` (docs-anchored mode, was `grill-with-docs`) | [alirezarezvani/claude-skills — engineering/grill-with-docs/skills/grill-with-docs](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/grill-with-docs/skills/grill-with-docs) | `19392f7` (2026-08-26) | MIT (repo LICENSE; core text MIT © Matt Pocock) | Matt Pocock (interview method); Alireza Rezvani (validators, references) |
| `grilling` (design-brief mode, was `design-system:grill-me`) | [plugin87/ux-ui-agent-skills](https://github.com/plugin87/ux-ui-agent-skills/tree/62092bd) | `62092bd` (2026-10-10) | MIT (license in `plugins/design/LICENSE-design-system`) | Thientan Soparat |
| `code-to-prd` | [alirezarezvani/claude-skills — product-team/code-to-prd/skills/code-to-prd](https://github.com/alirezarezvani/claude-skills/tree/19392f7/product-team/code-to-prd/skills/code-to-prd) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani; concept by lihanglogan |
| `advanced-elicitation` | [bmad-code-org/BMAD-METHOD — skills/bmad-advanced-elicitation](https://github.com/bmad-code-org/BMAD-METHOD/tree/bda3c59/skills/bmad-advanced-elicitation) | `bda3c59` (2026-10-06) | MIT (repo LICENSE) | BMad Code, LLC |
| `devil` | [davila7/claude-code-templates — cli-tool/components/skills/productivity/devil](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/productivity/devil) | `45b9b21` (2026-10-10) | MIT (stated in the skill's frontmatter; mirror repo is MIT) | dhha22 ([dhha22/devil-skill](https://github.com/dhha22/devil-skill)), mirrored by davila7 |
| `spec` | [garrytan/gstack — spec](https://github.com/garrytan/gstack/tree/8584d6f/spec) | `8584d6f` (2026-10-11) | MIT (repo LICENSE) | Garry Tan |
| `documentation-criteria` | [shinpr/claude-code-workflows — skills/documentation-criteria](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/documentation-criteria) | `a4ecd62` (2026-10-01) | MIT (repo LICENSE) | Shinsuke Kagawa |
| `requirement-convergence` | [shinpr/claude-code-workflows — skills/requirement-convergence](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/requirement-convergence) | `a4ecd62` (2026-10-01) | MIT (repo LICENSE) | Shinsuke Kagawa |
| `adhd` | based on [UditAkhourii/adhd](https://github.com/UditAkhourii/adhd) (moved here from the `tools` plugin, whose README held the credit) | not recorded | MIT (`license: MIT` in the skill frontmatter) | UditAkhourii |

### Changes made here

Every skill had its `name:` set to its directory name and its frontmatter trimmed to the keys
Claude Code uses. Beyond that:

- `write-spec` (now `spec` PRD mode), `synthesize-research` (now in the `work` plugin): removed the `CONNECTORS.md` link; `~~connector` placeholders became "if an MCP connector for X is available".
- `interview-me`: sibling references (`idea-refine`, `spec-driven-development`, `doubt-driven-development`, `planning-and-task-breakdown`, `source-driven-development`) repointed at `software:product-brainstorming`, `software:spec-driven-workflow`, `software:spec`, `software:devil` and `software:create-plan`.
- `grilling`: dropped `agents/openai.yaml`; "sub-agent" now names the Task/Agent tool.
- `grill-with-docs` (now `grilling` docs-anchored mode): dropped the `cs-grill-with-docs` agent and `/cs:grill-with-docs` command references; script calls use `${CLAUDE_PLUGIN_ROOT}` paths; three example links in `CONTEXT-FORMAT.md` use angle-bracket destinations so they are not mistaken for real files.
- `code-to-prd`: script calls use `${CLAUDE_PLUGIN_ROOT}` paths; removed `scripts/.gitignore`, `assets/sample-analysis.json` and `expected_outputs/` (fixtures the skill does not read); one example link in the README template uses an angle-bracket destination.
- `advanced-elicitation`: stripped the BMad activation block, `customize.toml`/`bmod.toml`, the `{workflow.*}` fields, party mode and the `roster.py` persona lookup (personas are invented in-session); the picker is called with `python3` at its `${CLAUDE_PLUGIN_ROOT}` path; removed `scripts/tests/` and the uv script header.
- `devil`: description condensed to one line under 1024 characters; body unchanged.
- `spec`: rebuilt from `SKILL.md.tmpl` with `sections/gate-and-file.md` inlined and macros dropped; removed the codex quality gate, gstack-issue-guard, gstack-post, gstack-redact, the decision log, the artifacts-sync archive and the `--execute` worktree spawn; dedupe uses plain `gh issue list`, filing uses `gh issue create --body-file`, the archive is an optional `docs/specs/` copy; the semantic review stays and the regex redaction became a described secrets/PII scan; the implementer dispatch rules were inlined into the issue template; `/office-hours` → `work:office-hours`, `/plan-eng-review` and `/ship` dropped.
- `product-brainstorming`, `intent-driven-development` (now `requirement-convergence` acceptance-criteria mode), `documentation-criteria`, `requirement-convergence`: unchanged beyond frontmatter until the merges below.
- 2026-11-05: `write-spec` folded into `spec` as PRD mode (`--prd`). Its workflow became the mode's five steps in `SKILL.md`; its PRD section guidance moved to `spec/references/prd.md`. A PRD that leaves the conversation now passes `spec`'s content review and secrets scan. Dropped: the `/write-spec` usage block and the duplicate section summary.
- 2026-11-05: `grill-with-docs` folded into `grilling` as docs-anchored mode. The interview rules and validator workflow moved to `grilling/references/docs-anchored.md`, `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` to `grilling/references/`, the three citation references to `grilling/references/`, and the three linters to `grilling/scripts/` (paths now `${CLAUDE_PLUGIN_ROOT}/skills/grilling/scripts/`). Dropped: its one-question-per-turn rule (grilling's frontier rounds win) and its `license`/`metadata` frontmatter (credit is in this table).
- 2026-11-05: `design-system:grill-me` folded into `grilling` as design-brief mode, body in `grilling/references/design-brief.md`. Credited from the `design-system` README Credits section. Dropped: `disable-model-invocation`, the Step 0 doctrine load and Playwright install (they serve the render gates, not the interview), and the `${CLAUDE_PLUGIN_ROOT}/shared/tokens` lookup (now a generic token-file search); `/design-system:gate` and `/design-system:critique` became `/design:gate` and `/design:critique`; `AGENTS.md` added to the files read first.
- 2026-11-05: `intent-driven-development` folded into `requirement-convergence` as acceptance-criteria mode. Seven steps in `SKILL.md`; operating rules, depth choice, boundary table, Acceptance Brief template, pass/fail examples and rubric in `requirement-convergence/references/acceptance-criteria.md`. Its out-of-scope list now takes only user-authored `nonGoals` (convergence's rule wins over listing agent-noticed adjacent work). Dropped: "When to Activate", "How It Works", the Examples section (duplicated by the pass/fail examples) and the generic Handoff section.
- 2026-11-05: `adhd` moved here from the `tools` plugin in the v3 taxonomy. Its credit ("based on UditAkhourii/adhd") was carried from the `tools` README. Unchanged.

## From the former `architecture` plugin

The skills below are vendored copies of upstream skills. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

`architect` comes from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `domain-modeling` | [mattpocock/skills — skills/engineering/domain-modeling](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/domain-modeling) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `codebase-design` | [mattpocock/skills — skills/engineering/codebase-design](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/codebase-design) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `improve-codebase-architecture` | [mattpocock/skills — skills/engineering/improve-codebase-architecture](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/improve-codebase-architecture) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `improve` | [shadcn/improve — skills/improve](https://github.com/shadcn/improve/tree/cac56e1/skills/improve) | `cac56e1` (2026-09-12) | MIT | shadcn |
| `architecture-decision-records` | [wshobson/agents — plugins/documentation-generation/skills/architecture-decision-records](https://github.com/wshobson/agents/tree/46891e7/plugins/documentation-generation/skills/architecture-decision-records) | `46891e7` (2026-10-04) | MIT | Seth Hobson |
| `contract-first` | [affaan-m/ECC — skills/contract-first](https://github.com/affaan-m/ECC/tree/2d515e4/skills/contract-first) | `2d515e4` (2026-10-10) | MIT | Affaan Mustafa |
| `architect` | [cursor/plugins pstack/skills/architect](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/architect) | `9d76bca` | MIT | Lauren Tan |
| `saga-orchestration` | [wshobson/agents · plugins/backend-development/skills/saga-orchestration](https://github.com/wshobson/agents/tree/46891e7/plugins/backend-development/skills/saga-orchestration) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `drawio` | [Agents365-ai/drawio-skill · skills/drawio-skill](https://github.com/Agents365-ai/drawio-skill/tree/88fd923/skills/drawio-skill) | `88fd923` (2026-10-02) | MIT (per-skill LICENSE). `data/shape-index.json.gz` is derived from jgraph/drawio-mcp and the draw.io client shape libraries, Apache-2.0 (see `data/SHAPE-INDEX-NOTICE.md`); `data/lobe-icons.json` and `data/databricks-icons.json` are manifests pointing at lobehub/lobe-icons (MIT), simple-icons (CC0) and oieduardorabelo/databricks-architecture-icons; no icon files are bundled. | Agents365-ai |
| `api-design-principles` | [wshobson/agents](https://github.com/wshobson/agents), `backend-development` plugin | `a30778f` (2026-09-01) | MIT (`license: MIT` in the skill) | Seth Hobson |
| `blueprint` | [tt-a1i/archify](https://github.com/tt-a1i/archify) 2.17.0-dev.1, itself based on Cocoon AI's architecture-diagram-generator; visual update compared against upstream `c1443b3` | 2.17.0-dev.1; `c1443b31b496eebf4a68bf83151816c955ddb796` | MIT ([skills/blueprint/LICENSE](skills/blueprint/LICENSE)); bundled JetBrains Mono under SIL OFL 1.1 | tt-a1i; JetBrains Mono © 2020 The JetBrains Mono Project Authors. Full provenance in [skills/blueprint/NOTICE.md](skills/blueprint/NOTICE.md) |

### Changes made here
- `domain-modeling`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
  All six are in this plugin (`diagnosing-bugs` as `debug`'s hard-bug mode); the same note
  appears under each former plugin that held one of them.
- `improve-codebase-architecture`: `codebase-design`, `grilling`, `domain-modeling` and the
  `/codebase-design` mentions in `HTML-REPORT.md` → `software:codebase-design`, `software:grilling`,
  `software:domain-modeling`; the description gained its triggers. The report still loads Tailwind and
  Mermaid from CDNs, as upstream.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
  All six are in this plugin; the same note appears under each former plugin that held one
  of them.
- `architecture-decision-records`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `contract-first`, `code-tour`: the `metadata.origin` key was dropped (credited here instead);
  related-skill lists repointed at `software:api-design-principles` and `software:tdd`
  or reduced to plain prose (`api-design`, `ai-regression-testing`, `backend-patterns`,
  `frontend-patterns`, `tdd-workflow`, `documentation-lookup`, `codebase-onboarding`,
  `coding-standards`, `council`).
  Both are in this plugin; the same note appears under the `architecture` and `code` sections.
- `architect`: the `how` grounding step became an inline instruction (explain the subsystem,
  read-only Task subagents for larger scopes); runner selection no longer reads
  `~/.cursor/rules/pstack-models.mdc` or names Cursor model slugs, it says `opus` plus a different
  model family where available, otherwise a fresh context; `interrogate` became "spawn reviewer
  subagents that try to break the sketch"; `rationale-template.md` and `runner-prompt.md`
  repointed to `pstack:` names.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `saga-orchestration`: the Related Skills section (three unvendored upstream skills) was removed; "see Template 3 above" now says "in `references/details.md`", where upstream had already moved the templates. The same two unvendored skill names were dropped from the "See Also" list at the end of `references/advanced-patterns.md`.
  Moved here from the `stack` plugin in the v3 taxonomy (2026-11-05).
- `drawio`: deleted `agents/openai.yaml`; the frontmatter `metadata` lost its OpenClaw and Hermes
  host blocks (author, version, homepage, compatibility and platforms kept). `references/mcp.md`,
  `ci-gate.md`, `pr-bot.md` and `toolbox.md` pointed at files in the upstream repository root
  (`.github/actions`, `.github/workflows`, `docs/CI.md`, `skills/drawio-skill/`); those now link
  to the upstream GitHub paths at the pinned commit or use `${CLAUDE_PLUGIN_ROOT}/skills/drawio/`.
  The suggested MCP server name `drawio-skill` became `drawio`. Scripts, data and styles are
  byte-for-byte upstream.
  Moved here from the `work` plugin in the v3 taxonomy (2026-11-05).
- `api-design-principles`: moved here from the `tools` plugin in the v3 taxonomy (2026-11-05). Its credit (wshobson/agents, commit `a30778f`, the `developer-essentials` and `backend-development` plugins) was carried from the `tools` README.
- `blueprint`, `ddd`, the nine `ddd-*` steps and the `ddd-decision-strategist` agent: moved here from the `code` plugin in the v3 taxonomy (2026-11-05). The `ddd` toolchain is first-party; Blueprint's provenance stays in its own `NOTICE.md`.

## From the former `dev` plugin

The skills below are vendored copies of upstream skills. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

`arena`, `show-me-your-work` come from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `spec-driven-workflow` | [alirezarezvani/claude-skills — engineering/skills/spec-driven-workflow](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/spec-driven-workflow) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `arena` | [cursor/plugins pstack/skills/arena](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/arena) | `9d76bca` | MIT | Lauren Tan |
| `show-me-your-work` | [cursor/plugins pstack/skills/show-me-your-work](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/show-me-your-work) | `9d76bca` | MIT | Lauren Tan |
| `verification-before-completion` | [obra/superpowers — skills/verification-before-completion](https://github.com/obra/superpowers/tree/bb92a77/skills/verification-before-completion) | `bb92a77` (2026-10-09) | MIT | Jesse Vincent |
| `doubt-driven-development` | [addyosmani/agent-skills — skills/doubt-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/doubt-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `finishing-a-development-branch` | [obra/superpowers — skills/finishing-a-development-branch](https://github.com/obra/superpowers/tree/bb92a77/skills/finishing-a-development-branch) | `bb92a77` (2026-10-09) | MIT | Jesse Vincent |
| `make-pr-easy-to-review` | [cursor/plugins — cursor-team-kit/skills/make-pr-easy-to-review](https://github.com/cursor/plugins/tree/9d76bca/cursor-team-kit/skills/make-pr-easy-to-review) | `9d76bca` (2026-10-11) | MIT (`cursor-team-kit/LICENSE`) | Cursor |
| `debug` | [obra/superpowers — skills/systematic-debugging](https://github.com/obra/superpowers/tree/b36e082/skills/systematic-debugging) | `b36e082` (2026-08-12) | MIT | Jesse Vincent |
| `debug` (`references/diagnosis-loop.md`, `scripts/hitl-loop.template.sh`) | [mattpocock/skills — skills/engineering/diagnosing-bugs](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/diagnosing-bugs) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `tdd` (the TDD half and `writing-good-tests.md`) | [obra/superpowers — skills/test-driven-development](https://github.com/obra/superpowers/tree/b36e082/skills/test-driven-development) | `b36e082` (2026-08-12) | MIT | Jesse Vincent |
| `unlazy` (including its lite mode) | [Leonxlnx/unlazy](https://github.com/Leonxlnx/unlazy) | not recorded (skill v2.1.0) | MIT | Leonxlnx |
| `using-git-worktrees` | [obra/superpowers](https://github.com/obra/superpowers) | `b36e082` (2026-08-12) | MIT | Jesse Vincent |
| `git-advanced-workflows` | [wshobson/agents](https://github.com/wshobson/agents), `developer-essentials` plugin | `a30778f` (2026-09-01) | MIT | Seth Hobson |

### Changes made here
- `spec-driven-workflow`: script calls use `${CLAUDE_PLUGIN_ROOT}` paths; `engineering-team/tdd-guide` → `software:tdd`, `focused-fix` → `software:debug`, `rag-architect` dropped.
  Moved here from the `product` plugin in the v3 taxonomy (2026-11-05).
- `arena`: runner and cross-judge selection rewritten for the Task tool and Claude Code model
  aliases, keeping the different-model-family intent; `readonly` judge became "instructed to read
  and not write".
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `show-me-your-work`: helper and template paths now use `${CLAUDE_PLUGIN_ROOT}`; the transcript
  audit reads this session's JSONL under `~/.claude/projects/` instead of Cursor's
  `agent-transcripts/`; the cross-model review spawns a Task subagent (different family where
  available, otherwise a different alias in a fresh context). `log.sh` unchanged.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `verification-before-completion`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `doubt-driven-development`: the upstream repo's `references/orchestration-patterns.md` and
  `agents/` persona roster are not vendored; the "personas do not invoke other personas" rule and
  the fresh-context reviewer are now stated in terms of Task-tool subagents and project
  `.claude/agents/`. `/review` became "post-hoc code review"; sibling references repointed at
  `software:source-driven-development`, `software:tdd` and `software:debug`.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `finishing-a-development-branch`: "Superpowers created this worktree" →
  "`software:using-git-worktrees` created this worktree".
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `make-pr-easy-to-review`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `debug`: `tools:systematic-debugging` folded in (2026-11-05). The two were near-identical
  copies of superpowers' `systematic-debugging`; `debug` kept its wording ("Ultrathink", the
  overview line, Real-World Impact) and took `license: MIT` and the "fresh verification evidence"
  line, now pointing at `software:verification-before-completion`. `find-polluter.sh` (bash, no
  dependencies) sits beside `find-polluter.ts`. Dropped: the duplicate reference files.
- `debug`: `craft:diagnosing-bugs` folded in as the "hard bug / performance regression" mode
  (2026-11-05). Its body is `references/diagnosis-loop.md` (frontmatter removed, HITL script path
  now `${CLAUDE_PLUGIN_ROOT}/skills/debug/scripts/hitl-loop.template.sh`); a `## Modes` table in
  `SKILL.md` routes to it and the description gained its triggers. Upstream's Codex-host
  `agents/openai.yaml` had already been dropped.
- `tdd`: `tools:test-driven-development` folded in (2026-11-05). `tdd` was a superset except for
  `writing-good-tests.md`, which came in and replaced the dangling `@testing-anti-patterns.md`
  section; the rationalization table took the source's fuller rows and the duplicate "Why Order
  Matters" prose was dropped. The "TDD for Skills" half is unchanged.
- `check-implementation`: the marketplace owner's `tools:post-flight` folded in as the full
  post-flight mode (2026-11-05): `source_path`, a `## Modes` table, the three phases in
  `references/post-flight.md` and the report template in `references/post-flight-report.md`.
  `/trace` → `software:trace`; runtime checks are run by the agent where it can reach them. Dropped:
  the "Announce at start" line and the closing pep talk. The UI gate kit path now points at the
  `design` plugin's `shared/`.
- `unlazy`: `tools:unlazy-lite` (upstream v2.1.0) folded in as the lite mode (2026-11-05), with
  its behavioral rules as "Lite rules" and its triggers in the description. Dropped: its older
  `gate-check.mjs`, `stop-hook.mjs`, `install-hooks.mjs`, templates and references, which this
  skill's newer versions supersede; lite mode uses this skill's checker, approvals included.
  Moved here from the `tools` plugin, whose README held the credit, in the v3 taxonomy.
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
  All six are in this plugin; the same note appears under each former plugin that held one
  of them.
- `using-git-worktrees`, `git-advanced-workflows`: moved here from the `tools` plugin in the v3 taxonomy (2026-11-05); their credits were carried from the `tools` README. In the `tools` copy, `superpowers:` cross-references had been repointed at `tools:` and `dev:` skills and the author's eval scratch files dropped.
- `pre-flight`, and the post-flight mode of `check-implementation`: the marketplace owner's, moved from the `tools` plugin; no third-party notice applies.

## From the former `verify` plugin

The skills in the table are vendored copies of skills published in other repositories; a skill that
is not in the table is first-party.
Each is kept here as a supply-chain-controlled fork, credited below with the upstream
repository, path, commit and date it was copied from, and its license.

`blast-radius`, `benchmark-checklist`, `create-verification-skill`, `maintain-verification-skill` come from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `santa-method` | [affaan-m/ECC — skills/santa-method](https://github.com/affaan-m/ECC/tree/2d515e4/skills/santa-method) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa; the method is credited upstream to Ronald Skelton (RapportScore.ai) |
| `click-path-audit` | [affaan-m/ECC — skills/click-path-audit](https://github.com/affaan-m/ECC/tree/2d515e4/skills/click-path-audit) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa (origin marked "community") |
| `windows-desktop-e2e` | [affaan-m/ECC — skills/windows-desktop-e2e](https://github.com/affaan-m/ECC/tree/2d515e4/skills/windows-desktop-e2e) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `react-testing` | [affaan-m/ECC — skills/react-testing](https://github.com/affaan-m/ECC/tree/2d515e4/skills/react-testing) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `ui-demo` | [affaan-m/ECC — skills/ui-demo](https://github.com/affaan-m/ECC/tree/2d515e4/skills/ui-demo) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `api-design-reviewer` | [alirezarezvani/claude-skills — engineering/skills/api-design-reviewer](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/api-design-reviewer) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `playwright-pro` | [alirezarezvani/claude-skills — engineering-team/playwright-pro/skills/pw](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering-team/playwright-pro/skills/pw) | `19392f7` (2026-08-26) | MIT (repo LICENSE and `engineering-team/playwright-pro/LICENSE`) | Alireza Rezvani |
| `full-page-screenshot` | [alirezarezvani/claude-skills — engineering/skills/full-page-screenshot](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/full-page-screenshot) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `control-cli` | [cursor/plugins — cursor-team-kit/skills/control-cli](https://github.com/cursor/plugins/tree/9d76bca/cursor-team-kit/skills/control-cli) | `9d76bca` (2026-10-11) | MIT (`cursor-team-kit/LICENSE`) | Cursor |
| `control-ui` | [cursor/plugins — cursor-team-kit/skills/control-ui](https://github.com/cursor/plugins/tree/9d76bca/cursor-team-kit/skills/control-ui) | `9d76bca` (2026-10-11) | MIT (`cursor-team-kit/LICENSE`) | Cursor |
| `verify-this` | [cursor/plugins — cursor-team-kit/skills/verify-this](https://github.com/cursor/plugins/tree/9d76bca/cursor-team-kit/skills/verify-this) | `9d76bca` (2026-10-11) | MIT (`cursor-team-kit/LICENSE`) | Cursor |
| `test-audit` | [garrytan/gstack — test-audit](https://github.com/garrytan/gstack/tree/8584d6f/test-audit) | `8584d6f` (2026-10-11) | MIT (repo LICENSE) | Garry Tan |
| `integration-e2e-testing` | [shinpr/claude-code-workflows — skills/integration-e2e-testing](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/integration-e2e-testing) | `a4ecd62` (2026-10-01) | MIT (repo LICENSE) | Shinsuke Kagawa |
| `control-ui` (Quick Playwright mode, `scripts/with_server.py`, `examples/`; was `webapp-testing`) | [anthropics/skills — skills/webapp-testing](https://github.com/anthropics/skills/tree/dbd4588/skills/webapp-testing) | `dbd4588` (2026-10-09) | Apache-2.0 (upstream's per-skill `LICENSE.txt`, kept as `skills/control-ui/LICENSE-webapp-testing.txt`) | Anthropic |
| `k6-load-testing` | [davila7/claude-code-templates — cli-tool/components/skills/development/k6-load-testing](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/k6-load-testing) | `45b9b21` (2026-10-10) | MIT (repo LICENSE). The skill's own frontmatter names "Kairo Official" as author and "community" as source; the original project's license is not verified in the mirror | Kairo Official, via Daniel Ávila's repository |
| `verify-feature` | [exiao/skills — coding/verify-feature](https://github.com/exiao/skills/tree/7d2be64/coding/verify-feature) | `7d2be64` (2026-07-27) | MIT (README statement; the repository has no LICENSE file) | exiao |
| `dogfood` | [exiao/skills — coding/dogfood](https://github.com/exiao/skills/tree/7d2be64/coding/dogfood) | `7d2be64` (2026-07-27) | MIT (README statement; no LICENSE file) | exiao |
| `adversarial-ux-test` | [exiao/skills — coding/adversarial-ux-test](https://github.com/exiao/skills/tree/7d2be64/coding/adversarial-ux-test) | `7d2be64` (2026-07-27) | MIT (README statement; no LICENSE file) | exiao |
| `ios-simulator` | [exiao/skills — app-store/ios-simulator](https://github.com/exiao/skills/tree/7d2be64/app-store/ios-simulator) | `7d2be64` (2026-07-27) | MIT (README statement; no LICENSE file) | exiao |
| `python-anti-patterns` | [wshobson/agents — plugins/python-development/skills/python-anti-patterns](https://github.com/wshobson/agents/tree/46891e7/plugins/python-development/skills/python-anti-patterns) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `bats-testing-patterns` | [wshobson/agents — plugins/shell-scripting/skills/bats-testing-patterns](https://github.com/wshobson/agents/tree/46891e7/plugins/shell-scripting/skills/bats-testing-patterns) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `ai-debt-detector` | [wshobson/agents — plugins/skill-forge-essentials/skills/ai-debt-detector](https://github.com/wshobson/agents/tree/46891e7/plugins/skill-forge-essentials/skills/ai-debt-detector) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `blast-radius` | [cursor/plugins pstack/skills/blast-radius](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/blast-radius) | `9d76bca` | MIT | Lauren Tan |
| `benchmark-checklist` | [cursor/plugins pstack/skills/benchmark-checklist](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/benchmark-checklist) | `9d76bca` | MIT | Lauren Tan |
| `create-verification-skill` | [cursor/plugins pstack/skills/create-verification-skill](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/create-verification-skill) | `9d76bca` | MIT | Lauren Tan |
| `maintain-verification-skill` | [cursor/plugins pstack/skills/maintain-verification-skill](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/maintain-verification-skill) | `9d76bca` | MIT | Lauren Tan |
| `human-gate` | [alirezarezvani/claude-skills — engineering/human-gate/skills/human-gate](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/human-gate/skills/human-gate) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani. Batched-review pattern derived from [petergyang/human-review](https://github.com/petergyang/human-review) (MIT, Peter Yang); upstream states no code was taken from it |
| `web-quality-audit` | [davila7/claude-code-templates — cli-tool/components/skills/development/web-quality-audit](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/web-quality-audit) | `45b9b21` (2026-10-10) | MIT (repo LICENSE; skill frontmatter) | web-quality-skills, via Daniel Ávila's claude-code-templates |
| `receiving-code-review` | [obra/superpowers](https://github.com/obra/superpowers) | `b36e082` (2026-08-12) | MIT (`license: MIT` in the skill) | Jesse Vincent |
| `code-review-excellence` | [wshobson/agents](https://github.com/wshobson/agents), `developer-essentials` plugin | `a30778f` (2026-09-01) | MIT (`license: MIT` in the skill) | Seth Hobson |
| `code-reviewer` (agent) | [wshobson/agents](https://github.com/wshobson/agents), an earlier revision of its `code-reviewer` agent | not recorded | MIT | Seth Hobson |

### Changes made here

Every skill's frontmatter was reduced to the keys Claude Code uses (`name` equals the
directory name; `description` is a single-line string). Beyond that:

- `test-audit` — rebuilt from upstream's `SKILL.md.tmpl`: the ~30 KB of injected gstack
  preamble (telemetry, onboarding, AskUserQuestion boilerplate, decision ledger, voice)
  is gone; the `{{TEST_VALUE_BAR}}` section is inlined from the generated file; the
  report path now uses `.claude/test-audit/` in the repo instead of `gstack-paths` and
  `gstack-slug`; references to `/ship`, `/review`, `/qa` and the `plan-eng-review` seed
  plan became plain prose; `SESSION_KIND` preamble checks became "when running
  unattended". `SKILL.md.tmpl` deleted.
- `playwright-pro` — the `/pw:pw-init`, `/pw:generate`, `/pw:pw-review` and `/pw:fix`
  sub-skills that upstream ships as separate commands were inlined as four workflow
  sections (condensed from their SKILL.md files at the same commit); the TestRail and
  BrowserStack MCP integrations, the agents and hooks were dropped; the 55 templates
  and six reference docs are unchanged. `templates/README.md` no longer points at
  `/pw:generate`.
- `verify-feature` — `shot-scraper` kept as the preferred capture tool with a Playwright
  fallback added; the author's `HERMES_ALLOW_PRIVATE_URLS` example became
  `MYAPP_ALLOW_PRIVATE_URLS` (also in `references/false-fail-triage.md`);
  `~/.hermes/VISUAL-IDENTITY.md` became "the project's visual identity guide";
  `references/isolated-component-harness.md` lost its "Bloom"/RevenueCat example and its
  Hermes browser-tool names (`browser_navigate`, `browser_vision`, `file_send`, `trash`);
  the `verify-deploy` sibling reference became prose; `ios-simulator` repointed to
  `software:ios-simulator`; `preloaded: true` dropped.
- `dogfood` — duplicated "Pitfalls" section removed (upstream repeats it); `{SKILL_DIR}`
  became `${CLAUDE_PLUGIN_ROOT}/skills/dogfood`; the fallback reference's
  `~/projects/dogfood/<slug>` output path became the session's `{OUTPUT_DIR}`;
  `preloaded: true` dropped.
- `ios-simulator` — script invocations use `${CLAUDE_PLUGIN_ROOT}/skills/ios-simulator/scripts/`;
  the "Documentation" section no longer cites README.md, CLAUDE.md, `references/` and
  `examples/`, which upstream does not ship with the skill.
- `api-design-reviewer` — the "Tier / Category / Maintainer" header dropped; Quick Start
  invokes the scripts through `${CLAUDE_PLUGIN_ROOT}`; the CI and pre-commit examples
  say to copy the scripts into the repo instead of referencing upstream's
  `engineering/skills/...` path.
- `full-page-screenshot` — `${SKILL_DIR}` became `${CLAUDE_PLUGIN_ROOT}/skills/full-page-screenshot`;
  cross-references to upstream's `browser-automation` and `performance-profiler` skills
  replaced by `software:control-ui`.
- `webapp-testing` — `with_server.py` invoked through `${CLAUDE_PLUGIN_ROOT}`; nothing
  else changed (Apache-2.0 `LICENSE.txt` kept). Folded into `control-ui` on 2026-11-05 as
  its "Quick Playwright" mode: `scripts/with_server.py` and the three `examples/` moved
  unchanged; the SKILL.md body became `control-ui/references/quick-playwright.md` (condensed,
  paths rewritten, with a change notice) plus a short steps list in `control-ui`'s Modes
  section; `LICENSE.txt` kept as `LICENSE-webapp-testing.txt`. Dropped: the frontmatter
  `license:` key and the separate skill name.
- `click-path-audit` — `/superpowers:*` references repointed to
  `software:debug`, `software:verify-feature` and
  `software:tdd`; the per-page agent split is labelled as the author's
  example.
- `react-testing` — dangling links to upstream's `accessibility`, `e2e-testing`,
  `react-patterns`, `tdd-workflow` skills, `rules/react/testing.md`, agents and
  `/react-*` commands replaced with `software:tdd` and
  `software:playwright-pro`.
- `windows-desktop-e2e` — `e2e-testing` repointed to `software:playwright-pro`; the
  `cpp-testing` and `cpp-coding-standards` siblings dropped.
- `santa-method` — the "Integration with Other Skills" table naming ECC's
  Verification Loop, Eval Harness, Continuous Learning and Strategic Compact skills
  became four plain sentences (one pointing at `software:verify-feature` /
  `software:check-implementation`).
- `control-ui`, `verify-this` — sibling mentions of `verify-this`, `control-cli` and
  `control-ui` namespaced to `verify:`.
- `k6-load-testing` — upstream's `category`, `risk`, `source`, `date_added`, `tags` and
  `tools` keys dropped (author and source kept under `metadata`); the "Related Skills"
  list of `@performance-engineer`-style agents removed.
- `python-anti-patterns` — the pointer to the unvendored `python-design-patterns` skill
  became a plain sentence.
- `ui-demo`, `react-testing`, `windows-desktop-e2e` — `metadata.origin: ECC` reworded to
  `ecc (affaan-m)`; content unchanged.
- `adversarial-ux-test`, `ai-debt-detector` — multi-line descriptions folded to one line.
- `control-cli`, `integration-e2e-testing`, `bats-testing-patterns` — unchanged beyond
  the frontmatter rule.
- `blast-radius`: `how` mention dropped; `why` and `arena` repointed; `unslop` became
  `work:humanize`.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `benchmark-checklist`: the "Opening a PR", "Perf issue" and "Hillclimb" playbook references
  became plain sentences; one sentence added pairing it with `software:principles` (topic `principle-explain-the-number`).
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `create-verification-skill`: writes to `.claude/skills/verify-<app>/` instead of
  `.cursor/skills/`; the generic harness recipes point at `software:control-ui` and
  `software:control-cli`; `/maintain-verification-skill` became `software:maintain-verification-skill`.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `maintain-verification-skill`: `.cursor/skills/` became `.claude/skills/`;
  `/create-verification-skill` became `software:create-verification-skill`.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `human-gate` — script paths rewritten to `${CLAUDE_PLUGIN_ROOT}`; references to the
  upstream `agent-harness`, `md-review`, `grill-me`, `content-humanizer`/`behuman` skills and
  an internal audit folder became prose or `software:grilling` / `work:humanize`.
  Moved here from the `agentic` plugin in the v3 taxonomy (2026-11-05).
- `web-quality-audit`: moved here from the `design` plugin in the v3 taxonomy (2026-11-05).
- `code-sweep` (first-party, moved from `dev`): the first-party `review-git-changes` skill
  folded in on 2026-11-05 as its light mode (`--light`: single pass, commit-history and diff
  read, consistency and duplication checks, A-F grade on six aspects, digest and grade files
  in `ai_docs/reviews/`). Its default-branch detection replaced code-sweep's hard-coded
  `main`/`master` diff. Dropped: the separate skill and its "senior engineer" role line.
- `accessibility` (now in `a11y-audit`), `core-web-vitals` (now in `performance`), `web-quality-audit` — `../` links between siblings rewritten as `design:` references; links to the non-vendored `performance`, `seo` and `best-practices` siblings dropped. `web-quality-audit`'s SKILL.md now mentions its bundled `analyze.sh`, and the script was fixed so directory scans report results (results were lost in a pipe subshell) and the `alt` check runs (it used a PCRE lookahead under `grep -E`).
  v3 taxonomy (2026-11-05): `web-quality-audit` moved here from the `design` plugin; this note is copied from the design NOTICE, where `accessibility` and `core-web-vitals` now live inside `a11y-audit` and `performance`.
- `receiving-code-review`, `code-review-excellence`: moved here from the `tools` plugin in the v3 taxonomy (2026-11-05); their credits were carried from the `tools` README. In the `tools` copy, `superpowers:` cross-references had been repointed at `tools:` and `dev:` skills.
- `code-reviewer` (agent): moved here from the `dev` plugin in the v3 taxonomy (2026-11-05). The `dev` README credited wshobson/agents in general terms; the agent file's own source comment names the upstream and points at this file.
- `complexity-sweep`, `e2e-harness` (first-party, moved from `code`) and `code-sweep` (first-party, moved from `dev`): no third-party notice applies, except the tree-sitter grammars bundled with `complexity-sweep`, credited in `skills/complexity-sweep/code/core/grammars/NOTICE.md`.

## From the former `code` plugin

The skills below are vendored copies of upstream skills. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

`why` comes from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `why` | [cursor/plugins pstack/skills/why](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/why) | `9d76bca` | MIT | Lauren Tan |
| `code-tour` | [affaan-m/ECC — skills/code-tour](https://github.com/affaan-m/ECC/tree/2d515e4/skills/code-tour) | `2d515e4` (2026-10-10) | MIT | Affaan Mustafa |
| `deepwiki` (Brownfield mode only: `references/workflow/brownfield-doc.md`) | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) — the `document-project` task, via the `dev:document-project` skill | not recorded | MIT (repo LICENSE) | BMad Code, LLC |
| `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder` (agents) | [humanlayer/humanlayer — .claude/agents/](https://github.com/humanlayer/humanlayer) (`codebase-locator.md`, `codebase-analyzer.md`, `codebase-pattern-finder.md`) | not recorded | Apache-2.0 | HumanLayer |

`explain-diff` is adapted from [Geoffrey Litt's explain-diff gist](https://gist.github.com/geoffreylitt/a29df1b5f9865506e8952488eac3d524):
the four-section structure, the Kleppmann-style writing brief and the interactive quiz are his; the
quiz-fairness rule comes from the gist's discussion thread. The graph layer of `core` is
[graphify](https://github.com/Graphify-Labs/graphify) (PyPI `graphifyy`), installed and run as-is,
not vendored.

### Changes made here
- `codebase-locator`, `codebase-analyzer`, `codebase-pattern-finder`: moved here from the `dev`
  plugin in the v3 taxonomy (2026-11-05). Each file keeps its `<!-- Source: HumanLayer ... -->`
  comment; the HumanLayer credit previously lived only there and in the dev README's Credits line.
- `why`: model-rule paragraph and `generalPurpose`/`readonly: false` spawn mode rewritten for the
  Task tool (`sonnet` investigators, `opus` synthesizer, full tool set); MCP discovery now reads
  the session's `mcp__*` tools and `claude mcp list` instead of Cursor's `mcps/` directory; the
  `how` companion mention and the description's "Use how" became plain prose. References untouched.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `code-tour`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `deepwiki`: `dev:document-project` folded in as the Brownfield mode on 2026-11-05. Its scope
  question (PRD, feature description, or document everything), its "map the reality" analysis
  (actual patterns, debt, workarounds, constraints, impact analysis) and its QA checklist moved to
  `references/workflow/brownfield-doc.md`; deepwiki's `file:line` citation and Mermaid
  validation policies now apply to it. Dropped: the long verbatim prompt to the user, the
  separate elicitation round after deep analysis, and "apply the advanced elicitation task after
  major sections" (`software:advanced-elicitation` remains available on its own).
- `core`: `dev:prime` folded in as quick mode on 2026-11-05 (`references/quick-prime.md`): the
  per-project-type file lists, the 15–20 file cap and the 500-line rule. Dropped: the test-folder
  globs, which contradicted prime's own "skip tests" rule, and the Next.js `public/` and `styles/`
  globs. Added a Go row, which the dev README listed but the skill lacked.
- `core`: on 2026-11-05 the CORE layer (CLAUDE.md contracts with AGENTS.md symlinks) was removed
  in favour of `software:keys`. Removed `core.py link`, `block` and `index`, the symlink health
  check, the vendored `.claude/core/core.py` copy, `assets/CORE-root.md`, `assets/CORE-child.md`
  and `references/original.md` (keys carries the same framework text). Added
  `core.py graphify-block`, which moves graphify's `CLAUDE.md` section into a
  `<!-- GRAPHIFY:begin -->` block of the root AGENTS.md; `status.sh` now reports the AGENTS.md
  tree and a `GRAPH_ONLY` verdict when agentic is not installed. That verdict was removed when
  `keys` joined `core` in this plugin.
- `contract-first`, `code-tour`: the `metadata.origin` key was dropped (credited here instead);
  related-skill lists repointed at `software:api-design-principles` and `software:tdd`
  or reduced to plain prose (`api-design`, `ai-regression-testing`, `backend-patterns`,
  `frontend-patterns`, `tdd-workflow`, `documentation-lookup`, `codebase-onboarding`,
  `coding-standards`, `council`).
  Both are in this plugin; the same note appears under the `architecture` and `code` sections.

## From the former `craft` plugin

The skills listed below are vendored copies of upstream skills; a skill that is not listed is
first-party. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

The 16 `principle-*` skills come from the `pstack` plugin in [cursor/plugins](https://github.com/cursor/plugins) by Lauren Tan, at commit `9d76bca` (2026-10-11), under
its own MIT license, reproduced beside this file as `LICENSE-pstack.txt`.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `constraint-driven-development` | [addyosmani/agent-skills — skills/constraint-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/constraint-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `performance-optimization` | [addyosmani/agent-skills — skills/performance-optimization](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/performance-optimization) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `source-driven-development` | [addyosmani/agent-skills — skills/source-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/source-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `deprecation-and-migration` | [addyosmani/agent-skills — skills/deprecation-and-migration](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/deprecation-and-migration) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `ponytail` | [DietrichGebert/ponytail — skills/ponytail](https://github.com/DietrichGebert/ponytail/tree/9b58c1f/skills/ponytail) | `9b58c1f` (2026-10-10) | MIT | Dietrich Gebert |
| `prototype` | [mattpocock/skills — skills/engineering/prototype](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/prototype) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `ai-development-guide` | [shinpr/claude-code-workflows — skills/ai-development-guide](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/ai-development-guide) | `a4ecd62` (2026-10-01) | MIT | Shinsuke Kagawa |
| `oh-my-issues` | [thedotmack/claude-mem — plugin/skills/oh-my-issues](https://github.com/thedotmack/claude-mem/tree/fa8ab09/plugin/skills/oh-my-issues) | `fa8ab09` (2026-10-08) | Apache-2.0 | Alex Newman |
| `karpathy-coder` | [alirezarezvani/claude-skills — engineering/karpathy-coder/skills/karpathy-coder](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/karpathy-coder/skills/karpathy-coder) | `19392f7` (2026-08-26) | MIT | Alireza Rezvani |
| `error-handling-patterns` | [wshobson/agents — plugins/developer-essentials/skills/error-handling-patterns](https://github.com/wshobson/agents/tree/a30778f/plugins/developer-essentials/skills/error-handling-patterns) | `a30778f` (2026-09-01) | MIT (`license: MIT` in the skill) | Seth Hobson |
| `principle-attack-the-premise` | [cursor/plugins pstack/skills/principle-attack-the-premise](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-attack-the-premise) | `9d76bca` | MIT | Lauren Tan |
| `principle-boundary-discipline` | [cursor/plugins pstack/skills/principle-boundary-discipline](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-boundary-discipline) | `9d76bca` | MIT | Lauren Tan |
| `principle-build-the-lever` | [cursor/plugins pstack/skills/principle-build-the-lever](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-build-the-lever) | `9d76bca` | MIT | Lauren Tan |
| `principle-encode-lessons-in-structure` | [cursor/plugins pstack/skills/principle-encode-lessons-in-structure](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-encode-lessons-in-structure) | `9d76bca` | MIT | Lauren Tan |
| `principle-explain-the-number` | [cursor/plugins pstack/skills/principle-explain-the-number](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-explain-the-number) | `9d76bca` | MIT | Lauren Tan |
| `principle-foundational-thinking` | [cursor/plugins pstack/skills/principle-foundational-thinking](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-foundational-thinking) | `9d76bca` | MIT | Lauren Tan |
| `principle-laziness-protocol` | [cursor/plugins pstack/skills/principle-laziness-protocol](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-laziness-protocol) | `9d76bca` | MIT | Lauren Tan |
| `principle-make-operations-idempotent` | [cursor/plugins pstack/skills/principle-make-operations-idempotent](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-make-operations-idempotent) | `9d76bca` | MIT | Lauren Tan |
| `principle-migrate-callers-then-delete-legacy-apis` | [cursor/plugins pstack/skills/principle-migrate-callers-then-delete-legacy-apis](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-migrate-callers-then-delete-legacy-apis) | `9d76bca` | MIT | Lauren Tan |
| `principle-minimize-reader-load` | [cursor/plugins pstack/skills/principle-minimize-reader-load](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-minimize-reader-load) | `9d76bca` | MIT | Lauren Tan |
| `principle-model-the-domain` | [cursor/plugins pstack/skills/principle-model-the-domain](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-model-the-domain) | `9d76bca` | MIT | Lauren Tan |
| `principle-separate-before-serializing-shared-state` | [cursor/plugins pstack/skills/principle-separate-before-serializing-shared-state](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-separate-before-serializing-shared-state) | `9d76bca` | MIT | Lauren Tan |
| `principle-sequence-verifiable-units` | [cursor/plugins pstack/skills/principle-sequence-verifiable-units](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-sequence-verifiable-units) | `9d76bca` | MIT | Lauren Tan |
| `principle-subtract-before-you-add` | [cursor/plugins pstack/skills/principle-subtract-before-you-add](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-subtract-before-you-add) | `9d76bca` | MIT | Lauren Tan |
| `principle-test-behavior-not-implementation` | [cursor/plugins pstack/skills/principle-test-behavior-not-implementation](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-test-behavior-not-implementation) | `9d76bca` | MIT | Lauren Tan |
| `principle-type-system-discipline` | [cursor/plugins pstack/skills/principle-type-system-discipline](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/principle-type-system-discipline) | `9d76bca` | MIT | Lauren Tan |

`oh-my-issues` is Apache-2.0; the upstream NOTICE file reads:

> Claude-Mem
> Copyright 2026 Alex Newman
>
> This product includes software developed for the Claude-Mem project.
>
> Licensed under the Apache License, Version 2.0.

### Changes made here

Every skill had its frontmatter reduced to the keys this marketplace uses (`name`, `description`,
and where present `argument-hint`, `disable-model-invocation`, `license`, `metadata`). Beyond that:

- `constraint-driven-development`: references to sibling skills in the upstream pack
  (`interview-me`, `code-review-and-quality`, `ci-cd-and-automation`, `test-driven-development`,
  `security-and-hardening`) repointed at `software:interview-me`, `software:tdd`,
  `software:security-and-hardening` and `software:performance-optimization`, or reduced to plain prose;
  the lifecycle table's `/build`, `/test`, `/review`, `/ship` command column became a "When" column;
  `/build auto` became "an autonomous build loop".
- `performance-optimization`: the repo-level `references/performance-checklist.md` it cites was
  copied into `references/` and the four links (two in `SKILL.md`, two in
  `references/optimization-patterns.md`) repointed at it.
- `source-driven-development`: `security-and-hardening` → `software:security-and-hardening`.
- `deprecation-and-migration`: the `incremental-implementation` sibling reference became one plain
  sentence.
- `error-handling-patterns`: copied from wshobson/agents' `developer-essentials` plugin into the
  `tools` plugin on 2026-09-01; moved here from `tools` in the v3 taxonomy (2026-11-05).
- `ponytail`: the folded description became a single line; `/ponytail` → `/software:ponytail`. The
  upstream plugin's hooks and statusline (level persistence, auto-activation) are not vendored;
  the skill's rules are complete without them.
- `karpathy-coder`: the upstream plugin's `hooks/karpathy-gate.sh` was moved into `scripts/` (its
  script-directory lookup fixed accordingly) and `agents/karpathy-reviewer.md` became
  `references/review-procedure.md`, with tool paths written as
  `${CLAUDE_PLUGIN_ROOT}/skills/karpathy-coder/scripts/…`; the `/karpathy-check` command and the
  `karpathy-reviewer` sub-agent sections became a "Running the review" section pointing at that
  procedure; the cross-tool install table and the `self-eval`/`code-reviewer`/`llm-wiki` chain list
  were dropped; `references/enforcement-patterns.md` was repointed (plugin install line, hook path,
  and `tools/karpathy/` for the Husky, pre-commit and CI examples, which run without the plugin);
  `expected_outputs/` test fixtures were dropped. Frontmatter `context: fork`, `author`, `tags` and
  `compatible_tools` were removed; `version` moved under `metadata`.
- All sixteen `principle-*` skills (from pstack): `disable-model-invocation: true` was removed from
  the frontmatter. Upstream set it because Cursor's `poteto-mode` router (not vendored) read the
  skills for the model; in Claude Code the flag hides a skill from the model and blocks
  skill-to-skill invocation, which would leave the "Apply when ..." principles unreachable.
  Principle references by relative path or bold name use `craft:<name>` (they used `pstack:<name>`
  before v3); the principles upstream that were not vendored (`prove-it-works`,
  `fix-root-causes`, `redesign-from-first-principles`, `exhaust-the-design-space`,
  `outcome-oriented-execution`, `guard-the-context-window` and others) became one plain sentence
  each. The other ten principle skills: frontmatter only.
- `principle-attack-the-premise`, `principle-build-the-lever`, `principle-explain-the-number`,
  `principle-minimize-reader-load`, `principle-sequence-verifiable-units`,
  `principle-type-system-discipline`: relative cross-links repointed to `pstack:` names (now
  `craft:` names); links to the non-vendored principles became one plain sentence each.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-boundary-discipline`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-build-the-lever`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-encode-lessons-in-structure`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-explain-the-number`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-foundational-thinking`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-laziness-protocol`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-make-operations-idempotent`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-migrate-callers-then-delete-legacy-apis`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-minimize-reader-load`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-model-the-domain`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-separate-before-serializing-shared-state`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-sequence-verifiable-units`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-subtract-before-you-add`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-test-behavior-not-implementation`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `principle-type-system-discipline`: moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
  All six are in this plugin (`diagnosing-bugs` as `debug`'s hard-bug mode); the same note
  appears under each former plugin that held one of them.
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
  All six are in this plugin; the same note appears under each former plugin that held one
  of them.

## From the former `stack` plugin

Every skill in this plugin except `server-component-rules` (first-party, moved here from `dev` in
the v3 taxonomy; its skill file names no upstream) is a copy of an upstream skill, taken at the commit below and kept
under its upstream license. Where the upstream repository is itself a mirror of another
project's skill, the original project is named as the author.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `gsap-core` | [greensock/gsap-skills · skills/gsap-core](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-core) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-timeline` | [greensock/gsap-skills · skills/gsap-timeline](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-timeline) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-scrolltrigger` | [greensock/gsap-skills · skills/gsap-scrolltrigger](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-scrolltrigger) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-plugins` | [greensock/gsap-skills · skills/gsap-plugins](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-plugins) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-utils` | [greensock/gsap-skills · skills/gsap-utils](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-utils) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-react` | [greensock/gsap-skills · skills/gsap-react](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-react) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `gsap-frameworks` | [greensock/gsap-skills · skills/gsap-frameworks](https://github.com/greensock/gsap-skills/tree/aed9cfd/skills/gsap-frameworks) (examples from `examples/vue` and `examples/nuxt` at the same commit) | `aed9cfd` (2026-04-21) | MIT (repo LICENSE) | GreenSock |
| `react-best-practices` | [davila7/claude-code-templates · cli-tool/components/skills/development/react-best-practices](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/react-best-practices) | `45b9b21` (2026-10-10) | MIT (davila7 repo LICENSE); upstream license not verified in the mirror | Vercel Engineering, mirrored from vercel-labs/agent-skills |
| `react-useeffect` | [davila7/claude-code-templates · cli-tool/components/skills/development/react-useeffect](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/react-useeffect) | `45b9b21` (2026-10-10) | MIT (repo LICENSE) | davila7/claude-code-templates, distilled from the React docs' "You Might Not Need an Effect" |
| `shadcn` | [davila7/claude-code-templates · cli-tool/components/skills/web-development/shadcn](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/web-development/shadcn) | `45b9b21` (2026-10-10) | MIT (davila7 repo LICENSE); upstream license not verified in the mirror | shadcn, mirrored from shadcn-ui/ui `skills/shadcn` |
| `postgres-best-practices` | [davila7/claude-code-templates · cli-tool/components/skills/development/postgres-best-practices](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/postgres-best-practices) | `45b9b21` (2026-10-10) | MIT (per-skill `license: MIT` and `author: supabase` in its frontmatter) | Supabase, mirrored from supabase/agent-skills |
| `swift-concurrency-expert` | [davila7/claude-code-templates · cli-tool/components/skills/development/swift-concurrency-expert](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/swift-concurrency-expert) | `45b9b21` (2026-10-10) | MIT (stated as "Dimillian/Skills (MIT)" in the mirror's frontmatter) | Thomas Ricouard (Dimillian/Skills) |
| `prisma-patterns` | [affaan-m/ECC · skills/prisma-patterns](https://github.com/affaan-m/ECC/tree/2d515e4/skills/prisma-patterns) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `database-migrations` | [affaan-m/ECC · skills/database-migrations](https://github.com/affaan-m/ECC/tree/2d515e4/skills/database-migrations) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `cpp-coding-standards` | [affaan-m/ECC · skills/cpp-coding-standards](https://github.com/affaan-m/ECC/tree/2d515e4/skills/cpp-coding-standards) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `motion-foundations` | [affaan-m/ECC · skills/motion-foundations](https://github.com/affaan-m/ECC/tree/2d515e4/skills/motion-foundations) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | "jeff" (upstream `author` field), in Affaan Mustafa's repo |
| `motion-patterns` | [affaan-m/ECC · skills/motion-patterns](https://github.com/affaan-m/ECC/tree/2d515e4/skills/motion-patterns) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | "jeff" (upstream `author` field), in Affaan Mustafa's repo |
| `motion-advanced` | [affaan-m/ECC · skills/motion-advanced](https://github.com/affaan-m/ECC/tree/2d515e4/skills/motion-advanced) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | "jeff" (upstream `author` field), in Affaan Mustafa's repo |
| `boost-asio-pro` | [alirezarezvani/claude-skills · engineering/boost-asio-pro](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/boost-asio-pro) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani; its worked examples link to alexprivalov/boost-asio-skill |
| `remotion-best-practices` | [exiao/skills · design/remotion](https://github.com/exiao/skills/tree/7d2be64/design/remotion) | `7d2be64` (2026-07-27) | MIT (exiao README); upstream license not verified in the mirror | Remotion, mirrored from remotion-dev/skills |
| `postgresql-table-design` | [wshobson/agents · plugins/database-design/skills/postgresql-table-design](https://github.com/wshobson/agents/tree/46891e7/plugins/database-design/skills/postgresql-table-design) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `dotnet-backend-patterns` | [wshobson/agents · plugins/dotnet-contribution/skills/dotnet-backend-patterns](https://github.com/wshobson/agents/tree/46891e7/plugins/dotnet-contribution/skills/dotnet-backend-patterns) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `typescript-best-practices` | [cursor/plugins pstack/skills/typescript-best-practices](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/typescript-best-practices) | `9d76bca` | MIT | Lauren Tan |

### Changes made here

Every skill keeps its upstream `name` and had non-standard frontmatter keys removed. Beyond that:

- `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-utils`, `gsap-react`, `gsap-frameworks`: sibling references rewritten from `gsap-x` to `stack:gsap-x`. `gsap-core` dropped its pointer to `gsap-performance`, which is not vendored here.
- `gsap-scrolltrigger`: typo `Max.max` corrected to `Math.max` in the horizontal-scroll (`containerAnimation`) example.
- `gsap-frameworks`: the repo-root `examples/vue/` and `examples/nuxt/` projects it points at were copied into `references/examples/` and the pointers repointed. In the Nuxt example's `app/pages/index.vue`, the cleanup that called `ctx.revert()` inside a second `onMounted` was moved to `onUnmounted` (which the file already imported), matching the skill's own rule.
- `react-best-practices`: dropped the upstream contributor `README.md` (build instructions for a `src/` that is not here) and `rules/_template.md`. `AGENTS.md`, `metadata.json`, `rules/_sections.md` and all 45 rule files kept.
- `react-useeffect`: dropped `README.md`, which restated `SKILL.md` and the two reference files.
- `shadcn`: dropped `agents/openai.yml`, its two icon PNGs, `evals/evals.json` and `mcp.md` (not referenced by `SKILL.md`). Frontmatter keys `risk`, `source`, `date_added` and `user-invocable: false` removed (the source URL moved into `metadata`, and the skill can now be invoked as `software:react-typescript` (topic `shadcn`)); description rewritten to add "Use when" triggers from the skill's own "When to Use" list. The dynamic `` !`npx shadcn@latest info --json` `` load-time include was turned into an explicit first step, so loading the skill runs nothing; the model runs the command itself when it starts the work.
- `postgres-best-practices`: dropped the upstream contributor `README.md`, `rules/_template.md` and `rules/_contributing.md`. `AGENTS.md`, `metadata.json`, `rules/_sections.md` and all rule files kept.
- `swift-concurrency-expert`: dropped `agents/openai.yaml`; frontmatter keys `risk`, `source`, `date_added` removed (source kept in `metadata`); description extended with "Use when" triggers from the skill's own "When to Use" list.
- `prisma-patterns`, `database-migrations`, `cpp-coding-standards`: `metadata.origin` removed (attribution lives here). `prisma-patterns`' Related Skills now point at `software:data` (topic `postgres-best-practices`) and `software:data` (topic `database-migrations`); `nestjs-patterns` and `backend-patterns` are not vendored and were dropped.
- `motion-foundations`, `motion-patterns`, `motion-advanced`: `tags`, `category` and `author` frontmatter keys removed (author kept under `metadata`); sibling references rewritten from `motion-x` to `stack:motion-x`.
- `boost-asio-pro`: the Cross-References section naming three unvendored upstream skills was removed. Links to the worked examples on GitHub stay.
- `remotion-best-practices`, `postgresql-table-design`, `dotnet-backend-patterns`, `motion-*` content, `cpp-coding-standards`, `database-migrations`: content unchanged.
- `typescript-best-practices`: `disable-model-invocation: true` was removed from the frontmatter
  (upstream set it for Cursor's `poteto-mode` router, not vendored; in Claude Code the flag hides
  the skill from the model); the Cursor-only `paths:` glob key moved under `metadata:`;
  principle references repointed in `SKILL.md` and `references/patterns.md` (to `pstack:` names,
  now `craft:` names). The upstream folder's MIT license is reproduced as `LICENSE-pstack.txt`.
  Moved here from the `pstack` plugin in the v3 taxonomy (2026-11-05).

## From the former `security` plugin

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `security-and-hardening` | [addyosmani/agent-skills — skills/security-and-hardening](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/security-and-hardening) (plus repo-level `references/security-checklist.md`) | `1be8e34` (2026-10-10) | MIT (repo LICENSE) | Addy Osmani |
| `agent-security-hardening` | [affaan-m/ECC — skills/agent-security-hardening](https://github.com/affaan-m/ECC/tree/2d515e4/skills/agent-security-hardening) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `mcp-dependency-review` | [affaan-m/ECC — skills/mcp-dependency-review](https://github.com/affaan-m/ECC/tree/2d515e4/skills/mcp-dependency-review) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `skill-security-auditor` | [alirezarezvani/claude-skills — engineering/skills/skill-security-auditor](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/skill-security-auditor) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `security-best-practices` | [davila7/claude-code-templates — cli-tool/components/skills/security/security-best-practices](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/security/security-best-practices), a mirror of openai/skills | `45b9b21` (2026-10-10) | Apache-2.0 (`LICENSE.txt` in the skill dir; the mirror repo is MIT) | OpenAI (`author: openai` in the mirror) |
| `security-threat-model` | [davila7/claude-code-templates — cli-tool/components/skills/security/security-threat-model](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/security/security-threat-model), a mirror of openai/skills | `45b9b21` (2026-10-10) | Apache-2.0 (`LICENSE.txt` in the skill dir; the mirror repo is MIT) | OpenAI (`author: openai` in the mirror) |
| `git-guardrails-claude-code` | [mattpocock/skills — skills/misc/git-guardrails-claude-code](https://github.com/mattpocock/skills/tree/49dd158/skills/misc/git-guardrails-claude-code) | `49dd158` (2026-10-09) | MIT (repo LICENSE) | Matt Pocock |
| `block-no-verify-hook` | [wshobson/agents — plugins/block-no-verify/skills/block-no-verify-hook](https://github.com/wshobson/agents/tree/46891e7/plugins/block-no-verify/skills/block-no-verify-hook) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | cskwork (the `block-no-verify` plugin's author), in Seth Hobson's wshobson/agents |

### Changes made here

- `security-and-hardening`: copied the repo-level `references/security-checklist.md` into the skill's `references/` and repointed its three `../../references/...` links in `SKILL.md` and three `../../../references/...` links in `references/hardening-patterns.md`; replaced two mentions of sibling skills not vendored here (`observability-and-instrumentation`, `debugging-and-error-recovery`) with plain sentences.
- `agent-security-hardening`: dropped the `metadata.origin` line (provenance lives here); the "When NOT to Use" and "Related Skills" references to upstream siblings (`security-review`, `security-scan`, `agent-harness-construction`) now point at `software:security-and-hardening`, `software:security-best-practices`, `software:security-sweep` and `software:mcp-dependency-review`. Method untouched.
- `mcp-dependency-review`: dropped the `metadata.origin` line; the `npx --package` parsing example used the upstream product's own package name and now uses a neutral `example-mcp-tools example-mcp`; "Related Skills" repointed to `agents:mcp-builder`, `software:security-and-hardening`, `software:security-sweep`; "this ECC skill" became "this skill". Classification tables and workflow untouched.
- `skill-security-auditor`: the folded multi-line description is now one line and no longer names other hosts' skill formats; every `python3 scripts/...` invocation now uses `${CLAUDE_PLUGIN_ROOT}/skills/skill-security-auditor/scripts/skill_security_auditor.py`, and the GitHub Actions example says to copy the script into the repository first. The script itself is unchanged (made executable).
- `security-best-practices`: removed the `agents/openai.yaml` interface stub; the non-standard `author:` frontmatter key moved to `metadata.author`, with `license: Apache-2.0` added; one sentence that said "reviewed by codex" now says "reviewed here". The ten reference files are byte-for-byte upstream.
- `security-threat-model`: removed `agents/openai.yaml`; same frontmatter change; step 6 names the AskUserQuestion tool as the way to ask its 1–3 context questions. References untouched.
- `git-guardrails-claude-code`: removed `agents/openai.yaml`; step 2 now gives the script's `${CLAUDE_PLUGIN_ROOT}` path, explicit `cp` commands for each scope, and notes the `jq` dependency. The hook script is unchanged (made executable).
- `block-no-verify-hook`: added one paragraph under "Installation" telling Claude to merge into an existing settings file rather than overwrite it with the `cat >` snippets. Upstream's companion `/block-no-verify` command carried that instruction; the skill on its own did not.
- `security-sweep`: first-party (the marketplace owner's), moved here from the `code` plugin in the v3 taxonomy (2026-11-05); no third-party notice applies.

## From the former `ops` plugin

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `observability-and-instrumentation` | [addyosmani/agent-skills — skills/observability-and-instrumentation](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/observability-and-instrumentation) | `1be8e34` (2026-10-10) | MIT (repo LICENSE) | Addy Osmani |
| `kubernetes-patterns` | [affaan-m/ECC — skills/kubernetes-patterns](https://github.com/affaan-m/ECC/tree/2d515e4/skills/kubernetes-patterns) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `changelog-generator` | [alirezarezvani/claude-skills — engineering/skills/changelog-generator](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/changelog-generator) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `feature-flags-architect` | [alirezarezvani/claude-skills — engineering/skills/feature-flags-architect](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/feature-flags-architect) | `19392f7` (2026-08-26) | MIT (repo LICENSE and skill frontmatter) | Alireza Rezvani |
| `slo-architect` | [alirezarezvani/claude-skills — engineering/skills/slo-architect](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/slo-architect) | `19392f7` (2026-08-26) | MIT (repo LICENSE and skill frontmatter) | Alireza Rezvani |
| `chaos-engineering` | [alirezarezvani/claude-skills — engineering/skills/chaos-engineering](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/chaos-engineering) | `19392f7` (2026-08-26) | MIT (repo LICENSE and skill frontmatter) | Alireza Rezvani |
| `migration-architect` | [alirezarezvani/claude-skills — engineering/skills/migration-architect](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/migration-architect) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |
| `ship-gate` | [alirezarezvani/claude-skills — engineering/skills/ship-gate](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/ship-gate) | `19392f7` (2026-08-26) | MIT (skill frontmatter; the mirror of [rx4u/ship-gate](https://github.com/rx4u/ship-gate) cited in the scanner) | Rajaraman Arumugam |
| `ship-gate` (launch checklist, `references/launch-checklist.md`, `references/rollout-and-rollback.md`, `references/definition-of-done.md`, `references/performance-checklist.md`, `references/accessibility-checklist.md`; was `shipping-and-launch`) | [addyosmani/agent-skills — skills/shipping-and-launch](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/shipping-and-launch) | `1be8e34` (2026-10-10) | MIT (repo LICENSE) | Addy Osmani |
| `docker-development` | [alirezarezvani/claude-skills — engineering/docker-development/skills/docker-development](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/docker-development/skills/docker-development) | `19392f7` (2026-08-26) | MIT (repo LICENSE and skill frontmatter) | Alireza Rezvani |
| `terraform-patterns` | [alirezarezvani/claude-skills — engineering/terraform-patterns/skills/terraform-patterns](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/terraform-patterns/skills/terraform-patterns) | `19392f7` (2026-08-26) | MIT (repo LICENSE and skill frontmatter) | Alireza Rezvani |
| `wizard` | [mattpocock/skills — skills/engineering/wizard](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/wizard) | `49dd158` (2026-10-09) | MIT (repo LICENSE) | Matt Pocock |
| `github-actions-creator` | [davila7/claude-code-templates — cli-tool/components/skills/development/github-actions-creator](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/github-actions-creator) | `45b9b21` (2026-10-10) | MIT (repo LICENSE) | Daniel Ávila (claude-code-templates) |
| `dependency-updater` | [davila7/claude-code-templates — cli-tool/components/skills/development/dependency-updater](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/development/dependency-updater) | `45b9b21` (2026-10-10) | MIT (repo LICENSE, skill frontmatter and its README) | Daniel Ávila (claude-code-templates) |
| `dependabot-review` | [davila7/claude-code-templates — cli-tool/components/skills/workflow-automation/dependabot-review](https://github.com/davila7/claude-code-templates/tree/45b9b21/cli-tool/components/skills/workflow-automation/dependabot-review) | `45b9b21` (2026-10-10) | MIT (repo LICENSE and skill frontmatter) | Daniel Ávila (claude-code-templates) |
| `deployment-pipeline-design` | [wshobson/agents — plugins/cicd-automation/skills/deployment-pipeline-design](https://github.com/wshobson/agents/tree/46891e7/plugins/cicd-automation/skills/deployment-pipeline-design) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `postmortem-writing` | [wshobson/agents — plugins/incident-response/skills/postmortem-writing](https://github.com/wshobson/agents/tree/46891e7/plugins/incident-response/skills/postmortem-writing) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |

### Changes made here

- `observability-and-instrumentation`: the repo-level `../../references/observability-checklist.md` it cites was copied into `references/` and the link rewritten (its own `security-and-hardening` mention made plain); sibling-skill mentions repointed (`debugging-and-error-recovery` → `software:debug`, `shipping-and-launch` → `software:ship-gate`) or made plain prose (`performance-optimization`, `security-and-hardening`).
- `kubernetes-patterns`: dropped `metadata.origin: ECC` and the "When to Use" alias paragraph that existed for ECC's repo format; Related Skills repointed to `software:docker-development`, `software:deployment-pipeline-design`, `software:security-sweep` (the `git-workflow` line dropped).
- `changelog-generator`: deleted the upstream README (install steps for Codex/OpenClaw, otherwise a repeat of SKILL.md) and its link; added the `${CLAUDE_PLUGIN_ROOT}` path note.
- `feature-flags-architect`, `slo-architect`, `chaos-engineering`: frontmatter trimmed to name/description/license/metadata (dropped `context: fork`, tags, compatible_tools); `SKILL=engineering/...` quick-start paths rewritten to `${CLAUDE_PLUGIN_ROOT}/skills/<skill>`; the "Slash command" sections (`/flag-cleanup`, `/slo-design`, `/chaos-experiment`, upstream repo-root commands) dropped and removed from descriptions; sibling references namespaced (`software:feature-flags-architect`, `software:chaos-engineering`, `software:slo-architect`, `software:observability-and-instrumentation`, `software:postmortem-writing`) and non-vendored ones (`kubernetes-operator`, `incident-response`, `observability-designer`, `performance-profiler`, `red-team`, `threat-detection`) dropped or made plain prose, including in `slo-architect/references/composition.md` and its assets.
- `migration-architect`: deleted `expected_outputs/` (82 KB of sample JSON/text that no script reads) and the duplicate README; the quick-start sentence that cited them was adjusted.
- `ship-gate`: added a short pointer to `scripts/ship_gate_scanner.py` in Step 2 (upstream never names its own scanner); Integration Points repointed to `software:security-sweep` and `software:debug`, the rest (karpathy-coder, adversarial-reviewer, security-pen-testing, code-reviewer, backend-patterns, shadcn-stack) dropped. On 2026-11-05 its security rules gave way to `software:security-sweep`: the SEC prose in `references/checks.md` and the SEC section of `references/patterns.md` were removed (the SEC table stays for IDs and severities, SEC-03 and SEC-10 stay as manual checks the sweep does not cover), Step 2 runs the sweep and maps its severities, and the scanner's SEC checks are kept unchanged as the fallback when the sweep does not run.
- `shipping-and-launch`: the four repo-level checklists (definition-of-done, security, performance, accessibility) were copied into `references/` and links rewritten; their own "use alongside the X skill" lines now point at this skill and two `security-and-hardening` mentions became plain prose; `observability-and-instrumentation` → `software:observability-and-instrumentation`. Folded into `ship-gate` on 2026-11-05: its pre-launch checklist became `ship-gate/references/launch-checklist.md`, with each item mapped to a ship-gate check ID, a `software:security-sweep` auditor, a command to run or a manual confirmation, and ship-gate's report now ends with checklist status per section; its flag, staged-rollout, monitoring, error-budget and rollback-plan sections moved verbatim to `references/rollout-and-rollback.md` (ship-gate's "Launch plan" mode); its red flags and one rationalization joined ship-gate's Red Flags; the definition-of-done, performance and accessibility checklists moved to `ship-gate/references/` (sibling mentions in definition-of-done repointed to `software:ship-gate`, `software:security-sweep` and `software:observability-and-instrumentation`). Dropped: `references/security-checklist.md` (a copy of `software:security-and-hardening`'s `references/security-checklist.md`), the Overview, "When to Use", See Also and the rest of the rationalizations table, and the before/after-deploy Verification list (folded into the checklist's Release readiness and After deploying sections).
- `docker-development`, `terraform-patterns`: dropped the `/docker:*` and `/terraform:*` slash-command tables (commands lived at the upstream plugin root) and renamed the workflow headings; dropped the Installation section (clawhub, convert.sh); Related Skills repointed to `software:security-sweep`, `software:deployment-pipeline-design` (and `software:kubernetes-patterns` for docker), the rest dropped; terraform's description no longer lists host tools; `${CLAUDE_PLUGIN_ROOT}` path notes added.
- `wizard`: deleted `agents/openai.yaml` (Codex interface stub).
- `github-actions-creator`: added one sentence pointing at `references/workflow-templates.md`, which SKILL.md never mentioned.
- `dependency-updater`: deleted the README that repeated SKILL.md; added a path note for its scripts and a one-line pointer to `software:dependabot-review`.
- `dependabot-review`: added a one-line pointer to `software:dependency-updater`.
- `deployment-pipeline-design`: fixed `references/details.md`'s link to `advanced-strategies.md` (it pointed at `references/references/...`); Related Skills reduced to `software:github-actions-creator` (`gitlab-ci-patterns`, `secrets-management` dropped).
- `postmortem-writing`: unchanged beyond vendoring.

## From the former `agentic` plugin

The skills listed below are vendored, supply-chain-controlled copies of upstream skills; of the
former `agentic` skills that came to this plugin, the ones not listed (`rules-from-code`,
`engineering-rules`, `persona`) are first-party. Each row names the repository and path it was copied from, the commit and date, the license
verified in that repository, and the author.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `agent-memory` | [alirezarezvani/claude-skills — engineering/agent-memory/skills/agent-memory](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/agent-memory/skills/agent-memory) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani. Concept derived from [TencentCloud/TencentDB-Agent-Memory](https://github.com/TencentCloud/TencentDB-Agent-Memory) (MIT); upstream states no code was taken from it |
| `stow` | [kunchenguid/firstmate — skills/stow](https://github.com/kunchenguid/firstmate/tree/1a86871/skills/stow) | `1a86871` (2026-10-10) | MIT (repo LICENSE) | Kun Chen |
| `retro` | [mattpocock/skills — skills/engineering/retro](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/retro) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `correct` | [cursor/plugins pstack/skills/correct](https://github.com/cursor/plugins/tree/9d76bca/pstack/skills/correct) | `9d76bca` | MIT | Lauren Tan |
| `keys` | [agent0ai/dox](https://github.com/agent0ai/dox) — the DOX `AGENTS.md` framework, renamed KEYS and made `AGENTS.md`-only | not recorded | MIT | agent0ai |

### Changes made here

Every skill keeps its upstream `name:` (equal to its directory) and had its frontmatter
reduced to the keys Claude Code reads. Beyond that:

- `agent-memory` — the upstream `DESIGN.md` was copied to the skill root (the 69-check
  validator anchors on it) with its relative links repointed; the three hook scripts were
  copied from the upstream plugin root into `scripts/` with their import path fixed, and an
  opt-in `scripts/hooks.json` template replaces the upstream auto-wired hooks; the
  `/cs:memory` command (status, why, contested, adopt, forget) was folded into `SKILL.md` as
  script invocations; the `distinct_from` metadata naming unvendored siblings was dropped;
  references to sibling skills became prose naming the upstream repository.
- `stow` — removed the maintainers' HTML comment that named the Firstmate-internal twin.
- `retro`: `writing-for-agents` → `agents:writing-for-agents`; the description gained its
  triggers; a note that Claude Code keeps session logs under `~/.claude/projects/`.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `correct`: `disable-model-invocation: true` was removed from the frontmatter (upstream set it
  for Cursor's `poteto-mode` router, not vendored; in Claude Code the flag hides the skill from
  the model and blocks skill-to-skill invocation); otherwise frontmatter only. The pstack folder's
  MIT license is reproduced as `LICENSE-pstack.txt`. Moved here from the `pstack` plugin in the v3
  taxonomy (2026-11-05).
- `keys`: written for this marketplace on the DOX framework (agent0ai/dox, MIT), renamed KEYS
  and made `AGENTS.md`-only, with `keys.py` for scan, install and check. The provenance was
  recorded in the commit that added it to the `code` plugin (`4c3afe0`); moved here from `code`
  in the v3 taxonomy (2026-11-05).
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
  All six are in this plugin (`diagnosing-bugs` as `debug`'s hard-bug mode); the same note
  appears under each former plugin that held one of them.
