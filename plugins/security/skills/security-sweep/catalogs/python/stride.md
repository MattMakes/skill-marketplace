# stride-modeler — Python catalog

> Inlined into the stride-modeler system prompt when the audited repo's primary language is `python`. Every entry below maps a STRIDE category to a concrete pattern in Python web/worker/data deployments — not generic threat-modelling advice.

## File globs to scan

- `**/*.py`
- `**/settings*.py`, `**/config*.py`, `**/wsgi.py`, `**/asgi.py`, `**/manage.py`
- `**/urls.py`, `**/views.py`, `**/middleware.py`, `**/middlewares/**/*.py`
- `**/serializers.py`, `**/permissions.py`, `**/authentication.py`, `**/auth.py`
- `**/tasks.py`, `**/celery.py`, `**/celeryconfig.py`, `**/celery_app.py`
- `**/signals.py`, `**/handlers.py`, `**/routing.py` (Channels)
- `**/Dockerfile*`, `**/docker-compose*.y*ml`, `**/*.k8s.y*ml`, `**/helm/**/*.y*ml`
- `**/.github/workflows/*.y*ml`
- `**/gunicorn*.conf.py`, `**/uvicorn*.conf*`, `**/supervisord.conf`

## Common Python deployment shapes (use to choose components)

- **WSGI sync:** `gunicorn` (sync workers) + `nginx` reverse proxy → Django/Flask app
- **ASGI async:** `uvicorn` / `hypercorn` → FastAPI / Starlette / Django Channels
- **Serverless:** Flask on AWS Lambda via `Mangum` / `Zappa`; Django via `Zappa`; FastAPI via `Mangum`; Google Cloud Functions via `functions-framework`
- **Worker tier:** Celery + Redis/RabbitMQ/SQS; RQ; Dramatiq; APScheduler; Prefect; Airflow; Dagster
- **Data tier:** SQLAlchemy/psycopg2 to Postgres/MySQL; PyMongo; redis-py; pymemcache
- **Realtime:** Django Channels; FastAPI WebSockets; `python-socketio`

## Trust boundaries to enumerate per repo

1. **Internet ↔ reverse proxy** (nginx/ALB) ↔ **WSGI/ASGI server** (gunicorn/uvicorn)
2. **Web process ↔ DB** (psycopg, pymysql, SQLAlchemy)
3. **Web process ↔ cache** (redis-py, memcached)
4. **Web process → message broker → Celery/RQ workers**
5. **Workers ↔ external HTTP APIs** (`requests`, `httpx`)
6. **Django middleware order / FastAPI dependency-injection tree** as in-process boundaries
7. **Django Signals / Celery `task_postrun`** as implicit pub/sub boundary
8. **Async background tasks** (`asyncio.create_task`, FastAPI `BackgroundTasks`) blur boundaries

## Risk patterns by STRIDE category

### S — Spoofing

**Auth backend ordering letting weak backends shadow strong ones**

**What to look for:** Django `AUTHENTICATION_BACKENDS` listing a permissive backend before the canonical one (e.g. `RemoteUserBackend` before `ModelBackend`).
**Concrete grep / ripgrep query:**
```
rg -nP "AUTHENTICATION_BACKENDS\s*=\s*\[" -g 'settings*.py' -A5
rg -nP "AUTH_USER_MODEL\s*=" -g 'settings*.py'
```

**JWT signed with `HS256` and a guessable / committed secret**

**What to look for:** `jwt.encode(payload, key, algorithm='HS256')` where `key` is a literal or `settings.SECRET_KEY` (which may itself be checked in).
**Concrete grep / ripgrep query:**
```
rg -nP "jwt\.encode\([^)]*algorithm\s*=\s*[\x27\"]HS256[\x27\"]" --type py
rg -nP "jwt\.encode\([^)]*settings\.SECRET_KEY" --type py
```

**No mutual TLS / no signed inter-service requests**

**What to look for:** internal microservices using `requests.get(internal_url)` with no auth header derivation, no mTLS context, no service mesh.
**Concrete grep / ripgrep query:**
```
rg -nP "requests\.\w+\(\s*[\x27\"]https?://(?:internal|svc|backend|svc\.cluster\.local)" --type py
rg -nP "requests\.\w+\([^)]*verify\s*=\s*False" --type py
```

### T — Tampering

**DRF endpoints with no authentication / permission classes**

**What to look for:** API views with `permission_classes = [AllowAny]` or no `DEFAULT_PERMISSION_CLASSES` in `REST_FRAMEWORK`. State-changing endpoints especially.
**Concrete grep / ripgrep query:**
```
rg -nP "permission_classes\s*=\s*\[\s*AllowAny\s*\]" --type py
rg -n "REST_FRAMEWORK" -g 'settings*.py' -A20
rg -nP "@api_view\(\[[\x27\"](?:POST|PUT|PATCH|DELETE)[\x27\"]\]\)" --type py
```

