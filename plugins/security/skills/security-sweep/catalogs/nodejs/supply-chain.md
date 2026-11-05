# supply-chain-auditor — Node.js / TypeScript catalog

> Inlined into the supply-chain-auditor system prompt when the audited repo's primary language is `nodejs` or `typescript`. Every entry below is a concrete pattern to look for in JS/TS code or its config — not generic advice.

## File globs to scan

- Manifests: `**/package.json`, `**/package-lock.json`, `**/pnpm-lock.yaml`, `**/yarn.lock`, `**/npm-shrinkwrap.json`, `**/bun.lock`, `**/bun.lockb`, `**/.yarn/install-state.gz`
- Workspace / monorepo: `**/pnpm-workspace.yaml`, `**/lerna.json`, `**/nx.json`, `**/turbo.json`, `**/rush.json`
- Registry config: `**/.npmrc`, `**/.yarnrc`, `**/.yarnrc.yml`, `**/.pnpmrc`, `**/bunfig.toml`
- CI: `**/.github/workflows/*.{yml,yaml}`, `**/.gitlab-ci.yml`, `**/azure-pipelines.yml`, `**/.circleci/config.yml`, `**/.buildkite/**`
- Container: `**/Dockerfile`, `**/Dockerfile.*`, `**/docker-compose*.yml`
- Source for unsafe loaders: `**/*.{js,ts,jsx,tsx,mjs,cjs}`

## Native tooling (when run command is appropriate)

