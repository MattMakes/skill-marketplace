# Third-party notices

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

## Changes made here
- `domain-modeling`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `retro`,
  `improve-codebase-architecture`: the Codex-host `agents/openai.yaml` files were dropped.
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `codebase-design`, `domain-modeling`, `improve-codebase-architecture`. Moved: `diagnosing-bugs` to `dev`, `prototype` to `craft`, `retro` to `agentic`.
- `improve-codebase-architecture`: `codebase-design`, `grilling`, `domain-modeling` and the
  `/codebase-design` mentions in `HTML-REPORT.md` → `architecture:codebase-design`, `product:grilling`,
  `architecture:domain-modeling`; the description gained its triggers. The report still loads Tailwind and
  Mermaid from CDNs, as upstream.
  Moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `improve`, `verification-before-completion`, `ai-development-guide`, `oh-my-issues`,
  `make-pr-easy-to-review`, `architecture-decision-records`: unchanged apart from frontmatter.
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `improve`, `architecture-decision-records`. Moved: `verification-before-completion` to `dev`, `ai-development-guide` to `craft`, `oh-my-issues` to `craft`, `make-pr-easy-to-review` to `dev`.
- `architecture-decision-records`: moved here from the `craft` plugin in the v3 taxonomy (2026-11-05).
- `contract-first`, `code-tour`: the `metadata.origin` key was dropped (credited here instead);
  related-skill lists repointed at `architecture:api-design-principles` and `dev:tdd`
  or reduced to plain prose (`api-design`, `ai-regression-testing`, `backend-patterns`,
  `frontend-patterns`, `tdd-workflow`, `documentation-lookup`, `codebase-onboarding`,
  `coding-standards`, `council`).
  v3 taxonomy (2026-11-05): this note covers several skills. In this plugin: `contract-first`. Moved: `code-tour` to `code`.
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
