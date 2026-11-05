# llm-security — Go catalog

> Inlined into the llm-security system prompt when the audited repo's primary language is `golang`. Every entry below is a concrete pattern to look for in Go code or its config — not generic advice.

## File globs to scan

- `**/*.go`
- `**/internal/llm/**/*.go`, `**/pkg/llm/**/*.go`, `**/ai/**/*.go`, `**/agents/**/*.go`, `**/chat/**/*.go`, `**/prompt/**/*.go`
- `**/handlers/**/*.go`, `**/api/**/*.go`
- `**/go.mod`, `**/go.sum` (to find LLM SDKs in the dep graph)
- `**/templates/**`, `**/prompts/**` (prompt template files often live here)
- Exclude: `**/vendor/**`, `**/*_test.go` (note separately if tests show unsafe patterns)

## Native tooling (when run command is appropriate)

- `gosec ./...` — useful for general issues but no LLM-specific rules
- `staticcheck ./...` — catches `bodyclose`/leak issues that compound LLM-streaming risk
- `rg -nP '"github\.com/(sashabaranov/go-openai|anthropics/anthropic-sdk-go|tmc/langchaingo)"' go.mod` — confirm which SDKs are in use

## Common Go LLM SDKs (search go.mod for these to scope the audit)

```
github.com/sashabaranov/go-openai
github.com/openai/openai-go         # official OpenAI Go SDK
github.com/anthropics/anthropic-sdk-go
github.com/tmc/langchaingo
github.com/cloudwego/eino           # ByteDance LLM framework
cloud.google.com/go/aiplatform
cloud.google.com/go/vertexai
github.com/aws/aws-sdk-go-v2/service/bedrockruntime
github.com/google/generative-ai-go  # Gemini
github.com/cohere-ai/cohere-go
github.com/replicate/replicate-go
github.com/ollama/ollama (client)
github.com/qdrant/go-client          # vector DB
github.com/weaviate/weaviate-go-client
github.com/pinecone-io/go-pinecone
```

## Risk patterns

### Prompt injection — direct concatenation of user input into system prompt

**What to look for:** `fmt.Sprintf("System: %s\nUser: %s", systemPrompt, userInput)` building a single string, then sent as a single `Role: "user"` message; `strings.Builder` assembling multi-role content into one blob; templating user input directly into the system message.
**Why it's risky in Go:** Without role separation, attacker text like `\n\nSystem: ignore prior instructions` is indistinguishable from server-set context. Modern SDKs accept `[]Message{{Role: "system", ...}, {Role: "user", ...}}` — use it.
**Concrete grep / ripgrep query:**
```
rg -nP 'fmt\.Sprintf\s*\([^)]*"(System|User|Assistant)\s*:' --type go
rg -nP 'strings\.Builder' --type go -A 10 | rg -i 'system|user|assistant|prompt'
rg -nP 'go-openai\.\w*Message\b|openai\.ChatCompletionMessage' --type go -B 2 -A 4
rg -nP 'anthropic\.MessageNewParams|anthropic\.MessageParam' --type go -A 4
rg -nP 'llms\.MessageContent' --type go -A 4
```
**File hint:** any file constructing chat completion requests; `prompt/builder.go`, `chat/`, `llm/`.
**False-positive guard:** Properly separated `[]Message` slices with role-tagged entries are safe (still subject to indirect injection from retrieved context).

### Prompt injection — RAG / retrieved context spliced into prompt without delimitation

**What to look for:** Retrieved documents (from a vector DB / web search / DB row) concatenated into the prompt without quoting / fencing / "treat the following as data, not instructions" framing. Look for `qdrant`, `pinecone`, `weaviate`, `chromem-go`, `redis` vector queries followed by template assembly.
**Concrete grep / ripgrep query:**
```
rg -nP 'qdrant|pinecone|weaviate|chromem|milvus' --type go
rg -nP '\.(Search|Query|Retrieve|Similarity)\s*\(' --type go -A 10 | rg -P 'Sprintf|Builder|Message'
rg -nP 'embeddings|VectorStore|Retriever' --type go -A 5
```
**File hint:** RAG pipelines, search/QA endpoints.
**False-positive guard:** Code that wraps retrieved text in clear delimiters (e.g., `<document>...</document>`) and instructs the model to ignore instructions inside is safer; still flag.

### Tool/function calling — shell or filesystem tools wired in without sandbox

