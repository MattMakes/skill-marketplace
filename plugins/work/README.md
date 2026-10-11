# work — Knowledge Work

Twenty-six vendored skills for the parts of a working day that are not writing code: analysing
data, running product operations, reviewing contracts and budgets, triaging support, writing
clearly, and producing diagrams and media files. Fifteen come from Anthropic's knowledge-work
plugins and the rest from eight other repositories; all are maintained here as copies.

```bash
claude plugin install work@skill-marketplace
```

## Skills

### Data

| Skill | Use it when |
|---|---|
| `explore-data` | A new table or file lands and you need its shape before analysing it: row grain, column classification, null rates, cardinality, distributions, placeholder values, duplicate keys, and which dimensions and metrics are worth slicing. Works on CSV, Parquet, JSON and Excel files; queries a warehouse through an MCP connector if you have one. |
| `validate-data` | An analysis is about to go to stakeholders. Methodology review, a pre-delivery QA checklist, a pitfall catalog (join explosion, average of averages, denominator shifting, partial periods, timezone mismatches, survivorship), sanity checks and a reproducibility template. Ends in Ready to share, Share with caveats, or Needs revision. |
| `sql-queries` | Writing, debugging or translating SQL. Side-by-side reference for PostgreSQL, Snowflake, BigQuery, Redshift and Databricks (dates, strings, JSON, performance) plus window-function, cohort-retention, funnel and deduplication patterns. A reference the model loads when relevant; not user-invoked. |
| `statistical-analysis` | Choosing and explaining statistics for business data: which centre and spread to report, percentile narratives, moving averages and growth formulas, three outlier methods with pandas snippets, a hypothesis-test selection table, and when to be cautious (multiple comparisons, Simpson's paradox, survivorship, false precision). Reference skill; not user-invoked. |
| `statistical-analyst` | An A/B test or experiment: run a z-test, Welch's t-test or chi-square with confidence intervals and effect sizes, size an experiment before launch, or put a confidence interval on a metric. Three standard-library Python scripts; a ship/hold/extend framework keeps statistical and practical significance apart. |
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

| Skill | Use it when |
|---|---|
| `writing-clearly-and-concisely` | Any prose a person will read: documentation, commit messages, error text, reports. Strunk's *The Elements of Style* split into loadable sections plus Wikipedia's "signs of AI writing" field guide. 174 KB, nearly all of it the public-domain Strunk text and the Wikipedia guide; load one section at a time. |
| `crafting-effective-readmes` | Creating, extending, updating or reviewing a README. Audience first; four templates (open source, personal, internal, config directory), a section checklist, and the Standard Readme spec, Art of README and Make a README as bundled references. |
| `writing-guidelines` | Reviewing documentation against the Vercel Writing Guidelines: content type, voice and tone (the "by monkeys" test), banned words, concision, structure and AI-generated tells, reported as `file:line`. Works from a pinned snapshot; can optionally fetch the live upstream to diff against it. |
| `to-questionnaire` | A decision the user cannot resolve alone. Fixes the recipient and what is needed back in two exchanges, then writes a most-important-first discovery questionnaire to `to-questionnaire-<slug>.md` for someone else to fill in. User-invoked only. |

### Diagrams, knowledge and files

| Skill | Use it when |
|---|---|
| `drawio` | An editable `.drawio` diagram: architecture, UML/ERD/sequence, BPMN, network or swimlane, hand-authored from a description or generated from Terraform, Kubernetes, compose, SQL, OpenAPI/AsyncAPI, protobuf, GraphQL, CI workflows or Python/JS/Go/Rust code; sync that preserves manual layout; executive/system/deployment/data-flow/security views; policy tests and architecture review; export to Mermaid, PPTX or HTML. 45 Python scripts (standard library; PyYAML is needed only for YAML specs and compose/CI/Kubernetes manifests, python-pptx only for `drawio2pptx.py`, Pillow only for image handling) and a 436 KB gzipped index of 10,446 official shapes, which is why this skill is about 1 MB. User-invoked only (`/work:drawio`); the draw.io desktop CLI and Graphviz are optional extras. |
| `grounded-vault` | A Markdown wiki compiled from sources where every number and quote must link to an immutable raw file and every page must be cheaply checkable for drift against the code it describes. Three-layer layout, a page-header contract and `scripts/check_vault.py` (standard library plus git). |
| `video-editor` | Trimming, concatenating, overlays, crossfades, speed changes, cropping to 9:16, text, GIFs, frame extraction, audio ducking, loudness normalisation and mixing through `scripts/edit.sh`, a wrapper over ffmpeg 6+. `references/recipes.md` chains the commands into talking-head, slideshow, demo and ad workflows. |
| `file-conversion` | Converting a local file between image, audio, video, document or data formats with whatever is installed (ffmpeg, ImageMagick, pandoc, LibreOffice, Python). Inspects the real format first, never overwrites the input, verifies the output, keeps everything local. |

## What these write and where they reach

The fifteen Anthropic knowledge-work skills, `sql-queries`, `market-sizing-analysis` and
`startup-metrics-framework` carry no scripts and write nothing; where a step says "if an MCP
connector for X is available" it uses one only if you have it configured. `competitive-brief`
uses web search as part of its method.

- **`build-dashboard`** writes one HTML file where you ask. That page loads Chart.js 4.5.1 and
  chartjs-adapter-date-fns 3.0.0 from `cdn.jsdelivr.net` with SRI hashes; your browser fetches
  them when you open the dashboard. The data stays embedded in the file.
- **`statistical-analyst`** runs three Python scripts under `scripts/`. Standard library only, no
  network, no files written.
- **`drawio`** runs its Python scripts only when invoked; they write the output paths you pass.
  Two scripts reach the network by design: `aiicons.py` fetches AI-vendor logos from the unpkg
  and simpleicons CDNs and `dbxicons.py` fetches Databricks icons from GitHub, both only when
  you ask for an icon (`--embed` inlines the SVG; without it the diagram references the CDN URL
  and draw.io fetches it when the file is opened). Their `--refresh-manifest` flags contact the
  upstream catalogs and are maintainer operations. `autolayout.py`, `c4.py` and `compress.py`
  shell out to Graphviz `dot`; native PNG/SVG/PDF export and `prdiff.py` shell out to the
  `drawio` binary and `git`; `tfstate.py`, `dockerimports.py` and `k8simports.py` only parse
  JSON you pipe in from `terraform`, `docker` and `kubectl`. Style presets you ask it to save
  go to `~/.drawio-skill/styles/`, the one location outside the skill directory. The
  `diagramctl_mcp.py` stdio MCP server exists only if you register it yourself.
- **`writing-guidelines`** works from its pinned `references/guidelines.md`; if you ask for the
  live rules it fetches `raw.githubusercontent.com/vercel-labs/writing-guidelines` and diffs.
- **`grounded-vault`**'s `check_vault.py` runs `git diff` in the vault and prints findings. The
  docs suggest a pre-commit hook; nothing here installs one.
- **`video-editor`**'s `edit.sh` runs `ffmpeg` and `ffprobe` and writes only the `-o` path.
- **`file-conversion`** runs the local converters it finds and writes into a fresh directory it
  creates under the destination you name.
- **`to-questionnaire`** writes `to-questionnaire-<slug>.md` into the current directory.

Installing this plugin wires no hooks, no MCP servers and no background processes.

## Credits

Every skill here is a vendored, supply-chain-controlled copy: reviewed when it was pulled in,
credited with its upstream repository, path, commit, date and license in [NOTICE.md](NOTICE.md),
and re-pulled deliberately rather than tracked live. Fifteen are from
[anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
(Apache-2.0); the rest are from Agents365-ai, alirezarezvani, davila7, exiao, mattpocock,
nexu-io (a pinned copy of Vercel's writing guidelines) and wshobson, under MIT. NOTICE.md
also lists what was changed in each copy. Diff against upstream before pulling changes in.

## Invoking

Namespaced under the plugin: `work:validate-data`, `work:review-contract`, `work:drawio`, and
so on. `drawio` and `to-questionnaire` must be invoked by you (`/work:drawio`,
`/work:to-questionnaire`); `sql-queries`, `statistical-analysis` and `data-visualization` are
references the model loads on its own and are not invocable.
