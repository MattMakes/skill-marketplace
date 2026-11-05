"""Deterministic discovery: walk a repo, emit a resource inventory.

Everything in here must be a pure function of the files on disk. No network, no
LLM, no guessing that isn't recorded as a guess. Two runs over an unchanged tree
produce byte-identical JSON -- that property is what makes the rest of the
pipeline reviewable, so keep the ordering stable (sorted keys, sorted lists) if
you add probes.

A "resource" is anything a test might need to talk to or observe. Each one gets
a stable `id` derived from its kind and name, because journeys.json refers to
resources by id and those ids must survive a re-discover.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1

# Directories that never contain the system under test.
SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build",
    "bin", "obj", "target", ".next", ".nuxt", ".turbo", ".cache", "vendor",
    ".pytest_cache", ".mypy_cache", ".idea", ".vscode", "coverage",
    ".aspire", ".terraform", "e2e", "test-results", "playwright-report",
}

MAX_DEPTH = 8

# --------------------------------------------------------------------------
# image -> resource kind. Substring match against the image reference, longest
# pattern first so "confluentinc/cp-kafka" beats a bare "kafka".
# --------------------------------------------------------------------------
IMAGE_KINDS: list[tuple[str, str, dict[str, Any]]] = [
    ("confluentinc/cp-kafka", "kafka", {"default_port": 9092}),
    ("bitnami/kafka", "kafka", {"default_port": 9092}),
    ("apache/kafka", "kafka", {"default_port": 9092}),
    ("redpanda", "kafka", {"default_port": 9092, "note": "Kafka-compatible"}),
    ("mcr.microsoft.com/azure-storage/azurite", "azure-storage", {"default_port": 10000}),
    ("azurite", "azure-storage", {"default_port": 10000}),
    ("mcr.microsoft.com/azure-messaging/eventhubs-emulator", "eventhubs", {"default_port": 5672}),
    ("mcr.microsoft.com/azure-messaging/servicebus-emulator", "servicebus", {"default_port": 5672}),
    ("localstack", "aws-localstack", {"default_port": 4566}),
    ("minio", "s3", {"default_port": 9000}),
    ("fsouza/fake-gcs-server", "gcs", {"default_port": 4443}),
    ("gcr.io/google.com/cloudsdktool", "gcp-emulator", {}),
    ("pubsub-emulator", "pubsub", {"default_port": 8085}),
    ("rabbitmq", "rabbitmq", {"default_port": 5672}),
    ("postgres", "postgres", {"default_port": 5432}),
    ("mysql", "mysql", {"default_port": 3306}),
    ("mariadb", "mysql", {"default_port": 3306}),
    ("mongo", "mongodb", {"default_port": 27017}),
    ("redis", "redis", {"default_port": 6379}),
    ("elasticsearch", "elasticsearch", {"default_port": 9200}),
    ("opensearch", "elasticsearch", {"default_port": 9200}),
    ("clickhouse", "clickhouse", {"default_port": 8123}),
    ("mssql", "sqlserver", {"default_port": 1433}),
    ("sqlserver", "sqlserver", {"default_port": 1433}),
    ("otel/opentelemetry-collector", "otel-collector", {"default_port": 4317}),
    ("jaeger", "tracing", {"default_port": 16686}),
    ("nginx", "http", {"default_port": 80}),
    ("traefik", "http", {"default_port": 80}),
]

# Marker file -> service language. Checked per directory.
LANG_MARKERS: list[tuple[str, str]] = [
    ("go.mod", "go"),
    ("Cargo.toml", "rust"),
    ("pyproject.toml", "python"),
    ("requirements.txt", "python"),
    ("package.json", "node"),
    ("pom.xml", "java"),
    ("build.gradle", "java"),
    ("build.gradle.kts", "java"),
    ("Gemfile", "ruby"),
]

OPENAPI_NAMES = re.compile(
    r"^(openapi|swagger)([.-].*)?\.(json|ya?ml)$|.*\.(openapi|swagger)\.(json|ya?ml)$",
    re.IGNORECASE,
)


def slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(text)).strip("-").lower()
    return s or "unnamed"


def _iter_files(root: Path):
    """Depth-limited walk that skips build output and vendored code."""
    stack = [(root, 0)]
    while stack:
        d, depth = stack.pop()
        if depth > MAX_DEPTH:
            continue
        try:
            entries = sorted(d.iterdir(), key=lambda p: p.name)
        except (PermissionError, OSError):
            continue
        for e in entries:
            if e.is_symlink():
                continue
            if e.is_dir():
                if e.name in SKIP_DIRS or e.name.startswith("."):
                    continue
                stack.append((e, depth + 1))
            elif e.is_file():
                yield e


def classify_image(image: str) -> tuple[str, dict[str, Any]]:
    """Map a container image reference to a resource kind."""
    ref = (image or "").lower()
    best: tuple[str, dict[str, Any]] | None = None
    best_len = -1
    for pattern, kind, extra in IMAGE_KINDS:
        if pattern in ref and len(pattern) > best_len:
            best, best_len = (kind, dict(extra)), len(pattern)
    return best if best else ("container", {})


# --------------------------------------------------------------------------
# docker compose
# --------------------------------------------------------------------------
def _load_yaml(path: Path):
    """Load YAML if PyYAML is present. Compose files are the only YAML we need,
    and we degrade to a recorded gap rather than shipping a half-parser."""
    try:
        import yaml  # type: ignore
    except ImportError:
        return None
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return None


def _parse_ports(raw: Any) -> list[dict[str, Any]]:
    """Compose `ports:` entries -> {host, container}. Handles "8080:80",
    "127.0.0.1:8080:80", bare "80", and the long mapping form."""
    out: list[dict[str, Any]] = []
    for item in raw or []:
        if isinstance(item, dict):
            host, cont = item.get("published"), item.get("target")
            if cont is not None:
                out.append({"host": int(host) if host else None, "container": int(cont)})
            continue
        parts = str(item).split("/")[0].split(":")
        try:
            if len(parts) == 1:
                out.append({"host": None, "container": int(parts[0])})
            elif len(parts) == 2:
                out.append({"host": int(parts[0]), "container": int(parts[1])})
            elif len(parts) >= 3:
                out.append({"host": int(parts[-2]), "container": int(parts[-1])})
        except ValueError:
            continue
    return out


def probe_compose(root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """Compose files are the highest-signal source: they name every backing
    service, its image, and its published ports in one place."""
    resources: list[dict[str, Any]] = []
    gaps: list[str] = []
    names = ("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml")
    files = sorted({p for p in _iter_files(root) if p.name in names})
    for f in files:
        doc = _load_yaml(f)
        if doc is None:
            gaps.append(
                f"Found {f.relative_to(root)} but could not parse it "
                "(install PyYAML: pip install pyyaml). Compose services are missing "
                "from this inventory."
            )
            continue
        for name, svc in sorted((doc.get("services") or {}).items()):
            if not isinstance(svc, dict):
                continue
            image = svc.get("image") or ""
            kind, extra = classify_image(image)
            if not image and svc.get("build"):
                kind = "service"
            ports = _parse_ports(svc.get("ports"))
            env = svc.get("environment")
            env_keys = sorted(env.keys()) if isinstance(env, dict) else sorted(
                str(e).split("=")[0] for e in (env or []) if isinstance(e, str)
            )
            res = {
                "id": f"{kind}:{slugify(name)}",
                "kind": kind,
                "name": name,
                "source": str(f.relative_to(root)),
                "discovered_by": "docker-compose",
                "image": image or None,
                "ports": ports,
                "env_keys": env_keys,
            }
            res.update(extra)
            if ports:
                host = next((p["host"] for p in ports if p.get("host")), None)
                if host:
                    res["host_port"] = host
                    res["base_url"] = f"http://localhost:{host}"
            resources.append(res)
    return resources, gaps


# --------------------------------------------------------------------------
# aspire
# --------------------------------------------------------------------------
def probe_aspire(root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """An Aspire AppHost declares the whole system. We can read aspire.config.json
    deterministically; the resource graph itself lives in code, so we record the
    AppHost as a resource and let `run` delegate booting to `aspire run`."""
    resources: list[dict[str, Any]] = []
    gaps: list[str] = []
    for f in sorted(p for p in _iter_files(root) if p.name == "aspire.config.json"):
        try:
            cfg = json.loads(f.read_text(encoding="utf-8", errors="replace"))
        except json.JSONDecodeError:
            gaps.append(f"{f.relative_to(root)} is not valid JSON; skipped.")
            continue
        apphost = cfg.get("appHost") or {}
        resources.append({
            "id": "apphost:aspire",
            "kind": "apphost",
            "name": "aspire",
            "source": str(f.relative_to(root)),
            "discovered_by": "aspire",
            "language": apphost.get("language", "csharp"),
            "entry": apphost.get("path"),
            "packages": sorted((cfg.get("packages") or {}).keys()),
            "profiles": sorted((cfg.get("profiles") or {}).keys()),
        })
        gaps.append(
            "Aspire AppHost found. Resources declared in AppHost code are not "
            "statically readable -- run `aspire run` once and use `e2e discover "
            "--from-running` to capture the live resource graph, or list them in "
            "config.json under `extra_resources`."
        )
    return resources, gaps


# --------------------------------------------------------------------------
# services
# --------------------------------------------------------------------------
def _port_hints(d: Path) -> list[int]:
    """Look for a literal port in the obvious config files. Cheap and often right;
    always recorded as a hint, never as fact."""
    hints: set[int] = set()
    for name in ("Dockerfile", ".env", ".env.example", "app.json"):
        f = d / name
        if not f.is_file():
            continue
        text = f.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"\bEXPOSE\s+(\d{2,5})", text):
            hints.add(int(m.group(1)))
        for m in re.finditer(r"\bPORT\s*=\s*[\"']?(\d{2,5})", text):
            hints.add(int(m.group(1)))
    return sorted(p for p in hints if 1 <= p <= 65535)


def probe_services(root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """A directory holding a language marker is a candidate service."""
    resources: list[dict[str, Any]] = []
    seen: set[Path] = set()
    for f in _iter_files(root):
        for marker, lang in LANG_MARKERS:
            if f.name != marker or f.parent in seen:
                continue
            d = f.parent
            seen.add(d)
            name = "root" if d == root else d.name
            entry: str | None = None
            if lang == "node":
                try:
                    pkg = json.loads(f.read_text(encoding="utf-8", errors="replace"))
                    # `e2e setup --install` writes this when the repo has no root
                    # package.json. It holds test dependencies, not a service.
                    if pkg.get("name") == "e2e-harness-host":
                        break
                    entry = pkg.get("main")
                    if not entry and isinstance(pkg.get("scripts"), dict):
                        entry = pkg["scripts"].get("start") or pkg["scripts"].get("dev")
                except json.JSONDecodeError:
                    pass
            resources.append({
                "id": f"service:{slugify(name)}",
                "kind": "service",
                "name": name,
                "source": str(f.relative_to(root)),
                "discovered_by": f"lang-marker:{marker}",
                "language": lang,
                "dir": str(d.relative_to(root)) if d != root else ".",
                "entry": entry,
                "port_hints": _port_hints(d),
            })
            break
    # .NET projects have no single marker filename; match by extension.
    for f in _iter_files(root):
        if f.suffix != ".csproj" or f.parent in seen:
            continue
        d = f.parent
        seen.add(d)
        resources.append({
            "id": f"service:{slugify(f.stem)}",
            "kind": "service",
            "name": f.stem,
            "source": str(f.relative_to(root)),
            "discovered_by": "lang-marker:csproj",
            "language": "csharp",
            "dir": str(d.relative_to(root)) if d != root else ".",
            "entry": None,
            "port_hints": _port_hints(d),
        })
    return sorted(resources, key=lambda r: r["id"]), []


# --------------------------------------------------------------------------
# openapi
# --------------------------------------------------------------------------
def probe_openapi(root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """An OpenAPI document is the single best source of testable endpoints,
    so pull every path+method out of it."""
    resources: list[dict[str, Any]] = []
    gaps: list[str] = []
    for f in sorted(p for p in _iter_files(root) if OPENAPI_NAMES.match(p.name)):
        text = f.read_text(encoding="utf-8", errors="replace")
        doc = None
        if f.suffix.lower() == ".json":
            try:
                doc = json.loads(text)
            except json.JSONDecodeError:
                gaps.append(f"{f.relative_to(root)} is not valid JSON; skipped.")
                continue
        else:
            doc = _load_yaml(f)
            if doc is None:
                gaps.append(
                    f"Found {f.relative_to(root)} but could not parse it "
                    "(install PyYAML). Its endpoints are missing."
                )
                continue
        if not isinstance(doc, dict) or "paths" not in doc:
            continue
        ops = []
        for path, item in sorted((doc.get("paths") or {}).items()):
            if not isinstance(item, dict):
                continue
            for method in sorted(item):
                if method.lower() in {"get", "post", "put", "patch", "delete", "head", "options"}:
                    op = item[method] or {}
                    ops.append({
                        "method": method.upper(),
                        "path": path,
                        "summary": (op.get("summary") or "").strip() or None,
                        "operation_id": op.get("operationId"),
                    })
        title = ((doc.get("info") or {}).get("title") or f.stem)
        resources.append({
            "id": f"openapi:{slugify(title)}",
            "kind": "openapi",
            "name": title,
            "source": str(f.relative_to(root)),
            "discovered_by": "openapi",
            "operation_count": len(ops),
            "operations": ops,
            "servers": [s.get("url") for s in (doc.get("servers") or []) if isinstance(s, dict)],
        })
    return resources, gaps


# --------------------------------------------------------------------------
# existing tests
# --------------------------------------------------------------------------
TEST_RUNNERS = [
    ("playwright.config.ts", "playwright"), ("playwright.config.js", "playwright"),
    ("vitest.config.ts", "vitest"), ("jest.config.js", "jest"), ("jest.config.ts", "jest"),
    ("pytest.ini", "pytest"), ("conftest.py", "pytest"),
    ("cypress.config.ts", "cypress"), ("cypress.config.js", "cypress"),
]


def probe_existing_tests(root: Path) -> tuple[list[dict[str, Any]], list[str]]:
    """Knowing what already exists keeps us from installing a second runner."""
    found: list[dict[str, Any]] = []
    for f in _iter_files(root):
        for name, runner in TEST_RUNNERS:
            if f.name == name:
                found.append({
                    "id": f"testrunner:{slugify(runner)}-{slugify(f.parent.name)}",
                    "kind": "test-runner",
                    "name": runner,
                    "source": str(f.relative_to(root)),
                    "discovered_by": "test-config",
                })
                break
    return sorted(found, key=lambda r: (r["name"], r["source"])), []


PROBES = [
    ("compose", probe_compose),
    ("aspire", probe_aspire),
    ("services", probe_services),
    ("openapi", probe_openapi),
    ("existing-tests", probe_existing_tests),
]


def discover(root: Path, docs_findings: dict[str, Any] | None = None) -> dict[str, Any]:
    """Run every probe and assemble the inventory."""
    root = Path(root).resolve()
    resources: list[dict[str, Any]] = []
    gaps: list[str] = []
    ran: list[str] = []
    for name, probe in PROBES:
        res, g = probe(root)
        resources.extend(res)
        gaps.extend(g)
        ran.append(name)

    # Deduplicate by id, preferring the richer record (compose beats lang-marker
    # for the same service, because it knows the published port).
    by_id: dict[str, dict[str, Any]] = {}
    for r in resources:
        prev = by_id.get(r["id"])
        if prev is None or len(json.dumps(r, sort_keys=True)) > len(json.dumps(prev, sort_keys=True)):
            by_id[r["id"]] = r
    ordered = [by_id[k] for k in sorted(by_id)]

    counts: dict[str, int] = {}
    for r in ordered:
        counts[r["kind"]] = counts.get(r["kind"], 0) + 1

    return {
        "schema_version": SCHEMA_VERSION,
        "root": str(root),
        "probes_run": ran,
        "resource_count": len(ordered),
        "counts_by_kind": dict(sorted(counts.items())),
        "resources": ordered,
        "docs": docs_findings or {"present": False},
        "gaps": gaps,
    }