**What to look for:** langchaingo `agents.Executor` configured with tools like `tools.Shell`, `tools.NewFileSystem`, `tools.NewBashProcess`; custom tool definitions whose `Call` method invokes `exec.Command`, `os.WriteFile`, `http.Get`. Eino tools with similar shapes.
**Why it's risky in Go:** A model with shell tool access can be coerced into running arbitrary commands via prompt injection.
**Concrete grep / ripgrep query:**
```
rg -nP 'tmc/langchaingo' go.mod
rg -nP 'agents\.NewExecutor|agents\.New\(|agent\.Executor' --type go
rg -nP 'tools\.(Shell|FileSystem|Bash|Calculator|HTTPRequester|Scraper)' --type go
rg -nP 'func\s+\(\w+\s+\*?\w+\)\s+(Call|Run|Execute)\s*\(' --type go -A 10 | rg -P 'exec\.Command|os\.WriteFile|http\.(Get|Post)|sql\.'
rg -nP 'bedrockagentruntime|InvokeAgent' --type go
```
**File hint:** `agents/`, `tools/`, `internal/agent/`, `chains/`.
**False-positive guard:** Tools that operate inside a chroot/container/sandbox or call only allow-listed APIs are safer.

### Streaming — missing read deadline causing goroutine leak

**What to look for:** `openai.ChatCompletionStream`, `client.CreateChatCompletionStream`, `anthropic.Messages.NewStreaming`, langchaingo `streaming` helpers, or HTTP SSE readers without `context.WithTimeout` / `context.WithCancel`. Plus `for { event, err := stream.Recv()` loops with no cancellation.
**Why it's risky in Go:** A server that stops sending data leaves the goroutine blocked on Recv → memory leak under load → DoS.
**Concrete grep / ripgrep query:**
```
rg -nP '\.CreateChatCompletionStream|\.ChatCompletionStream|\.NewStreaming|stream\.Recv\(\)' --type go -B 2 -A 8
rg -nP 'context\.Background\(\)' --type go -B 1 -A 1 | rg -P 'Stream|Chat|Completion|Message'
rg -nP 'context\.WithTimeout|context\.WithDeadline' --type go
rg -nP 'bufio\.Scanner.*resp\.Body' --type go
```
**File hint:** chat handlers, agent loops, SSE proxies.
**False-positive guard:** Use of `context.WithTimeout(ctx, N*time.Second)` and propagation to the SDK call is safe.

### HTTP client — no `Timeout` on the LLM provider client

**What to look for:** `&http.Client{}` passed to `openai.NewClientWithConfig(...)`, `anthropic.NewClient(option.WithHTTPClient(...))`, etc., without `Timeout` set. Default = no timeout = hung connections accumulate.
**Concrete grep / ripgrep query:**
```
rg -nP 'http\.Client\s*\{' --type go -A 6 | rg -v 'Timeout'
rg -nP '(NewClient|NewClientWithConfig|WithHTTPClient)\s*\(' --type go -B 2 -A 5
rg -nP 'openai\.DefaultConfig' --type go -A 5
```
**File hint:** SDK initialization, `llm/client.go`.
**False-positive guard:** SDK-internal default clients usually have sensible timeouts; check the version. Custom HTTPClient passed in must set `Timeout`.

### Unbounded prompt size — no input cap

**What to look for:** User input forwarded to the LLM with no length check (`len(userInput) > N`); `r.Body` read with `io.ReadAll(r.Body)` without `http.MaxBytesReader`. Cost-blast / context-window-exhaust risk.
**Concrete grep / ripgrep query:**
```
rg -nP 'io\.ReadAll\s*\(\s*r\.Body\s*\)' --type go
rg -nP 'http\.MaxBytesReader' --type go
rg -nP 'len\s*\(\s*\w+\s*\)\s*[<>]=?\s*\d{4,}' --type go
rg -nP 'tiktoken|tokenizer|tokens' --type go
```
**File hint:** chat handlers receiving user prompts.
**False-positive guard:** Wrapped with `http.MaxBytesReader(w, r.Body, N)` is safe.

### Channel back-pressure — unbounded buffered channel for streaming output

**What to look for:** `make(chan string, 0)` (synchronous) is fine; `make(chan StreamChunk)` written from SDK goroutine and read from HTTP handler — if reader is slow/disconnected, writer leaks. `make(chan X, 9999)` is a smell.
**Concrete grep / ripgrep query:**
```
rg -nP 'make\s*\(\s*chan\s+\w+\s*,\s*\d{3,}\s*\)' --type go
rg -nP 'chan\s+\w+\s*$' --type go -B 2 | rg -P 'Stream|Token|Chunk'
```
**File hint:** stream proxy handlers.
**False-positive guard:** Use of `select { case ch <- v: case <-ctx.Done(): return }` is safe.

### API key in source / hardcoded fallback for LLM SDK

