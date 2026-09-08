# stride-modeler — Node.js / TypeScript catalog

> Inlined into the stride-modeler system prompt when the audited repo's primary language is `nodejs` or `typescript`. Every entry below is a concrete pattern to look for in JS/TS code or its config — not generic advice.

## File globs to scan

- Entry points: `**/index.{js,ts}`, `**/server.{js,ts}`, `**/app.{js,ts}`, `**/main.{js,ts}`
- Framework-specific: `**/middleware.{js,ts}` (Next.js / SvelteKit), `**/hooks.server.{js,ts}` (SvelteKit), `**/middleware/*.{js,ts}` (Express/Koa/Fastify), `**/*.module.ts` (NestJS), `**/*.guard.ts`, `**/*.interceptor.ts`, `**/*.pipe.ts`, `**/*.filter.ts`
- Routes: `**/routes/**`, `**/controllers/**`, `**/api/**`, `**/app/**/route.{js,ts}`, `**/pages/api/**/*.{js,ts}`, `**/+server.{js,ts}` (SvelteKit)
- Workers: `**/workers/**`, `**/queue/**`, `**/jobs/**`, `**/processors/**`, `**/consumers/**`
- Realtime: any file referencing `socket.io`, `ws`, `uWebSockets.js`, `pusher`, `ably`, `partykit`, `pusher-js`, `centrifuge-js`
- Deployment / runtime: `**/Dockerfile`, `**/docker-compose*.yml`, `**/serverless.yml`, `**/sst.config.{js,ts}`, `**/wrangler.toml`, `**/vercel.json`, `**/netlify.toml`, `**/fly.toml`, `**/.do/app.yaml`, `**/render.yaml`, `**/cdk/**`, `**/terraform/**`, `**/pulumi/**`

## Native tooling (when run command is appropriate)

- `npx madge --circular .` — surfaces circular deps that often indicate boundary bleed
- `npx depcruise --include-only ^src --output-type dot src | dot -T svg > deps.svg` — visualise import graph
- `npx eslint-plugin-boundaries` (if configured) — boundary-violation lint
- `npx ts-prune` — find unused exports (often dead-code legacy auth paths)

## Common Node deployment shapes (informs trust boundaries)

- **Express / Fastify / Koa / Hono on EC2 / ECS / Cloud Run** — single Node process, all middleware in-process. Trust boundary = network ingress (load balancer → container).
- **NestJS** — DI-container with explicit `Guard` / `Interceptor` / `Pipe` / `ExceptionFilter` chain; trust boundaries are the controller method's decorator stack.
- **Next.js on Vercel** — split runtime: Edge Middleware (V8 isolates), Edge Functions, and Node Lambda functions per route. `middleware.ts` runs on Edge by default; API routes run on Node unless `runtime = 'edge'` exported.
- **SvelteKit on adapter-node / adapter-cloudflare / adapter-vercel** — `hooks.server.ts` is the global trust gate; `+server.ts` files are per-route handlers.
- **Nuxt 3 on Cloudflare Workers / Vercel / Node** — Nitro server, `server/middleware/*` runs on every request, `server/api/*` are routes.
- **Lambda via AWS SAM / Serverless Framework / SST** — one handler per function; cold-start, no shared in-memory state.
- **Cloudflare Workers / Deno Deploy** — V8 isolates, no Node native modules, fetch-only HTTP.
- **BullMQ / Bee-Queue / agenda / pg-boss workers** — separate process; trust boundary = job payload from Redis/Postgres.
- **WebSocket / Socket.IO** — long-lived connection; auth-once-then-trust is a common bug.

## Risk patterns

### Spoofing — JWT verification skipped on a route

