---
name: rules-from-code
description: Analyze exemplary project code to generate a rules.md that captures coding conventions, engineering ethos, and patterns as actionable directives. Use when you want to reverse-engineer coding standards from a team's best code into a structured rules document.
---

# Rules From Code

> Point at a project, tag its best and worst code files, and generate a `rules.md` grounded in real patterns — not generic advice.

**Output:** `<project_root>/rules.md`

## Arguments

`$ARGUMENTS` determines the project and optional file tags.

| Pattern | Example | Behavior |
|---------|---------|----------|
| `path/to/project` | `~/repos/my-api` | Analyze the project at that path |
| `--good file1 file2` | `--good src/auth.ts src/orders.ts` | Pre-tag files as positive examples (patterns to follow) |
| `--bad file1 file2` | `--bad src/legacy.ts src/utils.ts` | Pre-tag files as negative examples (patterns to avoid) |
| `--structure dir` | `--structure src/features/auth` | Point at a "golden" directory whose layout becomes the structural template |
| `--good-tests file1 file2` | `--good-tests tests/auth.test.ts` | Pre-tag test files as positive testing exemplars |
| `--bad-tests file1 file2` | `--bad-tests tests/legacy.test.ts` | Pre-tag test files as negative testing examples (patterns to avoid in tests) |
| _(empty)_ | | Use the current working directory |

Arguments are additive — combine path with any flags. Pre-tagged files skip interactive selection but the skill still discovers additional candidates.

## Phase 1: Project Discovery

1. Resolve project path from `$ARGUMENTS` (default to cwd).
2. Detect language and framework from manifest files:
   - `package.json` → Node.js / TypeScript (check `dependencies` for framework: Express, NestJS, Fastify, React, etc.)
   - `tsconfig.json` → TypeScript
   - `pyproject.toml` / `requirements.txt` / `Pipfile` → Python (Django, FastAPI, Flask, etc.)
   - `go.mod` → Go
   - `Cargo.toml` → Rust
   - `*.csproj` / `*.sln` → C# / .NET
   - `Gemfile` → Ruby
3. Map project structure — identify:
   - Source directories (src/, lib/, app/, pkg/)
   - Test directories (__tests__/, test/, tests/, spec/)
   - Config files at project root
   - **Structural patterns** (auto-detect): Look for repeating directory shapes — directories that contain the same set of file types (e.g., every feature folder has `index.ts`, `types.ts`, `service.ts`, `__tests__/`). Record these as candidate structural conventions. If `--structure` was provided, use that directory as the canonical template and compare other directories against it.
4. Read existing lint/format configs if present. These become rules automatically:
   - ESLint / Biome → naming, import order, complexity limits
   - Prettier / dprint → formatting preferences
   - Ruff / Black / isort → Python style
   - .editorconfig → indentation, line endings
   - Record what you find but do NOT dump every linting rule — extract only the opinionated choices (e.g., "tabs vs spaces", "single quotes", "max line length 100")
5. Detect monorepo structure:
   - `workspaces` field in `package.json`
   - `packages/`, `apps/`, `libs/`, `services/` directories containing their own manifest files
   - `pnpm-workspace.yaml`, `lerna.json`, `nx.json`
   - Multiple `go.mod`, `Cargo.toml`, or `pyproject.toml` files at different directory levels
   - If detected, map sub-projects (name, language, path) and proceed with aggregate analysis — Phase 2 candidates will be drawn from across sub-projects

## Phase 2: Interactive File Selection

Identify **5-8 candidate files** using these heuristics (spawn a **dev:codebase-locator** agent if helpful):

| Heuristic | Why |
|-----------|-----|
| Has a corresponding test file | Indicates the team considers it important enough to test |
| Recently maintained (git log recency — see fallback below) | Reflects current conventions, not legacy code |
| Between 50-200 lines | Well-scoped, not a dumping ground |
| Core domain file (service, model, handler, controller) | Captures business logic patterns, not boilerplate |
| Not generated, not a lock file, not in node_modules/vendor/dist | Avoid noise |

**Exclude:** generated code, lock files, migration files, vendored dependencies, config-only files, type declaration files (`.d.ts`), barrel/index re-export files.

**Git recency fallback:** Try 6-month filter first. If fewer than 5 candidates pass, relax to 12 months. If still fewer than 5, drop the recency filter entirely and rely on remaining heuristics. If the project has no git history, skip this heuristic silently.

**Monorepo sampling:** When analyzing a monorepo, select no more than 2 files from the same sub-project to force diversity across packages. Include the package name in candidate justifications (e.g., "Core pricing service in `packages/billing`, 120 lines, has test coverage").

