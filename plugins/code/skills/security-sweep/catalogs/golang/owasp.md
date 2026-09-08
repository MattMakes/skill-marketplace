# owasp-auditor — Go catalog

> Inlined into the owasp-auditor system prompt when the audited repo's primary language is `golang`. Every entry below is a concrete pattern to look for in Go code or its config — not generic advice.

## File globs to scan

- `**/*.go`
- `**/main.go`, `**/cmd/**/*.go`
- `**/internal/**/*.go`, `**/pkg/**/*.go`, `**/api/**/*.go`
- `**/handlers/**/*.go`, `**/routes/**/*.go`, `**/controllers/**/*.go`
- `**/middleware/**/*.go`, `**/middlewares/**/*.go`
- `**/repository/**/*.go`, `**/repo/**/*.go`, `**/store/**/*.go`, `**/dao/**/*.go`
- `**/auth/**/*.go`, `**/security/**/*.go`
- `**/*.tmpl`, `**/*.gotmpl`, `**/*.gohtml`, `**/templates/**/*`
- `**/go.mod`, `**/Dockerfile`, `**/docker-compose*.yml`
- Exclude: `**/vendor/**`, `**/*_test.go` (note separately if test data leaks secrets), `**/*.pb.go`, `**/*_gen.go`, `**/mock_*.go`, `**/zz_generated_*.go`

## Native tooling (when run command is appropriate)

- `gosec ./...` — primary Go SAST (G1xx hardcoded creds, G2xx injection, G3xx file/path, G4xx crypto, G5xx HTTP/TLS, G7xx taint analysis)
- `staticcheck ./...` — correctness + some security-adjacent issues (e.g., SA1019 deprecated APIs)
- `go vet ./...` — built-in, catches `Printf`-family format issues, unkeyed composite literals, lock copying
- `golangci-lint run` — meta-runner; check `.golangci.yml` for which security linters are enabled (look for `gosec`, `bodyclose`, `errcheck`, `gocritic`, `noctx`)
- `errcheck ./...` — finds unhandled errors (often security-relevant)
- `bodyclose ./...` — finds unclosed `http.Response.Body` (info disclosure / FD exhaustion)

## Risk patterns

### SQL injection — `database/sql` with `fmt.Sprintf`/concatenation

**What to look for:** `db.Query`, `db.QueryContext`, `db.QueryRow`, `db.Exec`, `db.ExecContext` (or `*sql.Tx` / `*sql.Stmt` equivalents) where the SQL string was built with `fmt.Sprintf`, `fmt.Sprint`, `+` concatenation, `strings.Builder`, or backtick-string interpolation embedding non-constant identifiers.
**Why it's risky in Go:** `database/sql` only parameterizes when you pass a separate `args ...any` slice with `?`/`$N` placeholders. The driver does NOT parse Go's `%s`/`%d` verbs, so `fmt.Sprintf("... WHERE id = %s", id)` ships the raw value to the database.
**Concrete grep / ripgrep query:**
```
rg -nP 'fmt\.Sprintf?\s*\(\s*"[^"]*\b(SELECT|INSERT|UPDATE|DELETE|MERGE|UPSERT|WITH)\b[^"]*%[svdq]' --type go
rg -nP '(db|tx|stmt|conn)\.(Query|QueryContext|QueryRow|QueryRowContext|Exec|ExecContext)\s*\(\s*(fmt\.Sprintf?|".*"\s*\+|\w+\s*\+\s*")' --type go
rg -nP 'strings\.Builder.*\b(SELECT|INSERT|UPDATE|DELETE)\b' --type go -B 2 -A 5
```
**File hint:** `repository/`, `repo/`, `store/`, `dao/`, `db/`, `internal/persistence/`, anything that takes `*http.Request` or `gin.Context`/`echo.Context` and reaches a DB.
**False-positive guard:** Safe if the constant SQL string is followed by separate args, e.g. `db.Query("SELECT * FROM u WHERE id = $1", id)` or `db.Query("... ?", id)` (MySQL/SQLite). Constant-only strings (no user input) are safe even with `Sprintf` (e.g., `fmt.Sprintf("SELECT * FROM %s", tableConst)` where `tableConst` is a `const`).

### SQL injection — GORM `Raw`/`Exec` and unsafe string args

