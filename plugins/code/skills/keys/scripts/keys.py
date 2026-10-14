#!/usr/bin/env python3
"""KEYS helper: scan a project, install the root AGENTS.md, check the tree.

Usage:
  keys.py scan    [--root DIR]            JSON inventory of agent docs
  keys.py install [--root DIR]            write or upgrade <root>/AGENTS.md
  keys.py check   [--root DIR] [--strict] validate the AGENTS.md tree

Stdlib only, Python 3.9+. Only `install` writes, and only <root>/AGENTS.md.
"""
import argparse
import json
import os
import posixpath
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

BEGIN = "<!-- KEYS:begin -->"
END = "<!-- KEYS:end -->"
PLACEHOLDER = "This project is not yet indexed."
TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "AGENTS-root.md"

INDEX_HEADING = "## Child KEYS Index"
PREFS_HEADING = "## User Preferences"

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist",
             "build", "target", "vendor", ".next", ".cache", "coverage"}
RULE_BASENAMES = {"AGENT.md", "GEMINI.md", "CONVENTIONS.md",
                  ".cursorrules", ".windsurfrules", ".clinerules"}
HUMAN_DOC_PREFIXES = ("readme", "changelog", "history", "license", "notice",
                      "contributing", "code_of_conduct", "security", "support",
                      "authors")
MANIFESTS = {"package.json", "pyproject.toml", "setup.py", "go.mod",
             "Cargo.toml", "pom.xml", "build.gradle", "build.gradle.kts",
             "Gemfile", "composer.json", "Package.swift", "mix.exs", "deno.json"}
IMPORT_RE = re.compile(r"(?<![\w`])@([\w./~-]+\.\w+)")
LINK_RE = re.compile(r"\[[^\]]*\]\((?:<([^>\n]+)>|([^)\s]+))\)")


# ---------------------------------------------------------------- helpers

def git(root, *args):
    """Run git in root. Return stdout, or None when git fails."""
    try:
        r = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, errors="surrogateescape")
    except OSError:
        return None
    return r.stdout if r.returncode == 0 else None


def git_paths(root, *args):
    """Run git with -z in root. Return paths decoded like the filesystem, or None."""
    try:
        r = subprocess.run(["git", *args, "-z"], cwd=root, capture_output=True)
    except OSError:
        return None
    if r.returncode != 0:
        return None
    return [os.fsdecode(p) for p in r.stdout.split(b"\0") if p]


def resolve_root(arg):
    if arg:
        return Path(arg).resolve()
    top = git(Path.cwd(), "rev-parse", "--show-toplevel")
    return Path(top.strip()) if top else Path.cwd()


def is_repo(root):
    return git(root, "rev-parse", "--is-inside-work-tree") is not None


def list_files(root, repo):
    """POSIX paths relative to root, sorted. Symlinks are entries, not followed."""
    if repo:
        out = git_paths(root, "ls-files", "--cached", "--others", "--exclude-standard") or []
        paths = {p for p in out if os.path.lexists(root / p)}
        return sorted(paths)
    paths = []
    for dirpath, dirnames, filenames in os.walk(root):
        rel = Path(dirpath).relative_to(root)
        keep = []
        for d in dirnames:
            if d in SKIP_DIRS:
                continue
            if os.path.islink(os.path.join(dirpath, d)):
                paths.append((rel / d).as_posix())
            else:
                keep.append(d)
        dirnames[:] = keep
        paths.extend((rel / f).as_posix() for f in filenames)
    return sorted(paths)


def read_text(path):
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None


def is_rule_file(path):
    parts = path.split("/")
    name = parts[-1]
    dirs = parts[:-1]
    if name in RULE_BASENAMES or ".clinerules" in dirs:
        return True
    pairs = list(zip(dirs, dirs[1:]))
    if (".cursor", "rules") in pairs:
        return True
    if path == ".github/copilot-instructions.md" or path.endswith("/.github/copilot-instructions.md"):
        return True
    if name.endswith(".md") and ((".github", "instructions") in pairs or (".claude", "rules") in pairs):
        return True
    return False


def is_claude_md(path):
    return posixpath.basename(path) in ("CLAUDE.md", "CLAUDE.local.md")


def find_imports(text):
    found, fenced = [], False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if not fenced:
            found.extend(m.group(1) for m in IMPORT_RE.finditer(line))
    return list(dict.fromkeys(found))


