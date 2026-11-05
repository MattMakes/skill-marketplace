# secret-scanner — .NET catalog

> Inlined into the secret-scanner system prompt when the audited repo's primary language is `dotnet`. Every entry below is a concrete pattern to look for in C#/F#/VB code or its config — not generic advice.

## File globs to scan

- `**/appsettings*.json` (especially `appsettings.json`, `appsettings.Production.json`, `appsettings.Staging.json`, `appsettings.Development.json`, `appsettings.Local.json`)
- `**/secrets.json` — User Secrets file accidentally committed
- `**/*.config` — `web.config`, `app.config`, `Web.Production.config`, `Web.Release.config`, `connectionStrings.config`
- `**/launchSettings.json` (under `Properties/`)
- `**/nuget.config`, `**/NuGet.Config`
- `**/*.csproj`, `**/*.fsproj`, `**/*.vbproj`, `**/Directory.Build.props`, `**/Directory.Packages.props`
- `**/.env`, `**/.env.*`, `**/local.settings.json` (Azure Functions)
- `**/*.pubxml`, `**/*.pubxml.user`, `**/*.publishsettings`, `**/PublishProfiles/*`
- `**/azure-pipelines*.yml`, `**/.github/workflows/*.yml`, `**/Dockerfile`, `**/docker-compose*.yml`
- `**/*.sln.DotSettings.user`, `**/.vs/**` (rarely committed but possible)
- Tests: `**/*Tests/appsettings*.json`, `**/*.Tests.csproj` test fixture data

## Native tooling (when run command is appropriate)

- `git log -p -- '**/appsettings*.json' '**/web.config' '**/secrets.json'` — secrets often live in history even after deletion
- `dotnet user-secrets list --project <path>` — local only; used to confirm the project uses User Secrets and shouldn't have inline values
- `gitleaks detect --source .` (if installed) — generic, but works alongside .NET-specific patterns

## Risk patterns

### SQL Server / SQL Database connection strings

**What to look for:** `Server=...;Database=...;User Id=...;Password=...;` or `Data Source=...;Initial Catalog=...;User ID=...;Password=...;`. Also `Integrated Security=False` with user/password.
**Why it's risky in .NET:** Default `IConfiguration["ConnectionStrings:Default"]` lookups make this the #1 leak in appsettings.
**Concrete grep / ripgrep query:**
```
rg -nP '(Server|Data Source)\s*=\s*[^;"]+;.*(User ?Id|UID)\s*=\s*[^;"]+;.*Password\s*=\s*[^;"\s]+' -g '*.json' -g '*.config' -g '*.cs' -g '*.xml' -g '*.yml' -g '*.yaml'
rg -nP '"ConnectionStrings"\s*:\s*\{' -g '*.json' -A 8
```
**File hint:** appsettings*.json, web.config `<connectionStrings>`, Dockerfile ENV.
**False-positive guard:** Values like `"Server=...;Password=#{DbPassword}#"` (Octopus/transform tokens) or `${DB_PASSWORD}` env-var refs are placeholders.

### Azure Storage / Service Bus / Event Hub connection strings

**What to look for:** `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;` (Storage), `Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=...` (Service Bus / Event Hubs).
**Concrete grep / ripgrep query:**
```
rg -nP 'DefaultEndpointsProtocol\s*=\s*https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{40,}' -g '*.json' -g '*.config' -g '*.cs' -g '*.yml'
rg -nP 'Endpoint=sb://[^;]+;SharedAccessKey(Name)?=[^;]+;SharedAccessKey=[A-Za-z0-9+/=]{40,}' -g '*.json' -g '*.config' -g '*.cs'
```
**File hint:** appsettings, local.settings.json, function.json bindings.
**False-positive guard:** `UseDevelopmentStorage=true` is the Azurite emulator and not a real secret.

### Azure SAS tokens

**What to look for:** URLs containing `?sv=...&sig=...&se=...` or `?sp=...&sig=...`.
**Concrete grep / ripgrep query:**
```
rg -nP 'https?://[^"\s]+\?(sv|sp|st|se|sr)=[^&\s]+&sig=[^&\s"]+' -g '!**/*.lock.json'
```
**File hint:** appsettings*.json, README, code constants.

### Application Insights instrumentation/connection keys

**What to look for:** `InstrumentationKey=........-....-....-....-............` GUID pattern; new format `InstrumentationKey=<guid>;IngestionEndpoint=https://...`.
**Concrete grep / ripgrep query:**
```
rg -nP 'InstrumentationKey\s*[:=]\s*"?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' -g '*.json' -g '*.config' -g '*.cs' -g '*.xml'
rg -nP 'APPLICATIONINSIGHTS_CONNECTION_STRING|APPINSIGHTS_INSTRUMENTATIONKEY' -g '*.json' -g '*.yml' -g '*.config'
```
**File hint:** appsettings*.json, Program.cs `AddApplicationInsightsTelemetry`.
**False-positive guard:** All-zero GUID is a placeholder.

### Azure AD / MSAL client secrets