**What to look for:** Express/Fastify/NestJS routes that don't traverse the auth middleware/guard. Common cause: route registered before `app.use(authMiddleware)`, or NestJS controller missing `@UseGuards(AuthGuard)`.
**Concrete grep / ripgrep query:**
```
rg -nP '^\s*app\.(get|post|put|delete|patch)\s*\(' -g '*.{js,ts,mjs,cjs}'
rg -nP '@UseGuards\s*\(' -g '*.ts'
rg -nP '@Controller\s*\(' -g '*.ts' -B 2 -A 4
rg -nP 'preHandler\s*:\s*\[?(\w+)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express index/app file, NestJS controllers, Fastify route registrations.
**Trust boundary:** Network → process.

### Spoofing — Next.js middleware bypass via matcher misconfig

**What to look for:** `middleware.ts` `matcher` config that excludes API routes the middleware was supposed to protect, or no `matcher` (then middleware runs on `/_next/*` static-asset chains too — perf risk + sometimes security risk).
**Concrete grep / ripgrep query:**
```
rg -nP 'export\s+const\s+config\s*=\s*\{[^}]*matcher' -g 'middleware.{js,ts}' -A 5
rg -nP "matcher\s*:\s*[\x27\"]" -g 'middleware.{js,ts}'
rg -nP "matcher\s*:\s*\[" -g 'middleware.{js,ts}' -A 10
```
**File hint:** `middleware.ts` at the project root or `src/`.
**Trust boundary:** Edge → app routes.

### Spoofing — `X-Forwarded-For` trusted without `app.set('trust proxy', ...)`

**What to look for:** `req.ip` / `req.ips` used for rate limiting / audit without configuring `trust proxy` correctly. Either `false` (default) gives socket IP only, OR `true` blindly trusts all `X-Forwarded-For` (attacker can spoof). Correct pattern: `app.set('trust proxy', N)` matching the number of upstream proxies.
**Concrete grep / ripgrep query:**
```
rg -nP "trust\s+proxy" -g '*.{js,ts,mjs,cjs}'
rg -nP 'req\.ip(s)?\b' -g '*.{js,ts,mjs,cjs}'
rg -nP "X-Forwarded-For|x-forwarded-for" -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express setup, rate-limiting middleware.
**Trust boundary:** LB / CDN → process.

### Tampering — Mongoose `strict: false`

**What to look for:** Mongoose schemas with `{ strict: false }` or sub-schemas with `strict: false` — accepts arbitrary extra fields, defeating mass-assignment protection.
**Concrete grep / ripgrep query:**
```
rg -nP "strict\s*:\s*false" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'new\s+(mongoose\.)?Schema\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}' -A 12
```
**File hint:** Model definitions.
**Trust boundary:** API → DB.

### Tampering — TypeORM `synchronize: true` in production

**What to look for:** `TypeOrmModule.forRoot({ synchronize: true })` — auto-migrates schema on startup, attacker-influenced model can drop tables.
**Concrete grep / ripgrep query:**
```
rg -nP "synchronize\s*:\s*true" -g '*.{js,ts,mjs,cjs}'
```
**File hint:** TypeORM/MikroORM config.
**Trust boundary:** Code → DB.

### Tampering — webhook signatures not verified

**What to look for:** Stripe (`stripe.webhooks.constructEvent`), GitHub (`X-Hub-Signature-256`), Slack (`X-Slack-Signature`), Twilio (`X-Twilio-Signature`), Shopify HMAC — handlers reading the body without verifying.
**Concrete grep / ripgrep query:**
```
rg -nP 'stripe\.webhooks\.constructEvent' -g '*.{js,ts,mjs,cjs}'
rg -nPi '(x-hub-signature|x-github-event|x-slack-signature|x-twilio-signature|x-shopify-hmac)' -g '*.{js,ts,mjs,cjs}'
rg -nP "createHmac\s*\(\s*['\"]sha256['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP '(/webhooks?|/webhook|/hooks)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Webhook receiver routes.
**Trust boundary:** Internet → process.

### Repudiation — no audit log middleware

**What to look for:** Apps with no request-logging middleware (`morgan`, `pino-http`, `@nestjs/common` `LoggerService`, `fastify` default logger), or logs that don't include actor identity (`userId`/`subject` claim).
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](morgan|pino-http|express-pino-logger|express-winston)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'app\.use\s*\(\s*morgan' -g '*.{js,ts,mjs,cjs}'
rg -nP 'logger\.(info|warn|error)\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Entry point.
**Trust boundary:** Process → log sink.

### Information disclosure — `x-powered-by` header

**What to look for:** Express ships with `X-Powered-By: Express` enabled by default; missing `app.disable('x-powered-by')` advertises framework + version to scanners.
**Concrete grep / ripgrep query:**
```
rg -nP "app\.disable\s*\(\s*['\"]x-powered-by['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'helmet\s*\(' -g '*.{js,ts,mjs,cjs}'
```
**False-positive guard:** `helmet()` removes `X-Powered-By` automatically.

### Information disclosure — error stacks in production

**What to look for:** Default Express error handler in production (returns full stack), `res.status(500).json({ error: err.stack })`, NestJS without a custom `ExceptionFilter`.
**Concrete grep / ripgrep query:**
```
rg -nP 'res\.\w+\s*\(\s*\{[^}]*stack' -g '*.{js,ts,mjs,cjs}'
rg -nP 'err\.stack|error\.stack' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'process\.env\.NODE_ENV' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Error handler middleware, custom exception filters.

### Information disclosure — Next.js `notFound()` vs `unauthorized()` ambiguity

**What to look for:** Returning `notFound()` from a server component when access is denied (intentional) vs leaking 401 vs 404 difference (timing channel for resource enumeration).
**Concrete grep / ripgrep query:**
```
rg -nP 'notFound\s*\(\s*\)|redirect\s*\(' -g 'app/**/*.{js,jsx,ts,tsx}'
```
**Trust boundary:** Server component → response.

### Denial of service — no `express-rate-limit`

**What to look for:** Public endpoints (login, signup, password reset, search, upload, expensive read) without per-IP/per-user rate limiting.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](express-rate-limit|rate-limiter-flexible|@fastify/rate-limit|@nestjs/throttler|express-slow-down|express-brute|hono-rate-limiter)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\b(/login|/signup|/signin|/register|/password-reset|/forgot|/2fa|/otp|/upload|/search)\b' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Auth routes, file uploads.

### Denial of service — body size limits missing or huge

**What to look for:** `express.json()` / `bodyParser.json({ limit: '50mb' })` — large limits with no upstream cap → memory DoS. `multer` without `limits.fileSize`.
**Concrete grep / ripgrep query:**
```
rg -nP 'express\.(json|urlencoded|raw|text)\s*\(\s*\{[^}]*limit\s*:\s*[\x27"][\d]+(mb|gb|MB|GB)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'multer\s*\(\s*\{' -g '*.{js,ts,mjs,cjs}' -A 10
rg -nP 'busboy|formidable|multiparty' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Body parser config, file upload routes.

### Denial of service — Slowloris / no `server.timeout`

**What to look for:** `http.createServer` / Express server without `server.headersTimeout`, `server.requestTimeout`, `server.keepAliveTimeout` set — Slowloris-class attacks tie up sockets indefinitely.
**Concrete grep / ripgrep query:**
```
rg -nP 'server\.(headersTimeout|requestTimeout|keepAliveTimeout|timeout)\s*=' -g '*.{js,ts,mjs,cjs}'
rg -nP 'http\.createServer|app\.listen' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Server bootstrap.

### Denial of service — unbounded WebSocket / Socket.IO connections

**What to look for:** `socket.io` server without `connectionStateRecovery` budget, `ws` without `maxPayload`, no per-IP connection cap, no auth handshake validation.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](socket\.io|ws|uWebSockets\.js|@nestjs/websockets|partysocket|pusher|ably)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'new\s+Server\s*\(' -g '*.{js,ts,mjs,cjs}' -A 10
rg -nP 'maxPayload|maxHttpBufferSize|connectionStateRecovery|pingTimeout|pingInterval' -g '*.{js,ts,mjs,cjs}'
rg -nP "io\.use\s*\(" -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Socket.IO setup, `io.on('connection', ...)`.
**Trust boundary:** Browser → WS.

### Elevation of privilege — RBAC checks in client-only code

**What to look for:** React/Vue/Svelte components hiding admin UI with `if (user.role === 'admin')` — but the API doesn't enforce the same check. Any user can craft the API request directly.
**Concrete grep / ripgrep query:**
```
rg -nP "(role|permission|isAdmin|admin)\s*===?\s*[\x27\"]admin[\x27\"]" -g '*.{js,jsx,ts,tsx,vue,svelte}'
rg -nP "user\.\s*(role|isAdmin|permissions)" -g '*.{js,jsx,ts,tsx,vue,svelte}'
```
**File hint:** Front-end components and corresponding API handlers — pair them.
**Trust boundary:** Browser ↔ API.

### Elevation of privilege — IDOR (missing tenant/owner check on API)

**What to look for:** `GET /api/users/:id` / `GET /api/orders/:id` handlers that load by ID without checking the requester owns the row.
**Concrete grep / ripgrep query:**
```
rg -nP 'findById\s*\(\s*req\.(params|query|body)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'findOne\s*\(\s*\{\s*\w+\s*:\s*req\.(params|query)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'findUnique\s*\(\s*\{\s*where\s*:\s*\{\s*id\s*:\s*req\.' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** REST controllers.
**False-positive guard:** Safe if followed by `if (record.userId !== req.user.id) throw ForbiddenError`.

### Elevation of privilege — NestJS `@Roles()` without a `RolesGuard`

**What to look for:** `@Roles('admin')` decorator used but the `RolesGuard` is not registered globally and not on the controller — silent no-op.
**Concrete grep / ripgrep query:**
```
rg -nP '@Roles\s*\(' -g '*.ts'
rg -nP 'RolesGuard|APP_GUARD' -g '*.ts'
```
**File hint:** Controllers, app.module.ts.

### Trust boundary — Server Action callable by anyone

**What to look for:** Next.js Server Actions are POST endpoints; any unauthenticated user can call them. They MUST run their own auth check.
**Concrete grep / ripgrep query:**
```
rg -nP "['\"]use server['\"]" -g '*.{js,jsx,ts,tsx}' -A 30
```
For each, check if the function calls `auth()` / `getServerSession()` / similar.
**File hint:** `app/**/actions.ts`, components with inline `'use server'`.
**Trust boundary:** Browser → server function.

### Trust boundary — Edge runtime missing Node-only features

**What to look for:** `runtime = 'edge'` files using `crypto` (Node), `fs`, `child_process`, `Buffer` polyfills — silently fall back or crash. Also: edge auth using a different code path than the Node runtime, leading to inconsistent enforcement.
**Concrete grep / ripgrep query:**
```
rg -nP "export\s+const\s+runtime\s*=\s*[\x27\"]edge[\x27\"]" -g '*.{js,jsx,ts,tsx}'
rg -nP "from\s+['\"](crypto|fs|child_process|net|tls|stream|os|path)['\"]" -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP "process\.env\.NEXT_RUNTIME" -g '*.{js,jsx,ts,tsx,mjs,cjs}'
```
**File hint:** Next.js route handlers, middleware.
**Trust boundary:** Edge isolate vs Node Lambda.

### Trust boundary — BullMQ / queue worker accepts arbitrary job payloads

**What to look for:** Job processors that take `job.data` and feed it to `exec`, `eval`, or DB queries without re-validation. Anyone with Redis access (or any internal service) can enqueue jobs.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](bullmq|bee-queue|bull|pg-boss|agenda|@nestjs/bullmq|kue|graphile-worker)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'new\s+Worker\s*\(' -g '*.{js,ts,mjs,cjs}' -A 8
rg -nP 'Queue\.process\s*\(|queue\.process\s*\(' -g '*.{js,ts,mjs,cjs}' -A 8
rg -nP 'job\.data' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** `workers/`, `queue/`, `jobs/`.
**Trust boundary:** Producer → Redis → consumer (often crosses service boundaries).

### Trust boundary — tRPC procedure missing `.use(authMiddleware)`

**What to look for:** `t.procedure.query(...)` / `.mutation(...)` instead of `protectedProcedure.mutation(...)` — tRPC has no automatic auth.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"]@trpc/server['\"]" -g '*.{ts,tsx}'
rg -nP '\bt\.procedure\b' -g '*.{ts,tsx}'
rg -nP 'protectedProcedure|publicProcedure|adminProcedure' -g '*.{ts,tsx}'
```
**File hint:** tRPC router files.
**Trust boundary:** Browser → tRPC.

### Trust boundary — GraphQL resolver missing auth

**What to look for:** Apollo / `graphql-yoga` / `mercurius` / `pothos` resolvers that don't check `context.user`. Field-level auth is easy to forget on nested resolvers.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](@apollo/server|graphql-yoga|mercurius|@nestjs/graphql|@pothos/core|nexus|type-graphql)['\"]" -g '*.{ts,tsx,js,mjs,cjs}'
rg -nP 'context\.\s*(user|userId|session|auth)' -g '*.{ts,tsx,js,mjs,cjs}'
rg -nP 'resolve\s*:\s*\(' -g '*.{ts,tsx,js,mjs,cjs}'
```
**File hint:** GraphQL schema/resolver files.

### Trust boundary — `socket.io` `connection` handler trusts socket.handshake.auth blindly

**What to look for:** `io.on('connection', (socket) => { socket.userId = socket.handshake.auth.userId })` — attacker just sends the userId they want.
**Concrete grep / ripgrep query:**
```
rg -nP 'socket\.handshake\.(auth|query|headers)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'io\.use\s*\(' -g '*.{js,ts,mjs,cjs}' -A 10
```
**File hint:** Socket.IO server setup.

### Edge — Vercel Edge Functions with Node-style `crypto` import

**What to look for:** Edge runtime uses Web Crypto (`crypto.subtle`); `import crypto from 'crypto'` returns a polyfill or fails depending on framework.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"]crypto['\"]" -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP "import\s+\{[^}]*\}\s+from\s+['\"]node:crypto['\"]" -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP 'crypto\.(subtle|getRandomValues)' -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP "export\s+const\s+runtime\s*=\s*[\x27\"](edge|nodejs)[\x27\"]" -g '*.{js,jsx,ts,tsx}'
```
**Trust boundary:** Edge runtime vs Node runtime.

### Edge — Cloudflare Worker missing `nodejs_compat` flag yet using Node APIs

**What to look for:** `wrangler.toml` without `compatibility_flags = ["nodejs_compat"]` while source uses `Buffer`, `process`, `crypto` (Node).
**Concrete grep / ripgrep query:**
```
rg -nP 'compatibility_flags' -g 'wrangler.toml' -g 'wrangler.jsonc'
rg -nP "from\s+['\"](buffer|stream|util|events|crypto|fs|path)['\"]" -g '*.{js,ts,mjs,cjs}'
```

### Auth-once-then-trust on long-lived connections

**What to look for:** WebSocket / SSE / gRPC streaming connections that authenticate at handshake but don't re-validate session expiry on each message — JWT can expire mid-stream.
**Concrete grep / ripgrep query:**
```
rg -nP "io\.on\s*\(\s*['\"]connection['\"]" -g '*.{js,ts,mjs,cjs}' -A 30
rg -nP 'res\.write\s*\(\s*[\x27"]data:' -g '*.{js,ts,mjs,cjs}'
```

### Forwarded headers — `Host` header injection / cache poisoning

**What to look for:** Code building absolute URLs from `req.headers.host` (e.g., for password-reset links). Attacker spoofs `Host` and victim clicks attacker URL.
**Concrete grep / ripgrep query:**
```
rg -nP 'req\.headers\.host|req\.host\b' -g '*.{js,ts,mjs,cjs}'
rg -nP '\$\{\s*req\.\w+\.host\s*\}' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Email senders, OAuth callback URL builders.

### Race condition — shared mutable module-level state

**What to look for:** Module-level `let cache = {}` / `let counter = 0` mutated from request handlers — across concurrent requests, race conditions on auth checks/limits.
**Concrete grep / ripgrep query:**
```
rg -nP '^(let|var)\s+\w+\s*=\s*(\{|new\s+Map|new\s+Set)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** "Cache" modules, in-memory rate limiters.
**False-positive guard:** Cluster/multi-process deployments make module state per-worker; flag for review.

### Logging PII / GDPR — full request body / user object dumps

**What to look for:** `pino`/`winston` configured without `redact` that logs `req.body`, full `User` model, JWT contents.
**Concrete grep / ripgrep query:**
```
rg -nP "redact\s*:" -g '*.{js,ts,mjs,cjs}'
rg -nP "from\s+['\"](pino|winston|bunyan|@opentelemetry/api-logs)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'logger\.\w+\s*\([^)]*\b(user|req|request|body|headers|ctx)\b' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```

### Container — running as root

**What to look for:** Dockerfile lacking `USER node` (or `USER nonroot`) — Node official images include a `node` user; many teams ignore it.
**Concrete grep / ripgrep query:**
```
rg -nP '^USER\s+' -g 'Dockerfile' -g 'Dockerfile.*'
rg -nP '^FROM\s+node:' -g 'Dockerfile' -g 'Dockerfile.*'
```
**Trust boundary:** Container → host.

### Lambda — handler with elevated IAM role

**What to look for:** Serverless Framework / SST / SAM IAM policies granting `Action: '*'` or `Resource: '*'`.
**Concrete grep / ripgrep query:**
```
rg -nPi "['\"]Effect['\"]\s*:\s*['\"]Allow['\"][^}]*['\"]Action['\"]\s*:\s*['\"]\\*['\"]" -g 'serverless.yml' -g 'sst.config.{js,ts}' -g 'template.yml' -g 'template.yaml'
rg -nPi "['\"]Resource['\"]\s*:\s*['\"]\\*['\"]" -g '*.yml' -g '*.yaml' -g 'sst.config.{js,ts}'
```

### TypeScript-specific — `tsconfig.json` `paths` exposing internal modules

**What to look for:** `paths` mapping that allows API routes to import server-only utilities into client bundles (Next.js `import 'server-only'` exists for this; absence is a smell).
**Concrete grep / ripgrep query:**
```
rg -nP '"paths"\s*:' -g 'tsconfig*.json' -A 20
rg -nP "from\s+['\"]server-only['\"]|from\s+['\"]client-only['\"]" -g '*.{ts,tsx}'
```
**File hint:** Next.js `app/` files.

### TypeScript-specific — NestJS `Guard`/`Interceptor`/`Pipe` chain order

**What to look for:** Global guards registered after route registration via `app.useGlobalGuards(...)` — NestJS evaluates pipes BEFORE guards, so input transforms run unauthenticated. Also: `@UseInterceptors` placed on a controller without a corresponding guard.
**Concrete grep / ripgrep query:**
```
rg -nP 'useGlobalGuards|useGlobalInterceptors|useGlobalPipes|useGlobalFilters' -g '*.{ts,js}'
rg -nP '@UseGuards|@UseInterceptors|@UsePipes|@UseFilters' -g '*.ts'
```
**File hint:** `main.ts`, controllers.

### TypeScript-specific — `Express.Request` declaration merging that adds `user` without verification

**What to look for:** `declare global { namespace Express { interface Request { user?: User } } }` — code reads `req.user.id` confidently, but if the auth middleware never set it (because middleware order broke), TypeScript still compiles.
**Concrete grep / ripgrep query:**
```
rg -nP 'declare\s+(global\s*\{\s*)?namespace\s+Express' -g '*.{ts,d.ts}'
rg -nP 'interface\s+Request\s*\{' -g '*.{ts,d.ts}'
rg -nP 'req\.user\.\w+' -g '*.{ts,tsx}'
```
**File hint:** `types/express.d.ts`, controllers.

### TypeScript-specific — `Hono` middleware via `c.set('user', ...)` without typing leak

**What to look for:** Hono `c.set('user', user)` in middleware, then `c.get('user')` in handlers — no compile-time guarantee the middleware ran. Use `MiddlewareHandler<{ Variables: { user: User } }>` to type-link.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"]hono['\"]" -g '*.{ts,tsx,js,mjs,cjs}'
rg -nP "c\.(set|get)\s*\(\s*[\x27\"](user|userId|session)" -g '*.{ts,tsx,js,mjs,cjs}'
```
