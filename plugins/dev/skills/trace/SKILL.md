---
name: trace
description: Trace any code entry point — API endpoint, function, class, event handler, background job — through all connected code upstream and downstream, and document the full business logic in natural language. Supports parity sweeps across old and new codebases.
---

# Code Tracer

> Start at any entry point in the codebase — an API route, a function, a class, an event handler — and trace all connected code upstream (what calls it) and downstream (what it calls). Produce a plain-English document describing the full business logic.

**Output directory:** `./ai_docs/trace/`

## Arguments

`$ARGUMENTS` determines the entry point to trace.

| Pattern | Example | Behavior |
|---------|---------|----------|
| `METHOD /path` | `GET /api/v1/status` | Trace an API endpoint (route → handler → service → data) |
| `METHOD /path/with/{param}` | `POST /api/v1/vehicles/{id}/purchase` | Trace a parameterized API endpoint |
| `path/to/file.ext:functionName` | `src/services/pricing.ts:calculateTotal` | Trace a specific function |
| `path/to/file.ext:ClassName.method` | `src/jobs/sync.py:SyncJob.execute` | Trace a class method |
| `path/to/file.ext` | `src/workers/orderProcessor.ts` | Trace all exports / entry points in a file |
| `/path` (no method) | `/api/v1/users` | Trace all HTTP methods on this API path |
| `--parity <old_dir> <new_dir>` | `--parity ./old-service ./new-service` | Parity sweep across two codebases |
| _(empty)_ | | Interactive: list detected entry points and ask which to trace |

## 🔀 [ROUTER] Trace Mode Selection

Determine the trace mode based on `$ARGUMENTS`:

- [ ] **Condition: Arguments include `--parity <old_dir> <new_dir>`** ➔ *Execute [Parity Sweep Mode]*
- [ ] **Condition: Standard entry point provided** ➔ *Execute [Standard Trace Mode]*
- [ ] **Condition: Arguments are empty** ➔ *Execute [Interactive Mode]*

---

### [Parity Sweep Mode]

*Mandatory during the design phase of a rewrite to catch subtle behavioral drift (e.g., `"true"` vs `"Y"`, missing locks, hash algorithm changes) before planning begins.*

1. **Discover all endpoints** in the `<old_dir>` codebase using the framework detection logic from Step 2 below.
2. **For each endpoint**, spawn parallel sub-agents to trace the full execution path in BOTH codebases simultaneously.
3. **Compare invariants directly** for each endpoint:
   - Freeze/status indicators and their exact values
   - Locking mechanisms (distributed locks, mutexes, semaphores)
   - Hash algorithms and their output types
   - Error handling paths and fallback behaviors
   - Retry logic and backoff strategies
   - Event publishing and side effects
   - Serialization/deserialization types
   - Credential loading chains
   - Cache TTLs and eviction policies
4. **Output to `ai_docs/trace/parity-report.md`:**

```markdown
# Endpoint Parity Report

| Endpoint | Aspect | Old Behavior | New Behavior | Parity Status |
|----------|--------|--------------|--------------|---------------|
```

Parity Status values: `MATCH`, `BREAK` (behavioral difference), `MISSING` (endpoint not found in new), `NEW` (only in new codebase).

🛑 **PROGRESSIVE DISCLOSURE GATE:** STOP HERE after generating the Parity Report. Present the table and wait for user review before proceeding. Any `BREAK` or `MISSING` entries must be acknowledged by the user as intentional or flagged for fix.

---

### [Standard Trace Mode]

Proceed to Step 1 below with the provided entry point.

### [Interactive Mode]

Proceed to Step 1 below with empty arguments (will prompt user to select an entry point).

---

## Step 1: Parse Arguments and Detect Entry Point Type

Classify the input into one of these entry point types:

