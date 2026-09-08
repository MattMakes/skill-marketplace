#!/usr/bin/env python3
"""herdr-setup - check, and only then fix, what the herdr plugin needs on this machine.

Version: 1.1.0  (ships with the herdr plugin; bump together)

Default mode is --check: read-only, prints one row per component, exits 0 when
nothing is missing and 1 when there is at least one gap. --apply fixes ONLY the
rows that --check flagged as gaps, then re-checks. Every fix is idempotent, so
running --apply twice is a no-op the second time.

Two things are never done without an explicit flag:
  --install-herdr        run the herdr installer (brew, else curl | sh)
  --prune-loose-skills   remove herdr-* SYMLINKS in ~/.claude/skills that point
                         somewhere other than this plugin (never real dirs)

Overrides honoured: HORCH_BIN_DIR (default ~/.local/bin), CLAUDE_SKILLS_DIR
(default ~/.claude/skills), HERDR_BIN_PATH, CLAUDE_PLUGIN_ROOT.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

SETUP_VERSION = "1.1.0"
MIN_HERDR_VERSION = (0, 8, 2)      # keep in sync with herdr-atomic/_lib.sh
ENGINES = ("claude", "codex", "pi")
SKILLS = ("herdr-orchestrator", "herdr-worker", "herdr-atomic", "herdr-setup")

HERE = Path(__file__).resolve().parent
PLUGIN_ROOT = Path(os.environ.get("CLAUDE_PLUGIN_ROOT") or HERE.parent.parent.parent).resolve()
SKILLS_ROOT = PLUGIN_ROOT / "skills"
HORCH_SRC = SKILLS_ROOT / "herdr-orchestrator" / "scripts" / "horch"
BIN_DIR = Path(os.environ.get("HORCH_BIN_DIR") or Path.home() / ".local" / "bin").expanduser()
SKILLS_DIR = Path(os.environ.get("CLAUDE_SKILLS_DIR") or Path.home() / ".claude" / "skills").expanduser()
def _find_herdr() -> str | None:
    for cand in (os.environ.get("HERDR_BIN_PATH"), shutil.which("herdr"),
                 str(Path.home() / ".local" / "bin" / "herdr")):
        if cand and os.access(cand, os.X_OK) and Path(cand).is_file():
            return cand
    return None


HERDR = _find_herdr()


def plugin_mode() -> bool:
    """True when this copy lives in Claude Code's plugin cache: skills already
    resolve as herdr:<skill>, so nothing must be linked into ~/.claude/skills."""
    return "/.claude/plugins/" in str(PLUGIN_ROOT) or bool(os.environ.get("CLAUDE_PLUGIN_ROOT"))


# ------------------------------------------------------------------ model

OK, GAP, WARN, INFO = "ok", "gap", "warn", "info"


@dataclass
class Row:
    component: str
    state: str
    detail: str
    fix: str = ""                 # human-readable fix
    apply: object = None          # callable that performs the fix, or None
    needs_flag: str = ""          # flag that must be present before apply runs


@dataclass
class Report:
    rows: list = field(default_factory=list)

    def add(self, *a, **k):
        self.rows.append(Row(*a, **k))

    @property
    def gaps(self):
        return [r for r in self.rows if r.state == GAP]


# -------------------------------------------------------------- helpers

def run(cmd, **kw) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, **kw)
    except OSError as e:
        return subprocess.CompletedProcess(cmd, 127, "", str(e))


def herdr_version() -> tuple | None:
    if not HERDR:
        return None
    out = run([HERDR, "--version"]).stdout.strip()
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", out)
    return tuple(int(x) for x in m.groups()) if m else None


def vstr(v) -> str:
    return ".".join(map(str, v)) if v else "?"


def on_path(d: Path) -> bool:
    return str(d) in [p for p in os.environ.get("PATH", "").split(os.pathsep) if p]


def link_state(link: Path, target: Path) -> str:
    """missing | dangling | elsewhere | notlink | ok"""
    if not link.exists() and not link.is_symlink():
        return "missing"
    if link.is_symlink() and not link.exists():
        return "dangling"
    if not link.is_symlink():
        return "notlink"
    return "ok" if link.resolve() == target.resolve() else "elsewhere"


def relink(link: Path, target: Path):
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.is_symlink() or link.exists():
        if link.is_dir() and not link.is_symlink():
            raise RuntimeError(f"{link} is a real directory, refusing to replace it")
        link.unlink()
    link.symlink_to(target)


def integration_status() -> dict:
    """{'claude': True/False, ...} from `herdr integration status`."""
    if not HERDR:
        return {}
    out = run([HERDR, "integration", "status"]).stdout
    st = {}
    for line in out.splitlines():
        m = re.match(r"\s*([a-z0-9-]+):\s*(not installed|installed)", line)
        if m:
            st[m.group(1)] = m.group(2) == "installed"
    return st


def server_running() -> bool:
    if not HERDR:
        return False
    return "status: running" in run([HERDR, "status", "server"]).stdout


# --------------------------------------------------------------- checks

def install_herdr():
    if shutil.which("brew"):
        subprocess.run(["brew", "install", "herdr"], check=True)
    else:
        subprocess.run("curl -fsSL https://herdr.dev/install.sh | sh", shell=True, check=True)


def check(args) -> Report:
    rep = Report()

    # herdr itself
    ver = herdr_version()
    if not HERDR:
        rep.add("herdr", GAP, "not on PATH",
                "brew install herdr   (or: curl -fsSL https://herdr.dev/install.sh | sh)",
                apply=install_herdr, needs_flag="--install-herdr")
    elif not ver or ver < MIN_HERDR_VERSION:
        rep.add("herdr", GAP, f"{vstr(ver)} at {HERDR}, need >= {vstr(MIN_HERDR_VERSION)}",
                "herdr update", apply=lambda: subprocess.run([HERDR, "update"], check=True))
    else:
        rep.add("herdr", OK, f"{vstr(ver)} at {HERDR}")

    # tools the atomic scripts need
    for tool in ("jq", "python3"):
        p = shutil.which(tool)
        rep.add(tool, OK if p else GAP, p or "missing (herdr-atomic scripts need it)",
                "" if p else f"brew install {tool}")

    # horch on PATH, pointing at THIS plugin's copy
    link = BIN_DIR / "horch"
    st = link_state(link, HORCH_SRC)
    fix = lambda: relink(link, HORCH_SRC)  # noqa: E731
    if st == "ok":
        rep.add("horch link", OK, f"{link} -> {HORCH_SRC}")
    elif st == "missing":
        rep.add("horch link", GAP, f"{link} does not exist", f"ln -s {HORCH_SRC} {link}", apply=fix)
    elif st == "dangling":
        rep.add("horch link", GAP,
                f"{link} -> {os.readlink(link)} (dangling; a plugin update moves the "
                f"cache path, so relink after every `claude plugin update herdr`)",
                f"relink -> {HORCH_SRC}", apply=fix)
    elif st == "elsewhere":
        rep.add("horch link", GAP,
                f"{link} -> {link.resolve()} (a different copy, not this plugin)",
                f"relink -> {HORCH_SRC}", apply=fix)
    else:
        rep.add("horch link", WARN, f"{link} is a real file, not a symlink; leaving it alone",
                f"move it aside, then: ln -s {HORCH_SRC} {link}")
    if not on_path(BIN_DIR):
        rep.add("PATH", WARN, f"{BIN_DIR} is not on PATH; spawned workers will not find horch",
                f'add to your shell rc:  export PATH="{BIN_DIR}:$PATH"')
    else:
        rep.add("PATH", OK, f"{BIN_DIR} is on PATH")
    which = shutil.which("horch")
    if which and Path(which).resolve() != HORCH_SRC.resolve() and Path(which) != link:
        rep.add("horch shadow", WARN, f"`horch` on PATH resolves to {which}, ahead of {link}",
                "remove or reorder that entry")

    # engines (informational) and their herdr integrations (gap when engine exists)
    integ = integration_status()
    for eng in ENGINES:
        p = shutil.which(eng)
        if not p:
            rep.add(f"engine {eng}", INFO, "not installed - that tier is unavailable")
            continue
        rep.add(f"engine {eng}", OK, p)
        if HERDR:
            if integ.get(eng):
                rep.add(f"integration {eng}", OK, "installed (native session ids for --resume)")
            else:
                rep.add(f"integration {eng}", GAP,
                        "not installed - `horch spawn --resume` cannot restore this engine",
                        f"herdr integration install {eng}",
                        apply=lambda e=eng: subprocess.run([HERDR, "integration", "install", e], check=True))

    # skills: plugin mode = namespaced herdr:<skill>, loose links are a conflict;
    # cloned-repo mode = link them so Skill(herdr-*) resolves in fresh workers.
    if plugin_mode():
        rep.add("skills", OK, f"plugin install at {PLUGIN_ROOT}; skills resolve as herdr:<skill>")
        for name in SKILLS:
            loose = SKILLS_DIR / name
            if not loose.exists() and not loose.is_symlink():
                continue
            s = link_state(loose, SKILLS_ROOT / name)
            if s == "ok":
                rep.add(f"loose skill {name}", WARN, f"{loose} duplicates the plugin skill",
                        "remove it (--prune-loose-skills)", apply=lambda l=loose: l.unlink(),
                        needs_flag="--prune-loose-skills")
            elif s in ("dangling", "elsewhere"):
                tgt = os.readlink(loose)
                rep.add(f"loose skill {name}", WARN,
                        f"{loose} -> {tgt} ({s}); shadows/duplicates herdr:{name}",
                        "remove it (--prune-loose-skills)", apply=lambda l=loose: l.unlink(),
                        needs_flag="--prune-loose-skills")
            else:
                rep.add(f"loose skill {name}", WARN, f"{loose} is a real directory; move it aside by hand")
    else:
        for name in SKILLS:
            src = SKILLS_ROOT / name
            if not src.is_dir():
                continue
            loose = SKILLS_DIR / name
            s = link_state(loose, src)
            if s == "ok":
                rep.add(f"skill {name}", OK, f"{loose} -> {src}")
            elif s == "notlink":
                rep.add(f"skill {name}", WARN, f"{loose} is a real directory; move it aside by hand")
            else:
                rep.add(f"skill {name}", GAP, f"{loose}: {s}", f"ln -sfn {src} {loose}",
                        apply=lambda l=loose, t=src: relink(l, t))

    rep.add("herdr server", INFO, "running" if server_running() else "not running (horch starts it on launch)")
    return rep


# --------------------------------------------------------------- output

def print_report(rep: Report, mode: str):
    print(f"herdr-setup {SETUP_VERSION}  [{mode}]  plugin root: {PLUGIN_ROOT}"
          f"  ({'plugin' if plugin_mode() else 'cloned-repo'} mode)\n")
    w = max(len(r.component) for r in rep.rows)
    for r in rep.rows:
        print(f"  {r.state.upper():<4} {r.component:<{w}}  {r.detail}")
        if r.fix and r.state in (GAP, WARN):
            print(f"       {'':<{w}}  fix: {r.fix}")
    gaps = len(rep.gaps)
    warns = sum(1 for r in rep.rows if r.state == WARN)
    print(f"\n  {gaps} gap(s), {warns} warning(s)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--check", action="store_true", help="read-only report (default)")
    g.add_argument("--apply", action="store_true", help="fix only the gaps the check finds, then re-check")
    ap.add_argument("--install-herdr", action="store_true", help="allow --apply to run the herdr installer")
    ap.add_argument("--prune-loose-skills", action="store_true",
                    help="allow --apply to remove herdr-* symlinks in the skills dir that shadow the plugin")
    ap.add_argument("--json", action="store_true", help="machine-readable output")
    ap.add_argument("--version", action="version", version=f"herdr-setup {SETUP_VERSION}")
    args = ap.parse_args()
    flags = {f for f in ("--install-herdr", "--prune-loose-skills") if getattr(args, f[2:].replace("-", "_"))}

    rep = check(args)
    if args.apply:
        candidates = [r for r in rep.rows if r.apply and (r.state == GAP or r.needs_flag)]
        skipped = [r for r in candidates if r.needs_flag and r.needs_flag not in flags]
        todo = [r for r in candidates if r not in skipped]
        if not todo and not skipped:
            print("nothing to apply: no gaps found\n")
        for r in todo:
            print(f"  applying: {r.component}: {r.fix}")
            try:
                r.apply()
            except Exception as e:  # keep going; the re-check shows what is left
                print(f"    FAILED: {e}")
        for r in skipped:
            print(f"  skipped:  {r.component} (pass {r.needs_flag} to allow it)")
        print()
        rep = check(args)

    if args.json:
        print(json.dumps({"version": SETUP_VERSION, "plugin_root": str(PLUGIN_ROOT),
                          "plugin_mode": plugin_mode(),
                          "rows": [{"component": r.component, "state": r.state,
                                    "detail": r.detail, "fix": r.fix} for r in rep.rows]}, indent=2))
    else:
        print_report(rep, "apply" if args.apply else "check")
    sys.exit(1 if rep.gaps else 0)


if __name__ == "__main__":
    main()
