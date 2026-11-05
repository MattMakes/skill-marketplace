# owasp-auditor — Python catalog

> Inlined into the owasp-auditor system prompt when the audited repo's primary language is `python`. Every entry below is a concrete pattern to look for in Python code or its config — not generic advice.

## File globs to scan

- `**/*.py`
- `**/settings*.py`, `**/local_settings.py`, `**/manage.py`, `**/wsgi.py`, `**/asgi.py`
- `**/urls.py`, `**/views.py`, `**/serializers.py`, `**/forms.py`, `**/models.py`, `**/admin.py`
- `**/templates/**/*.html`, `**/templates/**/*.jinja*`
- `**/conftest.py`
- `**/*.ipynb` (notebook code cells)

## Native tooling (auditor reference)

- `bandit -r . -ll` — built-in Python AST-based security linter (use `-ll` to show only medium+/high)
- `semgrep --config=p/python --config=p/django --config=p/flask` — covers many of the patterns below
- `pylint --load-plugins pylint_django` (style/quality, not strictly security)
- `ruff check --select S` (Bandit-equivalent rules in ruff)

## Risk patterns

### A03 — SQL injection via string concatenation / f-strings

**What to look for:** raw SQL built with `+`, `%`, `.format()`, or f-strings then passed to `cursor.execute`, Django `.raw()`/`.extra()`, or SQLAlchemy `text()`.
**Why it's risky in Python:** DB-API drivers do NOT auto-escape — only the `(query, params)` tuple form parameterises. f-strings happen at compile time and look identical to safe code.
**Concrete grep / ripgrep query:**
```
rg -nP 'cursor\.execute\(\s*[fF]?["\x27].*\{.*\}.*["\x27]' --type py
rg -nP 'cursor\.execute\(\s*["\x27].*\%\s*[\(\w]' --type py
rg -nP 'cursor\.execute\(\s*["\x27].*["\x27]\s*\+' --type py
rg -nP '\.execute\(\s*["\x27].*["\x27]\s*\.format\(' --type py
rg -n '\.raw\(\s*f["\x27]|\.extra\(.*\b(where|select|tables)\b.*request\.' --type py
rg -nP 'text\(\s*[fF]["\x27]' --type py
```
**File hint:** Django `views.py`, `models.py` (custom managers), Flask routes, SQLAlchemy session/scoped_session usage, FastAPI endpoints, Alembic migrations using raw SQL.
**False-positive guard:** `cursor.execute("SELECT ... WHERE id = %s", (user_id,))` is parameterised and safe. Same for SQLAlchemy `text("... :id")` paired with `.bindparams(id=...)`.

### A08 — Insecure deserialization (`pickle` / `marshal` / `dill` / `shelve`)

**What to look for:** untrusted bytes fed to `pickle.loads`, `cPickle.loads` (py2 legacy), `marshal.loads`, `dill.loads`, `shelve.open` over a network filesystem, or Celery `pickle` serializer.
**Why it's risky in Python:** `pickle` evaluates `__reduce__` — equivalent to remote code execution.
**Concrete grep / ripgrep query:**
```
rg -nP '(?:c?[Pp]ickle|dill|marshal)\.loads?\s*\(' --type py
rg -n 'CELERY_(?:TASK_)?SERIALIZER\s*=\s*["\x27]pickle["\x27]' --type py
rg -n 'CELERY_ACCEPT_CONTENT\s*=.*pickle' --type py
rg -n 'shelve\.open\s*\(' --type py
```
**File hint:** Celery `tasks.py`/`celery.py`, RQ workers, cache backends, Django session serializers (`SESSION_SERIALIZER`), web service request bodies decoded via pickle.
**False-positive guard:** `pickle.loads` of a value just produced by `pickle.dumps` in the same process and never sent over the wire is acceptable (rare).

### A08 — `yaml.load` without `SafeLoader`

**What to look for:** `yaml.load(...)` with no loader or with `Loader=yaml.Loader`/`yaml.UnsafeLoader`/`yaml.FullLoader` on untrusted input.
**Why it's risky in Python:** PyYAML default loader instantiates arbitrary Python objects via `!!python/object`.
**Concrete grep / ripgrep query:**
```
rg -nP 'yaml\.load\s*\((?!.*SafeLoader)' --type py
rg -n 'yaml\.(?:Unsafe|Full)Loader' --type py
```
**False-positive guard:** `yaml.safe_load(...)` or `yaml.load(x, Loader=yaml.SafeLoader)` is safe.

