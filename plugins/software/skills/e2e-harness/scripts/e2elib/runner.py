"""Bring the system up, wait until it is genuinely ready, run the tests, tear down.

The readiness gate is the part that earns its keep. Most flaky E2E suites are
flaky because the tests started before the system finished booting, and the usual
fix -- a longer sleep -- trades flakiness for slowness without removing the race.
Polling each resource's own readiness signal removes it.

We never invent a boot command. `config.json` holds `up`/`down` and the harness
refuses to guess, because running the wrong command against someone's machine is
a much worse failure than asking.
"""
from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def _log(msg: str) -> None:
    print(msg, flush=True)


def port_open(host: str, port: int, timeout: float = 1.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def http_ok(url: str, timeout: float = 3.0, accept: tuple[int, ...] = ()) -> bool:
    """A resource that answers at all is usually up; 401/404 still proves the
    listener is live, so treat any HTTP response below 500 as ready unless the
    caller is pickier."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return r.status in accept if accept else r.status < 500
    except urllib.error.HTTPError as e:
        return e.code in accept if accept else e.code < 500
    except Exception:
        return False


def readiness_targets(inventory: dict[str, Any], config: dict[str, Any]) -> list[dict[str, Any]]:
    """Derive what to poll. Explicit config wins; otherwise infer from ports."""
    explicit = config.get("readiness")
    if explicit:
        return list(explicit)

    targets: list[dict[str, Any]] = []
    for r in inventory.get("resources", []):
        port = r.get("host_port")
        if not port:
            continue
        if r.get("kind") in {"service", "http", "container", "apphost"} and r.get("base_url"):
            path = r.get("health_path") or "/"
            targets.append({
                "id": r["id"], "type": "http",
                "url": r["base_url"].rstrip("/") + path,
            })
        else:
            targets.append({"id": r["id"], "type": "port", "host": "localhost", "port": port})
    return targets


def wait_ready(targets: list[dict[str, Any]], timeout_s: int) -> tuple[bool, list[dict[str, Any]]]:
    """Poll every target until all are ready or the deadline passes."""
    if not targets:
        _log("  (no readiness targets derived -- skipping readiness gate)")
        return True, []

    deadline = time.time() + timeout_s
    status = {t["id"]: False for t in targets}
    while time.time() < deadline:
        for t in targets:
            if status[t["id"]]:
                continue
            ok = (
                http_ok(t["url"], accept=tuple(t.get("accept_status") or ()))
                if t["type"] == "http"
                else port_open(t.get("host", "localhost"), int(t["port"]))
            )
            if ok:
                status[t["id"]] = True
                _log(f"  ready: {t['id']}")
        if all(status.values()):
            return True, [{"id": k, "ready": v} for k, v in sorted(status.items())]
        time.sleep(1.0)
    return False, [{"id": k, "ready": v} for k, v in sorted(status.items())]


def run_shell(cmd: str, cwd: Path, env: dict[str, str] | None = None,
              timeout: int | None = None, detach: bool = False):
    """Everything the harness runs on the user's machine goes through here, so
    there is one place to audit."""
    merged = {**os.environ, **(env or {})}
    if detach:
        return subprocess.Popen(
            cmd, shell=True, cwd=str(cwd), env=merged,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    return subprocess.run(
        cmd, shell=True, cwd=str(cwd), env=merged, timeout=timeout,
        capture_output=True, text=True,
    )


def parse_playwright_report(path: Path) -> dict[str, Any]:
    """Flatten Playwright's nested JSON report into per-test rows."""
    if not path.is_file():
        return {"parsed": False, "reason": f"{path} not found"}
    try:
        doc = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        return {"parsed": False, "reason": f"invalid JSON: {e}"}

    tests: list[dict[str, Any]] = []

    def walk(suite: dict[str, Any]) -> None:
        for spec in suite.get("specs", []) or []:
            for t in spec.get("tests", []) or []:
                results = t.get("results", []) or []
                last = results[-1] if results else {}
                tests.append({
                    "title": spec.get("title"),
                    "file": suite.get("file") or spec.get("file"),
                    "status": last.get("status", "unknown"),
                    "duration_ms": last.get("duration"),
                    "error": (last.get("error") or {}).get("message"),
                })
        for child in suite.get("suites", []) or []:
            walk(child)

    for s in doc.get("suites", []) or []:
        walk(s)

    counts: dict[str, int] = {}
    for t in tests:
        counts[t["status"]] = counts.get(t["status"], 0) + 1
    return {
        "parsed": True,
        "total": len(tests),
        "counts": dict(sorted(counts.items())),
        "passed": counts.get("passed", 0),
        "failed": counts.get("failed", 0) + counts.get("timedOut", 0),
        "tests": tests,
    }


def doctor(root: Path, config: dict[str, Any]) -> list[dict[str, Any]]:
    """Environment preflight. Reports rather than fixes, so nothing is installed
    behind the user's back."""
    checks: list[dict[str, Any]] = []

    def add(name: str, ok: bool, detail: str, fix: str = "") -> None:
        checks.append({"check": name, "ok": ok, "detail": detail, "fix": fix})

    add("python", sys.version_info >= (3, 9), f"Python {sys.version.split()[0]}",
        "Python 3.9+ is required.")

    node = shutil.which("node")
    add("node", bool(node), node or "not found",
        "Install Node.js 20+ -- Playwright and the harness runtime need it.")

    add("npm", bool(shutil.which("npm")), shutil.which("npm") or "not found",
        "Install npm (ships with Node.js).")

    docker = shutil.which("docker")
    if docker:
        r = run_shell("docker info", root, timeout=20)
        add("docker", r.returncode == 0,
            "daemon running" if r.returncode == 0 else "installed but daemon not responding",
            "Start Docker Desktop / the docker daemon.")
    else:
        add("docker", False, "not found",
            "Install Docker if the system under test uses containers.")

    try:
        import yaml  # noqa: F401
        add("pyyaml", True, "importable", "")
    except ImportError:
        add("pyyaml", False, "not installed",
            "pip install pyyaml -- without it, docker-compose files and YAML "
            "OpenAPI specs are skipped during discovery.")

    up = config.get("up")
    add("config.up", bool(up), up or "not set",
        "Set `up` in e2e/config.json to the command that boots the system.")

    pw = root / "node_modules" / "@playwright" / "test"
    add("playwright", pw.is_dir(), "installed" if pw.is_dir() else "not installed",
        "Run `e2e setup` to install @playwright/test and adapter packages.")

    return checks
