# stride-modeler — Go catalog

> Inlined into the stride-modeler system prompt when the audited repo's primary language is `golang`. Every entry below is a concrete pattern to look for in Go code or its config — not generic advice.

## File globs to scan

- `**/*.go`
- `**/cmd/**/*.go`, `**/main.go`
- `**/internal/**/*.go`, `**/pkg/**/*.go`
- `**/handlers/**/*.go`, `**/middleware/**/*.go`, `**/routes/**/*.go`, `**/server/**/*.go`
- `**/proto/**/*.proto`, `**/*.pb.go`
- `**/Dockerfile`, `**/k8s/**`, `**/manifests/**`, `**/helm/**`
- `**/template.yaml` (SAM), `**/serverless.yml`, `**/lambda/**`
- Exclude: `**/vendor/**`, `**/*_test.go`, `**/mocks/**`

## Native tooling (when run command is appropriate)

- `go vet ./...` — catches lock-by-value, unkeyed composites (often correctness-impacting STRIDE issues)
- `go test -race ./...` — detect data races (info disclosure / tampering risk)
- `staticcheck ./...` — finds shadowed errors (repudiation), goroutine-leak adjacent issues
- `gosec ./...` — TLS / crypto / file-perm STRIDE inputs
- `errcheck ./...` — silently dropped errors break repudiation
- `bodyclose` linter — FD/conn leaks (DoS)
- `golang.org/x/tools/go/analysis/passes/loopclosure` — `go func()` capturing loop variable (race / EoP via wrong target)

## Common Go deployment shapes (recognize the architecture before modeling)

- **Standalone HTTP server** — single binary on EC2 / ECS / Cloud Run; `net/http`, Gin, Echo, Chi, Fiber.
- **gRPC service** — `google.golang.org/grpc` server; usually behind a service mesh (Istio/Linkerd) or directly mTLS.
- **AWS Lambda** — `github.com/aws/aws-lambda-go/lambda` `lambda.Start(handler)`; runs in MicroVM, no persistent state.
- **Kubernetes operator / controller** — `controller-runtime`, `kubebuilder` scaffolding; reconciles CRDs with elevated cluster privileges.
- **CLI utility** — `cobra`, `urfave/cli`; runs with the user's privileges.
- **Sidecar / proxy** — typically lightweight HTTP/TCP forwarder; TLS-terminating.
- **Message-queue worker** — Kafka (`segmentio/kafka-go`, `confluent-kafka-go`), NATS, RabbitMQ; consumers pull untrusted payloads.
- **Vendor SDK shape** — embedded library; STRIDE scope shifts to consuming app's threat model.

## Trust boundary mapping (Go-specific)

- **HTTP middleware chain** — `http.Handler` wrapping (`func(http.Handler) http.Handler`); auth runs before/after handler depending on order. Order matters!
- **gRPC interceptors** — `grpc.UnaryInterceptor` / `StreamInterceptor`; usually the only place to enforce auth. Per-method `RegisterService` does NOT auto-attach auth.
- **`context.Context` propagation** — auth claims live in `ctx.Value(...)`; if a handler swaps `ctx` for `context.Background()` (common bug), the trust assertion is dropped silently.
- **Goroutine spawn** — `go func() { ... }` typically starts with `context.Background()` if not explicitly passed; goroutine workers can outlive their parent request and cross trust boundaries.
- **Channel-based pipelines** — data crossing channels is in-process and trusted; but if the source goroutine reads from network, the trust boundary is at that goroutine's input.
- **Plugin loading** — `plugin.Open` (rare in Go) loads a `.so` into the process; everything inherits the process's privileges.

## Risk patterns by STRIDE category

### Spoofing (S)

#### TLS verification skipped — `InsecureSkipVerify: true`