### A03 — Command injection via `subprocess`/`os.system`/`os.popen`

**What to look for:** `shell=True` with any user-influenced argument, `os.system`, `os.popen`, `commands.getoutput` (py2), `subprocess.getoutput`.
**Why it's risky in Python:** The shell tokenises and re-expands metacharacters — `;`, `|`, backticks, `$()` all become injection vectors.
**Concrete grep / ripgrep query:**
```
rg -nP 'subprocess\.(?:Popen|call|run|check_output|check_call)\s*\([^)]*shell\s*=\s*True' --type py
rg -nP '\b(?:os\.system|os\.popen|subprocess\.getoutput|commands\.getoutput)\s*\(' --type py
```
**File hint:** management commands, deployment scripts, CI helpers, file-conversion endpoints, video-processing pipelines invoking `ffmpeg`.
**False-positive guard:** `subprocess.run(["ffmpeg", "-i", user_path], shell=False)` (list form, no shell) is safe IF `user_path` cannot start with `-` (argument injection). Use `--` separator or validate.

### A03 — `eval` / `exec` / `compile` on user input

**What to look for:** `eval`, `exec`, `compile`, `__import__` with any string assembled from a request.
**Concrete grep / ripgrep query:**
```
rg -nP '\b(?:eval|exec|compile)\s*\(' --type py
rg -n 'ast\.literal_eval' --type py
```
**False-positive guard:** `ast.literal_eval` is generally safe (parses literals only, no calls).

### A10 — SSRF via `requests` / `urllib` / `httpx` / `aiohttp`

**What to look for:** any HTTP client called with a URL derived from user input, especially without host allowlisting.
**Why it's risky in Python:** default clients follow redirects (so `http://evil.com` can 302 to `http://169.254.169.254/`), and DNS rebinding bypasses naive `urlparse` checks.
**Concrete grep / ripgrep query:**
```
rg -nP 'requests\.(?:get|post|put|delete|head|patch|request)\s*\([^)]*(?:request\.|self\.request|payload\[|data\[|args\[|GET\[|POST\[)' --type py
rg -nP '(?:urllib\.request\.urlopen|urllib2\.urlopen)\s*\(' --type py
rg -nP '(?:httpx|aiohttp)\.(?:get|post|put|delete|request|stream)\s*\(' --type py
```
**File hint:** webhook receivers, link-preview/oembed endpoints, image-proxy endpoints, OAuth callback URL handling, Celery tasks fetching arbitrary URLs.
**False-positive guard:** Wrapping calls with explicit DNS resolution + IP allowlisting (e.g. checking `ipaddress.ip_address(...).is_private`) before each `requests.get`. Look for use of `requests-ip-rotator` style guards.

### A03 — XSS via `mark_safe` / `|safe` / `Markup` / `render_template_string`

**What to look for:** Django `mark_safe(user_data)` or templates using `{{ x|safe }}`, Flask `Markup(user_data)`, `render_template_string(request.args.get('tpl'))`, Jinja2 `Template(user_input)`.
**Concrete grep / ripgrep query:**
```
rg -nP 'mark_safe\s*\(' --type py
rg -n '\|safe\b' -g '*.html' -g '*.jinja*'
rg -nP 'Markup\s*\(' --type py
rg -n 'render_template_string\s*\(' --type py
rg -n 'autoescape\s*=\s*False' --type py
```
**File hint:** Django views returning `HttpResponse(mark_safe(...))`, custom template tags, Flask routes that build HTML with `Markup`.
**False-positive guard:** `mark_safe` of a constant string literal known to contain only safe HTML (e.g. an icon glyph) is OK; flag only when input traces back to a request.

### A01 — Path traversal in `open` / `send_file` / `static`

