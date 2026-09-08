# supply-chain-auditor — Go catalog

> Inlined into the supply-chain-auditor system prompt when the audited repo's primary language is `golang`. Every entry below is a concrete pattern to look for in Go code or its config — not generic advice.

## File globs to scan

- `**/go.mod`, `**/go.sum`
- `**/go.work`, `**/go.work.sum`
- `**/vendor/modules.txt`
- `**/tools.go` (build-time tool deps)
- `**/.github/workflows/*.yml`, `**/.github/workflows/*.yaml`
- `**/.gitlab-ci.yml`, `**/azure-pipelines.yml`, `**/Jenkinsfile`, `**/.circleci/config.yml`
- `**/Dockerfile`, `**/Dockerfile.*`, `**/Containerfile`
- `**/.goreleaser.yml`, `**/.goreleaser.yaml`
- `**/Makefile`, `**/justfile`, `**/Taskfile.yml`
- `**/.golangci.yml`, `**/.golangci.yaml`
- Exclude: `**/vendor/**` for source-grepping (read its `modules.txt` instead)

## Native tooling (when run command is appropriate)

- `govulncheck ./...` — official Go vuln scanner with reachability analysis (Go team / golang.org/x/vuln)
- `osv-scanner --lockfile=go.mod` (or `--lockfile=go.sum`) — OSV.dev cross-ecosystem scanner
- `nancy sleuth` (Sonatype, reads `go list -json -deps ./...`)
- `go list -m -u all` — show available updates for direct + indirect deps
- `go list -m -json all | jq -r '.Path + " " + .Version'` — flat dep inventory
- `go mod tidy -diff` — show what `tidy` would change (Go 1.23+); fails CI if `go.mod`/`go.sum` are out of sync
- `go mod verify` — confirm cached modules match `go.sum` checksums
- `go mod why <module>` — explain why a transitive dep is included
- `go mod graph | grep <module>` — show dep paths to a vulnerable module
- `go vet -vettool=$(which govulncheck) ./...` — vet integration

## Risk patterns

### Stale or missing `go.sum`

**What to look for:** `go.mod` has require entries with no corresponding lines in `go.sum`; running `go mod tidy` produces diffs; `go mod download` fails verification.
**Why it's risky in Go:** Without `go.sum` checksums, modules can be silently swapped at fetch time. The Go toolchain refuses builds when checksums are missing only if `GOFLAGS=-mod=mod` is unset.
**Concrete grep / ripgrep query:**
```
rg -nP '^require\s+' go.mod | wc -l
wc -l go.sum
git status go.sum go.mod
```
Then run `go mod tidy -diff` (Go 1.23+) or `go mod tidy` and check for changes.
**File hint:** `go.mod`, `go.sum` at repo root.
**False-positive guard:** Some monorepos legitimately exclude `go.sum` from per-module dirs but keep one at root.

### `replace` directives pointing to forks / local paths / non-canonical hosts

**What to look for:** `replace` lines in `go.mod` redirecting an upstream module to a fork, a local filesystem path (`=> ./vendor-mod`), or a different Git host. Provenance risk: the audit tool sees the fork's source, not what's actually in the binary.
**Concrete grep / ripgrep query:**
```
rg -nP '^replace\s+\S+\s+(\S+\s+)?=>\s+' go.mod
rg -nP '^replace\s+\S+\s+(\S+\s+)?=>\s+\.{1,2}/' go.mod
rg -nP '^replace\s+\S+\s+(\S+\s+)?=>\s+(?!github\.com|gitlab\.com|bitbucket\.org|golang\.org|gopkg\.in)' go.mod
```
**File hint:** `go.mod`, `go.work`.
**False-positive guard:** Local `replace` is common and intentional in monorepos; flag for audit, not as bug.

### `GOPROXY=direct` / `GOSUMDB=off` bypassing checksum DB

