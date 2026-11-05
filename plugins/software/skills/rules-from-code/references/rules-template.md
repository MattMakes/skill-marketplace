# Rules Template

This is the template for the generated `rules.md`. Fill each section based on patterns observed in the analyzed code.

## Template

```markdown
## Your Role and Engineering Ethos

You are a senior staff engineer working on this codebase. [1-2 sentences describing the engineering philosophy inferred from the code patterns. Derive this from what the code reveals — small files suggest valuing simplicity, extensive tests suggest valuing correctness, heavy typing suggests valuing safety, sparse comments with clear names suggest valuing self-documenting code.]

## Description

[2-3 sentences. Include: project name, primary language/framework, and what the project does. Pull from README, package.json description, or pyproject.toml metadata. If unclear, describe based on directory structure and file contents.]

## General Engineering Directions

Keep these in mind as we work together:

- [Rule 1: file organization / structure]
- [Rule 2: file organization / structure]
  - [Sub-detail if needed]
- [Rule 3: naming conventions]
- [Rule 4: naming conventions]
- [Rule 5: function/module design]
- [Rule 6: function/module design]
- [Rule 7: error handling]
- [Rule 8: testing patterns]
  - [Sub-detail: test framework, location]
  - [Sub-detail: mocking approach]
- [Rule 9: code style]
- [Rule 10: language/framework-specific]
- ...
```

## Rule Derivation Guide

### Inferring Ethos from Patterns

| Observed Pattern | Inferred Value |
|-----------------|----------------|
| Files consistently under 200 lines | Values simplicity and separation of concerns |
| Single export per file | Values modularity and clear interfaces |
| Extensive test coverage with mocks | Values correctness and confidence in changes |
| Heavy type annotations / strict mode | Values type safety and documentation-through-types |
| Sparse comments, descriptive function names | Values self-documenting code |
| Consistent error classes / error handling | Values reliability and debuggability |
| Structured logging with levels | Values observability |
| Early returns over nested conditionals | Values readability and flat control flow |
| README and inline docs well-maintained | Values onboarding and knowledge sharing |
| Repeating directory structure across features | Values structural consistency and predictable navigation |
| Test exemplars test public API only, never internals | Values behavior-driven testing and refactorability |
| Negative example uses deep nesting, positive uses early returns | Values readability and flat control flow |
| Negative example has 500-line files, positive stays under 150 | Values focused, single-responsibility modules |

### Writing Good Rules

**Do:**
- Start with an imperative verb: Use, Keep, Name, Place, Return, Throw, Test, Log, Export, Import
- Be specific: "Keep files under 200 lines" not "Write short files"
- Include scope when not universal: "In test files, use describe/it blocks"
- Add sub-bullets for detail when a rule has multiple facets
- Pair positive and negative rules inline: "Use X. Do not use Y." — don't separate them into DO/DON'T sections
- Include ASCII tree diagrams for structural rules — show the canonical directory layout
- Use strong enforcement language for test rules: "Always" and "Never" instead of "prefer" or "consider"

**Don't:**
- Write generic advice: "Follow best practices" or "Write clean code"
- Duplicate what linters enforce automatically (unless it's an opinionated choice worth calling out)
- Include aspirational rules — only codify what the code already does
- Add more than 30 rules — if you have more, combine related ones
- Separate negative rules into their own section — integrate them alongside their positive counterparts

### Grouping Order

1. **Project structure** — directory layout patterns with ASCII tree examples, file co-location conventions
2. **File organization** — file length, one-export-per-file, barrel files
3. **Naming conventions** — files, functions, variables, classes, constants
4. **Function/module design** — size, parameters, return patterns, exports
5. **Error handling** — validation, custom errors, try/catch, error propagation
6. **Testing** — framework, structure, naming, mocking, assertion style, what to test and what NOT to test (use strong enforcement language)
7. **Logging** — library, levels, what to log
8. **Code style** — comments, formatting choices, import order
9. **Framework/language-specific** — patterns unique to the stack

## Example Output

Below is an example of a well-formed `rules.md` for a Node.js/TypeScript API project:

```markdown
## Your Role and Engineering Ethos

You are a senior staff engineer building a focused, testable codebase. You value separation of concerns — each file does one thing — and you trust your type system and tests to catch mistakes rather than defensive coding.

## Description

OrderFlow is a TypeScript REST API built with Express and Prisma that handles order processing and inventory management for an e-commerce platform.

## General Engineering Directions

Keep these in mind as we work together:

- Organize each feature as a self-contained directory following this structure:
  ```
  feature-name/
  ├── index.ts              # public API (re-exports)
  ├── featureName.service.ts
  ├── featureName.types.ts
  ├── featureName.validation.ts  # (if needed)
  └── __tests__/
      └── featureName.service.test.ts
  ```
- Keep files under 200 lines. If a file grows beyond that, split it by responsibility.
- Export a single function or class per file. Supporting helpers go in adjacent files within the same directory.
- Use an index file to re-export the public API of each directory. Internal files are not exported.
- Name files in camelCase. Classes use PascalCase file names matching the class name.
- Prefix boolean-returning functions with `is` or `has`. Prefix data-fetching functions with `get`. Prefix mutation functions with `create`, `update`, or `delete`.
- Use early returns for validation and guard clauses. Do not nest beyond 2 levels — flatten with guard clauses or extract helpers.
- Keep functions under 30 lines. Extract named helpers for distinct logical steps.
- Accept no more than 3 parameters per function. Use an options object for additional configuration.
- Throw custom error classes (`NotFoundError`, `ValidationError`) with a machine-readable `code` property. Do not throw generic `Error` with string-only messages.
- Validate inputs at the boundary (controller/handler level). Inner services trust their inputs.
- Always place tests in a `__tests__/` directory mirroring the source structure. Always name test files `<source>.test.ts`.
- Always use `describe` blocks for the unit under test and `it` blocks for each behavior. Always write test names as plain English sentences describing the expected behavior.
- Always mock external dependencies (database, HTTP clients) at the module boundary using `jest.mock`. Never mock the unit under test — this tests mock behavior, not real behavior.
- Always test the public API of each module. Never test implementation details like internal method calls or private state.
- Never test log statements. Logs are operational, not functional.
- Never add test-only methods or flags to production code. If something is hard to test, refactor the design — don't pollute the interface.
- Use the `pino` logger. Log at `info` for key milestones, `warn` for unexpected-but-handled situations, `error` for failures with stack traces, `debug` for diagnostic detail.
- Organize imports in three groups separated by blank lines: Node.js builtins, external packages, internal modules.
- Use named exports exclusively. Do not use default exports.
- Use `async/await` for all asynchronous code. Do not use `.then()` chains or callback-style patterns.
- Use `interface` for object shapes that are extended or implemented. Use `type` for unions, intersections, and aliases.
- Enable `strict: true` in tsconfig. Do not use `any` — use `unknown` and narrow with type guards.
- Avoid monolithic functions that mix validation, business logic, and persistence in a single body. Extract each concern into its own function.
```