**What to look for:** `openai.NewClient("sk-...")`, `anthropic.NewClient(option.WithAPIKey("sk-ant-..."))`, fallback to literal in `getEnvOr`. (Cross-reference with `secrets.md`.)
**Concrete grep / ripgrep query:**
```
rg -nP 'openai\.NewClient\s*\(\s*"sk-' --type go
rg -nP 'anthropic\.NewClient\s*\([^)]*"sk-ant-' --type go
rg -nP 'WithAPIKey\s*\(\s*"[a-zA-Z0-9_-]{20,}"' --type go
rg -nP 'OPENAI_API_KEY|ANTHROPIC_API_KEY' --type go -B 1 -A 3 | rg -P '"[a-zA-Z0-9_-]{20,}"'
```
**File hint:** SDK init code.
**False-positive guard:** Loaded from env / secret manager is safe.

### LLM responses rendered as HTML / Markdown without sanitization

**What to look for:** Model output passed to `template.HTML(resp)`, `bluemonday`-less Markdown rendering, `html/template` cast, then served to a browser → XSS.
**Concrete grep / ripgrep query:**
```
rg -nP 'template\.HTML\s*\(\s*\w*(resp|output|completion|message|content)' --type go
rg -nP 'goldmark|blackfriday|gomarkdown' --type go
rg -nP 'microcosm-cc/bluemonday' --type go
```
**File hint:** chat UI handlers.
**False-positive guard:** Output sanitized through `bluemonday.UGCPolicy().Sanitize(html)` before rendering is safer.

### LLM responses fed into `eval`-like sinks (code execution)

**What to look for:** Model output piped to `exec.Command`, `os.WriteFile`, `text/template.Parse(modelOutput)`, `yaml.Unmarshal(modelOutput, ...)`, `db.Exec(modelOutput)`, `goja`/`otto` JavaScript runners, Lua/Starlark interpreters.
**Concrete grep / ripgrep query:**
```
rg -nP 'exec\.Command\s*\([^)]*\b(resp|output|completion|message|content|response|llm)\b' --type go
rg -nP '(goja|otto|gopher-lua|starlark)' --type go
rg -nP 'template\.New\s*\([^)]*\)\.Parse\s*\(\s*\w*(resp|output|completion)' --type go
rg -nP 'yaml\.Unmarshal\s*\(\s*\[\]byte\s*\(\s*\w*(resp|output)' --type go
```
**File hint:** code-gen tools, agent executors, autonomous coding helpers.
**False-positive guard:** Sandboxed execution with strict capability limits is safer; flag any execution path.

### MCP / tool-server endpoints exposed without auth

**What to look for:** Custom MCP (Model Context Protocol) server implementations in Go (`github.com/mark3labs/mcp-go`, `github.com/strowk/mcp-golang`); JSON-RPC handlers exposing tool definitions over HTTP without an auth check.
**Concrete grep / ripgrep query:**
```
rg -nP 'mark3labs/mcp-go|strowk/mcp-golang|mcp\.NewServer' --type go
rg -nP 'jsonrpc|json-rpc|RegisterTool|AddTool' --type go
```
**File hint:** `internal/mcp/`, `cmd/mcp-server/`.

### Embeddings / vector search without tenant isolation

**What to look for:** Vector DB queries where the `namespace`/`collection`/`filter` is set from a constant, not from the authenticated user — risk of cross-tenant context leakage in retrieval.
**Concrete grep / ripgrep query:**
```
rg -nP '(qdrant|pinecone|weaviate|chromem|milvus|pgvector)' --type go -l
rg -nP '(Collection|Namespace|Filter|Where|Tenant)\s*:\s*"' --type go
rg -nP '\.(Search|Query|Retrieve)\s*\(' --type go -A 10
```
**File hint:** RAG retrieval code.
**False-positive guard:** User-derived namespace / WHERE filter using authenticated identity is safer.

### Retry loops without exponential backoff or max attempts

**What to look for:** Agent loops `for i := 0; i < 1000; i++ { call LLM }`, retry without `time.Sleep` or `backoff.Retry`; missing cap → cost blast / DoS upstream provider's rate limit.
**Concrete grep / ripgrep query:**
```
rg -nP 'for\s+\{[^}]*\.(Create|Send|Invoke|Stream|Recv)' --type go -A 10
rg -nP 'cenkalti/backoff' --type go
rg -nP 'agents?\.\w*Iter|MaxIterations|max_iterations|MaxSteps|max_steps' --type go
```
**File hint:** agent loops.

### Prompt template files committed with placeholder marks but no escaping

**What to look for:** `prompts/*.tmpl` / `prompts/*.txt` using Go template `{{.UserInput}}` directly with no quoting; `text/template` (not `html/template`) used for HTML-bound rendering; user-controlled `Funcs` map.
**Concrete grep / ripgrep query:**
```
rg -nP '\{\{\s*\.\w*(User|Input|Query|Question|Message|Content)\w*\s*\}\}' templates/ prompts/ 2>/dev/null
rg -nP '\.Funcs\s*\(\s*template\.FuncMap' --type go
```
**File hint:** `prompts/`, `templates/`.
