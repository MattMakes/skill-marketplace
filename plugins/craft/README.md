# craft — Engineering Craft

Twenty-two vendored skills on engineering practice: how to design modules and name domain concepts,
how to keep changes small and honest while coding, how to diagnose bugs and performance, how to audit
and migrate a codebase, and how to finish a branch. Each is a supply-chain-controlled copy of an
upstream skill, adapted only as far as it takes to run standalone in Claude Code.

```bash
claude plugin install craft@skill-marketplace
```

## Skills

### Designing code

| Skill | Use it when |
|---|---|
| `codebase-design` | Designing or restructuring a module's interface, deciding where a seam goes, or making code testable. Shared vocabulary (module, interface, depth, seam, adapter, leverage, locality), the deletion test, the one-vs-two-adapter rule, `DEEPENING.md` for dependency categories and `DESIGN-IT-TWICE.md` for parallel sub-agent interface exploration. |
| `domain-modeling` | Discussing codebase terminology, writing or editing `GLOSSARY.md`, or recording an ADR. Challenges terms against the glossary, sharpens fuzzy words, stress-tests with scenarios, cross-checks the code, and offers a one-paragraph ADR only when a decision is hard to reverse, surprising and a real trade-off. |
| `architecture-decision-records` | Documenting a significant technical decision. Five templates (MADR, lightweight, Y-statement, deprecation, RFC), a status lifecycle, an index layout, and a review checklist. |
| `contract-first` | Frontend/backend or service-to-service work that must evolve an API or event schema in parallel. One authoritative OpenAPI/AsyncAPI/proto/JSON Schema artifact, generated consumer types, provider verification (including the bigint-ID trap), and a change protocol. |
| `prototype` | Sanity-checking whether a state model feels right (a single HTML file with guided walkthroughs, see `LOGIC.md`) or what a UI should look like (URL-param switchable variants, see `UI.md`). Throwaway by design; the validated decision is folded into real code and the prototype captured on a throwaway branch. |
| `improve-codebase-architecture` | You want to find where the codebase is shallow and pick a refactor worth doing. Hot-spot-weighted scan, deletion-test triage, a self-contained HTML report with before/after diagrams, then a grilling loop through `product:grilling` that updates the glossary and ADRs. User-invoked only. |

### Discipline while coding

| Skill | Use it when |
|---|---|
| `ponytail` | Any coding task where the smallest change that fully solves it is what you want. Scope-first checklist, a six-step smallest-complete-change ladder, a never-cut list (trust-boundary validation, security, accessibility), a `shortcut:` comment convention, and a reply that names what was skipped. Levels `lite`, `full`, `ultra`. |
| `karpathy-coder` | Writing, reviewing or committing code when the model might be overcoding. Karpathy's four principles (surface assumptions, simplicity, surgical changes, verifiable goals) as a review procedure plus four stdlib-only Python checkers and a non-blocking pre-commit gate. |
| `ai-development-guide` | Reviewing a backend implementation choice, a code smell, a failure, or whether a change is complete. Fail-fast fallback policy with error-masking review triggers, five named failure patterns, a reference-representativeness check, and a risk-scaled three-stage impact analysis. |
| `source-driven-development` | Writing framework-specific code where correctness depends on the version. Detects versions from dependency files, fetches the exact official doc page, implements from it, cites deep links, and flags anything it could not verify as UNVERIFIED. |
| `constraint-driven-development` | No quality bar is written down, or an agent keeps silencing checks and skipping tests to get to green. A four-question intake with defaults, a `CONSTRAINTS.md` contract with a tool and command per dimension, ratchets instead of invented thresholds, and a floor guard that catches a lowered bar in the diff. |
| `doubt-driven-development` | A non-trivial decision, in unfamiliar code or at high stakes, that is cheaper to verify now than to debug later. CLAIM/EXTRACT/DOUBT/RECONCILE/STOP with a fresh-context adversarial reviewer that gets the artifact and contract but never the claim, a four-class finding precedence and a three-cycle bound. |
| `verification-before-completion` | About to say something is done, fixed or passing. No success claim without the command run in this message; a claim-vs-evidence table and red-green verification of regression tests. |

### Debugging and performance

| Skill | Use it when |
|---|---|
| `diagnosing-bugs` | A hard bug or a performance regression. Build a tight, red-capable feedback loop first (ten ways, including a human-in-the-loop script template), then reproduce and minimise, rank 3–5 falsifiable hypotheses, instrument with tagged logs, and lock it down with a regression test at a correct seam. |
| `performance-optimization` | Performance requirements, a suspected regression, poor Core Web Vitals, or N+1 queries. Measure, identify, fix, verify, guard; a symptom-driven diagnosis tree, `EXPLAIN ANALYZE` and pool-sizing specifics, strict keep-or-revert rules ("neutral is a revert"), an attempts ledger, and worked fixes plus a checklist in `references/`. |

### Auditing and improving a codebase

