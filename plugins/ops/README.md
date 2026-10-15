# ops — Production Operations

Seventeen skills for running software in production, vendored from six upstream repositories
and maintained here. They cover the whole loop: instrument and set targets, release safely,
manage the infrastructure underneath, and learn from what breaks.

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
| `shipping-and-launch` | Preparing a production launch: pre-launch checklist by area, flag lifecycle, staged rollout with numeric advance/hold/rollback thresholds, an error-budget release gate and a rollback-plan template. The definition-of-done, security, performance and accessibility checklists it cites are in `references/`. |
| `ship-gate` | "Am I ready to ship?" A pre-production audit across security, database, deployment, code quality, AI/LLM, dependencies, frontend and observability; `ship_gate_scanner.py` runs the automatable checks and the verdict blocks deploy intent until criticals pass. Audits only; does not fix. |
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
- `dependency-updater` runs the ecosystem's own tools (`taze --write`, `npm audit`, `pip-review`,
  `go get -u`, `cargo update`, ...), which modify manifests and lockfiles and reach package
  registries over the network. `scripts/run-taze.sh` is a thin wrapper around `taze`.
- `dependabot-review` runs `gh pr list`, `gh pr checks` and `gh pr merge --delete-branch`: it
  merges pull requests and deletes branches on GitHub, within the tiers and CI rules in the skill.
- `wizard` writes the generated script where you ask; when a human runs it, it opens URLs in a
  browser, upserts keys into `.env` and calls `gh secret set` / `gh variable set`.
- `github-actions-creator` writes `.github/workflows/*.yml`; `kubernetes-patterns` and
  `terraform-patterns` include `kubectl` and `terraform` commands you run yourself.

## Credits

Every skill here is a vendored, supply-chain-controlled copy: reviewed when it was pulled in,
credited with its upstream repository, path, commit, date and license in [NOTICE.md](NOTICE.md),
and re-pulled deliberately rather than tracked live. Upstreams: addyosmani/agent-skills
(observability-and-instrumentation, shipping-and-launch), affaan-m/ECC (kubernetes-patterns),
alirezarezvani/claude-skills (changelog-generator, feature-flags-architect, slo-architect,
chaos-engineering, migration-architect, ship-gate, docker-development, terraform-patterns),
mattpocock/skills (wizard), davila7/claude-code-templates (github-actions-creator,
dependency-updater, dependabot-review) and wshobson/agents (deployment-pipeline-design,
postmortem-writing). All are MIT; ship-gate is itself a mirror of rx4u/ship-gate by Rajaraman
Arumugam.

## Invoking

Namespaced under the plugin: `ops:slo-architect`, `ops:ship-gate`, `ops:kubernetes-patterns`,
and so on. Script paths inside each skill resolve from
`${CLAUDE_PLUGIN_ROOT}/skills/<skill>/`.