**What to look for:** `db.Raw(...)` / `db.Exec(...)` with concatenated/interpolated SQL; `db.Where("name = " + name)`; `db.Order(userOrder)`; `db.Select(userColumns)`; `gorm.Expr(userInput)`.
**Why it's risky in Go:** GORM treats the first arg of `Where`/`Order`/`Select`/`Raw` as raw SQL when no `?` placeholders are present; `Order(userInput)` is unparameterized by design.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(Raw|Exec)\s*\(\s*(fmt\.Sprintf?|".*"\s*\+|\w+\s*\+\s*")' --type go
rg -nP '\.Where\s*\(\s*(fmt\.Sprintf?|".*"\s*\+|\w+\s*\+\s*")' --type go
rg -nP '\.(Order|Select|Group|Having|Distinct)\s*\(\s*\w+\s*\)' --type go
rg -nP 'gorm\.Expr\s*\(\s*\w+\s*\)' --type go
```
**File hint:** files importing `gorm.io/gorm` or `github.com/jinzhu/gorm`.
**False-positive guard:** Safe with placeholders: `db.Where("name = ?", name)`, `db.Raw("SELECT ... WHERE id = ?", id)`. Whitelist-validated `Order` strings (against a `map[string]bool`) are acceptable.

### SQL injection — `sqlx` / `pgx` / `squirrel` raw paths

**What to look for:** `sqlx.Select(&dest, query)` / `sqlx.Get` / `sqlx.NamedExec` with built strings; `pgx.Conn.Exec(ctx, sql)` lacking `$1..$N`; `pgxpool.Pool.Query` with `Sprintf`; `squirrel` `.PlaceholderFormat(squirrel.Dollar)` bypassed via raw clauses.
**Concrete grep / ripgrep query:**
```
rg -nP '(sqlx)\.(Select|Get|MustExec|NamedExec|Queryx|QueryRowx)\s*\(\s*[^,]*,\s*(fmt\.Sprintf?|".*"\s*\+)' --type go
rg -nP '(pgx|pgxpool|conn)\.(Query|QueryRow|Exec)\s*\(\s*\w+\s*,\s*(fmt\.Sprintf?|".*"\s*\+)' --type go
rg -nP 'pgx\.(Query|Exec).*"[^"]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"]*%[svdq]' --type go
rg -nP 'squirrel\.\w+\s*\(\s*fmt\.Sprintf?' --type go
```
**File hint:** files importing `github.com/jmoiron/sqlx`, `github.com/jackc/pgx/v5`, `github.com/Masterminds/squirrel`.
**False-positive guard:** Placeholders (`$1`, `?`, `:name`) with separate args are safe.

### Command injection — `os/exec` with shell or concatenated args

**What to look for:** `exec.Command("sh", "-c", userInput)`, `exec.Command("bash", "-c", ...)`, `exec.CommandContext` with `/bin/sh`, `cmd /C`; or `exec.Command(name, args...)` where `args` is built from request data via `strings.Fields`/`strings.Split`/`fmt.Sprintf`. Also `syscall.Exec`, `syscall.ForkExec`, `os.StartProcess`.
**Why it's risky in Go:** Unlike `exec.Command(name, "arg1", "arg2")` which directly `execve`s without a shell, `sh -c` re-introduces the shell metacharacter risk — semicolons, backticks, `$()` are interpreted.
**Concrete grep / ripgrep query:**
```
rg -nP 'exec\.(Command|CommandContext)\s*\(\s*"(/bin/)?(sh|bash|zsh|cmd|pwsh|powershell)"\s*,\s*"-c"' --type go
rg -nP 'exec\.(Command|CommandContext)\s*\([^)]*fmt\.Sprintf?\(' --type go
rg -nP 'exec\.(Command|CommandContext)\s*\([^)]*\+\s*\w+' --type go
rg -nP 'syscall\.(Exec|ForkExec|StartProcess)' --type go
rg -nP 'os\.StartProcess\s*\(' --type go
```
**File hint:** image processors, file converters, build/deploy webhooks, anything wrapping `ffmpeg`, `convert`, `git`, `kubectl`, `docker`, `helm`.
**False-positive guard:** `exec.Command("git", "clone", repoURL)` is shell-free and safe IF `repoURL` is validated (no leading `-` arg-injection). Constant args are safe.

### Argument injection — leading-dash payloads passed to `exec.Command`

**What to look for:** Calls like `exec.Command("git", userArg, ...)` or `exec.Command("curl", userArg)` where `userArg` could begin with `-` / `--` and trigger an unintended flag (`--upload-pack=...`, `-o /etc/passwd`, etc.).
**Concrete grep / ripgrep query:**
```
rg -nP 'exec\.(Command|CommandContext)\s*\(\s*"(git|curl|wget|tar|ssh|rsync|find|grep)"' --type go -A 4
```
**File hint:** any subprocess wrapper, especially git/curl integrations.
**False-positive guard:** Code that prepends `--` separator (e.g., `exec.Command("git", "log", "--", userArg)`) is safe.

### SSRF — `http.Get`/`http.Client` with user-controlled URL

**What to look for:** `http.Get(userURL)`, `http.Post(userURL, ...)`, `client.Get(userURL)`, `http.NewRequest(method, userURL, body)`, `http.NewRequestWithContext`, `client.Do(req)` where the URL came from a request body, query string, header, or DB row. Also `net.Dial("tcp", userHost)`, `net.DialContext`, `tls.Dial`.
**Why it's risky in Go:** Default `http.Client` follows redirects (up to 10) including to private IPs, will resolve any DNS name, and will hit AWS IMDS at 169.254.169.254 / GCP metadata at 169.254.169.254 / metadata.google.internal. There is no built-in SSRF guard.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.(Get|Post|PostForm|Head)\s*\(\s*\w+\s*[\),]' --type go
rg -nP '(http\.DefaultClient|client|c)\.(Get|Post|Do|Head)\s*\(' --type go
rg -nP 'http\.NewRequest(WithContext)?\s*\(\s*[^,]+,\s*\w+\s*,' --type go
rg -nP '(net|tls)\.Dial(Context)?\s*\(\s*"[^"]*"\s*,\s*\w+' --type go
rg -nP 'url\.Parse\s*\(\s*\w+\s*\)' --type go
```
**File hint:** webhook handlers, image proxies, "fetch URL preview" endpoints, OAuth callbacks pulling JWKS.
**False-positive guard:** Safe if URL is validated against a host allow-list AND `http.Client` has a `CheckRedirect` that re-validates each hop AND a custom `Transport.DialContext` blocks RFC1918 / link-local / loopback addresses. Allow-listed `url.Parse` followed by `parsed.Scheme` whitelist (`https` only) and `parsed.Host` allow-list is safe.