| Type | Detection Rule |
|------|---------------|
| **API Endpoint** | Starts with an HTTP method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`) or starts with `/` |
| **Function** | Contains `:` with no `.` after it (e.g., `file.ts:myFunction`) |
| **Class Method** | Contains `:` with `.` after it (e.g., `file.ts:MyClass.myMethod`) |
| **File** | A file path with no `:` separator |
| **Interactive** | Empty arguments |

Record the entry point type — this determines the tracing strategy and output template.

## Step 2: Detect Framework and Language

Before spawning sub-agents, determine the tech stack:

1. Read project root files to detect language/framework:
   - `package.json` → Node.js / TypeScript (Express, NestJS, Fastify, Hapi) or UI (React, Angular, Vue)
   - `tsconfig.json` → TypeScript (check if UI or backend based on framework deps in package.json)
   - `*.csproj` / `*.sln` → C# (.NET)
   - `requirements.txt` / `pyproject.toml` / `Pipfile` → Python (Django, FastAPI, Flask)
   - `go.mod` → Go (Gin, Echo, Chi)
2. Note the framework — this determines where route definitions, middleware, and services live.
3. If multiple services exist (monorepo), ask the user which service to trace.

## Step 3: Check LSP Availability

LSP (Language Server Protocol) improves tracing accuracy. Check if it's available, warn if not, and continue either way.

### Check for LSP

1. Find a source file in the detected language (e.g., a controller, route file, or the target file itself).
2. Attempt an LSP `documentSymbol` operation on that file.
3. Evaluate the result:
   - **LSP responds successfully** → Set `LSP_AVAILABLE = true`. Proceed directly to Step 4 — no message needed.
   - **LSP returns an error or "no server available"** → Set `LSP_AVAILABLE = false`. Show the prompt below.

### If LSP Is Not Detected

Present the following and ask the user how to proceed:

```
⚠ No LSP server detected for [language].

LSP improves trace accuracy by letting me follow function calls via
"go to definition" and "find references" instead of text search.

To enable it, install the plugin for your language:

  Language               Plugin           Binary to install
  ─────────────────────  ───────────────  ─────────────────────────────────────────
  TypeScript/JavaScript  typescript-lsp   npm install -g typescript-language-server typescript
  Python                 pyright-lsp      pip install pyright  (or npm install -g pyright)
  C#                     csharp-lsp       dotnet tool install -g csharp-ls
  Go                     gopls-lsp        go install golang.org/x/tools/gopls@latest

  Install: /plugin > Discover > search plugin name > Install > restart Claude Code
