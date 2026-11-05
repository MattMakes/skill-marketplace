# supply-chain-auditor — .NET catalog

> Inlined into the supply-chain-auditor system prompt when the audited repo's primary language is `dotnet`. Every entry below is a concrete pattern to look for in C#/F#/VB code or its config — not generic advice.

## File globs to scan

- `**/*.csproj`, `**/*.fsproj`, `**/*.vbproj`
- `**/Directory.Packages.props` (Central Package Management)
- `**/Directory.Build.props`, `**/Directory.Build.targets`
- `**/packages.config` (legacy projects)
- `**/packages.lock.json` (when `RestorePackagesWithLockFile=true`)
- `**/paket.dependencies`, `**/paket.lock`, `**/paket.references`
- `**/nuget.config`, `**/NuGet.Config`
- `**/global.json` (SDK pin)
- `**/*.sln`, `**/*.slnx`
- `**/dotnet-tools.json` (under `.config/`)
- `**/.github/workflows/*.yml`, `**/azure-pipelines*.yml`, `**/Dockerfile`
- `**/Jenkinsfile`, `**/.circleci/config.yml`

## Native tooling (when run command is appropriate)

- `dotnet list package --vulnerable --include-transitive` — official vulnerability scan against the GitHub Advisory Database.
- `dotnet list package --deprecated` — surface deprecated packages.
- `dotnet list package --outdated` — info; not a security signal alone.
- `dotnet nuget verify <package.nupkg>` — verifies signed packages.
- `dotnet restore --locked-mode` — fails if `packages.lock.json` would change.
- `dotnet tool list --global` and `cat .config/dotnet-tools.json` — review local tool manifest.
- `dotnet sbom-tool generate ...` (via `Microsoft.Sbom.Tool`) — generate an SBOM for review.
- `dotnet validate` (via the `dotnet-validate` global tool) — schema validation for project files.

## Risk patterns

### Vulnerable packages — direct & transitive

**What to look for:** The output of `dotnet list package --vulnerable --include-transitive` showing any package with severity ≥ Moderate.
**Why it's risky in .NET:** Transitive vulnerabilities are invisible in csproj; the only complete view is the restored graph.
**Concrete grep / ripgrep query (post-run inspection):**
```
dotnet list package --vulnerable --include-transitive 2>/dev/null | rg -nP '> .* (Critical|High|Moderate)'
```
**File hint:** root solution; the command needs a successful restore first.
**False-positive guard:** Vulnerabilities flagged on dev-only `Microsoft.NET.Test.Sdk` test packages are still real if loaded in CI.

### Deprecated NuGet packages still referenced

**What to look for:** `dotnet list package --deprecated` results — packages explicitly marked deprecated by their authors (e.g., `Microsoft.AspNet.WebApi.*` for new code).
**Concrete query:**
```
dotnet list package --deprecated 2>/dev/null | rg -nP '> '
```
**File hint:** csproj `<PackageReference>` lines.

### Floating / unpinned versions

**What to look for:** `Version="1.*"`, `Version="[1.0,2.0)"` (range), or `Version="*"` in `<PackageReference>`; missing `Version` on `Directory.Packages.props` consumers.
**Why it's risky in .NET:** Restore can pull a newer minor that introduces a backdoor or breaking change; build reproducibility breaks.
**Concrete grep / ripgrep query:**
```
rg -nP '<PackageReference\s+Include="[^"]+"\s+Version="[^"]*\*' -g '*.csproj' -g '*.props' -g '*.targets'
rg -nP 'Version="[\[\(][^"]*[\]\)]"' -g '*.csproj' -g '*.props'
```
**File hint:** every csproj, Directory.Packages.props.
**False-positive guard:** `<PackageReference Include="..." />` with no `Version` is OK only when CPM is in effect (i.e., `Directory.Packages.props` defines it).

### Lock file missing despite reproducible-build claims

**What to look for:** No `packages.lock.json` AND no `<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>` in csproj/`Directory.Build.props`.
**Concrete grep / ripgrep query:**
```
rg -nP 'RestorePackagesWithLockFile' -g '*.csproj' -g '*.props' -g '*.targets'
fd -t f 'packages\.lock\.json'
```
**File hint:** any project that ships to prod.
**False-positive guard:** If you find lock files but no flag, inspect for stale lock-files committed without restore enforcement.

