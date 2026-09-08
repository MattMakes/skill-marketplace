# secret-scanner — Node.js / TypeScript catalog

> Inlined into the secret-scanner system prompt when the audited repo's primary language is `nodejs` or `typescript`. Every entry below is a concrete pattern to look for in JS/TS code or its config — not generic advice.

## File globs to scan

- All env files: `**/.env`, `**/.env.*`, `**/*.env`, `**/.envrc`
- Package + registry config: `**/package.json`, `**/.npmrc`, `**/.yarnrc`, `**/.yarnrc.yml`, `**/.pnpmrc`, `**/bunfig.toml`
- Framework config: `**/next.config.{js,ts,mjs}`, `**/nuxt.config.{js,ts}`, `**/vite.config.{js,ts}`, `**/svelte.config.{js,ts}`, `**/astro.config.{js,ts,mjs}`, `**/remix.config.js`, `**/webpack.config.{js,ts,mjs}`, `**/rollup.config.{js,mjs}`, `**/turbo.json`, `**/nx.json`
- Deployment manifests: `**/vercel.json`, `**/netlify.toml`, `**/firebase.json`, `**/wrangler.toml`, `**/wrangler.jsonc`, `**/serverless.yml`, `**/sst.config.{js,ts}`, `**/amplify.yml`, `**/.do/app.yaml`, `**/render.yaml`, `**/fly.toml`, `**/Dockerfile`, `**/docker-compose*.yml`
- Source: `**/*.{js,jsx,ts,tsx,mjs,cjs,vue,svelte,astro}`
- Test fixtures: `**/cypress.config.{js,ts}`, `**/playwright.config.{js,ts}`, `**/jest.config.{js,ts}`, `**/vitest.config.{js,ts}`, `**/*.test.{js,ts,jsx,tsx,mjs,cjs}`, `**/__tests__/**`, `**/__fixtures__/**`, `**/*.spec.{js,ts,jsx,tsx}`
- Build outputs (sometimes leak): `**/dist/**`, `**/build/**`, `**/.next/**`, `**/.nuxt/**`, `**/.svelte-kit/**`, `**/.output/**`
- Exclude: `**/node_modules/**`, `**/coverage/**` (still scan if you want, but expect noise)

## Native tooling (when run command is appropriate)

- `npx gitleaks detect --source . --no-banner --redact` (most accurate at present)
- `npx trufflehog filesystem .` (detects + verifies many cloud creds)
- `npx secretlint "**/*"` — Node-native, fast
- `git log -p -S 'AKIA' -- $(git ls-files)` — quick check for AWS keys ever committed
- `git log --all --pretty=format: --name-only --diff-filter=A | grep -E '\.env(\.|$)'` — every `.env` file ever introduced

## Risk patterns

### `.env*` files committed

**What to look for:** Any `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`, `.env.staging` tracked by git. `.env.example` / `.env.sample` are intentionally tracked as templates (no real values).
**Why it's risky in Node:** `dotenv` is the de-facto standard; teams often `cp .env.example .env` then forget to gitignore. `.env.production` is the worst variant — usually contains live keys.
**Concrete grep / ripgrep query:**
```
git ls-files | rg -P '(^|/)\.env(\.[a-zA-Z0-9_-]+)?$' | rg -v '\.env\.(example|sample|template|dist)$'
rg -n '^[A-Z][A-Z0-9_]+=' -g '.env' -g '.env.*' --hidden
```
**File hint:** Repo root, app folders in monorepos (`apps/*/.env`, `packages/*/.env`).
**False-positive guard:** `.env.example` / `.env.sample` with placeholder values like `your_key_here` or `xxx` are safe and expected.

### `.npmrc` / `.yarnrc.yml` registry auth tokens

**What to look for:** `_authToken`, `_auth`, `npmAuthToken`, `npmAlwaysAuth` lines — embedding npm/Artifactory/GitHub Packages tokens in repo-local registry config.
**Concrete grep / ripgrep query:**
```
rg -nP '_authToken\s*=\s*\S+' -g '.npmrc' -g '.yarnrc' -g '.yarnrc.yml' -g '.pnpmrc' --hidden
rg -nP 'npmAuthToken\s*:\s*\S+' -g '.yarnrc.yml' --hidden
rg -nP '//.*?(npm|jfrog|github|gitlab|nexus|artifactory)\S*?:_authToken=' --hidden
rg -nP '//\S+/:_(auth|password)=' --hidden
```
**File hint:** Repo root, `~/.npmrc` (NEVER commit), CI scripts, Dockerfiles copying `.npmrc`.
**False-positive guard:** `_authToken=${NPM_TOKEN}` (variable expansion) is the safe pattern; flag literal hex/base64 tokens.

