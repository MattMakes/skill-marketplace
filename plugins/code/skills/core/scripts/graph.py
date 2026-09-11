#!/usr/bin/env python3
"""Local, content-validated Graphify snapshots. Python 3.9+, macOS/Linux.

Only this gateway's results carry a freshness check. Legacy graphify-out files
and direct Graphify/MCP/database readers are outside this contract.
"""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
import time

READ_COMMANDS = {"query", "explain", "path", "affected", "god-nodes"}
HOOKS = ("post-commit", "post-checkout", "post-merge", "post-rewrite")
MARKER = "# CORE graph freshness gateway v1"
EXCLUDED = {".git", "graphify-out", ".core-graph", "__pycache__"}


class GraphError(Exception):
    pass


class Changed(GraphError):
    pass


def run(args, cwd, timeout=300):
    result = subprocess.run(args, cwd=cwd, capture_output=True, timeout=timeout)
    if result.returncode:
        raise GraphError(f"{args[0]} {args[1]} failed ({result.returncode}): "
                         + result.stderr.decode(errors="replace")[-2000:])
    return result


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=True).encode()


def atomic_json(path, value):
    fd, name = tempfile.mkstemp(prefix=".write-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(encoded(value))
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def git(root, *args):
    return run(["git", "-C", str(root), *args], root).stdout


class Mirror:
    def __init__(self, root):
        self.root = Path(root).resolve(strict=True)
        probe = subprocess.run(["git", "-C", str(self.root), "rev-parse", "--show-toplevel"],
                               capture_output=True)
        self.is_git = probe.returncode == 0
        if self.is_git:
            self.root = Path(os.fsdecode(probe.stdout).strip()).resolve()
            location = os.fsdecode(git(self.root, "rev-parse", "--git-path", "core-graph")).strip()
            self.state = (self.root / location).resolve()
        else:
            self.state = self.root / ".core-graph"
        self.current = self.state / "current.json"

    @contextmanager
    def locked(self):
        try:
            import fcntl
        except ImportError:
            raise GraphError("CORE graph requires macOS/Linux file locking") from None
        self.state.mkdir(parents=True, exist_ok=True)
        with (self.state / "lock").open("a+b") as lock:
            deadline = time.monotonic() + 30
            while True:
                try:
                    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise GraphError("graph busy: timed out waiting for its lock")
                    time.sleep(.05)
            try:
                yield
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)

    def paths(self):
        if self.is_git:
            names = {os.fsdecode(p) for p in git(self.root, "ls-files", "-z", "--cached",
                                                "--others", "--exclude-standard").split(b"\0") if p}
        else:
            names = set()
            for folder, dirs, files in os.walk(self.root, followlinks=False):
                dirs[:] = [d for d in dirs if d not in EXCLUDED
                           and not (Path(folder) / d).is_symlink()]
                names.update(str((Path(folder) / f).relative_to(self.root)) for f in files)
        return sorted(n for n in names if not EXCLUDED.intersection(Path(n).parts)
                      and not n.startswith(".claude/core/"))

    def scan(self, destination=None):
        """Hash bytes, never just mtimes; copy those same bytes for extraction."""
        files, observations = {}, {}
        for name in self.paths():
            path = self.root / name
            try:
                before = path.lstat()
            except FileNotFoundError:
                # A tracked deletion is normal and must remove its old graph nodes.
                continue
            if stat.S_ISDIR(before.st_mode):
                raise GraphError(f"submodule/directory entry needs its own index: {name}")
            if stat.S_ISLNK(before.st_mode):
                # Links are fingerprinted but not followed outside the regular-file corpus.
                files[name] = {"link": os.readlink(path)}
                continue
            if not stat.S_ISREG(before.st_mode):
                raise GraphError(f"not a regular source file: {name}")
            signature = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns, s.st_ctime_ns)
            target = destination / name if destination else None
            if target:
                target.parent.mkdir(parents=True, exist_ok=True)
            h = hashlib.sha256()
            with path.open("rb") as source:
                out = target.open("wb") if target else None
                try:
                    for chunk in iter(lambda: source.read(1024 * 1024), b""):
                        h.update(chunk)
                        if out:
                            out.write(chunk)
                finally:
                    if out:
                        out.close()
                after = os.fstat(source.fileno())
            if signature(before) != signature(after) or signature(after) != signature(path.lstat()):
                raise Changed("repository changed while reading " + name)
            files[name] = {"sha256": h.hexdigest()}
            observations[name] = signature(after)
        return {"files": files, "digest": digest(encoded(files))}, observations

    def backend(self):
        binary = shutil.which("graphify")
        local = Path.home() / ".local/bin/graphify"
        if not binary and local.is_file() and os.access(local, os.X_OK):
            binary = str(local)
        if not binary:
            raise GraphError("graphify missing; run graph.sh to install the tested version")
        version = run([binary, "--version"], self.root, 20).stdout.decode().strip()
        identity = {"version": version, "binary": str(Path(binary).resolve()),
                    "launcher": digest(Path(binary).read_bytes()),
                    "gateway": digest(Path(__file__).read_bytes())}
        return binary, identity

    def load(self):
        try:
            value = json.loads(self.current.read_text())
            generation = value["generation"]
            if not re.fullmatch(r"generation-[a-zA-Z0-9_-]+", generation):
                return None
            graph = self.state / generation / "tree/graphify-out/graph.json"
            if digest(graph.read_bytes()) != value["graph_sha256"]:
                return None
            return value
        except (OSError, ValueError, KeyError, TypeError):
            return None

    def matches(self, current, snapshot, identity):
        return (current is not None and current.get("root") == str(self.root)
                and current.get("digest") == snapshot["digest"]
                and current.get("backend") == identity)

    def sync(self, binary, identity):
        for attempt in range(3):
            generation = None
            published = False
            try:
                snapshot, _ = self.scan()
                current = self.load()
                if self.matches(current, snapshot, identity):
                    return current
                generation = Path(tempfile.mkdtemp(prefix="generation-", dir=self.state))
                tree = generation / "tree"
                tree.mkdir()
                snapshot, _ = self.scan(tree)
                # Fresh extraction prevents old deleted nodes, shrink guards and stale
                # cross-file edges surviving an incremental merge. Never call an LLM.
                run([binary, "extract", str(tree), "--code-only", "--no-cluster",
                     "--no-gitignore", "--force"], tree)
                graph = tree / "graphify-out/graph.json"
                data = json.loads(graph.read_bytes())
                if not isinstance(data.get("nodes"), list) or not isinstance(
                        data.get("edges", data.get("links")), list):
                    raise GraphError("extractor returned an invalid graph")
                now, _ = self.scan()
                if now != snapshot:
                    raise Changed("repository changed during graph build")
                current = {**snapshot, "root": str(self.root), "backend": identity,
                           "generation": generation.name, "graph_sha256": digest(graph.read_bytes()),
                           "nodes": len(data["nodes"]),
                           "edges": len(data.get("edges", data.get("links", [])))}
                atomic_json(self.current, current)
                published = True
                # All gateway readers hold the same lock, so none can still use these.
                for old in self.state.glob("generation-*"):
                    if old != generation and old.is_dir():
                        shutil.rmtree(old)
                return current
            except (FileNotFoundError, Changed) as error:
                if attempt == 2:
                    raise Changed(f"repository changed or extraction incomplete; retry later: {error}")
            finally:
                if generation and not published:
                    shutil.rmtree(generation, ignore_errors=True)
        raise GraphError("could not build graph")

    def query(self, args, binary, identity):
        if any(a == "--graph" or a.startswith("--graph=") for a in args):
            raise GraphError("--graph is managed by the freshness gateway")
        current = self.sync(binary, identity)
        before, observed = self.scan()
        if not self.matches(current, before, identity):
            raise Changed("repository changed before query; retry")
        tree = self.state / current["generation"] / "tree"
        result = run([binary, *args, "--graph", str(tree / "graphify-out/graph.json")], tree)
        after, observed_after = self.scan()
        if after != before or observed != observed_after or self.load() != current:
            raise Changed("repository changed during query; answer discarded, retry")
        # No backend stdout/stderr reaches the caller until the final validation.
        sys.stderr.write(f"core-graph snapshot={current['digest']} nodes={current['nodes']}\n")
        sys.stdout.buffer.write(result.stdout)
        sys.stderr.buffer.write(result.stderr)

    def status(self, identity):
        snapshot, _ = self.scan()
        current = self.load()
        fresh = self.matches(current, snapshot, identity)
        old_files = current.get("files", {}) if current else {}
        new_files = snapshot["files"]
        value = {"state": "fresh" if fresh else ("stale" if current else "missing-or-invalid"),
                 "snapshot": snapshot["digest"],
                 "added": len(new_files.keys() - old_files.keys()),
                 "removed": len(old_files.keys() - new_files.keys()),
                 "modified": sum(old_files[n] != new_files[n] for n in old_files.keys() & new_files.keys())}
        print(json.dumps(value))
        return 0 if fresh else 1

    def install_hooks(self):
        if not self.is_git:
            raise GraphError("git hook installation requires a Git repository; use watch otherwise")
        script = self.root / ".claude/core/graph.py"
        if not script.is_file():
            raise GraphError("run graph.sh first to vendor .claude/core/graph.py")
        location = os.fsdecode(git(self.root, "rev-parse", "--git-path", "hooks")).strip()
        hookdir = (self.root / location).resolve()
        hookdir.mkdir(parents=True, exist_ok=True)
        originals = {}
        # Validate all hooks before changing any. Keep non-shell hooks intact:
        # wrapping arbitrary interpreters without changing $0 is not portable.
        for name in HOOKS:
            path = hookdir / name
            if path.exists() or path.is_symlink():
                original = path.read_text()
                if MARKER in original:
                    continue
                first = original.splitlines()[0] if original else ""
                if not re.fullmatch(r"#!.*\b(?:sh|bash|dash|zsh|ksh)(?:\s+.*)?", first):
                    raise GraphError(f"cannot wrap non-shell hook {path}; use --no-hooks and watch")
                previous = hookdir / (name + ".core-previous")
                if previous.exists() or previous.is_symlink():
                    raise GraphError(f"existing hook backup needs review: {previous}")
                originals[name] = original
        for name in HOOKS:
            path = hookdir / name
            previous = hookdir / (name + ".core-previous")
            if path.is_file() and MARKER in path.read_text(errors="replace"):
                continue
            original = originals.get(name, "#!/bin/sh\n")
            if name in originals:
                shutil.copy2(path, previous)
            first, _, code = original.partition("\n")
            if not code.strip():
                code = ":"
            # Resolve root at execution time: hooks may be shared by linked worktrees.
            # Inline the original body in a subshell, preserving its interpreter,
            # $0, directory and arguments (including Husky's basename dispatch).
            body = f'''{first}
{MARKER}
(
{code}
)
result=$?
root=$(git rev-parse --show-toplevel) || exit "$result"
if [ -f "$root/.claude/core/graph.py" ]; then
  python3 "$root/.claude/core/graph.py" --root "$root" sync >&2 || echo "CORE graph refresh failed; queries will recheck freshness." >&2
fi
exit "$result"
'''
            # Replace a symlink rather than following it into a shared hook target.
            fd, staging = tempfile.mkstemp(prefix=".core-hook-", dir=hookdir)
            with os.fdopen(fd, "w") as out:
                out.write(body)
            os.replace(staging, path)
            path.chmod(0o755)
        settings = self.root / ".claude/settings.json"
        config = json.loads(settings.read_text()) if settings.exists() else {}
        hooks = config.setdefault("hooks", {})
        # The command finds the vendored script through Claude's project root.
        command = 'python3 "$CLAUDE_PROJECT_DIR/.claude/core/graph.py" --root "$CLAUDE_PROJECT_DIR"'
        for event, matcher, action in (("SessionStart", None, "sync"),
                                       ("PostToolUse", "Write|Edit|MultiEdit|Bash", "sync"),
                                       ("PreToolUse", "Bash|Read|Grep|Glob", "guard")):
            entries = hooks.setdefault(event, [])
            if not any(".claude/core/graph.py" in str(entry) for entry in entries):
                entry = {"hooks": [{"type": "command", "command": command + " " + action,
                                    "timeout": 360}]}
                if matcher:
                    entry["matcher"] = matcher
                entries.append(entry)
        atomic_json(settings, config)
        print("git_hooks=installed claude_hooks=installed")


