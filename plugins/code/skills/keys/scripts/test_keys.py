#!/usr/bin/env python3
"""Regression tests for keys.py.

Run:  python3 scripts/test_keys.py
No test framework needed beyond stdlib unittest; exits non-zero on failure.
Every fixture lives in a TemporaryDirectory. Git cases skip when git is missing.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
KEYS = HERE / "keys.py"
TEMPLATE = HERE.parent / "assets" / "AGENTS-root.md"
BEGIN = "<!-- KEYS:begin -->"
END = "<!-- KEYS:end -->"


def run(root, *args):
    return subprocess.run(
        [sys.executable, str(KEYS), *args, "--root", str(root)],
        capture_output=True, text=True,
    )


def write(root, rel, text):
    p = Path(root) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return p


def read(root, rel):
    return (Path(root) / rel).read_text()


def valid_tree(root):
    """Root, src/AGENTS.md and src/api/AGENTS.md with correct indexes."""
    run(root, "install")
    head = read(root, "AGENTS.md").partition("This project is not yet indexed.")[0]
    write(root, "AGENTS.md", head + "- [src/AGENTS.md](src/AGENTS.md) — source code.\n")
    write(root, "src/AGENTS.md",
          "# Src\n\n## Purpose\n\nCode.\n\n## Child KEYS Index\n\n"
          "- [api/AGENTS.md](api/AGENTS.md) — the API.\n")
    write(root, "src/api/AGENTS.md",
          "# API\n\n## Purpose\n\nAPI.\n\n## Child KEYS Index\n\n- None\n")


class Install(unittest.TestCase):
    def test_01_empty_dir_gets_template(self):
        with tempfile.TemporaryDirectory() as d:
            r = run(d, "install")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual((Path(d) / "AGENTS.md").read_bytes(), TEMPLATE.read_bytes())
            self.assertIn("created AGENTS.md", r.stdout)

    def test_02_merge_into_existing(self):
        with tempfile.TemporaryDirectory() as d:
            original = "# My project\n\nUse tabs.\n"
            write(d, "AGENTS.md", "\n\n" + original)
            r = run(d, "install")
            self.assertEqual(r.returncode, 0, r.stderr)
            out = read(d, "AGENTS.md")
            self.assertTrue(out.startswith(BEGIN))
            self.assertIn(original, out)
            self.assertIn("\n## User Preferences\n", out)
            self.assertIn("\n## Child KEYS Index\n", out)
            first = (Path(d) / "AGENTS.md").read_bytes()
            run(d, "install")
            self.assertEqual((Path(d) / "AGENTS.md").read_bytes(), first)

    def test_03_outdated_block_restored(self):
        with tempfile.TemporaryDirectory() as d:
            run(d, "install")
            text = read(d, "AGENTS.md")
            project = "\n\n## Purpose\n\nProject text stays.\n"
            text = text.replace("- Prefer direct bullets", "- Old rule", 1)
            text = text.replace(END, END + project, 1)
            write(d, "AGENTS.md", text)
            r = run(d, "install")
            self.assertEqual(r.returncode, 0, r.stderr)
            out = read(d, "AGENTS.md")
            self.assertIn("- Prefer direct bullets", out)
            self.assertNotIn("- Old rule", out)
            self.assertIn(END + project, out)
            self.assertIn("updated KEYS block", r.stdout)

    def test_04_symlink_replaced(self):
        with tempfile.TemporaryDirectory() as d:
            claude = "# Claude rules\n\nRun make test.\n"
            write(d, "CLAUDE.md", claude)
            os.symlink("CLAUDE.md", Path(d) / "AGENTS.md")
            r = run(d, "install")
            self.assertEqual(r.returncode, 0, r.stderr)
            agents = Path(d) / "AGENTS.md"
            self.assertFalse(agents.is_symlink())
            out = agents.read_text()
            self.assertGreater(out.index(claude), out.index(END))
            self.assertEqual(read(d, "CLAUDE.md"), claude)
            self.assertIn("replaced symlink AGENTS.md -> CLAUDE.md", r.stdout)

    def test_05_only_begin_is_malformed(self):
        with tempfile.TemporaryDirectory() as d:
            text = BEGIN + "\n# half\n"
            write(d, "AGENTS.md", text)
            r = run(d, "install")
            self.assertEqual(r.returncode, 2)
            self.assertIn("malformed KEYS block", r.stderr)
            self.assertEqual(read(d, "AGENTS.md"), text)


class Check(unittest.TestCase):
    def test_06_fresh_install_names_placeholder(self):
        with tempfile.TemporaryDirectory() as d:
            run(d, "install")
            r = run(d, "check")
            self.assertEqual(r.returncode, 1)
            self.assertIn("placeholder", r.stdout)

    def test_07_valid_tree(self):
        with tempfile.TemporaryDirectory() as d:
            valid_tree(d)
            r = run(d, "check")
            self.assertEqual(r.returncode, 0, r.stdout)
            self.assertIn("0 errors", r.stdout)

    def test_08_missing_child_in_index(self):
        with tempfile.TemporaryDirectory() as d:
            valid_tree(d)
            write(d, "src/AGENTS.md", "# Src\n\n## Child KEYS Index\n\n- None\n")
            r = run(d, "check")
            self.assertEqual(r.returncode, 1)
            self.assertIn("src/api/AGENTS.md", r.stdout)

    def test_09_entry_to_missing_file(self):
        with tempfile.TemporaryDirectory() as d:
            valid_tree(d)
            with open(Path(d) / "src/api/AGENTS.md", "w") as f:
                f.write("# API\n\n## Child KEYS Index\n\n- [gone/AGENTS.md](gone/AGENTS.md) — x.\n")
            r = run(d, "check")
            self.assertEqual(r.returncode, 1)
            self.assertIn("ERROR src/api/AGENTS.md", r.stdout)

    def test_10_grandchild_in_root_index(self):
        with tempfile.TemporaryDirectory() as d:
            valid_tree(d)
            with open(Path(d) / "AGENTS.md", "a") as f:
                f.write("- [src/api/AGENTS.md](src/api/AGENTS.md) — the API.\n")
            r = run(d, "check")
            self.assertEqual(r.returncode, 1)
            self.assertIn("ERROR AGENTS.md", r.stdout)

    def test_11_claude_md_warns(self):
        with tempfile.TemporaryDirectory() as d:
            valid_tree(d)
            write(d, "CLAUDE.md", "# leftover\n")
            r = run(d, "check")
            self.assertEqual(r.returncode, 0, r.stdout)
            self.assertIn("WARN CLAUDE.md", r.stdout)
            r = run(d, "check", "--strict")
            self.assertEqual(r.returncode, 1)


class Scan(unittest.TestCase):
    def test_12_scan_classifies(self):
        with tempfile.TemporaryDirectory() as d:
            write(d, "CLAUDE.md",
                  "# Rules\n\nSee @docs/rules.md and mail me@example.com.\n\n"
                  "```\n@ignored.md\n```\n\n<!-- CORE:begin -->\nx\n<!-- CORE:end -->\n")
            write(d, "CLAUDE.local.md", "mine\n")
            write(d, ".cursorrules", "rules\n")
            write(d, ".github/copilot-instructions.md", "copilot\n")
            write(d, "docs/notes.md", "notes\n")
            write(d, "docs/rules.md", "rules\n")
            write(d, "README.md", "readme\n")
            write(d, "node_modules/x/README.md", "x\n")
            write(d, "node_modules/x/guide.md", "x\n")
            write(d, "packages/api/package.json", "{}\n")
            r = run(d, "scan")
            self.assertEqual(r.returncode, 0, r.stderr)
            s = json.loads(r.stdout)
            claude = {c["path"]: c for c in s["claude_md"]}
            self.assertEqual(len(claude), 2)
            self.assertFalse(claude["CLAUDE.md"]["local"])
            self.assertTrue(claude["CLAUDE.local.md"]["local"])
            self.assertEqual(claude["CLAUDE.md"]["imports"], ["docs/rules.md"])
            self.assertTrue(claude["CLAUDE.md"]["core_block"])
            self.assertEqual(s["agent_rule_files"],
                             [".cursorrules", ".github/copilot-instructions.md"])
            self.assertEqual([m["path"] for m in s["other_md"]],
                             ["docs/notes.md", "docs/rules.md"])
            self.assertEqual(s["boundary_candidates"], ["packages/api"])
            self.assertFalse(s["git"]["repo"])

    @unittest.skipIf(shutil.which("git") is None, "git not installed")
    def test_13_git_ignored_md_excluded(self):
        with tempfile.TemporaryDirectory() as d:
            def git(*a):
                subprocess.run(["git", *a], cwd=d, check=True, capture_output=True)
            git("init", "-q")
            git("config", "user.name", "Test")
            git("config", "user.email", "test@example.com")
            write(d, ".gitignore", "secret.md\n")
            write(d, "secret.md", "hidden\n")
            write(d, "notes.md", "shown\n")
            r = run(d, "scan")
            self.assertEqual(r.returncode, 0, r.stderr)
            s = json.loads(r.stdout)
            self.assertTrue(s["git"]["repo"])
            paths = [m["path"] for m in s["other_md"]]
            self.assertNotIn("secret.md", paths)
            self.assertIn("notes.md", paths)

    @unittest.skipIf(shutil.which("git") is None, "git not installed")
    def test_19_non_utf8_filename(self):
        with tempfile.TemporaryDirectory() as d:
            def git(*a, **kw):
                return subprocess.run(["git", *a], cwd=d, check=True, capture_output=True, **kw)
            git("init", "-q")
            name = b"bad\xff.md"
            try:
                with open(os.path.join(os.fsencode(d), name), "wb") as f:
                    f.write(b"x\n")
            except OSError:
                # APFS rejects the name; put it in the git index only.
                blob = git("hash-object", "-w", "--stdin", input=b"x\n").stdout.strip()
                git("update-index", "--add", "--cacheinfo", b"100644," + blob + b"," + name)
            r = run(d, "scan")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertNotIn("Traceback", r.stderr)


class Hardening(unittest.TestCase):
    def test_14_symlink_outside_root_rejected(self):
        with tempfile.TemporaryDirectory() as d, tempfile.TemporaryDirectory() as out:
            secret = "outside secret text\n"
            write(out, "private.md", secret)
            agents = Path(d) / "AGENTS.md"
            os.symlink(Path(out) / "private.md", agents)
            r = run(d, "install")
            self.assertEqual(r.returncode, 2)
            self.assertIn("AGENTS.md links outside the project:", r.stderr)
            self.assertTrue(agents.is_symlink())
            for p in Path(d).rglob("*"):
                if p.is_file() and not p.is_symlink():
                    self.assertNotIn(secret, p.read_text(errors="replace"))

    @unittest.skipIf(shutil.which("git") is None, "git not installed")
    def test_15_ignored_root_agents_checked(self):
        with tempfile.TemporaryDirectory() as d:
            subprocess.run(["git", "init", "-q"], cwd=d, check=True, capture_output=True)
            write(d, ".gitignore", "AGENTS.md\n")
            write(d, "AGENTS.md", "# No markers\n\n## Child KEYS Index\n\n- None\n")
            r = run(d, "check")
            self.assertEqual(r.returncode, 1, r.stdout)
            self.assertIn("ERROR AGENTS.md: KEYS markers missing", r.stdout)

    def test_16_index_link_with_spaces(self):
        for link in ("<team docs/AGENTS.md>", "team%20docs/AGENTS.md"):
            with self.subTest(link=link), tempfile.TemporaryDirectory() as d:
                run(d, "install")
                head = read(d, "AGENTS.md").partition("This project is not yet indexed.")[0]
                write(d, "AGENTS.md", head + f"- [team docs/AGENTS.md]({link}) — team.\n")
                write(d, "team docs/AGENTS.md", "# Team\n\n## Child KEYS Index\n\n- None\n")
                r = run(d, "check")
                self.assertEqual(r.returncode, 0, r.stdout)

    def test_17_crlf_bytes_kept(self):
        with tempfile.TemporaryDirectory() as d:
            run(d, "install")
            text = read(d, "AGENTS.md").replace("- Prefer direct bullets", "- Old rule", 1)
            text = text.replace(END, END + "\n\n## Purpose\n\nProject text.\n", 1)
            agents = Path(d) / "AGENTS.md"
            agents.write_bytes(text.replace("\n", "\r\n").encode())
            tail = agents.read_bytes().partition(END.encode())[2]
            r = run(d, "install")
            self.assertEqual(r.returncode, 0, r.stderr)
            first = agents.read_bytes()
            self.assertEqual(first.partition(END.encode())[2], tail)
            self.assertNotIn(b"- Old rule", first)
            run(d, "install")
            self.assertEqual(agents.read_bytes(), first)

    def test_18_non_utf8_agents_md(self):
        with tempfile.TemporaryDirectory() as d:
            agents = Path(d) / "AGENTS.md"
            data = b"# Project\n\n\xff\n"
            agents.write_bytes(data)
            r = run(d, "install")
            self.assertEqual(r.returncode, 2)
            self.assertIn("AGENTS.md is not valid UTF-8", r.stderr)
            self.assertNotIn("Traceback", r.stderr)
            self.assertEqual(agents.read_bytes(), data)


if __name__ == "__main__":
    unittest.main(verbosity=2)
