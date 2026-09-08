# owasp-auditor — .NET catalog

> Inlined into the owasp-auditor system prompt when the audited repo's primary language is `dotnet`. Every entry below is a concrete pattern to look for in C#/F#/VB code or its config — not generic advice.

## File globs to scan

- `**/*.cs`, `**/*.fs`, `**/*.vb`
- `**/*.cshtml`, `**/*.razor`, `**/*.vbhtml`
- `**/*.aspx`, `**/*.ascx`, `**/*.ashx`, `**/*.asmx`
- `**/Program.cs`, `**/Startup.cs`
- `**/appsettings*.json`, `**/web.config`, `**/Web.*.config`
- `**/Properties/launchSettings.json`
- `**/wwwroot/**/*.js`, `**/wwwroot/**/*.html`

## Native tooling (when run command is appropriate)

- `dotnet build` then `dotnet format analyzers --verify-no-changes` — to surface analyzer warnings (CA-rules, SCS-rules) configured by the repo
- `dotnet add package SecurityCodeScan.VS2019` is a common static analyzer — note presence in `*.csproj`
- `grep -r "EnableAnalyzers" --include='*.csproj'` to confirm Roslyn analyzers are wired

## Risk patterns

### SQL injection — ADO.NET concatenation

**What to look for:** `SqlCommand`, `OleDbCommand`, `OracleCommand`, `SqliteCommand`, `MySqlCommand` constructed with string concatenation or interpolation that includes user input.
**Why it's risky in .NET:** ADO.NET command text is sent verbatim to the database; `SqlParameter` is the only safe path. Interpolation looks safe but isn't.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+(Sql|OleDb|Oracle|Sqlite|MySql|Npgsql)Command\s*\(\s*[$@"].*\+|new\s+(Sql|OleDb|Oracle|Sqlite|MySql|Npgsql)Command\s*\(\s*\$"' --type cs
rg -nP '\.CommandText\s*=\s*\$?".*\{.*\}|\.CommandText\s*=\s*".*"\s*\+' --type cs
```
**File hint:** `*Repository.cs`, `*Dao.cs`, `Data/`, `Infrastructure/Persistence/`, controllers that bypass ORMs.
**False-positive guard:** Safe if values come via `cmd.Parameters.AddWithValue("@x", input)` or `cmd.Parameters.Add(new SqlParameter(...))`. Constants concatenated together (no user input on RHS) are safe.

### SQL injection — EF Core `FromSqlRaw` / `ExecuteSqlRaw`

**What to look for:** `FromSqlRaw`, `ExecuteSqlRaw`, `SqlQueryRaw` (EF Core 7+) called with interpolated or concatenated strings.
**Why it's risky in .NET:** `FromSqlRaw` does NOT parameterize interpolated values; only `FromSqlInterpolated` / `ExecuteSqlInterpolated` (and the implicit `FromSql` overload accepting `FormattableString`) do.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(FromSqlRaw|ExecuteSqlRaw|SqlQueryRaw)\s*\(\s*\$"' --type cs
rg -nP '\.(FromSqlRaw|ExecuteSqlRaw|SqlQueryRaw)\s*\(\s*"[^"]*"\s*\+' --type cs
```
**File hint:** `DbContext` subclasses, repositories, query services.
**False-positive guard:** `FromSqlInterpolated($"...{userInput}...")` is safe (parameterized). `FromSqlRaw("SELECT ...", new SqlParameter("@x", input))` is safe. Const-only strings are safe.

### SQL injection — Dapper raw SQL

**What to look for:** `connection.Query`, `Execute`, `QueryAsync`, `ExecuteAsync` with concatenated/interpolated SQL instead of `@parameter` placeholders + anonymous param object.
**Why it's risky in .NET:** Dapper supports parameter binding via the second arg (`new { id = userInput }`); concatenation bypasses that.
**Concrete grep / ripgrep query:**
```
rg -nP '\.(Query|Execute|QueryAsync|ExecuteAsync|QuerySingle|QueryFirst|QueryMultiple)\w*\s*\(\s*\$"' --type cs
rg -nP '\.(Query|Execute|QueryAsync|ExecuteAsync)\w*\s*\(\s*"[^"]*"\s*\+' --type cs
```
**File hint:** `*Repository.cs`, files importing `using Dapper;`.
**False-positive guard:** `conn.Query<T>("SELECT * FROM x WHERE id=@id", new { id })` is safe.

### Insecure deserialization — BinaryFormatter (banned in .NET 5+)

**What to look for:** `BinaryFormatter.Deserialize`, `new BinaryFormatter()`, `<EnableUnsafeBinaryFormatterSerialization>true</EnableUnsafeBinaryFormatterSerialization>` in csproj.
**Why it's risky in .NET:** Microsoft has marked `BinaryFormatter` as obsolete and dangerous (CVE-class RCE primitive); enabling the unsafe flag re-introduces it.
**Concrete grep / ripgrep query:**
```
rg -nP 'BinaryFormatter|System\.Runtime\.Serialization\.Formatters\.Binary' --type cs
rg -n 'EnableUnsafeBinaryFormatterSerialization' -g '*.csproj' -g '*.props' -g '*.targets'
```
**File hint:** session/state stores, caching layers, legacy WCF.
**False-positive guard:** None — modern code should not import this namespace at all.

### Insecure deserialization — Newtonsoft.Json `TypeNameHandling`

**What to look for:** `JsonConvert.DeserializeObject` (or `JsonSerializer`) using `TypeNameHandling.All`, `TypeNameHandling.Auto`, or `TypeNameHandling.Objects` without a `SerializationBinder`.
**Why it's risky in .NET:** Allows the attacker to instantiate arbitrary types embedded in `$type` JSON properties — gadget chains lead to RCE.
**Concrete grep / ripgrep query:**
```
rg -nP 'TypeNameHandling\s*=\s*TypeNameHandling\.(All|Auto|Objects|Arrays)' --type cs
rg -n '"\$type"' --type cs --type json
```
**File hint:** API options, message bus serializers, custom `JsonSerializerSettings`.
**False-positive guard:** Safe if a strict `SerializationBinder`/`ISerializationBinder` is also assigned; or if `TypeNameHandling.None` (the default) is used.

### Insecure deserialization — System.Text.Json polymorphism misuse

**What to look for:** `JsonSerializerOptions` with `TypeInfoResolver` that allows arbitrary derived types, or `[JsonPolymorphic]` with `IgnoreUnrecognizedTypeDiscriminators = false` over an open hierarchy.
**Why it's risky in .NET:** .NET 7+ polymorphic deserialization can be weaponised if discriminators are user-controlled and the base type is broad.
**Concrete grep / ripgrep query:**
```
rg -nP 'JsonPolymorphic|JsonDerivedType|IgnoreUnrecognizedTypeDiscriminators' --type cs
```
**File hint:** API contracts, DTO assemblies.
**False-positive guard:** Closed type hierarchies with explicit `[JsonDerivedType]` allow-list are safe.

### Insecure deserialization — `XmlSerializer` / `DataContractSerializer` / `LosFormatter` / `SoapFormatter` / `NetDataContractSerializer`

**What to look for:** Untyped `XmlSerializer(typeof(object))`, any `LosFormatter` (ASP.NET ViewState), `SoapFormatter`, `NetDataContractSerializer`, or `JavaScriptSerializer` use.
**Why it's risky in .NET:** All of these have known gadget chains (ysoserial.net targets) and Microsoft recommends against them.
**Concrete grep / ripgrep query:**
```
rg -nP 'LosFormatter|SoapFormatter|NetDataContractSerializer|JavaScriptSerializer' --type cs
rg -nP 'new\s+XmlSerializer\s*\(\s*typeof\s*\(\s*(object|Object)\s*\)' --type cs
```
**File hint:** legacy WebForms (`*.aspx.cs`), WCF services, view-state handling.
**False-positive guard:** `XmlSerializer(typeof(MyKnownDto))` against a sealed type is acceptable.

### XSS — Razor `@Html.Raw` and friends

**What to look for:** `@Html.Raw(...)`, `IHtmlString`, `MvcHtmlString.Create`, `HtmlString` constructed from user-controlled content.
**Why it's risky in .NET:** Razor encodes by default; these APIs explicitly opt out and emit raw HTML.
**Concrete grep / ripgrep query:**
```
rg -nP '@Html\.Raw\s*\(' -g '*.cshtml' -g '*.razor'
rg -nP 'new\s+HtmlString\s*\(|MvcHtmlString\.Create\s*\(|IHtmlString' --type cs
rg -nP '@\(\s*new\s+Microsoft\.AspNetCore\.Html\.HtmlString' -g '*.cshtml' -g '*.razor'
```
**File hint:** Views/, Pages/, Components/, anything `.cshtml` / `.razor`.
**False-positive guard:** Constants or output of `HtmlEncoder.Default.Encode(...)` are safe.

### XSS — Blazor `MarkupString`

**What to look for:** `(MarkupString)userInput` casts or `new MarkupString(...)` over non-trusted strings.
**Why it's risky in .NET:** Blazor renders `MarkupString` without encoding — direct DOM injection.
**Concrete grep / ripgrep query:**
```
rg -nP 'MarkupString\s*\)|new\s+MarkupString\s*\(' --type cs -g '*.razor'
```
**File hint:** Blazor components.
**False-positive guard:** Safe if input is a constant or a sanitized output of an HTML-sanitizer like `Ganss.Xss`.

### XSS — `HttpResponse.Write` / `Response.WriteAsync` of unencoded input

**What to look for:** Direct `Response.WriteAsync(userInput)` or `Response.Write(userInput)` without HTML encoding inside an HTML-mime endpoint.
**Concrete grep / ripgrep query:**
```
rg -nP 'Response\.(Write|WriteAsync)\s*\(\s*[a-zA-Z_][\w\.]*\s*\)' --type cs
```
**File hint:** middleware, Minimal API endpoints returning HTML.
**False-positive guard:** OK when content type is `application/json`/`text/plain` and input is escaped.

### SSRF — `HttpClient` / `WebRequest.Create` / `RestSharp` with user-controlled URL

**What to look for:** `HttpClient.GetAsync(userUrl)`, `WebRequest.Create(userUrl)`, `RestClient(userUrl)`, `HttpClient.PostAsync(userUrl, ...)` where the URL came from a request, query string, body, or DB row.
**Why it's risky in .NET:** No automatic SSRF protection; Kestrel/.NET resolves all hostnames including internal IMDS endpoints (e.g., 169.254.169.254).
**Concrete grep / ripgrep query:**
```
rg -nP 'HttpClient\(\).*\.\w+Async\s*\(\s*[a-zA-Z_][\w\.]*\s*[\),]' --type cs
rg -nP '\.(GetAsync|PostAsync|SendAsync|DeleteAsync|PutAsync|PatchAsync)\s*\(\s*[a-zA-Z_][\w\.]*\s*[\),]' --type cs
rg -nP 'WebRequest\.Create\s*\(\s*[a-zA-Z_][\w\.]*\s*\)' --type cs
rg -nP 'new\s+(RestClient|RestRequest)\s*\(\s*[a-zA-Z_][\w\.]*\s*\)' --type cs
```
**File hint:** integration services, webhook handlers, image proxies.
**False-positive guard:** Safe if URL is validated against an allow-list of hosts, or constructed from `new Uri(baseUri, relative)` where base is a constant.

### Path traversal — `Path.Combine` / `File.*` with user input

**What to look for:** `File.ReadAllText`, `File.OpenRead`, `File.WriteAllText`, `Directory.*` with paths containing user-supplied segments; `Path.Combine(baseDir, userInput)` without normalization checks.
**Why it's risky in .NET:** `Path.Combine` happily resolves `..`, absolute paths in subsequent args replace earlier ones (e.g., `Path.Combine("/safe", "/etc/passwd")` returns `/etc/passwd`).
**Concrete grep / ripgrep query:**
```
rg -nP 'Path\.Combine\s*\([^)]*\b(request|input|query|form|body|user|file(name)?|name)\b' --type cs
rg -nP 'File\.(ReadAllText|OpenRead|WriteAllText|OpenWrite|Delete|Exists)\s*\(\s*[a-zA-Z_][\w\.]*\s*\)' --type cs
rg -nP 'PhysicalFile\s*\(\s*[a-zA-Z_][\w\.]*' --type cs
```
**File hint:** file upload/download endpoints, document services, static-file middleware.
**False-positive guard:** Safe if the result is followed by `Path.GetFullPath` and a `StartsWith(allowedRoot, OrdinalIgnoreCase)` guard.

### XXE — `XmlDocument` / `XmlReader` / `XmlTextReader` with DTDs enabled

**What to look for:** `XmlReaderSettings` without `DtdProcessing = DtdProcessing.Prohibit`, `XmlDocument` with `XmlResolver` set to non-null, `XmlTextReader` (default allows DTDs on .NET Framework < 4.5.2).
**Why it's risky in .NET:** External entity expansion → file disclosure / SSRF / DoS.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+XmlDocument\s*\(\s*\)' --type cs
rg -nP 'new\s+XmlTextReader\s*\(' --type cs
rg -nP 'XmlReaderSettings|DtdProcessing|XmlResolver' --type cs
rg -nP 'XmlUrlResolver' --type cs
```
**File hint:** SOAP clients, SAML handlers, config loaders.
**False-positive guard:** Safe when explicitly set: `settings.DtdProcessing = DtdProcessing.Prohibit;` and `settings.XmlResolver = null;`. .NET Core/5+ defaults are safer but check anyway.

### Auth — `[AllowAnonymous]` on sensitive endpoints

**What to look for:** `[AllowAnonymous]` attribute on controllers/actions that mutate state, or controller-level `[Authorize]` overridden by an action-level `[AllowAnonymous]`.
**Why it's risky in .NET:** `[AllowAnonymous]` short-circuits the auth pipeline regardless of any global authorization filter (`AddAuthorization(o => o.FallbackPolicy = ...)`).
**Concrete grep / ripgrep query:**
```
rg -nB2 '\[AllowAnonymous\]' --type cs
```
**File hint:** Controllers/, Areas/Admin/, Endpoints/.
**False-positive guard:** Login/health/swagger/docs endpoints can legitimately be anonymous.

### Auth — Missing `[Authorize]` and no fallback policy

**What to look for:** `app.MapGet`/`MapPost`/controllers without `[Authorize]` AND `Program.cs` lacks `options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();`.
**Concrete grep / ripgrep query:**
```
rg -nP 'app\.(MapGet|MapPost|MapPut|MapDelete|MapPatch|MapMethods)\s*\(' --type cs
rg -n 'FallbackPolicy' --type cs
```
**File hint:** Program.cs, Minimal API endpoint files.
**False-positive guard:** Safe if `.RequireAuthorization()` is appended to the endpoint or a fallback policy exists.

### Auth — Weak `JwtBearerOptions` (missing audience/issuer/lifetime validation)

**What to look for:** `TokenValidationParameters` with `ValidateAudience = false`, `ValidateIssuer = false`, `ValidateLifetime = false`, `ValidateIssuerSigningKey = false`, or `RequireHttpsMetadata = false` outside dev.
**Why it's risky in .NET:** JWT spoofing / token reuse across audiences / forever-tokens.
**Concrete grep / ripgrep query:**
```
rg -nP '(ValidateAudience|ValidateIssuer|ValidateLifetime|ValidateIssuerSigningKey|RequireHttpsMetadata)\s*=\s*false' --type cs
rg -nP 'TokenValidationParameters' --type cs -A 12
```
**File hint:** Program.cs/Startup.cs auth configuration, Auth/ folders.
**False-positive guard:** `RequireHttpsMetadata = false` may be acceptable in `Development` env if guarded by `if (env.IsDevelopment())`.

### Auth — Symmetric JWT key from config without rotation

**What to look for:** `new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]))` with the key embedded in `appsettings.json`.
**Concrete grep / ripgrep query:**
```
rg -nP 'SymmetricSecurityKey\s*\(' --type cs
rg -n '"Jwt"\s*:|"Key"\s*:|"SigningKey"\s*:' -g 'appsettings*.json'
```
**File hint:** Auth/ folders, appsettings*.json.
**False-positive guard:** Key sourced from Key Vault / Managed Identity / asymmetric key (RsaSecurityKey, ECDsaSecurityKey) is preferred.

### CSRF — Missing `[ValidateAntiForgeryToken]` on POST MVC actions

**What to look for:** `[HttpPost]`/`[HttpPut]`/`[HttpDelete]` actions on cookie-authenticated controllers lacking `[ValidateAntiForgeryToken]` or `[AutoValidateAntiforgeryToken]`.
**Why it's risky in .NET:** ASP.NET MVC does not auto-validate CSRF; `[ApiController]` skips it because APIs are expected to use bearer tokens — but if the same controller uses cookie auth, it's vulnerable.
**Concrete grep / ripgrep query:**
```
rg -nB1 '\[Http(Post|Put|Delete|Patch)\]' --type cs | rg -v 'ValidateAntiForgeryToken|AutoValidateAntiforgeryToken'
rg -n 'AutoValidateAntiforgeryToken|services\.AddAntiforgery' --type cs
```
**File hint:** Razor Pages/MVC controllers using cookie auth.
**False-positive guard:** Pure JWT/bearer APIs without cookie auth are not CSRF-vulnerable.

### Open redirect — `Redirect(returnUrl)` without `IsLocalUrl`

**What to look for:** `Redirect(model.ReturnUrl)`, `LocalRedirect(...)` is the safe variant — anything else needs an `IsLocalUrl` check.
**Concrete grep / ripgrep query:**
```
rg -nP '\bRedirect\s*\(\s*[a-zA-Z_][\w\.]*\s*\)' --type cs
rg -nP 'returnUrl|ReturnUrl' --type cs
```
**File hint:** Account/Login controllers, OAuth callback handlers.
**False-positive guard:** `LocalRedirect(returnUrl)` or guard `if (Url.IsLocalUrl(returnUrl))` is safe.

### Crypto — Weak hashes for passwords

**What to look for:** `MD5.Create()`, `SHA1.Create()`, `MD5CryptoServiceProvider`, `SHA1CryptoServiceProvider`, `HMACSHA1` used for password hashing.
**Why it's risky in .NET:** Fast, broken hashes are unsuitable for passwords; use `Rfc2898DeriveBytes` (PBKDF2) ≥ 100k iterations or `Microsoft.AspNetCore.Identity.PasswordHasher`.
**Concrete grep / ripgrep query:**
```
rg -nP '\b(MD5|SHA1)(CryptoServiceProvider|Managed)?\.(Create|HashData|ComputeHash)' --type cs
rg -nP 'new\s+(MD5|SHA1)(CryptoServiceProvider|Managed)' --type cs
rg -nP 'HMACSHA1\b' --type cs
```
**File hint:** Auth/, Identity/, User registration code.
**False-positive guard:** OK for non-security uses (e.g., file ETags) but flag for review.

### Crypto — Banned algorithms (DES, 3DES, RC2, RC4, Rijndael in legacy mode)

**What to look for:** `DESCryptoServiceProvider`, `TripleDESCryptoServiceProvider`, `RC2CryptoServiceProvider`, `RijndaelManaged`.
**Why it's risky in .NET:** `RijndaelManaged` predates the standardized `Aes`; DES/3DES are weak.
**Concrete grep / ripgrep query:**
```
rg -nP 'DESCryptoServiceProvider|TripleDES|RC2CryptoServiceProvider|RijndaelManaged' --type cs
```
**File hint:** any cryptography helper.
**False-positive guard:** None — replace with `Aes.Create()`.

### Crypto — ECB mode and static IV

**What to look for:** `aes.Mode = CipherMode.ECB`, `IV = new byte[16]` (zeros), `IV` derived deterministically from key.
**Concrete grep / ripgrep query:**
```
rg -nP 'CipherMode\.ECB' --type cs
rg -nP '\.IV\s*=\s*new\s+byte\[\d+\]\s*;' --type cs
rg -nP '\.IV\s*=\s*Encoding\.\w+\.GetBytes' --type cs
```
**File hint:** custom encryption services.
**False-positive guard:** Safe IV is `RandomNumberGenerator.GetBytes(16)` and stored alongside the ciphertext.

### Crypto — `System.Random` for security tokens

**What to look for:** `new Random()` / `Random.Shared` used to produce session IDs, API keys, password reset tokens, OTPs, nonces.
**Why it's risky in .NET:** `Random` is a deterministic LCG; predictable output. Use `RandomNumberGenerator.GetBytes()`/`GetInt32`.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+Random\s*\(|Random\.Shared' --type cs
```
**File hint:** Token generators, OTP services, anything in `Auth/` or `Security/`.
**False-positive guard:** OK in tests, simulations, UI animations.

