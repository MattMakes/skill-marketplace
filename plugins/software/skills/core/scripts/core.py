#!/usr/bin/env python3
"""core helper: graph-side upkeep of the AGENTS.md tree that software:keys owns.

Every operation here is deterministic. Nothing in this file calls a model, and
nothing needs one. The instruction files themselves -- the root AGENTS.md, its
children and their indexes -- belong to the `software:keys` skill. This script
only does the two jobs the graph layer needs from that tree: keep graphify's
own instructions in a marked block of the root AGENTS.md, and report the tree's
state so status.sh can pick a verdict.

Commands:
  graphify-block  move graphify's `## graphify` section out of CLAUDE.md into a
                  <!-- GRAPHIFY:begin --> ... <!-- GRAPHIFY:end --> block in the
                  root AGENTS.md
  boundaries      print directories that look like durable boundaries but have
                  no AGENTS.md
  check           emit key=value lines about the AGENTS.md tree (status.sh)
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# Our block. The name is deliberately not KEYS: keys.py tests for the literal
# "<!-- KEYS:begin -->" and replaces only the text between its own markers, and
# keys' folding drops "<!-- CORE:begin -->" blocks. A GRAPHIFY block matches
# neither, so a keys install or fold leaves it exactly where it is.
BEGIN = "<!-- GRAPHIFY:begin -->"
END = "<!-- GRAPHIFY:end -->"

# Mirrors software/skills/keys/scripts/keys.py. Read-only here: core never
# writes the KEYS block, it only reports whether keys has been installed.
KEYS_BEGIN = "<!-- KEYS:begin -->"
KEYS_END = "<!-- KEYS:end -->"
KEYS_PLACEHOLDER = "This project is not yet indexed."
KEYS_SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist",
                  "build", "target", "vendor", ".next", ".cache", "coverage"}

# graphify's own skill-registration line, as `graphify claude install` writes it
# into .claude/CLAUDE.md. Kept in the block so it survives that file going away.
TRIGGER = ("When the user types `/graphify`, use the installed graphify skill "
           "or instructions before doing anything else.")

# Directories that are never boundaries and never worth walking into.
SKIP_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "__pycache__", ".venv", "venv",
    "env", ".env", "dist", "build", "out", "target", "vendor", ".next",
    ".nuxt", ".svelte-kit", "coverage", ".pytest_cache", ".mypy_cache",
    ".ruff_cache", ".tox", ".gradle", ".idea", ".vscode", "bin", "obj",
    "graphify-out", ".claude", ".codex", ".cursor", "site-packages",
    ".terraform", "Pods", "DerivedData", ".turbo", ".parcel-cache",
}

# A directory holding one of these owns its own build, so it is a boundary
# whatever its file count says.
MANIFESTS = {
    "package.json", "pyproject.toml", "setup.py", "go.mod", "Cargo.toml",
    "build.gradle", "build.gradle.kts", "pom.xml", "Gemfile", "composer.json",
    "mix.exs", "Package.swift", "pubspec.yaml", "CMakeLists.txt",
    "requirements.txt", "deno.json", "Makefile",
}

CODE_EXT = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java",
    ".kt", ".kts", ".scala", ".rb", ".php", ".cs", ".c", ".h", ".cc", ".cpp",
    ".hpp", ".swift", ".m", ".mm", ".lua", ".zig", ".ex", ".exs", ".dart",
    ".vue", ".svelte", ".sql", ".sh", ".bash", ".ps1", ".jl", ".clj", ".erl",
}

GRAPHIFY_HEADING = re.compile(r"^(#{2,3})\s+graphify\s*$")


# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")


def walk(root: Path):
    """Yield directories under root, pruning the noise."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
        )
        yield Path(dirpath), dirnames, filenames


def tree_files(root: Path) -> list[str]:
    """Project files as keys sees them: git's view in a repo, a walk outside one.

    Using the same listing as keys.py means the counts printed here are the
    counts keys will act on, including `.claude/CLAUDE.md`, which a dot-pruning
    walk would miss.
    """
    try:
        r = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=root, capture_output=True,
        )
        if r.returncode == 0:
            out = [os.fsdecode(p) for p in r.stdout.split(b"\0") if p]
            return sorted(p for p in out if os.path.lexists(root / p))
    except OSError:
        pass
    paths = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in KEYS_SKIP_DIRS]
        rel = Path(dirpath).relative_to(root)
        paths.extend((rel / f).as_posix() for f in filenames)
    return sorted(paths)


def has_pair(text: str, begin: str, end: str) -> bool:
    b = text.find(begin)
    return b != -1 and text.find(end, b) != -1


