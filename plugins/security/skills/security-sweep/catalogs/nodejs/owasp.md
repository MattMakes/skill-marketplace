# owasp-auditor — Node.js / TypeScript catalog

> Inlined into the owasp-auditor system prompt when the audited repo's primary language is `nodejs` or `typescript`. Every entry below is a concrete pattern to look for in JS/TS code or its config — not generic advice.

## File globs to scan

- `**/*.{js,jsx,ts,tsx,mjs,cjs}`
- `**/*.{vue,svelte,astro}`
- `**/package.json`, `**/tsconfig*.json`
- `**/next.config.{js,ts,mjs}`, `**/nuxt.config.{js,ts}`, `**/svelte.config.{js,ts}`, `**/vite.config.{js,ts}`, `**/remix.config.js`, `**/astro.config.{js,ts,mjs}`
- `**/middleware.{js,ts}` (Next.js / SvelteKit)
- `**/app/**/route.{js,ts}`, `**/pages/api/**/*.{js,ts}` (Next.js API routes)
- `**/server/**/*.{js,ts}`, `**/api/**/*.{js,ts}`, `**/routes/**/*.{js,ts}`, `**/controllers/**/*.{js,ts}`
- Exclude when noisy: `**/node_modules/**`, `**/dist/**`, `**/build/**`, `**/.next/**`, `**/.nuxt/**`, `**/.svelte-kit/**`, `**/coverage/**`

## Native tooling (when run command is appropriate)

- `npx eslint --no-eslintrc --config <inline> --ext .js,.jsx,.ts,.tsx . --plugin security` — detects many of these patterns mechanically
- `npx eslint-plugin-security` (rules: `detect-non-literal-fs-filename`, `detect-eval-with-expression`, `detect-child-process`, `detect-object-injection`)
- `npx eslint-plugin-no-unsanitized` for `innerHTML`/`dangerouslySetInnerHTML` sinks
- `npx semgrep --config p/javascript --config p/typescript --config p/owasp-top-ten`
- `npx audit-ci --moderate` for known CVEs (more useful in supply-chain catalog)
- TS sanity: `npx tsc --noEmit` — broken builds often hide unsafe `any` casts that swallow type errors

## Risk patterns

### SQL injection — string concat / template literals into the driver