### Crypto — Hardcoded keys / IVs / passwords in source

**What to look for:** `byte[] key = new byte[] { 0x00, 0x01, ... }`, `string Key = "..."` adjacent to `Aes`/`HMAC`/`Encrypt`.
**Concrete grep / ripgrep query:**
```
rg -nP '(byte\[\]\s+(key|iv|salt)\s*=|string\s+(key|password|secret|apiKey)\s*=\s*")' --type cs -i
rg -nB2 -nA2 'Aes\.Create|new\s+Aes' --type cs
```
**File hint:** crypto helpers, license validators.
**False-positive guard:** Keys loaded from `IConfiguration` / Key Vault / DPAPI are safer.

### LDAP injection

**What to look for:** `DirectorySearcher.Filter` or `DirectoryEntry` paths concatenated with user input.
**Concrete grep / ripgrep query:**
```
rg -nP 'DirectorySearcher.*Filter\s*=\s*[$"].*\+|new\s+DirectorySearcher\s*\(\s*\$"' --type cs
rg -nP 'new\s+DirectoryEntry\s*\(\s*\$".*\{' --type cs
```
**File hint:** AD integration, on-prem Identity providers.
**False-positive guard:** Escape with `LdapEncoder` (Microsoft.Security.Application AntiXSS) or quote literally.

