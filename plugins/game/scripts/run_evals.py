#!/usr/bin/env python3
"""Run a skill's evals/evals.json under `claude -p` and grade the deterministic `checks`.

usage: run_evals.py <plugin_dir> <skill_name> [--ids 1,2] [--out DIR]

Check types (each may carry a "description"):
  {"type": "regex", "pattern": P, "min": 1, "max": null}   count of re.MULTILINE matches in [min, max]
  {"type": "not_regex", "pattern": P}                        no match (case-insensitive)
  {"type": "in_order", "patterns": [P1, P2, ...]}            each matches, in this order
  {"type": "json_expr", "expr": E}                           E is true for d = the last ```json block
"""
import argparse, json, re, subprocess, sys, time
from pathlib import Path


def last_json_block(text):
    blocks = re.findall(r"```json\s*\n(.*?)\n```", text, re.S)
    if not blocks:
        raise ValueError("no ```json block")
    return json.loads(blocks[-1])


def grade(check, text):
    t = check["type"]
    if t == "regex":
        n = len(re.findall(check["pattern"], text, re.M))
        lo, hi = check.get("min", 1), check.get("max")
        return lo <= n and (hi is None or n <= hi), f"count={n}"
    if t == "not_regex":
        m = re.search(check["pattern"], text, re.M | re.I)
        return m is None, f"found {m.group(0)!r}" if m else "absent"
    if t == "in_order":
        pos = 0
        for p in check["patterns"]:
            m = re.compile(p, re.M).search(text, pos)
            if not m:
                return False, f"missing or out of order: {p}"
            pos = m.end()
        return True, "in order"
    if t == "json_expr":
        try:
            d = last_json_block(text)
            # expr comes from the repo's own evals.json (authored, trusted); model output is only data in d.
            return bool(eval(check["expr"], {"len": len, "all": all, "any": any, "set": set, "sorted": sorted, "d": d})), "evaluated"
        except Exception as e:
            return False, f"error: {e}"
    if t == "render_spec":
        # Render the last ```json block with the skill's own renderer, then run its validator.
        import tempfile
        try:
            d = last_json_block(text)
        except Exception as e:
            return False, f"error: {e}"
        sd = Path(check["_skill_dir"])
        with tempfile.TemporaryDirectory() as td:
            spec, svg = Path(td) / "spec.json", Path(td) / "out.svg"
            spec.write_text(json.dumps(d))
            r = subprocess.run([sys.executable, str(sd / check["render"]), str(spec), "-o", str(svg)], capture_output=True, text=True)
            if r.returncode:
                return False, f"render rc={r.returncode}: {r.stderr.strip()[-300:]}"
            v = subprocess.run([sys.executable, str(sd / check["validate"]), str(svg)], capture_output=True, text=True)
            return v.returncode == 0, f"validate rc={v.returncode} {v.stderr.strip()[-300:]}"
    raise ValueError(t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plugin_dir")
    ap.add_argument("skill")
    ap.add_argument("--ids")
    ap.add_argument("--out", default="eval-out")
    ap.add_argument("--regrade", action="store_true", help="grade saved outputs, do not call claude")
    a = ap.parse_args()
    plugin = Path(a.plugin_dir).resolve()
    spec = json.loads((plugin / "skills" / a.skill / "evals" / "evals.json").read_text())
    plugin_name = json.loads((plugin / ".claude-plugin" / "plugin.json").read_text())["name"]
    out = Path(a.out) / a.skill
    out.mkdir(parents=True, exist_ok=True)
    ids = {int(i) for i in a.ids.split(",")} if a.ids else None
    all_ok = True
    for ev in spec["evals"]:
        if ids and ev["id"] not in ids:
            continue
        f = out / f"{ev['id']}.md"
        if not a.regrade:
            t0 = time.time()
            prompt = f"/{plugin_name}:{a.skill} {ev['prompt']}"
            r = subprocess.run(
                ["claude", "-p", "--plugin-dir", str(plugin), "--output-format", "text",
                 "--disallowedTools", "Write,Edit,Bash,WebFetch,WebSearch,Task,AskUserQuestion"],
                input=prompt, capture_output=True, text=True, timeout=900, cwd=str(out))
            f.write_text(r.stdout)
            if r.returncode:
                print(r.stderr[-2000:])
            print(f"[{a.skill} #{ev['id']}] ran in {time.time()-t0:.0f}s rc={r.returncode}")
        text = f.read_text()
        ok_all = True
        for c in ev.get("checks", []):
            c = dict(c, _skill_dir=str(plugin / "skills" / a.skill))
            ok, why = grade(c, text)
            ok_all &= ok
            print(f"  {'PASS' if ok else 'FAIL'} {c.get('description', c['type'])} ({why})")
        print(f"[{a.skill} #{ev['id']}] {'PASS' if ok_all else 'FAIL'}")
        all_ok &= ok_all
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
