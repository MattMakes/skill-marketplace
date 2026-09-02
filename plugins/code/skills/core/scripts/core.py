#!/usr/bin/env python3
"""CORE tree maintenance: CLAUDE.md contracts with AGENTS.md symlinks beside them.

Every operation here is deterministic. Nothing in this file calls a model, and
nothing needs one -- the whole point of the CORE layer is that the mechanical
parts (linking, indexing, health checks, boundary detection) cost zero tokens so
the model only spends context on the parts that need judgement: what a directory
is actually *for*.

Commands:
  link       ensure CLAUDE.md is a real file and AGENTS.md is a symlink to it
  block      insert or replace the <!-- CORE:begin --> ... <!-- CORE:end --> block
  index      regenerate every "Child CORE Index" from the CORE docs on disk
  boundaries print directories that look like durable boundaries but have no CORE doc
  check      emit key=value health lines (consumed by status.sh)
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

BEGIN = "<!-- CORE:begin -->"
END = "<!-- CORE:end -->"

INDEX_HEADING = "## Child CORE Index"

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


# --------------------------------------------------------------------------
# small helpers
# --------------------------------------------------------------------------

def state(p: Path) -> str:
    """absent | symlink | file | dangling"""
    if not os.path.lexists(p):
        return "absent"
    if p.is_symlink():
        return "dangling" if not p.exists() else "symlink"
    return "file"


def link_target(p: Path) -> str:
    try:
        return os.readlink(p)
    except OSError:
        return ""


def walk(root: Path):
    """Yield directories under root, pruning the noise."""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(
            d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
        )
        yield Path(dirpath), dirnames, filenames


def core_docs(root: Path) -> list[Path]:
    """Every CLAUDE.md under root that carries a CORE block, root first."""
    found = []
    for dirpath, _dirnames, filenames in walk(root):
        if "CLAUDE.md" not in filenames:
            continue
        p = dirpath / "CLAUDE.md"
        try:
            if BEGIN in p.read_text(encoding="utf-8", errors="replace"):
                found.append(p)
        except OSError:
            continue
    return sorted(found, key=lambda p: (len(p.parts), str(p)))


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------------
# link: CLAUDE.md is the real file, AGENTS.md points at it
# --------------------------------------------------------------------------

def cmd_link(args) -> int:
    """Make each directory's CLAUDE.md real and its AGENTS.md a symlink to it.

    The direction matters. Claude Code loads a subdirectory's CLAUDE.md the
    moment it reads a file in that directory, so keeping the real content at
    CLAUDE.md means a local contract arrives exactly when it is relevant,
    without anything having to traverse the tree. AGENTS.md riding along as a
    symlink hands the same bytes to Codex, Cursor, Aider and friends for free.
    """
    rc = 0
    for raw in args.dirs:
        d = Path(raw).resolve()
        if not d.is_dir():
            print(f"skip {raw}: not a directory")
            rc = 1
            continue

        claude, agents = d / "CLAUDE.md", d / "AGENTS.md"
        cs, as_ = state(claude), state(agents)
        rel = os.path.relpath(d, Path.cwd())

        # Dangling links are debris from a moved or deleted file. Clear them and
        # re-evaluate as if they were never there.
        if cs == "dangling":
            claude.unlink()
            cs = "absent"
        if as_ == "dangling":
            agents.unlink()
            as_ = "absent"

        # AGENTS.md is real and CLAUDE.md is not: the content is already
        # written, it is just parked under the wrong name. Promote it.
        if cs == "absent" and as_ == "file":
            shutil.move(str(agents), str(claude))
            cs, as_ = "file", "absent"
            print(f"{rel}: promoted AGENTS.md -> CLAUDE.md")

        # Both real. Never drop content: fold AGENTS.md into CLAUDE.md (unless
        # they already agree) and keep a backup before the file becomes a link.
        if cs == "file" and as_ == "file":
            ctext, atext = read(claude), read(agents)
            if atext.strip() and atext.strip() not in ctext:
                merged = ctext.rstrip() + (
                    "\n\n<!-- CORE: merged from AGENTS.md -->\n" + atext.lstrip()
                )
                claude.write_text(merged, encoding="utf-8")
                print(f"{rel}: merged AGENTS.md into CLAUDE.md")
            backup = d / "AGENTS.md.core-backup"
            shutil.move(str(agents), str(backup))
            print(f"{rel}: backed up AGENTS.md -> AGENTS.md.core-backup")
            as_ = "absent"

        if cs == "absent" and as_ == "absent":
            if args.content_file:
                claude.write_text(read(Path(args.content_file)), encoding="utf-8")
            else:
                claude.write_text(f"# {d.name}\n", encoding="utf-8")
            cs = "file"
            print(f"{rel}: created CLAUDE.md")

        # CLAUDE.md is itself a link. If it points at AGENTS.md the repo already
        # uses the opposite convention -- that works fine for every tool, so
        # leave it be and say so rather than churning someone else's setup.
        if cs == "symlink":
            tgt = link_target(claude)
            if tgt in ("AGENTS.md", "./AGENTS.md") and not args.flip:
                print(f"{rel}: CLAUDE.md -> AGENTS.md (reverse convention, left alone; --flip to invert)")
                continue
            if tgt in ("AGENTS.md", "./AGENTS.md") and args.flip:
                real = read(agents)
                claude.unlink()
                claude.write_text(real, encoding="utf-8")
                agents.unlink()
                agents.symlink_to("CLAUDE.md")
                print(f"{rel}: flipped to CLAUDE.md real, AGENTS.md -> CLAUDE.md")
                continue
            print(f"{rel}: CLAUDE.md is a symlink to {tgt!r}, left alone")
            rc = 1
            continue

        if as_ == "symlink":
            if link_target(agents) in ("CLAUDE.md", "./CLAUDE.md"):
                print(f"{rel}: ok")
            else:
                print(f"{rel}: AGENTS.md points at {link_target(agents)!r}, left alone")
                rc = 1
            continue

        try:
            agents.symlink_to("CLAUDE.md")
            print(f"{rel}: linked AGENTS.md -> CLAUDE.md")
        except OSError as e:
            # Windows without Developer Mode. The documented fallback is an
            # import stub, which Claude Code expands at launch.
            agents.write_text("@CLAUDE.md\n", encoding="utf-8")
            print(f"{rel}: symlink unavailable ({e.strerror}), wrote @CLAUDE.md import stub")
    return rc


# --------------------------------------------------------------------------
# block: idempotent marker-delimited section
# --------------------------------------------------------------------------

def cmd_block(args) -> int:
    """Insert or replace the CORE block in a file, leaving everything else alone.

    Other tools write their own sections into CLAUDE.md -- `graphify claude
    install` appends a `## graphify` section, for instance. Marker-delimited
    replacement means CORE can be re-applied any number of times without
    touching a byte those tools or the user wrote. HTML comments are stripped
    before CLAUDE.md reaches the context window, so the markers themselves are
    free.
    """
    target = Path(args.file)
    body = read(Path(args.source)).strip()
    block = f"{BEGIN}\n{body}\n{END}\n"

    if not target.exists():
        target.write_text(block, encoding="utf-8")
        print(f"{args.file}: created with CORE block")
        return 0

    text = read(target)
    if BEGIN in text and END in text:
        pattern = re.compile(re.escape(BEGIN) + r".*?" + re.escape(END) + r"\n?", re.DOTALL)
        new = pattern.sub(block, text, count=1)
        if new == text:
            print(f"{args.file}: CORE block unchanged")
            return 0
        target.write_text(new, encoding="utf-8")
        print(f"{args.file}: CORE block replaced")
        return 0

    # New block goes at the top so the contract is read before anything else,
    # but after a leading H1 title if the file has one.
    lines = text.splitlines(keepends=True)
    insert_at = 0
    for i, line in enumerate(lines[:5]):
        if line.startswith("# "):
            insert_at = i + 1
            while insert_at < len(lines) and not lines[insert_at].strip():
                insert_at += 1
            break
    new = "".join(lines[:insert_at]) + block + "\n" + "".join(lines[insert_at:])
    target.write_text(new, encoding="utf-8")
    print(f"{args.file}: CORE block inserted")
    return 0


# --------------------------------------------------------------------------
# index: every parent lists its direct children
# --------------------------------------------------------------------------

def purpose_of(doc: Path, limit: int = 140) -> str:
    """The '## Purpose' paragraph, flattened to one line for the parent's index.

    Takes the whole first paragraph rather than the first physical line: a
    purpose worth writing usually wraps, and truncating it at the line break
    puts something like "...normalising them, and" in the parent index, which
    reads as a mistake rather than a summary.
    """
    text = read(doc)
    m = re.search(r"^##\s+Purpose\s*$", text, re.MULTILINE)
    if not m:
        return ""

    lines = []
    for line in text[m.end():].splitlines():
        s = line.strip()
        if s.startswith("#") or s.startswith("<!--"):
            break
        if not s:
            if lines:          # blank line ends the paragraph
                break
            continue           # blanks before it are just spacing
        lines.append(s.lstrip("-*").strip())

    para = " ".join(lines)
    para = re.sub(r"\s+", " ", para).strip()
    if len(para) <= limit:
        return para

    # Prefer cutting at the end of the first sentence; fall back to a word
    # boundary so the entry never breaks mid-word.
    cut = para.find(". ")
    if 0 < cut <= limit:
        return para[: cut + 1]
    return para[:limit].rsplit(" ", 1)[0] + "…"


def direct_children(doc: Path, all_docs: list[Path]) -> list[Path]:
    """CORE docs whose nearest CORE ancestor is this one."""
    here = doc.parent
    out = []
    for other in all_docs:
        if other == doc:
            continue
        try:
            other.parent.relative_to(here)
        except ValueError:
            continue
        if other.parent == here:
            continue
        # Nearest ancestor wins: skip if some other CORE doc sits in between.
        between = [
            d for d in all_docs
            if d not in (doc, other)
            and _is_under(other.parent, d.parent)
            and _is_under(d.parent, here)
            and d.parent != here
        ]
        if not between:
            out.append(other)
    return sorted(out, key=lambda p: str(p))


def _is_under(child: Path, parent: Path) -> bool:
    try:
        child.relative_to(parent)
        return True
    except ValueError:
        return False


def cmd_index(args) -> int:
    root = Path(args.root).resolve()
    docs = core_docs(root)
    if not docs:
        print("no CORE docs found")
        return 0

    changed = 0
    for doc in docs:
        kids = direct_children(doc, docs)
        if kids:
            lines = []
            for k in kids:
                rel = os.path.relpath(k.parent, doc.parent)
                p = purpose_of(k)
                lines.append(f"- `{rel}/` — {p}" if p else f"- `{rel}/`")
            body = "\n".join(lines)
        else:
            body = "_No child CORE docs. This directory is a leaf boundary._"

        text = read(doc)
        m = re.search(
            re.escape(INDEX_HEADING) + r"\s*\n(.*?)(?=\n## |\n" + re.escape(END) + r"|\Z)",
            text,
            re.DOTALL,
        )
        if not m:
            continue
        new_section = f"{INDEX_HEADING}\n\n{body}\n"
        new = text[: m.start()] + new_section + text[m.end():]
        if new != text:
            doc.write_text(new, encoding="utf-8")
            changed += 1
            print(f"{os.path.relpath(doc, root)}: index updated ({len(kids)} child(ren))")

    print(f"index: {len(docs)} CORE doc(s), {changed} updated")
    return 0


# --------------------------------------------------------------------------
# boundaries: where a CORE doc would earn its keep
# --------------------------------------------------------------------------

def cmd_boundaries(args) -> int:
    """Directories that look like durable boundaries and have no CORE doc yet.

    Deliberately mechanical: a directory qualifies because it owns a build
    manifest or because it holds enough code to be a real area, not because
    anything inferred meaning from it. The model decides which of these are
    worth documenting -- this just stops it from having to crawl the tree to
    find the candidates.
    """
    root = Path(args.root).resolve()
    have = {d.parent for d in core_docs(root)}
    hits = []

    for dirpath, _dirnames, filenames in walk(root):
        if dirpath == root or dirpath in have:
            continue
        names = set(filenames)
        code_here = sum(1 for f in filenames if Path(f).suffix in CODE_EXT)
        code_total = 0
        for sub, _sd, sf in walk(dirpath):
            code_total += sum(1 for f in sf if Path(f).suffix in CODE_EXT)

        depth = len(dirpath.relative_to(root).parts)
        reason = ""
        if names & MANIFESTS:
            reason = "own manifest (" + ", ".join(sorted(names & MANIFESTS)) + ")"
        elif depth <= args.max_depth and code_total >= args.min_files:
            reason = f"{code_total} code files"

        if reason:
            hits.append((code_total, dirpath.relative_to(root), reason, code_here))

    hits.sort(key=lambda h: -h[0])
    for _total, rel, reason, _here in hits[: args.limit]:
        print(f"{rel}/\t{reason}")
    if not hits:
        print("(none)")
    return 0


# --------------------------------------------------------------------------
# check: health as key=value, for status.sh
# --------------------------------------------------------------------------

def cmd_check(args) -> int:
    root = Path(args.root).resolve()
    docs = core_docs(root)
    ok = broken = reversed_ = missing = 0
    conflicts = []

    for doc in docs:
        d = doc.parent
        agents = d / "AGENTS.md"
        cs, as_ = state(d / "CLAUDE.md"), state(agents)
        if cs == "symlink":
            reversed_ += 1
            continue
        if as_ == "absent":
            missing += 1
        elif as_ == "dangling":
            broken += 1
        elif as_ == "symlink":
            if link_target(agents) in ("CLAUDE.md", "./CLAUDE.md"):
                ok += 1
            else:
                conflicts.append(str(d.relative_to(root)))
        elif as_ == "file":
            content = read(agents).strip()
            if content == "@CLAUDE.md":
                ok += 1  # Windows import-stub fallback
            else:
                conflicts.append(str(d.relative_to(root)))

    root_doc = root / "CLAUDE.md"
    has_root = root_doc.exists() and BEGIN in read(root_doc)

    print(f"core_root={'present' if has_root else 'absent'}")
    print(f"core_docs={len(docs)}")
    print(f"symlink_ok={ok}")
    print(f"symlink_missing={missing}")
    print(f"symlink_broken={broken}")
    print(f"symlink_reversed={reversed_}")
    print("core_conflicts=" + (",".join(conflicts) if conflicts else "none"))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(prog="core.py", description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("link", help="ensure CLAUDE.md real + AGENTS.md symlink")
    p.add_argument("dirs", nargs="+")
    p.add_argument("--content-file", help="seed a new CLAUDE.md from this file")
    p.add_argument("--flip", action="store_true",
                   help="invert an existing CLAUDE.md -> AGENTS.md link")
    p.set_defaults(func=cmd_link)

    p = sub.add_parser("block", help="insert or replace the CORE marker block")
    p.add_argument("file")
    p.add_argument("--source", required=True, help="file holding the block body")
    p.set_defaults(func=cmd_block)

    p = sub.add_parser("index", help="regenerate every Child CORE Index")
    p.add_argument("--root", default=".")
    p.set_defaults(func=cmd_index)

    p = sub.add_parser("boundaries", help="candidate directories with no CORE doc")
    p.add_argument("--root", default=".")
    p.add_argument("--min-files", type=int, default=8)
    p.add_argument("--max-depth", type=int, default=3)
    p.add_argument("--limit", type=int, default=15)
    p.set_defaults(func=cmd_boundaries)

    p = sub.add_parser("check", help="emit key=value health lines")
    p.add_argument("--root", default=".")
    p.set_defaults(func=cmd_check)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