**What to look for:** Build environments setting `GOPROXY=direct`, `GOSUMDB=off`, `GOFLAGS=-insecure`, `GONOSUMCHECK`, `GOINSECURE`, `GONOSUMDB`. These disable Go's central checksum database (`sum.golang.org`).
**Concrete grep / ripgrep query:**
```
rg -nP 'GOPROXY\s*=\s*direct|GOPROXY\s*=\s*off' --hidden -g '!{node_modules,vendor}'
rg -nP 'GOSUMDB\s*=\s*off' --hidden -g '!{node_modules,vendor}'
rg -nP 'GOINSECURE\s*=' --hidden -g '!{node_modules,vendor}'
rg -nP 'GOFLAGS\s*=.*-mod=mod' --hidden -g '!{node_modules,vendor}'
rg -nP 'GONOSUMCHECK' --hidden -g '!{node_modules,vendor}'
```
**File hint:** `Dockerfile`, `.github/workflows/`, CI configs, `Makefile`.
**False-positive guard:** Air-gapped builds may legitimately disable `GOSUMDB` and use a private proxy with its own checksum verification — confirm the private proxy is verifying.

### `// indirect` deps drift — unpinned transitives

**What to look for:** `go.mod` with many `// indirect` lines and no recent `go mod tidy`; transitive deps several major versions behind. Use `go mod why <pkg>` to understand inclusion path.
**Concrete grep / ripgrep query:**
```
rg -nP '//\s*indirect' go.mod | wc -l
```
Then: `go list -m -u all 2>/dev/null | rg '\['` to find updates available.
**File hint:** `go.mod`.

### `vendor/` mode out of sync with `go.mod`

**What to look for:** `vendor/modules.txt` mismatched with `go.mod` requires; running `go mod vendor` produces diffs; build uses `-mod=vendor` but `vendor/` is stale.
**Concrete grep / ripgrep query:**
```
diff <(rg -oP '^\S+\s+\S+' go.mod | sort) <(rg -oP '^# \K\S+\s+\S+' vendor/modules.txt 2>/dev/null | sort)
git status vendor/
```
**File hint:** `vendor/modules.txt`, `go.mod`.

### Module-path hijacks (typosquats, case-collisions)

**What to look for:** Imports of well-known modules with subtle differences in path. Classic example: `github.com/sirupsen/logrus` (canonical, lowercase) vs `github.com/Sirupsen/logrus` (deprecated capital S; case-insensitive on macOS / case-sensitive on Linux causes silent breakage). Also typo'd `github.com/aws/aws-sdk-go-v2` vs `github.com/aws/aws-sdk-go` (different majors).
**Concrete grep / ripgrep query:**
```
rg -nP '"github\.com/Sirupsen/logrus"' --type go go.mod
rg -nP 'github\.com/[A-Z]\w+/' go.mod
rg -nP 'github\.com/(aws-sdk-go|aws-sdk-go-v2)' go.mod
rg -nP 'gopkg\.in/yaml\.v[12]' go.mod
```
**File hint:** `go.mod`, all imports.
**False-positive guard:** Some legitimate orgs use mixed case (`github.com/Microsoft/...`); compare against canonical project README.

### `tools.go` build-time tool deps not pinned via `go.mod`

**What to look for:** `tools.go` file with `_ "github.com/foo/bar"` blank imports under a `// +build tools` (legacy) or `//go:build tools` constraint, ensuring they appear in `go.mod`. Missing `tools.go` means dev tools are installed via `go install foo@latest` (floats!).
**Concrete grep / ripgrep query:**
```
rg -nP 'go:build\s+tools|\+build\s+tools' --type go
fd 'tools\.go$'
rg -nP 'go install\s+\S+@latest' --hidden
rg -nP 'go install\s+\S+@(main|master|HEAD)' --hidden
```
**File hint:** `tools/tools.go`, `internal/tools/`, Makefile, CI.

### `go install ...@latest` in CI / Dockerfile (floating tag)

**What to look for:** `RUN go install github.com/foo/bar@latest`, `go install ...@main` — pulls a moving target each build. Reproducibility + supply-chain risk.
**Concrete grep / ripgrep query:**
```
rg -nP 'go install\s+\S+@(latest|main|master|HEAD)' Dockerfile* .github/workflows/ Makefile justfile
```
**File hint:** `Dockerfile`, CI YAML, `Makefile`.
**False-positive guard:** Pin to a specific version (`@v1.2.3`) or commit SHA.

### `setup-go` GitHub Action without SHA pin

