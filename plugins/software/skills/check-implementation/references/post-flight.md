# Full post-flight: static, runtime and reflection

The full post-flight mode of `software:check-implementation`. It verifies the built code against BOTH the plan AND the original codebase, and catches what the plan check alone misses: unresolvable DI dependencies, missing error paths, broken contracts, dead interfaces. It is the post-execution pair of `software:pre-flight`, which checks the same categories in the plan before any code is written.

**Core principle:** Trust but verify. Every claim needs evidence. Every interface needs resolution. Static code lies — runtime is the only truth.

**Save to:** `./ai_docs/reports/YYYY-MM-DD-post-flight-report.md`, in the format of [post-flight-report.md](post-flight-report.md).

## Verification Phases

*Execute sequentially using a Chain of Verification. Do not proceed to the next phase until the current phase passes.*

- [ ] **Phase 1: Static Source Verification** ➔ *Run automated static checks (A-G below)*
- [ ] **Phase 2: Runtime Integration & Smoke Test** ➔ *Run interactive live checks with user*
- [ ] **Phase 3: Reflection & Lessons Learned** ➔ *Capture lessons and propose improvements*

---

## Phase 1: Static Source Verification

Run all passes — use sub-agents for parallelism where possible.

### A. Wiring Resolution Test

For each handler/service/controller, trace constructor dependencies and verify every dependency can be resolved from DI.

**C# Pattern:**
```csharp
// Controller constructor
public UserController(IUserService userService, ILogger<UserController> logger)

// Must verify in Startup.cs/Program.cs:
services.AddScoped<IUserService, UserService>();  // ✓ Found
services.AddLogging();  // ✓ Found

// Then check UserService constructor:
public UserService(IUserRepository repo, ICache cache)

// Must verify:
services.AddScoped<IUserRepository, UserRepository>();  // ✓ Found
services.AddSingleton<ICache, RedisCache>();  // ✓ Found
```

**TypeScript Pattern:**
```typescript
// Service constructor
constructor(
    @inject('UserRepository') private repo: UserRepository,
    @inject('Logger') private logger: Logger
)

// Must verify in container setup:
container.bind<UserRepository>('UserRepository').to(ConcreteUserRepository);  // ✓
container.bind<Logger>('Logger').to(ConsoleLogger);  // ✓
```

**Python Pattern:**
```python
# FastAPI endpoint
def get_users(
    service: UserService = Depends(get_user_service),
    db: Database = Depends(get_database)
):
    pass

# Must trace Depends chains:
def get_user_service(repo: UserRepository = Depends(get_user_repository)):
    return UserService(repo)  # ✓ Can construct

def get_user_repository(db: Database = Depends(get_database)):
    return UserRepository(db)  # ✓ Can construct
```

**Go Pattern:**
```go
// Service struct
type UserService struct {
    repo UserRepository
    cache Cache
}

// Must find construction:
// In main() or wire.go:
repo := NewUserRepository(db)  // ✓ Found
cache := NewRedisCache(redisClient)  // ✓ Found
service := NewUserService(repo, cache)  // ✓ Can construct
```

### B. Behavioral Equivalence Scan

When `source_path` provided, trace execution paths for each endpoint.

**Use sub-agents to trace paths in parallel:**
```
Task tool (general-purpose):
  description: "Trace execution path for GET /api/users"
  prompt: |
    Use the `software:trace` skill to trace the full execution path for GET /api/users
    in both old code at [source_path] and new code at current path.

    Compare:
    - Error handling paths
    - Validation logic
    - Locking/concurrency controls
    - Event publishing
    - External service calls

    Report any logic present in old but absent in new.
```

### C. Contract Comparison

Extract API surface from both codebases.

**Check for breaking changes:**
- Routes changed (path, method, auth)
- Request shape changed (new required fields, renamed fields)
- Response shape changed (removed fields, type changes)
- Status codes changed (404 → 200, 401 → 403)
- Error response format changed

