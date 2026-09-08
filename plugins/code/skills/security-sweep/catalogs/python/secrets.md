# secret-scanner — Python catalog

> Inlined into the secret-scanner system prompt when the audited repo's primary language is `python`. Every entry below is a concrete Python-specific secret hot-spot, not generic regex advice.

## File globs to scan

- `**/*.py`
- `**/.env`, `**/.env.*`, `**/env.*`, `**/*.env`
- `**/settings*.py`, `**/local_settings.py`, `**/dev_settings.py`, `**/prod_settings.py`
- `**/config.py`, `**/configs/*.py`, `**/instance/config.py`, `**/secrets.py`, `**/credentials.py`
- `**/*.cfg`, `**/*.ini`, `**/setup.cfg`, `**/tox.ini`, `**/alembic.ini`, `**/pytest.ini`
- `**/pyproject.toml`, `**/setup.py`
- `**/Pipfile`, `**/Pipfile.lock`, `**/poetry.lock`
- `**/pip.conf`, `**/.pypirc`
- `**/conftest.py`, `**/tests/**/*.py`, `**/tests/fixtures/**/*`
- `**/*.ipynb` (Jupyter — both source and outputs)
- `**/Dockerfile*`, `**/docker-compose*.y*ml` (often hold Python-app env vars)

## Native tooling

- `gitleaks detect --source . --no-git`
- `trufflehog filesystem .`
- `detect-secrets scan .` (Python-native, plugin architecture)
- `bandit -r . -t B105,B106,B107,B108` (hardcoded-password rules)
- `pip-licenses --format=json` (not secrets, but adjacent inventory)

## Risk patterns

### Django `SECRET_KEY` hardcoded in `settings.py`

**What to look for:** `SECRET_KEY = '...'` literal in any `settings*.py`, `config.py`, or `app.py`. Especially `django-insecure-` prefix from `startproject` scaffolding.
**Why it's risky in Python:** `SECRET_KEY` signs sessions, password-reset tokens, CSRF cookies, and cached form state — leak = full account takeover.
**Concrete grep / ripgrep query:**
```
rg -nP "SECRET_KEY\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" -g 'settings*.py' -g 'config*.py' -g 'app.py'
rg -nP "SECRET_KEY\s*=\s*[\x27\"]django-insecure-" --type py
```
**File hint:** `myproject/settings.py`, `myproject/settings/dev.py`, sometimes split across `settings/base.py` + `settings/prod.py`.
**False-positive guard:** `SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]` or `os.getenv(...)` is correct. Some teams use `django-environ`'s `env('SECRET_KEY')` — also safe.

### Flask `app.config['SECRET_KEY']` / `app.secret_key` literal

**What to look for:** `app.secret_key = 'dev'`, `app.config.update(SECRET_KEY='...')`, `app.config['SECRET_KEY'] = '...'`.
**Concrete grep / ripgrep query:**
```
rg -nP "app\.secret_key\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
rg -nP "[\x27\"]SECRET_KEY[\x27\"]\s*[:=]\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
```
**False-positive guard:** Loaded from env (`app.config.from_envvar('APP_CONFIG')`) is safe.

### `os.environ.setdefault(...)` with embedded production secret

**What to look for:** test/dev code that pre-populates env with real-looking secrets — common antipattern in `conftest.py` and `manage.py`.
**Concrete grep / ripgrep query:**
```
rg -nP "os\.environ\.setdefault\(\s*[\x27\"](?:AWS_|STRIPE_|SLACK_|GITHUB_|GH_TOKEN|HF_|DATABASE_URL|DJANGO_SECRET_KEY)" --type py
rg -nP "os\.environ\[[\x27\"][A-Z_]+[\x27\"]\]\s*=\s*[\x27\"][A-Za-z0-9_/+=-]{20,}[\x27\"]" --type py
```
**File hint:** `conftest.py`, `manage.py`, custom test bootstraps, CI helper scripts.

