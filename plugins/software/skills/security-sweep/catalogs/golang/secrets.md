# secret-scanner — Go catalog

> Inlined into the secret-scanner system prompt when the audited repo's primary language is `golang`. Every entry below is a concrete pattern to look for in Go code or its config — not generic advice.

## File globs to scan

- `**/*.go` (including `_test.go` and `testdata/`)
- `**/go.mod`, `**/go.sum`, `**/go.work`, `**/go.work.sum`
- `**/Makefile`, `**/justfile`, `**/Taskfile.yml`
- `**/Dockerfile`, `**/Dockerfile.*`, `**/docker-compose*.yml`, `**/*.dockerfile`
- `**/.env`, `**/.env.*`, `**/env.*` (NOT `.env.example` patterns unless they contain real-looking values)
- `**/config*.yaml`, `**/config*.yml`, `**/config*.toml`, `**/config*.json`, `**/config*.hcl`
- `**/*.yaml`, `**/*.yml`, `**/*.toml` under `config/`, `etc/`, `conf/`, `deploy/`, `helm/`, `k8s/`, `manifests/`
- `**/charts/**/values*.yaml`, `**/values-*.yaml`
- `**/.netrc`, `**/.npmrc` (sometimes used by Go tooling)
- `**/testdata/**/*` (fixture leaks are common)
- `**/*.tfvars`, `**/*.tfvars.json` (often beside Go IaC tooling)
- `**/serviceAccount.json`, `**/credentials.json`, `**/key.json`, `**/*-sa.json`, `**/*.pem`, `**/*.key`, `**/*.p12`, `**/*.pfx`
- `**/embed/**`, files referenced by `//go:embed` directives
- Exclude: `**/vendor/**`, `**/node_modules/**`

## Native tooling (when run command is appropriate)

- `gitleaks detect --source . --redact` — primary git-history secret scan
- `trufflehog filesystem .` — entropy + verifier-based detection
- `gosec ./...` rule G101 — hardcoded credentials
- `git log -p -S 'secret_keyword'` — find when a string entered history
- `git ls-files | xargs grep -l 'BEGIN PRIVATE KEY'` — cheap PEM sweep

## Risk patterns

### Hardcoded credentials in Go source — `const`/`var` string literals

**What to look for:** Top-level or package-level `const`/`var` declarations whose name contains `Key`, `Token`, `Secret`, `Password`, `APIKey`, `ApiKey`, `Credential`, `Auth`, `JWT`, `Signing`, `Private` and value is a non-empty string literal.
**Why it's risky in Go:** Compiled into the binary; visible via `strings`/`go-strings`; typically tracked in git.
**Concrete grep / ripgrep query:**
```
rg -nPi '^\s*(const|var)\s+\w*(secret|password|passwd|api[_-]?key|access[_-]?key|auth[_-]?token|signing[_-]?key|private[_-]?key|client[_-]?secret|encryption[_-]?key)\w*\s*(=|=\s*string)\s*"[^"]{8,}"' --type go
rg -nPi '^\s*(const|var)\s+\w+\s*=\s*"(sk-|xox[abprs]-|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|AKIA|ASIA|aws_secret|AIza|ya29\.|eyJ)[A-Za-z0-9_\-/+]{16,}"' --type go
```
**File hint:** `config/`, `internal/auth/`, `pkg/secrets/`, `cmd/`.
**False-positive guard:** Test fixtures with obviously fake values (`"test-key"`, `"REPLACE_ME"`) are fine but flag long random-looking strings.

### Hardcoded credentials — `[]byte("...")` and key-shaped slices

**What to look for:** `[]byte("AKIA...")`, `[]byte{0xab, 0xcd, ...}` of length 16/24/32 used as crypto key, JWT-signing key passed to `hmac.New(sha256.New, ...)`.
**Concrete grep / ripgrep query:**
```
rg -nP '\[\]byte\("([A-Za-z0-9_\-/+]{20,}|sk-|xox[abprs]-|ghp_|AKIA|AIza|eyJ)' --type go
rg -nP 'hmac\.New\s*\([^,]+,\s*\[\]byte\(\s*"[^"]{8,}"' --type go
rg -nP 'jwt\.\w*Key\s*=\s*\[\]byte\(\s*"' --type go
rg -nP 'rsa\.PrivateKey|ecdsa\.PrivateKey|ed25519\.PrivateKey' --type go -A 1
```
**File hint:** crypto helpers, JWT signing setup.
**False-positive guard:** Loaded from env / KMS at init is safe.

