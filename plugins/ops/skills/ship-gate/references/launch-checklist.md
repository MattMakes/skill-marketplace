# Launch Checklist

The pre-launch checklist ship-gate reports against. Each item is settled by one of:

- a check ID from [checks.md](checks.md), run by `scripts/ship_gate_scanner.py` or by hand;
- **sweep**: a finding area of `security:security-sweep` (the auditor that owns it in brackets);
- **run**: run the project's own command (test, build, lint) and report its exit code;
- **manual**: ask the user to confirm.

An item passes only when everything mapped to it passes. Anything the scanner skipped and you
could not settle another way is MANUAL, not PASS.

Pre-launch checklist from addyosmani/agent-skills `shipping-and-launch` (MIT); the mapping
column is ship-gate's.

## Code Quality

| Item | Settled by |
|------|-----------|
| All tests pass (unit, integration, e2e) | run |
| Build succeeds with no warnings | run |
| Lint and type checking pass | run; CODE-14 |
| Code reviewed and approved | manual (`verify:code-sweep` if no review exists) |
| No TODO comments that should be resolved before launch | CODE-07 |
| No `console.log` debugging statements in production code | CODE-01 |
| Error handling covers expected failure modes | CODE-02, CODE-03, CODE-08, CODE-09, CODE-10 |
| No unbounded list endpoints | CODE-05 |

## Security

Run `security:security-sweep` and map its findings here. Where the sweep did not run (the
`security` plugin is not installed, or the user declines a ~10 minute multi-agent pass), fall
back to the scanner's SEC checks in brackets and say in the report that the fallback was used.

| Item | Settled by |
|------|-----------|
| No secrets in code or version control | sweep [secret-scanner] (fallback SEC-01, SEC-17, SEC-18) |
| Dependency audit shows no critical or high vulnerabilities | sweep [supply-chain-auditor] (fallback DEP-04, CODE-06) |
| Input validation on all user-facing endpoints | sweep [owasp-auditor] (fallback SEC-06, DB-03) |
| Authentication and authorization checks in place | sweep [owasp-auditor, stride-modeler] (fallback SEC-02, SEC-08, SEC-09, SEC-12) |
| Security headers configured (CSP, HSTS, etc.) | sweep [owasp-auditor] (fallback SEC-11) |
| Rate limiting on authentication endpoints | sweep [owasp-auditor] (fallback SEC-07) |
| CORS configured to specific origins (not wildcard) | sweep [owasp-auditor] (fallback SEC-04) |
| HTTPS enforced at the edge, HTTP redirected | SEC-03 (manual; the sweep reads code, not the deployed edge) |
| Sessions invalidated server-side on logout | SEC-10 (manual) |
| No deferred-auth markers left in code | CODE-07, CODE-11 |
| Supabase: RLS on, no `service_role` in the client, bucket policies | DB-07, DB-08, DB-09, DB-10 |
| AI features: prompts, keys, output, agent scope | sweep [llm-security] (fallback AI-01 to AI-06); AI-07, AI-08 manual |

## Performance

Detail and measurement commands: [performance-checklist.md](performance-checklist.md).

| Item | Settled by |
|------|-----------|
| Core Web Vitals within "Good" thresholds | manual (Lighthouse or field data) |
| No N+1 queries in critical paths | manual (read the hot paths) |
| Images optimized (compression, responsive sizes, lazy loading) | FE-10 |
| Bundle size within budget | run (the bundler's size report) |
| Database queries have appropriate indexes; pooling configured | manual; DB-05 |
| Caching configured for static assets and repeated queries | manual; DEPLOY-13 |

## Accessibility

Detail and testing tools: [accessibility-checklist.md](accessibility-checklist.md).

| Item | Settled by |
|------|-----------|
| Keyboard navigation works for all interactive elements | FE-06 (manual) |
| Screen reader can convey page content and structure | manual |
| Color contrast meets WCAG 2.1 AA (4.5:1 for text) | manual (axe or Lighthouse) |
| Focus management correct for modals and dynamic content | manual |
| Error messages are descriptive and associated with form fields | FE-07 |
| Images have alt text | FE-05 |
| No accessibility warnings in axe-core or Lighthouse | run |

## Infrastructure

| Item | Settled by |
|------|-----------|
| Environment variables set in production | DEPLOY-01 |
| Database migrations applied (or ready to apply), in version control | manual; DB-06 |
| Backups configured and a restore tested | DB-01, DB-02 |
| DNS and SSL configured | DEPLOY-02, DEPLOY-08 |
| CDN configured for static assets | DEPLOY-13 |
| Logging and error reporting configured | DEPLOY-10, DEPLOY-11, OBS-01, OBS-03 |
| Health check endpoint exists and responds | DEPLOY-09 |
| Alerting and uptime monitoring on | OBS-02, OBS-05 |

## Documentation

| Item | Settled by |
|------|-----------|
| README updated with any new setup requirements | manual |
| API documentation current | manual |
| ADRs written for any architectural decisions | manual |
| Changelog updated | manual |
| User-facing documentation updated (if applicable) | manual |

## Release readiness

| Item | Settled by |
|------|-----------|
| Rollback plan documented | DEPLOY-05 ([rollout-and-rollback.md](rollout-and-rollback.md) has a template) |
| Staging test passed | DEPLOY-06 |
| Feature flag configured, with an owner and an expiry (if used) | manual |
| Monitoring dashboards set up; someone watches the first hour | manual |
| Error budget not exhausted (if the service has an SLO) | manual |
| Team notified of the deployment | manual |

## After deploying

Not part of the verdict; hand it to the user with the report.

- [ ] Health check returns 200
- [ ] Error rate is normal
- [ ] Latency is normal
- [ ] Critical user flow works
- [ ] Logs are flowing
- [ ] Rollback tested or verified ready
