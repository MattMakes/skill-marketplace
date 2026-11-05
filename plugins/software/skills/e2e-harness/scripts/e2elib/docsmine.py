"""Deterministic extraction of testable facts from a documentation folder.

The skill's premise is that you have already collected the docs. This module
turns that folder into structured evidence so journey authoring is grounded in
what the system claims to do, not in what the model imagines.

Three things get mined, all by regex over Markdown, all cheap:

  endpoints  - "GET /api/orders" style references, plus fenced http blocks
  env_vars   - SCREAMING_SNAKE identifiers that look like configuration
  workflows  - headings that read like a user-facing action, with their prose

Precision matters more than recall here. A workflow list with 20 real candidates
beats one with 200 headings, because a human reviews this. When in doubt, skip.
"""
from __future__ import annotations

import re
from collections import Counter
from pathlib import Path
from typing import Any

DOC_EXTS = {".md", ".mdx", ".markdown", ".txt", ".rst"}
MAX_FILES = 4000
MAX_BYTES_PER_FILE = 400_000

HTTP_METHODS = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS"

# "POST /api/v1/orders" or "`GET /health`" -- method then path, same line.
RE_ENDPOINT = re.compile(
    rf"\b({HTTP_METHODS})\s+(/[A-Za-z0-9_\-./{{}}:]*)",
)
# curl invocations name a real URL and often a real method.
RE_CURL = re.compile(
    rf"curl\b[^\n]*?(?:-X\s+({HTTP_METHODS})\s+)?[\"']?(https?://[^\s\"'`]+|/[A-Za-z0-9_\-./{{}}]+)",
    re.IGNORECASE,
)
RE_ENV = re.compile(r"\b([A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+){1,})\b")
RE_HEADING = re.compile(r"^(#{1,4})\s+(.+?)\s*$", re.MULTILINE)
RE_FRONTMATTER = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)

# A heading is a workflow candidate when it starts with an imperative verb --
# that is what distinguishes "Upload a file" from "Configuration reference".
WORKFLOW_VERBS = {
    "add", "assert", "authenticate", "build", "call", "check", "confirm",
    "configure", "connect", "consume", "emit", "ensure", "inspect", "observe",
    "poll", "produce", "wait",
    "create", "delete", "deploy", "download", "enable", "export", "fetch",
    "generate", "get", "handle", "import", "ingest", "install", "invoke",
    "list", "log", "login", "migrate", "monitor", "notify", "post", "process",
    "publish", "query", "read", "receive", "register", "remove", "request",
    "reset", "resolve", "retrieve", "run", "schedule", "search", "send",
    "set", "sign", "start", "stop", "stream", "submit", "subscribe", "sync",
    "trigger", "update", "upload", "validate", "verify", "view", "watch",
    "write",
}

# Environment-variable-looking tokens that are never configuration.
ENV_STOPWORDS = {
    "HTTP_METHODS", "JSON_SCHEMA", "README_MD", "TODO_NOTE", "NOT_FOUND",
    "BAD_REQUEST", "INTERNAL_SERVER", "SERVER_ERROR", "CONTENT_TYPE",
    "USER_AGENT", "MIT_LICENSE", "SPDX_LICENSE", "CODE_OF", "PULL_REQUEST",
}

# Paths that are almost always documentation examples, not real endpoints.
PATH_NOISE = re.compile(r"^/(?:$|dev/null|etc/|usr/|var/|tmp/|home/|path/to/|Users/|opt/)")


def _is_workflow(title: str) -> bool:
    words = re.findall(r"[A-Za-z]+", title.lower())
    if not words or len(words) > 12:
        return False
    return words[0] in WORKFLOW_VERBS


def _clean(text: str) -> str:
    return RE_FRONTMATTER.sub("", text)


def _summarize(body: str, limit: int = 280) -> str:
    """First real sentence or two under a heading -- enough for a human to judge
    whether the workflow is worth a journey."""
    for line in body.splitlines():
        s = line.strip()
        if not s or s.startswith(("#", "```", "|", ">", "<", "-", "*", ":::")):
            continue
        s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)   # links -> text
        s = re.sub(r"[`*_]", "", s)
        if len(s) > 30:
            return s[:limit]
    return ""


