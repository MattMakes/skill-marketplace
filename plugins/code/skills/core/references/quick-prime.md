# Quick mode: read the key files, build nothing

Adapted from the former `dev:prime` skill, which v3 folded into `code:core`. Use it when graphify cannot be installed, when the user
declines the install, or when they want a fast read-only look. It writes nothing: no graph, no
hooks, no instruction files. The cost is that the next session pays it again.

## 1. List the tree

Run whichever is available:

```bash
git ls-files            # tracked files, respects .gitignore
tree -I 'node_modules|dist|build'
eza . --git-ignore --tree
```

## 2. Rules

- Never read `node_modules/`, `dist/`, `build/` or other generated output.
- Skip `ai_docs/`. It holds working notes from earlier sessions (designs, plans, reviews) that
  are often stale; read one only when the task names it.
- Check a file's length first. Over 500 lines, read the first 500 only.
- Read the root `AGENTS.md` if one exists; it already states what the rest of this list would
  tell you about build and test.
- Skip tests while priming. Read them when you work on the feature they cover.

## 3. Reading order

1. Configuration and manifests (`package.json`, `tsconfig.json`, `*.sln`, `go.mod`,
   `pyproject.toml`, ...).
2. Entry points (`index.ts`, `Program.cs`, `main.go`, `app.py`, ...).
3. At most 15–20 source files, in this priority:
   - files at the root of `src/` or `cmd/`;
   - files named `*service*`, `*controller*`, `*handler*`, `*middleware*`;
   - index files that show a module's structure and exports.

With more than 20 source files, list the structure and summarise what each directory holds
instead of reading every file.

## 4. Where to look, by project type

| Type | Look at first |
|---|---|
| Node (JavaScript) | `package.json`, `package-lock.json`, `*.config.{js,cjs,mjs}`, `{src,server,app,lib}/`, `README.md`, `Dockerfile` |
| TypeScript Node | as Node, plus `tsconfig.json`, `*.config.ts`; source under `src/` |
| Next.js | `package.json`, `next.config.{js,mjs}`, `tsconfig.json`, `app/`, `pages/`, `components/`, `lib/`, `README.md`, `Dockerfile` |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py`, `{main,app}.py`, `**/__init__.py`, `src/`, `README.md`, `Dockerfile` |
| C# (.NET) | `*.sln`, `**/*.csproj`, `appsettings*.json`, `Program.cs`, `Startup.cs`, `**/DependencyRegistration.cs`, `README.md`, `Dockerfile` |
| Go | `go.mod`, `cmd/*/main.go`, `internal/`, `pkg/`, `Makefile`, `README.md`, `Dockerfile` |

The directories are where to look, not a list to read whole; the 15–20 file cap still holds.

## 5. Report

Say what the project is, its stack, how to build and test it, the main directories and what
each holds, and that this was a quick prime with no graph. If the repository will be worked in
again, suggest the full mode.
