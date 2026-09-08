---
name: prime
description: Load project context by reading key files based on project type to quickly understand any codebase
---

# Context Prime

> Follow the instructions to understand the context of the project.

## Run the following command (whichever is available on this machine)

```bash
git ls-files
```

```bash
tree
```

```bash
eza . --git-ignore --tree
```

## Read the following files

> Read the files below and nothing else.
> NEVER read the `ai_docs` folder.
> NEVER read the `/dist`, `node_modules`, or `build` folders.
> Check the file length first, if the file is larger than 500 lines long, only read the first 500 lines.

## Reading Strategy

- Read configuration files first (package.json, tsconfig.json, *.sln, go.mod, etc.)
- Read entry points and main files next (index.ts, Program.cs, main.go, app.py)
- Read at most 15-20 source files — prioritize by:
  - Files in the root of src/ or cmd/ (likely entry points)
  - Files with "service", "controller", "handler", "middleware" in the name
  - Index files that show module structure and exports
- Skip test files during priming — read them when working on specific features
- If the project has more than 20 source files, list the structure and summarize what each directory contains rather than reading every file

### For NodeJS Projects (JavaScript)

*   `package.json`
*   `package-lock.json`
*   `{src,server,app,lib}/**/*`
*   `{test,tests,spec,__tests__}/**/*`
*   `*.config.{js,cjs,mjs}`
*   `README.md`
*   `Dockerfile`

### For TypeScript NodeJS Projects

*   `package.json`
*   `package-lock.json`
*   `tsconfig.json`
*   `{src}/**/*`
*   `{test,tests,spec,__tests__}/**/*`
*   `*.config.{js,ts,cjs,mjs}`
*   `README.md`
*   `Dockerfile`

### For Next.js Projects

*   `package.json`
*   `next.config.{js,mjs}`
*   `tsconfig.json`
*   `app/**/*`
*   `pages/**/*`
*   `components/**/*`
*   `lib/**/*`
*   `public/**/*`
*   `styles/**/*`
*   `README.md`
*   `Dockerfile`

### For Python Projects

*   `pyproject.toml`
*   `requirements.txt`
*   `setup.py`
*   `src/**/*`
*   `{tests,test}/**/*`
*   `**/__init__.py`
*   `{main,app}.py`
*   `README.md`
*   `Dockerfile`

### For C# Projects (.NET)

*   `*.sln`
*   `**/*.csproj`
*   `appsettings*.json`
*   `Program.cs`
*   `Startup.cs`
*   `**/DependencyRegistration.cs`
*   `**/*Tests*/**/*.cs`
*   `README.md`
*   `Dockerfile`

