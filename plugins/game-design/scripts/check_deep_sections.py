#!/usr/bin/env python3
"""Check the 4 deep-design sections of a game design Markdown file.

usage: check_deep_sections.py <markdown-file> [--kinds Kind,Kind]

The sections come from the game-design skills systems-economy, progression-content, level-ux and
prototype-plan. Each must be present, in that order, with its subsections in order, its tables'
columns, and a fenced ```json block whose keys agree with the tables.

--kinds names the design's target kinds of fun. With it, every target kind must be served by a
system and have at least one playtest question, and a system that serves no target kind fails.

Exit 0 when all 4 sections are valid, 1 when any section fails (one line per section on stderr,
then one line per reason), 2 when the file cannot be read.
"""
import argparse
import json
import re
import sys

KINDS = ("Sensation", "Fantasy", "Narrative", "Challenge", "Fellowship", "Discovery", "Expression", "Submission")
KIND_RE = re.compile(r"\b(" + "|".join(KINDS) + r")\b", re.I)

SECTIONS = {
    "systems-economy": "Systems and economy",
    "progression-content": "Progression and content",
    "level-ux": "Levels and UX",
    "prototype-plan": "Prototype and playtest plan",
}

SUBSECTIONS = {
    "systems-economy": ["Systems", "Resources", "Balance levers", "First hour in numbers", "Failure and recovery"],
    "progression-content": ["Game length", "Session plan", "Unlock curve", "Timed storyboard", "Content inventory"],
    "level-ux": ["First 10 minutes", "Sample levels", "Controls", "HUD", "Screen flow"],
    "prototype-plan": ["Milestones", "Playtest questions", "Success metrics", "Tech notes", "Risks retired"],
}

# Expected table columns, matched as case-insensitive prefixes of the header cells.
COLUMNS = {
    "Systems": ["System", "Purpose", "Serves", "Inputs", "Outputs"],
    "Resources": ["Resource", "Sources", "Sinks", "Cap", "Why it exists"],
    "First hour in numbers": ["Minute", "Player state", "Key resources", "What changes"],
    "Session plan": ["Session", "Goal", "New element", "Target kind"],
    "Unlock curve": ["Unlock", "When", "Why then"],
    "Content inventory": ["Asset type", "Count", "Solo-dev cost"],
    "First 10 minutes": ["Time", "Player does", "Player learns", "Target kind"],
    "Controls": ["Input", "Action"],
    "Milestones": ["Milestone", "Proves", "Scope", "Duration", "Exit criteria"],
    "Risks retired": ["Risk", "Milestone"],
}


def split_blocks(text, level):
    """Return [(title, start, end)] for headings of exactly `level` hashes; end = next same-level heading."""
    marks = [(m.group(1).strip(), m.start(), m.end()) for m in re.finditer(r"^%s[ \t]+(.+?)[ \t]*$" % ("#" * level), text, re.M)]
    return [(t, body_start, marks[i + 1][1] if i + 1 < len(marks) else len(text))
            for i, (t, _, body_start) in enumerate(marks)]


def table(body):
    """Return (header, rows) of the first Markdown table in body; ([], []) if none."""
    lines = [ln.strip() for ln in body.splitlines()]
    start = next((i for i, ln in enumerate(lines) if ln.startswith("|")), None)
    if start is None:
        return [], []
    block = []
    for ln in lines[start:]:
        if not ln.startswith("|"):
            break
        block.append([c.strip() for c in ln.strip("|").split("|")])
    rows = [r for r in block[1:] if not all(re.fullmatch(r":?-+:?", c) for c in r if c)]
    return block[0], rows


def number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def last_json(body, reasons):
    blocks = re.findall(r"```json[ \t]*\n(.*?)\n```", body, re.S)
    if not blocks:
        reasons.append("no ```json block")
        return None
    try:
        d = json.loads(blocks[-1])
    except ValueError as e:
        reasons.append(f"json block does not parse: {e}")
        return None
    if not isinstance(d, dict):
        reasons.append("json block is not an object")
        return None
    return d


def check_table(name, body, reasons, lo=1, hi=None):
    header, rows = table(body)
    want = COLUMNS[name]
    if len(header) < len(want) or not all(h.lower().startswith(w.lower()) for h, w in zip(header, want)):
        reasons.append(f"### {name}: table columns must be {' | '.join(want)}; got {' | '.join(header) or 'no table'}")
        return rows
    if len(rows) < lo:
        reasons.append(f"### {name}: {len(rows)} rows; need at least {lo}")
    if hi is not None and len(rows) > hi:
        reasons.append(f"### {name}: {len(rows)} rows; need at most {hi}")
    return rows


def bullets(body):
    return [ln for ln in body.splitlines() if re.match(r"\s*[-*]\s+\S", ln)]


def kinds_in(cell):
    return {k.capitalize() for k in KIND_RE.findall(cell)}