### `dotnet restore` in CI without `--locked-mode`

**What to look for:** CI steps run `dotnet restore` / `dotnet build` without `--locked-mode` flag (or without `RestoreLockedMode=true` MSBuild prop).
**Concrete grep / ripgrep query:**
```
rg -nP 'dotnet\s+(restore|build|publish)' -g '*.yml' -g '*.yaml' -g 'Dockerfile*' -g 'Jenkinsfile'
rg -nP 'locked-mode|RestoreLockedMode' -g '*.yml' -g '*.yaml' -g '*.props' -g 'Dockerfile*'
```
**File hint:** `.github/workflows/*.yml`, `azure-pipelines.yml`, Dockerfiles.

### Dependency confusion via private feeds in `nuget.config`

**What to look for:** `<packageSources>` mixes `nuget.org` with private feeds, but no `<packageSourceMapping>` section. This is the dependency-confusion class issue: an attacker uploads a package on nuget.org with the same name as your private package and a higher version.
**Why it's risky in .NET:** NuGet aggregates feeds and picks the highest version across all sources unless source mapping pins the package to a feed.
**Concrete grep / ripgrep query:**
```
rg -nP '<packageSources>' -g '*.config' -A 30
rg -nP '<packageSourceMapping>' -g '*.config'
```
**File hint:** `nuget.config` at repo root and per-project.
**False-positive guard:** `<packageSourceMapping>` with explicit `<packageSource key="...">` blocks per package prefix mitigates this.

### Embedded credentials in `nuget.config` (private feeds)

**What to look for:** `<packageSourceCredentials>` with `<add key="ClearTextPassword" value="..." />` literal.
**Concrete grep / ripgrep query:**
```
rg -nP '<packageSourceCredentials>' -g '*.config' -A 12
rg -nP '<add\s+key="(ClearTextPassword|Password)"\s+value="[^%$]' -g '*.config'
```
**File hint:** `nuget.config`.
**False-positive guard:** Env-var indirection (`%MY_FEED_PAT%`) is acceptable.

### Unsigned / unverifiable packages permitted

**What to look for:** `nuget.config` with `<config><add key="signatureValidationMode" value="accept"/></config>` (default) when policy demands `require`. Lack of `<trustedSigners>` block.
**Concrete grep / ripgrep query:**
```
rg -nP 'signatureValidationMode' -g '*.config'
rg -nP '<trustedSigners>' -g '*.config'
```
**File hint:** `nuget.config`.

### Package source over HTTP

**What to look for:** `<packageSources>` entries with `http://` URLs (NuGet now warns / fails for HTTP feeds; explicit `allowInsecureConnections` opts back in).
**Concrete grep / ripgrep query:**
```
rg -nP '<add\s+key="[^"]+"\s+value="http://' -g '*.config'
rg -nP 'allowInsecureConnections\s*=\s*"true"' -g '*.config'
```
**File hint:** `nuget.config`.

### `global.json` SDK pin missing or floating

**What to look for:** No `global.json` AND multiple SDKs available, or `"version"` pinned to an EOL SDK (.NET Core 3.1, .NET 5, .NET 7 are all EOL).
**Concrete grep / ripgrep query:**
```
fd -t f 'global\.json'
rg -nP '"version"\s*:\s*"[0-9]+\.[0-9]+\.[0-9]+"' -g 'global.json'
```
**File hint:** repo root.
**False-positive guard:** `"rollForward": "latestFeature"` accepts patch updates — preferred over no pin.

### EOL / out-of-support runtimes