### SSRF — chasing redirects without restriction

**What to look for:** `http.Client{}` or `&http.Client{}` constructed without `CheckRedirect` set.
**Concrete grep / ripgrep query:**
```
rg -nP '&?http\.Client\s*\{[^}]*\}' --type go -A 2
rg -nP 'CheckRedirect' --type go
```
**File hint:** integration packages, SSO clients.
**False-positive guard:** A `CheckRedirect` returning `http.ErrUseLastResponse` (no follow) or re-validating the next hop is safe.

### Path traversal — `os.Open`, `filepath.Join`, `http.ServeFile` with user input

**What to look for:** `os.Open(userPath)`, `os.ReadFile(userPath)`, `os.Create(userPath)`, `ioutil.ReadFile(userPath)` (legacy), `filepath.Join(baseDir, userInput)` not followed by a `filepath.Clean` + `strings.HasPrefix(absPath, allowedRoot)` guard, and `http.ServeFile(w, r, userPath)`.
**Why it's risky in Go:** `filepath.Join("/safe", "../etc/passwd")` returns `/etc/passwd`; `http.ServeFile` explicitly *does* reject `..` in the URL path but NOT in the third arg.
**Concrete grep / ripgrep query:**
```
rg -nP 'os\.(Open|OpenFile|ReadFile|Create|Stat|Lstat|Remove|RemoveAll)\s*\(\s*\w+\s*[\),]' --type go
rg -nP 'ioutil\.(ReadFile|WriteFile)\s*\(' --type go
rg -nP 'filepath\.Join\s*\([^)]*\b(req|r|c|ctx|input|user|name|file(name)?|path|param)\b' --type go
rg -nP 'http\.ServeFile\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)' --type go
rg -nP 'os\.DirFS\s*\(' --type go
```
**File hint:** file upload/download handlers, static-asset routers, document services, archive extractors.
**False-positive guard:** Safe pattern: `cleaned := filepath.Clean("/" + userPath); abs := filepath.Join(root, cleaned); if !strings.HasPrefix(abs, root + string(filepath.Separator)) { return error }`. Better: `os.Root` (Go 1.24+) or `securejoin.SecureJoin(root, userPath)`.

### Path traversal — archive extraction (`archive/zip`, `archive/tar`, `compress/*`)

**What to look for:** Loop over `zip.Reader.File` / `tar.Reader.Next` writing to `filepath.Join(dest, header.Name)` without checking that the resolved path stays inside `dest` ("Zip Slip" / CVE-2018-1002200).
**Concrete grep / ripgrep query:**
```
rg -nP 'archive/(zip|tar)' --type go -l
rg -nP '(zip|tar)\.Reader|tar\.NewReader|zip\.NewReader|zip\.OpenReader' --type go -A 20
rg -nP 'filepath\.Join\s*\([^)]*\.Name\s*\)' --type go
```
**File hint:** importer/exporter code, plugin loaders, deploy bundles.
**False-positive guard:** Safe if the loop validates `if !strings.HasPrefix(abs, dest+string(filepath.Separator)) { skip }` before opening the destination file.

### XML external entities (XXE) — `encoding/xml` is mostly safe, custom decoders aren't

**What to look for:** Custom XML decoders that set `decoder.Strict = false`; libraries wrapping libxml2 via cgo (`github.com/lestrrat-go/libxml2`); SOAP clients (`hooklift/gowsdl`, `tiaguinho/gosoap`) that don't disable DTDs; any code processing SAML responses (`crewjam/saml`, `russellhaering/gosaml2`) without checking that DTDs are rejected.
**Why it's risky in Go:** stdlib `encoding/xml` does NOT resolve external entities by default — but third-party libs can. Also watch for SAML XSW (signature wrapping).
**Concrete grep / ripgrep query:**
```
rg -nP 'xml\.NewDecoder|xml\.Unmarshal' --type go
rg -nP 'libxml2|gowsdl|gosoap|crewjam/saml|russellhaering/gosaml2' --type go
rg -nP 'decoder\.Strict\s*=\s*false' --type go
rg -nP 'decoder\.Entity\s*=' --type go
```
**File hint:** SAML/SSO handlers, SOAP gateways, RSS/Atom processors.
**False-positive guard:** Stock `encoding/xml` parsing without `Entity` map manipulation is generally safe.

### Insecure deserialization — `gob`/`json`/`yaml` over the wire