def check_systems(subs, d, reasons, kinds):
    target = set(kinds or KINDS)
    systems = check_table("Systems", subs["Systems"], reasons, 1, 8)
    served = set()
    for r in systems:
        hit = kinds_in(r[2]) & target if len(r) > 2 else set()
        served |= hit
        if not hit:
            reasons.append(f"### Systems: '{r[0]}' serves no target kind")
    if kinds:
        for k in sorted(set(kinds) - served):
            reasons.append(f"### Systems: target kind {k} is served by no system")
    resources = check_table("Resources", subs["Resources"], reasons, 1)
    for r in resources:
        if not (kinds_in(r[-1]) & target):
            reasons.append(f"### Resources: '{r[0]}' names no target kind in 'Why it exists'")
    if not any("→" in b or "->" in b for b in bullets(subs["Balance levers"])):
        reasons.append("### Balance levers: need bullets 'lever → what it changes → starting value'")
    check_table("First hour in numbers", subs["First hour in numbers"], reasons, 1)
    if not subs["Failure and recovery"].strip():
        reasons.append("### Failure and recovery: empty")
    if d is None:
        return
    for key, rows in (("systems", systems), ("resources", resources)):
        if d.get(key) != len(rows):
            reasons.append(f"json {key}={d.get(key)!r} but the table has {len(rows)} rows")
    if d.get("unserved") != []:
        reasons.append(f"json unserved must be [] (got {d.get('unserved')!r})")


def storyboard_panels(body):
    timeline = re.search(r"```mermaid[ \t]*\n\s*timeline\b(.*?)```", body, re.S)
    if timeline:
        return len([ln for ln in timeline.group(1).splitlines() if re.match(r"\s*\S.*?\s:\s+\S", ln)])
    return len(table(body)[1])


def check_progression(subs, d, reasons, kinds):
    if not re.search(r"\d", subs["Game length"]):
        reasons.append("### Game length: no decided number")
    sessions = check_table("Session plan", subs["Session plan"], reasons, 1, 10)
    for r in sessions:
        if len(r) > 3 and not kinds_in(r[3]):
            reasons.append(f"### Session plan: session '{r[0]}' names no target kind")
    check_table("Unlock curve", subs["Unlock curve"], reasons, 1, 12)
    panels = storyboard_panels(subs["Timed storyboard"])
    if not 6 <= panels <= 10:
        reasons.append(f"### Timed storyboard: {panels} panels; need 6-10")
    content = check_table("Content inventory", subs["Content inventory"], reasons, 1)
    total = 0.0
    for r in content:
        m = re.search(r"\d+(\.\d+)?", r[2]) if len(r) > 2 else None
        if not m:
            reasons.append(f"### Content inventory: '{r[0]}' has no hour number")
        else:
            total += float(m.group(0))
    if d is None:
        return
    if not number(d.get("length_hours")) or d["length_hours"] <= 0:
        reasons.append(f"json length_hours must be a positive number (got {d.get('length_hours')!r})")
    if d.get("sessions") != len(sessions):
        reasons.append(f"json sessions={d.get('sessions')!r} but the session plan has {len(sessions)} rows")
    if not number(d.get("content_hours")) or abs(d["content_hours"] - total) > 1:
        reasons.append(f"json content_hours={d.get('content_hours')!r} but the content inventory sums to {total:g}")


def check_levels(subs, d, reasons, kinds):
    first10 = check_table("First 10 minutes", subs["First 10 minutes"], reasons, 1, 10)
    for r in first10:
        if len(r) > 3 and not kinds_in(r[3]):
            reasons.append(f"### First 10 minutes: row '{r[0]}' names no target kind")
    levels = split_blocks(subs["Sample levels"], 4)
    if len(levels) != 3:
        reasons.append(f"### Sample levels: {len(levels)} '####' levels; need exactly 3 sample levels")
    for title, s, e in levels:
        body = subs["Sample levels"][s:e]
        if not re.search(r"Difficulty\W*[1-5]\b", body, re.I):
            reasons.append(f"### Sample levels: '{title}' has no difficulty 1-5")
        if not kinds_in(body):
            reasons.append(f"### Sample levels: '{title}' names no target kind")
        if not re.search(r"```(text|mermaid)", body):
            reasons.append(f"### Sample levels: '{title}' has no layout sketch")
    controls = check_table("Controls", subs["Controls"], reasons, 1)
    joined = " ".join(" ".join(r) for r in controls).lower()
    for scheme in ("keyboard", "controller", "touch"):
        if scheme not in joined:
            reasons.append(f"### Controls: no {scheme} input")
    if not bullets(subs["HUD"]):
        reasons.append("### HUD: no bullets")
    if not re.search(r"```mermaid[ \t]*\n\s*flowchart\b", subs["Screen flow"]):
        reasons.append("### Screen flow: no Mermaid flowchart")
    if d is None:
        return
    if d.get("levels") != 3:
        reasons.append(f"json levels must be 3 (got {d.get('levels')!r})")
    if d.get("first10_rows") != len(first10):
        reasons.append(f"json first10_rows={d.get('first10_rows')!r} but the table has {len(first10)} rows")