**What to look for:** `<TargetFramework>net5.0</TargetFramework>`, `net6.0` (LTS ended Nov 2024), `net7.0` (STS ended May 2024), `netcoreapp2.x`, `netcoreapp3.1`, `net48` if treated as supported (still receives security patches but flag for review). Reference: dotnet.microsoft.com/platform/support/policy/dotnet-core.
**Concrete grep / ripgrep query:**
```
rg -nP '<TargetFramework>(net5\.0|net6\.0|net7\.0|netcoreapp2\.\d|netcoreapp3\.0|netcoreapp3\.1)</TargetFramework>' -g '*.csproj' -g '*.fsproj' -g '*.vbproj'
rg -nP '<TargetFrameworks>[^<]*(net5\.0|net6\.0|net7\.0|netcoreapp2|netcoreapp3)' -g '*.csproj' -g '*.fsproj' -g '*.vbproj'
```
**File hint:** every project file.
**False-positive guard:** Multi-targeted libraries that intentionally include older TFMs for back-compat may be acceptable for non-shipping libs.

### Pre-release / preview packages in production projects

**What to look for:** Versions containing `-preview`, `-rc`, `-alpha`, `-beta`, `-prerelease`.
**Concrete grep / ripgrep query:**
```
rg -nPi 'Version="[^"]*-(preview|rc|alpha|beta|prerelease)' -g '*.csproj' -g '*.props'
```
**File hint:** csproj, Directory.Packages.props.
**False-positive guard:** Internal pre-prod libs may legitimately use previews.

### Microsoft package version drift (transitive resolution risk)

**What to look for:** `Microsoft.Extensions.*` / `System.*` packages referenced with mixed major versions across the solution.
**Concrete grep / ripgrep query:**
```
rg -nP '<PackageReference\s+Include="(Microsoft\.Extensions|System)\.[^"]+"\s+Version="([0-9]+)\.' -g '*.csproj' -g '*.props' --no-heading | sort -u
```
**File hint:** all csproj files.

### `paket` with no `paket.lock`

**What to look for:** `paket.dependencies` exists but no `paket.lock`, or `paket.lock` missing in CI.
**Concrete grep / ripgrep query:**
```
fd -t f 'paket\.dependencies'
fd -t f 'paket\.lock'
```

### Legacy `packages.config` projects without lock equivalents

**What to look for:** `packages.config` exists (legacy non-SDK projects) — these don't honour `packages.lock.json`; restore is non-deterministic.
**Concrete grep / ripgrep query:**
```
fd -t f 'packages\.config'
```
**File hint:** typically classic ASP.NET Framework / WebForms projects.

### `dotnet-tools.json` pulling tools without version pin

**What to look for:** `.config/dotnet-tools.json` entries lacking `"version"` (forbidden by schema, but custom tooling can bypass).
**Concrete grep / ripgrep query:**
```
fd -t f 'dotnet-tools\.json'
rg -nP '"isRoot"|"tools"\s*:' -g 'dotnet-tools.json'
rg -nPv '"version"\s*:\s*"[0-9]' -g 'dotnet-tools.json'
```
**File hint:** `.config/dotnet-tools.json`.

### GitHub Actions `setup-dotnet` not pinned by SHA

**What to look for:** `uses: actions/setup-dotnet@v3` (tag) instead of full commit SHA pin.
**Concrete grep / ripgrep query:**
```
rg -nP 'uses:\s*actions/setup-dotnet@(v\d|main|master)' -g '.github/workflows/*.yml' -g '.github/workflows/*.yaml'
```
**File hint:** `.github/workflows/`.
**False-positive guard:** SHA-pinned (`actions/setup-dotnet@<40-hex>`) is safe; tag-pinned with Dependabot updates is the pragmatic compromise — flag but lower severity.

### `setup-dotnet` pulling from non-default source

**What to look for:** `dotnet-version: 'X.Y.Z'` paired with custom `source-url:` pointing to a non-Microsoft feed (potential supply-chain pivot).
**Concrete grep / ripgrep query:**
```
rg -nP 'source-url:' -g '.github/workflows/*.yml' -A 1
```

### Dockerfile pulls .NET SDK by floating tag

**What to look for:** `FROM mcr.microsoft.com/dotnet/sdk:8.0` (no patch / digest pin).
**Concrete grep / ripgrep query:**
```
rg -nP 'FROM\s+mcr\.microsoft\.com/dotnet/(sdk|aspnet|runtime)(-deps)?:[^@\s]+\s*$' -g 'Dockerfile*'
rg -nP 'FROM\s+mcr\.microsoft\.com/dotnet/.+@sha256:' -g 'Dockerfile*'
```
**File hint:** Dockerfile, Dockerfile.Production, etc.
**False-positive guard:** SHA-256 digest pin (`@sha256:...`) is the safe form.