| Skill | Use it when |
|---|---|
| `improve` | You want a senior-advisor audit of a codebase and handoff plans another agent can execute. Read-only on source: nine audit categories with parallel subagents, vetting of over-reported findings, numbered self-contained plans under `plans/` with drift checks and STOP conditions. Variants for `quick`/`deep`, a focus, the current `branch`, `next` (direction), `plan`, `review-plan`, `execute`, `reconcile` and `--issues`. |
| `deprecation-and-migration` | Removing an old system, API or feature, or changing a production schema without downtime. Advisory vs compulsory deprecation, strangler/adapter/flag patterns, zombie code, and a worked expand/backfill/contract migration with hard rules. |
| `oh-my-issues` | An issue tracker with dozens of reports that share root causes. Clusters them into plan-master issues with architectural titles, closes children with a standard redirect, appends Round-N triage comments, bundles one PR per cluster, and runs health checks on the masters. |
| `retro` | After a coding session, to improve the agent's environment for the next one: navigation pointers, missing guardrails, mechanical vs judgement standards, AGENTS.md bloat, tool economy, no-ops and information access. User-invoked only. |
| `code-tour` | An onboarding, architecture, PR, RCA or security walkthrough as a VS Code CodeTour `.tour` file. Persona-to-depth table, verified anchors, step types, the `ref`-field PR-branch gotcha, and the SMIG description rule. |

### Finishing a change

| Skill | Use it when |
|---|---|
| `finishing-a-development-branch` | Implementation is complete and tests pass. Detects normal repo vs worktree vs detached HEAD, confirms the base branch, presents a fixed merge / PR / keep menu, cleans up only worktrees it owns, and discards only on the typed word `discard`. Pairs with `tools:using-git-worktrees`. |
| `make-pr-easy-to-review` | "Tidy this PR" or "clean up commits". Dependency-ordered commit grouping, a tree-hash identity check before and after rewriting history, and reviewer guidance in the description without changing behaviour. |

## What these write and where they reach

Installing this plugin wires no hooks, no MCP servers and no background processes. Nothing here
downloads a binary.

- `karpathy-coder` ships four stdlib-only Python scripts under `scripts/` (`complexity_checker.py`,
  `diff_surgeon.py`, `assumption_linter.py`, `goal_verifier.py`) and `karpathy-gate.sh`, a
  non-blocking pre-commit hook that runs the first two on staged files. `diff_surgeon.py` and the
  hook read `git diff`. The hook runs only if you wire it into `.claude/settings.json` or a git hook
  yourself; `references/enforcement-patterns.md` shows how.
- `diagnosing-bugs` ships `scripts/hitl-loop.template.sh`, a bash template you copy and edit; it
  prompts a human in the terminal and prints back what they answered.
- `improve` is read-only on source and writes only under `plans/` (or `advisor-plans/`) in the repo.
  Its `execute` variant spawns a subagent in an isolated git worktree; `--issues` creates GitHub
  issues with `gh`, and only with that flag.
- `oh-my-issues` needs `gh` and `jq`; it opens, comments on and closes GitHub issues in the
  current repo.
- `make-pr-easy-to-review` uses `gh` and `git`; it rewrites branch history and force-pushes only
  after you agree to its plan.
- `finishing-a-development-branch` merges, pushes, deletes branches and removes worktrees it
  created, each after you pick the option; it creates pull requests with the forge's CLI when one
  is available.
- `source-driven-development` fetches official documentation pages (WebFetch); that lookup is the
  skill's purpose.
- `doubt-driven-development` can pipe an artifact to the `codex` or `gemini` CLI for a second
  opinion, only after you authorize that exact command.
- `constraint-driven-development` writes `CONSTRAINTS.md` and one line in `AGENTS.md`/`CLAUDE.md`.
  The tools it recommends per dimension (gitleaks, semgrep, osv-scanner, axe, lighthouse,
  size-limit, stryker, …) are installed only when you say so.
- `improve-codebase-architecture` writes an HTML report to the OS temp directory and opens it; the
  report loads Tailwind and Mermaid from CDNs when viewed in a browser. It, `domain-modeling` and
  `architecture-decision-records` write `GLOSSARY.md` and `docs/adr/` in the repo.
- `prototype` writes throwaway prototype files next to the code they test and captures them on a
  throwaway branch. `code-tour` writes `.tours/*.tour` files. `retro` reads session logs under
  `~/.claude/projects/`.

## Credits

All twenty-two skills are vendored, supply-chain-controlled copies: each is maintained here,
credited in NOTICE.md with its upstream repository, path, commit, date, license and author, and
re-pulled deliberately rather than tracked live. Diff against upstream before pulling changes in.

## Invoking

Namespaced under the plugin: `craft:codebase-design`, `craft:ponytail`, `craft:diagnosing-bugs`,
and so on. `ponytail` takes a level (`/craft:ponytail lite|full|ultra`); `improve` takes
`quick`/`deep`, a focus, `branch`, `next`, `plan <description>`, `review-plan <file>`,
`execute <plan>`, `reconcile` and `--issues`.