def check_prototype(subs, d, reasons, kinds):
    milestones = check_table("Milestones", subs["Milestones"], reasons, 3, 3)
    names = " ".join(r[0] for r in milestones).lower()
    for want, pat in (("paper prototype", r"paper"), ("grey-box", r"gr[ae]y"), ("vertical slice", r"vertical")):
        if not re.search(pat, names):
            reasons.append(f"### Milestones: no {want} milestone")
    asked = {}
    for b in bullets(subs["Playtest questions"]):
        m = re.match(r"\s*[-*]\s+\*\*(\w+)\*\*", b)
        if m and m.group(1).capitalize() in KINDS:
            k = m.group(1).capitalize()
            asked[k] = asked.get(k, 0) + 1
    if not asked:
        reasons.append("### Playtest questions: no bullet starts with a **Kind** tag")
    for k in kinds or []:
        if not asked.get(k):
            reasons.append(f"### Playtest questions: target kind {k} has no question")
    if not any(re.search(r"\d", b) for b in bullets(subs["Success metrics"])):
        reasons.append("### Success metrics: no measurable bullet (no number)")
    if not subs["Tech notes"].strip():
        reasons.append("### Tech notes: empty")
    check_table("Risks retired", subs["Risks retired"], reasons, 1)
    if d is None:
        return
    if d.get("milestones") != 3:
        reasons.append(f"json milestones must be 3 (got {d.get('milestones')!r})")
    qbk = d.get("questions_by_kind")
    if not isinstance(qbk, dict) or not qbk:
        reasons.append("json questions_by_kind must be a non-empty object")
        return
    for k, n in qbk.items():
        if k not in KINDS:
            reasons.append(f"json questions_by_kind: {k!r} is not a kind of fun")
        elif not isinstance(n, int) or isinstance(n, bool) or n < 1:
            reasons.append(f"json questions_by_kind: {k} needs at least 1 question (got {n!r})")
        elif asked.get(k, 0) < n:
            reasons.append(f"json questions_by_kind: {k}={n} but {asked.get(k, 0)} questions are tagged **{k}**")
    for k in kinds or []:
        if k not in qbk:
            reasons.append(f"json questions_by_kind: target kind {k} is missing")


CHECKS = {
    "systems-economy": check_systems,
    "progression-content": check_progression,
    "level-ux": check_levels,
    "prototype-plan": check_prototype,
}


def check_text(text, kinds=None):
    """Return {section_key: [reason, ...]} for the 4 sections; an empty list means valid."""
    kinds = [k.strip().capitalize() for k in kinds or [] if k.strip()]
    h2 = split_blocks(text, 2)
    result, last_pos = {}, -1
    for key, heading in SECTIONS.items():
        reasons = result[key] = []
        found = [(s, e) for t, s, e in h2 if t == heading]
        if not found:
            reasons.append(f"missing '## {heading}'")
            continue
        start, end = found[0]
        if start < last_pos:
            reasons.append(f"'## {heading}' is out of order")
        last_pos = max(last_pos, start)
        body = text[start:end]
        subs, pos = {}, 0
        h3 = split_blocks(body, 3)
        for name in SUBSECTIONS[key]:
            hit = next(((s, e) for t, s, e in h3 if t == name and s >= pos), None)
            if hit is None:
                reasons.append(f"missing or out of order: '### {name}'")
                subs[name] = ""
            else:
                subs[name] = body[hit[0]:hit[1]]
                pos = hit[0]
        d = last_json(body, reasons)
        if d is not None and d.get("section") != key:
            reasons.append(f"json section must be {key!r} (got {d.get('section')!r})")
        for k in unknown_kinds(kinds):
            reasons.append(f"--kinds: {k!r} is not a kind of fun")
        CHECKS[key](subs, d, reasons, kinds)
    return result


def unknown_kinds(kinds):
    return [k for k in kinds if k not in KINDS]


def main(argv=None):
    ap = argparse.ArgumentParser(description="Check the 4 deep-design sections of a Markdown file.")
    ap.add_argument("file")
    ap.add_argument("--kinds", help="comma-separated target kinds of fun, e.g. Narrative,Expression")
    a = ap.parse_args(argv)
    try:
        with open(a.file, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as e:
        print(f"cannot read {a.file}: {e}", file=sys.stderr)
        return 2
    result = check_text(text, a.kinds.split(",") if a.kinds else None)
    for key, reasons in result.items():
        print(f"{key}: {'FAIL' if reasons else 'OK'}", file=sys.stderr)
        for r in reasons:
            print(f"  - {r}", file=sys.stderr)
    return 1 if any(result.values()) else 0


if __name__ == "__main__":
    sys.exit(main())
