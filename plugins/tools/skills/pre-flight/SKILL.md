---
name: pre-flight
description: Use after creating an implementation plan and before executing it — analyzes plan against codebase to catch completeness gaps in wiring, contracts, behavior preservation, configuration, and credential management
---

# Pre-Flight Plan Verification

## Overview

Analyzes an implementation plan against the target codebase to catch completeness gaps BEFORE any code is written. Prevents the 20+ critical gaps that commonly occur: missing DI registrations, removed error handling, broken API contracts, competing auth configurations, credential source downgrades.

**Core principle:** Every interface needs an implementation AND a registration. Every error path needs preservation. Every contract needs respect. Every credential needs its secure source.

**Announce at start:** "I'm using the pre-flight skill to verify plan completeness."

**Save to:** `./ai_docs/reports/YYYY-MM-DD-pre-flight-report.md`

## Arguments

- `plan_path` (required) — Path to the implementation plan document
- `source_path` (optional) — Path to original/old codebase if migrating or rewriting

## 🔀 [ROUTER] Plan Prerequisites Gate

Before running verification categories, check that the plan meets minimum requirements.

- [ ] **Condition: Plan is for a rewrite/migration AND has no Runtime Discovery evidence** ➔ *Flag HOLD: Runtime Discovery Required*
- [ ] **Condition: Plan is for a backend service/API AND has no Task 0 (Local Dev Setup)** ➔ *Flag WARN: Local Dev Setup Missing*
- [ ] **Condition: Plan has external dependencies AND no External Dependencies Matrix** ➔ *Flag WARN: External Dependencies Undocumented*
- [ ] **Condition: All prerequisites met** ➔ *Proceed to verification categories*

🛑 **PROGRESSIVE DISCLOSURE GATE:** If any prerequisite is flagged HOLD, report to user immediately. Do not run the verification categories until the plan is amended. WARN items are reported but do not block verification.

---

## Language Detection

Auto-detect from project files:

- **C#**: Look for `*.csproj`, check for `IServiceCollection` registrations
- **TypeScript/Node**: Look for `package.json`, `tsconfig.json`, check DI containers (inversify, tsyringe, nest)
- **Python**: Look for `requirements.txt`/`pyproject.toml`, check for DI (dependency-injector, FastAPI Depends)
- **Go**: Look for `go.mod`, check interface satisfaction
- **Fallback**: Generic patterns

## Six Verification Categories

Run all categories — do not skip any.

### A. Wiring Verification

Pattern: "Every interface MUST have an implementation AND a registration"

**C# Example:**
```csharp
// Interface in plan
public interface ISoftpullCosmosRepository { }

// Must find:
// 1. Implementation
public class SoftpullCosmosRepository : ISoftpullCosmosRepository { }

// 2. Registration
services.AddScoped<ISoftpullCosmosRepository, SoftpullCosmosRepository>();
```

**TypeScript Example:**
```typescript
// Interface in plan
interface ISoftPullService { }

// Must find:
// 1. Implementation
class ConcreteSoftPullService implements ISoftPullService { }

// 2. Registration
container.bind<ISoftPullService>().to(ConcreteSoftPullService);
```

**Python Example:**
```python
# ABC in plan
class SoftPullRepository(ABC):
    pass

# Must find:
# 1. Implementation
class ConcreteSoftPullRepository(SoftPullRepository):
    pass

# 2. Registration/wiring
# FastAPI: Depends(ConcreteSoftPullRepository)
# DI container: container.register(SoftPullRepository, ConcreteSoftPullRepository)
```

**Go Example:**
```go
// Interface in plan
type SoftPullRepository interface {
    GetData() (*Data, error)
}

// Must find:
// 1. Implementation
type softPullRepo struct{}
func (r *softPullRepo) GetData() (*Data, error) { }

// 2. Construction/wiring
// In main() or wire.go:
repo := &softPullRepo{}
service := NewService(repo)
```

### B. Behavioral Preservation Check

Only when `source_path` provided.

Pattern: "Every error path in old code MUST have a corresponding error path in the plan"

**Flag these removals:**
- Error checking removed (try/catch → no error handling)
- Validation removed (input checks → direct usage)
- Retry logic removed (exponential backoff → single attempt)
- Locking removed (mutex/semaphore → concurrent access)
- Conditional logic changed (`== "true"` → `== "Y"`)

### C. Contract Surface Analysis

Pattern: "Response shape changes are breaking unless explicitly approved"

For every endpoint, compare:
- HTTP method (GET → POST is breaking)
- Route path (/api/v1/users → /api/users is breaking)
- Auth policy (anonymous → authenticated is breaking)
- Request shape (required fields added is breaking)
- Response shape (fields removed/renamed is breaking)
- Status codes (404 → 200 changes semantics)

### D. Configuration Migration Check

Only when `source_path` provided.

Compare between old and new:
- Auth configurations (OAuth → Basic is breaking)
- Credential sources (KeyVault → config file is security risk)
- Feature flags (removed flags break toggling)
- Health checks (placeholder checks hide failures)
- Middleware pipeline (removed middleware changes behavior)

