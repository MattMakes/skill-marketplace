# Post-flight report template

The report format for the full post-flight mode of `software:check-implementation` (see [post-flight.md](post-flight.md)). Fill every row; mark runtime rows PENDING until the outputs are in.

```markdown
# Post-Flight Report: [Plan Name]

## Summary Dashboard
| Category | Status | Issues | Critical |
|----------|--------|--------|----------|
| Wiring | FAIL | 3 | 2 |
| Behavioral | WARN | 5 | 0 |
| Contracts | PASS | 0 | 0 |
| Dead Code | WARN | 2 | 0 |
| Config | FAIL | 1 | 1 |
| Credentials | PASS | 0 | 0 |
| Build | PASS | - | - |
| Tests | FAIL | 12/47 | - |
| **Runtime Integration** | **PENDING** | - | - |
| **Live Smoke Test** | **PENDING** | - | - |
| **Reflection** | **PENDING** | - | - |

## Phase 1: Static Verification

### Wiring Resolution
#### ❌ CRITICAL: Unresolvable Dependencies
- UserController: Cannot resolve IEmailService (no registration found)
- OrderService: Cannot resolve IPaymentGateway (interface has no implementation)

#### ✅ Resolved Successfully
- AuthController: All 4 dependencies resolved
- ProductService: All 3 dependencies resolved

### Behavioral Equivalence
#### ⚠️ Logic Changes Detected
- GET /api/users: Pagination logic removed (was limit/offset, now returns all)
- POST /api/payment: Retry mechanism missing (was 3 attempts with backoff)
- DELETE /api/order: No longer publishes OrderDeleted event

#### ✅ Preserved Successfully
- Authentication flows intact
- Validation logic maintained
- Error handling preserved

### Contract Analysis
#### ❌ Breaking Changes
- GET /api/users: Response field 'isActive' removed
- POST /api/login: Now returns 403 instead of 401 for bad credentials

#### ✅ Compatible Changes
- GET /api/products: Added optional 'category' filter (non-breaking)

### Dead Code Found
#### ⚠️ Unused Interfaces
- IMetricsCollector: Interface defined but never implemented
- IOldService: Has implementation but never injected

#### ⚠️ Unused Injections
- OrderController.metricsService: Injected but never called
- UserService.cacheService: Injected but all calls commented out

### Configuration Issues
#### ❌ CRITICAL: Missing Configuration
- "EmailServiceUrl" referenced but not in appsettings.json

#### ⚠️ Auth Policy Mismatch
- "SuperAdmin" policy referenced but not defined

### Credential Source Verification
#### ✅ All credentials use documented sources
- TransUnion API key: KeyVault ✓
- Database connection: KeyVault ✓

### Build Results
#### ✅ Build Success
```
dotnet build
Build succeeded.
0 Warning(s)
0 Error(s)
```

### Test Results
#### ❌ Test Failures
```
dotnet test
Failed: 12
Passed: 35
Total: 47