### `os.Getenv` defaulting to a literal — fallback secret

**What to look for:** `key := os.Getenv("API_KEY"); if key == "" { key = "fallback-secret-here" }` pattern, or `getEnvOr("X", "literal-secret")` helpers.
**Concrete grep / ripgrep query:**
```
rg -nP 'os\.Getenv\s*\(\s*"[^"]+"\s*\)' --type go -A 4 | rg -P '=\s*"[^"]{8,}"'
rg -nPi 'getenv(Or|WithDefault|String)\s*\(\s*"[^"]+",\s*"[^"]{8,}"' --type go
rg -nP 'cmp\.Or\s*\(\s*os\.Getenv\([^)]+\)\s*,\s*"[^"]{8,}"' --type go
```
**File hint:** config loaders.

### `viper` / `koanf` / `kelseyhightower/envconfig` / `caarlos0/env` defaults

**What to look for:** `viper.SetDefault("auth.token", "...")`, struct tags `envconfig:"X" default:"hardcoded"`, `env:"X" envDefault:"..."`.
**Concrete grep / ripgrep query:**
```
rg -nPi 'viper\.SetDefault\s*\(\s*"[^"]*(secret|key|token|password)[^"]*"\s*,\s*"[^"]{6,}"' --type go
rg -nPi '`(envconfig|env|json|yaml):"[^"]*"\s+default:"[^"]{8,}"' --type go
rg -nPi '`env:"[A-Z_]+(KEY|SECRET|TOKEN|PASS)[A-Z_]*"\s+envDefault:"[^"]{6,}"' --type go
```
**File hint:** `config.go`, `config/config.go`, package-level `Config struct`.

### PEM keys / certificates committed to repo

**What to look for:** `-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----`, `-----BEGIN CERTIFICATE-----` followed by what looks like a real key (not test fixture).
**Concrete grep / ripgrep query:**
```
rg -nP 'BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP|ENCRYPTED)?\s*PRIVATE KEY'
rg -nP 'BEGIN CERTIFICATE'
rg -nP 'BEGIN OPENSSH PRIVATE KEY'
```
**File hint:** `testdata/`, `assets/`, `config/`, anywhere a `.pem` / `.key` lives.
**False-positive guard:** Test certs in `*_test.go` / `testdata/` are intentionally committed; flag if non-test path.

### `//go:embed` pulling in secret files

**What to look for:** `//go:embed config.yaml`, `//go:embed secrets/`, `//go:embed *.pem` directives that bake credentials into the binary.
**Concrete grep / ripgrep query:**
```
rg -nP '//go:embed\s+' --type go
rg -nPi '//go:embed\s+[^\s]*(secret|key|cred|token|env|\.pem|\.key|\.json)' --type go
```
**File hint:** Go 1.16+ files using `embed.FS`.
**False-positive guard:** Embedded SQL migrations, templates, public assets are fine.

### Cloud provider credentials in source / config

**What to look for:**
- AWS: `AKIA[0-9A-Z]{16}`, `ASIA[0-9A-Z]{16}` (access keys); 40-char base64 secret keys
- GCP: `AIza[0-9A-Za-z_-]{35}` (API keys), service-account JSON `{"type": "service_account", "private_key": "..."}`
- Azure: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...`, connection strings
- Datadog: `DD_API_KEY`, 32-hex API keys, 40-hex APP keys
- GitHub: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`, `github_pat_`
- Slack: `xox[abprs]-`
- Stripe: `sk_live_`, `rk_live_`, `pk_live_`
- OpenAI/Anthropic: `sk-` (OpenAI), `sk-ant-` (Anthropic)
**Concrete grep / ripgrep query:**
```
rg -nP 'AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}'
rg -nP 'AIza[0-9A-Za-z_-]{35}'
rg -nP 'AccountKey\s*=\s*[A-Za-z0-9+/]{60,}={0,2}'
rg -nP '"type"\s*:\s*"service_account"'
rg -nP 'ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}'
rg -nP 'xox[abprs]-[A-Za-z0-9-]{20,}'
rg -nP 'sk_live_[A-Za-z0-9]{24,}'
rg -nP 'sk-[A-Za-z0-9]{20,}|sk-ant-[A-Za-z0-9_-]{20,}'
rg -nP '\b[a-f0-9]{32}\b' --type go -B 1 -A 1 | rg -i 'datadog|dd_api'
```
**File hint:** anywhere — search the whole tree.

### Database connection strings with embedded credentials

**What to look for:** `postgres://user:password@host`, `mysql://`, `mongodb://user:pass@`, `redis://:password@`, DSN strings in env defaults / test fixtures.
**Concrete grep / ripgrep query:**
```
rg -nP '(postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp|kafka)://[^:/@\s]+:[^@/\s]+@'
rg -nP 'user=\w+\s+password=\S+' --type go
rg -nP 'sql\.Open\s*\(\s*"[^"]+",\s*"[^"]*://[^:/@]+:[^@]+@'
```
**File hint:** `db/`, `database/`, `repository/`, test fixtures, `docker-compose.yml`.

### `go.mod` `replace` directive pointing to private host with creds

**What to look for:** `replace github.com/foo/bar => https://user:token@gitlab.example.com/...`, `replace ... => ../../../private-mirror`, or `GOPRIVATE` configured to a host whose creds are inline.
**Concrete grep / ripgrep query:**
```
rg -nP '^replace\s+' go.mod
rg -nP 'https?://[^:@\s]+:[^@\s]+@' go.mod
```
**File hint:** `go.mod`.

### `.netrc` / `.git-credentials` referenced for module download

**What to look for:** Repo-committed `.netrc`, Dockerfile that pre-creates `/root/.netrc` with credentials, CI scripts echoing tokens into `~/.netrc` for `GOPRIVATE` access.
**Concrete grep / ripgrep query:**
```
rg -nP 'machine\s+\S+\s+login\s+\S+\s+password\s+\S+'
rg -nP '\.netrc'
rg -nP 'git config.*url\..*\.insteadOf'
```
**File hint:** `Dockerfile`, `.github/workflows/`, `Makefile`.

### Module-proxy / `GOPROXY` / `GONOSUMCHECK` / `GOPRIVATE` env hints

**What to look for:** `ENV GOPROXY=https://USER:TOKEN@proxy.internal`, `GONOSUMCHECK=*`, `GOFLAGS=-insecure`, `GOINSECURE=*`, `GOSUMDB=off`.
**Concrete grep / ripgrep query:**
```
rg -nP 'GOPROXY\s*=.*[:@]'
rg -nP 'GONOSUMCHECK|GOSUMDB\s*=\s*off|GOINSECURE|GOFLAGS=.*insecure'
rg -nP 'GOPRIVATE\s*='
```
**File hint:** `Dockerfile`, CI configs, `Makefile`.

### Test fixtures and `testdata/` containing real-looking secrets

**What to look for:** Files in `testdata/` named `*config*`, `*token*`, `*credential*`, `*.pem`, `*.key`, JSON service-account files; large hex/base64 strings inside `_test.go`.
**Concrete grep / ripgrep query:**
```
rg -nP 'testdata/.*\.(yaml|yml|json|toml|env|pem|key|p12)$'
rg -nP '"[A-Za-z0-9_\-/+]{40,}"' --glob '*_test.go'
rg -nP '"private_key"\s*:\s*"-----BEGIN' --glob 'testdata/**'
```
**File hint:** `testdata/`, `*_test.go`.
**False-positive guard:** Obviously synthetic short tokens (`"abc123"`) are fine.

### Dockerfile `ENV` / `ARG` baking in secrets

**What to look for:** `ENV API_KEY=...`, `ARG NPM_TOKEN=...` followed by `ENV NPM_TOKEN=$NPM_TOKEN`, multi-stage build copying `.netrc` into final image.
**Concrete grep / ripgrep query:**
```
rg -nPi '^(ENV|ARG)\s+\w*(KEY|SECRET|TOKEN|PASS|CRED)\w*\s*=' --type dockerfile
rg -nPi '^(ENV|ARG)\s+\w+\s*=\s*\S{16,}'
rg -nP 'COPY\s+\.netrc'
```
**File hint:** `Dockerfile`, `Dockerfile.*`.

### `docker-compose.yml` plain-text passwords

**What to look for:** `environment:` blocks with `*_PASSWORD: somelongstring`, `MYSQL_ROOT_PASSWORD: ...`, `POSTGRES_PASSWORD: ...`.
**Concrete grep / ripgrep query:**
```
rg -nPi '^\s*\w*(PASSWORD|SECRET|TOKEN|KEY)\w*\s*[=:]\s*\S{6,}' -g 'docker-compose*.yml' -g '*.compose.yml'
```
**File hint:** `docker-compose.yml`, `compose.yml`, `compose.yaml`.

### Makefile / Justfile embedding tokens

**What to look for:** `Makefile` targets exporting tokens for `go install` / `go test` against private repos.
**Concrete grep / ripgrep query:**
```
rg -nPi '(export|setenv)\s+\w*(TOKEN|KEY|SECRET|PASS)\w*\s*=\s*\S{8,}' Makefile justfile Taskfile.yml
```
**File hint:** root `Makefile`, `justfile`, `Taskfile.yml`.

### Kubernetes / Helm values with inline secrets

**What to look for:** `helm/values.yaml` or `manifests/*.yaml` with `secret:`, `apiKey:`, `password:` in plaintext (should be `Secret`/`SealedSecret`/`ExternalSecret`).
**Concrete grep / ripgrep query:**
```
rg -nPi '^\s*(secret|apiKey|password|token|connectionString)\s*:\s*\S{8,}' -g '**/values*.yaml' -g '**/values-*.yaml' -g '**/manifests/**/*.yaml' -g '**/k8s/**/*.yaml' -g '**/helm/**/*.yaml'
rg -nP 'kind:\s*Secret' -g '**/*.yaml' -A 8 | rg -i 'data:|stringData:'
```
**File hint:** `helm/`, `k8s/`, `manifests/`, `deploy/`.

### High-entropy strings in `.go` / `.yaml` / `.toml` (heuristic)

**What to look for:** Any literal of length ≥ 32 with high base64/hex entropy not obviously a hash constant.
**Concrete grep / ripgrep query:**
```
rg -nP '"[A-Za-z0-9+/]{40,}={0,2}"' --type go --type yaml --type toml --type json
rg -nP '"[a-f0-9]{32,}"' --type go --type yaml --type toml --type json
```
**File hint:** anywhere.
**False-positive guard:** Hashes (e.g., SHA-256 digests, git commit SHAs, lock-file hashes), UUIDs, asset fingerprints. Cross-reference with name context.

### Personal access tokens for cloud Git providers in `go.work`

**What to look for:** `go.work` and `go.work.sum` referencing private modules; `replace` lines with embedded auth in URL.
**Concrete grep / ripgrep query:**
```
rg -nP 'use\s+\.|use\s+\.\./' go.work
rg -nP 'https?://[^:/@\s]+:[^@\s]+@' go.work go.work.sum
```
**File hint:** repo root.

### `httpx.Client` / SDK constructors with literal tokens

**What to look for:** `oauth2.Token{AccessToken: "..."}`, `github.NewClient(...).WithAuthToken("ghp_...")`, AWS `credentials.NewStaticCredentials("AKIA...", "...", "")`.
**Concrete grep / ripgrep query:**
```
rg -nP 'oauth2\.Token\s*\{\s*AccessToken\s*:\s*"[^"]{20,}"' --type go
rg -nP 'WithAuthToken\s*\(\s*"[^"]{20,}"' --type go
rg -nP 'credentials\.NewStaticCredentials\s*\(\s*"[^"]+",\s*"[^"]+"' --type go
rg -nP 'aws\.Config\s*\{[^}]*AccessKey' --type go
```
**File hint:** SDK init code.

### Logging tokens / passwords

**What to look for:** Log calls (`log.Printf`, `slog.Info`, `zap.String`) with field names `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`.
**Concrete grep / ripgrep query:**
```
rg -nPi '(log|slog|logger|zap)\.\w+\([^)]*("password"|"token"|"secret"|"apikey"|"api_key"|"authorization"|"cookie"|"bearer")' --type go
rg -nP 'fmt\.\w+\([^)]*Header\.Get\s*\(\s*"Authorization"' --type go
```
**File hint:** middleware, request loggers.

### `.git/config` / pre-commit configs with credentials

**What to look for:** Repo `.git/config` (rare but possible) or `.pre-commit-config.yaml` with embedded tokens for hosted hooks.
**Concrete grep / ripgrep query:**
```
rg -nP 'https?://[^:/@\s]+:[^@\s]+@' .git/config .pre-commit-config.yaml 2>/dev/null
```
**File hint:** repo root.
