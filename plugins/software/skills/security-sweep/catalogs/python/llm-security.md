# llm-security — Python catalog

> Inlined into the llm-security system prompt when the audited repo's primary language is `python`. Every entry below is a concrete pattern in Python LLM/agent code — not generic AI-safety theory.

## File globs to scan

- `**/*.py`
- `**/prompts/**/*`, `**/templates/**/*.j2`, `**/templates/**/*.jinja*`, `**/prompts/**/*.txt`
- `**/chains/**/*.py`, `**/agents/**/*.py`, `**/tools/**/*.py`, `**/llm/**/*.py`, `**/ai/**/*.py`
- `**/*.ipynb`
- `**/requirements*.txt`, `**/pyproject.toml` (to identify which LLM SDKs are present)

## Native tooling

- `rebuff` (Protect AI's prompt-injection detector) — Python pip package
- `garak` (`pip install garak`) — LLM red-team harness
- `promptmap` — discover prompt-injection via static analysis
- `nemo-guardrails` — NVIDIA's guardrail framework
- `bandit` rules don't yet cover LLM patterns; rely on these greps

## Detect which LLM SDKs are in use first

```
rg -n "^(?:openai|anthropic|langchain|langchain-(?:openai|anthropic|community|core)|llama-index|llama_index|cohere|google-generativeai|google-genai|mistralai|groq|together|replicate|transformers|sentence-transformers|huggingface_hub|litellm|guidance|dspy|llamaindex|haystack-ai|llamafile|ollama|instructor|outlines|pydantic-ai|smolagents|crewai|autogen)" -g 'requirements*.txt' -g 'pyproject.toml' -g 'Pipfile' -g 'setup.py'
rg -nP "^\s*(?:from|import)\s+(?:openai|anthropic|langchain|llama_index|cohere|google\.generativeai|mistralai|groq|together|replicate|transformers|litellm|guidance|dspy|haystack|ollama|instructor|outlines|crewai|autogen)\b" --type py
```

## Risk patterns

### Prompt injection — direct user input concatenated into prompt

**What to look for:** f-strings or `.format()` building prompts from user input with no separator/role boundary; `messages=[{"role": "user", "content": user_input}]` directly without sanitisation; system prompts mixed inline with user content.
**Why it's risky in Python:** Most Python LLM SDKs accept raw strings — there's no built-in separation of trusted and untrusted segments. f-strings are the most common ingress.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:openai|client)\.(?:chat\.completions|completions|responses)\.create\([^)]*[fF][\x27\"]" --type py
rg -nP "messages\s*=\s*\[[^\]]*[fF][\x27\"]" --type py
rg -nP "anthropic.*\.messages\.create\([^)]*[fF][\x27\"]" --type py
rg -nP "(?:prompt|system|content)\s*=\s*[fF][\x27\"][^\x27\"]*\{(?:user_input|request\.|input|query|message)" --type py
rg -nP "(?:HumanMessage|SystemMessage|AIMessage)\(\s*content\s*=\s*[fF][\x27\"]" --type py
rg -nP "\.format\([^)]*(?:user_input|request\.|input|query)" --type py | rg -i "prompt|message|system|template"
```
**File hint:** `chains/`, `agents/`, `prompts/`, anywhere a route handler calls `openai`/`anthropic` clients.
**False-positive guard:** Use of `instructor`/`outlines` with Pydantic schemas, or LangChain `PromptTemplate(input_variables=[...])` with explicit slot validation, reduces (not eliminates) injection — the user-supplied slot still flows through.

### Missing `system` / `user` role separation

**What to look for:** all-in-one prompts where instructions and user content live in the same `user` role; OpenAI Chat completions where there is no `system` message at all and the system rules are smuggled into a `user` message.
**Concrete grep / ripgrep query:**
```
rg -nP "messages\s*=\s*\[\s*\{\s*[\x27\"]role[\x27\"]\s*:\s*[\x27\"]user[\x27\"]" --type py -A2
rg -nP "messages\s*=\s*\[(?!.*role.*system)" --type py -U
```
**File hint:** Older OpenAI Completions (`text-davinci-*`) calls migrated naively to Chat — often a smell.

### No input length cap on user-supplied prompt segments

**What to look for:** unbounded `user_input` flowing to the LLM. Token-flooding inflates spend and can carry hidden injection payloads.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:openai|anthropic|client)\.(?:chat\.completions|messages|completions)\.create\(" --type py
# manually inspect the function for `len(user_input)` / `tokenizer.encode` length checks
rg -n "tiktoken|token.encode|len\(user" --type py
```
**False-positive guard:** Look for bounded `max_tokens` on output AND explicit input truncation/validation upstream.

### Tool-use without sandboxing — LangChain `PythonREPLTool`, `ShellTool`

**What to look for:** Agent toolkits that expose code-execution primitives. Any agent that can call `eval`, run shell commands, or hit the filesystem.
**Concrete grep / ripgrep query:**
```
rg -nP "from\s+langchain[\w_.]*\s+import\s+.*(?:PythonREPLTool|ShellTool|BashProcess|RequestsTool|TerminalTool)" --type py
rg -nP "Tool\(\s*func\s*=\s*(?:eval|exec|os\.system|subprocess\.)" --type py
rg -nP "PythonAstREPLTool|PythonREPL|create_python_agent|create_pandas_dataframe_agent" --type py
rg -nP "create_csv_agent\b|create_sql_agent\b" --type py
```
**File hint:** `agents/`, `tools/`, `chains/sql_chain.py`, RAG-with-execute use cases.
**False-positive guard:** `PythonREPLTool` running inside Docker / `nsjail` / restricted user is acceptable — confirm by reading the surrounding context (Dockerfile uses non-root user, no network, ephemeral FS).

### LangChain SQL agent without read-only DB user

**What to look for:** `SQLDatabase.from_uri(...)` with a connection string whose user has write/DDL grants; `create_sql_agent` without a separately-scoped `read_only` engine.
**Concrete grep / ripgrep query:**
```
rg -nP "SQLDatabase\.from_uri\(" --type py
rg -nP "create_sql_agent\(" --type py
```
**File hint:** Verify the DB role used in the URI lacks `INSERT`/`UPDATE`/`DELETE`/`DROP` grants.

### LangChain `LLMMathChain` / `RequestsChain` legacy chains

**What to look for:** historical chains that internally `eval` model output (`LLMMathChain` did so until late patches). `LLMRequestsChain` will fetch arbitrary URLs the model produces.
**Concrete grep / ripgrep query:**
```
rg -nP "LLMMathChain|LLMRequestsChain|APIChain|OpenAPIEndpointChain" --type py
```

### Insecure deserialisation of LangChain prompts/agents

**What to look for:** `load_prompt`/`load_chain` from disk, `pickle.loads` of agent state, `AgentExecutor` checkpoint restore.
**Why it's risky in Python:** Several LangChain `load_*` helpers historically used `pickle` — CVE-2024-46946 / similar RCEs. Loading attacker-supplied prompt yaml can also be unsafe.
**Concrete grep / ripgrep query:**
```
rg -nP "load_prompt\(|load_chain\(|load_agent\(" --type py
rg -nP "pickle\.loads?\([^)]*(?:agent|chain|memory|state)" --type py -i
```

### HuggingFace `trust_remote_code=True`

**What to look for:** `AutoTokenizer.from_pretrained(name, trust_remote_code=True)`, `AutoModel.from_pretrained(..., trust_remote_code=True)`, `pipeline(..., trust_remote_code=True)`.
**Why it's risky in Python:** the HF Hub model can ship arbitrary `.py` files that are executed at load time (RCE).
**Concrete grep / ripgrep query:**
```
rg -nP "trust_remote_code\s*=\s*True" --type py
rg -nP "from_pretrained\([^)]*trust_remote_code" --type py
```
**File hint:** `embeddings/`, `models/`, fine-tune pipelines, `sentence-transformers` config.
**False-positive guard:** When the model is a known repo on the HF Hub allowlist AND its commit SHA is pinned via `revision="<sha>"`, risk is lower but not zero.

### Loading models from arbitrary URLs

**What to look for:** `torch.load(url_or_path)` (uses pickle), `joblib.load`, `safetensors.load_file` on user-supplied paths.
**Concrete grep / ripgrep query:**
```
rg -nP "torch\.load\(" --type py
rg -nP "joblib\.load\(" --type py
rg -nP "pickle\.load\(" --type py
rg -nP "model\.load_state_dict\(\s*torch\.load" --type py
```
**File hint:** `safetensors.torch.load_file` is the safer alternative — flag plain `torch.load` use.

### Unbounded streaming without rate limit / token budget

**What to look for:** streamed responses without per-user spending guards; `stream=True` in OpenAI/Anthropic/Mistral SDK calls without daily budget enforcement.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:chat\.completions|messages|responses)\.create\([^)]*stream\s*=\s*True" --type py
rg -nP "openai\.AsyncOpenAI|AsyncAnthropic|stream_complete\(" --type py
rg -n "max_tokens" --type py
```
**False-positive guard:** Look for explicit `max_tokens` AND a per-user accounting layer (`celery rate_limit`, `redis.incr` for user spend, etc.).

### RAG without input sanitisation — vectorstore stuffing

**What to look for:** retrieved-chunk content treated as system context; an attacker who can write to the vectorstore can exfiltrate data via injected instructions.
**Concrete grep / ripgrep query:**
```
rg -nP "vectorstore\.add_(?:texts|documents)\(" --type py
rg -nP "Chroma|FAISS|Pinecone|Weaviate|Qdrant|PGVector|Milvus|LanceDB|Chromadb" --type py
rg -nP "(?:as_retriever|similarity_search|max_marginal_relevance_search)" --type py
```
**File hint:** Look at the surrounding code: who/what writes to the vectorstore, and is there content provenance metadata? Untrusted writers (web scrapes, user uploads) need explicit injection delimiting and scrubbing.

### Tool-use returning raw model output back to the model without validation

**What to look for:** OpenAI function-calling / Anthropic tool-use where the tool result is `json.dumps(arbitrary_user_data)` then re-fed without schema validation; `ToolMessage(content=raw_response)` in LangGraph.
**Concrete grep / ripgrep query:**
```
rg -nP "ToolMessage\(\s*content\s*=\s*" --type py
rg -nP "tool_call_results|tool_outputs" --type py
rg -nP "function_call|tool_calls" --type py
```

### Model output executed verbatim — `exec(model_output)`

**What to look for:** the absolute worst — direct `exec`/`eval` on model output. Common in "agent that writes Python" prototypes.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:eval|exec)\s*\(\s*(?:response|completion|output|result|message|content|llm_response)" --type py
rg -nP "exec\(\s*completion\.choices\[0\]" --type py
rg -nP "exec\(\s*response\.content" --type py
```