**What to look for:** `ClientSecret` keys, secret values 32–44 chars (often ending in `=`), config sections like `"AzureAd": { "ClientSecret": "..." }`.
**Concrete grep / ripgrep query:**
```
rg -nP '"ClientSecret"\s*:\s*"[A-Za-z0-9~_\.\-]{20,}"' -g '*.json' -g '*.config'
rg -nP 'ClientSecret\s*=\s*"[A-Za-z0-9~_\.\-]{20,}"' --type cs
rg -nP '"TenantId"\s*:|"AzureAd"\s*:' -g '*.json' -A 6
```
**File hint:** Microsoft.Identity.Web `"AzureAd"` block, OAuth client config.
**False-positive guard:** `"ClientSecret": "@Microsoft.KeyVault(...)"` is a Key Vault reference and not the actual secret.

### NuGet API keys and credentials

**What to look for:** Pattern `oy2[a-z0-9]{40,}` (NuGet API key prefix), `<add key="apikey" value="oy2..." />`, `<packageSourceCredentials>` blocks with `ClearTextPassword` or `Password` in `nuget.config`.
**Concrete grep / ripgrep query:**
```
rg -nP 'oy2[a-z0-9]{43}' -g '*.config' -g '*.cs' -g '*.yml' -g '*.json'
rg -nP '<packageSourceCredentials>' -g '*.config' -A 10
rg -nP '<add\s+key="(ClearTextPassword|Password)"\s+value="[^"]+"' -g '*.config'
```
**File hint:** `nuget.config`, root `NuGet.Config`, CI scripts.
**False-positive guard:** `value="%NUGET_PAT%"` env-var interpolation is OK.

### GitHub PATs / Azure DevOps PATs in NuGet feeds and pipelines

**What to look for:** `ghp_[A-Za-z0-9]{36}`, `gho_[A-Za-z0-9]{36}`, `github_pat_[A-Za-z0-9_]{82}`, Azure DevOps PATs (52-char base32: `[a-z2-7]{52}`).
**Concrete grep / ripgrep query:**
```
rg -nP '\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b'
rg -nP '\bgithub_pat_[A-Za-z0-9_]{82}\b'
rg -nP '"PASSWORD".+"[a-z2-7]{52}"' -g '*.config' -g '*.json'
```
**File hint:** nuget.config, azure-pipelines.yml, .github/workflows.

### `<UserSecretsId>` set but secrets file committed

