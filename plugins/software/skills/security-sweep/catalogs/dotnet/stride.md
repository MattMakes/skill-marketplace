# stride-modeler — .NET catalog

> Inlined into the stride-modeler system prompt when the audited repo's primary language is `dotnet`. Every entry below is a concrete pattern to look for in C#/F#/VB code or its config — not generic advice.

## File globs to scan

- `**/Program.cs`, `**/Startup.cs` — host wiring, identifies deployment shape
- `**/*.csproj`, `**/Directory.Packages.props` — identifies the SDK type (`Microsoft.NET.Sdk.Web`, `Microsoft.NET.Sdk.Worker`, `Microsoft.NET.Sdk.Functions`, etc.)
- `**/host.json`, `**/function.json`, `**/local.settings.json` — Azure Functions
- `**/appsettings*.json` — Kestrel/HTTPS/CORS/AuthN config
- `**/Dockerfile*`, `**/docker-compose*.yml`, `**/k8s/**/*.yaml`, `**/charts/**/*.yaml`
- `**/Hubs/**/*.cs` — SignalR
- `**/Protos/**/*.proto`, `**/*Service.cs` (gRPC)
- `**/*Consumer.cs`, `**/*Handler.cs` — MassTransit / MediatR / NServiceBus
- `**/IISExpress.applicationhost.config`, `**/web.config` — IIS hosting
- `**/Middleware/**/*.cs`, `**/Filters/**/*.cs`

## Native tooling

- `rg -n 'Microsoft\.NET\.Sdk\.(Web|Worker|Functions|BlazorWebAssembly)' -g '*.csproj'` — identify the host shape per project.
- `rg -n 'WebApplication\.CreateBuilder|Host\.CreateDefaultBuilder|FunctionsHost' --type cs` — entry-point detection.
- `dotnet ef dbcontext info --json` — surfaces the data store boundary (when EF is in use).

## Deployment shape detection (run first)

1. **ASP.NET Core in-proc Kestrel** → `Microsoft.NET.Sdk.Web` SDK, `WebApplication.CreateBuilder`, no `web.config`.
2. **IIS / IIS Express hosting** → `web.config` with `<aspNetCore processPath="dotnet" .../>`, `Microsoft.AspNetCore.Server.IIS` reference.
3. **Azure App Service** → `web.config` + `appsettings.Production.json` with App Service settings + `WEBSITE_*` env vars in workflows.
4. **Azure Functions** → `Microsoft.NET.Sdk.Functions` (in-proc, EOL post-Nov 2026) or `Microsoft.Azure.Functions.Worker` (isolated), `host.json`, `function.json` or `[Function]` attribute.
5. **Worker Service / IHostedService** → `Microsoft.NET.Sdk.Worker`, `Host.CreateDefaultBuilder()`, `BackgroundService`/`IHostedService` subclass.
6. **Container Apps / AKS** → Dockerfile + k8s manifests + `Microsoft.NET.Sdk.Web` / `Worker`.
7. **Blazor Server / WASM / Blazor United** → `Microsoft.NET.Sdk.BlazorWebAssembly` or `_Host.cshtml`/`App.razor`.
8. **gRPC service** → `Grpc.AspNetCore` reference, `*.proto` files, `app.MapGrpcService<...>()`.

## Trust boundaries to enumerate

- **HTTP ingress** — Kestrel / IIS / reverse proxy (App Gateway, Nginx, Front Door)
- **AuthN/AuthZ** — `[Authorize]` + `services.AddAuthentication(...).AddJwtBearer/AddCookie/AddOpenIdConnect`
- **API surface** — controllers, Minimal API endpoint groups, Razor Pages handlers
- **gRPC services** — `MapGrpcService<T>` boundaries, per-method auth via interceptors
- **SignalR hubs** — persistent bidirectional, group membership = trust scope
- **Background workers** — `BackgroundService`, `IHostedService` consuming queues / timers
- **Message-bus consumers** — MassTransit, NServiceBus, Wolverine, MediatR notifications, Azure Service Bus / Storage Queue / Event Hub triggers (Functions)
- **Outbound integrations** — `HttpClient`, `IDistributedCache`, EF Core `DbContext`, Cosmos `Container`, Service Bus sender
- **File system / blob storage** — `BlobServiceClient`, `IFileProvider`
- **Inter-process** — gRPC client, named pipes, signals to sidecars (Dapr)