```

Then ask: **"Would you like to take a moment to enable the LSP plugin, or should I continue without it?"**

- If the user wants to enable it → wait for them to install and restart, then re-run the LSP check
- If the user says continue → proceed to Step 4 using Grep/Glob-based search

## Step 4: Locate the Entry Point

How you find the entry point depends on the type detected in Step 1.

### API Endpoint

Spawn a **dev:codebase-locator** agent to find the route registration:

- Search for the HTTP method + path pattern in route files
- Common patterns to search:
  - **Express/Fastify** (Node.js/TS): `router.get('/path'`, `app.post('/path'`
  - **NestJS** (Node.js/TS): `@Get('/path')`, `@Post('/path')`, `@Controller('/prefix')`
  - **.NET** (C#): `[HttpGet("path")]`, `MapGet("/path"`, `[Route("path")]`, `[ApiController]`
  - **Django** (Python): `path('path/', view)`, `urlpatterns`
  - **FastAPI** (Python): `@app.get("/path")`, `@router.post("/path")`
  - **Flask** (Python): `@app.route('/path')`, `@blueprint.route('/path')`
  - **Go** (Gin/Echo/Chi): `r.GET("/path"`, `e.GET("/path"`, `r.Get("/path"`, `mux.HandleFunc`
- Record the file path, line number, and handler function name

### Function or Class Method

1. Read the specified file
2. If LSP is available, use `documentSymbol` to find the exact symbol, then record its position
3. If no LSP, search for the function/method definition in the file using Grep
4. If the file doesn't exist or the symbol isn't found, report the error and ask for guidance

### File (all entry points)

1. Read the file
2. If LSP is available, use `documentSymbol` to list all exported functions/classes
3. If no LSP, scan for exported symbols (e.g., `export function`, `def`, `public`, `func`)
4. Present the list and ask the user which symbol(s) to trace, or trace all

### Interactive (no arguments)

1. Use a **dev:codebase-locator** agent to find:
   - Route registration files (for API endpoints)
   - Entry point files (main, index, app, server, worker, job files)
   - Event handler registrations
   - CLI command definitions
2. Present a table of discovered entry points grouped by type
3. Ask the user which to trace

If no entry point is found, report that and ask the user for guidance.

## Step 5: Trace Connected Code

Spawn parallel sub-agents to trace both **downstream** (what the entry point calls) and **upstream** (what calls the entry point). Use **dev:codebase-analyzer** agents.

### Tracing Strategy: LSP-first vs. Text Search

If `LSP_AVAILABLE = true`, instruct sub-agents to prefer LSP tools:

| Operation | LSP Tool | Fallback (no LSP) |
|-----------|----------|-------------------|
| Follow a function call into its definition | `goToDefinition` | Grep for function name + file glob |
| Find all callers of a function | `findReferences` / `incomingCalls` | Grep for function name across codebase |
| List all functions in a file | `documentSymbol` | Read file and scan manually |
| Find interface implementations | `goToImplementation` | Grep for class/interface name |
| Understand a symbol's type/signature | `hover` | Read surrounding code context |
| Trace a call chain outward | `outgoingCalls` | Read function body, grep each called function |

**IMPORTANT**: When LSP is available, sub-agents should use `goToDefinition` to follow each function call rather than searching by name. This avoids false matches from overloaded names or similarly-named functions in unrelated modules.

### 5a. Downstream Trace (what does this code call?)

Starting from the entry point, trace outward through every layer it touches:

- **Direct function/method calls** — follow each call to its definition
- **Service layer** — business rules, conditional logic, data transformations, calculations
- **Data access** — database queries, ORM calls, stored procedures, cache reads/writes
- **External calls** — HTTP clients, gRPC, message queue publishes, third-party APIs
- **Side effects** — emails, notifications, audit logs, event emissions, file writes
- **Error handling** — what exceptions are caught, what error responses are produced

Trace recursively: when a called function itself calls other functions, follow those too. Stop when you reach:
- Standard library / framework built-ins
- Third-party library calls (document what's called, but don't trace into the library)
- Database drivers / HTTP clients (document the query/request, not the driver internals)

### 5b. Upstream Trace (what calls this code?)

From the entry point, trace inward to discover what triggers it:

- **For API endpoints**: middleware chain, route registration, any gateway/proxy config
- **For functions/methods**: all callers (use `findReferences` or `incomingCalls`)
- **For event handlers**: what emits the event, where the handler is registered
- **For background jobs**: scheduler config, cron definitions, queue consumer registration
- **For class methods**: constructor injection, where the class is instantiated and used

### 5c. Contextual Layers (for API endpoints only)

If the entry point is an API endpoint, additionally trace:

- **Authentication / authorization** middleware
- **Request validation** / schema validation
- **Rate limiting, CORS, logging** middleware
- **Response serialization** / transformation
- **Global error handlers** that catch exceptions from this endpoint

## Step 6: Wait for All Sub-Agents

**CRITICAL**: Wait for ALL sub-agent tasks to complete before proceeding. Do NOT write the document with placeholder values.

## Step 7: Synthesize and Write the Document

### Output Path

The output path depends on the entry point type:

| Entry Point Type | Output Path | Example |
|-----------------|-------------|---------|
| API Endpoint | `./ai_docs/trace/api/<METHOD>-<sanitized-path>.md` | `api/GET-status.md` |
| Function | `./ai_docs/trace/<file-kebab>-<function>.md` | `pricing-calculateTotal.md` |
| Class Method | `./ai_docs/trace/<file-kebab>-<Class>-<method>.md` | `sync-SyncJob-execute.md` |
| File (all) | `./ai_docs/trace/<file-kebab>.md` | `orderProcessor.md` |

**Filename rules:**
- Use kebab-case throughout
- For API paths: method uppercase, slashes → hyphens, strip common prefix, remove braces from params
- For file-based: use the filename stem (no extension, no directory path)
- Examples:
  - `GET /api/v1/status` → `api/GET-status.md`
  - `src/services/pricing.ts:calculateTotal` → `pricing-calculateTotal.md`
  - `src/jobs/sync.py:SyncJob.execute` → `sync-SyncJob-execute.md`

### Document Template

Use the appropriate template based on what was discovered during tracing. The document should adapt to the actual code — only include sections that are relevant.

```markdown
# [Entry Point Name]

> One-sentence summary of what this code does.

**Entry point:** `path/to/file.ext:symbol` (line N)
**Type:** [API Endpoint | Function | Class Method | Event Handler | Background Job | CLI Command]
**Last traced:** YYYY-MM-DD

---

## Trigger

[How is this code invoked? What causes it to execute?]

<!-- For API endpoints: -->
### HTTP Endpoint
- **Method:** GET/POST/PUT/DELETE/PATCH
- **Path:** /full/path
- **Authentication:** [required auth, roles, tokens]

### Parameters
| Name | In | Type | Required | Description |
|------|------|------|----------|-------------|

### Request Body
[Schema or example, if applicable]

<!-- For non-API entry points: -->
### Invocation
[What calls this? Scheduler, event, queue, CLI, other code?]
[Include caller file paths and line numbers]

---

## Validation & Guards
[Input validation, precondition checks, authorization checks]
[What causes early returns or rejections?]

---

## Business Logic

### Step-by-step Flow
[Numbered list describing what happens in plain English, in execution order]

1. [First thing that happens]
2. [Next step — include conditional branches as sub-items]
   - If [condition]: [what happens]
   - Otherwise: [alternative path]
3. ...

### Business Rules
[Bulleted list of domain rules enforced by this code]

### Side Effects
[Anything triggered beyond the direct return value:]
[Emails, events, queue messages, cache invalidation, audit logs, file writes]

---

## Data Access

### Database Operations
[What tables/collections are read or written? What queries run?]

### External Services
[Any HTTP calls, gRPC calls, queue publishes to other systems]

### Caching
[Cache reads, writes, invalidation — if applicable]

---

## Output

<!-- For API endpoints: -->
### Success Response
[Status code, body shape, example]

### Error Responses
| Status | Condition | Body |
|--------|-----------|------|

<!-- For non-API: -->
### Return Value
[What does this function return? Under what conditions?]

### Error Handling
[What exceptions can be thrown? What happens when errors occur?]

---

## Upstream Callers
[Who calls this code? List all discovered callers with file:line references]

- `path/to/caller.ts:42` — [brief description of why it calls this]

---

## Code References
[Complete list of all files involved, with line numbers]

- `path/to/file.ts:15` — Entry point
- `path/to/service.ts:42` — Business logic
- `path/to/repository.ts:87` — Data access
- `path/to/caller.ts:23` — Upstream caller
```

### Template Adaptation Rules

- **Omit empty sections entirely** — if there's no caching, don't include the Caching section
- **API endpoints**: include HTTP Endpoint, Parameters, Request Body, Success/Error Response sections
- **Non-API entry points**: include Invocation, Return Value, Error Handling sections instead
- **Always include**: Trigger, Business Logic, Data Access (if any), Code References
- **Upstream Callers**: always include for non-API entry points; for API endpoints, include if the handler is reused by other code

## Step 8: Present Summary

After writing the document, present a concise summary to the user:
- Entry point and its type (one line)
- Number of files traced across
- Key business rules discovered
- Notable upstream callers (if any)
- File path of the generated document
- Ask if they want to trace another entry point, follow a specific branch deeper, or trace one of the discovered callers/callees

## What NOT To Do

- Do NOT invent business logic that isn't in the code
- Do NOT skip layers — trace through every function call, even if a layer is thin
- Do NOT summarize code as "handles errors" — describe WHAT errors and HOW they're handled
- Do NOT assume behavior from naming alone — read the actual implementation
- Do NOT include improvement suggestions unless the user explicitly asks
- Do NOT write the document until all sub-agents have returned findings

## Multiple Entry Points

If tracing a file with multiple exports, or an API path with multiple methods:
- Trace each entry point separately
- Write a separate document for each
- After all are written, mention all generated files

## No Arguments Provided

If `$ARGUMENTS` is empty:
1. Use a **dev:codebase-locator** agent to find entry points:
   - Route registration files (API endpoints)
   - Main/index/app/server files (application entry points)
   - Worker/job/consumer files (background processing)
   - Event handler registrations
   - CLI command definitions
2. Present discovered entry points in a grouped table
3. Ask the user which to trace