def guard():
    payload = json.load(sys.stdin)
    inputs = payload.get("tool_input", {})
    # Recognize ordinary shell commands without blocking mentions of Graphify
    # in questions or commit messages. This is not a shell security boundary.
    bypass = False
    command = inputs.get("command")
    if isinstance(command, str):
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        at_command = True
        for token in lexer:
            if token and set(token) <= set(";&|()"):
                at_command = True
            elif at_command:
                if token in {"env", "command", "exec"} or token.startswith("-") or "=" in token:
                    continue
                bypass |= Path(token).name == "graphify"
                at_command = False
            if "graphify-out/" in token or re.search(r"core-graph/.*generation-", token):
                bypass = True
    else:
        paths = (inputs.get("file_path", ""), inputs.get("path", ""), inputs.get("pattern", ""))
        bypass = any("graphify-out" in str(p) or "core-graph" in str(p) for p in paths)
    if bypass:
        raise GraphError("Use python3 .claude/core/graph.py query/explain/path/affected/god-nodes; "
                         "direct graph reads bypass freshness validation")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=".")
    parser.add_argument("command", choices=sorted(READ_COMMANDS | {"sync", "status", "watch", "install-hooks", "guard"}))
    parser.add_argument("args", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if args.command == "guard":
        guard()
        return 0
    mirror = Mirror(args.root)
    if args.command == "watch":
        watch = argparse.ArgumentParser()
        watch.add_argument("--interval", type=float, default=2)
        interval = watch.parse_args(args.args).interval
        if interval <= 0:
            raise GraphError("watch interval must be positive")
        while True:
            try:
                with mirror.locked():
                    mirror.sync(*mirror.backend())
            except (GraphError, OSError, ValueError, subprocess.TimeoutExpired) as error:
                print(f"core-graph: {error}", file=sys.stderr)
            time.sleep(interval)
    with mirror.locked():
        if args.command == "install-hooks":
            mirror.install_hooks()
            return 0
        binary, identity = mirror.backend()
        if args.command in READ_COMMANDS:
            mirror.query([args.command, *args.args], binary, identity)
        elif args.command == "status":
            return mirror.status(identity)
        else:
            if args.args:
                raise GraphError("sync takes no extra arguments")
            current = mirror.sync(binary, identity)
            print(f"graph=fresh snapshot={current['digest']} nodes={current['nodes']} edges={current['edges']}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except (GraphError, OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(f"core-graph: {error}", file=sys.stderr)
        sys.exit(2)
