# llm-security — .NET catalog

> Inlined into the llm-security system prompt when the audited repo's primary language is `dotnet`. Every entry below is a concrete pattern to look for in C#/F#/VB code or its config — not generic advice.

## File globs to scan

- `**/*.cs`, `**/*.fs`, `**/*.vb`
- `**/*.csproj`, `**/Directory.Packages.props` (to identify which LLM SDKs are pulled in)
- `**/appsettings*.json` (LLM endpoints, API keys, deployment names)
- `**/Plugins/**`, `**/Skills/**`, `**/Functions/**`, `**/Prompts/**`, `**/Tools/**` (Semantic Kernel convention folders)
- `**/*.prompty` (Prompty template files used by Semantic Kernel)
- `**/*Plugin.cs`, `**/*Function.cs`, `**/*Skill.cs`

## Native tooling

- `dotnet list package` — confirm which LLM SDK is in use:
  - `Azure.AI.OpenAI` (official Azure)
  - `OpenAI` (official OpenAI .NET SDK, since 2024)
  - `Microsoft.SemanticKernel` (+ `Microsoft.SemanticKernel.Plugins.*`, `Microsoft.SemanticKernel.Connectors.*`)
  - `Microsoft.Extensions.AI` and `Microsoft.Extensions.AI.OpenAI` / `Microsoft.Extensions.AI.Ollama`
  - `Anthropic.SDK` (community)
  - `LangChain` / `LangChain.Net` (community)
  - `OllamaSharp`
  - `Azure.AI.Inference`
- `rg -n 'Microsoft\.SemanticKernel|Azure\.AI\.OpenAI|Anthropic\.SDK|OpenAI/' -g '*.csproj' -g '*.props'` — quick footprint check.

## Risk patterns

### Prompt injection — concatenated user input into system/user prompt

**What to look for:** `string.Format`, `$"..."` interpolation, or string concatenation that splices user-controlled input directly into a prompt template, especially the system message.
**Why it's risky in .NET:** Concatenation puts user content on the same trust boundary as instructions; the model can be steered.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+ChatMessage(System|Assistant|User)\s*\(\s*\$"' --type cs
rg -nP 'AddSystemMessage\s*\(\s*\$"|AddUserMessage\s*\(\s*\$"' --type cs
rg -nP 'ChatMessageContent.*\$"' --type cs
rg -nP 'PromptTemplate|ChatHistory.*Add(System|User)Message' --type cs -A 2
rg -nP 'string\.Format\s*\(\s*"[^"]*\{0\}[^"]*"\s*,\s*\w+\s*\)' --type cs
```
**File hint:** files importing `Microsoft.SemanticKernel`, `Azure.AI.OpenAI`, `OpenAI.Chat`.
**False-positive guard:** Templated prompts using `KernelFunctionFromPrompt` / `Prompty` with declared `{{$variable}}` slots and validated input-variables collection are safer (but still not bulletproof against prompt injection).

### Tool-use / function calling without validation

**What to look for:** `ChatCompletionsOptions.Tools` / `KernelFunction`s registered without any allow-list, or `Kernel.InvokeAsync(functionName)` where `functionName` came from the model's response untrusted.
**Why it's risky in .NET:** Auto-tool-invocation in Semantic Kernel and OpenAI SDKs will execute whichever function the model picks; if the model is jailbroken via injection, it can trigger arbitrary registered tools.
**Concrete grep / ripgrep query:**
```
rg -nP 'ToolCallBehavior\.AutoInvokeKernelFunctions|FunctionChoiceBehavior\.Auto' --type cs
rg -nP 'Kernel\.InvokeAsync\s*\(\s*[a-zA-Z_]\w*\s*[,\)]' --type cs
rg -nP 'ImportPluginFromObject|AddFromType<|AddFromObject|CreatePluginFrom' --type cs
```
**File hint:** Plugins/, Skills/, Tools/.
**False-positive guard:** Explicit `FunctionChoiceBehavior.Required(allowedFunctions)` or pre-filtered `ToolCallBehavior.EnableKernelFunctions` (no auto-invoke) is safer.

### Plugin executes shell / file / process based on LLM-generated args

**What to look for:** A `KernelFunction` / `[KernelFunction]`-attributed method that calls `Process.Start`, `File.WriteAllText`, `HttpClient`, `SqlCommand`, `Directory.Delete`, etc., taking strings sourced from the LLM as parameters.
**Concrete grep / ripgrep query:**
```
rg -nP '\[KernelFunction(\("[^"]+"\))?\]' --type cs -A 15
rg -nP 'KernelFunctionFactory\.Create' --type cs -A 8
```
**Then within those functions, hunt for:** `Process.Start`, `File.*`, `Directory.*`, `HttpClient`, `SqlCommand`.
**File hint:** Plugins/, Skills/, *Plugin.cs, *Skill.cs.
**False-positive guard:** Pure-data plugins (math, formatting) are low risk.

### `KernelArguments` / prompt variables sourced from request without length or content limits

**What to look for:** Plugin parameters typed as `string` with no `[Description]` constraints and no validation, `KernelArguments` constructed directly from a controller `[FromBody]` model.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+KernelArguments' --type cs -A 5
rg -nP 'kernel\.InvokePromptAsync\s*\(' --type cs
```
**File hint:** controllers calling Semantic Kernel.