**Django middleware order — security middleware not first**

**What to look for:** `SecurityMiddleware`, `CommonMiddleware`, `CsrfViewMiddleware` not in correct order. Middleware order in Django matters: `SecurityMiddleware` must be near the top.
**Concrete grep / ripgrep query:**
```
rg -nP "MIDDLEWARE\s*=" -g 'settings*.py' -A20
```
**Reference order (top-to-bottom):** `SecurityMiddleware` → `SessionMiddleware` → `CommonMiddleware` → `CsrfViewMiddleware` → `AuthenticationMiddleware` → `MessageMiddleware` → `XFrameOptionsMiddleware`.

**Celery accepts `pickle` serializer**

**What to look for:** `task_serializer = 'pickle'`, `accept_content = ['pickle']`, `result_serializer = 'pickle'`. Anyone who can write to the broker (Redis/RabbitMQ) can ship arbitrary code.
**Concrete grep / ripgrep query:**
```
rg -nP "(?:CELERY_)?(?:TASK_|RESULT_)?SERIALIZER\s*=\s*[\x27\"]pickle[\x27\"]" --type py
rg -nP "(?:CELERY_)?ACCEPT_CONTENT\s*=.*pickle" --type py
rg -n "task_serializer|accept_content" --type py
```
**False-positive guard:** `task_serializer = 'json'` is the safe default. Auditing the broker access controls is also relevant — Redis exposed without `requirepass` is a separate finding.

**FastAPI `BackgroundTasks` lacking idempotency / retry safety**

**What to look for:** background tasks doing money/state mutation without an idempotency key. Failed-but-partially-applied state is a tampering vector.
**Concrete grep / ripgrep query:**
```
rg -nP "BackgroundTasks\b" --type py
rg -nP "background_tasks\.add_task\(" --type py
```

**Mass assignment in DRF / Pydantic**

**What to look for:** `serializers.ModelSerializer` with `fields = '__all__'` or no `read_only_fields = ('is_admin', 'is_staff', 'user')`.
**Concrete grep / ripgrep query:**
```
rg -nP "fields\s*=\s*[\x27\"]__all__[\x27\"]" --type py
rg -nP "class\s+Meta\s*:\s*$" --type py -A5 | rg "fields"
```

### R — Repudiation

**No audit log / no `django-auditlog` / no structured audit channel**

**What to look for:** absence of audit-trail libraries; security-relevant actions (login, permission change, money movement) only logged via `logging.info` (often discarded or non-tamper-evident).
**Concrete grep / ripgrep query:**
```
rg -n "django-auditlog|django_auditlog|simple-history|django-simple-history|django-pghistory|loguru" -g 'requirements*.txt' -g 'pyproject.toml'
rg -nP "from\s+auditlog" --type py
rg -nP "auditlog\.register\(" --type py
```

**Logger silently dropping records (no central aggregator)**

**What to look for:** `logging.basicConfig(level=logging.WARNING)` only, no handlers shipping to a central aggregator (CloudWatch / Datadog / ELK), no `LOGGING` dict in Django settings.
**Concrete grep / ripgrep query:**
```
rg -nP "LOGGING\s*=\s*\{" -g 'settings*.py'
rg -nP "logging\.basicConfig" --type py
```

**Celery tasks missing `bind=True` task_id propagation / no retry/log of business outcomes**

**What to look for:** `@app.task` (no bind, no retry policy, no logging of result) — failures vanish.
**Concrete grep / ripgrep query:**
```
rg -nP "@(?:app|celery|shared_task)(?:\.task)?\b" --type py -A3
```

### I — Information disclosure

**`DEBUG=True` exposing yellow stack traces (incl. local vars + secrets)**

**What to look for:** Django/Flask debug mode reachable in prod; Werkzeug debugger PIN exposed.
**Concrete grep / ripgrep query:**
```
rg -nP "DEBUG\s*=\s*True" -g 'settings*.py' -g 'config*.py'
rg -nP "app\.run\([^)]*debug\s*=\s*True" --type py
rg -n "WERKZEUG_DEBUG_PIN" -g 'Dockerfile*' -g 'docker-compose*' -g '.env*'
```

**FastAPI `/docs`, `/redoc`, `/openapi.json` left enabled in prod**

**What to look for:** default `FastAPI()` constructor with no `docs_url=None` for prod environments.
**Concrete grep / ripgrep query:**
```
rg -nP "FastAPI\(\s*\)" --type py
rg -nP "FastAPI\([^)]*docs_url\s*=" --type py
rg -nP "FastAPI\([^)]*openapi_url\s*=" --type py
```

**Detailed exception responses returned to client**