**What to look for:**
- `gob.NewDecoder(conn).Decode(&v)` where `conn` is network/untrusted (gob types can recursively allocate).
- `json.NewDecoder(r).Decode(&m)` where `m` is `map[string]interface{}` or `interface{}` — no schema validation.
- `yaml.Unmarshal` from `gopkg.in/yaml.v2` — historic CVEs (CVE-2019-11254 billion laughs, prefer `gopkg.in/yaml.v3` / `sigs.k8s.io/yaml`).
- `gopkg.in/yaml.v3` is safer but unbounded `!!str` aliases can still DoS.
- `bson.Unmarshal` of attacker-controlled binary into `interface{}`.
**Concrete grep / ripgrep query:**
```
rg -nP 'gob\.NewDecoder|gob\.Decode' --type go
rg -nP 'json\.(NewDecoder|Unmarshal)\s*\([^)]*\)\s*\.\s*Decode\s*\(\s*&\s*\w+\s*\)' --type go
rg -nP 'gopkg\.in/yaml\.v2' --type go
rg -nP 'yaml\.Unmarshal\s*\(' --type go
rg -nP 'interface\{\}|any' --type go -B 1 -A 1 | rg -P 'Decode|Unmarshal'
```
**File hint:** RPC layers, config loaders, plugin systems, message-queue consumers.
**False-positive guard:** Decoding into a concrete `struct` with bounded fields and using `decoder.DisallowUnknownFields()` is safe. `yaml.v3` is preferred over `yaml.v2`.

### Crypto — weak hashes for passwords (`md5`, `sha1`)

**What to look for:** `crypto/md5`, `crypto/sha1`, `hash/fnv` used to hash passwords, API keys, or session tokens. Look for `md5.Sum(password)`, `sha1.New().Write(pw)`, `hmac.New(sha1.New, ...)` for password verification.
**Why it's risky in Go:** Fast hashes are unsuitable for passwords. Use `golang.org/x/crypto/bcrypt`, `golang.org/x/crypto/argon2`, or `golang.org/x/crypto/scrypt`.
**Concrete grep / ripgrep query:**
```
rg -nP 'crypto/(md5|sha1)' --type go
rg -nP '\b(md5|sha1)\.(Sum|New)\b' --type go
rg -nP 'hmac\.New\(\s*(md5|sha1)\.New' --type go
```
**File hint:** `auth/`, `users/`, registration/login handlers.
**False-positive guard:** OK for non-security uses (file ETags, content addressing, cache keys) — flag for review.

### Crypto — `math/rand` for tokens / IDs / secrets

**What to look for:** `math/rand` (or `math/rand/v2`) used to generate session IDs, password reset tokens, OAuth state, nonces, CSRF tokens. Look for `rand.Intn`, `rand.Int63`, `rand.Read`, `rand.New(rand.NewSource(...))`.
**Why it's risky in Go:** `math/rand` is a deterministic PRNG seeded from a low-entropy source by default; predictable. Use `crypto/rand` (`rand.Read`, `rand.Int`).
**Concrete grep / ripgrep query:**
```
rg -nP '"math/rand(/v2)?"' --type go
rg -nP '\bmath/rand\.(Intn|Int|Int31|Int63|Float|Read|Shuffle|Perm)' --type go
rg -nP 'rand\.New\s*\(\s*rand\.NewSource' --type go
rg -nP 'rand\.Seed\s*\(' --type go
```
**File hint:** Token issuers, OTP generators, anything in `auth/`, `session/`, `csrf/`.
**False-positive guard:** OK in tests, simulations, rate-limit jitter, exponential backoff. Cross-check imports — confusion between `crypto/rand` and `math/rand` is the actual bug; both are aliased `rand`.

### Crypto — AES-ECB, static IV, broken modes

**What to look for:** `cipher.NewCBCEncrypter(block, iv)` with `iv := make([]byte, 16)` (zero IV) or a constant IV; using `cipher.Block.Encrypt` directly in a loop (effectively ECB); CBC without HMAC (no authentication → padding-oracle); using DES (`crypto/des`) at all.
**Concrete grep / ripgrep query:**
```
rg -nP 'cipher\.NewCBCEncrypter|cipher\.NewCBCDecrypter' --type go -A 5
rg -nP 'crypto/des' --type go
rg -nP 'cipher\.Block\b' --type go
rg -nP 'iv\s*:?=\s*make\(\[\]byte\s*,\s*\d+\s*\)' --type go
rg -nP 'iv\s*:?=\s*\[\]byte\{' --type go
```
**File hint:** custom encryption helpers, license/token signers.
**False-positive guard:** Prefer `cipher.NewGCM` (AEAD) with a random nonce per message via `crypto/rand.Read(nonce)`. CBC + HMAC-SHA256 with random IV is acceptable but flag for review.

### Crypto — hardcoded keys, IVs, secrets

