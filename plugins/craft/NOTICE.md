# Third-party notices

Every skill in this plugin is a vendored copy of an upstream skill. Each keeps its upstream license;
the Author column names the copyright holder as the upstream LICENSE file states it.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `constraint-driven-development` | [addyosmani/agent-skills — skills/constraint-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/constraint-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `doubt-driven-development` | [addyosmani/agent-skills — skills/doubt-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/doubt-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `performance-optimization` | [addyosmani/agent-skills — skills/performance-optimization](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/performance-optimization) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `source-driven-development` | [addyosmani/agent-skills — skills/source-driven-development](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/source-driven-development) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `deprecation-and-migration` | [addyosmani/agent-skills — skills/deprecation-and-migration](https://github.com/addyosmani/agent-skills/tree/1be8e34/skills/deprecation-and-migration) | `1be8e34` (2026-10-10) | MIT | Addy Osmani |
| `improve` | [shadcn/improve — skills/improve](https://github.com/shadcn/improve/tree/cac56e1/skills/improve) | `cac56e1` (2026-09-12) | MIT | shadcn |
| `ponytail` | [DietrichGebert/ponytail — skills/ponytail](https://github.com/DietrichGebert/ponytail/tree/9b58c1f/skills/ponytail) | `9b58c1f` (2026-10-10) | MIT | Dietrich Gebert |
| `codebase-design` | [mattpocock/skills — skills/engineering/codebase-design](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/codebase-design) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `diagnosing-bugs` | [mattpocock/skills — skills/engineering/diagnosing-bugs](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/diagnosing-bugs) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `domain-modeling` | [mattpocock/skills — skills/engineering/domain-modeling](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/domain-modeling) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `prototype` | [mattpocock/skills — skills/engineering/prototype](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/prototype) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `retro` | [mattpocock/skills — skills/engineering/retro](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/retro) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `improve-codebase-architecture` | [mattpocock/skills — skills/engineering/improve-codebase-architecture](https://github.com/mattpocock/skills/tree/49dd158/skills/engineering/improve-codebase-architecture) | `49dd158` (2026-10-09) | MIT | Matt Pocock |
| `verification-before-completion` | [obra/superpowers — skills/verification-before-completion](https://github.com/obra/superpowers/tree/bb92a77/skills/verification-before-completion) | `bb92a77` (2026-10-09) | MIT | Jesse Vincent |
| `finishing-a-development-branch` | [obra/superpowers — skills/finishing-a-development-branch](https://github.com/obra/superpowers/tree/bb92a77/skills/finishing-a-development-branch) | `bb92a77` (2026-10-09) | MIT | Jesse Vincent |
| `ai-development-guide` | [shinpr/claude-code-workflows — skills/ai-development-guide](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/ai-development-guide) | `a4ecd62` (2026-10-01) | MIT | Shinsuke Kagawa |
| `oh-my-issues` | [thedotmack/claude-mem — plugin/skills/oh-my-issues](https://github.com/thedotmack/claude-mem/tree/fa8ab09/plugin/skills/oh-my-issues) | `fa8ab09` (2026-10-08) | Apache-2.0 | Alex Newman |
| `contract-first` | [affaan-m/ECC — skills/contract-first](https://github.com/affaan-m/ECC/tree/2d515e4/skills/contract-first) | `2d515e4` (2026-10-10) | MIT | Affaan Mustafa |
| `code-tour` | [affaan-m/ECC — skills/code-tour](https://github.com/affaan-m/ECC/tree/2d515e4/skills/code-tour) | `2d515e4` (2026-10-10) | MIT | Affaan Mustafa |
| `karpathy-coder` | [alirezarezvani/claude-skills — engineering/karpathy-coder/skills/karpathy-coder](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/karpathy-coder/skills/karpathy-coder) | `19392f7` (2026-08-26) | MIT | Alireza Rezvani |
| `make-pr-easy-to-review` | [cursor/plugins — cursor-team-kit/skills/make-pr-easy-to-review](https://github.com/cursor/plugins/tree/9d76bca/cursor-team-kit/skills/make-pr-easy-to-review) | `9d76bca` (2026-10-11) | MIT (`cursor-team-kit/LICENSE`) | Cursor |
| `architecture-decision-records` | [wshobson/agents — plugins/documentation-generation/skills/architecture-decision-records](https://github.com/wshobson/agents/tree/46891e7/plugins/documentation-generation/skills/architecture-decision-records) | `46891e7` (2026-10-04) | MIT | Seth Hobson |

`oh-my-issues` is Apache-2.0; the upstream NOTICE file reads:

> Claude-Mem
> Copyright 2026 Alex Newman
>
> This product includes software developed for the Claude-Mem project.
>
> Licensed under the Apache License, Version 2.0.

## Changes made here

Every skill had its frontmatter reduced to the keys this marketplace uses (`name`, `description`,
and where present `argument-hint`, `disable-model-invocation`, `license`, `metadata`). Beyond that:

- `constraint-driven-development`: references to sibling skills in the upstream pack
  (`interview-me`, `code-review-and-quality`, `ci-cd-and-automation`, `test-driven-development`,
  `security-and-hardening`) repointed at `product:interview-me`, `tools:test-driven-development`,
  `security:security-and-hardening` and `craft:performance-optimization`, or reduced to plain prose;
  the lifecycle table's `/build`, `/test`, `/review`, `/ship` command column became a "When" column;
  `/build auto` became "an autonomous build loop".
- `doubt-driven-development`: the upstream repo's `references/orchestration-patterns.md` and
  `agents/` persona roster are not vendored; the "personas do not invoke other personas" rule and
  the fresh-context reviewer are now stated in terms of Task-tool subagents and project
  `.claude/agents/`. `/review` became "post-hoc code review"; sibling references repointed at
  `craft:source-driven-development`, `tools:test-driven-development` and `tools:systematic-debugging`.
- `performance-optimization`: the repo-level `references/performance-checklist.md` it cites was
  copied into `references/` and the four links (two in `SKILL.md`, two in
  `references/optimization-patterns.md`) repointed at it.
- `source-driven-development`: `security-and-hardening` → `security:security-and-hardening`.
- `deprecation-and-migration`: the `incremental-implementation` sibling reference became one plain
  sentence.
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
- `retro`: `writing-for-agents` → `agentic:writing-for-agents`; the description gained its
  triggers; a note that Claude Code keeps session logs under `~/.claude/projects/`.
- `improve-codebase-architecture`: `codebase-design`, `grilling`, `domain-modeling` and the
  `/codebase-design` mentions in `HTML-REPORT.md` → `craft:codebase-design`, `product:grilling`,
  `craft:domain-modeling`; the description gained its triggers. The report still loads Tailwind and
  Mermaid from CDNs, as upstream.
- `ponytail`: the folded description became a single line; `/ponytail` → `/craft:ponytail`. The
  upstream plugin's hooks and statusline (level persistence, auto-activation) are not vendored;
  the skill's rules are complete without them.
- `finishing-a-development-branch`: "Superpowers created this worktree" →
  "`tools:using-git-worktrees` created this worktree".
- `contract-first`, `code-tour`: the `metadata.origin` key was dropped (credited here instead);
  related-skill lists repointed at `tools:api-design-principles` and `tools:test-driven-development`
  or reduced to plain prose (`api-design`, `ai-regression-testing`, `backend-patterns`,
  `frontend-patterns`, `tdd-workflow`, `documentation-lookup`, `codebase-onboarding`,
  `coding-standards`, `council`).
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
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