**What to look for:** custom `exception_handlers` returning `traceback.format_exc()`, DRF default with `DEBUG=True` returning full stack, FastAPI middlewares serialising exceptions verbosely.
**Concrete grep / ripgrep query:**
```
rg -nP "traceback\.format_exc\(\)" --type py
rg -nP "(?:JSON|HTML)Response\([^)]*traceback" --type py
rg -nP "exception_handler\b" --type py -A5
```

**`ALLOWED_HOSTS = ['*']` enabling Host-header attacks**

**What to look for:** Django settings allowing any Host header — enables password reset link tampering, cache poisoning.
**Concrete grep / ripgrep query:**
```
rg -nP "ALLOWED_HOSTS\s*=\s*\[\s*[\x27\"]\*[\x27\"]\s*\]" --type py
rg -n "USE_X_FORWARDED_HOST\s*=\s*True" --type py
```

**Logging full request bodies / headers (PII / token leak)**

**What to look for:** middlewares dumping `request.body`, `request.headers`, `request.META`. The `Authorization` header alone exposes tokens.
**Concrete grep / ripgrep query:**
```
rg -nP "log(?:ger)?\.\w+\([^)]*request\.(?:META|headers|body|POST|GET|data|json)" --type py
rg -nP "print\([^)]*request\." --type py
```

**Cross-tenant data leak from missing `tenant_id` filter**

**What to look for:** `Model.objects.get(pk=request.GET['id'])` without scoping to the current user/tenant — IDOR class.
**Concrete grep / ripgrep query:**
```
rg -nP "\.objects\.get\([^)]*pk\s*=\s*(?:request\.|kwargs\[)" --type py
rg -nP "\.objects\.filter\([^)]*pk\s*=\s*(?:request\.|kwargs\[)" --type py
rg -nP "\.objects\.get_or_create\(\s*\*\*request\." --type py
```

**Cookies missing Secure / HttpOnly / SameSite**

**What to look for:** Django/Flask session cookie config not enforcing security flags.
**Concrete grep / ripgrep query:**
```
rg -nP "SESSION_COOKIE_SECURE\s*=\s*False" --type py
rg -nP "CSRF_COOKIE_SECURE\s*=\s*False" --type py
rg -nP "SESSION_COOKIE_HTTPONLY\s*=\s*False" --type py
rg -nP "SESSION_COOKIE_SAMESITE\s*=\s*None" --type py
rg -nP "session_cookie_secure\s*=\s*False" --type py
rg -nP "set_cookie\([^)]*secure\s*=\s*False" --type py
rg -nP "set_cookie\([^)]*httponly\s*=\s*False" --type py
```

**Verbose error from gunicorn / uvicorn access logs**

**What to look for:** access-log format that includes query strings (potentially containing tokens) — `%(q)s` in gunicorn access log format.
**Concrete grep / ripgrep query:**
```
rg -nP "access_log_format" -g 'gunicorn*.conf.py' -g '*.conf'
rg -nP "%[\(]?q[\)]?s" -g 'gunicorn*.conf.py' -g '*.conf'
```

### D — Denial of service

**No rate limiting middleware / no per-user throttle**

**What to look for:** absence of `django-ratelimit`, `django-axes`, DRF throttles, FastAPI `slowapi`, Flask-Limiter.
**Concrete grep / ripgrep query:**
```
rg -nP "django-ratelimit|django_ratelimit|django-axes|django_axes|slowapi|flask-limiter|flask_limiter|fastapi-limiter" -g 'requirements*.txt' -g 'pyproject.toml'
rg -nP "DEFAULT_THROTTLE_CLASSES" -g 'settings*.py'
rg -nP "@ratelimit\(|@limiter\.limit\(" --type py
```

**Unbounded file uploads**

**What to look for:** `request.FILES['file'].read()` without size check; FastAPI `UploadFile` with no `max_upload_size`; Flask `MAX_CONTENT_LENGTH` unset.
**Concrete grep / ripgrep query:**
```
rg -n "MAX_CONTENT_LENGTH" --type py
rg -n "DATA_UPLOAD_MAX_MEMORY_SIZE|FILE_UPLOAD_MAX_MEMORY_SIZE" --type py
rg -nP "request\.FILES\[" --type py
rg -nP "UploadFile\b" --type py
```

**Sync I/O blocking ASGI event loop**

**What to look for:** `requests.get(...)` (blocking) inside an async FastAPI/Starlette handler; `time.sleep` inside async; Django ORM calls in async views without `sync_to_async`.
**Concrete grep / ripgrep query:**
```
rg -nP "async\s+def\s+\w+" --type py -A20 | rg -nP "(?:requests\.|time\.sleep|psycopg2\.|pymysql\.)"
rg -nP "async\s+def" --type py -A10 | rg "\.objects\.(?:get|filter|create|update|delete)"
```