**What to look for:** `[]byte("...")` of length 16/24/32 adjacent to AES; `var key = []byte{...}`; `const SigningKey = "..."`; `hmac.New(sha256.New, []byte("hardcoded"))`.
**Concrete grep / ripgrep query:**
```
rg -nP '(var|const)\s+\w*[Kk]ey\w*\s*(=|=\s*\[\]byte)\s*("|\[\]byte\{)' --type go
rg -nP 'hmac\.New\s*\([^,]+,\s*\[\]byte\(\s*"' --type go
rg -nP '\[\]byte\("\w{16,}"\)' --type go
```
**File hint:** crypto helpers, signers.
**False-positive guard:** Loaded from `os.Getenv` / Vault / KMS / Secret Manager is safer; ensure not also hardcoded as fallback.

### JWT — `golang-jwt/jwt` with `nil` keyfunc, `none` algorithm, no `WithValidMethods`

**What to look for:** `jwt.Parse(tokenString, nil)`; `jwt.Parse` without `jwt.WithValidMethods([]string{...})`; keyFunc returning a key without first checking `token.Method.Alg()` matches expectation; missing `jwt.WithExpirationRequired()` (exp claim is optional by default in v5); use of `jwt.SigningMethodNone` or `"none"` algorithm; v4 of the library (CVE-2024-51744).
**Why it's risky in Go:** Algorithm-confusion attacks (HS256 verifying with RSA public key); `none` algorithm acceptance; missing exp lets stolen tokens live forever.
**Concrete grep / ripgrep query:**
```
rg -nP 'jwt\.Parse(WithClaims)?\s*\(' --type go -A 5
rg -nP 'jwt\.WithValidMethods' --type go
rg -nP 'jwt\.WithExpirationRequired' --type go
rg -nP 'jwt\.SigningMethodNone|"none"' --type go
rg -nP 'token\.Method\.Alg\(\)' --type go
rg -nP 'github\.com/golang-jwt/jwt(/v4)?(\s|"|$)' --type go
rg -n 'github.com/dgrijalva/jwt-go' --type go
```
**File hint:** middleware/auth.go, jwt.go, anything in `auth/`.
**False-positive guard:** Safe pattern: `jwt.Parse(tok, keyFunc, jwt.WithValidMethods([]string{"RS256"}), jwt.WithExpirationRequired())` AND keyFunc verifies `token.Method.Alg()`. Library `dgrijalva/jwt-go` is unmaintained — flag.

### Auth — middleware order (router groups, `Use` after route registration)

**What to look for:** In Gin, `router.GET("/admin", h)` registered BEFORE `router.Use(authMiddleware)` (Gin only applies middleware added before the route). In Chi, `r.Get("/admin", h)` outside an `r.Group(func(r){ r.Use(auth); ... })`. In Echo, route added before `e.Use(auth)`. In standard `net/http`, missing wrapper around the registered handler.
**Why it's risky in Go:** Silent auth bypass — handler runs, no error, no log.
**Concrete grep / ripgrep query:**
```
rg -nP '(router|r|engine|app)\.(GET|POST|PUT|DELETE|PATCH|HEAD|Handle|HandleFunc)\s*\(' --type go -B 5 | rg -P 'Use\(|RouteGroup|Group\('
rg -nP '\.Use\s*\(\s*\w*[Aa]uth' --type go
rg -nP 'chi\.NewRouter|gin\.New|gin\.Default|echo\.New|fiber\.New' --type go -A 30
rg -nP 'mux\.HandleFunc|http\.HandleFunc' --type go
```
**File hint:** `cmd/main.go`, `routes.go`, `server.go`, anywhere routes are wired.
**False-positive guard:** Per-route middleware (`r.With(auth).Get(...)` in Chi, `router.Group("/").Use(auth)` in Gin) is safe.

### Auth — public mux endpoints without explicit auth check

**What to look for:** `http.Handle("/api/admin", handler)` / `mux.HandleFunc("/admin", h)` not wrapped by an auth middleware.
**Concrete grep / ripgrep query:**
```
rg -nP '(http|mux)\.(Handle|HandleFunc)\s*\(\s*"[^"]*(admin|internal|debug|metrics|health|api)"' --type go
```
**File hint:** server bootstrap.
**False-positive guard:** `/health`, `/metrics` (when proxied) and `/livez`/`/readyz` may legitimately be unauthenticated.

### CSRF — missing protection on cookie-authed POST endpoints