**What to look for:** Raw `mysql`/`mysql2`/`pg`/`sqlite3`/`mariadb` `.query()` / `.execute()` calls where the SQL is built with `+` or backtick template literals containing user input instead of using `?`/`$1` placeholders + a values array.
**Why it's risky in Node:** Both `mysql2.query` and `pg.query` accept a string-only first argument and will execute whatever you pass; only the second-argument values array gets parameterised. Backticks look "safe" but interpolate at runtime.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(query|execute)\s*\(\s*`[^`]*\$\{' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\.(query|execute)\s*\(\s*[\x27"][^\x27"]*[\x27"]\s*\+\s*\w+' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\.(query|execute)\s*\(\s*\w+\s*\+\s*[\x27"`]' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** `**/db/**`, `**/repositories/**`, `**/dao/**`, `**/models/**`, anything importing `mysql2`, `pg`, `mariadb`, `sqlite3`, `better-sqlite3`, `tedious`, `mssql`, `oracledb`.
**False-positive guard:** Safe when arguments use placeholders + values array: `pool.query('SELECT * FROM u WHERE id=$1', [id])` or `conn.execute('SELECT ? FROM x', [val])`. Migrations / seed scripts with hard-coded literals are usually safe.

### SQL injection — Prisma `$queryRawUnsafe` / `$executeRawUnsafe`

**What to look for:** Any call to `prisma.$queryRawUnsafe(...)` or `prisma.$executeRawUnsafe(...)`. The "Unsafe" suffix exists because the input is interpolated verbatim.
**Why it's risky in Node:** Tagged-template `prisma.$queryRaw\`...\`` is parameterised; the `Unsafe` variants are not.
**Concrete grep / ripgrep query:**
```
rg -nP '\$(query|execute)RawUnsafe\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Prisma client call sites — search for `import.*PrismaClient` to find them.
**False-positive guard:** `$queryRaw` / `$executeRaw` (no `Unsafe`) used as tagged templates are safe.

### SQL injection — Sequelize raw query with string interpolation

**What to look for:** `sequelize.query(\`SELECT ... ${x}\`)` or string-concat without a `replacements` / `bind` object.
**Concrete grep / ripgrep query:**
```
rg -nP 'sequelize\.query\s*\(\s*`[^`]*\$\{' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'sequelize\.query\s*\(\s*[\x27"][^\x27"]*[\x27"]\s*\+' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'sequelize\.query\s*\([^,)]+\)\s*;' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Files importing `sequelize`.
**False-positive guard:** Safe when second argument provides `{ replacements: { x } }` (escapes) or `{ bind: [x] }` (parameterised), and the SQL uses `:x` / `$1` placeholders accordingly.

### SQL injection — Knex `.raw()` / `.whereRaw()` concatenation

**What to look for:** `knex.raw('... ' + x)` or `qb.whereRaw(\`col=${x}\`)` without bindings.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(raw|whereRaw|orderByRaw|havingRaw)\s*\(\s*`[^`]*\$\{' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\.(raw|whereRaw|orderByRaw|havingRaw)\s*\(\s*[\x27"][^\x27"]*[\x27"]\s*\+' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Files importing `knex` or `objection`.
**False-positive guard:** `knex.raw('id = ?', [id])` or `whereRaw('id = :id', { id })` are safe.

### NoSQL injection — Mongoose / Mongo with raw `req.body` / `req.query`

**What to look for:** `Model.find(req.body)`, `Model.findOne(req.query)`, `db.collection('x').find(req.body)`, or `$where: req.query.filter` — attacker can inject `{$ne: null}`, `{$gt: ''}`, or arbitrary JS.
**Why it's risky in Node:** Express parses JSON bodies into objects; passing them straight into a query lets the attacker swap a string filter for an operator object.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(find|findOne|findOneAndUpdate|findOneAndDelete|updateOne|updateMany|deleteOne|deleteMany|count|countDocuments|aggregate)\s*\(\s*req\.(body|query|params)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\$where\s*:\s*req\.' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\.(find|findOne)\s*\(\s*\{\s*\w+\s*:\s*req\.(body|query|params)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Express/Fastify/NestJS controllers using `mongoose`/`mongodb`.
**False-positive guard:** Safe if request data is first validated/coerced via Zod/Joi/`express-mongo-sanitize` (which strips `$`/`.` keys) and only typed primitives flow into the query.

### Command injection — `child_process.exec` / `execSync` with user input

**What to look for:** `exec`, `execSync`, `spawn(... { shell: true })`, `execFile(... { shell: true })` where the command string is concatenated or interpolated.
**Why it's risky in Node:** `exec*` runs through `/bin/sh -c`, so `;`, `&&`, backticks, `$()` are all live. `execFile` (no `shell`) is the safe sibling.
**Concrete grep / ripgrep query:**
```
rg -nP '\b(exec|execSync)\s*\(\s*[`\x27"][^`\x27"]*\$\{|\b(exec|execSync)\s*\(\s*[`\x27"][^`\x27"]*[\x27"]\s*\+' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\b(spawn|spawnSync|execFile|execFileSync)\s*\([^)]*shell\s*:\s*true' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\(['\"]child_process['\"]\)|from\s+['\"]child_process['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** build/deploy scripts, image processors, anything wrapping a CLI (ffmpeg, imagemagick, git, kubectl).
**False-positive guard:** `execFile('/usr/bin/foo', [arg1, arg2])` (array args, no `shell`) is safe. Constants only are safe. Anything in `scripts/` that runs at build time, not request time, is lower risk.

### Code injection — `eval`, `Function`, `vm.runInNewContext`

**What to look for:** Any direct `eval(...)`, `new Function(...)`, `vm.runInThisContext`, `vm.runInNewContext`, `vm.compileFunction` driven by request input.
**Why it's risky in Node:** Full RCE in the same process; `vm` is NOT a sandbox (Node docs explicitly warn this).
**Concrete grep / ripgrep query:**
```
rg -nP '\beval\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'new\s+Function\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\(['\"]vm['\"]\)|from\s+['\"]vm['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'vm\.(runInNewContext|runInThisContext|runInContext|compileFunction)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Templating engines, expression evaluators, plugin loaders, anything claiming to "sandbox" user code.
**False-positive guard:** `eval` inside dev-only REPL scripts, `Function` used for property accessors with constant input, or `vm` used purely for isolated config evaluation with no user input.

### SSRF — server-side fetch with user-controlled URL

**What to look for:** `fetch(userUrl)`, `axios.get(userUrl)`, `axios(userUrl)`, `got(userUrl)`, `node-fetch`, `request(userUrl)`, `undici.fetch`, `superagent.get(userUrl)` where the URL is sourced from `req.body`/`req.query`/`req.params`/DB.
**Why it's risky in Node:** No automatic SSRF protection; the runtime resolves all hostnames including cloud metadata endpoints (`169.254.169.254`, `fd00:ec2::254`), `localhost`, link-local, and private RFC1918 ranges.
**Concrete grep / ripgrep query:**
```
rg -nP '\bfetch\s*\(\s*(req\.|request\.|ctx\.request\.|input\.|params\.|body\.|query\.)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\b(axios|got|superagent|undici)\s*(\.\w+)?\s*\(\s*(req\.|request\.|ctx\.|input\.|params\.|body\.|query\.)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\(['\"](node-fetch|axios|got|superagent|undici|request)['\"]\)|from\s+['\"](node-fetch|axios|got|superagent|undici|request)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\bnew\s+URL\s*\(\s*(req\.|request\.|input\.|body\.|query\.)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Webhook handlers, image proxies, OEmbed/url-preview services, HTML PDF renderers, OAuth callbacks (especially `redirect_uri` that the server fetches).
**False-positive guard:** Safe when URL is validated against an allow-list of hosts AND resolved IP is checked against private ranges (`ssrf-req-filter`, `request-filtering-agent`, or a custom `dns.lookup` + `ip` check). `axios.create({ baseURL })` with relative paths is safe.

### XSS — React `dangerouslySetInnerHTML`

**What to look for:** `dangerouslySetInnerHTML={{__html: x}}` where `x` comes from user input, an API, or a database row that originated from user input.
**Why it's risky in Node:** React's whole point is to escape; this prop opts out and injects raw HTML directly.
**Concrete grep / ripgrep query:**
```
rg -nP 'dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:' -g '*.{js,jsx,ts,tsx}'
```
**File hint:** Anything rendering markdown, CMS content, rich text, or "raw" body fields.
**False-positive guard:** Safe if the value passed through `DOMPurify.sanitize(x)` first; safer still to render with a markdown library that returns a React tree (e.g. `react-markdown` without `rehype-raw`).

### XSS — Vue `v-html`, Svelte `{@html}`, Angular `[innerHTML]`, Solid `innerHTML`

**What to look for:** Direct binding of user-controlled values to HTML-injection sinks across SPA frameworks.
**Concrete grep / ripgrep query:**
```
rg -nP 'v-html\s*=\s*"' -g '*.{vue,html}'
rg -nP '\{@html\s+' -g '*.{svelte,svx}'
rg -nP '\[innerHTML\]\s*=' -g '*.{ts,html}'
rg -nP '\binnerHTML\s*=' -g '*.{js,jsx,ts,tsx,mjs,cjs}'
rg -nP 'document\.write\s*\(' -g '*.{js,jsx,ts,tsx,mjs,cjs}'
```
**File hint:** Vue SFCs, Svelte components, Angular templates, anything pre-rendering HTML.
**False-positive guard:** Sanitised via DOMPurify (Vue/Svelte) or `DomSanitizer.bypassSecurityTrustHtml` only after sanitisation in Angular.

### XSS — Express returns user input without escaping

**What to look for:** `res.send(req.query.x)`, `res.write(req.body.html)`, or template engines emitting raw output (Handlebars `{{{...}}}`, EJS `<%- ... %>`, Pug `!= var`).
**Concrete grep / ripgrep query:**
```
rg -nP 'res\.(send|write|end)\s*\(\s*req\.(body|query|params)' -g '*.{js,ts,mjs,cjs}'
rg -nP '\{\{\{\s*\w+\s*\}\}\}' -g '*.{hbs,handlebars,html}'
rg -nP '<%-\s*\w+\s*%>' -g '*.{ejs,html}'
rg -nP '^\s*!=\s+\w+' -g '*.pug'
```
**File hint:** Express/Koa/Fastify route handlers, server-rendered templates.
**False-positive guard:** Safe if a sanitiser is applied or the response Content-Type is `application/json`.

### Path traversal — `fs.*` / `res.sendFile` with user input

**What to look for:** `fs.readFile(req.params.x)`, `path.join(__dirname, req.query.f)`, `res.sendFile(req.params.path)`, `createReadStream(userPath)` without `path.resolve` + boundary check.
**Why it's risky in Node:** `path.join` does NOT block `..`; `path.resolve(base, '/etc/passwd')` returns `/etc/passwd` because absolute later args replace the base. Express `res.sendFile` requires the second `root` option to enforce a jail.
**Concrete grep / ripgrep query:**
```
rg -nP 'fs\.(readFile|readFileSync|createReadStream|writeFile|writeFileSync|unlink|unlinkSync|stat|statSync|open|openSync|access|accessSync)\s*\(\s*(req\.|input\.|params\.|body\.|query\.|userPath|filename)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'res\.sendFile\s*\(\s*(req\.|params\.|body\.|query\.)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'path\.join\s*\([^)]*req\.(body|query|params)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'path\.resolve\s*\([^)]*req\.(body|query|params)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Static file servers, download endpoints, file viewers, plugin loaders.
**False-positive guard:** Safe if followed by `path.resolve(p).startsWith(allowedRoot + path.sep)` AND/OR `res.sendFile(name, { root: ALLOWED_DIR })` is used.

### Prototype pollution — `Object.assign`/`lodash.merge`/`_.set`/`Object.assign({}, req.body)`

**What to look for:** Recursive merge of user-controlled JSON into a target without an `Object.create(null)` base or `__proto__`/`constructor`/`prototype` filtering. Notable: `lodash.merge`, `lodash.mergeWith`, `lodash.defaultsDeep`, `lodash.set`, `_.zipObjectDeep`, `merge-deep`, `deepmerge`, `dot-prop`, `set-value`.
**Why it's risky in Node:** `JSON.parse('{"__proto__":{"isAdmin":true}}')` is parsed safely BUT recursive merging walks into `__proto__` and sets values on `Object.prototype`, polluting every object.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](lodash(\.merge|\.set|\.defaultsdeep|\.mergewith)?|merge-deep|deepmerge|dot-prop|set-value|deeply-assign)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\(['\"](lodash(\.merge|\.set|\.defaultsdeep|\.mergewith)?|merge-deep|deepmerge|dot-prop|set-value)['\"]\)" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '_\.merge\s*\(|_\.mergeWith\s*\(|_\.defaultsDeep\s*\(|_\.set\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'Object\.assign\s*\(\s*\{\s*\}\s*,\s*req\.(body|query|params)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '__proto__|prototype\[' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Config loaders, ORM model hydration, GraphQL resolvers merging defaults.
**False-positive guard:** Safe if target is `Object.create(null)`, or if input keys are validated/whitelisted, or if `lodash`/`merge-deep` is upgraded to a version with `__proto__` blocking AND the `mergeWith` customizer rejects `__proto__`/`constructor`/`prototype`.

### Auth — JWT `algorithms: ['none']` or unverified `decode`

**What to look for:** `jwt.verify(token, ...)` with `algorithms: ['none']`, `algorithms` array omitted (silently allows multiple), or `jwt.decode(token)` used as authentication (decode does NOT verify signature).
**Why it's risky in Node:** `jsonwebtoken` historically allowed algorithm confusion (HS256 vs RS256) when `algorithms` is missing; `decode` returns claims for any string, signed or not.
**Concrete grep / ripgrep query:**
```
rg -nP "algorithms\s*:\s*\[\s*['\"]none['\"]\s*\]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'jwt\.verify\s*\([^)]*\)' -g '*.{js,ts,jsx,tsx,mjs,cjs}' | rg -v 'algorithms\s*:'
rg -nP '\bjwt\.decode\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "from\s+['\"](jsonwebtoken|jose|fast-jwt)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Auth middleware, login controllers, NestJS strategies (`@nestjs/jwt`, `passport-jwt`), Next.js `getServerSession` wrappers.
**False-positive guard:** `jwt.verify(token, key, { algorithms: ['RS256'] })` (single explicit algorithm) is the safe pattern. `jwt.decode` is acceptable for inspecting an already-verified token.

### Auth — Express middleware order / `app.use(auth)` after the protected route

**What to look for:** `app.get('/admin', handler)` registered before `app.use(authMiddleware)` — Express runs middleware in registration order, so anything registered before the auth middleware bypasses it.
**Concrete grep / ripgrep query:**
```
rg -nP '^\s*app\.(get|post|put|delete|patch|use|all)\s*\(' -g '*.{js,ts,mjs,cjs}'
```
Then sequence-check by hand: any route registered before the auth `app.use(...)` is suspect.
**File hint:** `index.{js,ts}`, `server.{js,ts}`, `app.{js,ts}`.
**False-positive guard:** Routes that are intentionally public (login, healthcheck, static assets) are fine.

### CSRF — Express POST routes without CSRF middleware

**What to look for:** Cookie-authenticated Express apps that handle POST/PUT/DELETE without `csurf`/`csrf-csrf`/`@dr.pogodin/csurf`/`lusca` (note: `csurf` itself is deprecated and unmaintained — `csrf-csrf` is the modern replacement).
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](csurf|csrf-csrf|lusca|@dr\.pogodin/csurf)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP "require\(['\"](csurf|csrf-csrf|lusca)['\"]\)" -g '*.{js,ts,mjs,cjs}'
rg -nP 'app\.(post|put|delete|patch)\s*\(' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express/Koa apps with `cookie-session` / `express-session`.
**False-positive guard:** Pure JWT/bearer APIs without cookies are not CSRF-vulnerable. SameSite=Strict cookies + custom request header check (e.g. `X-Requested-With`) is acceptable mitigation.

### CSRF — Next.js Server Actions without origin check

**What to look for:** Server Actions (`'use server'`) that mutate data without verifying `Origin`/`Referer`. Next.js 14+ provides `serverActions.allowedOrigins` config; if missing, only the `same-origin` default protects you.
**Concrete grep / ripgrep query:**
```
rg -nP "['\"]use server['\"]" -g '*.{js,jsx,ts,tsx}'
rg -nP 'serverActions\s*:\s*\{' -g 'next.config.{js,ts,mjs}'
rg -nP 'allowedOrigins' -g 'next.config.{js,ts,mjs}'
```
**File hint:** `app/**/actions.ts`, components with inline `'use server'`.
**False-positive guard:** Default Next.js CSRF (Origin-header same-origin check) is on; flag only if `experimental.serverActions.allowedOrigins` is wide.

### Open redirect — `res.redirect(req.query.next)` without allowlist

**What to look for:** Any redirect target taken from request input without parsing + host allowlist.
**Concrete grep / ripgrep query:**
```
rg -nP 'res\.redirect\s*\(\s*(req\.(body|query|params)|input\.|user\.|next|returnUrl|continue|target)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'ctx\.redirect\s*\(\s*(ctx\.(query|request)|input\.)' -g '*.{js,ts,mjs,cjs}'
rg -nP 'reply\.redirect\s*\(\s*(req\.|request\.)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Login/logout/callback handlers, OAuth flows.
**False-positive guard:** Safe when target is parsed via `new URL(...)` and `url.origin === ALLOWED_ORIGIN` is enforced, or when only relative paths (starting with `/` and not `//`) are accepted.

### Crypto — weak hashes (`md5`/`sha1`) for passwords or HMAC

**What to look for:** `crypto.createHash('md5'|'sha1')` or `crypto.createHmac('sha1', ...)` used in login/password/token paths.
**Concrete grep / ripgrep query:**
```
rg -nP "createHash\s*\(\s*['\"](md5|sha1)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "createHmac\s*\(\s*['\"](md5|sha1)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Auth folders, user registration, password reset flows.
**False-positive guard:** OK for non-security ETags / cache keys / file fingerprints — but flag for review. For passwords use `bcrypt`, `argon2`, `scrypt`, or `crypto.scryptSync`.

### Crypto — `Math.random()` for tokens / ids / OTPs

**What to look for:** `Math.random()` used to mint session ids, password reset tokens, OTPs, nonces, "random" filenames in security contexts.
**Why it's risky in Node:** V8 `Math.random` is xorshift128+ — predictable from a few outputs. Use `crypto.randomBytes()`, `crypto.randomUUID()`, `crypto.randomInt()`.
**Concrete grep / ripgrep query:**
```
rg -nP 'Math\.random\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Token utils, OTP generators, anything in `auth/`, `security/`, `tokens/`.
**False-positive guard:** OK in tests, simulations, UI animation jitter, A/B traffic split.

### Crypto — ECB mode and zero IVs

**What to look for:** `crypto.createCipheriv('aes-128-ecb' | 'aes-256-ecb', ...)`, `Buffer.alloc(16)` (zero IV) passed as IV, or IV derived from key/constant.
**Concrete grep / ripgrep query:**
```
rg -nP "createCipheriv\s*\(\s*['\"][^'\"]*-ecb['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "createDecipheriv\s*\(\s*['\"][^'\"]*-ecb['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'createCipheriv\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}' -A 2
```
**File hint:** Custom encryption helpers, link signers.
**False-positive guard:** Safe when IV is `crypto.randomBytes(12)` for GCM or `crypto.randomBytes(16)` for CBC and stored alongside ciphertext. Prefer `aes-256-gcm`.

### Crypto — `createCipher` / `createDecipher` (deprecated, password-derived key)

**What to look for:** Legacy `crypto.createCipher(algo, password)` — derives a key via insecure MD5-based KDF. Removed in Node 22+.
**Concrete grep / ripgrep query:**
```
rg -nP '\bcrypto\.(createCipher|createDecipher)\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Older codebases, copied StackOverflow snippets.

### Crypto — hardcoded keys / IVs / passwords

**What to look for:** String/Buffer literals named `key`, `iv`, `secret`, `password`, `apiKey` adjacent to `createCipheriv`/`Hmac`/`sign`.
**Concrete grep / ripgrep query:**
```
rg -nPi "(const|let|var)\s+(key|iv|salt|secret|password|api_?key|jwt_?secret)\s*=\s*['\"][\w+/=:\-]{8,}['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "Buffer\.from\s*\(\s*['\"][a-zA-Z0-9+/=]{16,}['\"]\s*,\s*['\"](base64|hex)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Crypto helpers, license validators, jwt signing utilities.
**False-positive guard:** Test fixtures, snapshot files, and dev-only env defaults are common false positives.

### Insecure deserialization — `node-serialize`, `serialize-javascript`, `funcster`

**What to look for:** Imports of `node-serialize` (CVE-2017-5941 — RCE via `_$$ND_FUNC$$_` payloads), `funcster`, or `serialize-javascript` calls fed user input.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](node-serialize|serialize-javascript|funcster|cryo|serialize-js)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "require\(['\"](node-serialize|serialize-javascript|funcster|cryo)['\"]\)" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\bunserialize\s*\(' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Cache stores, session backends, RPC handlers.
**False-positive guard:** None — `node-serialize` should not appear in modern code. `serialize-javascript` is OK if input is trusted (e.g. SSR initial state) but not if mixed with attacker data.

### YAML deserialization — `js-yaml.load` (vs `safeLoad`)

**What to look for:** `yaml.load(userInput)` — pre-4.0 `js-yaml` used `load` as the unsafe variant (allowed `!!js/function`). Modern versions made `load` safe by default but legacy code may pass a `schema: DEFAULT_FULL_SCHEMA`.
**Concrete grep / ripgrep query:**
```
rg -nP "yaml\.load\s*\(" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP 'DEFAULT_FULL_SCHEMA|FAILSAFE_SCHEMA|JSON_SCHEMA' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "from\s+['\"](js-yaml|yaml)['\"]" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Config loaders, CI YAML parsers.
**False-positive guard:** `yaml.load(...)` on `js-yaml >= 4` with default schema is safe; flag if the schema is overridden.

### ReDoS — user-controlled regex / catastrophic backtracking

**What to look for:** `new RegExp(req.query.pattern)` (user-supplied regex), or static regexes with nested quantifiers `(a+)+`, `(a|a)*`, `(.*)+` applied to user input. Common offenders: `validator.js` (older versions had ReDoS in `isEmail`), custom email/URL validators.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+RegExp\s*\(\s*(req\.|request\.|input\.|params\.|body\.|query\.)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\([^)]*\+\)\+|\([^)]*\*\)\+|\(\.\*\)\+' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Validators, parsers, log scrubbers.
**False-positive guard:** Safe with `re2` (`node-re2`) drop-in replacement (linear-time).

### Mass assignment — `Model.create(req.body)` without field whitelist

**What to look for:** Mongoose `Model.create(req.body)` with `strict: false` or schema lacking a whitelist; Sequelize `Model.create(req.body)` without `fields: [...]`; TypeORM `repo.save({ ...req.body })`; Prisma is safer but `prisma.user.create({ data: req.body })` still leaks unintended scalar fields.
**Concrete grep / ripgrep query:**
```
rg -nP '\.create\s*\(\s*(req\.(body|query)|\{\s*\.\.\.req\.(body|query))' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP '\.update\s*\(\s*(req\.(body|query)|\{\s*\.\.\.req\.(body|query))' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "strict\s*:\s*false" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nP "data\s*:\s*req\.(body|query)" -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** REST controllers, Mongoose model files, NestJS services.
**False-positive guard:** Safe when input is parsed through Zod/Joi/`class-validator` with a strict schema before reaching the ORM.

### CORS misconfig — wildcard origin + `credentials: true`

**What to look for:** `cors({ origin: '*', credentials: true })` (browsers will reject this, but the server intent is dangerous), or `origin: (req, cb) => cb(null, true)` (reflective allow) plus credentials.
**Concrete grep / ripgrep query:**
```
rg -nP "cors\s*\(\s*\{[^}]*origin\s*:\s*['\"]\\*['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP "cors\s*\(\s*\{[^}]*origin\s*:\s*true" -g '*.{js,ts,mjs,cjs}'
rg -nP 'origin\s*:\s*function|origin\s*:\s*\([^)]*\)\s*=>' -g '*.{js,ts,mjs,cjs}'
rg -nP 'credentials\s*:\s*true' -g '*.{js,ts,mjs,cjs}'
rg -nP "['\"]Access-Control-Allow-Origin['\"]\s*,\s*['\"]\\*['\"]" -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express/Koa/Fastify entry points, NestJS `app.enableCors`.
**False-positive guard:** Public read-only API with `*` origin and NO credentials is acceptable.

### Cookie misconfig — missing `httpOnly` / `secure` / `sameSite`

**What to look for:** `res.cookie(name, value)` (defaults are NOT secure), `res.cookie(..., { httpOnly: false })`, `sameSite: 'none'` without `secure: true`, session cookies without `secure: true` in prod.
**Concrete grep / ripgrep query:**
```
rg -nP 'res\.cookie\s*\(' -g '*.{js,ts,mjs,cjs}' -A 4
rg -nP "httpOnly\s*:\s*false|secure\s*:\s*false|sameSite\s*:\s*['\"]none['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP "session\s*\(\s*\{" -g '*.{js,ts,mjs,cjs}' -A 8
```
**File hint:** Auth flows, `express-session` / `cookie-session` config, NextAuth/Auth.js cookie config.
**False-positive guard:** Local dev with `secure: false` is OK if guarded by `process.env.NODE_ENV`.

### Logging sensitive data

**What to look for:** `console.log(req.body)`, `logger.info({ user })` with full user objects, JWTs in logs, `Authorization` header dumped.
**Concrete grep / ripgrep query:**
```
rg -nPi 'console\.(log|info|debug|warn|error)\s*\(\s*req\.(body|headers|cookies)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nPi '(console|logger|log|pino|winston|bunyan)\.\w+\s*\([^)]*\b(password|secret|token|api_?key|authorization|bearer|cookie|ssn|cardnumber|cvv)\b' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
rg -nPi 'console\.\w+\s*\([^)]*\b(req|request|user)\.(body|headers|password|secret|token)' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** Middleware, error handlers, controllers.
**False-positive guard:** Pino/Winston redaction config (`redact: ['*.password', 'req.headers.authorization']`) is the right answer — flag if absent.

### Express defaults — `x-powered-by` header / no `helmet()`

**What to look for:** Missing `app.disable('x-powered-by')` AND missing `helmet()` middleware. `helmet` sets ~12 security headers (CSP, HSTS, X-Content-Type-Options, etc.).
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"]helmet['\"]|require\(['\"]helmet['\"]\)" -g '*.{js,ts,mjs,cjs}'
rg -nP "app\.disable\s*\(\s*['\"]x-powered-by['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'app\.use\s*\(\s*helmet\s*\(' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express entry point.
**False-positive guard:** Fastify/NestJS have `@fastify/helmet` and `helmet` integrated differently; verify equivalent middleware exists.

### Rate limiting — missing `express-rate-limit` / brute-force protection

**What to look for:** Login / password-reset / token endpoints without `express-rate-limit`, `rate-limiter-flexible`, `@fastify/rate-limit`, or `@nestjs/throttler`.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](express-rate-limit|rate-limiter-flexible|@fastify/rate-limit|@nestjs/throttler|express-brute|express-slow-down)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP '/login|/signin|/signup|/reset|/forgot|/2fa|/otp' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Auth routes.
**False-positive guard:** Edge-layer rate limiting (Cloudflare, AWS WAF) may be present — verify with deployment notes.

### Body-parser — no size limit

**What to look for:** `express.json()` / `bodyParser.json()` / `app.use(express.urlencoded())` without an explicit `limit` (default is 100kb but easy to disable; `bodyParser.raw({ limit: '5gb' })` is unbounded DoS).
**Concrete grep / ripgrep query:**
```
rg -nP 'express\.(json|urlencoded|raw|text)\s*\(' -g '*.{js,ts,mjs,cjs}'
rg -nP 'bodyParser\.\w+\s*\(' -g '*.{js,ts,mjs,cjs}'
rg -nP "limit\s*:\s*['\"][0-9]+(g|gb|GB)['\"]" -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Express setup.
**False-positive guard:** Default 100kb is acceptable for most APIs.

### Next.js — API route auth bypass / missing `getServerSession`

**What to look for:** `app/api/**/route.ts` or `pages/api/**/*.ts` handlers that read/write data without calling `getServerSession`/`auth()`/checking JWT.
**Concrete grep / ripgrep query:**
```
rg -nP 'export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)' -g 'app/**/route.{js,ts}'
rg -nP 'export\s+default\s+(async\s+)?function\s+handler' -g 'pages/api/**/*.{js,ts}'
rg -nP 'getServerSession|auth\s*\(\s*\)|getToken\s*\(' -g 'app/**/route.{js,ts}' -g 'pages/api/**/*.{js,ts}'
```
**File hint:** Next.js API routes.
**False-positive guard:** Public endpoints (sitemap, OG, public search) are intentionally unauthenticated.

### Next.js — Server Action without `'use server'` boundary check

**What to look for:** `'use server'` files that accept arguments without validation (Server Actions are POST endpoints, anyone can call them).
**Concrete grep / ripgrep query:**
```
rg -nP "['\"]use server['\"]" -g '*.{js,jsx,ts,tsx}'
```
For each match, audit: does the action call `auth()` / validate args via Zod?
**File hint:** `app/**/actions.{js,ts}`.
**False-positive guard:** Server Actions with `await auth()` then a Zod parse are safe.

### Next.js — `revalidatePath` / `revalidateTag` with user input

**What to look for:** Calls to `revalidatePath(req.body.x)` — attacker can mass-revalidate (DoS the cache).
**Concrete grep / ripgrep query:**
```
rg -nP 'revalidatePath\s*\(\s*(req\.|input\.|formData\.|body\.|params\.)' -g '*.{js,jsx,ts,tsx}'
rg -nP 'revalidateTag\s*\(\s*(req\.|input\.|formData\.|body\.|params\.)' -g '*.{js,jsx,ts,tsx}'
```
**File hint:** Server Actions, API routes.

### Insecure download / extraction — `tar`/`unzip`/`adm-zip` zip-slip

**What to look for:** Extracting user-uploaded archives without validating entry paths against `..` (zip-slip CVE-2018-1002200 + family).
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](tar|adm-zip|node-stream-zip|unzipper|extract-zip|yauzl)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP "require\(['\"](tar|adm-zip|node-stream-zip|unzipper|extract-zip|yauzl)['\"]\)" -g '*.{js,ts,mjs,cjs}'
rg -nP '\.extract\s*\(|\.extractAllTo\s*\(|extract-zip' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Upload handlers, plugin loaders.

### Server-Side Template Injection (SSTI)

**What to look for:** `pug.compile(req.body.template)`, `Handlebars.compile(req.body.tpl)`, `ejs.render(userTemplate)`, `nunjucks.renderString(userTemplate)`.
**Concrete grep / ripgrep query:**
```
rg -nP '(pug|ejs|handlebars|hbs|nunjucks|liquid|mustache|twig|eta)\.(compile|render|renderString)\s*\(\s*(req\.|input\.|user\.|body\.)' -g '*.{js,ts,mjs,cjs}'
```
**File hint:** Email templating, dynamic page generation.

### XXE — XML parsers with external entities

**What to look for:** `libxmljs` `noent: true`, `xml2js` with `parseStringPromise` on user input (less risky but still parses comments/CDATA), `node-libxml-xsd` with default config.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+['\"](libxmljs|libxmljs2|xml2js|fast-xml-parser|node-libxml)['\"]" -g '*.{js,ts,mjs,cjs}'
rg -nP 'noent\s*:\s*true|noEnt\s*:\s*true' -g '*.{js,ts,jsx,tsx,mjs,cjs}'
```
**File hint:** SOAP/SAML clients, RSS parsers.

### TypeScript-specific — `as any` on auth/input boundaries

**What to look for:** `req.body as any`, `userInput as MyDto`, `JSON.parse(x) as User` — type assertions are erased at runtime, so they bypass any compile-time guarantees the author thought they were getting.
**Concrete grep / ripgrep query:**
```
rg -nP '\bas\s+any\b' -g '*.{ts,tsx}'
rg -nP '\b(req|request|input|body|query|params|ctx)\.\w+\s+as\s+\w+' -g '*.{ts,tsx}'
rg -nP 'JSON\.parse\s*\([^)]+\)\s+as\s+\w+' -g '*.{ts,tsx}'
```
**File hint:** Controllers, route handlers, GraphQL resolvers.
**False-positive guard:** Acceptable when paired with a runtime validator (`zod.parse`, `class-validator`, `io-ts.decode`); flag the assertion-only cases.

### TypeScript-specific — `// @ts-expect-error` / `// @ts-ignore` near auth

**What to look for:** `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` comments near auth, crypto, SQL, or input-validation code.
**Concrete grep / ripgrep query:**
```
rg -nP '//\s*@ts-(ignore|expect-error|nocheck)' -g '*.{ts,tsx}' -B 2 -A 4
```
**File hint:** Anywhere — but high-risk if surrounding lines reference `auth`, `verify`, `password`, `query`, `exec`.
**False-positive guard:** Common in tests and third-party type workarounds.

### TypeScript-specific — NestJS controllers without `ValidationPipe`

**What to look for:** NestJS apps without a global `ValidationPipe` (`app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))`) and DTOs lacking `class-validator` decorators — accepts any field, leading to mass assignment.
**Concrete grep / ripgrep query:**
```
rg -nP 'useGlobalPipes\s*\(\s*new\s+ValidationPipe' -g '*.{ts,js}'
rg -nP '@Body\s*\(\s*\)\s*\w+\s*:\s*\w+' -g '*.{ts}' -B 1
rg -nP "from\s+['\"]class-validator['\"]" -g '*.ts'
```
**File hint:** `main.ts`, NestJS controllers, DTO files.
**False-positive guard:** Per-route `@UsePipes(new ValidationPipe(...))` is equivalent.

### TypeScript-specific — `unknown` cast without runtime validation

**What to look for:** `JSON.parse` returns `any` (TS 5+ strict can return `unknown`); pattern `(JSON.parse(x) as Foo)` skips runtime checking.
**Concrete grep / ripgrep query:**
```
rg -nP 'JSON\.parse\s*\([^)]+\)\s+as\s+\w' -g '*.{ts,tsx}'
rg -nP '<unknown>\s*\w+' -g '*.{ts,tsx}'
```
**File hint:** Anywhere parsing JSON from network/disk/user.
**False-positive guard:** Pair with `zod.parse(JSON.parse(x))` for safety.

### TypeScript-specific — `tsconfig.json` `strict: false`

**What to look for:** `tsconfig.json` lacking `"strict": true` (or with `noImplicitAny: false`, `strictNullChecks: false`) — disables most type-system safety.
**Concrete grep / ripgrep query:**
```
rg -n '"strict"\s*:\s*false|"noImplicitAny"\s*:\s*false|"strictNullChecks"\s*:\s*false' -g 'tsconfig*.json'
```
**File hint:** Root `tsconfig.json`, package-level `tsconfig.json` in monorepos.
**False-positive guard:** Legacy migrations sometimes ship `strict: false` — flag for review, not necessarily a bug.

### TypeScript-specific — NestJS missing `helmet`/`cors` config

**What to look for:** `app.enableCors()` with no options (allows everything), `app` instantiated without `helmet`.
**Concrete grep / ripgrep query:**
```
rg -nP 'app\.enableCors\s*\(\s*\)' -g '*.{ts,js}'
rg -nP "from\s+['\"]@nestjs/helmet['\"]|from\s+['\"]helmet['\"]" -g '*.ts'
```
**File hint:** `main.ts`.