**What to look for:** `actions/setup-go@v4` (tag pin) instead of `actions/setup-go@<full-40-char-sha>`. Same for any other action.
**Concrete grep / ripgrep query:**
```
rg -nP 'uses:\s+\S+/\S+@v?\d+(\.\d+)*\s*$' .github/workflows/
rg -nP 'uses:\s+\S+/\S+@[a-f0-9]{40}' .github/workflows/ -c
```
**File hint:** `.github/workflows/*.yml`.
**False-positive guard:** First-party actions (`actions/...`, `github/...`) are commonly tag-pinned; flag for awareness.

### Missing `-trimpath` / `-buildvcs=false` for reproducible builds

**What to look for:** `go build` invocations in CI / `Makefile` / `Dockerfile` without `-trimpath` (leaks build paths) or without `-buildvcs=false` (leaks VCS metadata) when reproducibility matters.
**Concrete grep / ripgrep query:**
```
rg -nP 'go\s+build\b' Dockerfile* Makefile justfile .github/workflows/ -A 2
rg -nP '-trimpath' Dockerfile* Makefile justfile .github/workflows/
rg -nP 'CGO_ENABLED' Dockerfile* Makefile justfile .github/workflows/
```
**File hint:** build scripts.

### Toolchain pinning (`toolchain` directive, Go 1.21+)

**What to look for:** `go.mod` lacks a `toolchain go1.XX.Y` directive — Go will auto-download whatever toolchain matches `go 1.XX`. Set `GOTOOLCHAIN=local` to force the installed toolchain. Auto-download itself is verified, but pinning prevents surprise upgrades.
**Concrete grep / ripgrep query:**
```
rg -nP '^toolchain\s+go1\.\d+(\.\d+)?' go.mod
rg -nP '^go\s+1\.\d+(\.\d+)?' go.mod
rg -nP 'GOTOOLCHAIN' --hidden
```
**File hint:** `go.mod`, CI env.

### `cgo` dependencies not audited

**What to look for:** `import "C"` in any `.go` file → cgo enabled → links native libraries that are NOT covered by `govulncheck`. Check `LDFLAGS` / `CFLAGS` in `// #cgo` directives.
**Concrete grep / ripgrep query:**
```
rg -nP '^\s*import\s+"C"' --type go
rg -nP '//\s*#cgo\s+(CFLAGS|LDFLAGS|pkg-config)' --type go
rg -nP 'CGO_ENABLED\s*=\s*1' Dockerfile* Makefile .github/workflows/
```
**File hint:** any `.go` file with a leading C preamble.
**False-positive guard:** Pure-Go builds (`CGO_ENABLED=0`) are simpler to audit.

### Modules sourced from non-canonical hosts (private) without `GOPRIVATE`

**What to look for:** `go.mod` requires from `gitlab.example.com/...`, `git.internal/...` while no `GOPRIVATE`/`GONOPROXY` is set in environment → may attempt to fetch from `proxy.golang.org` (leak of internal module names; supply-chain confusion risk).
**Concrete grep / ripgrep query:**
```
rg -nP '^require\s+\S+' go.mod | rg -vP 'github\.com|golang\.org|gopkg\.in|google\.golang\.org|cloud\.google\.com|k8s\.io|sigs\.k8s\.io|go\.opentelemetry\.io|go\.uber\.org|go\.starlark\.net|honnef\.co|filippo\.io'
rg -nP 'GOPRIVATE' --hidden
```
**File hint:** `go.mod`, env config.

### Dependency confusion — internal module name shadowed by public registry

**What to look for:** `go.mod` `module mycorp.com/foo` paired with no `GOPRIVATE=mycorp.com` or `GONOSUMDB`/`GOPROXY` config that prevents leakage; risk that an attacker registers `proxy.golang.org/mycorp.com/foo` route.
**Concrete grep / ripgrep query:**
```
rg -nP '^module\s+\S+' go.mod
rg -nP 'GOPRIVATE\s*='
```
**File hint:** `go.mod`, build env.

### Pre-release / `+incompatible` / pseudo-version dependencies

**What to look for:** Pseudo-versions (`v0.0.0-20230101120000-abcdef123456`) — direct dep on an untagged commit. `+incompatible` suffix — module didn't adopt module-aware versioning; major version mismatch risk.
**Concrete grep / ripgrep query:**
```
rg -nP '\bv0\.0\.0-\d{14}-[a-f0-9]{12}\b' go.mod
rg -nP '\+incompatible' go.mod
```
**File hint:** `go.mod`.
**False-positive guard:** Pseudo-versions are common but each one should be reviewed for source provenance.

