# ops — Production Operations

Ship it and run it. Sixteen skills for running software in production, vendored from six
upstream repositories and maintained here. They cover the whole loop: instrument and set
targets, release safely, manage the infrastructure underneath, and learn from what breaks.
Start with `ship-gate` when the question is "can this go to production?".

```bash
claude plugin install ops@skill-marketplace
```

## Skills

### Observe and set targets

| Skill | Use it when |
|---|---|
| `observability-and-instrumentation` | Adding logging, metrics, tracing or alerting to a feature, or a production issue could not be diagnosed from the data. Starts from the questions on-call will ask, then structured logs with correlation IDs, RED/USE metrics with the cardinality rule, OpenTelemetry, symptom-based alerts with a three-line runbook, and a step that verifies the telemetry itself. Checklist in `references/`. |
| `slo-architect` | Defining or reviewing SLOs, SLIs and error budgets. `slo_designer.py` renders a definition, `error_budget_calculator.py` emits multi-window burn-rate alert thresholds (Google SRE Workbook), `slo_review.py` catches the classic bugs (target too high, window too short, CPU as SLI). Python 3, stdlib only. |

### Release safely

| Skill | Use it when |
|---|---|
| `feature-flags-architect` | Adding, ramping or retiring a feature flag, or choosing a provider. Flag taxonomy and lifecycle, `flag_debt_scanner.py` (git-age based), `rollout_planner.py` (ring, linear, log, cohort) and `kill_switch_audit.py`. Python 3 and git. |
| `ship-gate` | "Am I ready to ship?" A pre-production audit that reports pass/fail/manual against a pre-launch checklist (code quality, security, performance, accessibility, infrastructure, documentation, release readiness); `ship_gate_scanner.py` runs the automatable checks, `security:security-sweep` owns the security section, and the verdict blocks deploy intent until criticals pass. Audits only; does not fix. Launch-plan mode from the former `shipping-and-launch`: flag lifecycle, staged rollout with numeric advance/hold/rollback thresholds, launch monitoring, an error-budget gate and a rollback plan (`references/launch-checklist.md`, `references/rollout-and-rollback.md`; definition-of-done, performance and accessibility checklists also in `references/`). |
| `changelog-generator` | Cutting a release from Conventional Commits: `generate_changelog.py` renders Keep-a-Changelog markdown or JSON, `version_bumper.py` recommends the semver bump, `commit_linter.py` gates PRs. Also hotfix severity SLAs and rollback triggers. Python 3 and git. |
| `deployment-pipeline-design` | Designing a multi-stage CI/CD pipeline: stage layout, approval gates, canary, blue-green and rolling strategies, deep health checks, automated rollback, plus platform-specific configs in `references/`. |
| `github-actions-creator` | Creating a GitHub Actions workflow. Detects the stack from manifest files, asks at most one question, then writes the YAML with minimal permissions, concurrency, caching and pinned actions; per-language templates in `references/`. |

### Infrastructure

| Skill | Use it when |
|---|---|
| `docker-development` | Optimizing a Dockerfile, writing a compose file, or auditing container security. `dockerfile_analyzer.py` scores layers, base image and anti-patterns; `compose_validator.py` checks healthchecks, networks and volumes. Python 3. |
| `kubernetes-patterns` | Writing or reviewing Kubernetes manifests, or debugging probes, RBAC, autoscaling and resource limits. A production Deployment with security context and all three probes, probe timing math, RBAC chain, HPA/PDB, Jobs and a kubectl cheatsheet. |
| `terraform-patterns` | Designing Terraform modules, managing state backends, or reviewing Terraform security. `tf_module_analyzer.py` and `tf_security_scanner.py` plus module-pattern and state-management references. Python 3; the terraform CLI only for real plan/apply. |
| `migration-architect` | Planning a database, service or infrastructure migration that needs explicit rollback paths. Expand-contract, parallel schema and reconciliation methods; `migration_planner.py`, `compatibility_checker.py` (non-zero exit on breaking changes, usable as a CI gate) and `rollback_generator.py`. Sample inputs in `assets/`. Python 3. |
| `wizard` | A procedure only a human can perform: provisioning in a third-party dashboard, creating credentials or CI secrets, a one-off cutover. Generates a bash wizard from `template.sh` that opens each URL, captures values, writes `.env` and `gh` secrets, and confirms at each stage. |

### Keep it healthy