**What to look for:** Outbound HTTP/gRPC clients to other services with TLS verification disabled, allowing MITM identity spoofing.
**Concrete grep / ripgrep query:**
```
rg -nP 'InsecureSkipVerify\s*:\s*true' --type go
rg -nP 'tls\.Config\s*\{[^}]*InsecureSkipVerify' --type go
rg -nP 'insecure\.NewCredentials|grpc\.WithInsecure' --type go
```
**File hint:** HTTP clients, gRPC dial, mTLS code.

#### Forwarded-headers trust without proxy allowlist

**What to look for:** `r.Header.Get("X-Forwarded-For")`, `X-Real-IP`, `X-Forwarded-Proto` used directly for IP-based auth/auditing without an upstream-proxy allow-list.
**Concrete grep / ripgrep query:**
```
rg -nP 'r\.Header\.Get\s*\(\s*"X-(Forwarded-(For|Proto|Host)|Real-IP|Original-)' --type go
rg -nP 'realip|RealIP|TrustedProxies|ProxyHeader' --type go
```
**File hint:** middleware/auth, audit logging.

#### Certificate-based auth without revocation check

**What to look for:** Custom `tls.Config{ClientAuth: tls.RequireAndVerifyClientCert, ...}` without `VerifyPeerCertificate`/`VerifyConnection` to check OCSP/CRL.
**Concrete grep / ripgrep query:**
```
rg -nP 'ClientAuth\s*:\s*tls\.\w+' --type go -A 5
rg -nP 'VerifyPeerCertificate|VerifyConnection' --type go
```
**File hint:** mTLS server setup.

### Tampering (T)

#### Struct field whitelisting via JSON tags missing

**What to look for:** Domain entities (e.g., `User` with `IsAdmin bool`) decoded directly from `json.NewDecoder(r.Body).Decode(&user)` — attacker sets `IsAdmin: true`. No `json:"-"` on sensitive fields, no separate DTO.
**Concrete grep / ripgrep query:**
```
rg -nP 'json\.NewDecoder\s*\(\s*r\.Body\s*\)\.Decode\s*\(\s*&\s*\w+\s*\)' --type go
rg -nP 'type\s+\w+\s+struct\s*\{' --type go -A 10 | rg -P '(IsAdmin|Role|Permission|Email|UserID|TenantID)\s+\w+\s+`json'
rg -nP 'json:"-"' --type go
```
**File hint:** request handlers binding to entities.

#### Mutable shared state across goroutines

**What to look for:** Package-level `var x SomeStruct{}` mutated from request handlers without synchronization (writes propagate to all in-flight requests).
**Concrete grep / ripgrep query:**
```
rg -nP '^var\s+\w+\s+\w+' --type go
rg -nP 'sync\.(Mutex|RWMutex|atomic\.|Map)' --type go
```
**File hint:** package init code.

#### Header injection — CRLF in `w.Header().Set(name, userInput)`

**What to look for:** User input written to response header without sanitization → response splitting.
**Concrete grep / ripgrep query:**
```
rg -nP 'w\.Header\(\)\.(Set|Add)\s*\(\s*"[^"]*"\s*,\s*\w+\s*\)' --type go
rg -nP 'http\.Header\.Set\s*\(' --type go
```
**File hint:** handlers setting custom headers.
**False-positive guard:** Go 1.21+ `Header.Set` rejects CR/LF — but `WriteHeader` paths can still leak.

### Repudiation (R)

#### Logging without request ID / trace context

**What to look for:** `log.Printf`, `slog`, `zap`, `zerolog` calls that don't include a request ID, trace ID, or user ID — actions can't be tied to requests.
**Concrete grep / ripgrep query:**
```
rg -nP '(slog|zap|zerolog|log)\.(Info|Warn|Error|Debug|Print)\w*\s*\(' --type go -L | head -20
rg -nP 'request_id|requestID|trace_id|traceID|x-request-id' --type go
rg -nP 'go\.opentelemetry\.io/otel|opentelemetry-go' --type go
```
**File hint:** middleware, all handlers.

#### Errors silently swallowed (`errcheck` candidates)

**What to look for:** `_ = doSomething()`, missing `if err != nil` after security-relevant calls (auth check, audit emit, signed-token verify).
**Concrete grep / ripgrep query:**
```
rg -nP '_\s*=\s*\w+\.(Audit|Log|Verify|Authenticate|Authorize|Validate|Save|Commit)\s*\(' --type go
rg -nP '^\s*\w+\.\w+\s*\(' --type go | head -20
```
**File hint:** anywhere.

#### `defer` audit-log emit not actually executed

**What to look for:** `defer auditLog.Emit(...)` placed before the action it audits; `os.Exit`/`log.Fatal` in handlers (skips defers).
**Concrete grep / ripgrep query:**
```
rg -nP 'os\.Exit|log\.Fatal' --type go
rg -nP 'defer\s+\w+\.Emit|defer\s+audit' --type go
```
**File hint:** request handlers.

### Information disclosure (I)

#### Panic stack traces returned in HTTP response

**What to look for:** Custom recover middleware that writes `recover()` value to `w` (`fmt.Fprintf(w, "%v", err)`); `runtime/debug.PrintStack()` output included; Gin's `gin.Recovery()` is OK in prod (logs only) but custom variants often leak.
**Concrete grep / ripgrep query:**
```
rg -nP 'recover\s*\(\s*\)' --type go -A 8 | rg -P 'fmt\.Fprintf?\s*\(\s*w|w\.Write\(|http\.Error\(.*\.Error'
rg -nP 'runtime/debug\.(Stack|PrintStack)' --type go
rg -nP 'debug\.Stack\(\)' --type go
```
**File hint:** middleware/recovery.go, error handlers.
**False-positive guard:** Logging the trace is fine; sending to client is not.

#### Error message leakage — DB errors, internal paths echoed to client

**What to look for:** `http.Error(w, err.Error(), 500)`, `c.JSON(500, gin.H{"error": err.Error()})` with raw DB / OS / library errors.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.Error\s*\(\s*\w+\s*,\s*\w+\.Error\s*\(\s*\)' --type go
rg -nP '(c|ctx)\.JSON\s*\([^)]*err\.Error\s*\(' --type go
rg -nP 'fmt\.Sprintf\s*\(\s*"[^"]*%s"\s*,\s*err\.Error' --type go
```
**File hint:** handlers, middleware.