Flag competing/duplicate configurations.

### E. Domain Assumptions Inventory

List all magic values, defaults, and business logic constants:
- IP defaults like "1.1.1.1"
- Cache TTLs like 86400 (1 day)
- Freeze indicators like "true" vs "Y"
- Status codes with business meaning
- Retry counts and backoff multipliers

Flag any that are changed or missing in the plan.

### F. Credential Source Inventory

*Ensure the plan accounts for every credential's runtime source — not just its value.*

For each external dependency that requires authentication:

| Credential | Source in Old Code | Source in Plan | Security Level | Status |
|------------|-------------------|----------------|----------------|--------|
| DB Connection | KeyVault | KeyVault | Same | PASS |
| API Key | KeyVault | appsettings.json | Downgrade | FAIL |
| Subscriber Code | SQL Stored Proc | Config file | Downgrade | FAIL |
| TLS Cert | Valet/CertStore | env var | Downgrade | WARN |

**Flag as FAIL:**
- Credential moved from a secure source (KeyVault, secrets manager, HSM) to a less secure source (config file, env var, hardcoded)
- Credential source not documented in the plan at all
- No verification step in the plan for credential loading

**Flag as WARN:**
- Credential has rotation/expiration but plan doesn't account for renewal
- Proxy or cert required to reach credential source but not documented

## Output Format

```markdown
# Pre-Flight Report: [Plan Name]

## Prerequisites
- Runtime Discovery: [PRESENT / MISSING (HOLD)]
- Local Dev Setup (Task 0): [PRESENT / MISSING (WARN)]
- External Dependencies Matrix: [PRESENT / MISSING (WARN)]

## Summary
- Wiring: [N issues found]
- Behavioral: [M regressions detected]
- Contracts: [P breaking changes]
- Configuration: [Q conflicts]
- Domain: [R assumptions violated]
- Credentials: [S source issues]

## Wiring
- [PASS/WARN/FAIL] ISomeInterface → SomeImplementation → services.AddScoped()
- [PASS/WARN/FAIL] IAnotherService → ? (NO IMPLEMENTATION FOUND)

## Behavioral Preservation
- [PASS/WARN/FAIL] GET /api/users: Error handling removed at line 45
- [PASS/WARN/FAIL] ProcessPayment(): Retry logic missing (was 3 attempts with exponential backoff)

## Contract Surface
- [PASS/WARN/FAIL] GET /api/users: Response shape changed (removed 'isActive' field)
- [PASS/WARN/FAIL] POST /api/login: Status codes changed (401 → 403)

## Configuration
- [PASS/WARN/FAIL] Auth: Competing configurations (OAuth in Startup.cs, Basic in appsettings.json)
- [PASS/WARN/FAIL] KeyVault: Credentials moved to config file (security downgrade)

## Domain Assumptions
- [PASS/WARN/FAIL] IP default: Changed from "1.1.1.1" to "0.0.0.0"
- [PASS/WARN/FAIL] Freeze indicator: Changed from "true" to "Y"

## Credential Sources
- [PASS/WARN/FAIL] TransUnion API Key: KeyVault → appsettings.json (SECURITY DOWNGRADE)
- [PASS/WARN/FAIL] Subscriber Code: SQL Proc → Not documented (MISSING)

## Critical Issues (Must Fix)
1. [Issue with file:line reference and fix suggestion]

## Important Issues (Should Fix)
1. [Issue with file:line reference and fix suggestion]

## Verdict: [CLEAR FOR TAKEOFF / HOLD — N issues to resolve]
```

## Integration

- Called AFTER `/dev-create-plan` or `/dev-create-plan`
- Called BEFORE `/dev-execute` or `/dev-swarm`
- If verdict is HOLD, fix issues in plan before proceeding
- Save report to `ai_docs/reports/` for audit trail

## Examples

### Missing DI Registration (C#)
```
FAIL: IUserService → UserService → NO REGISTRATION
Fix: Add to Startup.cs ConfigureServices:
services.AddScoped<IUserService, UserService>();
```

### Removed Error Handling (TypeScript)
```
FAIL: POST /api/payment: No error handling for payment gateway timeout
Old code (payment.ts:45): try/catch with 3 retries
New plan: Single attempt, no error handling
Fix: Add retry logic with exponential backoff
```

### Breaking Contract Change (Python)
```
FAIL: GET /api/users response shape breaking change
Old: {"users": [...], "total": N}
New: {"data": [...], "count": N}
Impact: All API consumers will break
Fix: Keep original field names or version the API
```

### Configuration Conflict (Go)
```
FAIL: Database connection string defined in two places
env.go: reads from environment variable
config.yaml: hardcoded connection string
Fix: Single source of truth, remove one
```

### Credential Source Downgrade
```
FAIL: TransUnion API key credential source downgraded
Old: Azure KeyVault via Valet client (secure, rotatable)
Plan: appsettings.json (insecure, no rotation)
Impact: Credential exposed in source control, no rotation support
Fix: Preserve KeyVault integration, document Valet path and cert requirements
```