**Catastrophic regex on user input**

**What to look for:** `re.match` with `(a+)+` style patterns on request data.
**Concrete grep / ripgrep query:**
```
rg -nP "re\.(?:match|search|findall|fullmatch)\([^)]*[\(\[][^)\]]*[+*][^)\]]*[\)\]][+*]" --type py
```

**No body-size limit at the proxy / no timeouts**

**What to look for:** gunicorn `--timeout 0` (no timeout), uvicorn no `--timeout-keep-alive`, missing `client_max_body_size` in nginx config alongside the Python app.
**Concrete grep / ripgrep query:**
```
rg -nP "timeout\s*=\s*0" -g 'gunicorn*.conf.py' -g 'Dockerfile*' -g '*.sh'
rg -nP "(?:--timeout|--graceful-timeout|--keep-alive)\s+\d+" -g 'Dockerfile*' -g '*.sh' -g 'Procfile*'
rg -n "client_max_body_size" -g 'nginx*.conf'
```

**Celery without `task_time_limit` / `task_soft_time_limit`**

**What to look for:** runaway Celery tasks consuming workers indefinitely.
**Concrete grep / ripgrep query:**
```
rg -n "task_time_limit|task_soft_time_limit|CELERYD_TASK_TIME_LIMIT" --type py
rg -nP "@(?:app|celery|shared_task)(?:\.task)?\(\s*\)" --type py
```

### E — Elevation of privilege

**`is_superuser=True` toggles via API**

**What to look for:** any endpoint that accepts a user-mutation payload that includes `is_superuser`, `is_staff`, `is_admin` fields without server-side stripping.
**Concrete grep / ripgrep query:**
```
rg -nP "is_(?:superuser|staff|admin)" --type py
rg -nP "Meta\.fields.*[\x27\"]is_(?:superuser|staff|admin)[\x27\"]" --type py
rg -nP "\.objects\.create_superuser\(" --type py
```

**Django admin exposed in production**

**What to look for:** `admin.site.urls` mounted at predictable path with no IP allowlist / no MFA.
**Concrete grep / ripgrep query:**
```
rg -nP "path\([\x27\"]admin/[\x27\"],\s*admin\.site\.urls\)" --type py
rg -n "admin\.site\.urls" --type py
```

**`SUPERUSER_REQUIREMENTS = (...)` bypassed via custom user model**

**What to look for:** custom `UserManager.create_user` / `create_superuser` that doesn't enforce password hashing or skips permission checks.
**Concrete grep / ripgrep query:**
```
rg -nP "def\s+create_(?:user|superuser)\(" --type py -A10
```

**`@user_passes_test` predicate inverted or weak**

**What to look for:** decorator using `lambda u: True` or `lambda u: u.is_authenticated` for an admin-only view.
**Concrete grep / ripgrep query:**
```
rg -nP "@user_passes_test\(\s*lambda\s+u\s*:\s*True" --type py
rg -nP "@user_passes_test\(" --type py
```

**Django Signals / Celery hooks running with elevated context**

**What to look for:** `pre_save` / `post_save` signals or `task_prerun` handlers that bypass permission checks (they run regardless of whoever triggered the parent action).
**Concrete grep / ripgrep query:**
```
rg -nP "@receiver\(" --type py -A5
rg -nP "task_prerun\.connect|task_postrun\.connect" --type py
```

**Container/Lambda running as root with broad IAM**

**What to look for:** Dockerfile lacking `USER` directive (defaults to root); Lambda `iam:*` policies; Cloud Run service account with `roles/owner`.
**Concrete grep / ripgrep query:**
```
rg -nP "^USER\s+" -g 'Dockerfile*'
rg -nP "^FROM\s+python" -g 'Dockerfile*'
rg -nP "(?:iam|roles)/owner|AdministratorAccess" -g '*.yaml' -g '*.yml' -g '*.tf' -g '*.json'
```
**File hint:** Look for absence of `USER appuser` (or similar) at end of Dockerfile.

## Component-by-component STRIDE prompts (use as a checklist when modelling)

For each component identified, ask:
- **S:** Who can pretend to be this component or its caller? (Token format, mTLS, signed cookies)
- **T:** What inputs are written without auth/integrity checks? (DB writes, file writes, cache writes)
- **R:** Are state-changing actions traceable to an authenticated principal? (audit log, request_id propagation through Celery)
- **I:** What can the component leak via response, log, or telemetry? (DEBUG, traces, headers, full request bodies, OpenAPI doc)
- **D:** What unbounded resource can be exhausted? (uploads, regex, sync calls in async, Celery without time limit, no rate limit)
- **E:** What in this component runs as a higher-privilege identity than its caller? (admin views, signal handlers, Celery `acks_late=True` tasks, Django ORM `update()` bypassing model validators)