## STRIDE catalog (per-component)

### Spoofing — identity & authentication

#### Multiple auth schemes registered, default scheme ambiguous

**What to look for:** `services.AddAuthentication()` followed by both `.AddCookie()` and `.AddJwtBearer()` without a clearly chosen `DefaultScheme` / `DefaultChallengeScheme` — `[Authorize]` may resolve to a weaker scheme than intended.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddAuthentication\s*\(' --type cs -A 12
rg -nP 'DefaultScheme|DefaultChallengeScheme|DefaultAuthenticateScheme' --type cs
```
**File hint:** Program.cs / Startup.cs.

#### JWT issuer/audience not validated (covered in owasp.md but STRIDE-relevant)

**What to look for:** see `owasp.md` — `ValidateIssuer = false`, `ValidateAudience = false` enables token reuse across tenants.
**Concrete grep / ripgrep query:** see owasp catalog.

#### Cookie auth missing `RequireHttpsMetadata` / non-`Secure` cookies

**What to look for:** `AddCookie(o => o.Cookie.SecurePolicy = CookieSecurePolicy.None)` or unset on production.
**Concrete grep / ripgrep query:**
```
rg -nP 'CookieSecurePolicy\.None|Cookie\.SecurePolicy' --type cs
rg -n 'AddCookie\(' --type cs -A 10
```
**File hint:** Auth/ config.

#### gRPC mutual-TLS / API key auth missing

**What to look for:** `MapGrpcService<T>()` with no `RequireAuthorization()` AND no `Grpc.AspNetCore.Server` interceptor enforcing client certs.
**Concrete grep / ripgrep query:**
```
rg -nP 'MapGrpcService<' --type cs -A 3
rg -nP 'AddGrpc\s*\(' --type cs -A 5
```
**File hint:** gRPC Program.cs.

#### SignalR hub authentication

**What to look for:** `class FooHub : Hub` without `[Authorize]`; `app.MapHub<FooHub>("/hub")` without `.RequireAuthorization()`.
**Concrete grep / ripgrep query:**
```
rg -nP 'class\s+\w+\s*:\s*Hub' --type cs -B 3
rg -nP 'MapHub<' --type cs -A 2
```

### Tampering — integrity

#### Mass assignment via model binding (covered in owasp.md, modeled here as STRIDE-T)

**What to look for:** EF entities used as `[FromBody]` parameters → consumer sets server-controlled fields like `IsAdmin`, `RoleId`, `TenantId`.
**Concrete grep / ripgrep query:** see owasp.md.

#### Outbox / message-broker integrity gaps

**What to look for:** MassTransit / Wolverine / NServiceBus consumers without idempotency keys, missing `UseInMemoryOutbox()` or transactional outbox configuration.
**Concrete grep / ripgrep query:**
```
rg -nP 'UseInMemoryOutbox|UseTransactionalOutbox|EnableOutbox|UseEntityFrameworkOutbox' --type cs
rg -nP 'IConsumer<|IRequestHandler<|IHandleMessages<' --type cs
```
**File hint:** Consumers/, Handlers/.

#### Parameter / query-string tampering — IDOR

**What to look for:** Endpoints accepting `id` parameter and querying without an ownership check (`WHERE Id = @id` not `WHERE Id = @id AND OwnerId = @currentUser`).
**Concrete grep / ripgrep query:**
```
rg -nP '_db\.\w+\.(Find|FindAsync|FirstOrDefault|Where)\s*\(' --type cs -A 2
rg -nP 'DbContext\.\w+\.(Find|FindAsync)\s*\(\s*id\s*\)' --type cs
```
**File hint:** controllers, services that map URL params to DB rows.

#### File-upload integrity / MIME-sniff abuse

**What to look for:** `IFormFile` accepted without `[RequestSizeLimit]`, MIME validation by extension only, no virus scanning hook.
**Concrete grep / ripgrep query:**
```
rg -nP 'IFormFile\b' --type cs
rg -nP 'RequestSizeLimit|RequestFormLimits|MultipartBodyLengthLimit|ValueLengthLimit' --type cs
rg -nP 'FileExtensionContentTypeProvider' --type cs
```
**File hint:** upload controllers.

### Repudiation — auditability

#### No audit log for security-sensitive actions

**What to look for:** Login/logout/role-change/admin-action handlers lacking `_auditLogger.LogAsync(...)` or `ILogger.LogInformation` with structured user/action/correlation.
**Concrete grep / ripgrep query:**
```
rg -nP '\[HttpPost\]|\[HttpDelete\]|\[HttpPut\]' --type cs -A 8 | rg -nP '(Login|Register|ChangePassword|ResetPassword|Delete|GrantRole|Impersonate)'
rg -nP 'IAuditService|AuditLogger|audit\.Log' --type cs
```
**File hint:** Account/, Admin/, Identity/.

#### W3C-trace / correlation IDs not enforced

**What to look for:** Lack of `app.UseHeaderPropagation()` / `services.AddHeaderPropagation` / OpenTelemetry trace export — correlation across services missing makes repudiation easier.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddOpenTelemetry|UseHeaderPropagation|AddHeaderPropagation' --type cs
```

#### `Microsoft.Identity.Web` events not handled (silent failures)

**What to look for:** OIDC / cookie events (`OnTokenValidated`, `OnAuthenticationFailed`, `OnRemoteFailure`) not implemented — failures aren't logged.
**Concrete grep / ripgrep query:**
```
rg -nP 'OnTokenValidated|OnAuthenticationFailed|OnRemoteFailure|OnAccessDenied' --type cs
```

### Information disclosure

#### `ProblemDetails` / unhandled exceptions leak stack traces in prod

**What to look for:** `app.UseDeveloperExceptionPage()` outside `IsDevelopment()`, custom `ExceptionFilter` returning `ex.ToString()`.
**Concrete grep / ripgrep query:**
```
rg -nP 'UseDeveloperExceptionPage' --type cs
rg -nP 'ex\.ToString\(\)|ex\.StackTrace' --type cs
```
**File hint:** Program.cs, Filters/.

#### Swagger / Swashbuckle exposed in production without auth

**What to look for:** `app.UseSwagger()` / `app.UseSwaggerUI()` not gated on `IsDevelopment()` or `[Authorize]` on the swagger endpoints.
**Concrete grep / ripgrep query:**
```
rg -nP 'UseSwagger\b|UseSwaggerUI|MapSwagger|MapOpenApi' --type cs
rg -nP 'IsDevelopment\(\)' --type cs -A 4
```
**File hint:** Program.cs.

#### EF Core sensitive data logging

**What to look for:** `optionsBuilder.EnableSensitiveDataLogging()` or `EnableDetailedErrors()` enabled in production — query parameters (PII) logged.
**Concrete grep / ripgrep query:**
```
rg -nP 'EnableSensitiveDataLogging|EnableDetailedErrors' --type cs
```
**File hint:** DbContext, Program.cs.

#### Health-check endpoints leak internal state

**What to look for:** `app.MapHealthChecks("/health")` returning detailed component status (DB connection strings, queue endpoints) without auth.
**Concrete grep / ripgrep query:**
```
rg -nP 'MapHealthChecks\s*\(' --type cs -A 4
rg -nP 'AddHealthChecks\(\)' --type cs -A 6
```
**File hint:** Program.cs.
**False-positive guard:** `/health/live` (liveness) returning 200/503 only is fine; `/health/ready` with full breakdown should be `RequireAuthorization()` or filtered.

#### Verbose `ProblemDetails.Extensions` including server paths

**What to look for:** Custom `ProblemDetailsFactory` adding `traceId` or `path` plus internal exception details.
**Concrete grep / ripgrep query:**
```
rg -nP 'ProblemDetailsFactory|AddProblemDetails' --type cs -A 10
```

#### Static file serving leaks sources

**What to look for:** `UseStaticFiles` over the project root or `UseDirectoryBrowser`.
**Concrete grep / ripgrep query:**
```
rg -nP 'UseDirectoryBrowser|UseStaticFiles\s*\(\s*new\s+StaticFileOptions' --type cs
```

### Denial of service

#### No rate limiting on Minimal API / controller endpoints

**What to look for:** No `services.AddRateLimiter(...)` registration AND no `app.UseRateLimiter()`. Especially risky for unauthenticated POST endpoints.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddRateLimiter|UseRateLimiter|RequireRateLimiting|EnableRateLimiting' --type cs
rg -n '[Microsoft\.AspNetCore\.RateLimiting]' --type cs
```
**File hint:** Program.cs.

#### Unbounded request body / form size

**What to look for:** `[DisableRequestSizeLimit]`, `app.UseKestrel(o => o.Limits.MaxRequestBodySize = null)`, or default Kestrel limit raised dramatically.
**Concrete grep / ripgrep query:**
```
rg -nP 'DisableRequestSizeLimit|MaxRequestBodySize|MaxConcurrentConnections|MaxConcurrentUpgradedConnections' --type cs
```

#### SignalR — no `MaximumReceiveMessageSize` / unbounded groups

**What to look for:** `AddSignalR(o => { o.MaximumReceiveMessageSize = null; })`.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddSignalR' --type cs -A 6
rg -nP 'MaximumReceiveMessageSize' --type cs
```

#### Regex DoS

**What to look for:** `Regex` constructed from user input or with no `RegexOptions.NonBacktracking` (.NET 7+) and no timeout.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+Regex\s*\(' --type cs -A 1
rg -nP 'RegexOptions\.NonBacktracking|MatchTimeout' --type cs
```
**File hint:** input validators.

#### Background work spawning unbounded `Task.Run`

**What to look for:** Endpoints calling `Task.Run(...)` per request without back-pressure or bounded `Channel<T>`.
**Concrete grep / ripgrep query:**
```
rg -nP 'Task\.Run\s*\(' --type cs
rg -nP 'Channel\.CreateBounded|Channel\.CreateUnbounded' --type cs
```

#### Quartz / Hangfire / Worker schedules without concurrency limits

**What to look for:** `[DisallowConcurrentExecution]` missing on Quartz jobs; Hangfire `BackgroundJob.Enqueue` calls inside request handlers.
**Concrete grep / ripgrep query:**
```
rg -nP 'DisallowConcurrentExecution|IJob\b|BackgroundJob\.Enqueue|RecurringJob\.AddOrUpdate' --type cs
```

### Elevation of privilege

#### `[Authorize(Roles = "...")]` typo / inverted logic

**What to look for:** `[Authorize(Roles = "Admin,User")]` (acts as OR — any user with either role passes), when intent was AND. AND requires policy or stacked `[Authorize]` attributes.
**Concrete grep / ripgrep query:**
```
rg -nP '\[Authorize\s*\(\s*Roles\s*=' --type cs
rg -nP 'AddAuthorization|AddPolicy' --type cs -A 5
```
**File hint:** controllers, policy registration.

#### Custom `AuthorizationHandler` short-circuits

**What to look for:** `AuthorizationHandler<T>` that calls `context.Succeed(requirement)` unconditionally or based on a too-broad claim.
**Concrete grep / ripgrep query:**
```
rg -nP 'AuthorizationHandler<' --type cs -A 15
rg -nP 'context\.Succeed' --type cs -B 3
```

#### Impersonation / `WindowsIdentity.RunImpersonated` paths

**What to look for:** Code switching identity at runtime — verify caller is allowed.
**Concrete grep / ripgrep query:**
```
rg -nP 'RunImpersonated|WindowsImpersonationContext|ImpersonateLoggedOnUser' --type cs
```

#### Anti-forgery disabled per-controller / globally

**What to look for:** `[IgnoreAntiforgeryToken]`, `services.AddControllersWithViews(o => o.Filters.RemoveAll(...))` removing antiforgery filter.
**Concrete grep / ripgrep query:**
```
rg -nP 'IgnoreAntiforgeryToken' --type cs
rg -nP 'AutoValidateAntiforgeryToken' --type cs
```

#### `app.MapIdentityApi<TUser>()` exposed without restriction

**What to look for:** .NET 8+ `MapIdentityApi` mounted at root without rate limiting / email verification gating — registration endpoint can be abused.
**Concrete grep / ripgrep query:**
```
rg -nP 'MapIdentityApi<' --type cs -A 2
```

#### `IHostedService` running with elevated managed identity but called by request handler

**What to look for:** Background services using `DefaultAzureCredential` to talk to Key Vault / SQL — make sure HTTP handlers can't directly invoke privileged operations on those services.
**Concrete grep / ripgrep query:**
```
rg -nP 'BackgroundService\b|IHostedService\b' --type cs
rg -nP 'DefaultAzureCredential|ManagedIdentityCredential' --type cs
```

## Per-deployment-shape STRIDE callouts

### ASP.NET Core in-proc Kestrel
- Kestrel listens on configured ports — verify `Kestrel:Endpoints` in `appsettings.json` doesn't bind to `0.0.0.0` for admin endpoints.
- Header limits configurable via `Kestrel:Limits:MaxRequestHeaderCount`/`MaxRequestHeadersTotalSize`.

### IIS hosted (`Microsoft.AspNetCore.Server.IIS`)
- `web.config` `aspNetCore` element with `forwardWindowsAuthToken="true"` carries Windows identity into the worker — verify need.
- Verify `httpProtocol/customHeaders` strips `Server`/`X-Powered-By`.

### Azure Functions — isolated worker
- `host.json` `"extensions": { "http": { "routePrefix": "" } }` removes `/api` prefix; verify auth still applied.
- HTTP triggers default `AuthorizationLevel.Function` — hardcoded function key is a weak token; prefer `AuthorizationLevel.User` with `[Authorize]` and Easy Auth.
- Consumption-plan timeouts (5/10 min) → DoS surface for long-running operations.
**Concrete grep / ripgrep query:**
```
rg -nP '\[HttpTrigger\s*\(\s*AuthorizationLevel\.(Anonymous|Function|Admin)' --type cs
```

### Azure Container Apps / AKS
- Verify Dapr sidecar mTLS / network policy in k8s manifests.
- `services.AddDataProtection().PersistKeysToFileSystem(...)` writing to a non-persistent volume → key rotation tampering.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddDataProtection|PersistKeysToFileSystem|PersistKeysToAzureBlobStorage|ProtectKeysWithAzureKeyVault' --type cs
```

### Blazor Server
- All component code runs server-side over a SignalR circuit — long-lived authenticated state. Verify circuit-handler timeouts and re-auth on identity change.
- `[CascadingAuthenticationState]` missing breaks `[Authorize]` in components.
**Concrete grep / ripgrep query:**
```
rg -nP 'CascadingAuthenticationState|AuthorizeRouteView|MapBlazorHub' --type cs -g '*.razor'
```

### Blazor WebAssembly
- All client code is shipped — secrets in client must be assumed leaked. Verify no `appsettings.json` secret keys are wwwroot-served.
- API endpoints are the actual security boundary; `[Authorize]` in a WASM component is a UX convenience, not enforcement.
**Concrete grep / ripgrep query:**
```
fd -t f 'appsettings*.json' -p wwwroot
```

### Worker Service / Background processor
- No HTTP ingress = no auth boundary, but message-bus subscriptions are. Confirm SAS / connection string scope is least-privilege and stored in Key Vault.

### MassTransit / Wolverine consumers
- `IConsumer<TMessage>.Consume` runs on broker thread — exception handling determines DoS posture (poison messages without retry-cap loop forever).
**Concrete grep / ripgrep query:**
```
rg -nP 'UseMessageRetry|UseScheduledRedelivery|IRetryPolicy|MaximumRetries' --type cs
```

### gRPC services
- Per-method auth via `[Authorize]` on the method (override controller default) and `Interceptor` registration.
- Reflection enabled (`AddGrpcReflection`) leaks contracts in prod.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddGrpcReflection|MapGrpcReflectionService' --type cs
```