### Command injection — `Process.Start` with user input

**What to look for:** `Process.Start(...)` where command, arguments, or `ProcessStartInfo.Arguments` is concatenated user input; `UseShellExecute = true` with user data; `cmd.exe /c` patterns.
**Concrete grep / ripgrep query:**
```
rg -nP 'Process\.Start\s*\(\s*[a-zA-Z_][\w\.]*\s*,\s*[a-zA-Z_][\w\.]*' --type cs
rg -nP 'Process\.Start\s*\(\s*\$"' --type cs
rg -nP 'ProcessStartInfo[^=]*\{[^}]*Arguments\s*=\s*\$"' --type cs
rg -nP 'UseShellExecute\s*=\s*true' --type cs
rg -nP '"cmd\.exe"|"/bin/sh"|"/bin/bash"' --type cs
```
**File hint:** scripting endpoints, file converters, image-processing services.
**False-positive guard:** Use `ProcessStartInfo.ArgumentList.Add(...)` (not `Arguments`) — list-based args don't go through a shell.

### Mass assignment — model binding without DTO/`[Bind]`

**What to look for:** Controllers binding domain entities (e.g., `[FromBody] User user` where `User` is the EF entity exposing `IsAdmin`/`Role`); missing `[BindNever]` / `[Bind(nameof(...))]` / view models.
**Concrete grep / ripgrep query:**
```
rg -nP '\[FromBody\]\s+\w+\s+\w+\s*\)' --type cs
rg -nP '\[FromForm\]\s+\w+\s+\w+\s*\)' --type cs
rg -n 'BindNever|Bind\(' --type cs
```
**File hint:** controllers binding directly to EF Core entities.
**False-positive guard:** Use of dedicated DTO/ViewModel records is safe.