**What to look for:** `open(user_path)`, `pathlib.Path(user_input)`, `flask.send_file(user_path)`, Django `FileResponse(open(user_path, 'rb'))`, `os.path.join(BASE_DIR, request.GET['name'])`.
**Why it's risky in Python:** `os.path.join("/safe", "../../etc/passwd")` returns `/etc/passwd` — `..` is honoured.
**Concrete grep / ripgrep query:**
```
rg -nP 'open\s*\([^)]*request\.' --type py
rg -nP 'send_file\s*\(' --type py
rg -nP 'send_from_directory\s*\(' --type py
rg -nP 'os\.path\.join\([^)]*(?:request\.|args\[|kwargs\[)' --type py
rg -nP 'FileResponse\s*\(\s*open\s*\(' --type py
```
**File hint:** download endpoints, attachment handlers, `MEDIA_ROOT` serving, log-tail endpoints.
**False-positive guard:** `werkzeug.utils.safe_join`, `flask.send_from_directory(safe_dir, filename)` (which calls safe_join internally), or explicit checks: `Path(p).resolve().is_relative_to(base.resolve())`.

### A05 — XXE via `xml.etree` / `lxml` / `xmltodict` / `xml.dom`

**What to look for:** XML parsing of untrusted input without entity-resolution disabled. CPython 3.7.1+ disables most entity expansion in stdlib `xml.etree.ElementTree`, but `lxml` still resolves external entities by default.
**Concrete grep / ripgrep query:**
```
rg -nP '(?:xml\.etree\.ElementTree|ET)\.(?:parse|fromstring|XMLParser)' --type py
rg -nP 'lxml\.etree\.(?:parse|fromstring|XMLParser)' --type py
rg -nP 'xml\.dom\.minidom\.(?:parse|parseString)' --type py
rg -n 'import xmltodict' --type py
rg -n 'import xml\.sax' --type py
```
**File hint:** SAML SSO handlers, SOAP integrations (`zeep`, `suds`), RSS/Atom ingest, OPML/SVG upload handlers.
**False-positive guard:** `defusedxml.ElementTree.parse(...)` is the safe-by-default alternative — flag only when stdlib/lxml is used directly. For `lxml`, look for `XMLParser(resolve_entities=False, no_network=True, dtd_validation=False)`.

### A03 — SSTI via `Template(user_input)`

**What to look for:** Jinja2 `Environment().from_string(user_input)` or `Template(user_input).render(...)`; Django `Template(user_input).render(Context(...))`; Mako/Chameleon equivalents.
**Why it's risky in Python:** `{{ ''.__class__.__mro__[1].__subclasses__() }}` reaches `Popen` from a Jinja2 sandbox and yields RCE.
**Concrete grep / ripgrep query:**
```
rg -nP 'jinja2\.Template\s*\(' --type py
rg -nP 'Environment\([^)]*\)\.from_string\s*\(' --type py
rg -nP '\bTemplate\s*\(\s*(?:request\.|user_)' --type py
rg -nP '(?:django\.template\.|template\.)Template\s*\(' --type py
```
**File hint:** "custom email template" features, dynamic dashboard widgets, low-code/no-code form builders.
**False-positive guard:** `SandboxedEnvironment` reduces (but does not eliminate) the risk; treat any user-supplied template as RCE-class until proven otherwise.

### A01 — CSRF disabled or middleware missing

**What to look for:** Django `@csrf_exempt`, `MIDDLEWARE` without `django.middleware.csrf.CsrfViewMiddleware`; Flask without `flask_wtf.CSRFProtect` or `flask_seasurf.SeaSurf`; FastAPI/Starlette state-changing endpoints with no CSRF token (cookie-auth APIs).
**Concrete grep / ripgrep query:**
```
rg -nP '@csrf_exempt\b|csrf_exempt\(' --type py
rg -n 'CsrfViewMiddleware' -g 'settings*.py'
rg -n 'CSRFProtect|SeaSurf' --type py
rg -n 'WTF_CSRF_ENABLED\s*=\s*False' --type py
```
**File hint:** Django `views.py`/`viewsets.py`, JSON APIs reusing session cookies, file-upload endpoints.
**False-positive guard:** True stateless APIs using `Authorization: Bearer ...` (no cookie auth) and SameSite=Strict cookies do not need CSRF tokens — but verify both.

### A07 — JWT with `verify=False` or `none` algorithm

