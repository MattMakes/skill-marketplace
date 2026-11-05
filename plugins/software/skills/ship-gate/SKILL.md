---
name: ship-gate
description: Pre-production audit that scans a codebase and reports pass/fail/manual against a pre-launch checklist (code quality, security, performance, accessibility, infrastructure, documentation, release readiness), with security delegated to security-sweep. Intercepts deploy commands and blocks until critical items pass. Also plans the launch itself (feature-flag lifecycle, staged rollout with advance/hold/rollback thresholds, launch monitoring, error-budget gate, rollback plan). Stack-agnostic. Use for "run ship gate", "am I ready to ship", "pre-launch audit", "pre-launch checklist", "can I deploy", "push to production", "go live checklist", "preflight check", "what needs to be in place before shipping", "plan a staged rollout", "rollback strategy", "set up launch monitoring". Not for CI/CD setup or infra provisioning.
license: MIT
metadata:
  author: Rajaraman Arumugam
  version: 1.0.0
---

# Ship Gate

Pre-production audit that scans a codebase and reports pass/fail/manual
against the launch checklist in
[references/launch-checklist.md](references/launch-checklist.md) before
anything ships. The scanner's 8 categories are the evidence; the checklist
is what the report is organised by. Every launch should be reversible,
observable and incremental.

## Modes

| Mode | Pick it when | Steps |
|------|--------------|-------|
| **Gate** (default) | There is a codebase and the question is "can this ship?" | Steps 1-4 below |
| **Launch plan** | The gate is passed (or the change is config or infra only) and the question is how to release it | Walk the Release readiness section of the checklist with the user, then write the rollout sequence, thresholds and rollback plan from [references/rollout-and-rollback.md](references/rollout-and-rollback.md) for this release |

## Intercept Behavior

When the user says "push to production", "deploy", "ship it", "go live",
or similar deploy-intent phrases, do NOT proceed with deployment. Instead:

1. Ask: "Have you run the ship gate? Want me to scan now?"
2. If yes, run the full audit below.
3. If the user says they already ran it, ask when. If more than 24 hours
   ago or if code changed since, recommend re-running.

## How It Works

### Step 1: Detect Stack

Run these checks in order to identify the project stack:

```
Framework detection:
  package.json exists        -> Node.js project
    "next" in dependencies   -> Next.js
    "react" in dependencies  -> React (if not Next.js)
    "vue" in dependencies    -> Vue
    "svelte" in dependencies -> Svelte
    "astro" in dependencies  -> Astro
    "express" in dependencies -> Express
    "fastify" in dependencies -> Fastify
    "hono" in dependencies   -> Hono
  requirements.txt or pyproject.toml -> Python project
    "django" present         -> Django
    "flask" present          -> Flask
    "fastapi" present        -> FastAPI
  go.mod exists              -> Go project
  Cargo.toml exists          -> Rust project

Database detection:
  "@supabase/supabase-js" in package.json -> Supabase
  supabase/ directory exists              -> Supabase
  "prisma" in dependencies                -> Prisma (check schema for DB type)
  "mongoose" in dependencies              -> MongoDB
  "pg" or "postgres" in dependencies      -> PostgreSQL
  firebase.json or .firebaserc exists     -> Firebase

Deploy target detection:
  vercel.json or .vercel/ exists          -> Vercel
  netlify.toml exists                     -> Netlify
  Dockerfile exists                       -> Docker/VPS
  fly.toml exists                         -> Fly.io
  railway.json exists                     -> Railway
  .platform/applications.yaml            -> Platform.sh

Auth detection:
  "@clerk" in dependencies                -> Clerk
  "next-auth" in dependencies             -> NextAuth
  "@supabase/auth-helpers" in deps        -> Supabase Auth
  "firebase/auth" in imports              -> Firebase Auth

AI/LLM detection:
  "openai" in dependencies                -> OpenAI
  "@anthropic-ai/sdk" in dependencies     -> Claude API
  "@google/generative-ai" in deps         -> Gemini
```

Report detected stack before proceeding. This determines which checks
are relevant. Checks tagged with a specific stack in `references/checks.md`
are skipped if that stack is not detected.

### Step 2: Run Automated Checks

**Security: run `software:security-sweep`.** It owns the security
section of the checklist (secrets, OWASP, dependencies, LLM security,
STRIDE) and verifies its findings before reporting them. Start it first;
it takes about 10 minutes. Map its report (`08-cso-report.md`) into the
checklist: Critical → CRITICAL, Important → HIGH, Minor → ADVISORY,
"Manual review required" → MANUAL. If the user declines the sweep, use
the scanner's SEC checks as a fallback and say so in the report. SEC-03 and SEC-10 stay with
ship-gate either way (see `references/checks.md`).

Then run the other categories in this order: DB, CODE, DEP, AI, DEPLOY,
FE, OBS. Database first because it produces the most critical findings.
For each, run every auto-scannable check from `references/checks.md`
using the patterns in `references/patterns.md`.