**What to look for:** Routes accepting POST/PUT/DELETE that read session cookies but lack `gorilla/csrf`, `nosurf`, or framework-specific CSRF middleware (Echo's `middleware.CSRF()`, Gin `gin-contrib/csrf`, Fiber `csrf.New()`).
**Concrete grep / ripgrep query:**
```
rg -nP 'gorilla/csrf|justinas/nosurf|gin-contrib/csrf|gofiber/fiber/v2/middleware/csrf|labstack/echo/.*middleware\.CSRF' --type go
rg -nP 'http\.SetCookie|c\.SetCookie\s*\(' --type go
rg -nP 'sessions\.NewCookieStore|gorilla/sessions' --type go
```
**File hint:** server bootstrap, auth handlers.
**False-positive guard:** Pure JSON APIs using `Authorization: Bearer ...` (no cookies) are not CSRF-vulnerable. SameSite=Strict cookies provide a partial mitigation but flag.

### Open redirect — `http.Redirect` from user-controlled URL

**What to look for:** `http.Redirect(w, r, r.URL.Query().Get("next"), http.StatusFound)`, `c.Redirect(302, c.Query("returnTo"))` (Gin), `c.Redirect(302, target)` where `target` came from request input.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.Redirect\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*,' --type go
rg -nP '\.Redirect\s*\(\s*\d+\s*,\s*\w+\s*\)' --type go
rg -nP '\b(returnTo|next|redirect|continue|callback|returnUrl)\b' --type go
```
**File hint:** login handlers, OAuth callbacks.
**False-positive guard:** Safe if the URL is parsed and the host is checked against an allow-list, or if only the path component is used (e.g., `parsed.Path` reassembled with a known base).

### Server-side template injection — `text/template` with HTML or user input

**What to look for:**
- `text/template` (instead of `html/template`) used to render HTML responses.
- `html/template` invoked with `template.HTML(userInput)`, `template.JS(userInput)`, `template.URL(userInput)`, `template.CSS(userInput)`, or `template.HTMLAttr(userInput)` casts — these bypass auto-escaping.
- `template.New(name).Parse(userInput)` — letting users supply the template body.
**Concrete grep / ripgrep query:**
```
rg -nP '"text/template"' --type go
rg -nP 'template\.(HTML|JS|URL|CSS|HTMLAttr|JSStr)\s*\(\s*\w+\s*\)' --type go
rg -nP 'template\.(New|Must)\s*\([^)]*\)\.Parse\s*\(\s*\w+\s*\)' --type go
rg -nP 'template\.ParseFiles\s*\(\s*\w+\s*\)' --type go
```
**File hint:** view rendering, email/notification templating, anything generating dynamic HTML.
**False-positive guard:** `html/template` (not `text/template`) for HTML output, with values passed as plain `string` and not wrapped in `template.HTML`, is safe.

### CORS misconfig — `*` origin with credentials, reflective allow

**What to look for:** `rs/cors` config with `AllowedOrigins: []string{"*"}` AND `AllowCredentials: true`; Gin's `cors.Default()` (allows `*` for some methods); manual `Access-Control-Allow-Origin: *` header set alongside `Access-Control-Allow-Credentials: true`; reflective allow (`AllowOriginFunc: func(o string) bool { return true }`).
**Concrete grep / ripgrep query:**
```
rg -nP 'AllowedOrigins\s*:\s*\[\]string\{\s*"\*"' --type go
rg -nP 'AllowCredentials\s*:\s*true' --type go
rg -nP 'AllowOriginFunc' --type go -A 3
rg -nP 'Access-Control-Allow-Origin.*\*' --type go
rg -nP 'cors\.Default\(\)' --type go
```
**File hint:** server bootstrap, middleware/cors.go.
**False-positive guard:** Public read-only API with `AllowedOrigins: ["*"]` and `AllowCredentials: false` is fine.

### Cookies — missing `HttpOnly` / `Secure` / `SameSite`

**What to look for:** `http.Cookie{}` literals with `HttpOnly: false`, missing `Secure: true`, `SameSite: http.SameSiteNoneMode` without `Secure`, or no `SameSite` field set at all (defaults to `SameSiteDefaultMode` which is browser-dependent).
**Concrete grep / ripgrep query:**
```
rg -nP '&?http\.Cookie\s*\{' --type go -A 8
rg -nP 'HttpOnly\s*:\s*false|Secure\s*:\s*false' --type go
rg -nP 'SameSite\s*:\s*http\.SameSiteNoneMode' --type go
rg -nP 'http\.SetCookie' --type go -B 3
```
**File hint:** auth handlers, session middleware, login flow.
**False-positive guard:** Localhost dev cookies may legitimately omit `Secure` if guarded by env check.

### gRPC — missing TLS, missing deadline, missing auth interceptor

**What to look for:** `grpc.NewServer()` with no `grpc.Creds(credentials.NewTLS(...))` (insecure listener); `grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))`; missing `grpc.UnaryInterceptor` / `StreamInterceptor` for auth; client calls without `context.WithTimeout`/`WithDeadline`.
**Concrete grep / ripgrep query:**
```
rg -nP 'grpc\.NewServer\s*\(\s*\)' --type go
rg -nP 'insecure\.NewCredentials|grpc\.WithInsecure' --type go
rg -nP 'grpc\.Dial\s*\(' --type go -A 3
rg -nP 'grpc\.(Unary|Stream)Interceptor' --type go
rg -nP 'context\.WithTimeout|context\.WithDeadline' --type go
```
**File hint:** `cmd/server/`, `internal/grpc/`, anywhere `*grpc.Server` is constructed.
**False-positive guard:** mTLS via `credentials.NewTLS(&tls.Config{...})` is safe; loopback unix-socket gRPC may be acceptable.

### TLS — `InsecureSkipVerify`, weak `MinVersion`

**What to look for:** `tls.Config{InsecureSkipVerify: true}`, missing `MinVersion: tls.VersionTLS12` (or `TLS13`), explicit `MinVersion: tls.VersionTLS10`/`tls.VersionTLS11`, `MaxVersion < TLS12`.
**Concrete grep / ripgrep query:**
```
rg -nP 'InsecureSkipVerify\s*:\s*true' --type go
rg -nP 'tls\.Config\s*\{' --type go -A 6
rg -nP 'MinVersion\s*:\s*tls\.VersionTLS1[01]' --type go
rg -nP 'MinVersion\s*:\s*tls\.VersionSSL' --type go
```
**File hint:** HTTP clients to internal services, gRPC dial, mTLS code.
**False-positive guard:** `InsecureSkipVerify` may be acceptable in `_test.go` and clearly env-gated dev paths — flag regardless.

### Race conditions — concurrent map access, shared state without sync

**What to look for:** `var cache = map[string]X{}` accessed from multiple goroutines without `sync.Mutex` / `sync.RWMutex` / `sync.Map` (Go panics with "concurrent map writes" → DoS). Also `go func()` closures capturing loop variables (Go < 1.22 semantics).
**Concrete grep / ripgrep query:**
```
rg -nP '^\s*var\s+\w+\s*=\s*map\[' --type go
rg -nP 'sync\.(Mutex|RWMutex|Map)' --type go
rg -nP 'go\s+func\s*\(' --type go -A 3
```
**File hint:** caches, in-memory stores, goroutine pools.
**False-positive guard:** `sync.Map`, channels, or `atomic.Value` are safe. Run `go test -race ./...` to confirm.

### Goroutine leaks — missing `context.Cancel`, unbounded channel reads

**What to look for:** `go func() { for { select { case <-ch: ... } } }()` with no `case <-ctx.Done():`; `for range channel` without close path; `time.Tick` (leaks forever, prefer `time.NewTicker` + `Stop`).
**Concrete grep / ripgrep query:**
```
rg -nP 'time\.Tick\s*\(' --type go
rg -nP 'go\s+func\s*\(' --type go -A 10 | rg -P 'for\s+\{|for\s+select'
rg -nP 'context\.Background\(\)' --type go
```
**File hint:** background workers, scheduled jobs, streaming endpoints.
**False-positive guard:** Goroutine that runs once and exits is safe.

### File permissions — `os.Create`, world-writable, deprecated `ioutil.TempFile`

**What to look for:** `os.OpenFile(path, os.O_CREATE|os.O_WRONLY, 0644)` or `0o666` for sensitive files; `os.WriteFile(path, data, 0666)`; `ioutil.TempFile` (deprecated since Go 1.16, use `os.CreateTemp`); files created in `/tmp` without `os.MkdirTemp`.
**Concrete grep / ripgrep query:**
```
rg -nP 'os\.OpenFile\s*\([^,]+,[^,]+,\s*0o?[67][0-7][0-7]\b' --type go
rg -nP 'os\.WriteFile\s*\([^,]+,[^,]+,\s*0o?[67][0-7][0-7]\b' --type go
rg -nP 'ioutil\.(TempFile|TempDir|WriteFile)' --type go
rg -nP 'os\.Chmod\s*\([^,]+,\s*0o?[67][0-7][0-7]\b' --type go
```
**File hint:** logging setup, secret persistence, credential caches.
**False-positive guard:** Public assets may legitimately be 0644.

### Unhandled errors — silently swallowed via `_`

**What to look for:** `_ = json.NewDecoder(r.Body).Decode(&v)`, `_ = db.QueryRow(...).Scan(&x)`, `_, _ = w.Write(buf)`, `defer resp.Body.Close()` with no `if err :=` check on the open call.
**Why it's risky in Go:** Auth/authz checks that return errors get silently ignored; partial reads pass through.
**Concrete grep / ripgrep query:**
```
rg -nP '_\s*=\s*\w+\.(Decode|Scan|Validate|Verify|Authenticate|Authorize|Check)\s*\(' --type go
rg -nP '_,\s*_\s*=' --type go
```
**File hint:** request handlers, middleware.
**False-positive guard:** Sometimes legitimately ignored (e.g., `_, _ = w.Write([]byte("ok"))`); flag security-relevant ones.

### Logging sensitive data — `%+v` / `%#v` of structs containing secrets