Present candidates to the user via `AskUserQuestion`:
- Show each candidate with a 1-line justification (e.g., "Core pricing service, 120 lines, has test coverage")
- Use a **multi-select** question so the user can pick specific files
- Options:
  - **"These look good"** — proceed with all candidates
  - **"Show more candidates"** — find 5 more and re-present

After file selection, ask a follow-up: "Any of these files represent patterns you want to **avoid**?" Present selected files and let the user tag specific ones as negative examples. Files not tagged as negative are treated as positive examples.

Pre-tagged files from `--good` and `--bad` arguments are included automatically and skip this interactive step.

No hard minimum file count — even 1 explicitly chosen exemplar file can generate rules. More files produce higher-confidence rules.

## Phase 3: Deep Analysis

Read each selected file. For each dimension below, look for **consistent patterns** — a pattern must appear in **2 or more files** to become a rule. One-off occurrences are noted but not codified.

### Positive vs Negative Examples

- **Positive examples** (default): analyzed as before — consistent patterns become DO rules
- **Negative examples** (user-tagged): analyzed for patterns that **contrast** with positive files. If a negative file uses nested callbacks while positive files use async/await, the rule becomes: "Use `async/await` for all asynchronous code. Do not use `.then()` chains or callbacks."
- Rules derived from negative examples are phrased as "Do not..." or "Avoid..." and grouped **inline** alongside their positive counterparts — not in a separate section
- A pattern in 1 positive file that is contradicted by a negative file has higher confidence than a pattern in 1 positive file alone

| Dimension | What to detect |
|-----------|---------------|
| **File naming** | camelCase, kebab-case, snake_case, PascalCase for files |
| **Function naming** | conventions, verb prefixes (get*, is*, handle*, create*, validate*) |
| **Module/export patterns** | single export per file, barrel files, default vs named exports |
| **Import organization** | grouping order (stdlib → external → internal), blank line separation |
| **Function structure** | typical length range, parameter count, early returns vs nested ifs |
| **Error handling** | try/catch patterns, custom error classes, validation-first guards |
| **Testing patterns** | framework, file location convention, naming (describe/it, test), mocking approach |
| **Logging patterns** | library used, log levels, structured vs string logging |
| **Comment style** | density (sparse, moderate), doc style (JSDoc, docstrings, GoDoc), why-only vs what+why |
| **Type usage** | strict mode, annotation density, interfaces vs types (TS), type hints (Python) |
| **File length** | typical range across the exemplary files |

### Language-Specific Patterns

Also extract patterns specific to the detected language:

- **TypeScript/JavaScript**: async/await vs callbacks vs promises, error boundary patterns, enum usage, barrel exports
- **Python**: decorator usage, dataclass vs dict, type hint coverage, context managers, f-strings vs format
- **Go**: interface placement (same package or consumer), error wrapping, struct embedding, receiver naming
- **Rust**: Result/Option patterns, derive macros, module organization, error crate usage
- **C#**: dependency injection style, async patterns, LINQ usage, nullable reference types

### Structural Analysis

Analyze directory layout patterns to generate structural rules with inline ASCII tree examples.

**If `--structure` was provided:**
1. List the contents of the specified directory — file names, sub-directories, and their file types
2. This becomes the **canonical structure template**
3. Scan sibling directories (or similar-purpose directories) to confirm the pattern repeats
4. Generate a structural rule with an ASCII tree showing the expected layout

**Auto-detection (always runs):**
1. Identify directories at the same depth that share a common parent (e.g., all directories under `src/features/`)
2. Compare their file compositions — look for repeated file names or naming patterns (e.g., `index.ts`, `*.service.ts`, `*.types.ts`, `__tests__/`)
3. If 2+ directories share the same shape, codify the pattern as a structural rule
4. Also capture: file naming conventions per directory level, co-location patterns (tests next to source vs separate tree), and barrel/index file conventions

**Structural rules format:** Include an ASCII tree in the rule showing the canonical layout:
```
- Organize each feature as a self-contained directory:
  feature-name/
  ├── index.ts          # public API
  ├── feature.service.ts
  ├── feature.types.ts
  └── __tests__/
      └── feature.service.test.ts
```

### Test Exemplar Analysis

When `--good-tests` or `--bad-tests` files are provided, or when test files are selected during Phase 2, perform deep test-specific analysis. Test rules are written with **strong enforcement language** — testing conventions are the area where inconsistency causes the most downstream pain.

**Analyze test exemplars across these dimensions:**

