# work — Knowledge Work

Knowledge work, research and decisions: the parts of a working day that are not writing code.
Decide whether an idea is worth pursuing, research a question from sources, analyse data, run
product operations, review contracts and budgets, triage support, write clearly, and produce
slides, video, flashcards and other files. For a raw idea, start at `office-hours`; for a question
that needs sources, `deep-research`; for prose, `technical-writing`; for a new dataset,
`explore-data`.

Thirty-seven skills. Thirty-five are vendored copies (sixteen from Anthropic's knowledge-work
plugins, the rest from nine other repositories), `humanize` is adapted from upstream work, and
`mochi-deck` is first-party. All are maintained here.

```bash
claude plugin install work@skill-marketplace
```

## Skills

### Decide and research

Is this idea worth pursuing, and what do the sources say? These came from the 2.x `product`
plugin. When the answer is "build it", the spec and the technical design are in `software` (see
"How it works with the other plugins").

| Skill | Use it when |
|---|---|
| `office-hours` | "Is this worth building?", "I have an idea", "help me think through this". Startup mode runs six YC forcing questions (demand reality, status quo, desperate specificity, narrowest wedge, observation, future-fit) with anti-sycophancy rules; builder mode is an enthusiastic design partner. Both challenge premises, force 2-3 alternatives, and save a design doc to `docs/designs/`. |
| `prfaq` | "Create a PRFAQ", "work backwards". Amazon's Working Backwards coached in five stages: press release, customer FAQ, internal FAQ, verdict, plus a distillate for PRD creation. Writes to `docs/prfaq/`. |
| `plan-ceo-review` | "Think bigger", "expand scope", "is this ambitious enough". Founder-mode review in four modes (scope expansion, selective expansion, hold scope, scope reduction) with premise, leverage and dream-state challenges, then eleven review sections: architecture, error and rescue map, threat model, data-flow edge cases, code quality, tests, performance, observability, rollout, trajectory, design. Long and thorough by design. |
| `roast` | "Roast this idea", "convene the panel", a brutal second opinion before building. Five parallel reviewers (Critic, Champion, Analyst, Investigator, Customer) and a Judge that returns GO / RESHAPE / KILL with the cheapest 48-hour test; three stdlib scripts build the brief, weight the verdict and design the test. |
| `scientific-problem-selection` | A scientist is pitching a project, stuck on one, or asking a strategic question. Fischbach and Walsh's problem-choice framework (Cell, 2024) as nine skills with reference files: intuition pumps, risk matrix, optimization function, parameter strategy, decision trees, adversity, inversion, synthesis, meta-framework. |
| `deep-research` | A low-quality answer would be expensive: strategy, comparisons, hypothesis validation. Falsifiable hypotheses, parallel sub-agent fan-out, at least three differently-typed sources per thesis, per-source files with verbatim quotes, an adversarial pass and refresh targets. |
| `litreview` | Starting a literature review. Keyless PubMed E-utilities and OpenAlex searches, a PICO/SPIDER/Decomposition framework recommender, budgeted depth (5/10/20 queries) with a forcing checkpoint before spend, cross-search aggregation, and an eight-section research guide. |
| `deepread` | Deeply reading a book, article or document set. Five modes (quick, deep, map, feynman, book), claim/reason/evidence decomposition with four confidence labels, an evidence ledger, knowledge maps and Feynman teach-back. Treats source text as untrusted data. |
| `synthesize-research` | A pile of interview notes, survey responses or support tickets needs turning into findings. Six-step thematic analysis, affinity mapping, triangulation, behaviour-vs-stated-preference extraction, survey-analysis pitfalls, evidence-based personas and opportunity sizing. |

### Data

