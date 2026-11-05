# Third-party notices

This plugin was assembled on 2026-11-05 from former plugins. Each section below is the
notice of one former plugin, kept as written, with the rows for skills that went elsewhere
removed. A skill that no row names is first-party: `harvest`, `model-router` and the four
`herdr-*` skills (the former `herdr` plugin had no third-party content).

## From the former `agentic` plugin

The skills listed below are vendored, supply-chain-controlled copies of upstream skills; a skill
that is not listed (`harvest`, `model-router`) is first-party. The former `agentic` skills that
moved to `software` (`keys`, `rules-from-code`, `engineering-rules`, `agent-memory`, `stow`,
`retro`, `correct`, `persona`) are credited in `plugins/software/NOTICE.md`. Each row names the
repository and path it was copied from, the commit and date, the license verified in that
repository, and the author.

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `loop-design-check` | [affaan-m/ECC — skills/loop-design-check](https://github.com/affaan-m/ECC/tree/2d515e4/skills/loop-design-check) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa |
| `agent-architecture-audit` | [affaan-m/ECC — skills/agent-architecture-audit](https://github.com/affaan-m/ECC/tree/2d515e4/skills/agent-architecture-audit) | `2d515e4` (2026-10-10) | MIT (repo LICENSE) | Affaan Mustafa; the skill's own metadata names `oh-my-agent-check` as its origin |
| `autoresearch-agent` | [alirezarezvani/claude-skills — engineering/autoresearch-agent/skills/autoresearch-agent](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/autoresearch-agent/skills/autoresearch-agent) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani; inspired by [karpathy/autoresearch](https://github.com/karpathy/autoresearch) |
| `book-to-skill` | [alirezarezvani/claude-skills — engineering/book-to-skill/skills/book-to-skill](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/book-to-skill/skills/book-to-skill) | `19392f7` (2026-08-26) | MIT (repo LICENSE; `license: MIT` in the skill) | Alireza Rezvani; adapted from [virgiliojr94/book-to-skill](https://github.com/virgiliojr94/book-to-skill) (MIT) |
| `llm-friendly-context` | [shinpr/claude-code-workflows — skills/llm-friendly-context](https://github.com/shinpr/claude-code-workflows/tree/a4ecd62/skills/llm-friendly-context) | `a4ecd62` (2026-10-01) | MIT (repo LICENSE) | Shinsuke Kagawa |
| `writing-for-agents` | [mattpocock/skills — skills/productivity/writing-for-agents](https://github.com/mattpocock/skills/tree/49dd158/skills/productivity/writing-for-agents) | `49dd158` (2026-10-09) | MIT (repo LICENSE) | Matt Pocock |
| `cli-for-agents` | [cursor/plugins — cli-for-agent/skills/cli-for-agents](https://github.com/cursor/plugins/tree/9d76bca/cli-for-agent/skills/cli-for-agents) | `9d76bca` (2026-10-11) | MIT (per-plugin LICENSE, copyright Cursor) | Eric Zakariasson (Cursor) |
| `skill-creator` | [anthropics/skills — skills/skill-creator](https://github.com/anthropics/skills/tree/41bbe19/skills/skill-creator) | `41bbe19` (2026-09-03) | Apache-2.0 (`license:` in the skill) | Anthropic |
| `mcp-builder` | [anthropics/skills — skills/mcp-builder](https://github.com/anthropics/skills/tree/41bbe19/skills/mcp-builder) | `41bbe19` (2026-09-03) | Apache-2.0 (`license:` in the skill) | Anthropic |

### Changes made here

Every skill keeps its upstream `name:` (equal to its directory) and had its frontmatter
reduced to the keys Claude Code reads. Beyond that:

- `loop-design-check` — dropped the `origin: ECC` metadata (provenance lives here); the
  pointers to the upstream `autonomous-loops` / `continuous-agent-loop` mechanism skills and
  the `/goal` and `/schedule` commands became plain prose (Claude Code's `/loop` is kept);
  the closing pointer names `software:human-gate` and `agents:agent-architecture-audit`.
- `agent-architecture-audit` — dropped the non-standard `tools:` key; "do not use for" and
  "related skills" now point at `software:debug`, `software:security-sweep` and
  `agents:loop-design-check` instead of unvendored upstream skills; the report schema id lost
  its `ecc.` prefix; a note that the Grep tool is equivalent to `rg`.
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
  related skills now `agents:skill-creator` and `agents:writing-for-agents`; the pointer to the
  upstream plugin README became a URL. The placeholder links in `assets/master_skill_template.md`
  and the workflow reference's template block (`chapters/ch01-<slug>.md`, `glossary.md`, …) are
  written with spaces inside the parentheses so link checkers do not read them as dangling;
  CommonMark and the skill's own validator accept that form. Scripts untouched.
- `writing-for-agents` — dropped `agents/openai.yaml` (Codex interface metadata).
- `llm-friendly-context`, `cli-for-agents` — unchanged.
- `skill-creator`, `mcp-builder`: copied from anthropics/skills at `41bbe19` into the `meta`
  plugin; moved here when `meta` dissolved in the v3 taxonomy (2026-11-05).
- `skill-creator`, `mcp-builder`: the `LICENSE.txt` that each SKILL.md names was missing in this repository; the Apache-2.0 text, copied from the anthropics/skills `webapp-testing` LICENSE.txt (commit `dbd4588`), was added to each folder on 2026-11-05.

## From the former `ml` plugin

| Skill | Upstream | Commit | License | Author |
|---|---|---|---|---|
| `finetuning-method-selection` | [wshobson/agents — plugins/llm-finetuning/skills/finetuning-method-selection](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/finetuning-method-selection) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `eval-harness-first` | [wshobson/agents — plugins/llm-finetuning/skills/eval-harness-first](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/eval-harness-first) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `dataset-curation` | [wshobson/agents — plugins/llm-finetuning/skills/dataset-curation](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/dataset-curation) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `lora-qlora-recipes` | [wshobson/agents — plugins/llm-finetuning/skills/lora-qlora-recipes](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/lora-qlora-recipes) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `preference-optimization` | [wshobson/agents — plugins/llm-finetuning/skills/preference-optimization](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/preference-optimization) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `grpo-rlvr-training` | [wshobson/agents — plugins/llm-finetuning/skills/grpo-rlvr-training](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/grpo-rlvr-training) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `checkpoint-promotion` | [wshobson/agents — plugins/llm-finetuning/skills/checkpoint-promotion](https://github.com/wshobson/agents/tree/46891e7/plugins/llm-finetuning/skills/checkpoint-promotion) | `46891e7` (2026-10-04) | MIT (repo LICENSE) | Seth Hobson |
| `recsys-pipeline-architect` | [wshobson/agents — plugins/machine-learning-ops/skills/recsys-pipeline-architect](https://github.com/wshobson/agents/tree/46891e7/plugins/machine-learning-ops/skills/recsys-pipeline-architect) | `46891e7` (2026-10-04) | MIT (repo LICENSE); the skill states it is an independent single-file adapter (MIT) of [mturac/recsys-pipeline-architect](https://github.com/mturac/recsys-pipeline-architect) v0.1.0 (MIT), with no code copied | Seth Hobson; pattern and upstream project by mturac |
| `rag-architect` | [alirezarezvani/claude-skills — engineering/skills/rag-architect](https://github.com/alirezarezvani/claude-skills/tree/19392f7/engineering/skills/rag-architect) | `19392f7` (2026-08-26) | MIT (repo LICENSE) | Alireza Rezvani |

All nine SKILL.md files gained `license: MIT` in their frontmatter. The seven fine-tuning skills
keep upstream's hard-wrapped prose; nothing was reflowed.

### Changes made here

- `finetuning-method-selection` — sibling references repointed to `ml:<name>` (SKILL.md and both
  references); the `dgx-spark-ops` / `spark-memory-thermal-ops` hand-off and the "DGX Spark ops
  plugin" mention in `model-catalog.md` reduced to "outside this plugin's scope" / "this plugin".
- `eval-harness-first` — siblings repointed to `ml:<name>`; the `/finetune` command check became
  "check for the baseline file before any run starts"; the `llm-application-dev` /
  `llm-evaluation` pointer became "out of scope"; the `trace-to-training-data` bullet (skill not
  vendored) dropped from Related Skills.
- `dataset-curation` — siblings repointed to `ml:<name>` (SKILL.md and both references); four
  `/finetune` mentions rewritten as "to check before launching" / "training" (SKILL.md) and "the
  training run" (`synthetic-data.md`); `trace-to-training-data` and `vision-sft` (not vendored)
  dropped from the provenance field and Related Skills.
- `lora-qlora-recipes` — siblings repointed to `ml:<name>` (SKILL.md and both references); the
  `llm-finetuning-training-engineer` agent became "a training-engineer subagent" (twice); the
  `dgx-spark-ops` OOM-ladder pointer reduced to its retained advice ("bf16 LoRA is the next
  thing to try, not a further QLoRA shrink").
- `preference-optimization` — siblings repointed to `ml:<name>` (SKILL.md and
  `method-configs.md`); the training-engineer agent became "a training-engineer subagent"; the
  two `trace-to-training-data` pointers (not vendored) became one plain sentence each pointing
  at `agents:dataset-curation`.
- `grpo-rlvr-training` — siblings repointed to `ml:<name>` (SKILL.md and both references); the
  training-engineer agent became "a training-engineer subagent"; the `/finetune` Phase 1 gate
  became "the training run"; the `dgx-spark-ops` sentence in Related Skills dropped; in
  `grpo-memory.md` the `spark-training-gotchas` pointer reduced to its retained number (plan
  against 180–192 GB/s sustained).
- `checkpoint-promotion` — siblings repointed to `ml:<name>` (SKILL.md and `gate-templates.md`);
  `/finetune` Phase 5 and `/promote-checkpoint` became "the Phase 5 promotion step";
  `trace-to-training-data`'s Hygiene section became `agents:eval-harness-first`'s holdout rule;
  `quantized-export` (not vendored) became a plain "not covered by this plugin" bullet.
- `recsys-pipeline-architect` — the `npx skills add mturac/recsys-pipeline-architect` install line
  dropped; the upstream attribution it carries is kept, since the skill's own Hard Rules require
  it.
- `rag-architect` — frontmatter `name` unquoted and the description restructured to "what it
  does, then Use when", dropping the `llm-cost-optimizer` and `agenthub` pointers (not vendored);
  the three scripts moved from the skill root into `scripts/` and the SKILL.md commands now
  invoke them as `${CLAUDE_PLUGIN_ROOT}/skills/rag-architect/scripts/<file>`. One script fix:
  `retrieval_evaluator.py` read only a `query` key per query while the SKILL.md documented
  `{id, text}`, so it crashed on its own documented input; it now accepts `query` or `text`, and
  the SKILL.md names both keys. The other two scripts are unchanged.