### Hardcoded DB connection strings

**What to look for:** `DATABASES['default']` with literal password; SQLAlchemy `create_engine("postgresql://user:pass@...")`; `psycopg2.connect(password=...)`; `pymongo.MongoClient("mongodb+srv://user:pass@...")`.
**Concrete grep / ripgrep query:**
```
rg -nP "create_engine\(\s*[fF]?[\x27\"](?:postgresql|mysql|mssql|oracle|sqlite|cockroachdb)\+?\w*://[^:@/\s]+:[^@/\s]+@" --type py
rg -nP "[\x27\"](?:postgresql|mysql|mongodb(?:\+srv)?|redis|amqp)://[^:@/\s]+:[^@/\s]+@" --type py
rg -nP "(?:psycopg2|pymysql|mysql\.connector|cx_Oracle)\.connect\([^)]*password\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
rg -nP "[\x27\"]PASSWORD[\x27\"]\s*:\s*[\x27\"][^\x27\"]+[\x27\"]" -g 'settings*.py'
```
**File hint:** `settings.py` `DATABASES`, Alembic `env.py`, Django `database_router.py`, integration tests.

### Cloud provider tokens

**What to look for:** AWS/GCP/Azure access keys in source.
**Concrete grep / ripgrep query:**
```
rg -nP "AKIA[0-9A-Z]{16}"        # AWS access key
rg -nP "ASIA[0-9A-Z]{16}"        # AWS temporary
rg -nP "aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{40}" -i
rg -nP "AIza[0-9A-Za-z_-]{35}"   # Google API key
rg -nP "ya29\.[A-Za-z0-9_-]+"    # Google OAuth access token
rg -nP "[a-z0-9]{32}-us[0-9]+"   # Mailchimp
rg -nP "DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{86,}=="  # Azure storage
rg -nP "[\x27\"]type[\x27\"]\s*:\s*[\x27\"]service_account[\x27\"]" --type json   # GCP SA JSON
```
**File hint:** `.env`, `settings.py`, vendored credentials JSON files committed by accident, `test_*.py` mock data.

### Stripe / Twilio / SendGrid / Slack / GitHub tokens

**What to look for:** distinctive token prefixes commonly bound to Python-SDK clients.
**Concrete grep / ripgrep query:**
```
rg -nP "sk_live_[0-9a-zA-Z]{24,}"        # Stripe secret
rg -nP "rk_live_[0-9a-zA-Z]{24,}"        # Stripe restricted
rg -nP "SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}"  # SendGrid
rg -nP "AC[a-f0-9]{32}"                  # Twilio Account SID
rg -nP "xox[baprs]-[A-Za-z0-9-]{10,}"    # Slack tokens
rg -nP "ghp_[A-Za-z0-9]{36}"             # GitHub PAT
rg -nP "github_pat_[A-Za-z0-9_]{82}"     # GitHub fine-grained PAT
rg -nP "ghs_[A-Za-z0-9]{36}"             # GitHub server-to-server
rg -nP "gho_[A-Za-z0-9]{36}"             # GitHub OAuth
```
**File hint:** payment-handler views, notification utilities, OAuth clients, CI deployment scripts.

### Python-ecosystem-specific tokens

**What to look for:** PyPI, HuggingFace, OpenAI, Anthropic, Replicate keys — extremely common in Python codebases.
**Concrete grep / ripgrep query:**
```
rg -nP "pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}"   # PyPI API token
rg -nP "hf_[A-Za-z]{34}"                          # HuggingFace
rg -nP "sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}"   # legacy OpenAI
rg -nP "sk-proj-[A-Za-z0-9_-]{50,}"               # OpenAI project key
rg -nP "sk-ant-(?:api|admin)\d{2}-[A-Za-z0-9_-]{90,}"  # Anthropic
rg -nP "r8_[A-Za-z0-9]{40}"                       # Replicate
rg -nP "co_[A-Za-z0-9]{40}"                       # Cohere
rg -nP "AIza[0-9A-Za-z_-]{35}"                    # Google (Gemini share AIza prefix)
rg -nP "gsk_[A-Za-z0-9]{52}"                      # Groq
rg -nP "(?:OPENAI|ANTHROPIC|HF|HUGGINGFACE|COHERE|REPLICATE)_API_KEY\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
```
**File hint:** notebooks, `llm_client.py`, `chains/*.py` (LangChain), `embeddings.py`.