### `package.json` `scripts` with embedded credentials

**What to look for:** `scripts.deploy` / `scripts.publish` / etc. embedding `API_KEY=`, `TOKEN=`, `--token=` literals.
**Concrete grep / ripgrep query:**
```
rg -nP '"[a-z][a-z0-9:-]*"\s*:\s*"[^"]*\b(API_KEY|TOKEN|SECRET|PASSWORD|AUTH)=[^$\s]+' -g 'package.json'
rg -nP '"scripts"\s*:\s*\{' -g 'package.json' -A 50
```
**File hint:** Root `package.json` and per-package `package.json` in monorepos.
**False-positive guard:** `API_KEY=$NPM_TOKEN` (env-var indirection) is safe.

### AWS credentials

**What to look for:** AWS access key IDs (`AKIA[0-9A-Z]{16}`), secret access keys (40-char base64-ish), session tokens, Cognito IDs, or `aws-sdk` `credentials: { accessKeyId, secretAccessKey }` literals.
**Concrete grep / ripgrep query:**
```
rg -nP '\bAKIA[0-9A-Z]{16}\b'
rg -nP '\bASIA[0-9A-Z]{16}\b'
rg -nP "aws_secret_access_key\s*[:=]\s*['\"][A-Za-z0-9/+=]{40}['\"]"
rg -nP "(secretAccessKey|secret_access_key)\s*[:=]\s*['\"][A-Za-z0-9/+=]{40}['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs,json}'
rg -nP "accessKeyId\s*:\s*['\"]AKIA" -g '*.{js,ts,jsx,tsx,mjs,cjs,json}'
```
**File hint:** S3/SES/SNS/Lambda integration files, `lib/aws.ts`, `services/aws/*`.
**False-positive guard:** `AKIAIOSFODNN7EXAMPLE` is the AWS-docs example key.

### GitHub tokens (PATs, app installation, OAuth)

**What to look for:** `ghp_`, `ghs_`, `gho_`, `ghu_`, `ghr_`, `github_pat_` prefixes (40+ chars).
**Concrete grep / ripgrep query:**
```
rg -nP '\bghp_[A-Za-z0-9]{36,}\b'
rg -nP '\bghs_[A-Za-z0-9]{36,}\b'
rg -nP '\bgho_[A-Za-z0-9]{36,}\b'
rg -nP '\bghu_[A-Za-z0-9]{36,}\b'
rg -nP '\bghr_[A-Za-z0-9]{36,}\b'
rg -nP '\bgithub_pat_[A-Za-z0-9_]{82,}\b'
```
**File hint:** CI scripts, Octokit integration code, scrapers.
**False-positive guard:** Tokens in `.env.example` with the literal value `ghp_xxx...` are placeholders.

### Slack tokens

**What to look for:** `xoxb-` (bot), `xoxp-` (user), `xoxa-` (workspace), `xoxr-` (refresh), `xoxs-` (legacy), webhook URLs `https://hooks.slack.com/services/T.../B.../...`.
**Concrete grep / ripgrep query:**
```
rg -nP '\bxox[abprso]-[0-9A-Za-z-]{10,}\b'
rg -nP 'https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]{20,}'
```
**File hint:** Notification helpers, monitoring code, `@slack/web-api`/`@slack/bolt` integrations.

### Stripe keys

**What to look for:** `sk_live_`/`sk_test_` (secret), `rk_live_`/`rk_test_` (restricted), `pk_live_`/`pk_test_` (publishable, less critical but still), `whsec_` (webhook signing secret).
**Concrete grep / ripgrep query:**
```
rg -nP '\bsk_live_[A-Za-z0-9]{20,}\b'
rg -nP '\bsk_test_[A-Za-z0-9]{20,}\b'
rg -nP '\brk_(live|test)_[A-Za-z0-9]{20,}\b'
rg -nP '\bwhsec_[A-Za-z0-9]{20,}\b'
rg -nP '\bpk_live_[A-Za-z0-9]{20,}\b'
```
**File hint:** Checkout flows, billing services, webhook handlers.

### Anthropic / OpenAI / Google AI keys