### CORS misconfig — wildcard origins + credentials

**What to look for:** `policy.AllowAnyOrigin().AllowCredentials()`, `policy.WithOrigins("*")` combined with `.AllowCredentials()`, or reflective `policy.SetIsOriginAllowed(_ => true).AllowCredentials()`.
**Why it's risky in .NET:** Browsers reject wildcard+credentials; reflective allow with credentials is the dangerous workaround that auths cross-origin.
**Concrete grep / ripgrep query:**
```
rg -nP 'AllowAnyOrigin|WithOrigins\s*\(\s*"\*"\s*\)|SetIsOriginAllowed' --type cs
rg -nP 'AllowCredentials\s*\(\s*\)' --type cs
```
**File hint:** Program.cs/Startup.cs `AddCors`/`UseCors`.
**False-positive guard:** Public read-only API with `AllowAnyOrigin()` and NO credentials is fine.

### Cookie security — missing `HttpOnly`, `Secure`, `SameSite`

**What to look for:** `CookieOptions { HttpOnly = false }`, missing `Secure`, `SameSite = SameSiteMode.None` without `Secure = true`, or `CookiePolicyOptions` defaults overridden insecurely.
**Concrete grep / ripgrep query:**
```
rg -nP 'CookieOptions\s*\{[^}]*' --type cs
rg -nP 'HttpOnly\s*=\s*false|Secure\s*=\s*false|SameSite\s*=\s*SameSiteMode\.None' --type cs
rg -n 'AddCookie\(' --type cs -A 8
```
**File hint:** Auth/ configuration, Response.Cookies.Append callers.
**False-positive guard:** Localhost-only configuration is OK if guarded by env check.