### Hardcoded model API keys / no env var fallback

**What to look for:** `OpenAI(api_key="sk-...")` literal, `Anthropic(api_key="sk-ant-...")` literal. Dovetails with secret-scanner findings but specifically in LLM-client constructors.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:OpenAI|Anthropic|Cohere|MistralClient|Groq|Together|Replicate|GenerativeAI)\([^)]*api_key\s*=\s*[\x27\"][^\x27\"\$\{][^\x27\"]+[\x27\"]" --type py
rg -nP "openai\.api_key\s*=\s*[\x27\"][^\x27\"\$\{]" --type py
```

### Unverified webhook from LLM provider

**What to look for:** webhook handlers for OpenAI / Anthropic batch jobs / Replicate predictions without HMAC signature verification.
**Concrete grep / ripgrep query:**
```
rg -nP "@(?:app|router)\.(?:post|route)\([\x27\"][^\x27\"]*(?:webhook|callback)[^\x27\"]*[\x27\"]" --type py
rg -n "X-(?:Replicate|OpenAI|Anthropic)-Signature" --type py -i
rg -n "hmac\.compare_digest|hmac\.new" --type py
```

### Sensitive data exfiltrated via embeddings

**What to look for:** PII or secrets embedded into a third-party-hosted vector store. Embeddings are reversible-enough to leak content.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:OpenAIEmbeddings|VoyageEmbeddings|CohereEmbeddings|HuggingFaceEmbeddings)\(" --type py
rg -nP "embed_documents\([^)]*(?:user|customer|patient|email|ssn|account)" --type py -i
```

### Model output not escaped before HTML render

**What to look for:** chatbot front-ends that render model markdown/HTML directly (XSS vector if model is compromised or prompt-injected).
**Concrete grep / ripgrep query:**
```
rg -nP "(?:mark_safe|Markup|render_template_string)\([^)]*(?:response|completion|message|content)" --type py
rg -nP "\|safe" -g '*.html' -g '*.j2' -g '*.jinja*'
```

### Logging full prompts/completions (PII / secret leak)

**What to look for:** logging the full request/response payload to LLM providers — captures whatever the user typed, possibly with secrets.
**Concrete grep / ripgrep query:**
```
rg -nP "log(?:ger)?\.\w+\([^)]*(?:prompt|completion|messages|response\.choices|completion_tokens)" --type py
rg -nP "print\([^)]*(?:prompt|completion|messages|response\.choices)" --type py
```

### Caching prompts without key derivation that includes user identity

**What to look for:** `@lru_cache` on a function that takes raw user prompt and returns LLM response — collisions across users can leak data; cache keys built without user/tenant scoping.
**Concrete grep / ripgrep query:**
```
rg -nP "@(?:lru_cache|cache|cached)" --type py -A3 | rg -B1 "openai|anthropic|llm|chat"
```

### MCP / tool registration that enumerates filesystem / env

**What to look for:** MCP servers, OpenAI function definitions, or LangChain Tools that expose `os.environ`, `pathlib.Path('/').glob('**/*')`, `subprocess.run(['env'])` — agent can read all env vars (including secrets).
**Concrete grep / ripgrep query:**
```
rg -nP "def\s+\w+\([^)]*\)\s*->\s*[^:]*:\s*\n\s*(?:return\s+)?os\.environ" --type py -U
rg -nP "Tool\(\s*name\s*=\s*[\x27\"](?:env|exec|shell|read_file|write_file)" --type py
```

### `litellm` / `instructor` / `dspy` / `outlines` proxy misconfiguration

**What to look for:** `litellm.proxy` configured with `--allowed_models *` or no model allowlist; `instructor.patch` enabling automatic retry that amplifies cost; `dspy` `OpenAI` clients without `max_tokens`.
**Concrete grep / ripgrep query:**
```
rg -nP "litellm\.completion\(|litellm\.acompletion\(|litellm_proxy" --type py
rg -nP "instructor\.(?:patch|from_openai|from_anthropic)" --type py
rg -nP "dspy\.(?:OpenAI|Anthropic|Cohere)\(" --type py
```

### Agent loop without iteration cap

**What to look for:** `AgentExecutor(... max_iterations=None)`, `while True:` loops with LLM calls inside, LangGraph nodes with no recursion limit.
**Concrete grep / ripgrep query:**
```
rg -nP "AgentExecutor\([^)]*max_iterations\s*=\s*(?:None|\d{3,})" --type py
rg -nP "max_iterations\s*=" --type py
rg -nP "graph\.compile\([^)]*\)" --type py
rg -n "recursion_limit" --type py
```

### Streaming response handler missing client-disconnect handling

**What to look for:** `async def stream_chat(...)` generators that keep generating tokens after the client disconnects — wastes money and can leak partial responses.
**Concrete grep / ripgrep query:**
```
rg -nP "async\s+def\s+\w+.*[^)]*Request" --type py -A5 | rg -i "stream|yield"
rg -n "request.is_disconnected" --type py
```
