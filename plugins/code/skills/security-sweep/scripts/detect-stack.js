#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newRunId, runPaths } from './lib/run-paths.js';

export const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
  '.venv', 'venv', '__pycache__', 'target', 'vendor', '.gradle',
  'bin', 'obj', '.idea', '.vscode', 'coverage', '.cache', '.turbo',
]);

export const MANIFESTS = [
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'requirements.txt', 'pyproject.toml', 'Pipfile', 'Pipfile.lock',
  'setup.py', 'setup.cfg', 'poetry.lock',
  'go.mod', 'go.sum',
  'Cargo.toml', 'Cargo.lock',
  'pom.xml', 'build.gradle', 'build.gradle.kts',
  'Gemfile', 'Gemfile.lock',
  'composer.json', 'composer.lock',
  // .NET (exact filenames; *.csproj/*.sln/etc. handled via MANIFEST_GLOBS)
  'Directory.Packages.props', 'Directory.Build.props', 'Directory.Build.targets',
  'global.json', 'nuget.config', 'NuGet.config', 'packages.config',
  'paket.dependencies', 'paket.lock', 'packages.lock.json',
];

export const MANIFEST_GLOBS = [
  '*.csproj', '*.fsproj', '*.vbproj', '*.sln',
];

export const FRAMEWORK_MARKERS = {
  js: { react: 'react', next: 'next', vue: 'vue', nuxt: 'nuxt', svelte: 'svelte', express: 'express', fastify: 'fastify', koa: 'koa', nestjs: '@nestjs/core', hono: 'hono' },
  py: { django: 'django', flask: 'flask', fastapi: 'fastapi', starlette: 'starlette', tornado: 'tornado', aiohttp: 'aiohttp' },
  go: { gin: 'github.com/gin-gonic/gin', echo: 'github.com/labstack/echo', chi: 'github.com/go-chi/chi', fiber: 'github.com/gofiber/fiber' },
  dotnet: {
    aspnetcore: 'Microsoft.AspNetCore',
    minimal_api: 'Microsoft.AspNetCore.Routing',
    blazor_server: 'Microsoft.AspNetCore.Components.Server',
    blazor_wasm: 'Microsoft.AspNetCore.Components.WebAssembly',
    ef_core: 'Microsoft.EntityFrameworkCore',
    grpc: 'Grpc.AspNetCore',
    signalr: 'Microsoft.AspNetCore.SignalR',
    masstransit: 'MassTransit',
    mediatr: 'MediatR',
    automapper: 'AutoMapper',
    dapper: 'Dapper',
    serilog: 'Serilog',
    azure_functions: 'Microsoft.Azure.Functions',
    semantic_kernel: 'Microsoft.SemanticKernel',
  },
};

export const LLM_SDKS = [
  'anthropic', '@anthropic-ai/sdk', '@anthropic-ai/claude-agent-sdk',
  'openai', 'langchain', 'llamaindex', 'cohere', 'mistralai', 'google-generativeai',
  '@aws-sdk/client-bedrock-runtime',
  // .NET
  'Azure.AI.OpenAI', 'Microsoft.SemanticKernel', 'Anthropic.SDK', 'OpenAI',
];

// Cheap glob: only supports leading "*.<ext>" patterns. Matches against basename.
function globMatchesBasename(pattern, basename) {
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1); // ".csproj"
    return basename.toLowerCase().endsWith(ext.toLowerCase());
  }
  return basename === pattern;
}

export async function walkShallow(root, maxDepth = 3) {
  const out = [];
  async function visit(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') && e.name !== '.github' && e.name !== '.circleci' && e.name !== '.gitlab-ci.yml' && e.name !== '.buildkite' && e.name !== '.claude' && e.name !== '.claude-plugin') continue;
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(root, full);
      if (e.isDirectory()) { out.push({ path: rel, type: 'dir' }); await visit(full, depth + 1); }
      else { out.push({ path: rel, type: 'file' }); }
    }
  }
  await visit(root, 0);
  return out;
}

export async function readJsonSafe(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); }
  catch { return null; }
}

export async function readTextSafe(filePath) {
  try { return await fs.readFile(filePath, 'utf8'); }
  catch { return null; }
}