### `.pypirc` / `pip.conf` with embedded credentials

**What to look for:** uploaders' credentials checked into the repo, or private-index URLs containing `user:password`.
**Concrete grep / ripgrep query:**
```
rg -n "(?i)\[pypi[^\]]*\]" -g '.pypirc' -g 'pypirc'
rg -nP "username\s*=" -g '.pypirc'
rg -nP "password\s*=" -g '.pypirc'
rg -nP "index-url\s*=\s*https?://[^:]+:[^@]+@" -g 'pip.conf' -g 'pip.ini' -g 'requirements*.txt'
rg -nP "extra-index-url\s*=\s*https?://[^:]+:[^@]+@" --type py
```
**File hint:** `~/.pypirc` accidentally committed, custom internal `pip.conf` for private mirrors.

### `pyproject.toml` / `setup.py` with embedded `index_url`

**What to look for:** Poetry private source / PEP 621 `[[tool.poetry.source]]` carrying embedded credentials.
**Concrete grep / ripgrep query:**
```
rg -nP "url\s*=\s*[\x27\"]https?://[^:]+:[^@]+@" -g 'pyproject.toml'
rg -nP "dependency_links\s*=" -g 'setup.py' -g 'setup.cfg'
```

### Jupyter notebooks — secrets in code AND outputs