**What to look for:** `jwt.decode(token, ..., options={"verify_signature": False})`, `algorithms=['none']`, missing `algorithms=` argument (older PyJWT defaulted to allowing `none`), `python-jose` `jws.verify` with `algorithms=ALGORITHMS.SUPPORTED`.
**Concrete grep / ripgrep query:**
```
rg -nP 'jwt\.decode\([^)]*verify\s*=\s*False' --type py
rg -nP 'jwt\.decode\([^)]*verify_signature\s*:\s*False' --type py
rg -nP 'algorithms\s*=\s*\[\s*[\x27"]none[\x27"]' --type py
rg -nP 'jwt\.decode\((?:(?!algorithms).)*\)' --type py -U
rg -n 'ALGORITHMS\.SUPPORTED' --type py
```
**File hint:** Auth middleware, OAuth callback handlers, internal service-to-service token validation.
**False-positive guard:** `jwt.decode(token, key, algorithms=['RS256'])` (single explicit alg, not `HS256+RS256` confusion) is correct.

### A02 — Weak hashing for passwords / tokens

**What to look for:** `hashlib.md5`/`sha1`/`sha256` used to hash a password (bare digest, no KDF); `random.random()`/`random.randint()`/`uuid.uuid1()` used to mint security tokens (use `secrets.token_urlsafe`/`secrets.token_hex` and `uuid.uuid4`).
**Concrete grep / ripgrep query:**
```
rg -nP 'hashlib\.(?:md5|sha1)\s*\(' --type py
rg -nP 'hashlib\.sha256\([^)]*password' --type py -i
rg -nP '\brandom\.(?:random|randint|choice|choices|sample|getrandbits)\b' --type py
rg -nP 'uuid\.uuid1\s*\(' --type py
```
**File hint:** custom auth, password-reset token generation, API-key generation, CSRF token implementations, MFA backup codes.
**False-positive guard:** `hashlib.md5(..., usedforsecurity=False)` (Python 3.9+) signals non-security use (e.g. content-addressable cache keys). `random.SystemRandom()` is cryptographically secure.

### A02 — ECB mode / static IV / hardcoded keys

**What to look for:** `Crypto.Cipher.AES.new(key, AES.MODE_ECB)`, `cryptography.hazmat.primitives.ciphers.modes.ECB`, hardcoded `IV = b'\\x00' * 16`, `Fernet(b'<base64>')` literal in source.
**Concrete grep / ripgrep query:**
```
rg -nP 'AES\.MODE_ECB|modes\.ECB\s*\(' --type py
rg -nP 'Fernet\s*\(\s*[bB]?["\x27][A-Za-z0-9_=-]{40,}["\x27]' --type py
rg -nP 'IV\s*=\s*[bB]?["\x27]\\x00' --type py
```
**False-positive guard:** Fernet keys loaded from env (`Fernet(os.environ["FERNET_KEY"])`) are fine — flag only literals.

### A02 — Hardcoded `SECRET_KEY` / `DEBUG=True` in settings

**What to look for:** Django `SECRET_KEY = 'django-insecure-...'` checked into source; `DEBUG = True` in `settings.py` not gated on env; Flask `app.config['SECRET_KEY'] = 'dev'`; `app.run(debug=True)`.
**Concrete grep / ripgrep query:**
```
rg -nP 'SECRET_KEY\s*=\s*["\x27](?!os\.|env)' -g 'settings*.py' -g 'config.py' -g 'app.py'
rg -nP 'DEBUG\s*=\s*True' -g 'settings*.py'
rg -nP 'app\.run\([^)]*debug\s*=\s*True' --type py
rg -n 'ALLOWED_HOSTS\s*=\s*\[\s*["\x27]\*["\x27]' --type py
```
**File hint:** `settings.py`, `local_settings.py`, `dev_settings.py`, `app.py`, `wsgi.py`.
**False-positive guard:** `DEBUG = os.environ.get("DEBUG", "False") == "True"` is acceptable. `SECRET_KEY = os.environ["SECRET_KEY"]` is correct.

### A03 — LDAP injection in `ldap3` / `python-ldap`