**What to look for:** `sk-ant-api03-...` (Anthropic), `sk-...` or `sk-proj-...` (OpenAI), `sk-or-v1-` (OpenRouter), Google API keys (`AIza...`), Cohere (`co-...`).
**Concrete grep / ripgrep query:**
```
rg -nP '\bsk-ant-api03-[A-Za-z0-9_\-]{80,}\b'
rg -nP '\bsk-ant-[A-Za-z0-9_\-]{30,}\b'
rg -nP '\bsk-proj-[A-Za-z0-9_\-]{40,}\b'
rg -nP '\bsk-[A-Za-z0-9]{32,}\b'
rg -nP '\bAIza[0-9A-Za-z_\-]{35}\b'
rg -nP '\bsk-or-v1-[A-Za-z0-9]{40,}\b'
```
**File hint:** LLM SDK call sites (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`).
**False-positive guard:** OpenAI's `sk-` prefix is loose; pair with adjacent context (`OPENAI_API_KEY`, `apiKey:`, `Authorization`).

### Vercel / Netlify / Cloudflare tokens

**What to look for:** Vercel token (`vc_`/`VERCEL_TOKEN`), Netlify (`nf_`), Cloudflare (`CF_API_TOKEN`/`CLOUDFLARE_API_TOKEN`).
**Concrete grep / ripgrep query:**
```
rg -nPi 'VERCEL_(TOKEN|API_KEY)\s*[:=]\s*[^\s$]'
rg -nPi 'NETLIFY_(AUTH_TOKEN|TOKEN)\s*[:=]\s*[^\s$]'
rg -nPi 'CLOUDFLARE_(API_TOKEN|API_KEY)\s*[:=]\s*[^\s$]'
rg -nP '\bvc_[A-Za-z0-9]{20,}\b'
```
**File hint:** Deploy scripts, GitHub Actions workflows, `wrangler.toml`.

### Database connection strings

**What to look for:** `mongodb://user:pass@`, `postgres://user:pass@`, `mysql://user:pass@`, `redis://:pass@`, `postgresql+asyncpg://...` URLs with embedded passwords.
**Concrete grep / ripgrep query:**
```
rg -nP '(mongodb|mongodb\+srv|postgres|postgresql|mysql|mariadb|redis|rediss|amqp|amqps|clickhouse)://[^/\s]+:[^@\s]+@[^\s\x27"]+'
```
**File hint:** Knex/Sequelize/Prisma config, `database.{js,ts}`, env files.
**False-positive guard:** `://user:${PASS}@host` (template substitution at runtime) is safe; `://user:password@host` literal is not.

### JWT / session secrets

**What to look for:** `JWT_SECRET`, `SESSION_SECRET`, `COOKIE_SECRET`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` literals.
**Concrete grep / ripgrep query:**
```
rg -nPi '(JWT_SECRET|SESSION_SECRET|COOKIE_SECRET|NEXTAUTH_SECRET|AUTH_SECRET|ENCRYPTION_KEY)\s*[:=]\s*[\x27"][A-Za-z0-9+/=_\-]{16,}[\x27"]'
rg -nPi '(SUPABASE_SERVICE_ROLE_KEY|SUPABASE_JWT_SECRET)\s*[:=]\s*[\x27"]\S+[\x27"]'
```
**File hint:** Auth config, NextAuth/Auth.js setup.

### Private keys (RSA/EC/SSH/PGP)

**What to look for:** Inline PEM blocks.
**Concrete grep / ripgrep query:**
```
rg -nP '-----BEGIN\s+(RSA\s+|EC\s+|DSA\s+|OPENSSH\s+|PGP\s+)?(PRIVATE\s+KEY|ENCRYPTED\s+PRIVATE\s+KEY)-----'
```
**File hint:** Anywhere — keys in code = wrong unless test fixtures (still suspect).

### `firebase.json` / `serviceAccount.json` committed

**What to look for:** Firebase service-account JSON files (contain `private_key`, `client_email`, `private_key_id`).
**Concrete grep / ripgrep query:**
```
rg -nP '"type"\s*:\s*"service_account"' -g '*.json'
rg -nP '"private_key"\s*:\s*"-----BEGIN' -g '*.json'
git ls-files | rg -i 'serviceaccount.*\.json|firebase-adminsdk.*\.json'
```
**File hint:** `serviceAccountKey.json`, `firebase-adminsdk-*.json`.

### Cloud config secrets — `wrangler.toml`, `vercel.json`, `netlify.toml`

**What to look for:** Cloudflare Worker `[vars]` blocks with literal API keys, Vercel `env` array with literal values (should be `@secret-name` references), Netlify `[context.production.environment]` with literal secrets.
**Concrete grep / ripgrep query:**
```
rg -nP '^\s*[A-Z][A-Z0-9_]+\s*=\s*["\x27](?!\$)[A-Za-z0-9+/=_\-]{20,}["\x27]' -g 'wrangler.toml'
rg -nP '"key"\s*:\s*"[A-Z_]+",\s*"value"\s*:\s*"(?!@)' -g 'vercel.json'
rg -nP '^\s*[A-Z][A-Z0-9_]+\s*=\s*["\x27][A-Za-z0-9+/=_\-]{20,}["\x27]' -g 'netlify.toml'
```
**File hint:** Deploy config root.
**False-positive guard:** Vercel `"value": "@my-secret"` is a reference, not a secret. Wrangler `[vars]` is intended for non-secret config; secrets go via `wrangler secret put`.

### Hardcoded `localStorage`/`sessionStorage` token writes

**What to look for:** Client-side `localStorage.setItem('token', ...)`, `localStorage.setItem('jwt', ...)` — XSS escalation surface; tokens persist across tabs and shared-device users.
**Concrete grep / ripgrep query:**
```
rg -nPi 'localStorage\.setItem\s*\(\s*[\x27"](token|jwt|access_?token|auth|session|api_?key)' -g '*.{js,jsx,ts,tsx,vue,svelte,astro,mjs,cjs}'
rg -nPi 'sessionStorage\.setItem\s*\(\s*[\x27"](token|jwt|access_?token|auth|session)' -g '*.{js,jsx,ts,tsx,vue,svelte,astro,mjs,cjs}'
```
**File hint:** Client auth helpers, login pages, OAuth callback components.
**False-positive guard:** Storing non-sensitive UI prefs in localStorage is fine.

### Secrets exposed to the browser via `NEXT_PUBLIC_*` / `VITE_*` / `PUBLIC_*` / `EXPO_PUBLIC_*`

**What to look for:** Server-only secrets named with public-prefix env vars — these get inlined into the client bundle at build time.
**Concrete grep / ripgrep query:**
```
rg -nPi '(NEXT_PUBLIC_|VITE_|PUBLIC_|EXPO_PUBLIC_|REACT_APP_|GATSBY_)[A-Z0-9_]*(SECRET|PASSWORD|PRIVATE|SERVICE_ROLE|API_KEY|TOKEN)' -g '*.{js,jsx,ts,tsx,vue,svelte,astro,mjs,cjs}' -g '.env*'
rg -nP 'process\.env\.NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE)' -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP 'import\.meta\.env\.VITE_[A-Z0-9_]*(SECRET|PRIVATE|SERVICE_ROLE)' -g '*.{js,jsx,ts,tsx,vue,svelte,astro,mjs,cjs}'
```
**File hint:** `.env*`, any client-side component reading `process.env`.
**False-positive guard:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (intentionally public `pk_*`) is fine. Flag anything containing `_SECRET_`, `_PRIVATE_`, `_SERVICE_ROLE_`, generic `_API_KEY`.

### Server secret read in client component (Next.js / SvelteKit / Nuxt)

**What to look for:** `'use client'` files referencing `process.env.X` where X is NOT prefixed with `NEXT_PUBLIC_` — Next.js will inline `undefined` (information disclosure of intent at minimum, broken behaviour at worst). Worse: SSR component leaks server env via JSON serialization to `__NEXT_DATA__` / `__NUXT__`.
**Concrete grep / ripgrep query:**
```
rg -nP "['\"]use client['\"]" -g '*.{js,jsx,ts,tsx}' -A 50 | rg 'process\.env\.\w+' | rg -v 'NEXT_PUBLIC_'
rg -nP 'props.*process\.env\.[A-Z0-9_]+' -g '*.{js,jsx,ts,tsx}'
```
**File hint:** `'use client'` boundary files.

### `dotenv` `.env.production` / `.env.staging` shipped in monorepo workspace

**What to look for:** Workspace packages (e.g. `apps/web/.env.production`) tracked by git.
**Concrete grep / ripgrep query:**
```
git ls-files | rg -P '(apps|packages|services)/[^/]+/\.env(\.[a-zA-Z]+)?$' | rg -v '\.env\.(example|sample|template|dist)$'
```

### Test fixtures with hardcoded JWTs / API keys

**What to look for:** Real-looking JWTs (`eyJ...`), `apiKey`/`token`/`Bearer` literals in test files. Some risk: JWTs can leak signing keys via brute force on weak secrets.
**Concrete grep / ripgrep query:**
```
rg -nP '\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b' -g '*.{js,ts,jsx,tsx,json,mjs,cjs}'
rg -nPi "(token|apiKey|api_?secret|password)\s*[:=]\s*[\x27\"][A-Za-z0-9_\-]{20,}[\x27\"]" -g '**/*.test.{js,ts,jsx,tsx}' -g '**/__tests__/**' -g '**/__fixtures__/**'
rg -nP "Authorization\s*:\s*[\x27\"]Bearer\s+[A-Za-z0-9._\-]{20,}[\x27\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs,json}'
```
**File hint:** `cypress.config.{js,ts}`, `playwright.config.{js,ts}`, `__fixtures__/`, `*.test.*`.
**False-positive guard:** A short JWT signed with `'secret'` for unit tests is acceptable; a long, realistic JWT is suspect.

### CI/CD workflow secret literals

**What to look for:** `.github/workflows/*.yml` with literal tokens instead of `${{ secrets.X }}`.
**Concrete grep / ripgrep query:**
```
rg -nP '\b(ghp_|sk_live_|xoxb-|AKIA[0-9A-Z]{16}|sk-ant-api03-|AIza)' -g '.github/workflows/**'
rg -nP '\b(token|password|secret|apiKey)\s*:\s*[\x27"](?!\$\{\{)[\w\-]{20,}[\x27"]' -g '.github/workflows/**'
```
**File hint:** `.github/workflows/`, `.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci/config.yml`, `bitbucket-pipelines.yml`.

### Source maps shipped to production with secrets

**What to look for:** `.js.map` files in deployed `dist/`/`build/` containing `process.env` literal substitutions.
**Concrete grep / ripgrep query:**
```
rg -nP '"process\\.env\\.[A-Z_]+"' -g '*.js.map'
rg -nP '\bsk_live_|ghp_|AKIA[0-9A-Z]{16}|sk-ant-api03-' -g '*.js.map'
```
**File hint:** `dist/`, `build/`, `.next/static/chunks/`, `.output/`.

### Bundled secrets via Vite/Webpack `define`

**What to look for:** `define: { 'process.env.SECRET': JSON.stringify(process.env.SECRET) }` — inlines server env into client bundle at build time.
**Concrete grep / ripgrep query:**
```
rg -nP '(define|DefinePlugin)\s*[:(]\s*\{[^}]*process\.env\.[A-Z0-9_]*(SECRET|PRIVATE|API_KEY|TOKEN|PASSWORD)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** `vite.config.*`, `webpack.config.*`, `rollup.config.*`.

### TypeScript-specific — `import.meta.env` server secret leak

**What to look for:** Client components referencing `import.meta.env.X` where X is a secret (Vite/Astro/SvelteKit inline these at build time; only `PUBLIC_*` / `VITE_*` are intentionally public, but devs sometimes name things wrong).
**Concrete grep / ripgrep query:**
```
rg -nPi 'import\.meta\.env\.\w*(SECRET|PRIVATE|SERVICE_ROLE|API_KEY|TOKEN|PASSWORD)' -g '*.{ts,tsx,vue,svelte,astro,js,jsx,mjs,cjs}'
```
**File hint:** Client-rendered components.

### TypeScript-specific — `process.env` typed as `string` not `string | undefined`

**What to look for:** `declare global { namespace NodeJS { interface ProcessEnv { SECRET: string } } }` — encourages using `process.env.SECRET` without a null check, but that's a code-quality issue. The bigger smell: hardcoded fallbacks `process.env.JWT_SECRET ?? 'dev-secret'` in production code paths.
**Concrete grep / ripgrep query:**
```
rg -nP 'process\.env\.[A-Z0-9_]*(SECRET|KEY|PASSWORD|TOKEN)\s*\?\?\s*[\x27"][^\x27"]+[\x27"]' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'process\.env\.[A-Z0-9_]*(SECRET|KEY|PASSWORD|TOKEN)\s*\|\|\s*[\x27"][^\x27"]+[\x27"]' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Auth/crypto modules.
**False-positive guard:** `process.env.PORT ?? 3000` is fine; `JWT_SECRET ?? 'changeme'` is not.

### Docker/Compose env files committed with secrets

**What to look for:** `Dockerfile` `ENV X=secret`, `docker-compose.yml` `environment:` blocks with literal secrets.
**Concrete grep / ripgrep query:**
```
rg -nPi 'ENV\s+[A-Z_]+(SECRET|TOKEN|PASSWORD|API_KEY)\s*=\s*\S+' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nPi '^\s*[A-Z_]*(SECRET|TOKEN|PASSWORD|API_KEY)\s*:\s*[\x27"]?(?!\$)[A-Za-z0-9+/=_\-]{8,}' -g 'docker-compose*.yml'
```
**File hint:** Repo root, `infra/`, `docker/`.