**What to look for:** `.ipynb` JSON contains both `source` (code cells) and `outputs` (execution results) — secrets often appear in both. `print(api_key)` debugging leaks into output cells; `os.environ['OPENAI_API_KEY'] = '...'` literal in a setup cell.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:os\.environ|os\.getenv)\[\s*[\x27\"][A-Z_]+[\x27\"]\s*\]\s*=\s*[\x27\"][A-Za-z0-9_/+=.-]{16,}" -g '*.ipynb'
rg -nP "[\x27\"](?:api_key|password|token|secret)[\x27\"]\s*:\s*[\x27\"][^\x27\"]{12,}[\x27\"]" -g '*.ipynb' -i
rg -nP "(?:sk-|ghp_|hf_|AIza|AKIA|xox[baprs]-)" -g '*.ipynb'
```
**File hint:** `notebooks/`, `examples/`, `*.ipynb` in any directory.
**False-positive guard:** Recommend `nbstripout` pre-commit hook to strip outputs — flag missing config (`.git/config` `filter.nbstripout` or `.pre-commit-config.yaml` entry).

### Test fixtures with real-looking secrets

**What to look for:** `tests/fixtures/*.json`, `tests/data/*.yaml`, `tests/conftest.py` with strings that match production token formats.
**Concrete grep / ripgrep query:**
```
rg -nP "[\x27\"](?:sk-|sk_live_|AKIA|ghp_|hf_|xox[baprs]-|AIza)" -g 'tests/**' -g 'test_*.py'
rg -nP "(?:secret|password|token|key)\s*[:=]\s*[\x27\"][A-Za-z0-9+/=_-]{20,}" -g 'conftest.py' -i
```
**False-positive guard:** Look for naming conventions like `_TEST_`, `_FAKE_`, `_DUMMY_`, `EXAMPLE`, or repeated chars (`AAAA`/`xxxx`). Real-format randoms are suspicious; placeholders like `sk_test_...` are Stripe test mode (still flag — could indicate live data nearby).

### Environment files committed (`.env`, `.env.production`)

**What to look for:** any `.env*` file tracked by git. Even templates can leak (`.env.example` containing real values).
**Concrete grep / ripgrep query:**
```
rg --files -g '.env*' -g 'env.*'
rg -nP "^[A-Z_]+=[^#\s][^\n]*" -g '.env*'
```
**File hint:** confirm `.gitignore` lists `.env`, `.env.local`, `.env.*.local`.

### `.cfg` / `.ini` / `alembic.ini` credentials

**What to look for:** Alembic's `sqlalchemy.url`, `setup.cfg` `[options]` with private index, `pytest.ini` env injection.
**Concrete grep / ripgrep query:**
```
rg -nP "sqlalchemy\.url\s*=\s*\w+\+?\w*://[^:]+:[^@]+@" -g '*.ini' -g '*.cfg'
rg -nP "(?:^|\s)password\s*=\s*[^\$\{\s][^\n]{6,}" -g '*.ini' -g '*.cfg' -i
```
**False-positive guard:** `sqlalchemy.url = ${DATABASE_URL}` style interpolation is OK.

### `boto3.Session(aws_access_key_id=..., aws_secret_access_key=...)` literal

**What to look for:** SDK constructors that bypass the default credential chain.
**Concrete grep / ripgrep query:**
```
rg -nP "boto3\.(?:client|resource|Session)\([^)]*aws_access_key_id\s*=\s*[\x27\"][^\x27\"]+" --type py
rg -nP "aws_secret_access_key\s*=\s*[\x27\"][A-Za-z0-9/+=]{40}[\x27\"]" --type py
```

### SSH / TLS private key material in code

**What to look for:** PEM headers, RSA/EC/Ed25519 private blocks pasted as Python string literals.
**Concrete grep / ripgrep query:**
```
rg -nP "-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY-----"
rg -nP "PRIVATE_KEY\s*=\s*[bfrBFR]?[\x27\"]{1,3}-----BEGIN" --type py
```
**File hint:** `cryptography`/`paramiko`-using modules, GitHub App handlers, SSL pinning helpers.

### Generic "hardcoded password" patterns Bandit catches

**What to look for:** Bandit B105/B106/B107 patterns — function arg `password="literal"`, default kwarg `def login(user, pw="123")`, comparison `if pw == "letmein":`.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:password|passwd|pwd|secret|token|api_key)\s*=\s*[\x27\"][^\x27\"\$\{][^\x27\"]{4,}[\x27\"]" --type py -i
rg -nP "def\s+\w+\([^)]*(?:password|secret|token|api_key)\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" --type py -i
```
**False-positive guard:** placeholders like `"changeme"`, `"<your-key>"`, `"REPLACE_ME"`, env-substituted (`${VAR}`) values, and obvious test fixtures using `"x" * N`.

### Sentry DSN / Datadog API keys / observability tokens

**What to look for:** `sentry_sdk.init(dsn="https://...@sentry.io/...")` literal; `datadog.initialize(api_key="...", app_key="...")`.
**Concrete grep / ripgrep query:**
```
rg -nP "sentry_sdk\.init\([^)]*dsn\s*=\s*[\x27\"]https?://[a-f0-9]{32}@" --type py
rg -nP "datadog\.initialize\([^)]*api_key\s*=\s*[\x27\"][a-f0-9]{32}" --type py
```

### Prefect / Airflow / Dagster Variables and Connections

**What to look for:** Airflow `Variable.set('snowflake_pw', '...')` checked in; DAG files holding raw connection strings; Prefect Secret blocks with literal values.
**Concrete grep / ripgrep query:**
```
rg -nP "Variable\.set\(\s*[\x27\"][^\x27\"]+[\x27\"]\s*,\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
rg -nP "Connection\([^)]*password\s*=\s*[\x27\"][^\x27\"]+[\x27\"]" --type py
```
**File hint:** `dags/`, `flows/`, `pipelines/` directories.