### RAG retrieval without input sanitisation / source attribution

**What to look for:** Vector store query results inserted directly into the prompt without isolating untrusted retrieved text inside markers (e.g., `<context>...</context>`), or using `text-embedding-3-small` / `Microsoft.SemanticKernel.Memory.MemoryRecord` with fields straight from user uploads.
**Concrete grep / ripgrep query:**
```
rg -nP 'IVectorStore|IVectorStoreRecordCollection|VectorStoreRecordCollection' --type cs
rg -nP 'GetNearestMatchesAsync|VectorizedSearchAsync|SearchEmbeddingsAsync' --type cs
rg -nP 'SemanticKernel\.Memory|VectorData' --type cs
```
**File hint:** RAG pipelines, ingestion services.

### Prompty / handlebars template files committed with sensitive defaults

**What to look for:** `*.prompty` or `.skprompt.txt` files containing literal API keys, internal URLs, or PII test data.
**Concrete grep / ripgrep query:**
```
fd -t f -e prompty
fd -t f 'skprompt\.txt'
rg -nP 'api[_-]?key|secret|password' -g '*.prompty' -g '*.skprompt.txt'
```
**File hint:** Plugins/<name>/, Prompts/.

### LLM endpoint / API key in `appsettings.json`

**What to look for:** `"OpenAI:ApiKey"`, `"AzureOpenAI:ApiKey"`, `"Anthropic:ApiKey"`, `"AI": { "OpenAI": { "Key": "..." } }` literal values.
**Concrete grep / ripgrep query:**
```
rg -nP '"(OpenAI|AzureOpenAI|Anthropic|Cohere|HuggingFace)"\s*:\s*\{' -g 'appsettings*.json' -A 6
rg -nP '"(ApiKey|Key|Token)"\s*:\s*"sk-[A-Za-z0-9_\-]{20,}"' -g 'appsettings*.json'
rg -nP '\bsk-[A-Za-z0-9]{32,}\b'
rg -nP '\bsk-ant-[A-Za-z0-9_\-]{32,}\b'
```
**File hint:** appsettings*.json, KernelBuilder configuration in Program.cs.
**False-positive guard:** Key Vault references (`@Microsoft.KeyVault(...)`), `DefaultAzureCredential()`, or `AzureOpenAIClient(new TokenCredential(...))` without literal key are safer.

### `DefaultAzureCredential` not preferred over key-based auth

**What to look for:** `new AzureOpenAIClient(endpoint, new AzureKeyCredential(key))` instead of `new AzureOpenAIClient(endpoint, new DefaultAzureCredential())`.
**Concrete grep / ripgrep query:**
```
rg -nP 'AzureKeyCredential\s*\(' --type cs
rg -nP 'DefaultAzureCredential|ManagedIdentityCredential|WorkloadIdentityCredential' --type cs
```
**File hint:** Program.cs DI registration, KernelBuilder setup.

### No max-tokens / streaming throttling — DoS / cost runaway

**What to look for:** `ChatCompletionsOptions` / `ChatCompletionOptions` constructed without setting `MaxTokens` (`MaxOutputTokenCount` in newer SDKs); streaming completions with no per-user budget guard.
**Concrete grep / ripgrep query:**
```
rg -nP 'new\s+(ChatCompletionsOptions|ChatCompletionOptions|PromptExecutionSettings|OpenAIPromptExecutionSettings)\s*\(' --type cs -A 8
rg -nP 'MaxTokens|MaxOutputTokenCount|max_tokens' --type cs
rg -nP 'CompleteChatStreamingAsync|GetStreamingChatMessageContentsAsync|StreamingResponseAsync' --type cs
```
**File hint:** chat completion endpoints, controllers.
**False-positive guard:** Per-tenant rate limit middleware + token-aware quota counters mitigate this.

### Output rendered as HTML/Markdown without sanitisation

**What to look for:** LLM output passed to Razor `@Html.Raw`, Blazor `MarkupString`, or returned with `Content-Type: text/html` directly.
**Concrete grep / ripgrep query:**
```
rg -nP '@Html\.Raw\s*\([^)]*\b(response|completion|message|llmOutput|reply)\b' -g '*.cshtml' -g '*.razor'
rg -nP '\(MarkupString\)\s*\w*(response|completion|message|llmOutput|reply)' --type cs -g '*.razor'
```
**File hint:** chat UIs, Blazor components.