### HTTPS / HSTS — missing `UseHttpsRedirection`/`UseHsts`

**What to look for:** Production `Program.cs`/`Startup.cs` lacks `app.UseHttpsRedirection()` or `app.UseHsts()`.
**Concrete grep / ripgrep query:**
```
rg -n 'UseHttpsRedirection|UseHsts' --type cs
```
**File hint:** Program.cs / Startup.cs.
**False-positive guard:** Behind a TLS-terminating proxy with HSTS at the edge — verify via deployment notes.

### ProblemDetails / verbose exception leakage in production

**What to look for:** `app.UseDeveloperExceptionPage()` outside `if (env.IsDevelopment())`, custom exception filters returning `ex.ToString()` to clients.
**Concrete grep / ripgrep query:**
```
rg -nP 'UseDeveloperExceptionPage' --type cs
rg -nP 'return\s+(StatusCode|BadRequest|Problem)\s*\([^)]*ex\.(Message|ToString|StackTrace)' --type cs
```
**File hint:** Program.cs, ExceptionFilters/, Middleware/.
**False-positive guard:** OK if explicitly limited to `IsDevelopment()`.

### Logging sensitive data via `ILogger`

**What to look for:** `_logger.LogInformation(...)` / `LogDebug` calls including `password`, `token`, `secret`, `Authorization`, `cookie`, full request bodies, JWT contents.
**Concrete grep / ripgrep query:**
```
rg -nPi '_log\w*\.(Log\w+|Trace|Debug|Information|Warning|Error|Critical)\([^)]*\b(password|secret|token|apikey|api_key|authorization|bearer|cookie|ssn|cardnumber|cvv)\b' --type cs
rg -nPi 'LogInformation\([^)]*\$"[^"]*\{(request|user|model)\.' --type cs
```
**File hint:** Auth/, Middleware/, controllers.
**False-positive guard:** Structured logging with redacted fields is fine.