**What to look for:** filter strings concatenating user input: `f"(uid={username})"`, `"(uid=" + username + ")"`.
**Concrete grep / ripgrep query:**
```
rg -nP '(?:ldap|conn)\.search\([^)]*[fF]["\x27]\([^)]*\{' --type py
rg -nP 'search_filter\s*=\s*[fF]?["\x27]\(.*\{' --type py
```
**File hint:** SSO / directory-sync code, LDAP-backed Django auth backends.
**False-positive guard:** `ldap3.utils.conv.escape_filter_chars(username)` properly escapes `()*\\\0`.

### A04 — Open redirect via `next=` / unvalidated `Location`

**What to look for:** `HttpResponseRedirect(request.GET.get('next'))` without `url_has_allowed_host_and_scheme`; Flask `redirect(request.args.get('next'))`; FastAPI `RedirectResponse(url=user_url)`.
**Concrete grep / ripgrep query:**
```
rg -nP '(?:HttpResponseRedirect|redirect|RedirectResponse)\s*\(\s*request\.' --type py
rg -nP '(?:HttpResponseRedirect|redirect)\s*\([^)]*\.GET\.get\(' --type py
rg -n 'url_has_allowed_host_and_scheme|is_safe_url' --type py
```
**File hint:** login/logout views, OAuth callback handling, post-payment "return URL".
**False-positive guard:** Django ≥3.0 `url_has_allowed_host_and_scheme(url, allowed_hosts={request.get_host()})` is the correct guard; older `is_safe_url` was renamed.

### A04 — Mass assignment / over-posting

**What to look for:** Django `Model.objects.create(**request.POST.dict())`, `Model.objects.update(**request.data)`, DRF `ModelSerializer` with `fields = '__all__'`, FastAPI Pydantic models that include sensitive fields like `is_admin` exposed for write.
**Concrete grep / ripgrep query:**
```
rg -nP '\.objects\.(?:create|update)\(\*\*request\.' --type py
rg -nP 'Model\.objects\.create\(\*\*' --type py
rg -nP 'fields\s*=\s*[\x27"]__all__[\x27"]' --type py
rg -nP 'exclude\s*=\s*\(\s*\)' --type py
```
**File hint:** DRF `serializers.py`, Django `forms.py` with `Meta.fields = '__all__'`, FastAPI request models reused as DB models.
**False-positive guard:** Explicit `fields = ('name', 'email')` or `read_only_fields = ('is_admin',)` is the safe pattern.

### A09 — Logging sensitive objects (`!r`, `repr`, JSON dump of request)

**What to look for:** `logger.info(f"user={user!r}")`, `logger.debug(request.POST)`, `print(request.headers)`, `logging.info(json.dumps(request.json))`. Django/Flask request bodies often contain passwords, tokens, PII.
**Concrete grep / ripgrep query:**
```
rg -nP 'log(?:ger)?\.\w+\([^)]*request\.(?:POST|GET|data|json|body|headers)' --type py
rg -nP 'log(?:ger)?\.\w+\([^)]*\{[^}]*\!r\}' --type py
rg -nP 'log(?:ger)?\.\w+\([^)]*password' --type py -i
rg -nP 'print\([^)]*request\.' --type py
```
**File hint:** middleware, exception handlers, custom decorators, debug-only logging that leaked into prod.
**False-positive guard:** Use of `django-structlog` `EVENT_PROCESSORS` that scrub keys, or DRF `SENSITIVE_VARIABLES` + `@sensitive_variables('password')`.

### A05 — Werkzeug debug pin / Flask debug mode in production

**What to look for:** `app.run(debug=True)`, `werkzeug.debug.DebuggedApplication` exposed to non-localhost, `FLASK_ENV=development` in deployed config.
**Why it's risky in Python:** Werkzeug debugger exposes a Python REPL on `/console` (PIN-protected since 0.11, but the PIN derivation has had several CVEs).
**Concrete grep / ripgrep query:**
```
rg -nP 'app\.run\([^)]*debug\s*=\s*True' --type py
rg -nP 'DebuggedApplication\s*\(' --type py
rg -n 'FLASK_DEBUG\s*=\s*1|FLASK_ENV\s*=\s*development' -g '*.env*' -g 'Dockerfile*' -g 'docker-compose*'
```
**False-positive guard:** Guarding via `if __name__ == "__main__" and os.environ.get("FLASK_DEBUG"):` is acceptable for local dev only.