Failing tests:
- UserServiceTests.ShouldHandleNullEmail
- OrderControllerTests.ShouldReturn404ForMissingOrder [...]
```

---

## Phase 2: Runtime Verification

### Integration Ping Results
| Dependency | Reachable | Auth | Minimal Op | Status |
|------------|-----------|------|------------|--------|
| [Awaiting user terminal output] |

### Live Smoke Test Results
| Endpoint | Expected Status | Actual Status | Response Match | Status |
|----------|----------------|---------------|----------------|--------|
| [Awaiting user terminal output] |

### Response Diff (Rewrites Only)
| Endpoint | Difference | Severity |
|----------|-----------|----------|
| [Awaiting user terminal output] |

---

## Phase 3: Reflection

# Reflection: [Feature/Project Name]

## Summary
- Total Issues Found: [N]
- Critical Issues: [M]
- Root Cause Breakdown: Brainstorm ([X]), Planning ([Y]), Execution ([Z])

## What Went Well
### Successes
- Clean architecture properly separated concerns
- Test coverage exceeded requirements
- API documentation was comprehensive

### Effective Patterns
- Using IServiceCollection extension methods for DI organization
- Separate validation layer caught input errors early
- Consistent error response format across endpoints

## What Was Missed

### Critical Misses
| # | Issue | Category | Root Cause | Stage | Impact |
|---|-------|----------|------------|-------|--------|
| 1 | IEmailService not registered | Wiring Gap | Plan didn't include registration | Planning | Runtime crash |
| 2 | Payment retry removed | Behavioral | Didn't identify retry requirement | Brainstorm | Increased failures |

### Pattern Analysis
**The Forgotten Registration** (3 instances)
- IEmailService, IMetricsCollector, ICacheService all created without DI registration
- Root: Plans focus on interface/implementation but forget the wiring step
- Fix: Add mandatory "Step N: Register in DI" to every interface task

**The Lost Handler** (5 instances)
- Error handling removed from payment, user creation, order processing
- Root: Brainstorming doesn't analyze error paths in existing code
- Fix: Add "Trace error paths" to preservation analysis

## Questions Brainstorming Should Have Asked

### Wiring Questions
- "How is dependency injection configured in this codebase?"
- "What's the pattern for registering new services?"
- "Are there any special lifetime scopes (singleton vs scoped)?"

### Behavioral Questions
- "What error handling patterns exist that must be preserved?"
- "Are there any retry mechanisms with specific strategies?"
- "What validation happens at each layer?"

### Domain Questions
- "Are there magic values that have specific business meaning?"
- "What are the critical paths that absolutely cannot fail?"
- "Are there any rate limits or throttling to consider?"

## Checks Planning Should Have Included

### Mandatory Task Elements
```markdown
Every interface task MUST include:
1. Define interface
2. Create implementation
3. Register in DI container
4. Add DI resolution test
5. Verify can construct
```

### Verification Gates
```markdown
After each task group:
- [ ] Run wiring verification
- [ ] Check behavioral equivalence
- [ ] Validate contract preservation
- [ ] Confirm configuration consistency
```

## Verification Swarm Should Have Run

### Continuous Verification
- Verifier agent should run after EACH task, not just at end
- Verifier should have blocking power - can prevent next wave
- Every fix requires re-verification before proceeding

### Automated Checks
```bash
# After each implementation wave
dotnet build  # Must pass
dotnet test   # Must show progress toward passing
./verify-wiring.sh  # Custom script to check DI

# Before marking complete
./contract-test.sh  # Verify API compatibility
./integration-test.sh  # End-to-end validation
```

## Specific Improvements for Next Time

### 1. Enhanced Brainstorming
Add mandatory preservation checklist:
- [ ] Traced all error paths in existing code
- [ ] Identified all retry/resilience patterns
- [ ] Documented all magic values and why they exist
- [ ] Listed all API consumers and their dependencies

### 2. Stricter Planning
Enforce Plan-Implement-Verify-Wire quad:
1. Plan what to build
2. Implement the code
3. Verify it works
4. Wire it into DI/configuration

### 3. Continuous Verification
Never trust "should work" - verify at every step:
- Write test → run test → see fail
- Write code → run test → see pass
- Add to DI → run resolution test → confirm wired
- Complete task → run integration → confirm working

## Team Knowledge Updates

### Add to CLAUDE.md
```markdown
## Wiring Rules
- Every interface MUST have implementation AND registration
- Never create interface without its DI setup in same task
- Use IServiceCollection extension methods for clean organization

## Preservation Rules
- When rewriting, preserve ALL error handling paths
- Magic values have meaning - document before changing
- API contract changes are ALWAYS breaking
```

### Add to Architecture Docs
Document discovered patterns:
- Retry strategies (exponential backoff for payments)
- Cache TTLs (1 day for user data, 1 hour for products)
- Default values (IP "1.1.1.1" for unknown locations)

## Meta-Reflection

### What This Tells Us
The majority of issues (70%) originate in brainstorming phase - we don't ask enough questions about existing code. The plan-execute gap (20%) shows we need better verification gates. The quality issues (10%) are mostly pattern mismatches.

### System Improvements
1. Make preservation analysis mandatory, not optional
2. Add automated pre-flight checks to catch gaps early
3. Enforce verifier role in all swarms
4. Create regression test suite from these issues

---

## Critical Issues (MUST FIX before production)
1. **Unresolvable IEmailService** - UserController will fail at runtime
   - Fix: Add `services.AddScoped<IEmailService, SmtpEmailService>()` to Startup.cs

2. **Missing EmailServiceUrl config** - Email sending will crash
   - Fix: Add to appsettings.json: `"EmailServiceUrl": "https://..."`

## Important Issues (SHOULD FIX)
1. **Dead IMetricsCollector interface** - Code bloat
   - Fix: Remove interface or implement it

2. **Missing retry logic in payment** - Increased failure rate
   - Fix: Restore exponential backoff retry pattern

## Verdict: [CLEAR | ISSUES — N critical must-fix | WARN: Runtime Behavior Unverified]
```