- `npm audit --omit=dev --json` (production deps only)
- `pnpm audit --prod --json`
- `yarn audit --json` (Yarn 1) / `yarn npm audit --recursive --severity high` (Yarn 2+)
- `npx better-npm-audit audit` — improved formatting + allowlist support
- `npx audit-ci --moderate` — exit nonzero on moderate+ issues (designed for CI)
- `npx --yes osv-scanner@latest --lockfile=package-lock.json` (Google's OSV scanner; broader DB than `npm audit`)
- `npx snyk test` (requires Snyk auth)
- `npx --yes @cyclonedx/cdxgen -t nodejs -o sbom.json` — generate SBOM
- `npm ls --all` — surface duplicate/conflicting versions
- `npm outdated` — see which deps are far behind

## Risk patterns

### Missing or stale lock file

**What to look for:** `package.json` present without any of `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lock`. Without a lock, `npm install` resolves ranges fresh each run — non-reproducible builds and exposure to brand-new malicious versions.
**Concrete grep / ripgrep query:**
```
fd -H '^package\.json$' -E 'node_modules' -x sh -c 'd=$(dirname {}); [ -f "$d/package-lock.json" ] || [ -f "$d/pnpm-lock.yaml" ] || [ -f "$d/yarn.lock" ] || [ -f "$d/bun.lock" ] || [ -f "$d/bun.lockb" ] || [ -f "$d/npm-shrinkwrap.json" ] || echo "NO LOCK: $d"'
```
**File hint:** Repo root + each workspace package.
**False-positive guard:** Some monorepos centralise locks at the repo root — only flag if no lock exists ANYWHERE for that workspace's manager.

### Mixed lock files (split ecosystems)

**What to look for:** Both `package-lock.json` AND `yarn.lock` AND/OR `pnpm-lock.yaml` present at the same level — devs run different package managers and get different dependency trees per machine.
**Concrete grep / ripgrep query:**
```
fd -H '^(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$' -E 'node_modules' --base-directory .
```
Then group by directory and flag any with > 1 lock file.
**File hint:** Repo root, workspace packages.

### Loose / unpinned version ranges (`^`, `~`, `*`, `latest`)

**What to look for:** `package.json` `dependencies` using `^x.y.z` (admits minor + patch via `npm install`), `~x.y.z` (admits patch), `*` / `latest` / `>=x` / `x - y` ranges. Lock files mitigate but `npm install` (without `ci`) still re-resolves.
**Concrete grep / ripgrep query:**
```
rg -nP '"\s*[~^]\d' -g 'package.json'
rg -nP '"\s*(\*|latest|x|>=|<=|<|>)' -g 'package.json'
rg -nP '"\s*\d+\s*-\s*\d+\.' -g 'package.json'
```
**File hint:** All `package.json` files.
**False-positive guard:** Libraries publishing to npm SHOULD use `^` ranges (peer compat); applications SHOULD pin exact versions or rely on lockfile + `npm ci`. Flag based on context.

### Lifecycle scripts (`postinstall`, `preinstall`, `prepublish`)

**What to look for:** Any `package.json` `scripts.postinstall` / `preinstall` / `prepublish` / `prepare` — these run during `npm install` and are the #1 vector for malicious npm packages (e.g., the recent `event-stream`, `colors.js`, `node-ipc` incidents).
**Concrete grep / ripgrep query:**
```
rg -nP '"(post|pre)?install"\s*:' -g 'package.json'
rg -nP '"prepublish(Only)?"\s*:' -g 'package.json'
rg -nP '"prepare"\s*:' -g 'package.json'
```
**File hint:** Repo root and EVERY `node_modules/*/package.json` (audit transitive deps via `npm ls --all` then inspect their `package.json`).
**False-positive guard:** Legitimate uses: `husky install`, building native modules (`node-gyp rebuild`). Flag anything fetching/executing remote payloads.

### CI installs without `--ignore-scripts`

**What to look for:** CI workflows that run `npm install` / `npm ci` / `pnpm install` / `yarn install` without `--ignore-scripts`, allowing arbitrary code from any dep to run during build.
**Concrete grep / ripgrep query:**
```
rg -nP '\b(npm|pnpm|yarn)\s+(install|ci|i)(?!.*--ignore-scripts)' -g '.github/workflows/**' -g '.gitlab-ci.yml' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP 'ignore-scripts\s*=\s*true' -g '.npmrc'
```
**File hint:** CI configs, Dockerfiles.
**False-positive guard:** `--ignore-scripts` breaks projects with legit native builds — accept as informational unless org policy mandates it.

### Typosquat-prone / known-bad packages

**What to look for:** Common typosquats and historically-malicious packages. Examples (non-exhaustive): `expresss`, `mongose`, `crossenv`, `cross-env.js`, `nodejs.org`, `babelcli`, `noblox.js-server`, `electron-native-notify`, `flatmap-stream`, `event-stream@3.3.6`, `eslint-scope@3.7.2`, `colors@1.4.44-liberty-2`, `faker@6.6.6`, `node-ipc@10.1.1`/`9.2.2`/`9.2.1`, `ua-parser-js@0.7.29`/`0.8.0`/`1.0.0`, `coa@>=2.0.3`, `rc@1.2.9`, `ctx`, `phpass`, `kraken-api-cli`.
**Concrete grep / ripgrep query:**
```
rg -nP '"(expresss|mongose|crossenv|cross-env\.js|babelcli|flatmap-stream|electron-native-notify|noblox\.js-server)"' -g 'package.json' -g 'package-lock.json' -g 'pnpm-lock.yaml' -g 'yarn.lock'
rg -nP '"event-stream"\s*:\s*"3\.3\.6"' -g 'package*.json' -g '*.lock' -g 'pnpm-lock.yaml'
rg -nP '"node-ipc"\s*:\s*"(10\.1\.1|9\.2\.2|9\.2\.1)"' -g 'package*.json' -g '*.lock' -g 'pnpm-lock.yaml'
rg -nP '"ua-parser-js"\s*:\s*"(0\.7\.29|0\.8\.0|1\.0\.0)"' -g 'package*.json' -g '*.lock' -g 'pnpm-lock.yaml'
rg -nP '"colors"\s*:\s*"1\.4\.44-liberty-2"' -g 'package*.json' -g '*.lock' -g 'pnpm-lock.yaml'
```
**File hint:** Manifests + lock files.
**False-positive guard:** A pinned old version in a lock file is suspect; cross-check via `npm audit` for the canonical CVE list.

### Dependency confusion — private scope shadowed by public unscoped

**What to look for:** Internal-looking `@company/utils` deps without a corresponding `.npmrc` `@company:registry=https://internal.registry/`, OR unscoped private packages (e.g., `acme-internal-utils`) that an attacker could publish on the public registry first.
**Concrete grep / ripgrep query:**
```
rg -nP '"@[a-z0-9-]+/' -g 'package.json'
rg -nP '@[a-z0-9-]+:registry=' -g '.npmrc' -g '.yarnrc.yml'
```
Compare scopes used in `package.json` to scopes registered in `.npmrc`. Any scope used but not registered is a confusion risk.
**File hint:** `package.json` + `.npmrc` pair.
**False-positive guard:** Public scopes (`@types/*`, `@babel/*`, `@vercel/*`) need no internal registry config.

### Git / file / tarball deps in production

**What to look for:** `dependencies` pointing to `git+ssh://`, `git+https://`, `https://github.com/...#sha`, `file:`, `link:`, or arbitrary tarball URLs — these bypass npm registry signing/audit and may pull arbitrary commits.
**Concrete grep / ripgrep query:**
```
rg -nP '"\s*git\+(ssh|https?)://' -g 'package.json'
rg -nP '"\s*github:[\w\-]+/[\w\-]+' -g 'package.json'
rg -nP '"\s*https?://[^/]+\.tgz' -g 'package.json'
rg -nP '"\s*file:' -g 'package.json'
rg -nP '"\s*link:' -g 'package.json'
```
**File hint:** All `package.json`.
**False-positive guard:** Workspace `link:` / `workspace:*` deps inside a monorepo are intended.

### `workspace:*` outside an actual workspace

**What to look for:** `"workspace:*"` / `"workspace:^"` references in a non-workspace project; will fail at install with newer pnpm/yarn.
**Concrete grep / ripgrep query:**
```
rg -nP '"\s*workspace:' -g 'package.json'
fd -H '^pnpm-workspace\.yaml$' -E 'node_modules'
```

### `npm overrides` / `pnpm.overrides` / `resolutions` for known-bad transitive

**What to look for:** Whether the repo uses `overrides` (npm 8.3+) / `pnpm.overrides` / `resolutions` (Yarn) to pin away known-vulnerable transitive deps. Absence is not a bug, but presence + stale entries = drift.
**Concrete grep / ripgrep query:**
```
rg -nP '"overrides"\s*:' -g 'package.json' -A 30
rg -nP '"resolutions"\s*:' -g 'package.json' -A 30
rg -nP 'pnpm:\s*$' -g 'package.json' -A 30
```
**File hint:** Root `package.json`.

### Engine mismatch — `engines.node` vs CI Node

**What to look for:** `package.json` `engines.node` declares one major (e.g. `>=18`) but CI workflows use a different one — leads to deps installing different binaries than tested.
**Concrete grep / ripgrep query:**
```
rg -nP '"engines"\s*:\s*\{[^}]*"node"' -g 'package.json'
rg -nP 'node-version\s*:\s*[\x27"]?[\d.]+' -g '.github/workflows/**'
rg -nP 'image\s*:\s*node:[\d.]+' -g '.github/workflows/**' -g '.gitlab-ci.yml' -g 'Dockerfile' -g 'docker-compose*.yml'
```
**File hint:** Compare each manifest with its CI/Docker config.

### Missing `--provenance` on `npm publish`

**What to look for:** Publish workflows that don't pass `--provenance` (npm provenance attests build metadata cryptographically since npm 9.5).
**Concrete grep / ripgrep query:**
```
rg -nP 'npm\s+publish' -g '.github/workflows/**'
rg -nP 'npm\s+publish.*--provenance' -g '.github/workflows/**'
```
**File hint:** `.github/workflows/release.yml`, `.github/workflows/publish.yml`.
**False-positive guard:** Only relevant for libraries published to npm.

### Unpinned GitHub Actions

**What to look for:** `uses: actions/checkout@v4` (tag, mutable) instead of `uses: actions/checkout@<full-40-char-sha>`. Tag refs are mutable and have been weaponised (tj-actions/changed-files compromise, March 2025).
**Concrete grep / ripgrep query:**
```
rg -nP 'uses:\s*[\w\-]+/[\w\-./]+@v?\d+(\.\d+)*\s*$' -g '.github/workflows/**'
rg -nP 'uses:\s*[\w\-]+/[\w\-./]+@(main|master|latest)\s*$' -g '.github/workflows/**'
rg -nP 'uses:\s*[\w\-]+/[\w\-./]+@[a-f0-9]{40}\s*$' -g '.github/workflows/**'
```
**File hint:** `.github/workflows/*`.
**False-positive guard:** First-party reusable workflows in the same org may be acceptable at tag.

### Unpinned base images in Dockerfiles

**What to look for:** `FROM node:20` (mutable tag) instead of `FROM node:20.18.1-alpine3.19@sha256:...` — base images can be silently re-pushed.
**Concrete grep / ripgrep query:**
```
rg -nP '^FROM\s+node:[\d.]+(-\w+)*\s*$' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP '^FROM\s+node:(latest|alpine|slim|lts)' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP '^FROM\s+\S+@sha256:' -g 'Dockerfile' -g 'Dockerfile.*'
```
**File hint:** All Dockerfiles.

### Dynamic `require` / `import()` from network or env

**What to look for:** `require(userInput)`, `await import(req.body.module)`, `require(process.env.MODULE)` — lets attackers load arbitrary modules from `node_modules` (or worse, from a path they control).
**Concrete grep / ripgrep query:**
```
rg -nP 'require\s*\(\s*(req\.|input\.|body\.|process\.env\.|user)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'import\s*\(\s*(req\.|input\.|body\.|process\.env\.|user)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\s*\(\s*[\x27\"][^./].*\$\{" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Plugin loaders, dynamic config systems.

### Outdated lock-file integrity hashes

**What to look for:** `package-lock.json` `lockfileVersion` 1 (old; no integrity verification by default) or missing `integrity` SHA512 fields.
**Concrete grep / ripgrep query:**
```
rg -nP '"lockfileVersion"\s*:\s*1' -g 'package-lock.json'
rg -nL 'integrity' -g 'package-lock.json'
```
**File hint:** Root + each `package-lock.json`.
**False-positive guard:** v1 was npm 5; modern (npm 7+) writes v2/v3.

### Unscoped private registries / mirror config bypass

**What to look for:** `.npmrc` `registry=` pointing at non-npmjs.org mirrors with no integrity verification, especially HTTP (not HTTPS).
**Concrete grep / ripgrep query:**
```
rg -nP '^registry\s*=\s*http://' -g '.npmrc' -g '.yarnrc' -g '.yarnrc.yml'
rg -nP '^registry\s*=\s*https://(?!registry\.npmjs\.org)' -g '.npmrc'
```
**File hint:** `.npmrc`.

### Bun lockfile formats

**What to look for:** Pre-Bun-1.2 binary `bun.lockb` (opaque, hard to review in diffs); Bun 1.2+ uses textual `bun.lock`. Repos still on `bun.lockb` lose review visibility.
**Concrete grep / ripgrep query:**
```
fd -H '^bun\.lockb$' -E 'node_modules'
fd -H '^bun\.lock$' -E 'node_modules'
```
**False-positive guard:** Many repos haven't migrated yet; informational.

### Yarn `enableScripts: false` missing

**What to look for:** `.yarnrc.yml` should have `enableScripts: false` for stricter installs (Yarn Berry).
**Concrete grep / ripgrep query:**
```
rg -nP 'enableScripts\s*:\s*false' -g '.yarnrc.yml'
fd -H '^\.yarnrc\.yml$' -E 'node_modules'
```

### `npm install` in Dockerfiles instead of `npm ci`

**What to look for:** Production Dockerfile using `npm install` (resolves fresh) instead of `npm ci` (uses lock exactly).
**Concrete grep / ripgrep query:**
```
rg -nP '^RUN\s+npm\s+install' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP '^RUN\s+npm\s+ci' -g 'Dockerfile' -g 'Dockerfile.*'
```

### Dev dependencies bundled in production

**What to look for:** Production Dockerfile or build that runs `npm install` (not `npm ci --omit=dev` / `npm install --production`) — bloats image AND ships dev tooling vulns.
**Concrete grep / ripgrep query:**
```
rg -nP 'npm\s+(ci|install)(?!.*(--omit=dev|--production|--only=production))' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP 'pnpm\s+install(?!.*--prod)' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP 'yarn\s+install(?!.*--production)' -g 'Dockerfile' -g 'Dockerfile.*'
```

### TypeScript-specific — `@types/*` deprecated / abandoned

**What to look for:** `@types/X` packages where the upstream now ships its own types (e.g., `@types/node-fetch` for `node-fetch` v3+ which is type-native). Stale `@types` can pull in old transitive deps.
**Concrete grep / ripgrep query:**
```
rg -nP '"@types/' -g 'package.json'
```
Cross-reference against the actual package's README/version to see if types are now bundled.

### TypeScript-specific — `ts-node` / `tsx` in production startup

**What to look for:** `npm start` running `ts-node` / `tsx` / `node --loader ts-node/esm` — pulls dev compiler at runtime (larger attack surface, dev deps in prod).
**Concrete grep / ripgrep query:**
```
rg -nP '"start"\s*:\s*"(ts-node|tsx|node\s+--loader\s+ts-node)' -g 'package.json'
```

### Bundled dep CVEs from npm audit

**What to look for:** Known-vulnerable transitive deps. Use `npm audit --json` and parse for `severity: high|critical` advisories.
**Run command:**
```
npm audit --omit=dev --json 2>/dev/null | jq '.vulnerabilities | to_entries | map(select(.value.severity == "high" or .value.severity == "critical")) | .[] | {name: .key, severity: .value.severity, via: .value.via[0].title // .value.via[0]}'
pnpm audit --prod --json 2>/dev/null
```
**File hint:** Root project + each workspace.