### Custom MSBuild tasks loaded from external sources

**What to look for:** `<Import Project="..." />` referencing files outside the repo, or `<UsingTask AssemblyFile="..." />` pulling assemblies from `obj/`/`packages/`/`tools/` folders not part of NuGet restore.
**Concrete grep / ripgrep query:**
```
rg -nP '<Import\s+Project="[^"$][^"]*\.\./\.\.' -g '*.csproj' -g '*.targets' -g '*.props'
rg -nP '<UsingTask\s+[^>]*AssemblyFile=' -g '*.csproj' -g '*.targets' -g '*.props'
```
**File hint:** csproj, custom .targets / .props.

### Pre-/post-restore scripts and `<Exec>` build steps

**What to look for:** `<Target Name="..." BeforeTargets="Restore">` or `<Exec Command="curl..." />` in csproj/targets — arbitrary code at build time.
**Concrete grep / ripgrep query:**
```
rg -nP '<Target\s+[^>]*Before(Targets|Build)="(Restore|Build)"' -g '*.csproj' -g '*.targets' -g '*.props'
rg -nP '<Exec\s+Command=' -g '*.csproj' -g '*.targets' -g '*.props'
```
**File hint:** csproj/targets — uncommon and worth investigating.

### Assembly binding redirects masking known-vulnerable transitive (legacy)

**What to look for:** `web.config`/`app.config` `<bindingRedirect>` to a version older than the one csproj declares — indicates downgrade.
**Concrete grep / ripgrep query:**
```
rg -nP '<bindingRedirect\s+oldVersion="[^"]+"\s+newVersion="[^"]+"' -g '*.config'
```
**File hint:** legacy .NET Framework apps.

### Source Link / SourceRevisionId not enforced in release builds

**What to look for:** Lack of `<PublishRepositoryUrl>true</PublishRepositoryUrl>` and `<EmbedUntrackedSources>true</EmbedUntrackedSources>` — supply-chain provenance gap for shipped libraries.
**Concrete grep / ripgrep query:**
```
rg -nP 'PublishRepositoryUrl|EmbedUntrackedSources|ContinuousIntegrationBuild' -g '*.csproj' -g '*.props'
```
**File hint:** library projects shipping NuPkgs.

### Disabled SBOM / signing toggles

**What to look for:** `GeneratePackageOnBuild=true` AND `PackageOutputPath` set without signing properties, or release pipeline missing `Microsoft.Sbom.Targets`.
**Concrete grep / ripgrep query:**
```
rg -nP 'GeneratePackageOnBuild|GenerateSBOM|Microsoft\.Sbom' -g '*.csproj' -g '*.props' -g '*.yml'
```

### Roslyn analyzer / `Microsoft.CodeAnalysis.NetAnalyzers` disabled

**What to look for:** `<EnableNETAnalyzers>false</EnableNETAnalyzers>`, `<AnalysisLevel>none</AnalysisLevel>`, `<NoWarn>CA*</NoWarn>` patterns suppressing security-relevant analyzers (CA2100, CA3001-CA3061, CA5xxx).
**Concrete grep / ripgrep query:**
```
rg -nP 'EnableNETAnalyzers|AnalysisLevel|AnalysisMode' -g '*.csproj' -g '*.props'
rg -nP '<NoWarn>[^<]*CA[0-9]{4}' -g '*.csproj' -g '*.props' -g '*.editorconfig'
```
**File hint:** csproj, Directory.Build.props, .editorconfig.

### Snyk / GitHub Dependabot / Renovate disabled

**What to look for:** `.github/dependabot.yml` missing or excluding `nuget` ecosystem; `renovate.json` with `"nuget": { "enabled": false }`.
**Concrete grep / ripgrep query:**
```
fd -t f 'dependabot\.yml'
rg -nP 'package-ecosystem:\s*"nuget"' -g 'dependabot.yml'
rg -nP '"nuget"' -g 'renovate.json'
```
**File hint:** `.github/`.