**What to look for:** `log.Printf("user=%+v", user)`, `slog.Info("...", "user", user)`, `zap.Any("user", user)`, where the struct includes `Password`, `Token`, `Secret`, `APIKey`, `SessionID` fields. `%+v` prints all fields including unexported ones from the same package.
**Concrete grep / ripgrep query:**
```
rg -nPi 'log(rus|\.Printf|\.Println|\.Print|\.Errorf|\.Infof|\.Debugf|\.Fatalf)\s*\([^)]*%\+?v' --type go
rg -nP 'fmt\.(Printf|Sprintf|Println|Errorf)\s*\([^)]*%\+?v' --type go
rg -nPi 'zap\.(Any|Reflect)\s*\(\s*"[^"]*(user|request|cred|auth)' --type go
rg -nPi 'slog\.(Info|Debug|Warn|Error)\s*\([^)]*("password"|"token"|"secret"|"apikey"|"authorization")' --type go
```
**File hint:** auth/, middleware/logging, request loggers.
**False-positive guard:** Structs with custom `String()`/`MarshalJSON` that redact sensitive fields are safer.

### pprof debug endpoints exposed in production

**What to look for:** `_ "net/http/pprof"` blank import without an explicit auth-gated mount; `http.ListenAndServe(":6060", nil)` exposing `/debug/pprof`; `expvar` exposing memory stats publicly.
**Concrete grep / ripgrep query:**
```
rg -nP '_\s+"net/http/pprof"' --type go
rg -nP '"net/http/pprof"|"runtime/pprof"' --type go
rg -nP '_\s+"expvar"' --type go
rg -nP 'http\.ListenAndServe\s*\(\s*":?6060"' --type go
```
**File hint:** `cmd/`, `main.go`, debug helpers.
**False-positive guard:** Behind localhost-only listener / k8s sidecar with no public ingress is acceptable.