| Skill | Use it when |
|---|---|
| `chaos-engineering` | Planning, running or writing up a chaos experiment or game day. `experiment_designer.py` forces hypothesis, steady state and abort criteria; `blast_radius_calculator.py` scores risk against the error budget; `experiment_postmortem.py` structures the write-up. Attack taxonomy and tooling landscape in `references/`. Python 3. |
| `dependency-updater` | "Update my dependencies." Detects the ecosystem (Node, Python, Go, Rust, Ruby, Java, .NET), auto-applies patch and minor updates, prompts per major, respects pins, runs the audit tool. Needs the ecosystem's tools (taze, pip-audit, govulncheck, cargo audit, ...). |
| `dependabot-review` | Reviewing open Dependabot PRs: classifies by bump type into safe / low-risk / review tiers, checks CI, merges the safe tier and reports the rest. Needs an authenticated `gh`. |
| `postmortem-writing` | Writing a blameless postmortem after an incident: triggers, timeline, 5 Whys, contributing factors, action-item quality rules, a facilitation guide and templates in `references/`. |

## What these write and where they reach

Installing this plugin wires no hooks, MCP servers or background processes, and nothing here
downloads a binary. The bundled scripts are Python 3 standard library and run only when invoked.
What reaches outside the skill directory:

- `changelog-generator` and `feature-flags-architect` scripts shell out to `git log` in the
  current repository. `generate_changelog.py --write CHANGELOG.md` prepends to that file.
- `migration-architect`, `slo-architect`, `chaos-engineering`, `docker-development`,
  `terraform-patterns` and `ship-gate` scripts read the paths you give them and print to stdout,
  or write an output file where `-o`/`--output` points.
- `ship-gate` runs `security:security-sweep` for its security section when the `security`
  plugin is installed and you agree; the sweep writes its run under
  `ai_docs/security-sweep/runs/<RUN_ID>/` in the repository and takes about ten minutes. Without
  it, ship-gate falls back to its own scanner's SEC checks.
- `dependency-updater` runs the ecosystem's own tools (`taze --write`, `npm audit`, `pip-review`,
  `go get -u`, `cargo update`, ...), which modify manifests and lockfiles and reach package
  registries over the network. `scripts/run-taze.sh` is a thin wrapper around `taze`.
- `dependabot-review` runs `gh pr list`, `gh pr checks` and `gh pr merge --delete-branch`: it
  merges pull requests and deletes branches on GitHub, within the tiers and CI rules in the skill.
- `wizard` writes the generated script where you ask; when a human runs it, it opens URLs in a
  browser, upserts keys into `.env` and calls `gh secret set` / `gh variable set`.
- `github-actions-creator` writes `.github/workflows/*.yml`; `kubernetes-patterns` and
  `terraform-patterns` include `kubectl` and `terraform` commands you run yourself.

## How it works with the other plugins

| Direction | Handoff |
|---|---|
| In | `ops` is the last stage in the life of a change: a change built with `dev` and checked with `verify` comes to `ops:ship-gate` for the go/no-go. |
| Out | `ops:ship-gate` calls `security:security-sweep` for its security section and asks for `verify:code-sweep` as the review its Code Quality section needs. |
| Out | `ops:observability-and-instrumentation` sends a failure happening now to `dev:debug`; it covers the instrumentation, not the diagnosis. |
| Out | `ops:docker-development`, `ops:kubernetes-patterns` and `ops:terraform-patterns` send a security review to `security:security-sweep`. |
| Split | `ops:migration-architect` owns system-level migration (database, service, infrastructure cut-overs). `stack:database-migrations` owns the per-tool workflow (Prisma, Drizzle, Django, golang-migrate, ...). `craft:deprecation-and-migration` owns code-level deprecation. |

## Credits

Every skill here is a vendored, supply-chain-controlled copy: reviewed when it was pulled in,
credited with its upstream repository, path, commit, date and license in [NOTICE.md](NOTICE.md),
and re-pulled deliberately rather than tracked live. Upstreams: addyosmani/agent-skills
(observability-and-instrumentation, and shipping-and-launch, now ship-gate's launch checklist
and launch-plan mode), affaan-m/ECC (kubernetes-patterns),
alirezarezvani/claude-skills (changelog-generator, feature-flags-architect, slo-architect,
chaos-engineering, migration-architect, ship-gate, docker-development, terraform-patterns),
mattpocock/skills (wizard), davila7/claude-code-templates (github-actions-creator,
dependency-updater, dependabot-review) and wshobson/agents (deployment-pipeline-design,
postmortem-writing). All are MIT; ship-gate is itself a mirror of rx4u/ship-gate by Rajaraman
Arumugam.

## Moved in v3

No skill moved into or out of `ops`. Two changes happened inside the plugin:

| Before | After |
|---|---|
| `ops:shipping-and-launch` | `ops:ship-gate` (its checklist is `references/launch-checklist.md`; its rollout and rollback plan is the "Launch plan" mode) |
| `ops:ship-gate` security rules | `security:security-sweep` (the scanner's SEC checks remain as the fallback) |

## Invoking

Namespaced under the plugin: `/ops:ship-gate`, `/ops:slo-architect`, `/ops:kubernetes-patterns`,
and so on. Script paths inside each skill resolve from
`${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