**What to look for:** csproj declares `<UserSecretsId>` AND the repo also contains a `secrets.json` file (which should never be committed — it lives in `~/.microsoft/usersecrets/<id>/` or `%APPDATA%\Microsoft\UserSecrets\<id>\`).
**Concrete grep / ripgrep query:**
```
rg -nP '<UserSecretsId>' -g '*.csproj' -g '*.fsproj' -g '*.vbproj'
fd -t f 'secrets\.json'
```
**File hint:** project root, any subfolder.
**False-positive guard:** A `secrets.json` template file that contains only key names with empty values is fine — but flag anyway.

### `appsettings.Development.json` containing prod-like values

**What to look for:** Real-looking connection strings or keys in `appsettings.Development.json` (developers commonly point dev at staging/prod by mistake).
**Concrete grep / ripgrep query:**
```
rg -nP 'Password\s*=\s*[^;"\s$@%{][^;"\s]{4,}' -g 'appsettings.Development.json' -g 'appsettings.Local.json'
```
**File hint:** any appsettings*.json that isn't the template.

### Encrypted-but-key-in-repo (DPAPI / DataProtection key ring)

**What to look for:** `*.xml` files under `key-*` paths from ASP.NET Core DataProtection, committed key rings.
**Concrete grep / ripgrep query:**
```
fd -t f 'key-[0-9a-fA-F-]+\.xml'
rg -nP '<descriptor.*?<encryptedSecret' -g '*.xml'
```
**File hint:** anywhere; check `.gitignore` for `App_Data/Keys/`.

### Hardcoded JWTs in test fixtures

**What to look for:** Three-part base64url tokens `eyJ[A-Za-z0-9_\-]+\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+` in `[Fact]`/`[Test]` methods or test JSON fixtures.
**Concrete grep / ripgrep query:**
```
rg -nP 'eyJ[A-Za-z0-9_\-=]+\.eyJ[A-Za-z0-9_\-=]+\.[A-Za-z0-9_\-=]+' -g '!**/node_modules/**'
```
**File hint:** `*Tests/`, fixtures/, `appsettings.Test.json`.
**False-positive guard:** Tokens signed with `secret`/`testkey` and not used in prod are low-impact but should still be flagged.

### Hardcoded passwords in `Moq` setups, integration tests, `WebApplicationFactory`

**What to look for:** Test files containing literal password strings.
**Concrete grep / ripgrep query:**
```
rg -nPi '(password|secret|apiKey|token)\s*=\s*"[^"$#@%{][^"]{6,}"' -g '*Tests*' -g '*.Tests/**'
rg -nP 'WebApplicationFactory|TestServer' --type cs
```
**File hint:** Tests/ projects.

### Azure Functions `local.settings.json`

**What to look for:** Functions runtime settings file containing `AzureWebJobsStorage`, `APPINSIGHTS_INSTRUMENTATIONKEY`, custom secrets.
**Concrete grep / ripgrep query:**
```
fd -t f 'local\.settings\.json'
rg -nP '"AzureWebJobsStorage"\s*:\s*"DefaultEndpointsProtocol' -g 'local.settings.json'
```
**File hint:** Azure Functions project root.
**False-positive guard:** Should be in `.gitignore` by default (Functions template excludes it). Presence in commit history is the issue.

### Service principal / managed identity client secrets in workflows

**What to look for:** GitHub Actions / Azure Pipelines steps embedding `azure-credentials` JSON literally instead of via secret.
**Concrete grep / ripgrep query:**
```
rg -nP '"clientSecret"\s*:\s*"[^"$#@%{][^"]{8,}"' -g '*.yml' -g '*.yaml'
rg -nPi 'AZURE_CLIENT_SECRET\s*[:=]\s*[^$\s][^\s]{8,}' -g '*.yml' -g '*.yaml' -g 'Dockerfile'
```
**File hint:** `.github/workflows/`, `azure-pipelines.yml`, deployment yaml.

### Web.config `<machineKey>` with explicit values

**What to look for:** `<machineKey validationKey="..." decryptionKey="..." />` literal hex strings.
**Concrete grep / ripgrep query:**
```
rg -nP '<machineKey\s+[^>]*validationKey="[A-Fa-f0-9]{40,}"' -g 'web.config' -g '*.config'
```
**File hint:** legacy ASP.NET Framework apps.

### Embedded private keys / PFX / PEM

**What to look for:** `BEGIN PRIVATE KEY`, `BEGIN RSA PRIVATE KEY`, `BEGIN ENCRYPTED PRIVATE KEY`, `*.pfx` or `*.pem` files committed to the repo, `new X509Certificate2("./cert.pfx", "password")`.
**Concrete grep / ripgrep query:**
```
rg -nP 'BEGIN (RSA |EC |DSA |ENCRYPTED |OPENSSH |)PRIVATE KEY'
fd -t f -e pfx -e p12 -e pem -e key
rg -nP 'X509Certificate2\s*\(\s*"[^"]+\.pfx"\s*,\s*"[^"]+"' --type cs
```
**File hint:** Certs/, root, deployment folder.
**False-positive guard:** Public certs (`.cer`, `.crt`) are fine; private material is not.

### Twilio / SendGrid / Stripe / AWS keys living in .NET configs

**What to look for:** Service-specific token formats inside `appsettings*.json` / `*.config`:
- Twilio: `SK[a-f0-9]{32}` / `AC[a-f0-9]{32}`
- SendGrid: `SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}`
- Stripe: `sk_live_[A-Za-z0-9]{24,}`, `rk_live_[A-Za-z0-9]{24,}`
- AWS: `AKIA[0-9A-Z]{16}` paired with 40-char secret
**Concrete grep / ripgrep query:**
```
rg -nP '\b(SK|AC)[a-f0-9]{32}\b' -g '*.json' -g '*.config' -g '*.cs'
rg -nP '\bSG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}\b'
rg -nP '\bsk_live_[A-Za-z0-9]{24,}\b'
rg -nP '\bAKIA[0-9A-Z]{16}\b'
```
**File hint:** any config or constants class.

### Hardcoded `IConfiguration` overrides in code

**What to look for:** `configBuilder.AddInMemoryCollection(new Dictionary<string,string?>{{"X","secret"}})` with literal secret values.
**Concrete grep / ripgrep query:**
```
rg -nP 'AddInMemoryCollection' --type cs -A 8
```
**File hint:** Program.cs, test setup.

### Publish profile credentials (`*.pubxml.user`)

**What to look for:** Visual Studio publish profile user files containing `<UserPWD>` (encrypted but recoverable on the machine), `<Password>`.
**Concrete grep / ripgrep query:**
```
rg -nP '<UserPWD>|<Password>' -g '*.pubxml*' -g '*.publishsettings'
fd -t f -e publishsettings
```
**File hint:** Properties/PublishProfiles/.
**False-positive guard:** `*.pubxml.user` should be in `.gitignore`; presence is the issue.

### Connection strings in `Dockerfile` ENV / `docker-compose.yml`

**What to look for:** `ENV ConnectionStrings__Default=...` with literal credentials.
**Concrete grep / ripgrep query:**
```
rg -nP 'ENV\s+ConnectionStrings__\w+\s*=\s*[^$\s].{10,}' -g 'Dockerfile*'
rg -nP 'ConnectionStrings__\w+\s*:\s*[^$\s].{10,}' -g 'docker-compose*.yml'
```

### Octopus / `#{...}#` token leakage (looks like template, may be real)

**What to look for:** Octopus variable substitution syntax indicates the file is *meant* to be a template. If the same key appears with a literal value in another env-specific file, the literal is a leak.
**Concrete grep / ripgrep query:**
```
rg -nP '#\{[A-Za-z0-9_\.\-]+\}#' -g '*.config' -g '*.json'
```
**File hint:** appsettings.*, *.config across deployments — diff them to find env that has the literal.