### HTTP server timeouts — Slowloris / FD exhaustion

**What to look for:** `http.ListenAndServe(addr, handler)` (uses `http.DefaultServer` which has NO timeouts) or `&http.Server{Addr:..., Handler:...}` without `ReadTimeout`, `ReadHeaderTimeout`, `WriteTimeout`, `IdleTimeout`.
**Why it's risky in Go:** Default server allows slow-loris attackers to hold connections open indefinitely.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.ListenAndServe\s*\(' --type go
rg -nP 'http\.Server\s*\{' --type go -A 8
rg -nP '(Read|Write|Idle|ReadHeader)Timeout' --type go
```
**File hint:** server bootstrap.
**False-positive guard:** Reverse proxy (nginx/envoy) in front may absorb this — still flag for defense-in-depth.

### `bodyclose` / FD leak — `http.Response.Body` not closed

**What to look for:** `resp, _ := http.Get(url); ... // no defer resp.Body.Close()`; `resp.Body` consumed without close in error branch.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.(Get|Post|Head|PostForm|Do)\s*\(' --type go -A 3 | rg -v 'defer.*Body\.Close'
rg -nP 'resp\.Body\.Close|response\.Body\.Close' --type go
```
**File hint:** HTTP clients, integration packages.
**False-positive guard:** `defer resp.Body.Close()` immediately after the call is safe.

### HTTP request smuggling — custom request parsing

**What to look for:** Custom HTTP servers built on `bufio.Reader` parsing `Content-Length`/`Transfer-Encoding` themselves; `httputil.ReverseProxy` modifying `Director` in ways that change `Content-Length`.
**Concrete grep / ripgrep query:**
```
rg -nP 'bufio\.NewReader.*\.ReadString\s*\(\s*[\\\']\\\\n' --type go
rg -nP 'httputil\.NewSingleHostReverseProxy|httputil\.ReverseProxy' --type go -A 8
rg -nP 'Transfer-Encoding|Content-Length' --type go
```
**File hint:** custom proxies, sidecars, load balancers.
**False-positive guard:** stdlib `net/http.Server` parses correctly.

### CSRF via JSON — content-type confusion

**What to look for:** Endpoints accepting POSTs with `Content-Type: application/x-www-form-urlencoded` AND `application/json` (parses both), allowing CSRF via form submission.
**Concrete grep / ripgrep query:**
```
rg -nP 'r\.ParseForm|r\.FormValue|c\.PostForm|c\.FormValue' --type go
rg -nP 'json\.NewDecoder\(r\.Body\)' --type go
```
**File hint:** API handlers.

### Server-side request smuggling via `httputil.NewSingleHostReverseProxy` rewriting host header

**What to look for:** Custom `Director` that reads `r.Host` from incoming request and forwards without sanitization → host-header injection / cache poisoning.
**Concrete grep / ripgrep query:**
```
rg -nP 'NewSingleHostReverseProxy' --type go -A 10
rg -nP 'req\.Host\s*=|req\.Header\.Set\s*\(\s*"Host"' --type go
```
**File hint:** gateway/proxy services.

### Format-string vulnerabilities — `fmt.Errorf("%s", err)` vs `%w`

**What to look for:** User input passed as the format string itself: `fmt.Sprintf(userInput, ...)`, `log.Printf(userInput)` (directly user-controlled). Also `fmt.Errorf("%s", err)` instead of `%w` (loses error wrapping, breaks `errors.Is`).
**Concrete grep / ripgrep query:**
```
rg -nP 'fmt\.(Printf|Sprintf|Errorf|Println|Fprintf)\s*\(\s*\w+\s*[\),]' --type go
rg -nP 'log\.(Printf|Println|Fatalf)\s*\(\s*\w+\s*[\),]' --type go
```
**File hint:** Anywhere errors come from external input.
**False-positive guard:** Constants as format strings are safe; user values must be `%v`/`%s` arguments.

### Reflection-based deserialization with `mitchellh/mapstructure`

**What to look for:** `mapstructure.Decode(input, &result)` where `result` has fields not bounded by config validation — can be abused to set fields not exposed in API.
**Concrete grep / ripgrep query:**
```
rg -nP 'mapstructure\.(Decode|NewDecoder|WeaklyTypedInput)' --type go
```
**File hint:** config loaders, dynamic schema processors.
**False-positive guard:** Strict struct definitions with `mapstructure:"-"` on internal fields are safer.
