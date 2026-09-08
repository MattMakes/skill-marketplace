#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  parseArgs, walkShallow, readJsonSafe, readTextSafe,
  detectFromPackageJson, detectFromRequirements, detectFromGoMod, detectFromCsproj,
  MANIFEST_GLOBS, main,
} from './detect-stack.js';
import { runPaths } from './lib/run-paths.js';

const tests = [];
const t = (name, fn) => tests.push({ name, fn });
const eq = (a, b, m) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${m || 'eq'}: expected ${B}, got ${A}`);
};
const ok = (v, m) => { if (!v) throw new Error(m || 'expected truthy'); };
const tmp = async () => fs.mkdtemp(path.join(os.tmpdir(), 'detect-stack-spec-'));
const cleanup = async (d) => { try { await fs.rm(d, { recursive: true, force: true }); } catch {} };

const captureStdout = async (fn) => {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = '';
  process.stdout.write = (s) => { buf += s; return true; };
  try { await fn(); } finally { process.stdout.write = orig; }
  return buf;
};

async function writeFile(root, rel, content = '') {
  const fp = path.join(root, rel);
  await fs.mkdir(path.dirname(fp), { recursive: true });
  await fs.writeFile(fp, content, 'utf8');
}

t('parseArgs handles --run-id and --repo-root', () => {
  eq(parseArgs(['n', 'x', '--run-id', 'r', '--repo-root', '/r']), { runId: 'r', repoRoot: '/r' });
  eq(parseArgs(['n', 'x']), {});
});

t('readJsonSafe returns null on missing file and on bad JSON; parses valid JSON', async () => {
  const d = await tmp();
  try {
    eq(await readJsonSafe(path.join(d, 'missing.json')), null);
    await writeFile(d, 'a.json', 'not json');
    eq(await readJsonSafe(path.join(d, 'a.json')), null);
    await writeFile(d, 'b.json', '{"x":1}');
    eq(await readJsonSafe(path.join(d, 'b.json')), { x: 1 });
  } finally { await cleanup(d); }
});

t('readTextSafe returns null on missing file and string on present file', async () => {
  const d = await tmp();
  try {
    eq(await readTextSafe(path.join(d, 'missing.txt')), null);
    await writeFile(d, 'a.txt', 'hello');
    eq(await readTextSafe(path.join(d, 'a.txt')), 'hello');
  } finally { await cleanup(d); }
});

t('walkShallow returns [] when root cannot be read', async () => {
  // Pointing at a non-existent path triggers the readdir catch branch.
  eq(await walkShallow('/nope/does/not/exist/at/all'), []);
});

t('walkShallow respects maxDepth and skips ignored dirs and dot-dirs except allowlisted', async () => {
  const d = await tmp();
  try {
    // Allowed: .github, .circleci, .claude, .claude-plugin → kept as dirs.
    // Disallowed: .private → skipped (starts with dot, not allowlisted).
    // Skipped: node_modules, dist → in SKIP_DIRS.
    await writeFile(d, '.github/workflows/ci.yml', '');
    await writeFile(d, '.private/secret.txt', '');
    await writeFile(d, 'node_modules/lodash/index.js', '');
    await writeFile(d, 'dist/bundle.js', '');
    await writeFile(d, 'a/b/c/d/e/deep.js', ''); // deeper than maxDepth=3
    await writeFile(d, 'shallow.js', '');
    const out = await walkShallow(d, 3);
    const paths = out.map((e) => e.path);
    ok(paths.includes('shallow.js'), 'expected shallow.js in walk');
    ok(paths.includes('.github'), 'expected .github dir kept');
    ok(paths.some((p) => p.startsWith('.github/')), 'expected files inside .github');
    ok(!paths.some((p) => p.startsWith('.private')), 'expected .private skipped');
    ok(!paths.some((p) => p.startsWith('node_modules')), 'expected node_modules skipped');
    ok(!paths.some((p) => p.startsWith('dist')), 'expected dist skipped');
    // Depth limit: at depth 3 we visit a/b/c, but its children at depth 4 are not added.
    ok(!paths.some((p) => p.startsWith('a/b/c/d/')), `expected depth>3 pruned, got ${paths.filter((p) => p.startsWith('a/b/c'))}`);
  } finally { await cleanup(d); }
});

t('detectFromPackageJson detects frameworks from deps and devDeps and pins LLM SDK versions', () => {
  const pkg = {
    dependencies: { react: '^18', express: '^4', '@anthropic-ai/sdk': '^0.30' },
    devDependencies: { next: '^14' },
  };
  const r = detectFromPackageJson(pkg);
  ok(r.frameworks.includes('react'));
  ok(r.frameworks.includes('express'));
  ok(r.frameworks.includes('next'));
  eq(r.llmSdks, ['@anthropic-ai/sdk@^0.30']);
});

t('detectFromPackageJson handles empty/missing deps', () => {
  const r = detectFromPackageJson({});
  eq(r.frameworks, []);
  eq(r.llmSdks, []);
});

t('detectFromRequirements parses version specifiers and detects frameworks + LLM SDKs', () => {
  const text = 'Django==4.2\nflask>=2.0\nopenai\n# comment\nfastapi!=0.5\n\n';
  const r = detectFromRequirements(text);
  ok(r.frameworks.includes('django'));
  ok(r.frameworks.includes('flask'));
  ok(r.frameworks.includes('fastapi'));
  ok(r.llmSdks.includes('openai'));
});

t('detectFromGoMod scans for known Go web frameworks', () => {
  const text = 'module x\nrequire github.com/gin-gonic/gin v1.0\nrequire github.com/labstack/echo v4.0\n';
  const r = detectFromGoMod(text);
  ok(r.frameworks.includes('gin'));
  ok(r.frameworks.includes('echo'));
  eq(r.llmSdks, []);
});

t('main: defaults runId via newRunId when not provided and writes stack profile', async () => {
  const d = await tmp();
  try {
    let profile;
    const out = await captureStdout(async () => {
      profile = await main(['node', 'x', '--repo-root', d]);
    });
    ok(out.startsWith('RUN_ID='));
    eq(profile.primary_language, 'none');
    ok(profile.notable.includes('docs-only repo'));
    // Stack profile file actually written.
    const written = JSON.parse(await fs.readFile(runPaths(profile.run_id, d).stackProfile, 'utf8'));
    eq(written.run_id, profile.run_id);
  } finally { await cleanup(d); }
});

t('main: javascript repo with package-lock + tsconfig + .ts files → typescript primary, npm pkgManager', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', JSON.stringify({ dependencies: { react: '^18' } }));
    await writeFile(d, 'package-lock.json', '{}');
    await writeFile(d, 'tsconfig.json', '{}');
    await writeFile(d, 'src/app.ts', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r1', '--repo-root', d]); });
    eq(profile.primary_language, 'typescript');
    eq(profile.package_managers, ['npm']);
    ok(profile.frameworks.includes('react'));
  } finally { await cleanup(d); }
});

t('main: detects pnpm via lock file and pnpm-workspace.yaml notable monorepo', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'pnpm-lock.yaml', '');
    await writeFile(d, 'pnpm-workspace.yaml', '');
    await writeFile(d, 'apps/web/index.js', '');
    await writeFile(d, 'packages/lib/index.js', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.package_managers.includes('pnpm'));
    ok(profile.notable.includes('pnpm workspaces'));
    ok(profile.notable.includes('monorepo (apps/ + packages/)'));
  } finally { await cleanup(d); }
});

t('main: yarn lock falls into yarn package manager', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'yarn.lock', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.package_managers.includes('yarn'));
  } finally { await cleanup(d); }
});

t('main: python project with requirements.txt picks up frameworks + LLM SDKs', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'requirements.txt', 'flask==2.3\nopenai\n');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'python');
    ok(profile.package_managers.includes('pip'));
    ok(profile.frameworks.includes('flask'));
    eq(profile.llm_sdks_present, true);
    ok(profile.llm_sdks_detected.includes('openai'));
  } finally { await cleanup(d); }
});

t('main: python becomes a secondary language when JS already primary', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'requirements.txt', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'javascript');
    ok(profile.secondary_languages.includes('python'));
  } finally { await cleanup(d); }
});

t('main: go.mod sets primary language go and detects gin', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'go.mod', 'module x\nrequire github.com/gin-gonic/gin v1.0\n');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'go');
    ok(profile.package_managers.includes('go-modules'));
    ok(profile.frameworks.includes('gin'));
  } finally { await cleanup(d); }
});

t('main: go becomes secondary when JS already primary', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'go.mod', 'module x\n');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'javascript');
    ok(profile.secondary_languages.includes('go'));
  } finally { await cleanup(d); }
});

t('main: Cargo.toml sets primary language rust', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'Cargo.toml', '[package]\nname="x"');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'rust');
    ok(profile.package_managers.includes('cargo'));
  } finally { await cleanup(d); }
});

t('main: Cargo.toml is a secondary language when JS already primary', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'Cargo.toml', '[package]\nname="x"');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'javascript');
    ok(profile.secondary_languages.includes('rust'));
  } finally { await cleanup(d); }
});

t('main: pom.xml triggers java/maven', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'pom.xml', '<project/>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'java');
    ok(profile.package_managers.includes('maven'));
  } finally { await cleanup(d); }
});

t('main: build.gradle triggers java/gradle as secondary when JS primary', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'build.gradle', 'plugins {}');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.secondary_languages.includes('java'));
    ok(profile.package_managers.includes('gradle'));
  } finally { await cleanup(d); }
});

t('main: detects deployment targets — docker, terraform, serverless, kubernetes, vercel, netlify, aws-cdk', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'Dockerfile', 'FROM node:20\nFROM alpine:3.19\n');
    await writeFile(d, 'infra/main.tf', '');
    await writeFile(d, 'serverless.yml', '');
    await writeFile(d, 'kubernetes/manifest.yaml', '');
    await writeFile(d, 'vercel.json', '{}');
    await writeFile(d, 'netlify.toml', '');
    await writeFile(d, 'cdk.json', '{}');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.deployment_targets.includes('docker'));
    ok(profile.deployment_targets.includes('terraform'));
    ok(profile.deployment_targets.includes('serverless'));
    ok(profile.deployment_targets.includes('kubernetes'));
    ok(profile.deployment_targets.includes('vercel'));
    ok(profile.deployment_targets.includes('netlify'));
    ok(profile.deployment_targets.includes('aws-cdk'));
    eq(profile.container_runtime.dockerfiles, ['Dockerfile']);
    eq(profile.container_runtime.base_images, ['node:20', 'alpine:3.19']);
  } finally { await cleanup(d); }
});

t('main: serverless via template.yaml is also recognised', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'template.yaml', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.deployment_targets.includes('serverless'));
  } finally { await cleanup(d); }
});

t('main: serverless via samconfig.toml is also recognised', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'samconfig.toml', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.deployment_targets.includes('serverless'));
  } finally { await cleanup(d); }
});

t('main: kubernetes via "k8s" dir is also recognised', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'k8s/manifest.yaml', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    ok(profile.deployment_targets.includes('kubernetes'));
  } finally { await cleanup(d); }
});

t('main: github_actions detected when .github/workflows/* exists', async () => {
  const d = await tmp();
  try {
    await writeFile(d, '.github/workflows/ci.yml', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.ci_provider, 'github_actions');
  } finally { await cleanup(d); }
});

t('main: empty .github/workflows directory does NOT count as github_actions', async () => {
  const d = await tmp();
  try {
    // Create the workflows dir but no files inside.
    await fs.mkdir(path.join(d, '.github', 'workflows'), { recursive: true });
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.ci_provider, 'none');
  } finally { await cleanup(d); }
});

t('main: detects gitlab/circleci/azure/jenkins/bitbucket CI providers', async () => {
  for (const [marker, expected] of [
    ['.gitlab-ci.yml', 'gitlab'],
    ['.circleci/config.yml', 'circleci'],
    ['azure-pipelines.yml', 'azure_pipelines'],
    ['Jenkinsfile', 'jenkins'],
    ['bitbucket-pipelines.yml', 'bitbucket'],
  ]) {
    const d = await tmp();
    try {
      await writeFile(d, marker, '');
      let profile;
      await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
      eq(profile.ci_provider, expected, `marker ${marker}`);
    } finally { await cleanup(d); }
  }
});

t('main: dockerfile without FROM line yields empty base_images', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'Dockerfile', '# no FROM\nRUN echo hi\n');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.container_runtime.base_images, []);
  } finally { await cleanup(d); }
});

t('main: skill files in .claude/skills + plugins/<name>/{skills,agents}', async () => {
  const d = await tmp();
  try {
    await writeFile(d, '.claude/skills/x/SKILL.md', '');
    await writeFile(d, '.claude/agents/y.md', '');
    await writeFile(d, 'plugins/foo/skills/SKILL.md', '');
    await writeFile(d, 'plugins/bar/agents/agent.md', '');
    // Non-directory entry inside plugins/ to exercise the "if (!p.isDirectory()) continue" branch.
    await writeFile(d, 'plugins/README.md', '');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.skill_files_present, true);
    ok(profile.skill_paths.includes('.claude/skills/'));
    ok(profile.skill_paths.includes('.claude/agents/'));
    ok(profile.skill_paths.includes('plugins/foo/skills/'));
    ok(profile.skill_paths.includes('plugins/bar/agents/'));
    // notable should mention plugin/skill repo since primary_language is none.
    ok(profile.notable.includes('plugin/skill repository (no application code)'));
  } finally { await cleanup(d); }
});

t('main: docs-only repo without skills produces "docs-only repo" notable', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'README.md', '# hi');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'none');
    ok(profile.notable.includes('docs-only repo'));
  } finally { await cleanup(d); }
});

t('detectFromCsproj: empty/falsy text returns empty result', () => {
  eq(detectFromCsproj(''), { frameworks: [], llmSdks: [] });
  eq(detectFromCsproj(null), { frameworks: [], llmSdks: [] });
  eq(detectFromCsproj(undefined), { frameworks: [], llmSdks: [] });
});

t('detectFromCsproj: PackageReference Microsoft.AspNetCore.App detects aspnetcore', () => {
  const text = '<Project><ItemGroup><PackageReference Include="Microsoft.AspNetCore.App" Version="8.0.0" /></ItemGroup></Project>';
  const r = detectFromCsproj(text);
  ok(r.frameworks.includes('aspnetcore'), 'expected aspnetcore framework');
});

t('detectFromCsproj: multiple PackageReferences detect all frameworks deduped', () => {
  const text = `<Project><ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.App" Version="8.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
    <PackageReference Include="Grpc.AspNetCore" Version="2.60.0" />
    <PackageReference Include="MassTransit" Version="8.0.0" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
  </ItemGroup></Project>`;
  const r = detectFromCsproj(text);
  ok(r.frameworks.includes('aspnetcore'), 'expected aspnetcore');
  ok(r.frameworks.includes('ef_core'), 'expected ef_core');
  ok(r.frameworks.includes('grpc'), 'expected grpc');
  ok(r.frameworks.includes('masstransit'), 'expected masstransit');
  // Dedup: aspnetcore should appear exactly once even though two PackageReferences match its marker.
  const aspCount = r.frameworks.filter((f) => f === 'aspnetcore').length;
  eq(aspCount, 1, 'aspnetcore should be deduped to a single entry');
});

t('detectFromCsproj: Microsoft.EntityFrameworkCore is a framework, not an LLM SDK', () => {
  const text = '<Project><ItemGroup><PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" /></ItemGroup></Project>';
  const r = detectFromCsproj(text);
  ok(r.frameworks.includes('ef_core'), 'expected ef_core framework');
  eq(r.llmSdks, [], 'EF Core should not be classified as an LLM SDK');
});

t('detectFromCsproj: Azure.AI.OpenAI PackageReference captures Version into llmSdks', () => {
  const text = '<Project><ItemGroup><PackageReference Include="Azure.AI.OpenAI" Version="2.0.0" /></ItemGroup></Project>';
  const r = detectFromCsproj(text);
  ok(r.llmSdks.includes('Azure.AI.OpenAI@2.0.0'), `expected Azure.AI.OpenAI@2.0.0 in ${JSON.stringify(r.llmSdks)}`);
});

t('detectFromCsproj: OpenAI PackageReference without Version yields bare name', () => {
  const text = '<Project><ItemGroup><PackageReference Include="OpenAI" /></ItemGroup></Project>';
  const r = detectFromCsproj(text);
  ok(r.llmSdks.includes('OpenAI'), `expected bare 'OpenAI' in ${JSON.stringify(r.llmSdks)}`);
  // Should NOT be suffixed with @undefined or anything
  ok(!r.llmSdks.some((s) => s.startsWith('OpenAI@')), 'should not include a version suffix');
});

t('detectFromCsproj: marker prefix matching — JwtBearer subpackage matches aspnetcore', () => {
  const text = '<Project><ItemGroup><PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" /></ItemGroup></Project>';
  const r = detectFromCsproj(text);
  ok(r.frameworks.includes('aspnetcore'), 'expected aspnetcore from JwtBearer subpackage');
});

t('MANIFEST_GLOBS is exported as an array containing *.csproj and *.sln', () => {
  ok(Array.isArray(MANIFEST_GLOBS), 'MANIFEST_GLOBS should be an array');
  ok(MANIFEST_GLOBS.includes('*.csproj'), 'expected *.csproj in MANIFEST_GLOBS');
  ok(MANIFEST_GLOBS.includes('*.sln'), 'expected *.sln in MANIFEST_GLOBS');
});

t('main: pure .NET project (csproj) → primary dotnet, nuget pkgManager, aspnetcore framework', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'MyApi.csproj', '<Project><ItemGroup><PackageReference Include="Microsoft.AspNetCore.App" Version="8.0.0" /></ItemGroup></Project>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'dotnet');
    ok(profile.package_managers.includes('nuget'), 'expected nuget pkg manager');
    ok(profile.frameworks.includes('aspnetcore'), 'expected aspnetcore framework');
  } finally { await cleanup(d); }
});

t('main: JS-primary repo with .NET sub-project → dotnet as secondary, both pkg managers', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'package.json', '{}');
    await writeFile(d, 'package-lock.json', '{}');
    await writeFile(d, 'service/MyApi.csproj', '<Project><ItemGroup><PackageReference Include="Microsoft.AspNetCore.App" Version="8.0.0" /></ItemGroup></Project>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'javascript');
    ok(profile.secondary_languages.includes('dotnet'), 'expected dotnet secondary');
    ok(profile.package_managers.includes('npm'), 'expected npm pkg manager');
    ok(profile.package_managers.includes('nuget'), 'expected nuget pkg manager');
  } finally { await cleanup(d); }
});

t('main: multi-project .NET solution adds notable', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'MyApi.sln', '');
    await writeFile(d, 'Project1/Project1.csproj', '<Project/>');
    await writeFile(d, 'Project2/Project2.csproj', '<Project/>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'dotnet');
    ok(profile.notable.includes('multi-project .NET solution'), `expected notable in ${JSON.stringify(profile.notable)}`);
  } finally { await cleanup(d); }
});

t('main: single .csproj without .sln does NOT add multi-project notable', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'OnlyOne.csproj', '<Project/>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'dotnet');
    ok(!profile.notable.includes('multi-project .NET solution'), `should not have multi-project notable, got ${JSON.stringify(profile.notable)}`);
  } finally { await cleanup(d); }
});

t('main: global.json alone is recognised → primary_language dotnet', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'global.json', '{"sdk":{"version":"8.0.100"}}');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'dotnet');
    ok(profile.package_managers.includes('nuget'), 'expected nuget pkg manager');
  } finally { await cleanup(d); }
});

t('main: Directory.Packages.props (CPM) frameworks are detected via the same parser', async () => {
  const d = await tmp();
  try {
    // CPM scenario: a csproj exists (so dotnet is detected) and Directory.Packages.props
    // declares the centrally-managed PackageVersion entries that detectFromCsproj also picks up
    // because it scans for any Include="..." attribute.
    await writeFile(d, 'MyApi.csproj', '<Project/>');
    await writeFile(
      d,
      'Directory.Packages.props',
      '<Project><ItemGroup><PackageVersion Include="Microsoft.AspNetCore.App" Version="8.0.0" /><PackageVersion Include="MediatR" Version="12.0.0" /></ItemGroup></Project>',
    );
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.primary_language, 'dotnet');
    ok(profile.frameworks.includes('aspnetcore'), `expected aspnetcore from CPM, got ${JSON.stringify(profile.frameworks)}`);
    ok(profile.frameworks.includes('mediatr'), `expected mediatr from CPM, got ${JSON.stringify(profile.frameworks)}`);
  } finally { await cleanup(d); }
});

t('main: LLM SDK in csproj → llm_sdks_present true, version captured', async () => {
  const d = await tmp();
  try {
    await writeFile(d, 'MyApi.csproj', '<Project><ItemGroup><PackageReference Include="Azure.AI.OpenAI" Version="2.0.0" /></ItemGroup></Project>');
    let profile;
    await captureStdout(async () => { profile = await main(['node', 'x', '--run-id', 'r', '--repo-root', d]); });
    eq(profile.llm_sdks_present, true);
    ok(profile.llm_sdks_detected.includes('Azure.AI.OpenAI@2.0.0'), `expected Azure.AI.OpenAI@2.0.0 in ${JSON.stringify(profile.llm_sdks_detected)}`);
  } finally { await cleanup(d); }
});

let pass = 0, fail = 0;
for (const T of tests) {
  try { await T.fn(); process.stdout.write(`PASS ${T.name}\n`); pass++; }
  catch (e) { process.stdout.write(`FAIL ${T.name}: ${e.stack || e.message}\n`); fail++; }
}
process.stdout.write(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