export function detectFromPackageJson(pkg) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const frameworks = [];
  for (const [name, marker] of Object.entries(FRAMEWORK_MARKERS.js)) {
    if (deps[marker]) frameworks.push(name);
  }
  const llmSdks = LLM_SDKS.filter((sdk) => deps[sdk]).map((sdk) => `${sdk}@${deps[sdk]}`);
  return { frameworks, llmSdks };
}

export function detectFromRequirements(text) {
  const lines = text.split(/\r?\n/).map((l) => l.split(/[<>=!]/)[0].trim().toLowerCase()).filter(Boolean);
  const set = new Set(lines);
  const frameworks = Object.entries(FRAMEWORK_MARKERS.py).filter(([, marker]) => set.has(marker)).map(([name]) => name);
  const llmSdks = LLM_SDKS.filter((sdk) => set.has(sdk.toLowerCase()));
  return { frameworks, llmSdks };
}

export function detectFromGoMod(text) {
  const frameworks = [];
  for (const [name, marker] of Object.entries(FRAMEWORK_MARKERS.go)) {
    if (text.includes(marker)) frameworks.push(name);
  }
  return { frameworks, llmSdks: [] };
}

export function detectFromCsproj(text) {
  const frameworks = [];
  const llmSdks = [];
  if (!text) return { frameworks, llmSdks };
  // Find all PackageReference Include="..." attributes (also matches central package versions).
  const includeRe = /Include\s*=\s*"([^"]+)"/gi;
  const includes = new Set();
  let m;
  while ((m = includeRe.exec(text)) !== null) includes.add(m[1]);
  for (const [name, marker] of Object.entries(FRAMEWORK_MARKERS.dotnet)) {
    for (const inc of includes) {
      if (inc === marker || inc.startsWith(marker + '.') || inc === marker) {
        frameworks.push(name);
        break;
      }
    }
  }
  // Dedup frameworks while preserving discovery order.
  const seenF = new Set();
  const dedupedFrameworks = frameworks.filter((f) => (seenF.has(f) ? false : seenF.add(f)));
  for (const sdk of LLM_SDKS) {
    if (!includes.has(sdk)) continue;
    // Best-effort: capture the Version attribute on the same PackageReference element.
    const escaped = sdk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const verRe = new RegExp(`Include\\s*=\\s*"${escaped}"[^>]*?Version\\s*=\\s*"([^"]+)"`, 'i');
    const verMatch = text.match(verRe);
    llmSdks.push(verMatch ? `${sdk}@${verMatch[1]}` : sdk);
  }
  return { frameworks: dedupedFrameworks, llmSdks };
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run-id') out.runId = argv[++i];
    else if (a === '--repo-root') out.repoRoot = argv[++i];
  }
  return out;
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const runId = args.runId || newRunId();
  const repoRoot = args.repoRoot || process.cwd();
  const paths = runPaths(runId, repoRoot);

  const tree = await walkShallow(repoRoot, 3);
  const fileSet = new Set(tree.filter((e) => e.type === 'file').map((e) => e.path));
  const dirSet = new Set(tree.filter((e) => e.type === 'dir').map((e) => e.path));

  const manifestFiles = MANIFESTS.filter((m) => fileSet.has(m));
  // Glob-aware additions: walk tree, match basenames against MANIFEST_GLOBS.
  for (const e of tree) {
    if (e.type !== 'file') continue;
    const base = path.basename(e.path);
    for (const g of MANIFEST_GLOBS) {
      if (globMatchesBasename(g, base)) { manifestFiles.push(e.path); break; }
    }
  }

  let primaryLanguage = 'none';
  const secondaryLanguages = [];
  const frameworks = new Set();
  const packageManagers = new Set();
  const llmSdksDetected = new Set();

  if (manifestFiles.includes('package.json')) {
    primaryLanguage = primaryLanguage === 'none' ? 'javascript' : primaryLanguage;
    if (manifestFiles.includes('package-lock.json')) packageManagers.add('npm');
    if (manifestFiles.includes('pnpm-lock.yaml')) packageManagers.add('pnpm');
    if (manifestFiles.includes('yarn.lock')) packageManagers.add('yarn');
    if (packageManagers.size === 0) packageManagers.add('npm');
    const pkg = await readJsonSafe(path.join(repoRoot, 'package.json'));
    if (pkg) {
      const d = detectFromPackageJson(pkg);
      d.frameworks.forEach((f) => frameworks.add(f));
      d.llmSdks.forEach((s) => llmSdksDetected.add(s));
    }
  }
  if (manifestFiles.includes('tsconfig.json') || tree.some((e) => e.path.endsWith('.ts') || e.path.endsWith('.tsx'))) {
    if (primaryLanguage === 'javascript' || primaryLanguage === 'none') primaryLanguage = 'typescript';
  }
  if (manifestFiles.some((m) => ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'].includes(m))) {
    if (primaryLanguage === 'none') primaryLanguage = 'python'; else secondaryLanguages.push('python');
    packageManagers.add('pip');
    const reqText = await readTextSafe(path.join(repoRoot, 'requirements.txt'));
    if (reqText) {
      const d = detectFromRequirements(reqText);
      d.frameworks.forEach((f) => frameworks.add(f));
      d.llmSdks.forEach((s) => llmSdksDetected.add(s));
    }
  }
  if (manifestFiles.includes('go.mod')) {
    if (primaryLanguage === 'none') primaryLanguage = 'go'; else secondaryLanguages.push('go');
    packageManagers.add('go-modules');
    const goMod = await readTextSafe(path.join(repoRoot, 'go.mod'));
    if (goMod) {
      const d = detectFromGoMod(goMod);
      d.frameworks.forEach((f) => frameworks.add(f));
    }
  }
  if (manifestFiles.includes('Cargo.toml')) {
    if (primaryLanguage === 'none') primaryLanguage = 'rust'; else secondaryLanguages.push('rust');
    packageManagers.add('cargo');
  }
  if (manifestFiles.includes('pom.xml') || manifestFiles.some((m) => m.startsWith('build.gradle'))) {
    if (primaryLanguage === 'none') primaryLanguage = 'java'; else secondaryLanguages.push('java');
    packageManagers.add(manifestFiles.includes('pom.xml') ? 'maven' : 'gradle');
  }

  const dotnetExactNames = new Set([
    'Directory.Packages.props', 'global.json', 'nuget.config', 'NuGet.config',
    'packages.config', 'paket.dependencies',
  ]);
  const hasDotnetProject = manifestFiles.some((m) =>
    /\.(csproj|fsproj|vbproj|sln)$/i.test(m)
    || dotnetExactNames.has(path.basename(m))
  );
  if (hasDotnetProject) {
    if (primaryLanguage === 'none') primaryLanguage = 'dotnet';
    else secondaryLanguages.push('dotnet');
    packageManagers.add('nuget');
    const csprojPaths = tree
      .filter((e) => e.type === 'file' && /\.csproj$/i.test(e.path))
      .map((e) => e.path);
    for (const rel of csprojPaths) {
      const text = await readTextSafe(path.join(repoRoot, rel));
      if (!text) continue;
      const d = detectFromCsproj(text);
      d.frameworks.forEach((f) => frameworks.add(f));
      d.llmSdks.forEach((s) => llmSdksDetected.add(s));
    }
    const propsText = await readTextSafe(path.join(repoRoot, 'Directory.Packages.props'));
    if (propsText) {
      const d = detectFromCsproj(propsText);
      d.frameworks.forEach((f) => frameworks.add(f));
      d.llmSdks.forEach((s) => llmSdksDetected.add(s));
    }
  }

  const deploymentTargets = [];
  if (tree.some((e) => /(^|\/)Dockerfile/.test(e.path))) deploymentTargets.push('docker');
  if (tree.some((e) => e.path.endsWith('.tf'))) deploymentTargets.push('terraform');
  if (fileSet.has('serverless.yml') || fileSet.has('template.yaml') || fileSet.has('samconfig.toml')) deploymentTargets.push('serverless');
  if (dirSet.has('kubernetes') || dirSet.has('k8s')) deploymentTargets.push('kubernetes');
  if (fileSet.has('vercel.json')) deploymentTargets.push('vercel');
  if (fileSet.has('netlify.toml')) deploymentTargets.push('netlify');
  if (fileSet.has('cdk.json')) deploymentTargets.push('aws-cdk');

  let ciProvider = 'none';
  if (dirSet.has('.github')) {
    const wf = await fs.readdir(path.join(repoRoot, '.github', 'workflows')).catch(() => []);
    if (wf.length > 0) ciProvider = 'github_actions';
  }
  if (fileSet.has('.gitlab-ci.yml')) ciProvider = 'gitlab';
  if (dirSet.has('.circleci')) ciProvider = 'circleci';
  if (fileSet.has('azure-pipelines.yml')) ciProvider = 'azure_pipelines';
  if (fileSet.has('Jenkinsfile')) ciProvider = 'jenkins';
  if (fileSet.has('bitbucket-pipelines.yml')) ciProvider = 'bitbucket';

  const dockerfiles = tree.filter((e) => /(^|\/)Dockerfile/.test(e.path) && e.type === 'file').map((e) => e.path);
  const baseImages = [];
  for (const df of dockerfiles) {
    const text = await readTextSafe(path.join(repoRoot, df));
    if (!text) continue;
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*FROM\s+([^\s]+)/i);
      if (m) baseImages.push(m[1]);
    }
  }

  const skillPaths = [];
  if (dirSet.has('.claude/skills') || dirSet.has(path.join('.claude', 'skills'))) skillPaths.push('.claude/skills/');
  if (dirSet.has('.claude/agents') || dirSet.has(path.join('.claude', 'agents'))) skillPaths.push('.claude/agents/');
  if (dirSet.has('plugins')) {
    const pluginsDir = path.join(repoRoot, 'plugins');
    const pluginEntries = await fs.readdir(pluginsDir, { withFileTypes: true }).catch(() => []);
    for (const p of pluginEntries) {
      if (!p.isDirectory()) continue;
      const skillsDir = path.join(pluginsDir, p.name, 'skills');
      const agentsDir = path.join(pluginsDir, p.name, 'agents');
      if (existsSync(skillsDir)) skillPaths.push(`plugins/${p.name}/skills/`);
      if (existsSync(agentsDir)) skillPaths.push(`plugins/${p.name}/agents/`);
    }
  }

  const fileCount = tree.filter((e) => e.type === 'file').length;

  const notable = [];
  if (manifestFiles.includes('pnpm-lock.yaml') && tree.some((e) => e.path === 'pnpm-workspace.yaml')) notable.push('pnpm workspaces');
  if (dirSet.has('apps') && dirSet.has('packages')) notable.push('monorepo (apps/ + packages/)');
  if (primaryLanguage === 'dotnet') {
    const slnCount = manifestFiles.filter((m) => /\.sln$/i.test(m)).length;
    const csprojCount = manifestFiles.filter((m) => /\.csproj$/i.test(m)).length;
    if (slnCount >= 1 && csprojCount > 1) notable.push('multi-project .NET solution');
  }
  if (primaryLanguage === 'none' && skillPaths.length > 0) notable.push('plugin/skill repository (no application code)');
  if (primaryLanguage === 'none') notable.push('docs-only repo');

  const profile = {
    run_id: runId,
    primary_language: primaryLanguage,
    secondary_languages: [...new Set(secondaryLanguages)],
    frameworks: [...frameworks].sort(),
    package_managers: [...packageManagers].sort(),
    manifest_files: manifestFiles,
    llm_sdks_present: llmSdksDetected.size > 0,
    llm_sdks_detected: [...llmSdksDetected].sort(),
    deployment_targets: deploymentTargets,
    ci_provider: ciProvider,
    container_runtime: { dockerfiles, base_images: [...new Set(baseImages)] },
    skill_files_present: skillPaths.length > 0,
    skill_paths: skillPaths,
    repo_size_files: fileCount,
    notable,
  };

  await fs.mkdir(paths.root, { recursive: true });
  await fs.writeFile(paths.stackProfile, JSON.stringify(profile, null, 2) + '\n', 'utf8');
  process.stdout.write(`RUN_ID=${runId}\nWROTE ${paths.stackProfile}\n`);
  return profile;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => { process.stderr.write(`ERROR ${err.message}\n`); process.exit(1); });
}