def mine(docs_dir: Path) -> dict[str, Any]:
    """Walk the docs folder and return structured findings.

    Returns `{"present": False, ...}` when the folder is missing or empty so the
    caller can fail loudly -- journeys grounded in nothing are the failure mode
    this whole module exists to prevent.
    """
    docs_dir = Path(docs_dir)
    if not docs_dir.is_dir():
        return {"present": False, "reason": f"{docs_dir} is not a directory", "dir": str(docs_dir)}

    files = sorted(
        p for p in docs_dir.rglob("*")
        if p.is_file() and p.suffix.lower() in DOC_EXTS and ".git" not in p.parts
    )[:MAX_FILES]
    if not files:
        return {
            "present": False,
            "reason": f"No documentation files ({', '.join(sorted(DOC_EXTS))}) under {docs_dir}",
            "dir": str(docs_dir),
        }

    endpoints: Counter[tuple[str, str]] = Counter()
    endpoint_src: dict[tuple[str, str], str] = {}
    env: Counter[str] = Counter()
    workflows: list[dict[str, Any]] = []
    base_urls: Counter[str] = Counter()

    for f in files:
        try:
            raw = f.read_text(encoding="utf-8", errors="replace")[:MAX_BYTES_PER_FILE]
        except OSError:
            continue
        text = _clean(raw)
        rel = str(f.relative_to(docs_dir))

        for m in RE_ENDPOINT.finditer(text):
            method, path = m.group(1).upper(), m.group(2).rstrip(".,;:)")
            if PATH_NOISE.match(path) or len(path) > 200:
                continue
            key = (method, path)
            endpoints[key] += 1
            endpoint_src.setdefault(key, rel)

        for m in RE_CURL.finditer(text):
            method = (m.group(1) or "GET").upper()
            target = m.group(2)
            if target.startswith("http"):
                mm = re.match(r"(https?://[^/]+)(/.*)?", target)
                if mm:
                    base_urls[mm.group(1)] += 1
                    path = (mm.group(2) or "/").rstrip(".,;:)")
                else:
                    continue
            else:
                path = target.rstrip(".,;:)")
            if PATH_NOISE.match(path):
                continue
            key = (method, path)
            endpoints[key] += 1
            endpoint_src.setdefault(key, rel)

        for m in RE_ENV.finditer(text):
            tok = m.group(1)
            if tok in ENV_STOPWORDS or len(tok) > 60:
                continue
            env[tok] += 1

        headings = list(RE_HEADING.finditer(text))
        for i, h in enumerate(headings):
            title = re.sub(r"[`*_]|\{#.*?\}", "", h.group(2)).strip()
            if not _is_workflow(title):
                continue
            end = headings[i + 1].start() if i + 1 < len(headings) else len(text)
            body = text[h.end():end]
            workflows.append({
                "title": title,
                "source": rel,
                "level": len(h.group(1)),
                "summary": _summarize(body),
                "mentions_endpoint": bool(RE_ENDPOINT.search(body)),
                "has_code_block": "```" in body,
            })

    # Rank workflows by evidence: a heading backed by an endpoint and a code
    # sample is far more likely to describe something testable end to end.
    workflows.sort(key=lambda w: (
        -int(w["mentions_endpoint"]),
        -int(w["has_code_block"]),
        w["level"],
        w["title"],
    ))

    return {
        "present": True,
        "dir": str(docs_dir),
        "file_count": len(files),
        "endpoints": [
            {"method": m, "path": p, "mentions": c, "first_seen": endpoint_src[(m, p)]}
            for (m, p), c in sorted(endpoints.items(), key=lambda kv: (-kv[1], kv[0]))
        ][:300],
        "env_vars": [
            {"name": k, "mentions": c}
            for k, c in sorted(env.items(), key=lambda kv: (-kv[1], kv[0]))
        ][:200],
        "base_urls": [
            {"url": u, "mentions": c}
            for u, c in sorted(base_urls.items(), key=lambda kv: (-kv[1], kv[0]))
        ][:50],
        "workflow_candidates": workflows[:120],
        "workflow_candidate_count": len(workflows),
    }