`scripts/ship_gate_scanner.py` automates the auto-scannable checks:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/skills/ship-gate/scripts/ship_gate_scanner.py" . --no-interactive
```

`--json` for machine-readable output, `--category SEC` to run one category,
`--verbose` to show PASS results. Exit code 0 is CLEAR TO SHIP, 1 DO NOT
SHIP, 2 SHIP WITH CAUTION. Use it for the first pass and the references for
anything it skips. When the sweep ran, drop the scanner's SEC lines except
SEC-03 and SEC-10; the sweep's findings replace them, and the verdict
comes from the merged list, not the scanner's exit code.

Also run the project's own test, build, lint and type-check commands; the
checklist's Code Quality section needs their exit codes.

Report progress after each category completes:
```
[1/8] Security: 3 FAIL, 12 PASS, 3 SKIP
[2/8] Database: 1 FAIL, 5 PASS, 6 SKIP
...
```

Report results as:
- PASS: check passed
- FAIL: issue found (with file path and line number)
- SKIP: not applicable to this stack

### Step 3: Manual Confirmation

For checklist items marked manual (backup restore tested, rollback plan
exists, staging test passed, Core Web Vitals, docs updated), present them
as a checklist and ask the user to confirm each one. The performance and
accessibility items have detail and measurement commands in
`references/performance-checklist.md` and
`references/accessibility-checklist.md`.

### Step 4: Verdict

Classify results into three severities:
- CRITICAL: must fix before shipping (secrets exposed, no auth on routes,
  no HTTPS, SQL injection vectors, no RLS on Supabase tables)
- HIGH: should fix before shipping (no error boundaries, no rate limiting,
  console.logs in production, no pagination)
- ADVISORY: recommended but not blocking (no OG tags, no custom 404,
  no analytics, no SBOM)

Final output lists findings by severity and ends with the checklist
status, one line per section:

```
SHIP GATE REPORT
================
Stack: Next.js + Supabase + Vercel
Scan time: 12s

CRITICAL (3 items, must fix)
  FAIL  [SEC-01] API key found in src/lib/api.ts:14
  FAIL  [DB-07] RLS not enabled on "profiles" table
  FAIL  [SEC-05] No CSRF protection on /api/checkout

HIGH (5 items, should fix)
  FAIL  [CODE-01] 12 console.log statements in production code
  FAIL  [CODE-03] Empty catch block in src/utils/auth.ts:45
  FAIL  [DEP-04] 3 critical npm audit vulnerabilities
  FAIL  [DEPLOY-05] No rollback plan documented
  MANUAL [DEPLOY-06] Staging test not confirmed

ADVISORY (4 items, recommended)
  FAIL  [FE-01] Missing OG meta tags
  FAIL  [FE-03] No custom 404 page
  PASS  [OBS-01] Error monitoring configured
  SKIP  [AI-01] No AI/LLM usage detected

CHECKLIST
  Code Quality         5/8   (tests: run, 2 FAIL)
  Security             FAIL  (security-sweep: 2 critical, 1 important)
  Performance          2/6   (4 MANUAL)
  Accessibility        3/7   (4 MANUAL)
  Infrastructure       6/8
  Documentation        MANUAL
  Release readiness    1/6   (no rollback plan)

VERDICT: DO NOT SHIP (3 critical issues)
Fix critical items and re-run.
```

If zero critical items remain, verdict is: CLEAR TO SHIP.
If only high items remain, verdict is: SHIP WITH CAUTION (acknowledge risks).

With a CLEAR or CAUTION verdict, hand over the "After deploying" list from
the checklist and offer the Launch plan mode.

## Categories

Eight categories, each with a code prefix. Full check details in
`references/checks.md`.

| Prefix | Category | Auto | Manual | Tool |
|--------|----------|------|--------|------|
| SEC | Security (fallback; `software:security-sweep` owns it) | 15 | 3 | 0 |
| DB | Database | 7 | 5 | 0 |
| DEPLOY | Deployment | 3 | 8 | 0 |
| CODE | Code Quality | 11 | 0 | 1 |
| AI | AI/LLM Security | 5 | 3 | 0 |
| DEP | Dependencies | 5 | 0 | 1 |
| FE | Frontend Quality | 7 | 3 | 0 |
| OBS | Observability | 2 | 5 | 0 |

## Scope

This skill audits. It does not fix. When it finds issues, it reports
them with file locations and remediation guidance. The user or another
skill (for example `software:debug`) handles the fix.

This skill does not:
- Set up CI/CD pipelines
- Provision infrastructure
- Configure monitoring tools
- Run after deployment (it is pre-deploy only; it hands over a
  post-deploy list)

## Red Flags

- Deploying without a rollback plan
- No monitoring or error reporting in production
- Big-bang releases (everything at once, no staging)
- Feature flags with no expiration or owner
- No one monitoring the deploy for the first hour
- Production configuration done by memory, not code
- "It's Friday afternoon, let's ship it"
- Error budget exhausted but feature work continues unchanged
- "It works in staging, it'll work in production": production has
  different data and traffic; monitor after deploy

## Integration Points

- **`software:security-sweep`**: runs the security section of the checklist
- **`software:code-sweep`**: the code review the Code Quality section asks for
- **`software:feature-flags-architect`**, **`software:slo-architect`**: flag design and
  the SLO behind the error-budget gate in the Launch plan mode
- [references/definition-of-done.md](references/definition-of-done.md): the
  per-change bar every change clears before this gate