def is_other_md(path):
    name = posixpath.basename(path)
    low = name.lower()
    if not low.endswith(".md") or name == "SKILL.md":
        return False
    if low.startswith(HUMAN_DOC_PREFIXES) or low.startswith("pull_request_template"):
        return False
    if path.startswith(".github/ISSUE_TEMPLATE/") or "/.github/ISSUE_TEMPLATE/" in path:
        return False
    return True


def has_markers(text):
    b = text.find(BEGIN)
    return b != -1 and text.find(END, b) != -1


# ---------------------------------------------------------------- scan

def cmd_scan(root):
    repo = is_repo(root)
    files = list_files(root, repo)
    tracked = set()
    if repo:
        tracked = set(git_paths(root, "ls-files", "--cached") or [])
    root_text = read_text(root / "AGENTS.md") if os.path.exists(root / "AGENTS.md") else None

    agents, claude, rules, other, boundaries = [], [], [], [], set()
    for p in files:
        name = posixpath.basename(p)
        full = root / p
        if name == "AGENTS.md":
            agents.append({"path": p,
                           "symlink_to": os.readlink(full) if os.path.islink(full) else None})
        elif is_claude_md(p):
            text = read_text(full) or ""
            claude.append({"path": p, "local": name == "CLAUDE.local.md",
                           "imports": find_imports(text),
                           "core_block": "<!-- CORE:begin -->" in text})
        elif is_rule_file(p):
            rules.append(p)
        elif is_other_md(p):
            other.append({"path": p, "bytes": full.lstat().st_size, "tracked": p in tracked})
        parent = posixpath.dirname(p)
        if parent and (name in MANIFESTS or name.endswith(".csproj")):
            boundaries.add(parent)

    result = {
        "root": str(root),
        "git": {"repo": repo,
                "clean": repo and git(root, "status", "--porcelain") == ""},
        "keys_installed": root_text is not None and has_markers(root_text),
        "root_indexed": root_text is not None and PLACEHOLDER not in root_text,
        "agents_md": agents,
        "claude_md": claude,
        "agent_rule_files": rules,
        "other_md": other[:200],
        "other_md_total": len(other),
        "boundary_candidates": sorted(boundaries),
    }
    print(json.dumps(result, indent=2))
    return 0


# ---------------------------------------------------------------- install

def section(text, heading):
    """The section starting at the line `heading`, up to the next `## ` line."""
    lines = text.splitlines()
    start = next(i for i, l in enumerate(lines) if l.rstrip() == heading)
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
               len(lines))
    return "\n".join(lines[start:end]).strip("\n")


def has_line(text, heading):
    return any(l.rstrip() == heading for l in text.splitlines())


def cmd_install(root):
    template = TEMPLATE.read_text(encoding="utf-8")
    b = template.index(BEGIN)
    e = template.index(END) + len(END)
    block = template[b:e]
    after = template[e:]
    tail_sections = [(PREFS_HEADING, section(after, PREFS_HEADING)),
                     (INDEX_HEADING, section(after, INDEX_HEADING))]

    target = root / "AGENTS.md"
    if not os.path.lexists(target):
        target.write_text(template, encoding="utf-8")
        print("created AGENTS.md")
        return 0

    link = None
    if target.is_symlink():
        link = os.readlink(target)
        if not target.exists():
            print(f"error: AGENTS.md is a symlink to missing {link}", file=sys.stderr)
            return 2
        resolved = target.resolve()
        if not resolved.is_relative_to(root.resolve()):
            print(f"AGENTS.md links outside the project: {resolved}", file=sys.stderr)
            return 2
    try:
        with open(target, encoding="utf-8", newline="") as f:
            text = f.read()
    except UnicodeDecodeError:
        print("AGENTS.md is not valid UTF-8", file=sys.stderr)
        return 2

    has_b, has_e = BEGIN in text, END in text
    if has_b != has_e or (has_b and not has_markers(text)):
        print("malformed KEYS block", file=sys.stderr)
        return 2

    if has_b:
        start = text.index(BEGIN)
        stop = text.index(END, start) + len(END)
        new = text[:start] + block + text[stop:]
        msg = "KEYS block unchanged" if new == text else "updated KEYS block"
    else:
        new = block + "\n\n" + text.lstrip()
        for heading, body in tail_sections:
            if not has_line(new, heading):
                new = new.rstrip("\n") + "\n\n" + body
        new = new.rstrip("\n") + "\n"
        msg = "merged KEYS into existing AGENTS.md"

    if link is not None:
        target.unlink()
        print(f"replaced symlink AGENTS.md -> {link}")
    if link is not None or new != text:
        with open(target, "w", encoding="utf-8", newline="") as f:
            f.write(new)
    print(msg)
    return 0