### System-prompt template loaded from filesystem path under user control

**What to look for:** `File.ReadAllText(userPath)` whose result is fed to `KernelFunctionFromPrompt(prompt)` or `kernel.InvokePromptAsync(prompt)`.
**Concrete grep / ripgrep query:**
```
rg -nP 'KernelFunctionFromPrompt\s*\(\s*[a-zA-Z_]\w*\s*[,\)]' --type cs
rg -nP 'KernelFunctionFactory\.CreateFromPrompt\s*\(\s*[a-zA-Z_]\w*\s*[,\)]' --type cs
```
**File hint:** prompt loaders.

### Semantic Kernel `OpenApi` plugin importing remote spec at runtime from user input

**What to look for:** `kernel.ImportPluginFromOpenApiAsync(name, uri)` with a `uri` that came from a request — the model can then call attacker-controlled APIs as you.
**Concrete grep / ripgrep query:**
```
rg -nP 'ImportPluginFromOpenApi(Async)?\s*\(' --type cs
```
**File hint:** plugin bootstrapping code.

### Embedding endpoint takes raw user content with no PII redaction

**What to look for:** `IEmbeddingGenerator<string,Embedding<float>>.GenerateAsync(text)` / `GetEmbeddingsAsync(text)` calls where `text` includes credentials, tokens, or PII verbatim.
**Concrete grep / ripgrep query:**
```
rg -nP 'GenerateAsync\s*\(|GetEmbeddingsAsync\s*\(|EmbeddingGenerator' --type cs -A 2
```
**File hint:** ingestion services.

### Conversation history persisted with no per-user isolation

**What to look for:** `static ChatHistory _history` shared across requests, or `IChatHistoryReducer` configured globally without user partitioning.
**Concrete grep / ripgrep query:**
```
rg -nP '(static|public)\s+ChatHistory\b' --type cs
rg -nP 'AddSingleton<ChatHistory|services\.AddSingleton.*ChatHistory' --type cs
```
**File hint:** chat services, hubs.

### MCP server / agent endpoints with no authn

**What to look for:** Project references to `ModelContextProtocol` / `ModelContextProtocol.AspNetCore` / `Microsoft.Extensions.AI.Mcp` exposing tools over HTTP without `[Authorize]` or transport security.
**Concrete grep / ripgrep query:**
```
rg -nP 'ModelContextProtocol|McpServer|AddMcpServer' --type cs -g '*.csproj' -g '*.cs'
rg -nP 'WithTools|WithResources|WithPrompts' --type cs -A 3
```
**File hint:** MCP server projects.

### Anthropic / Cohere SDKs (community) — outdated / unmaintained

**What to look for:** `Anthropic.SDK` reference older than the latest stable; community packages may lag behind official APIs and miss safety features (e.g., Claude tool-use schema enforcement).
**Concrete grep / ripgrep query:**
```
rg -nP '<PackageReference\s+Include="(Anthropic\.SDK|Cohere)"' -g '*.csproj' -g '*.props'
```

### Logs include full prompts and completions (PII / credential leak)

**What to look for:** `_logger.LogInformation("Prompt: {Prompt}", prompt)` / `LogInformation("Completion: {Completion}", completion)` where prompt/completion may contain user secrets.
**Concrete grep / ripgrep query:**
```
rg -nPi '_log\w*\.(Log\w+|Information|Debug|Trace)\([^)]*"[^"]*(prompt|completion|response|message|chat)' --type cs
rg -nP 'AddOpenAITelemetry|EnableSensitiveDataLogging' --type cs
```
**File hint:** middleware/handlers wrapping LLM calls.

### `Microsoft.Extensions.AI` `IChatClient` pipeline missing safety middleware

**What to look for:** `IChatClient` built without `.UseFunctionInvocation()` (auto-invoke risk), without `.UseDistributedCache()` (replay safety), or without `.UseLogging()` redaction filters.
**Concrete grep / ripgrep query:**
```
rg -nP 'ChatClientBuilder|UseFunctionInvocation|UseDistributedCache|AsBuilder\(\)' --type cs
rg -nP 'IChatClient\b' --type cs
```
**File hint:** Program.cs LLM client registration.

### Prompty / Semantic Kernel function with `input_variables` containing unredacted PII fields

**What to look for:** Prompty front-matter / `KernelFunction` parameters declaring `email`, `ssn`, `creditCard`, etc., that flow through to logs or third-party APIs.
**Concrete grep / ripgrep query:**
```
rg -nP 'input_variables|input:\s*\n' -g '*.prompty' -A 10
```