| Dimension | What to detect |
|-----------|---------------|
| **Test structure** | describe/it nesting, test grouping strategy, setup/teardown patterns |
| **Assertion style** | assertion library, chaining patterns, custom matchers |
| **Mocking approach** | module mocks vs dependency injection, mock placement, mock cleanup |
| **Test naming** | sentence style ("should return X"), behavior-driven ("returns X when Y"), naming prefix conventions |
| **Test data** | factories, fixtures, inline data, builder patterns |
| **What is tested** | behavior vs implementation, public API vs internals, happy path vs edge cases |
| **What is NOT tested** | log statements, private methods, framework internals |
| **Test isolation** | shared state between tests, beforeEach/afterEach patterns, database cleanup |

**Positive test exemplars** → derive strong DO rules: "Test only the public API of each module. Use `describe` for the unit and `it` for each behavior."

**Negative test exemplars** → derive strong DON'T rules with explanations: "Do not mock the module under test — this tests mock behavior, not real behavior. Do not test implementation details like internal method calls."

**Test rules use stronger language** than general rules. Instead of "prefer X" or "consider X", test rules say "Always X" and "Never Y." Testing is where the skill enforces the hardest.

### Pattern Confidence

For each detected pattern, note how many files exhibit it:
- **2-3 positive files**: include as a rule (it's a convention)
- **All positive files**: include as a strong rule (it's a standard)
- **1 positive file + contradicted by negative file**: include — the contrast provides confidence
- **1 positive file only**: include only if from a lint config, or note the source via parenthetical: "(from auth.ts)"

**Monorepo confidence:** A pattern appearing across 2+ sub-projects is a strong org-wide convention. A pattern in only 1 sub-project is noted but not codified unless the user explicitly tagged that file. If sub-projects have genuinely different conventions (e.g., Python backend vs TypeScript frontend), scope the rules: "In Python services, ..." / "In TypeScript packages, ..."

## Phase 4: Rules Generation

Generate the `rules.md` using the template from `references/rules-template.md`.

### Rule Writing Guidelines

- **Imperative verbs**: Start each rule with a verb — "Use", "Keep", "Name", "Place", "Return", "Throw"
- **Specific, not vague**: "Keep files under 200 lines" not "Write short files"
- **Grounded in evidence**: Every rule should trace back to a pattern observed in 2+ files or a lint config
- **Scoped**: Indicate where the rule applies if not universal (e.g., "In test files, ...")
- **Grouped**: Order from fundamental → specific: file organization → naming → function design → error handling → testing → code style → framework-specific

### Target Output

- **15-30 rules** in the General Engineering Directions section
- **Under ~100 lines** total document length
- **3 sections**: Role/Ethos, Description, General Engineering Directions

### Writing the Output

1. Populate the template sections using patterns from Phase 3.
2. For Section 1 (Ethos): infer engineering philosophy from the patterns:
   - Small files + single exports → values simplicity and separation of concerns
   - Extensive test coverage → values correctness and confidence
   - Heavy type annotations → values type safety and documentation
   - Sparse comments + descriptive names → values self-documenting code
   - Contrast between positive and negative examples → note what the team explicitly avoids
3. For Section 2 (Description): 2-3 sentences referencing the project name, language/framework, and purpose (infer from README or package description).
4. For Section 3 (Rules): write the flat bulleted list with sub-bullets for detail. Pair positive and negative rules inline.
5. **Overwrite check:** Before writing, check if `rules.md` already exists at `<project_root>`. If it does:
   - Read the existing file
   - Warn the user: "A `rules.md` already exists at `<path>`. It's X lines long."
   - Ask via `AskUserQuestion`: **"Overwrite"** (replace entirely) or **"Abort"** (stop without writing)
6. Write to `<project_root>/rules.md` using the Write tool.
7. **Review loop:** Display the full generated content inline in the conversation. Ask the user: "Want to revise anything?" with options:
   - **"Looks good"** — done
   - **"Revise specific rules"** — user describes changes, skill edits the file, then redisplays and asks again
   - **"Regenerate from scratch"** — re-run Phase 4 with the same analysis data

## What NOT To Do

- Do NOT generate generic software advice ("write clean code", "follow best practices")
- Do NOT dump every linting rule from config files — extract only opinionated choices
- Do NOT include rules about CI/CD, deployment, or infrastructure
- Do NOT make the document longer than ~100 lines
- Do NOT present analysis — the output is directives, not a report
- Do NOT include rules observed in only 1 file (unless from lint config)
- Do NOT add improvement suggestions — describe what IS, not what should be
- Do NOT separate negative rules into a "Don'ts" section — integrate them inline with positive rules
- Do NOT silently overwrite an existing `rules.md` — always check and ask first
- Do NOT skip the review loop — always show the output and ask if the user wants revisions

## No Arguments Provided

If `$ARGUMENTS` is empty, use the current working directory as the project path.
