# ml — LLM Training and ML Pipelines

Nine vendored skills: seven that walk a language-model post-training run end to end — decide the
method, build the eval harness first, curate the data, configure LoRA/QLoRA, preference
optimization or GRPO/RLVR, then gate the checkpoint — and two that design retrieval and ranking
pipelines. The seven fine-tuning skills are one lifecycle and hand off to each other by name; the
other two stand alone.

```bash
claude plugin install ml@skill-marketplace
```

## Skills

### Fine-tuning lifecycle (in order)

| Skill | Use it when |
|---|---|
| `finetuning-method-selection` | Start here. Deciding whether to fine-tune at all (RAG and prompt-engineering off-ramps first), then routing by data shape to SFT, DPO/ORPO/KTO, GRPO/RLVR or continued pretraining; sizing the run with the memory-math worksheet; picking a base model from the dated size-class catalog in `references/model-catalog.md`. |
| `eval-harness-first` | Before any training config is written. Error analysis of 100+ traces into 4–8 failure buckets, one binary grader per bucket (deterministic first; runnable templates), judge calibration with TPR/TNR, a frozen drift suite, and the base-model baseline every later checkpoint is diffed against. Defines the `eval/` and `runs/` layout the other skills assume. |
| `dataset-curation` | Turning raw demonstrations, preference judgments or prompts into training rows: format by method, chat template applied before packing, assistant-only loss masking, manual inspection of packed sequences, the 25%-real floor for synthetic mixes, and the six-field dataset card that gates a run. |
| `lora-qlora-recipes` | Writing or reviewing a LoRA/QLoRA SFT config: all-linear target modules, alpha = 2r, rank by task, Unsloth defaults with the plain-TRL/PEFT mapping, LoRA vs QLoRA vs full fine-tune, and the three failure modes that look like training-loop bugs but are config choices. |
| `preference-optimization` | Preference pairs or thumbs-up/down feedback exist: choosing DPO, ORPO, KTO or SimPO, the per-method TRL configs, iterative on-policy DPO, and μ−2σ pair construction. |
| `grpo-rlvr-training` | Task success is algorithmically checkable (math, code, tool calls, structured output): the GRPO recipe with vLLM generation, composite format + correctness rewards, the mandatory 50–100-sample reward inspection, memory sizing by size class, and DAPO/Dr.GRPO/GSPO selection by observed failure mode. |
| `checkpoint-promotion` | A run produced a checkpoint: the four-stage gate (data hygiene, drift budget against the baseline, paired arena vs base, canary), the catastrophic-forgetting escalation ladder, and a `promotion-report.md` that ends in `PROMOTE` or `REJECT`. |

### Pipeline design

| Skill | Use it when |
|---|---|
| `rag-architect` | Designing a RAG pipeline, choosing a chunking strategy or embedding tier, picking a vector database, or evaluating retrieval against ground truth. Three stdlib-only Python scripts: a corpus-driven chunking optimizer, a requirements-to-design planner, and a precision/recall/MRR/NDCG evaluator. Recommends tiers and refuses to state vendor prices as current facts. |
| `recsys-pipeline-architect` | Any "top K items for a (user, context)" problem — content feeds, search ranking, RAG rerankers, task prioritizers, notification triage. The six-stage Source → Hydrator → Filter → Scorer → Selector → SideEffect pipeline, the product trade-offs to surface, and a runnable scaffold in your stack. |

## What these write and where they reach

`rag-architect` is the only skill here with scripts. Its three Python scripts
(`scripts/chunking_optimizer.py`, `scripts/rag_pipeline_designer.py`,
`scripts/retrieval_evaluator.py`) use only the standard library, read the corpus directory and
JSON files you pass them, and write one JSON result to the `-o` path you give them. They make no
network calls and run only when you invoke them.

The seven fine-tuning skills are guidance plus reference docs. Their code blocks (Unsloth and
TRL configs, grader and reward-function templates, the promotion-report template) are for you to
copy into your own project; nothing runs on install. The `eval/` and `runs/` directories they
describe are a layout contract for your project, not something the plugin creates.

Installing this plugin wires no hooks, no MCP servers and no background processes.

## Credits

Vendored skills are supply-chain-controlled copies: each is maintained here and re-pulled from
upstream deliberately, not automatically. The seven fine-tuning skills and
`recsys-pipeline-architect` come from [wshobson/agents](https://github.com/wshobson/agents) by
Seth Hobson (MIT), from its `llm-finetuning` and `machine-learning-ops` plugins at commit
`46891e7` (2026-10-04); `recsys-pipeline-architect` is itself Seth Hobson's single-file adapter of
[mturac/recsys-pipeline-architect](https://github.com/mturac/recsys-pipeline-architect) (MIT).
`rag-architect` comes from
[alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) by Alireza
Rezvani (MIT) at commit `19392f7` (2026-08-26). Exact paths, commits, licenses and the edits made
here are listed in NOTICE.md.

## Invoking

Namespaced under the plugin: `ml:finetuning-method-selection`, `ml:eval-harness-first`,
`ml:dataset-curation`, `ml:lora-qlora-recipes`, `ml:preference-optimization`,
`ml:grpo-rlvr-training`, `ml:checkpoint-promotion`, `ml:rag-architect`,
`ml:recsys-pipeline-architect`.