| Skill | Use it when |
|---|---|
| `explore-data` | A new table or file lands and you need its shape before analysing it: row grain, column classification, null rates, cardinality, distributions, placeholder values, duplicate keys, and which dimensions and metrics are worth slicing. Works on CSV, Parquet, JSON and Excel files; queries a warehouse through an MCP connector if you have one. |
| `validate-data` | An analysis is about to go to stakeholders. Methodology review, a pre-delivery QA checklist, a pitfall catalog (join explosion, average of averages, denominator shifting, partial periods, timezone mismatches, survivorship), sanity checks and a reproducibility template. Ends in Ready to share, Share with caveats, or Needs revision. |
| `sql-queries` | Writing, debugging or translating SQL. Side-by-side reference for PostgreSQL, Snowflake, BigQuery, Redshift and Databricks (dates, strings, JSON, performance) plus window-function, cohort-retention, funnel and deduplication patterns. A reference the model loads when relevant; not user-invoked. |
| `statistical-analyst` | An A/B test or experiment, or a metric to describe. Four modes: analyse experiment results (z-test, Welch's t-test or chi-square with confidence intervals and effect sizes), size an experiment before launch, interpret existing numbers, and describe a metric (descriptive statistics, trends, simple forecasts, outlier and anomaly detection). Three standard-library Python scripts; a ship/hold/extend framework keeps statistical and practical significance apart. The former `statistical-analysis` is Mode 4 and `references/descriptive-trend-and-outliers.md`. |
| `data-visualization` | Making a chart in Python: chart type by data relationship, when not to use pie, 3D or dual-axis charts, ready matplotlib, seaborn and plotly patterns, a number formatter and an accessibility checklist. Reference skill; not user-invoked. |
| `build-dashboard` | Turning query results or a pasted dataset into one self-contained HTML file with KPI cards, Chart.js charts, filters and a sortable table. The generated page loads Chart.js from the jsDelivr CDN (pinned version, SRI hash), so it needs network access when opened in a browser. |

### Product operations

| Skill | Use it when |
|---|---|
| `metrics-review` | A weekly, monthly or quarterly metrics review, a spike or drop to investigate, or raw numbers to turn into a scorecard with actions. North Star / L1 / L2 hierarchy, DAU/MAU stickiness, retention-curve reading, activation definition, OKR grading, review cadences and dashboard anti-patterns. |
| `roadmap-update` | Adding, reprioritising or re-dating roadmap items, or building a Now/Next/Later view from scratch. RICE, ICE, MoSCoW and value-vs-effort, dependency categories, 70/20/10 capacity allocation and a change-communication protocol that avoids roadmap whiplash. |
| `stakeholder-update` | Writing a status for executives, engineering, cross-functional partners, customers or the board, or announcing a launch. Audience templates, Green/Yellow/Red rules, the ROAM risk framework, an ADR format and facilitation guides for standup, planning, retro and demo. |
| `competitive-brief` | A competitive analysis of one or more competitors or a feature area: four-level competitive set, landscape axes, a feature matrix with rating scales, positioning-statement extraction, win/loss interview questions and lead/follow/monitor/ignore responses to trends. Uses web search. |
| `market-sizing-analysis` | TAM/SAM/SOM for a venture, pitch or plan: top-down, bottom-up and value-theory methods with formulas, a worked SaaS example and a list of data sources. |
| `startup-metrics-framework` | Defining or benchmarking startup metrics by business model and stage: MRR/ARR, CAC, LTV, payback, burn multiple, NDR, magic number, Rule of 40, GMV and take rate, DAU/MAU, K-factor, pipeline coverage. |

### Legal and finance

| Skill | Use it when |
|---|---|
| `review-contract` | Clause-by-clause review of a commercial agreement against your playbook, or generic market standards if you have none: twelve clause categories, GREEN/YELLOW/RED deviation tiers, ready-to-insert redlines with fallbacks and a three-tier negotiation strategy. Assists with the workflow; not legal advice. |
| `triage-nda` | An NDA arrives from sales or business development: a ten-section screen with market-standard defaults, GREEN/YELLOW/RED routing with timelines, and standard redline positions for non-solicits, residuals, perpetual terms and missing carveouts. Not legal advice. |
| `variance-analysis` | Budget vs actual, period-over-period or forecast variances: price/volume/mix, rate/mix, headcount and spend-category decompositions with worked numbers, materiality thresholds, narrative rules and anti-patterns, text waterfalls, bridge tables and MAPE tracking. Not financial advice. |

### Support

| Skill | Use it when |
|---|---|
| `ticket-triage` | A new support ticket or customer issue: category taxonomy with signal words, P1–P4 criteria with SLA expectations and auto-escalation triggers, a routing table, duplicate detection and first-response templates per category. |
| `customer-escalation` | Packaging an issue for engineering, product, security or leadership: escalate-vs-handle criteria, a tier table with what to include, business-impact dimensions, seven rules for reproduction steps, follow-up cadence by severity and de-escalation. |

### Writing

`technical-writing` is the entry for prose. The two style checks below it and `humanize` are the
passes it and you run over a draft.

| Skill | Use it when |
|---|---|
| `technical-writing` | Writing or reviewing docs, RFCs, readmes, PR bodies or commit messages. A layered standard: Diátaxis mode selection, Google developer style sentences, STE one-instruction sentences, Global English disambiguation, a worked before/after. Hands the AI-tell scrub to `work:humanize`. |
| `writing-clearly-and-concisely` | Any prose a person will read: documentation, commit messages, error text, reports. Strunk's *The Elements of Style* split into loadable sections plus Wikipedia's "signs of AI writing" field guide. 174 KB, nearly all of it the public-domain Strunk text and the Wikipedia guide; load one section at a time. |
| `writing-guidelines` | Reviewing documentation against the Vercel Writing Guidelines: content type, voice and tone (the "by monkeys" test), banned words, concision, structure and AI-generated tells, reported as `file:line`. Works from a pinned snapshot; can optionally fetch the live upstream to diff against it. |
| `humanize` | Writing or editing prose a person will read — docs, articles, commit messages, emails, posts. Composes for clarity, then scrubs a 29-pattern catalog of AI tells, then has a contrarian subagent (`agents/council-contrarian.md`, inside the skill) look for what still reads as generated. Not for text written for models to consume. Hands interface microcopy to `design:ux-writing` first. |
| `crafting-effective-readmes` | Creating, extending, updating or reviewing a README. Audience first; four templates (open source, personal, internal, config directory), a section checklist, and the Standard Readme spec, Art of README and Make a README as bundled references. |
| `to-questionnaire` | A decision the user cannot resolve alone. Fixes the recipient and what is needed back in two exchanges, then writes a most-important-first discovery questionnaire to `to-questionnaire-<slug>.md` for someone else to fill in. User-invoked only. |

### Media, knowledge and files

| Skill | Use it when |
|---|---|
| `frontend-slides` | Building a zero-dependency, animation-rich HTML slide deck, converting a PPTX to one, or enhancing an existing deck. Style presets, visual style previews, viewport-fitting rules, and references for each phase. |
| `video-editor` | Trimming, concatenating, overlays, crossfades, speed changes, cropping to 9:16, text, GIFs, frame extraction, audio ducking, loudness normalisation and mixing through `scripts/edit.sh`, a wrapper over ffmpeg 6+. `references/recipes.md` chains the commands into talking-head, slideshow, demo and ad workflows. |
| `file-conversion` | Converting a local file between image, audio, video, document or data formats with whatever is installed (ffmpeg, ImageMagick, pandoc, LibreOffice, Python). Inspects the real format first, never overwrites the input, verifies the output, keeps everything local. |
| `mochi-deck` | "Teach me X" or "turn this into flashcards." Teaches the concept, then packages it as a `.mochi` file for [Mochi](https://mochi.cards), built from a Markdown deck file that stays the source of truth. Runs on Mochi's free tier; `scripts/mochi_deck.py` is Python 3 stdlib. |
| `grounded-vault` | A Markdown wiki compiled from sources where every number and quote must link to an immutable raw file and every page must be cheaply checkable for drift against the code it describes. Three-layer layout, a page-header contract and `scripts/check_vault.py` (standard library plus git). |

## What these write and where they reach

Apart from the files named below, the sixteen Anthropic knowledge-work skills,
`market-sizing-analysis`, `startup-metrics-framework`, `technical-writing` and
`writing-clearly-and-concisely` carry no scripts and write nothing of their own; where a step says "if an MCP connector for X is available"
it uses one only if you have it configured. `competitive-brief` uses web search as part of its
method.

The decide-and-research skills, carried over from the 2.x `product` plugin:

- **`litreview`** runs four Python 3 standard-library scripts from
  `${CLAUDE_PLUGIN_ROOT}/skills/litreview/scripts/`. `free_search.py` calls the PubMed
  E-utilities and OpenAlex APIs over HTTPS (no key; `--mailto` opts into OpenAlex's polite pool).
  It also uses the Consensus MCP only if one is connected. `citation_tracker.py` keeps session
  counts in `~/.litreview_sessions/`. The final `.docx` guide needs Node.js with the `docx`
  package; without it the skill writes Markdown.
- **Web search.** `office-hours`, `plan-ceo-review`, `roast` (the Investigator), `prfaq` (the web
  researcher) and `deep-research` use the WebSearch tool when it is available; `office-hours` asks
  before searching and sends only generalized category terms. `scientific-problem-selection` uses
  a PubMed MCP connector or web search when one is available.
- **Subagents.** `roast`, `prfaq` and `deep-research` fan out sub-agents through the Task tool.
- **`roast`** runs three standard-library scripts (brief builder, verdict synthesizer, test
  designer) from `${CLAUDE_PLUGIN_ROOT}/skills/roast/scripts/`.
- **Files written in the project**, as each method prescribes: `office-hours` saves design docs to
  `docs/designs/`; `plan-ceo-review` writes the review into the plan file under review (or
  `docs/plans/`), a CEO summary to `docs/designs/` in expansion modes, and approved deferrals to
  `TODOS.md`; `prfaq` writes to `docs/prfaq/`; `deep-research` persists its sources folder.
- **Size.** `plan-ceo-review` (62 KB) and `office-hours` (47 KB) are large single files: each is
  the complete upstream method with its sections inlined, so a run reads nothing outside its own
  file.

The rest of the plugin:

- **`build-dashboard`** writes one HTML file where you ask. That page loads Chart.js 4.5.1 and
  chartjs-adapter-date-fns 3.0.0 from `cdn.jsdelivr.net` with SRI hashes; your browser fetches
  them when you open the dashboard. The data stays embedded in the file.
- **`statistical-analyst`** runs three Python scripts under `scripts/`. Standard library only, no
  network, no files written.
- **`writing-guidelines`** works from its pinned `references/guidelines.md`; if you ask for the
  live rules it fetches `raw.githubusercontent.com/vercel-labs/writing-guidelines` and diffs.
- **`humanize`** edits the text you give it with Read, Write and Edit, and dispatches one subagent
  for its final audit. No scripts, no network.
- **`mochi-deck`** writes `<topic>-deck.md` and `<deck-name>.mochi` in the current directory or
  where you keep decks. Packing needs no account and no network. The script also has API commands
  (`push`, `list-decks`, `list-cards`, `create-deck`, `delete-card`) that call
  `https://app.mochi.cards/api` with a key from `MOCHI_API_KEY` or `~/.config/mochi/api_key`; they
  need a Mochi Pro subscription and run only when you ask for them. Without a key you get a local
  file.
- **`frontend-slides`** writes style previews to `.claude-design/slide-previews/` in the project
  during style discovery and deletes them at delivery. Surge deploys are optional, for decks the
  user already hosts there. One reference offers to generate complex SVGs through the Gemini API
  when `GEMINI_API_KEY` is set in the environment; without the key it hand-codes the SVG.
- **`grounded-vault`**'s `check_vault.py` runs `git diff` in the vault and prints findings. The
  docs suggest a pre-commit hook; nothing here installs one.
- **`video-editor`**'s `edit.sh` runs `ffmpeg` and `ffprobe` and writes only the `-o` path.
- **`file-conversion`** runs the local converters it finds and writes into a fresh directory it
  creates under the destination you name.
- **`to-questionnaire`** writes `to-questionnaire-<slug>.md` into the current directory.

Installing this plugin wires no hooks, no MCP servers and no background processes.

## How it works with the other plugins

The marketplace has five plugins: `software`, `design`, `game`, `agents` and `work`. This one is
for work that is not code; it hands a decision to build to `software` and a UI to `design`.

- **`software`.** `prfaq`'s verdict hands the PRFAQ to `software:spec --prd` for the PRD, and
  `prfaq` sends open-ended ideation to `software:product-brainstorming`. `office-hours` and
  `plan-ceo-review` point at `software:create-plan` for the implementation plan, and
  `plan-ceo-review` at `software:pre-flight` as the engineering gate. `roast` names
  `software:grilling` as the one-question-at-a-time alternative. Back the other way,
  `software:spec` routes an idea that is not yet a spec to `work:office-hours` and a plan that
  needs a scope review to `work:plan-ceo-review`. `software:show-me-your-work`,
  `software:blast-radius` and `software:human-gate` send prose through `work:humanize`. For an
  editable `.drawio` architecture diagram, use `software:drawio` (it moved there).
- **`design`.** `office-hours` and `plan-ceo-review` hand a plan with a UI to
  `design:plan-design-review`, which also reads the design docs `office-hours` writes.
  `humanize` is the marketplace's owner of AI-tell scrubbing: `design:design-doctrine` sends
  prose through it, `humanize` hands interface microcopy to `design:ux-writing`, and
  `design:ux-writing` borrows `humanize`'s scrub catalog.
  `frontend-slides` points at `design:frontend-design` and `design:impeccable` when a deck needs a
  stronger visual direction. `build-dashboard` is a BI page from query results; for a product
  screen built from design tokens, use `design:data-dashboard`.
- **`agents`** and **`game`.** No handoffs either way.
- **Inside.** `work:technical-writing` sends its AI-tell scrub to `work:humanize` and uses
  `work:writing-clearly-and-concisely` and `work:writing-guidelines` as its checks.
  `work:deep-research` points at `work:litreview` for academic sources, and `work:deepread` at
  `work:deep-research`. `prfaq` and `roast` name `work:office-hours` for an idea that is still
  raw.

## Moved in v3

| Before | Now |
|---|---|
| `tools:humanize` | `work:humanize` |
| `tools:mochi-deck` | `work:mochi-deck` |
| `pstack:technical-writing` | `work:technical-writing` |
| `design:frontend-slides` | `work:frontend-slides` |
| `work:drawio` | `software:drawio` |
| `work:statistical-analysis` | merged into `work:statistical-analyst` (Mode 4 and `references/descriptive-trend-and-outliers.md`) |
| `product:<skill>` (office-hours, prfaq, plan-ceo-review, roast, deep-research, litreview, deepread, synthesize-research, scientific-problem-selection) | `work:<skill>` |

The root [README](../../README.md#migrating-from-2x) has the full move table.

## Credits

Vendored skills are supply-chain-controlled copies: reviewed when they were pulled in, credited
with their upstream repository, path, commit, date, license and author in [NOTICE.md](NOTICE.md),
and re-pulled deliberately rather than tracked live. Sixteen, plus the statistics reference
folded into `statistical-analyst`, are from
[anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
(Apache-2.0; `scientific-problem-selection` carries its own `LICENSE.txt` and its method is
Fischbach and Walsh's, Cell 2024); the rest are from alirezarezvani (including `roast`,
`deep-research`, `litreview`, and `deepread` by xiehuan123), davila7, exiao, mattpocock, nexu-io
(a pinned copy of Vercel's writing guidelines) and wshobson under MIT, `office-hours` and
`plan-ceo-review` from Garry Tan's [gstack](https://github.com/garrytan/gstack) (MIT), `prfaq`
from BMad Code's [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (MIT), and
`technical-writing` from Lauren Tan's `pstack` in
[cursor/plugins](https://github.com/cursor/plugins) under MIT (license in `LICENSE-pstack.txt`). NOTICE.md also lists what was changed in each copy. Diff against
upstream before pulling changes in.

`humanize`'s AI-pattern catalog and voice guidance are adapted from
[blader/humanizer](https://github.com/blader/humanizer) by Siqi Chen (MIT), itself based on
Wikipedia's "Signs of AI writing" (CC BY-SA). Its clarity principles are adapted from
softaworks/agent-toolkit's `writing-clearly-and-concisely` (MIT), based on Strunk's *The
Elements of Style* (1918, public domain).
`mochi-deck` is the marketplace owner's.

## Invoking

Namespaced under the plugin: `work:office-hours`, `work:deep-research`, `work:roast`,
`work:validate-data`, `work:review-contract`, `work:technical-writing`, `work:humanize`, and so
on. `to-questionnaire` must be invoked by you
(`/work:to-questionnaire`); `sql-queries` and `data-visualization` are references the model loads
on its own and are not invocable.