### CORS — disabled CSRF via `AddCors` over JSON-only POST endpoints

**What to look for:** Endpoints accepting `Content-Type: application/x-www-form-urlencoded` or `multipart/form-data` over CORS without explicit preflight requirements.
**Concrete grep / ripgrep query:**
```
rg -n 'AllowAnyHeader|AllowAnyMethod' --type cs
```
**File hint:** Program.cs CORS config.

### Race conditions — shared mutable static / singleton state

**What to look for:** `public static List<T>`, `public static Dictionary<,>` written from request handlers without `lock`/`ConcurrentDictionary`/`Interlocked`.
**Concrete grep / ripgrep query:**
```
rg -nP 'public\s+static\s+(List|Dictionary|HashSet|Queue|Stack)<' --type cs
rg -nP 'services\.AddSingleton<\w+>\s*\(' --type cs
```
**File hint:** Caches, in-memory stores, registration code.
**False-positive guard:** Read-only after init or wrapped in `ConcurrentDictionary`/`ImmutableX` is safe.

### gRPC / SignalR endpoints without auth

**What to look for:** `app.MapGrpcService<T>()` / `app.MapHub<T>()` without `.RequireAuthorization()`; SignalR `Hub` without `[Authorize]`.
**Concrete grep / ripgrep query:**
```
rg -nP 'MapGrpcService<|MapHub<' --type cs
rg -nB2 'class\s+\w+\s*:\s*Hub' --type cs
```
**File hint:** Program.cs, Hubs/, gRPC service classes.

