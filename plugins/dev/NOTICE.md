# Third-party notices

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

## Changes made here
- `spec-driven-workflow`: script calls use `${CLAUDE_PLUGIN_ROOT}` paths; `engineering-team/tdd-guide` → `dev:tdd`, `focused-fix` → `dev:debug`, `rag-architect` dropped.
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
  `craft:source-driven-development`, `dev:tdd` and `dev:debug`.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `finishing-a-development-branch`: "Superpowers created this worktree" →
  "`dev:using-git-worktrees` created this worktree".
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `make-pr-easy-to-review`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `debug`: `tools:systematic-debugging` folded in (2026-11-05). The two were near-identical
  copies of superpowers' `systematic-debugging`; `debug` kept its wording ("Ultrathink", the
  overview line, Real-World Impact) and took `license: MIT` and the "fresh verification evidence"
  line, now pointing at `dev:verification-before-completion`. `find-polluter.sh` (bash, no
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
  `/trace` → `code:trace`; runtime checks are run by the agent where it can reach them. Dropped:
  the "Announce at start" line and the closing pep talk. The UI gate kit path now points at the
  `design` plugin's `shared/`.
- `unlazy`: `tools:unlazy-lite` (upstream v2.1.0) folded in as the lite mode (2026-11-05), with
  its behavioral rules as "Lite rules" and its triggers in the description. Dropped: its older
  `gate-check.mjs`, `stop-hook.mjs`, `install-hooks.mjs`, templates and references, which this
  skill's newer versions supersede; lite mode uses this skill's checker, approvals included.
  Moved here from the `tools` plugin, whose README held the credit, in the v3 taxonomy.
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `verification-before-completion`, `make-pr-easy-to-review`. Moved: `improve` to `architecture`, `ai-development-guide` to `craft`, `oh-my-issues` to `craft`, `architecture-decision-records` to `architecture`.
- `using-git-worktrees`, `git-advanced-workflows`: moved here from the `tools` plugin in the v3 taxonomy (2026-11-05); their credits were carried from the `tools` README. In the `tools` copy, `superpowers:` cross-references had been repointed at `tools:` and `dev:` skills and the author's eval scratch files dropped.
- `pre-flight`, and the post-flight mode of `check-implementation`: the marketplace owner's, moved from the `tools` plugin; no third-party notice applies.