### A05 — FastAPI auto-docs exposed in production

**What to look for:** FastAPI default `/docs`, `/redoc`, `/openapi.json` reachable in production environments — leaks internal endpoint shape.
**Concrete grep / ripgrep query:**
```
rg -nP 'FastAPI\(\s*\)' --type py
rg -nP 'FastAPI\([^)]*docs_url\s*=' --type py
```
**File hint:** `main.py`, `app.py`. Look for absence of `docs_url=None, redoc_url=None, openapi_url=None` in prod-targeted instantiation.
**False-positive guard:** Conditional disable based on `ENV != "prod"` is fine.

### Race conditions / TOCTOU on filesystem

**What to look for:** `if os.path.exists(p): open(p, ...)`, `if not Path(p).exists(): Path(p).write_text(...)`. Especially dangerous in `/tmp` (symlink races).
**Concrete grep / ripgrep query:**
```
rg -nP 'os\.path\.exists\([^)]*\)\s*[\)\:]?\s*\n\s*open\(' --type py -U
rg -nP 'tempfile\.mktemp' --type py
```
**False-positive guard:** `tempfile.NamedTemporaryFile(delete=False)` or `os.open(p, os.O_CREAT|os.O_EXCL|os.O_WRONLY, 0o600)` are race-safe.

### ReDoS — catastrophic backtracking on user input

**What to look for:** `re.match`/`re.search` with a pattern that has nested quantifiers (`(a+)+`, `(a|a)*`, `(.*)*`) applied to user input.
**Concrete grep / ripgrep query:**
```
rg -nP 're\.(?:match|search|findall|fullmatch)\([^)]*[\(\[][^)\]]*[+*][^)\]]*[\)\]][+*]' --type py
```
**File hint:** input-validation utilities, log parsers, email/URL validators rolled by hand.
**False-positive guard:** Use `re2` (`pip install google-re2`) for linear-time matching; or anchor and bound input length before matching.

### A04 — Missing authentication on DRF / FastAPI endpoints

**What to look for:** DRF `ViewSet`/`APIView` without `authentication_classes` / `permission_classes` and no global default in `REST_FRAMEWORK`; FastAPI route with no `Depends(get_current_user)`; Flask route with no `@login_required`.
**Concrete grep / ripgrep query:**
```
rg -nP 'permission_classes\s*=\s*\[\s*AllowAny\s*\]' --type py
rg -n 'DEFAULT_PERMISSION_CLASSES' -g 'settings*.py'
rg -nP '@app\.(?:get|post|put|delete|patch)\(' --type py
rg -n 'authentication_classes\s*=\s*\[\s*\]' --type py
```
**File hint:** DRF `views.py`/`viewsets.py`, FastAPI `routes/`, internal admin endpoints.
**False-positive guard:** Endpoints intentionally public (login, registration, healthcheck) are acceptable — confirm by name.

### A02 — `pickle` or unsigned cookies as session storage

**What to look for:** Django `SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'` (signed but the secret rotation matters); Flask default `SECRET_KEY='dev'` letting attackers forge sessions.
**Concrete grep / ripgrep query:**
```
rg -n 'SESSION_ENGINE' -g 'settings*.py'
rg -nP 'app\.secret_key\s*=\s*[\x27"](?!os\.|env)' --type py
```

### A04 — Verbose error pages / stack traces leaked

**What to look for:** Django `DEBUG=True`, Flask `app.debug=True`, FastAPI middleware that returns `traceback.format_exc()` in the HTTP body.
**Concrete grep / ripgrep query:**
```
rg -n 'traceback\.format_exc' --type py
rg -nP 'return\s+(?:JSON|HTML)?Response\([^)]*traceback' --type py
```

### Python 2 legacy hot-spots (flag as separate finding)

**What to look for:** `import urllib` (py2 had `urllib.urlretrieve`), `import cPickle`, `string.maketrans`, `__future__` imports indicating ancient code, `print` statements without parens.
**Concrete grep / ripgrep query:**
```
rg -nP 'import\s+cPickle' --type py
rg -nP '^\s*print\s+[^\(]' --type py
rg -nP 'from\s+__future__' --type py
```
**Why it matters:** Python 2 reached EOL 2020-01-01 — no security patches.