### Minimal API endpoints without authorization filter

**What to look for:** `app.MapGet("/admin", ...)` or any privileged route lacking `.RequireAuthorization()` / `.RequireAuthorization("policy")`.
**Concrete grep / ripgrep query:**
```
rg -nP 'app\.Map(Get|Post|Put|Delete|Patch)\s*\([^)]*\)\s*;' --type cs
rg -n 'RequireAuthorization' --type cs
```
**File hint:** Program.cs, Endpoints/.

### Forwarded headers misconfig

**What to look for:** `UseForwardedHeaders` without setting `KnownNetworks` / `KnownProxies` allow-list — attacker can spoof `X-Forwarded-For`/`X-Forwarded-Proto`.
**Concrete grep / ripgrep query:**
```
rg -n 'ForwardedHeadersOptions|UseForwardedHeaders' --type cs -A 10
```
**File hint:** Program.cs/Startup.cs behind reverse proxy.

### Open SAML / OIDC redirect URI

**What to look for:** OIDC `RedirectUri` / SAML `AssertionConsumerServiceURL` derived from request input.
**Concrete grep / ripgrep query:**
```
rg -nP 'RedirectUri\s*=\s*[a-zA-Z_][\w\.]*' --type cs
```
**File hint:** Auth handlers, IdentityServer/Duende setup.