# ---------------------------------------------------------------- check

def index_entries(text):
    """Link targets ending in AGENTS.md inside the Child KEYS Index, or None."""
    lines = text.splitlines()
    try:
        start = next(i for i, l in enumerate(lines) if l.rstrip() == INDEX_HEADING)
    except StopIteration:
        return None
    targets = []
    for line in lines[start + 1:]:
        if line.startswith("## ") or line.startswith("# "):
            break
        for m in LINK_RE.finditer(line):
            t = m.group(1) or m.group(2)
            if t.endswith("AGENTS.md"):
                targets.append(t)
    return targets


def parent_of(path, agents):
    d = posixpath.dirname(path)
    while d:
        d = posixpath.dirname(d)
        candidate = posixpath.join(d, "AGENTS.md") if d else "AGENTS.md"
        if candidate in agents:
            return candidate
    return None


def cmd_check(root, strict):
    files = list_files(root, is_repo(root))
    agents = {p for p in files if posixpath.basename(p) == "AGENTS.md"}
    findings = []

    def add(level, path, message):
        findings.append((path, level, message))

    if os.path.lexists(root / "AGENTS.md"):
        agents.add("AGENTS.md")
    else:
        add("ERROR", "AGENTS.md", "root AGENTS.md does not exist")

    children = {p: [] for p in agents}
    for p in agents:
        parent = parent_of(p, agents)
        if parent:
            children[parent].append(p)

    for p in sorted(agents):
        full = root / p
        if full.is_symlink():
            add("ERROR", p, "is a symlink; AGENTS.md must be a regular file")
        text = read_text(full)
        if text is None:
            continue
        if p == "AGENTS.md" and not has_markers(text):
            add("ERROR", p, "KEYS markers missing or out of order; run keys.py install")
        if p != "AGENTS.md" and BEGIN in text:
            add("WARN", p, "contains the KEYS block; the framework belongs in root AGENTS.md only")
        if PLACEHOLDER in text:
            add("ERROR", p, "still contains the unindexed placeholder; build the tree and write the index")
        entries = index_entries(text)
        if entries is None:
            add("ERROR", p, f"has no '{INDEX_HEADING}' section")
            continue
        base = posixpath.dirname(p)
        listed = set()
        for t in entries:
            resolved = posixpath.normpath(posixpath.join(base, unquote(t)))
            listed.add(resolved)
            if not os.path.exists(root / resolved):
                add("ERROR", p, f"index entry {t} points to a missing file")
            elif resolved not in children[p]:
                add("ERROR", p, f"index entry {t} is not a direct child")
        for c in sorted(children[p]):
            if c not in listed:
                add("ERROR", p, f"direct child {c} is missing from the index")

    for p in files:
        if posixpath.basename(p) == "CLAUDE.md":
            add("WARN", p, "CLAUDE.md exists; fold it into the owning AGENTS.md")
        elif is_rule_file(p):
            add("WARN", p, "agent rule file exists; fold it into the owning AGENTS.md")

    findings.sort(key=lambda f: f[0])
    for path, level, message in findings:
        print(f"{level} {path}: {message}")
    errors = sum(1 for f in findings if f[1] == "ERROR")
    warnings = len(findings) - errors
    print(f"keys check: {errors} errors, {warnings} warnings")
    return 1 if errors or (strict and warnings) else 0


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="KEYS AGENTS.md helper")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("scan", "install", "check"):
        sp = sub.add_parser(name)
        sp.add_argument("--root")
        if name == "check":
            sp.add_argument("--strict", action="store_true")
    args = ap.parse_args()
    root = resolve_root(args.root)
    if args.cmd == "scan":
        return cmd_scan(root)
    if args.cmd == "install":
        return cmd_install(root)
    return cmd_check(root, args.strict)


if __name__ == "__main__":
    sys.exit(main())
