"""Black-box freshness tests; the fake backend makes edit races reproducible."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import unittest

SCRIPT = Path(__file__).with_name("graph.py")
FAKE = r'''#!/usr/bin/env python3
import json, os, pathlib, sys, time
args = sys.argv[1:]
if args == ["--version"]:
    print("graphify test-1")
elif args[0] == "extract":
    root = pathlib.Path(args[1])
    log = pathlib.Path(os.environ["BUILD_LOG"])
    with log.open("a") as f: f.write("build\n")
    if os.environ.get("FAIL_BUILD"): sys.exit(9)
    if os.environ.get("EDIT_BUILD"):
        pathlib.Path(os.environ["EDIT_BUILD"]).write_text("def after(): pass\n")
    if os.environ.get("SLOW_BUILD"): time.sleep(.2)
    out = root / "graphify-out"
    out.mkdir(exist_ok=True)
    nodes = [{"id": str(p.relative_to(root)), "label": p.read_text(),
              "source_file": str(p.relative_to(root))} for p in sorted(root.rglob("*.py"))]
    (out / "graph.json").write_text(json.dumps({"nodes": nodes, "edges": []}))
elif args[0] in ("query", "explain", "path", "affected", "god-nodes"):
    graph = pathlib.Path(args[args.index("--graph") + 1])
    print(graph.read_text())
    if os.environ.get("EDIT_QUERY"):
        pathlib.Path(os.environ["EDIT_QUERY"]).write_text("def during_query(): pass\n")
else:
    sys.exit(2)
'''


class GraphTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="core-graph-test-")
        self.base = Path(self.tmp.name)
        self.root = self.base / "repo with spaces"
        self.root.mkdir()
        self.git("init", "-q")
        self.git("config", "user.email", "test@example.invalid")
        self.git("config", "user.name", "Test")
        self.source = self.root / "main.py"
        self.source.write_text("def before(): pass\n")
        self.git("add", ".")
        self.git("commit", "-qm", "initial")
        backend = self.base / "graphify"
        backend.write_text(FAKE)
        backend.chmod(0o755)
        self.env = {**os.environ, "PATH": str(self.base) + os.pathsep + os.environ["PATH"],
                    "BUILD_LOG": str(self.base / "builds")}

    def tearDown(self):
        self.tmp.cleanup()

    def git(self, *args):
        return subprocess.run(["git", "-C", str(self.root), *args], check=True,
                              capture_output=True, text=True).stdout.strip()

    def run_graph(self, *args, ok=True, env=None):
        result = subprocess.run([sys.executable, str(SCRIPT), "--root", str(self.root), *args],
                                env=env or self.env, capture_output=True, text=True, timeout=20)
        if ok:
            self.assertEqual(result.returncode, 0, result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout)
        return result

    def test_query_builds_and_unchanged_query_reuses_generation(self):
        self.assertIn("before", self.run_graph("query", "main").stdout)
        self.run_graph("query", "main")
        self.assertEqual((self.base / "builds").read_text(), "build\n")

    def test_same_size_edit_with_restored_mtime_is_stale(self):
        self.run_graph("sync")
        old = self.source.stat()
        self.source.write_text("def newer_(): pass\n")
        os.utime(self.source, ns=(old.st_atime_ns, old.st_mtime_ns))
        status = self.run_graph("status", ok=False)
        self.assertEqual(json.loads(status.stdout)["state"], "stale")
        output = self.run_graph("query", "main").stdout
        self.assertIn("newer_", output)
        self.assertNotIn("before", output)

    def test_add_delete_rename_and_ignored_files(self):
        self.run_graph("sync")
        self.source.rename(self.root / "renamed.py")
        (self.root / "new\nfile.py").write_text("def added(): pass\n")
        (self.root / ".gitignore").write_text("ignored.py\n")
        (self.root / "ignored.py").write_text("secret")
        output = self.run_graph("query", "all").stdout
        self.assertNotIn('"id": "main.py"', output)
        self.assertIn("added", output)
        self.assertNotIn("secret", output)
        (self.root / "renamed.py").unlink()
        (self.root / "new\nfile.py").unlink()
        self.assertEqual(json.loads(self.run_graph("query", "all").stdout)["nodes"], [])

    def test_failed_build_never_returns_old_results(self):
        self.run_graph("sync")
        self.source.write_text("def newer(): pass\n")
        result = self.run_graph("query", "all", ok=False, env={**self.env, "FAIL_BUILD": "1"})
        self.assertEqual(result.stdout, "")
        self.run_graph("status", ok=False)
        self.assertIn("newer", self.run_graph("query", "all").stdout)

    def test_edit_during_build_retries_from_new_snapshot(self):
        result = self.run_graph("query", "all", env={**self.env, "EDIT_BUILD": str(self.source)})
        self.assertIn("after", result.stdout)
        self.assertNotIn("before", result.stdout)

    def test_edit_during_query_discards_buffered_answer(self):
        result = self.run_graph("query", "all", ok=False,
                                env={**self.env, "EDIT_QUERY": str(self.source)})
        self.assertEqual(result.stdout, "")
        self.assertIn("changed", result.stderr)

    def test_concurrent_queries_share_one_build(self):
        command = [sys.executable, str(SCRIPT), "--root", str(self.root), "query", "all"]
        env = {**self.env, "SLOW_BUILD": "1"}
        a = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        b = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        for process in (a, b):
            out, err = process.communicate(timeout=20)
            self.assertEqual(process.returncode, 0, err)
            self.assertIn(b"before", out)
        self.assertEqual((self.base / "builds").read_text(), "build\n")

    def test_rejects_alternate_graph(self):
        result = self.run_graph("query", "all", "--graph=/tmp/old.json", ok=False)
        self.assertEqual(result.stdout, "")

    def test_legacy_graph_is_not_trusted(self):
        out = self.root / "graphify-out"
        out.mkdir()
        (out / "graph.json").write_text('{"nodes": [{"label": "STALE"}], "edges": []}')
        self.run_graph("status", ok=False)
        self.assertNotIn("STALE", self.run_graph("query", "all").stdout)

    def test_worktrees_have_separate_indexes(self):
        self.run_graph("sync")
        other = self.base / "worktree"
        self.git("worktree", "add", "-qb", "other", str(other))
        self.root = other
        (other / "main.py").write_text("def worktree(): pass\n")
        self.assertIn("worktree", self.run_graph("query", "all").stdout)
        self.assertEqual((self.base / "builds").read_text(), "build\nbuild\n")

    def test_hooks_preserve_existing_hook_and_are_idempotent(self):
        core = self.root / ".claude/core"
        core.mkdir(parents=True)
        shutil.copy2(SCRIPT, core / "graph.py")
        hookdir = self.root / "custom hooks"
        hookdir.mkdir()
        self.git("config", "core.hooksPath", str(hookdir))
        hook = hookdir / "post-commit"
        hook.write_text('#!/bin/sh\nprintf "previous\\n" >> hook-ran\n')
        hook.chmod(0o755)
        self.run_graph("install-hooks")
        self.run_graph("install-hooks")
        self.source.write_text("def committed(): pass\n")
        self.git("add", "main.py")
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "edit"],
                       env=self.env, check=True, capture_output=True)
        self.assertEqual((self.root / "hook-ran").read_text(), "previous\n")
        self.run_graph("status")

    def test_hook_preserves_basename_and_directory_dispatch(self):
        core = self.root / ".claude/core"
        core.mkdir(parents=True)
        shutil.copy2(SCRIPT, core / "graph.py")
        hookdir = self.root / ".husky/_"
        hookdir.mkdir(parents=True)
        self.git("config", "core.hooksPath", str(hookdir))
        (hookdir.parent / "post-commit").write_text('printf "ran\\n" >> dispatcher-ran\n')
        (hookdir / "post-commit").write_text(
            '#!/bin/sh\nn=$(basename "$0")\ns="$(dirname "$(dirname "$0")")/$n"\n'
            'if [ -f "$s" ]; then sh "$s" "$@"; fi\n')
        (hookdir / "post-commit").chmod(0o755)
        self.run_graph("install-hooks")
        subprocess.run([str(hookdir / "post-commit")], cwd=self.root, env=self.env, check=True,
                       capture_output=True)
        self.assertTrue((self.root / "dispatcher-ran").exists())

    def test_backend_is_found_in_local_bin_without_shell_path_setup(self):
        user_home = self.base / "user"
        local = user_home / ".local/bin"
        local.mkdir(parents=True)
        shutil.copy2(self.base / "graphify", local / "graphify")
        # No shell-profile setup, as in a Git hook launched by a GUI.
        env = {**self.env, "HOME": str(user_home), "PATH": "/usr/bin:/bin"}
        self.run_graph("sync", env=env)

    def test_existing_hook_failure_status_is_preserved(self):
        core = self.root / ".claude/core"
        core.mkdir(parents=True)
        shutil.copy2(SCRIPT, core / "graph.py")
        hook = self.root / ".git/hooks/post-commit"
        hook.write_text('#!/bin/sh\nfalse\n')
        hook.chmod(0o755)
        self.run_graph("install-hooks")
        result = subprocess.run([str(hook)], cwd=self.root, env=self.env, capture_output=True)
        self.assertEqual(result.returncode, 1)

    def test_corrupt_published_graph_is_rebuilt(self):
        self.run_graph("sync")
        state = self.root / ".git/core-graph"
        current = json.loads((state / "current.json").read_text())
        (state / current["generation"] / "tree/graphify-out/graph.json").write_text("corrupt")
        self.run_graph("status", ok=False)
        self.assertIn("before", self.run_graph("query", "all").stdout)

    def test_watch_refreshes_a_human_edit_without_a_query(self):
        command = [sys.executable, str(SCRIPT), "--root", str(self.root),
                   "watch", "--interval", "0.05"]
        with subprocess.Popen(command, env=self.env, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE) as process:
            try:
                pointer = self.root / ".git/core-graph/current.json"
                deadline = time.monotonic() + 10
                while not pointer.exists() and time.monotonic() < deadline:
                    time.sleep(.02)
                self.assertTrue(pointer.exists())
                first = json.loads(pointer.read_text())["digest"]
                self.source.write_text("def human_edit(): pass\n")
                while time.monotonic() < deadline:
                    if json.loads(pointer.read_text())["digest"] != first:
                        break
                    time.sleep(.02)
                self.assertNotEqual(json.loads(pointer.read_text())["digest"], first)
            finally:
                process.terminate()
                process.communicate(timeout=10)

    def test_branch_switch_without_hooks_is_detected(self):
        self.run_graph("sync")
        initial = self.git("rev-parse", "HEAD")
        self.git("checkout", "-qb", "changed")
        self.source.write_text("def branch_version(): pass\n")
        self.git("add", "main.py")
        self.git("commit", "-qm", "branch edit")
        self.assertIn("branch_version", self.run_graph("query", "all").stdout)
        self.git("checkout", "-q", initial)
        self.assertIn("before", self.run_graph("query", "all").stdout)

    def test_guard_blocks_direct_graph_reads(self):
        for inputs in ({"command": "graphify query main"},
                       {"command": "cd src && /opt/bin/graphify query main"},
                       {"file_path": "graphify-out/graph.json"}):
            p = subprocess.run([sys.executable, str(SCRIPT), "guard"],
                               input=json.dumps({"tool_input": inputs}), text=True, capture_output=True)
            self.assertEqual(p.returncode, 2)
            self.assertEqual(p.stdout, "")

    def test_guard_allows_graphify_as_a_search_term(self):
        for command in ('python3 .claude/core/graph.py query "what uses graphify?"',
                        'git commit -m "Update graphify"'):
            p = subprocess.run([sys.executable, str(SCRIPT), "guard"],
                               input=json.dumps({"tool_input": {"command": command}}),
                               text=True, capture_output=True)
            self.assertEqual(p.returncode, 0, p.stderr)


@unittest.skipUnless(os.environ.get("CORE_GRAPH_REAL") == "1", "opt-in installed Graphify integration")
class RealGraphifyTests(unittest.TestCase):
    def test_setup_query_cross_file_change_and_delete_with_real_backend(self):
        with tempfile.TemporaryDirectory(prefix="core-graph-integration-") as directory:
            root = Path(directory)
            subprocess.run(["git", "init", "-q", str(root)], check=True)
            (root / "library.py").write_text("def helper():\n    return 1\n")
            (root / "main.py").write_text("from library import helper\ndef entry():\n    return helper()\n")
            setup = subprocess.run(["bash", str(SCRIPT.with_name("graph.sh")), "--root", str(root)],
                                   text=True, capture_output=True, timeout=60)
            self.assertEqual(setup.returncode, 0, setup.stderr)
            gateway = root / ".claude/core/graph.py"
            def query(*args):
                p = subprocess.run([sys.executable, str(gateway), "--root", str(root), *args],
                                   capture_output=True, text=True, timeout=60)
                self.assertEqual(p.returncode, 0, p.stderr)
                return p.stdout
            self.assertIn("NODE helper()", query("query", "helper"))
            (root / "library.py").write_text("def replacement():\n    return 2\n")
            output = query("query", "replacement")
            self.assertIn("NODE replacement()", output)
            self.assertNotIn("NODE helper() [src=library.py", output)
            (root / "library.py").unlink()
            (root / "main.py").unlink()
            self.assertEqual(json.loads(query("god-nodes", "--json")), [])


if __name__ == "__main__":
    unittest.main()
