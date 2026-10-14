# Third-party notices

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

## Changes made here

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
  at `ml:dataset-curation`.
- `grpo-rlvr-training` — siblings repointed to `ml:<name>` (SKILL.md and both references); the
  training-engineer agent became "a training-engineer subagent"; the `/finetune` Phase 1 gate
  became "the training run"; the `dgx-spark-ops` sentence in Related Skills dropped; in
  `grpo-memory.md` the `spark-training-gotchas` pointer reduced to its retained number (plan
  against 180–192 GB/s sustained).
- `checkpoint-promotion` — siblings repointed to `ml:<name>` (SKILL.md and `gate-templates.md`);
  `/finetune` Phase 5 and `/promote-checkpoint` became "the Phase 5 promotion step";
  `trace-to-training-data`'s Hygiene section became `ml:eval-harness-first`'s holdout rule;
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