**Example detection (C#):**
```csharp
// Old code
[HttpGet("/api/users")]
public ActionResult<UserResponse> GetUsers()
{
    return Ok(new UserResponse { Users = users, Total = count });
}

// New code
[HttpGet("/api/v2/users")]  // ❌ Route changed
public ActionResult<DataResponse> GetUsers()
{
    return Ok(new DataResponse { Data = users, Count = count });  // ❌ Response shape changed
}
```

### D. Dead Interface Detection

Find zombies in the codebase:

1. **Interfaces with no implementation:**
```csharp
public interface IMetricsCollector { }  // No class implements this
```

2. **Injected but unused dependencies:**
```typescript
constructor(
    private userService: UserService,  // Used in methods ✓
    private metricsService: MetricsService  // Never called ❌
) {}
```

3. **Registered but never injected:**
```python
# In DI container setup
container.register(OldService)  # Registered but no Depends(OldService) anywhere
```

### E. Configuration Consistency

Verify configuration integrity:

1. **Config keys referenced in code exist:**
```csharp
// Code references
config.GetValue<string>("DatabaseConnection")  // Must exist in appsettings.json

// appsettings.json
{
    "DatabaseConnection": "..."  // ✓ Found
}
```

2. **Auth policies exist:**
```csharp
[Authorize(Policy = "AdminOnly")]  // Policy must be defined

// In Startup.cs
services.AddAuthorization(options => {
    options.AddPolicy("AdminOnly", ...);  // ✓ Found
});
```

3. **Health checks aren't placeholders:**
```typescript
// Bad (placeholder)
healthCheck: async () => true  // ❌ Always returns healthy

// Good (actual check)
healthCheck: async () => {
    return await database.ping();  // ✓ Real health verification
}
```

### F. Compilation/Build Verification

Run actual commands — don't assume:

```bash
# C#
dotnet build
dotnet test

# TypeScript
npm run build
npm test

# Python
python -m py_compile **/*.py
pytest

# Go
go build ./...
go test ./...
```

Capture exit codes and full output.

### G. Credential Source Inventory

*Ensure credentials weren't downgraded from secure sources (KeyVault, secrets manager) to flat config files during implementation.*

For each credential in the plan's Credential Source Inventory table:
1. Verify the runtime source matches what was documented (KeyVault → KeyVault, not KeyVault → appsettings.json)
2. Verify the loading chain exists in code (the code that reads from the secure source)
3. Flag any credential that moved from a secure source to a less secure one

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP HERE. Present the Phase 1 Static Report. Do not proceed to Phase 2 until the user resolves any `FAIL` states. If the user chooses to defer non-critical issues, document them as accepted risks.

---

## Phase 2: Runtime Integration & Smoke Test

*Static code lies. Runtime is the only truth.* Run what you can reach yourself (start the service, send the request, capture the output); instruct the user to run the rest and paste the output:

### 2a. Integration Ping (External Dependencies)

For each dependency in the plan's External Dependencies Matrix:
1. Run the integration test script documented in the plan
2. Verify network reachability (can the service reach the dependency?)
3. Verify authentication succeeds (does the credential work?)
4. Verify a minimal operation (can it read/write?)

### 2b. Live Smoke Test (Runtime Drift)

1. **Start the new service locally.** Check startup logs for:
   - Silent DI resolution failures
   - Config loading errors
   - Connection failures to databases, caches, or external services
   - Missing environment variables or certs

2. **Send a minimal valid request** to the primary endpoint. Verify:
   - Response status code matches expected
   - Response shape matches the contract
   - No errors in service logs

3. **If Rewrite:** Send the *exact same request* to BOTH the old and new running services. Diff the actual HTTP responses to catch:
   - Deserialization/typing drift (e.g., `string?` vs `int`)
   - Field name changes
   - Missing fields
   - Status code differences
   - Header differences

🛑 **PROGRESSIVE DISCLOSURE GATE:** You CANNOT mark Post-Flight as "CLEAR" until every Phase 2 check has real terminal output or logs, captured by you or provided by the user. If skipped by the user, the verdict is strictly **WARN: Runtime Behavior Unverified**.

---

## Phase 3: Reflection & Lessons Learned

*After verification is complete, reflect on what was missed to improve future implementations.*

**Save to:** `./ai_docs/reflections/YYYY-MM-DD-<topic>-reflection.md`

### 1. Read the post-flight report

Start by reading the post-flight report to understand what issues were found:
- Wiring gaps (interfaces without implementations)
- Behavioral regressions (logic removed or changed)
- Contract breaks (response shape changes)
- Configuration issues (auth, credentials, feature flags)
- Domain knowledge gaps (magic values, business rules misunderstood)

### 2. Categorize Misses

For each issue found, categorize by root cause:

| Category | Description | Example |
|----------|-------------|---------|
| **Wiring Gap** | Interface created but not wired | IEmailService with no DI registration |
| **Behavioral Regression** | Logic from old code not preserved | Retry mechanism removed |
| **Contract Break** | API shape changed unexpectedly | Response field renamed |
| **Configuration Issue** | Config/auth/middleware problems | Missing appsettings key |
| **Domain Gap** | Business rule misunderstood | IP default changed from "1.1.1.1" to "0.0.0.0" |
| **Pattern Mismatch** | Used wrong pattern for context | Used repository pattern where service pattern expected |
| **Assumption Error** | Incorrect assumption about system | Assumed all users have email |

### 3. Identify Root Cause Stage

For each miss, identify where in the pipeline it originated:

**Brainstorm Gap:**
- Design didn't identify the requirement
- Preservation analysis missed critical behavior
- Didn't ask about edge cases
- Example: "Didn't ask about retry policies"

**Planning Gap:**
- Plan didn't include implementation step
- Task missing verification step
- Wiring not specified in plan
- Example: "Plan didn't include DI registration task"

**Execution Gap:**
- Plan specified it but not implemented
- Task marked complete but not actually done
- Skipped a step in the plan
- Example: "Plan said add retry but implementer forgot"

**Quality Gap:**
- Implemented but incorrectly
- Wrong pattern or approach used
- Misunderstood the requirement
- Example: "Added retry but used wrong backoff strategy"

### 4. Pattern Recognition

Look for patterns across multiple misses:

**Common Patterns:**
- **The Forgotten Registration**: Interfaces created without DI setup
- **The Lost Handler**: Error paths in old code not carried forward
- **The Shape Shifter**: Response objects restructured breaking consumers
- **The Magic Eraser**: Domain constants changed without understanding
- **The Phantom Dependency**: Service injected but never used
- **The Config Orphan**: Code expects config that doesn't exist

### 5. Propose Improvements

For each pattern, propose specific improvements:

**Brainstorming Questions to Add:**
```markdown
- "Does the existing code have retry mechanisms I should preserve?"
- "Are there any magic values or defaults with business meaning?"
- "Which API consumers would break if response shapes change?"
- "Are there competing configuration sources to consolidate?"
```

**Planning Checklist Items:**
```markdown
- [ ] Every interface has implementation task
- [ ] Every implementation has registration task
- [ ] Every endpoint has contract preservation check
- [ ] Every rewrite has behavioral equivalence verification
```

**Swarm Verification Steps:**
```markdown
- Spawn verifier agent at start, not just at end
- Create verification tasks for each wave
- Block next wave until verification passes
- Re-verify after any fixes
```

### 6. Update Team Knowledge

Identify knowledge that should be added to:
- CLAUDE.md (coding standards, patterns)
- README.md (architectural decisions)
- Team wikis (domain knowledge, gotchas)

🛑 **PROGRESSIVE DISCLOSURE GATE:** Phase 3 produces the reflection document. Review it with the user before finalizing.


---

## Common Patterns to Catch

### The Missing Registration (C#)
```csharp
// Controller has dependency
public MyController(INewService service)

// Interface exists
public interface INewService { }

// Implementation exists
public class NewService : INewService { }

// But NO registration in Startup.cs!
// Missing: services.AddScoped<INewService, NewService>();
```

### The Silent Failure (TypeScript)
```typescript
// Old code
try {
    const result = await apiCall();
    return result;
} catch (error) {
    logger.error(error);
    return DEFAULT_VALUE;  // Fallback
}

// New code
const result = await apiCall();  // No error handling!
return result;  // Will crash on API failure
```

### The Shape Shifter (Python)
```python
# Old API response
return {
    "users": user_list,
    "total": len(user_list),
    "page": page_num
}

# New API response
return {
    "data": user_list,  # Field renamed!
    "count": len(user_list),  # Field renamed!
    # "page" field removed!
}
```

### The Phantom Interface (Go)
```go
// Interface defined
type CacheService interface {
    Get(key string) (interface{}, error)
    Set(key string, value interface{}) error
}

// But no struct implements it anywhere in the codebase!
// grep -r "struct.*CacheService" returns nothing
```

### The Credential Downgrade
```csharp
// Old code — secure
var apiKey = await keyVaultClient.GetSecretAsync("TransUnion-ApiKey");

// New code — insecure!
var apiKey = configuration["TransUnion:ApiKey"];  // ❌ Moved from KeyVault to appsettings.json
```

## Key Patterns by Language

### C# (.NET)
**Common Misses:**
- Forgetting `IServiceCollection` registration
- Missing `IOptions<T>` configuration binding
- Losing middleware pipeline ordering
- Breaking `async`/`await` patterns

**Prevention:**
```csharp
// Always follow this pattern
public interface IMyService { }
public class MyService : IMyService { }
// In Startup.cs or Program.cs
services.AddScoped<IMyService, MyService>();
// Test resolution
var provider = services.BuildServiceProvider();
var service = provider.GetRequiredService<IMyService>(); // Must not throw
```

### TypeScript/Node
**Common Misses:**
- Incorrect DI container binding
- Lost error boundaries in async handlers
- Changed response envelope structure
- Missing middleware in Express chain

**Prevention:**
```typescript
// Always follow this pattern
interface IUserService { }
class UserService implements IUserService { }
container.bind<IUserService>(TYPES.UserService).to(UserService);
// Test resolution
const service = container.get<IUserService>(TYPES.UserService); // Must resolve
```

### Python
**Common Misses:**
- FastAPI `Depends()` chain broken
- Lost exception handlers
- Changed Pydantic model fields
- Missing async context managers

**Prevention:**
```python
# Always follow this pattern
class UserService(Protocol):
    pass

class ConcreteUserService:
    pass

def get_user_service() -> UserService:
    return ConcreteUserService()

# In endpoint
def endpoint(service: UserService = Depends(get_user_service)):
    pass
```

### Go
**Common Misses:**
- Interface satisfaction not verified
- Lost error return values
- Changed struct tags affecting JSON
- Missing defer cleanup

**Prevention:**
```go
// Always follow this pattern
type UserService interface {
    GetUser(id string) (*User, error)
}

type userService struct{}

// Compile-time check
var _ UserService = (*userService)(nil)

func (s *userService) GetUser(id string) (*User, error) {
    // Implementation
}
```