def find_section(lines: list[str]) -> tuple[int, int] | None:
    """[start, stop) of an unmarked graphify section, or None.

    A `## graphify` section runs to the next H1/H2; a `### graphify` one (where
    keys' folding may have placed it under Work Guidance) runs to the next
    H1-H3. Lines already inside our markers are not candidates.
    """
    inside = False
    for i, line in enumerate(lines):
        s = line.rstrip("\n")
        if s.strip() == BEGIN:
            inside = True
            continue
        if s.strip() == END:
            inside = False
            continue
        m = GRAPHIFY_HEADING.match(s)
        if inside or not m:
            continue
        level = len(m.group(1))
        stop = len(lines)
        for j in range(i + 1, len(lines)):
            h = re.match(r"^(#{1,6})\s", lines[j])
            if (h and len(h.group(1)) <= level) or lines[j].strip() in (BEGIN, END, KEYS_BEGIN):
                stop = j
                break
        return i, stop
    return None


def section_body(lines: list[str], span: tuple[int, int]) -> str:
    """The section's text below its heading, normalised to start at `## graphify`."""
    body = "".join(lines[span[0] + 1:span[1]]).strip("\n")
    return "## graphify\n\n" + body.strip() + "\n"


def is_graphify_only(text: str) -> bool:
    """True when a .claude/CLAUDE.md holds nothing but graphify's registration."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    return bool(lines) and lines[0] == "# graphify" and all(
        "graphify" in l.lower() for l in lines
    )


# --------------------------------------------------------------------------
# graphify-block: graphify's instructions live in the root AGENTS.md
# --------------------------------------------------------------------------

def cmd_graphify_block(args) -> int:
    """Move graphify's section into a marked block in the root AGENTS.md.

    `graphify claude install` writes a `## graphify` section into CLAUDE.md and a
    registration note into .claude/CLAUDE.md. Under the AGENTS.md-only model
    that keys enforces, neither file should exist, so this relocates the
    section, then removes what graphify wrote: the section from CLAUDE.md, and
    either file once nothing else is left in it. A CLAUDE.md that still holds
    other text stays where it is for keys to fold. Safe to run on every prime.
    """
    root = Path(args.root).resolve()
    agents, claude = root / "AGENTS.md", root / "CLAUDE.md"
    dot_claude = root / ".claude" / "CLAUDE.md"

    # A symlinked root AGENTS.md (the old CLAUDE.md-first layout) would route
    # the write straight back into CLAUDE.md. keys `install` replaces the link
    # with a regular file; until then, change nothing.
    if agents.is_symlink():
        print("graphify_block=deferred (AGENTS.md is a symlink; run software:keys, then graph.sh again)")
        return 0

    body = None

    # 1. A fresh section in CLAUDE.md wins: graphify has just (re)written it.
    claude_lines = None
    if claude.is_file() and not claude.is_symlink():
        claude_lines = read(claude).splitlines(keepends=True)
        span = find_section(claude_lines)
        if span:
            body = section_body(claude_lines, span)
            claude_lines = claude_lines[:span[0]] + claude_lines[span[1]:]
        else:
            claude_lines = None

    text = read(agents) if agents.exists() else ""
    lines = text.splitlines(keepends=True)

    # 2. An unmarked section already in AGENTS.md (keys folded it, or
    #    `graphify codex install` wrote it) is wrapped in place, not duplicated.
    span = find_section(lines)
    if span and body is None:
        body = section_body(lines, span)

    # 3. Otherwise keep the block we wrote last time.
    if body is None and has_pair(text, BEGIN, END):
        b = text.index(BEGIN) + len(BEGIN)
        body = text[b:text.index(END, b)].strip("\n") + "\n"

    dot_text = read(dot_claude) if dot_claude.is_file() and not dot_claude.is_symlink() else None
    dot_drop = dot_text is not None and is_graphify_only(dot_text)

    if body is None:
        print("graphify_block=absent (no graphify section to move; run graph.sh)")
        return 0

    if dot_drop and "/graphify" not in body:
        body = body.rstrip("\n") + "\n\n" + TRIGGER + "\n"
    block = f"{BEGIN}\n{body.strip()}\n{END}\n"

    pat = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n?", re.DOTALL)
    if span and has_pair(text, BEGIN, END):
        # Both a block and a stray copy: keep the block, drop the copy.
        rest = "".join(lines[:span[0]]) + "".join(lines[span[1]:])
        new = pat.sub(lambda _m: block, rest, count=1)
    elif span:
        # Replace the unmarked section in place.
        new = "".join(lines[:span[0]]) + block + "".join(lines[span[1]:])
    elif has_pair(text, BEGIN, END):
        new = pat.sub(lambda _m: block, text, count=1)
    elif not text:
        new = block
    else:
        # Keys keeps project-wide text between `<!-- KEYS:end -->` and
        # `## User Preferences`; the block belongs there, ahead of the
        # preferences and the index. Without either heading, append.
        start = 0
        if has_pair(text, KEYS_BEGIN, KEYS_END):
            start = text.index(KEYS_END, text.index(KEYS_BEGIN))
        at = -1
        for heading in ("## User Preferences", "## Child KEYS Index"):
            m = re.search(r"^" + re.escape(heading) + r"\s*$", text[start:], re.MULTILINE)
            if m:
                at = start + m.start()
                break
        if at == -1:
            new = text.rstrip("\n") + "\n\n" + block
        else:
            new = text[:at] + block + "\n" + text[at:]

    if new != text:
        agents.write_text(new, encoding="utf-8")
        print("AGENTS.md: graphify block " + ("written" if not has_pair(text, BEGIN, END) else "updated"))
    else:
        print("AGENTS.md: graphify block unchanged")

    if claude_lines is not None:
        rest = "".join(claude_lines)
        if rest.strip():
            claude.write_text(rest.rstrip("\n") + "\n", encoding="utf-8")
            print("CLAUDE.md: graphify section removed; other text left for software:keys to fold")
        else:
            claude.unlink()
            print("CLAUDE.md: removed (it held only the graphify section)")
    if dot_drop:
        dot_claude.unlink()
        print(".claude/CLAUDE.md: removed (it held only graphify's registration)")

    print("graphify_block=present")
    return 0


# --------------------------------------------------------------------------
# boundaries: where an AGENTS.md would earn its keep
# --------------------------------------------------------------------------

def cmd_boundaries(args) -> int:
    """Directories that look like durable boundaries and have no AGENTS.md yet.

    Deliberately mechanical: a directory qualifies because it owns a build
    manifest or because it holds enough code to be a real area, not because
    anything inferred meaning from it. keys decides which of these get a doc --
    this just stops anyone from having to crawl the tree to find the candidates.
    """
    root = Path(args.root).resolve()
    hits = []

    for dirpath, _dirnames, filenames in walk(root):
        if dirpath == root or "AGENTS.md" in filenames:
            continue
        names = set(filenames)
        code_total = 0
        for _sub, _sd, sf in walk(dirpath):
            code_total += sum(1 for f in sf if Path(f).suffix in CODE_EXT)

        depth = len(dirpath.relative_to(root).parts)
        reason = ""
        if names & MANIFESTS:
            reason = "own manifest (" + ", ".join(sorted(names & MANIFESTS)) + ")"
        elif depth <= args.max_depth and code_total >= args.min_files:
            reason = f"{code_total} code files"

        if reason:
            hits.append((code_total, dirpath.relative_to(root), reason))

    hits.sort(key=lambda h: -h[0])
    for _total, rel, reason in hits[: args.limit]:
        print(f"{rel}/\t{reason}")
    if not hits:
        print("(none)")
    return 0


# --------------------------------------------------------------------------
# check: the AGENTS.md tree as key=value, for status.sh
# --------------------------------------------------------------------------

def cmd_check(args) -> int:
    root = Path(args.root).resolve()
    files = tree_files(root)
    agents = [p for p in files if os.path.basename(p) == "AGENTS.md"]
    # What keys folds: every CLAUDE.md, including .claude/CLAUDE.md. Never
    # CLAUDE.local.md, which is personal and which keys leaves alone.
    stray = [p for p in files if os.path.basename(p) == "CLAUDE.md"]

    root_doc = root / "AGENTS.md"
    text = read(root_doc) if root_doc.exists() else ""
    keys_root = has_pair(text, KEYS_BEGIN, KEYS_END)

    if has_pair(text, BEGIN, END):
        gblock = "present"
    elif text and find_section(text.splitlines(keepends=True)):
        gblock = "unmarked"
    elif (root / "CLAUDE.md").is_file() and find_section(read(root / "CLAUDE.md").splitlines(keepends=True)):
        gblock = "in_claude_md"
    else:
        gblock = "absent"

    print(f"agents_md={len(agents)}")
    print(f"keys_root={'present' if keys_root else 'absent'}")
    print("keys_indexed=" + ("n/a" if not keys_root else ("no" if KEYS_PLACEHOLDER in text else "yes")))
    print(f"stray_claude_md={len(stray)}")
    if stray:
        print("  keys would fold: " + ", ".join(stray[:6]) + (" …" if len(stray) > 6 else ""))
    print(f"graphify_block={gblock}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        prog="core.py", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("graphify-block",
                       help="move graphify's CLAUDE.md section into a marked block in AGENTS.md")
    p.add_argument("--root", default=".")
    p.set_defaults(func=cmd_graphify_block)

    p = sub.add_parser("boundaries", help="candidate directories with no AGENTS.md")
    p.add_argument("--root", default=".")
    p.add_argument("--min-files", type=int, default=8)
    p.add_argument("--max-depth", type=int, default=3)
    p.add_argument("--limit", type=int, default=15)
    p.set_defaults(func=cmd_boundaries)

    p = sub.add_parser("check", help="emit key=value lines about the AGENTS.md tree")
    p.add_argument("--root", default=".")
    p.set_defaults(func=cmd_check)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