#### Data race causing field corruption / disclosure

**What to look for:** Unprotected concurrent access to shared structs returning partially-initialized values; absent `-race` testing in CI.
**Concrete grep / ripgrep query:**
```
rg -nP 'go test.*-race' .github/workflows/ Makefile justfile
rg -nP 'sync\.Once|sync\.Mutex' --type go
```
**File hint:** caches, registries, singletons.

#### Sensitive fields not redacted in `String()`/`MarshalJSON`

**What to look for:** Structs with `Password`, `Token`, `Secret` fields lacking custom `String()` or `MarshalJSON()` redacting them (gets dumped via `%+v`).
**Concrete grep / ripgrep query:**
```
rg -nP 'type\s+\w+\s+struct\s*\{' --type go -A 12 | rg -P '(Password|Token|Secret|APIKey|PrivateKey)\s+\w+'
rg -nP 'func\s+\(\w+\s+\*?\w+\)\s+String\s*\(\s*\)\s+string' --type go
rg -nP 'func\s+\(\w+\s+\*?\w+\)\s+MarshalJSON\s*\(' --type go
```
**File hint:** model/dto packages.

### Denial of service (D)

#### Missing `http.Server.ReadHeaderTimeout` (Slowloris)

**What to look for:** `http.Server{}` literals lacking `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`. `http.ListenAndServe` (no struct at all) uses `DefaultServer` with NO timeouts.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.Server\s*\{' --type go -A 8
rg -nP 'http\.ListenAndServe\s*\(' --type go
rg -nP 'ReadHeaderTimeout|ReadTimeout|WriteTimeout|IdleTimeout' --type go
```
**File hint:** server bootstrap.

#### No request body size limit

**What to look for:** `io.ReadAll(r.Body)` without `http.MaxBytesReader`; `c.GetRawData()` (Gin) without a `MaxMultipartMemory` set.
**Concrete grep / ripgrep query:**
```
rg -nP 'io\.ReadAll\s*\(\s*r\.Body\s*\)' --type go
rg -nP 'http\.MaxBytesReader' --type go
rg -nP 'MaxMultipartMemory' --type go
```
**File hint:** request handlers, file uploads.

#### Goroutine leak — no `context.Cancel`, `time.Tick` instead of `Ticker`

**What to look for:** `time.Tick(...)` (channel never reclaimed) instead of `time.NewTicker(...).Stop()`; goroutines blocking on channels with no `case <-ctx.Done()` exit.
**Concrete grep / ripgrep query:**
```
rg -nP 'time\.Tick\s*\(' --type go
rg -nP 'go\s+func\s*\(' --type go -A 12 | rg -P 'for\s*\{|select\s*\{' -B 2
rg -nP 'ctx\.Done\(\)' --type go
```
**File hint:** background workers, schedulers.

#### Unbounded worker pool / goroutine fan-out

**What to look for:** `for _, item := range items { go process(item) }` with no semaphore / worker limit — request can spawn millions of goroutines.
**Concrete grep / ripgrep query:**
```
rg -nP 'for\s+_\s*,\s*\w+\s*:?=\s*range\s+\w+\s*\{[^}]*go\s+\w+\s*\(' --type go
rg -nP 'errgroup|semaphore|x/sync' --type go
```
**File hint:** batch processors.

#### Missing rate limiter on public endpoints

**What to look for:** Public mutating endpoints with no `golang.org/x/time/rate.Limiter`, no `gin-contrib/limit`, no `juju/ratelimit`, no `tollbooth`.
**Concrete grep / ripgrep query:**
```
rg -nP 'rate\.NewLimiter|golang\.org/x/time/rate' --type go
rg -nP 'didip/tollbooth|ulule/limiter|juju/ratelimit|throttled/throttled' --type go
```
**File hint:** middleware/, server bootstrap.

#### Regex compilation in hot path

**What to look for:** `regexp.MustCompile(...)` inside handler bodies (recompiled per request) or `regexp.MatchString(pattern, userInput)` with attacker-supplied pattern (ReDoS via catastrophic backtracking — though Go's RE2 is mostly safe).
**Concrete grep / ripgrep query:**
```
rg -nP 'regexp\.(MustCompile|Compile)' --type go -B 3 | rg -P 'func\s+\w*[Hh]andler|func\s+\(.*\)\s+ServeHTTP'
rg -nP 'regexp\.MatchString\s*\(\s*\w+' --type go
```
**File hint:** handlers, validation code.

### Elevation of privilege (E)

#### Interface-based DI mistake — wrong implementation injected

**What to look for:** Interfaces like `AuthChecker` satisfied by a `NoopAuthChecker` accidentally wired in production (e.g., env-gated DI returning `Noop` if env unset).
**Concrete grep / ripgrep query:**
```
rg -nP 'type\s+\w+(Checker|Verifier|Validator|Authorizer)\s+interface' --type go
rg -nP 'Noop\w+|NullAuth|FakeAuth|MockAuth|StubAuth' --type go
rg -nP 'wire\.NewSet|fx\.Provide|dig\.Provide' --type go
```
**File hint:** `internal/wire/`, `cmd/main.go`, DI config.

#### `sudo` / privilege drop missing in setuid binaries

**What to look for:** Daemons started as root (`USER root` in Dockerfile) that don't `syscall.Setuid` after binding low ports; container `securityContext` missing `runAsNonRoot: true`.
**Concrete grep / ripgrep query:**
```
rg -nP 'syscall\.(Setuid|Setgid)' --type go
rg -nP '^USER\s+(root|0)' Dockerfile* Containerfile*
rg -nP 'runAsNonRoot|runAsUser' --type yaml -g '**/k8s/**' -g '**/manifests/**' -g '**/helm/**'
```
**File hint:** Dockerfiles, k8s manifests.

#### Authorization checked at handler but not at service / repo layer

**What to look for:** Repository/service methods accepting `userID` as a parameter without verifying it matches the authenticated context — IDOR via internal callers.
**Concrete grep / ripgrep query:**
```
rg -nP 'func\s+\(\w+\s+\*?\w+\)\s+\w+\s*\([^)]*\bid\s+(int|int64|string|uuid\.UUID)' --type go
rg -nP 'GetByID|FindByID|DeleteByID' --type go -B 1 -A 5
rg -nP 'ctx\.Value\s*\(' --type go
```
**File hint:** repository/service layers.

#### Unsafe `unsafe.Pointer` usage exposing memory

**What to look for:** Any `unsafe.Pointer` cast in security-relevant code; `reflect.SliceHeader`/`StringHeader` reinterpretation.
**Concrete grep / ripgrep query:**
```
rg -nP 'unsafe\.Pointer|unsafe\.Slice|unsafe\.String' --type go
rg -nP 'reflect\.(SliceHeader|StringHeader)' --type go
```
**File hint:** anywhere — flag for review.

### Concurrency-specific STRIDE

#### Data race → Information disclosure or Tampering

**What to look for:** Build/test pipeline does not include `-race`; concurrent map/struct writes; `go test -race ./...` not run in CI.
**Concrete grep / ripgrep query:**
```
rg -nP '-race' .github/workflows/ Makefile justfile .gitlab-ci.yml 2>/dev/null
rg -nP 'sync\.(Mutex|RWMutex|atomic|Map)' --type go
```
**File hint:** CI configs, shared-state packages.

#### Goroutine leak → Denial of service

**What to look for:** Goroutines spawned per request with no cancellation path; `runtime.NumGoroutine()` grows monotonically under load (not visible from source — flag patterns instead).
**Concrete grep / ripgrep query:**
```
rg -nP 'go\s+func\s*\(' --type go -A 5 | rg -P 'context\.Background|context\.TODO'
rg -nP 'runtime\.NumGoroutine' --type go
```
**File hint:** request handlers spawning workers.

#### Context cancellation not propagated → Tampering / DoS

**What to look for:** Function signatures lacking `ctx context.Context` as first arg; functions accepting `ctx` but ignoring it (no `ctx.Err()` checks in loops, no pass-through to DB/HTTP calls).
**Concrete grep / ripgrep query:**
```
rg -nP 'func\s+\w+\s*\(\s*\)\s+(error|\w+)' --type go | head -20
rg -nP 'func\s+\w+\s*\(\s*ctx\s+context\.Context' --type go
rg -nP 'context\.TODO\(\)|context\.Background\(\)' --type go
```
**File hint:** service layers, anything making blocking calls.

## Per-component checklist (Go services)

Run this through every public service in the repo:

- **Edge / ingress** — TLS terminated where? `http.Server` timeouts set? body size capped? rate limited?
- **Authn middleware** — registered before all routes? `WithValidMethods` for JWT? expiration enforced?
- **Authz checks** — at handler AND at repo layer? `ctx` carries the principal end-to-end?
- **Logging** — request ID + user ID in every log line? sensitive fields redacted via `String()`/`MarshalJSON`?
- **Outbound calls** — `http.Client` with `Timeout`? `CheckRedirect` for SSRF? gRPC `WithTransportCredentials(credentials.NewTLS(...))`?
- **Background workers** — `ctx.Done()` honored? worker pool bounded?
- **Persistence** — parameterized queries? `tx.Rollback()` deferred? connection pool sized?
- **Secrets** — loaded from env / KMS / Vault, never literal?
- **Process** — runs as non-root? minimal capabilities? `pprof` not exposed?
- **Build** — `-trimpath`? deps from `GOPRIVATE`-protected proxy? `govulncheck` in CI?