### `goreleaser` SBOM + signing missing

**What to look for:** `.goreleaser.yml` lacks `sboms:` block (no SBOM generation) or `signs:` block (no cosign signing). Indicates lower release-time security posture.
**Concrete grep / ripgrep query:**
```
rg -nP '^sboms:|^signs:' .goreleaser.yml .goreleaser.yaml 2>/dev/null
rg -nP 'cosign|syft' .goreleaser.yml .goreleaser.yaml 2>/dev/null
```
**File hint:** `.goreleaser.yml`.

### Vendored modules with patches / drift

**What to look for:** `vendor/<module>/` files modified relative to upstream version recorded in `vendor/modules.txt`; patches applied without record.
**Concrete grep / ripgrep query:**
```
rg -nP '##\s*explicit' vendor/modules.txt | head -20
git log --oneline -- vendor/ | head -10
```
**File hint:** `vendor/`.

### Old `dep`/`glide`/`govendor`/`gopath` artifacts

**What to look for:** `Gopkg.toml`, `Gopkg.lock`, `glide.yaml`, `vendor/vendor.json` — these indicate pre-modules tooling; the project may have inconsistent dep tracking.
**Concrete grep / ripgrep query:**
```
fd '^(Gopkg\.(toml|lock)|glide\.(yaml|lock)|vendor\.json)$'
```
**File hint:** repo root.

### Insecure HTTP for module fetch (extremely rare but flag)

**What to look for:** Any `replace` or `GOPROXY` over `http://` instead of `https://`.
**Concrete grep / ripgrep query:**
```
rg -nP 'http://\S+' go.mod
rg -nP 'GOPROXY\s*=\s*http://' --hidden
```
**File hint:** `go.mod`, env.

### `govulncheck` not in CI

**What to look for:** `.github/workflows/*.yml` does not invoke `govulncheck` (or `osv-scanner`); no scheduled vuln scan; missing `Dependabot`/`Renovate` config for `gomod` ecosystem.
**Concrete grep / ripgrep query:**
```
rg -nP 'govulncheck|osv-scanner' .github/workflows/ .gitlab-ci.yml azure-pipelines.yml 2>/dev/null
fd 'dependabot\.yml$' .github/
fd 'renovate\.json' .
rg -nP '"gomod"' .github/dependabot.yml renovate.json 2>/dev/null
```
**File hint:** `.github/workflows/`, `.github/dependabot.yml`, `renovate.json`.
**False-positive guard:** External SBOM scanning (e.g., Snyk, Grype) may cover this — verify.

### Dockerfile not pinning Go base image SHA

**What to look for:** `FROM golang:1.22-alpine` (tag) instead of `FROM golang:1.22-alpine@sha256:<digest>`; `FROM golang:latest` (worst).
**Concrete grep / ripgrep query:**
```
rg -nP '^FROM\s+(golang|gcr\.io/distroless|scratch)' Dockerfile* Containerfile* | rg -v '@sha256:'
rg -nP '^FROM\s+\S+:latest' Dockerfile* Containerfile*
```
**File hint:** `Dockerfile`, `Containerfile`.

### Missing module-graph audit for transitive `replace` shadowing

**What to look for:** A `replace` in a transitive dep can override what your `go.mod` thinks it's pulling — but only top-level `replace` is honored. Still, run `go mod graph` and look for unexpected paths.
**Concrete grep / ripgrep query:**
```
go mod graph 2>/dev/null | rg -P '\s\S+\s\S+\s' | head -30
```
**File hint:** runtime `go mod graph` output.

### Build flag `-ldflags` injecting unverified data

**What to look for:** `-ldflags '-X main.version=$(git describe)'` is fine; `-ldflags "-X main.token=$SECRET_TOKEN"` bakes secrets into the binary.
**Concrete grep / ripgrep query:**
```
rg -nP '-ldflags' Dockerfile* Makefile justfile .github/workflows/ -A 1
```
**File hint:** build scripts.

### CI uses `go get` (deprecated) instead of `go install` / `go build`

**What to look for:** `go get` in CI without an explicit version; in Go 1.18+ `go get` no longer installs binaries — sign of stale tooling.
**Concrete grep / ripgrep query:**
```
rg -nP 'go\s+get\s' Dockerfile* Makefile justfile .github/workflows/
```
**File hint:** scripts.
