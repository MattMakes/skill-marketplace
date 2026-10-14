# Skill harvest, 2026-10-11

Fifty-eight GitHub repositories were named as sources. Fifty-seven cloned; one
(CVNA-Pathfinders/Carvana-Claude-Marketplace) could not be read anonymously and is presumably
private or gone. Between them they hold about five thousand `SKILL.md` files, most of them mirrors,
translations, fixtures or thin wrappers. Two hundred and five skills from twenty-three repositories
cleared the bar and now live in eleven new plugins.

## What landed

| Plugin | Skills | Size | Main sources |
|---|---|---|---|
| `craft` — Engineering Craft | 22 | 340 KB | addyosmani/agent-skills, mattpocock/skills, obra/superpowers, shinpr, affaan-m/ECC, alirezarezvani, cursor/plugins, thedotmack/claude-mem, wshobson, shadcn/improve, DietrichGebert/ponytail |
| `verify` — Verification and Testing | 22 | 1.1 MB | affaan-m/ECC, alirezarezvani, cursor/plugins, exiao/skills, garrytan/gstack, shinpr, anthropics/skills, davila7, wshobson |
| `pstack` — pstack Principles | 27 | 164 KB | cursor/plugins (Lauren Tan's pstack) |
| `product` — Product Thinking and Specs | 23 | 878 KB | anthropics/knowledge-work-plugins, addyosmani, mattpocock, affaan-m/ECC, alirezarezvani, bmad-code-org, davila7, garrytan/gstack, shinpr, exiao |
| `design` — Design Craft | 18 | 4.4 MB | nexu-io/open-design (hallmark, Emil Kowalski, Vercel), anthropics/skills, pbakaus/impeccable, affaan-m/ECC, thedotmack/claude-mem, davila7, alirezarezvani, nextlevelbuilder, exiao, wshobson |
| `stack` — Stack References | 23 | 769 KB | greensock/gsap-skills, davila7 (Vercel, Supabase, shadcn, Dimillian mirrors), affaan-m/ECC, alirezarezvani, exiao (Remotion mirror), wshobson |
| `ops` — Production Operations | 17 | 863 KB | alirezarezvani, addyosmani, affaan-m/ECC, mattpocock, davila7, wshobson |
| `security` — Security Practice | 8 | 568 KB | addyosmani, affaan-m/ECC, alirezarezvani, davila7 (openai/skills mirrors), mattpocock, wshobson |
| `agentic` — Agent Engineering | 10 | 691 KB | affaan-m/ECC, alirezarezvani, shinpr, kunchenguid/firstmate, mattpocock, cursor/plugins |
| `ml` — LLM Training and ML Pipelines | 9 | 276 KB | wshobson/agents, alirezarezvani |
| `work` — Knowledge Work | 26 | 1.7 MB | anthropics/knowledge-work-plugins, alirezarezvani, davila7, nexu-io/open-design (Vercel), mattpocock, Agents365-ai/drawio-skill, wshobson, exiao |

Each plugin's `README.md` says what every skill does and what it writes, runs or reaches; each
`NOTICE.md` records the upstream repository, path, commit, date, license and author per skill and
lists every edit made here.

## How it was done

1. Shallow-clone every repository; inventory every directory holding a `SKILL.md` with its name,
   description, size and the repository's license.
2. Eleven reviewers, one per batch of repositories, scored every plausible candidate against one
   rubric: standalone (works inside Claude Code without the source repo's CLI, MCP, daemon or
   config), substantive (a real method, checklist, reference or working script, not role prose),
   distinct (not a near-duplicate of a skill already here or of a stronger candidate), general (not
   repo-internal, a mirror, a translation or a fixture) and permissively licensed.
3. Final cut: every candidate scored 4 or 5, plus 3s that complete a coherent set or fill a gap.
   Near-duplicates were resolved to one copy (the GSAP set from GreenSock, not the open-design
   mirror; Vercel's React rules from the davila7 mirror, not the ECC adaptation; superpowers'
   verification skill from superpowers, not its mirrors).
4. Eleven adaptation passes, one per plugin: strip product coupling, copy referenced files into
   the skill directory, repoint sibling references to `<plugin>:<skill>`, map host-specific
   concepts (Cursor model slugs, Hermes sessions, gstack binaries, BMAD activation scripts,
   Anthropic connector placeholders) to Claude Code, drop unused payload, prove every script
   starts, run `claude plugin validate` and a link, frontmatter and leftover-coupling checker.

## Judgment calls worth knowing

- gstack's four skills (`office-hours`, `spec`, `plan-ceo-review`, `test-audit`) were rebuilt from
  their `SKILL.md.tmpl` and `sections/` files; the shipped `SKILL.md` carried thirty kilobytes of
  injected telemetry, browser and state-ledger preamble.
- pstack's twenty-seven skills shipped with `disable-model-invocation: true` because Cursor's
  poteto-mode router read them. That flag was removed so `pstack:<principle>` references resolve
  and the principles are reachable from the model; revert per skill if you prefer.
- `stack:shadcn` upstream injected `npx shadcn@latest info --json` on load through a `!` include.
  It is now an explicit first step, so loading the skill runs nothing.
- Bugs fixed on the way, each recorded in the plugin's NOTICE: `gsap-scrolltrigger` `Max.max`,
  `web-quality-audit`'s `analyze.sh` losing directory results and using PCRE under `grep -E`,
  `rag-architect`'s evaluator crashing on its own documented input, `a11y-audit` documenting CLI
  flags its scripts do not have, the Nuxt GSAP example cleaning up in a second `onMounted`.
- Hooks and settings: `security:git-guardrails-claude-code`, `security:block-no-verify-hook` and
  `agentic:agent-memory` can install Claude Code hooks, and `craft:karpathy-coder` ships a
  pre-commit gate; all only when you invoke them. Installing a plugin wires nothing.
- Binary download: `design:impeccable`'s launcher fetches a sha256-verified engine binary from
  its GitHub releases on first `context` run; its playbooks work without it.
- Network by design: `product:litreview` (PubMed, OpenAlex), `work:build-dashboard` pages (Chart.js
  from a CDN), `work:drawio` icon packs, `design:design-md` (`npx @google/design.md`),
  `ops:dependency-updater` (package registries), `craft:source-driven-development` (doc pages),
  and the research skills' web search.
- Large payloads kept on purpose: `design:impeccable` 2.1 MB, `design:ui-ux-pro-max` 1.3 MB
  (trimmed from 3.5 MB), `design:hallmark` 540 KB, `work:drawio` 1.1 MB, `verify:playwright-pro`
  544 KB, `security:security-best-practices` 436 KB.
- Licenses verified from a repository or per-skill LICENSE file in every case except these, which
  NOTICE files mark as "not verified in the mirror": exiao/skills (MIT by README statement only:
  `verify-feature`, `dogfood`, `adversarial-ux-test`, `ios-simulator`, `design-review`,
  `design-md`, `frontend-slides`, `plan-design-review`, `video-editor`, `remotion-best-practices`),
  the davila7 mirrors of Vercel (`react-best-practices`), shadcn-ui (`shadcn`), Kairo
  (`k6-load-testing`) and dhha22 (`devil`), `ops:ship-gate` (rx4u mirror, frontmatter only), the
  `emil-design-eng` and `review-animations` LICENSE naming a different holder, and the bundled
  references in `work:crafting-effective-readmes`.

## Notable but not taken, for license reasons

Decide these yourself; nothing here was copied.

| Repository | Skill | License | Why it was notable |
|---|---|---|---|
| ImCesar/cezaar | `plugins/crucible/skills/crucible` | NONE | Distinct panel method: two-round problem-framing then output-forging with 18 named thinking systems (catalog + selection |
| ImCesar/cezaar | `plugins/gh-dashboard/skills/project-status` | NONE | Small, standalone gh-based project dashboard (board, milestones, PRs, activity, what-next) with intent routing to per-se |
| ImCesar/cezaar | `plugins/staff-coach/skills/practice` | NONE | Socratic staff-engineer practice sessions with escalation ladders, an independent examiner, reconciliation dispositions |
| affaan-m/ECC | `skills/osint-investigation` | CC-BY-SA-4.0 | Substantive sparse-clue OSINT methodology (question definition, source tables per investigation type, lead testing, scop |
| anthropics/skills | `skills/docx` | proprietary (Anthropic, All rights reserved) | Production Word create/edit/tracked-changes skill with scripts; proprietary (All rights reserved, source-available) so c |
| anthropics/skills | `skills/pptx` | proprietary (Anthropic, All rights reserved) | Production PowerPoint skill (html2pptx, thumbnails, template editing); proprietary license, and already bundled in Claud |
| anthropics/skills | `skills/xlsx` | proprietary (Anthropic, All rights reserved) | Production spreadsheet skill with formula recalculation scripts; proprietary license, already bundled in Claude Code. |
| anthropics/skills | `skills/pdf` | proprietary (Anthropic, All rights reserved) | PDF read/merge/split/form-fill/OCR toolkit with scripts; proprietary license, already bundled in Claude Code. |
| bobmatnyc/claude-mpm | `plugin/skills/universal-security-security-scanning` | ELv2 | CI security scanning with tooling matrix, CI workflows, triage/remediation and SBOM references; non-permissive license b |
| bobmatnyc/claude-mpm | `plugin/skills/toolchains-javascript-frameworks-svelte5-runes-static` | ELv2 | Specific hydration gotchas for Svelte 5 runes under adapter-static with broken/working code pairs; non-permissive licens |
| bobmatnyc/claude-mpm | `plugin/skills/universal-infrastructure-env-manager` | ELv2 | Framework-aware env var validation with bundled Python scripts and security/synchronization references; non-permissive l |
| bobmatnyc/claude-mpm | `plugin/skills/toolchains-typescript-core` | ELv2 | 2025 tsconfig baseline, runtime-validation and advanced-pattern references; non-permissive license. |
| bobmatnyc/claude-mpm | `plugin/skills/universal-architecture-software-patterns` | ELv2 | Decision framework (foundational vs situational patterns, signals to apply, decision trees, anti-patterns) rather than a |
| davila7/claude-code-templates | `cli-tool/components/skills/development/hook-development` | NONE (uncertain | Appears to be Anthropic's plugin-dev plugin content from anthropics/claude-code (hook events, prompt-based hooks, patter |
| michaelshimeles/skills | `evidence-driven-testing` | NONE | Substantive proof-of-work protocol: a 56 KB cross-platform ffmpeg screen recorder (scripts/evidence.py) with doctor/star |
| rjs/shaping-skills | `shaping` | NONE | Ryan Singer Shape Up shaping notation (R requirements, A/B/C shapes, C3-A alternatives, binary fit checks, flagged unkno |
| rjs/shaping-skills | `breadboarding` | NONE | Affordance-table breadboarding (numbered UI and Code affordances, wires out, returns to, optional Mermaid) for mapping e |
| rjs/shaping-skills | `framing-doc` | NONE | Evidence-only frame from transcripts: verbatim source quotes, options landscape with signal strength, problem and outcom |
| rjs/shaping-skills | `kickoff-doc` | NONE | Territory-not-timeline builder reference from a kickoff transcript with decisions placed inline per system area and a th |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-use` | AGPL-3.0 repo | Mandatory prerequisite for use_figma with Plugin API rules, a grep-able plugin-api-standalone.d.ts, design-system refere |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-generate-design` | AGPL-3.0 repo | Workflow for building or updating full Figma screens from code or a description by discovering and importing published d |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-generate-library` | AGPL-3.0 repo | Phased design-system builder (discovery, tokens, components, theming, documentation) across many use_figma calls with ma |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-implement-design` | AGPL-3.0 repo | Ordered Figma-to-code workflow: parse node id, get_design_context with metadata fallback, screenshot as source of truth, |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-code-connect-components` | AGPL-3.0 repo | Code Connect mapping workflow (get_code_connect_suggestions then send_code_connect_mappings); only useful on Figma Organ |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/figma-create-design-system-rules` | AGPL-3.0 repo | Generates project-level Figma-to-code rule files (CLAUDE.md, AGENTS.md, Cursor rules) from codebase analysis; generic ru |
| warpdotdev-demos/warp-copy | `resources/bundled/mcp_skills/figma/edit-figma-design` | AGPL-3.0 repo | Text-to-Figma authoring workflow (resolve file, search design system, use_figma safely); unlike its siblings it has been |

## Every repository, and what came of it

"found" counts `SKILL.md` directories, including mirrors and fixtures; "taken" is the number vendored.

| Repository | Found | Taken | Skills taken, or why nothing was |
|---|---|---|---|
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 25 | 9 | craft:constraint-driven-development, craft:doubt-driven-development, craft:performance-optimization, craft:source-driven-development, craft:deprecation-and-migration, product:interview-me, ops:observability-and-instrumentation, ops:shipping-and-launch, security:security-and-hardening |
| [sdi2200262/agentic-project-management](https://github.com/sdi2200262/agentic-project-management) | 3 | 0 | APM framework docs, migration and templates; nothing stands without APM. |
| [wshobson/agents](https://github.com/wshobson/agents) | 184 | 24 | verify:python-anti-patterns, verify:bats-testing-patterns, verify:ai-debt-detector, craft:architecture-decision-records, design:design-system-patterns, design:screen-reader-testing, stack:postgresql-table-design, stack:saga-orchestration, stack:dotnet-backend-patterns, ops:deployment-pipeline-design, ops:postmortem-writing, security:block-no-verify-hook, work:grounded-vault, work:file-conversion, work:market-sizing-analysis, work:startup-metrics-framework, ml:finetuning-method-selection, ml:eval-harness-first, ml:dataset-curation, ml:lora-qlora-recipes, ml:preference-optimization, ml:grpo-rlvr-training, ml:checkpoint-promotion, ml:recsys-pipeline-architect |
| [dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) | 1 | 0 | One install skill for its vendored Oxlint rules; a niche TypeScript install step, not a method. |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 0 | 0 | A link list; no skills. |
| [jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code) | 0 | 0 | A link list; no skills. |
| [kunchenguid/axi](https://github.com/kunchenguid/axi) | 1 | 0 | A spec for agent-facing CLIs; agentic:cli-for-agents covers the same ground. |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 37 | 2 | product:prfaq, product:advanced-elicitation |
| [edonadei/caliper](https://github.com/edonadei/caliper) | 8 | 0 | Wrapper for the caliper eval CLI; the starter pack is sample fixtures. |
| [CVNA-Pathfinders/Carvana-Claude-Marketplace](https://github.com/CVNA-Pathfinders/Carvana-Claude-Marketplace) | clone failed | 0 | Clone failed: private or removed. |
| [automazeio/ccpm](https://github.com/automazeio/ccpm) | 1 | 0 | One delivery-workflow skill that overlaps the dev pipeline and needs a gh sub-issue extension. |
| [ImCesar/cezaar](https://github.com/ImCesar/cezaar) | 19 | 0 | No license. crucible and project-status were worth a look; see the flagged list. |
| [Chachamaru127/claude-code-harness](https://github.com/Chachamaru127/claude-code-harness) | 73 | 0 | Skills and references are in Japanese and depend on the harness scripts, Plans.md conventions and MCP. |
| [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router) | 0 | 0 | A model router; no skills. |
| [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | 915 | 17 | verify:k6-load-testing, product:devil, design:accessibility, design:core-web-vitals, design:web-quality-audit, stack:react-best-practices, stack:react-useeffect, stack:shadcn, stack:postgres-best-practices, stack:swift-concurrency-expert, ops:github-actions-creator, ops:dependency-updater, ops:dependabot-review, security:security-best-practices, security:security-threat-model, work:writing-clearly-and-concisely, work:crafting-effective-readmes |
| [shinpr/claude-code-workflows](https://github.com/shinpr/claude-code-workflows) | 113 | 5 | craft:ai-development-guide, verify:integration-e2e-testing, product:documentation-criteria, product:requirement-convergence, agentic:llm-friendly-context |
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | 36 | 2 | craft:oh-my-issues, design:design-is |
| [bobmatnyc/claude-mpm](https://github.com/bobmatnyc/claude-mpm) | 124 | 0 | Elastic License 2.0, not permissive; five notable skills are in the flagged list. |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | 846 | 28 | craft:karpathy-coder, verify:api-design-reviewer, verify:playwright-pro, verify:full-page-screenshot, product:spec-driven-workflow, product:grill-with-docs, product:code-to-prd, product:roast, product:deep-research, product:deepread, product:litreview, design:a11y-audit, stack:boost-asio-pro, ops:changelog-generator, ops:feature-flags-architect, ops:slo-architect, ops:chaos-engineering, ops:migration-architect, ops:ship-gate, ops:docker-development, ops:terraform-patterns, security:skill-security-auditor, agentic:agent-memory, agentic:human-gate, agentic:autoresearch-agent, ml:rag-architect, agentic:book-to-skill, work:statistical-analyst |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 0 | 0 | No SKILL.md. |
| [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) | 43 | 0 | Skills are 100 to 700 KB and coupled to the Compound Engineering config, the lfg pipeline and cross-model runners; ce-commit was the only standalone candidate and it overlaps existing practice. |
| [Agents365-ai/drawio-skill](https://github.com/Agents365-ai/drawio-skill) | 1 | 1 | work:drawio |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | 1049 | 20 | craft:contract-first, craft:code-tour, verify:santa-method, verify:click-path-audit, verify:windows-desktop-e2e, verify:react-testing, verify:ui-demo, product:intent-driven-development, design:make-interfaces-feel-better, stack:prisma-patterns, stack:database-migrations, stack:cpp-coding-standards, stack:motion-foundations, stack:motion-patterns, stack:motion-advanced, ops:kubernetes-patterns, security:agent-security-hardening, security:mcp-dependency-review, agentic:loop-design-check, agentic:agent-architecture-audit |
| [evo-hq/evo](https://github.com/evo-hq/evo) | 13 | 0 | Drives the evo CLI; finetuning mixes real method with the evo I/O contract. |
| [kunchenguid/firstmate](https://github.com/kunchenguid/firstmate) | 29 | 1 | agentic:stow |
| [kunchenguid/gnhf](https://github.com/kunchenguid/gnhf) | 1 | 0 | Drives the gnhf CLI. |
| [osovv/grace-marketplace](https://github.com/osovv/grace-marketplace) | 30 | 0 | Wrappers for the GRACE 4 CLI and .grace artifacts. |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | 8 | 7 | stack:gsap-core, stack:gsap-scrolltrigger, stack:gsap-plugins, stack:gsap-react, stack:gsap-timeline, stack:gsap-utils, stack:gsap-frameworks |
| [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) | 72 | 0 | All 72 skills are dispatchers over workflows that the npx installer places outside the skill directories. |
| [garrytan/gstack](https://github.com/garrytan/gstack) | 63 | 4 | verify:test-audit, product:office-hours, product:spec, product:plan-ceo-review |
| [HeadroomLabs-AI/headroom](https://github.com/HeadroomLabs-AI/headroom) | 0 | 0 | No SKILL.md. |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 24 | 1 | design:impeccable |
| [shadcn/improve](https://github.com/shadcn/improve) | 1 | 1 | craft:improve |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | 252 | 19 | product:write-spec, product:synthesize-research, product:product-brainstorming, product:scientific-problem-selection, work:validate-data, work:explore-data, work:sql-queries, work:statistical-analysis, work:data-visualization, work:build-dashboard, work:metrics-review, work:roadmap-update, work:stakeholder-update, work:competitive-brief, work:review-contract, work:triage-nda, work:variance-analysis, work:ticket-triage, work:customer-escalation |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 38 | 11 | craft:codebase-design, craft:diagnosing-bugs, craft:domain-modeling, craft:prototype, craft:retro, craft:improve-codebase-architecture, product:grilling, ops:wizard, security:git-guardrails-claude-code, agentic:writing-for-agents, work:to-questionnaire |
| [dsifry/metaswarm](https://github.com/dsifry/metaswarm) | 14 | 0 | Orchestration pack coupled to its bin/ scripts and the author's gtg CLI; visual-review is covered by verify:webapp-testing. |
| [michaelshimeles/skills](https://github.com/michaelshimeles/skills) | 7 | 0 | No root license; unslop (MIT) duplicates tools:humanize; the rest is unlicensed or PolyForm. |
| [kunchenguid/no-mistakes](https://github.com/kunchenguid/no-mistakes) | 16 | 0 | Drives the no-mistakes CLI; the .agents skills are repo-internal. |
| [nexu-io/open-design](https://github.com/nexu-io/open-design) | 538 | 5 | design:hallmark, design:emil-design-eng, design:review-animations, design:web-design-guidelines, work:writing-guidelines |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | 16 | 0 | Every workflow skill calls the openspec CLI. |
| [Q00/ouroboros](https://github.com/Q00/ouroboros) | 24 | 0 | Hard-routes through the Ouroboros MCP server and self-updates. |
| [cursor/plugins](https://github.com/cursor/plugins) | 108 | 32 | craft:make-pr-easy-to-review, verify:control-cli, verify:control-ui, verify:verify-this, pstack:principle-type-system-discipline, pstack:principle-model-the-domain, pstack:principle-minimize-reader-load, pstack:principle-separate-before-serializing-shared-state, pstack:principle-make-operations-idempotent, pstack:principle-build-the-lever, pstack:principle-encode-lessons-in-structure, pstack:principle-boundary-discipline, pstack:principle-test-behavior-not-implementation, pstack:principle-attack-the-premise, pstack:principle-laziness-protocol, pstack:principle-sequence-verifiable-units, pstack:principle-explain-the-number, pstack:principle-foundational-thinking, pstack:principle-migrate-callers-then-delete-legacy-apis, pstack:principle-subtract-before-you-add, pstack:typescript-best-practices, pstack:architect, pstack:arena, pstack:correct, pstack:why, pstack:blast-radius, pstack:benchmark-checklist, pstack:technical-writing, pstack:show-me-your-work, pstack:create-verification-skill, pstack:maintain-verification-skill, agentic:cli-for-agents |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | 12 | 1 | craft:ponytail |
| [kunchenguid/programbench-bench](https://github.com/kunchenguid/programbench-bench) | 6 | 0 | No license; its skills are benchmark copies of gstack and superpowers skills. |
| [KeygraphHQ/shannon](https://github.com/KeygraphHQ/shannon) | 0 | 0 | AGPL; no SKILL.md. |
| [rjs/shaping-skills](https://github.com/rjs/shaping-skills) | 3 | 0 | No license. shaping and breadboarding are notable; see the flagged list. |
| [microsoft/SkillLens](https://github.com/microsoft/SkillLens) | 0 | 0 | No SKILL.md. |
| [microsoft/SkillOpt](https://github.com/microsoft/SkillOpt) | 5 | 0 | skillopt-sleep needs the SkillOpt Python engine. |
| [exiao/skills](https://github.com/exiao/skills) | 141 | 10 | verify:verify-feature, verify:dogfood, verify:adversarial-ux-test, verify:ios-simulator, design:design-review, design:design-md, design:frontend-slides, product:plan-design-review, stack:remotion-best-practices, work:video-editor |
| [anthropics/skills](https://github.com/anthropics/skills) | 20 | 2 | verify:webapp-testing, design:frontend-design. skill-creator and mcp-builder were already here; docx, pdf, pptx and xlsx are proprietary and bundled in Claude Code. |
| [github/spec-kit](https://github.com/github/spec-kit) | 2 | 0 | Two repo-internal skills (catalog submissions, Spec Kit code review). |
| [SuperClaude-Org/SuperClaude_Framework](https://github.com/SuperClaude-Org/SuperClaude_Framework) | 9 | 0 | Thin mode-switch skills and a checklist with placeholder code. |
| [obra/superpowers](https://github.com/obra/superpowers) | 15 | 2 | craft:verification-before-completion, craft:finishing-a-development-branch. Four skills were already here; the rest is the SDD execution machinery or duplicates dev plan skills. |
| [kunchenguid/treehouse](https://github.com/kunchenguid/treehouse) | 0 | 0 | No SKILL.md. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | 13 | 1 | design:ui-ux-pro-max |
| [Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) | 9 | 0 | Needs its pnpm-built core plugin and knowledge graph; code:core and code:deepwiki cover the space. |
| [warpdotdev-demos/warp-copy](https://github.com/warpdotdev-demos/warp-copy) | 26 | 0 | AGPL. Its bundled Figma skills look like Figma's own; see the flagged list. |
| [samarthpatel24/workflow-pack](https://github.com/samarthpatel24/workflow-pack) | 0 | 0 | Commands only; no SKILL.md. |

## Refreshing a vendored skill

Each NOTICE row links the upstream path at the commit it was copied from. To refresh one, diff the
upstream path at HEAD against that commit, read the changes, and re-apply the edits listed under
"Changes made here" by hand. Nothing tracks upstream automatically.
