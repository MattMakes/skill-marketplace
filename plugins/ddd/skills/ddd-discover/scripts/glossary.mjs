// `ddd discover glossary <discover.json> [--glossary <ddd/glossary.md>] [--title "Project title"]
// [--dry-run]`: the port of seed_glossary.py. Seeds or refreshes the "## Shared" section
// of ddd/glossary.md from discover.json.
//
// Rules (artifact-contract.md section 5):
// - glossary.md lives at <ddd-dir>/glossary.md (two levels up from discover.json).
// - Only the "## Shared" section is rewritten; every other section is preserved byte for byte.
// - Terms already in Shared but absent from discover.json are kept at the end and reported.
// - Entries whose `context` is not null are skipped with a note.
// - init's placeholder line `_(seeded by ddd-discover, refined by ddd-define)_` is dropped.
//
// Exit 0 on success, 2 on usage/IO problems.
import fs from "node:fs";
import path from "node:path";
import { get, isDict, listOr, manifestTitle, pyRepr, pyStr, readJson, runCommand, truthy } from "./_args.mjs";

const TERM_RE = /^\*\*(.+?)\*\*\s*[-—–]\s*(.*)$/;
const PLACEHOLDER = "_(seeded by ddd-discover, refined by ddd-define)_";

const DOC = `Rules (artifact-contract.md section 5):
- glossary.md lives at <ddd-dir>/glossary.md (default: next to the ddd folder that holds
  02-discover/, i.e. two levels up from discover.json).
- Only the '## Shared' section is rewritten. Every other section (per-context sections that
  ddd-define adds later, hand-written notes) is preserved byte for byte.
- Terms already in the Shared section but absent from discover.json are kept at the end and
  reported, so a hand edit is never dropped silently.
- Entries whose 'context' is not null are skipped with a note: discover seeds system-wide terms only.
- The placeholder line '_(seeded by ddd-discover, refined by ddd-define)_' is dropped.`;

// One Shared line. A plain hyphen: TERM_RE reads -/–/—, so files written earlier still
// parse and repos with a no-em-dash house style are not silently violated.
function fmt(entry) {
  const term = pyStr(get(entry, "term", "")).trim();
  const definition = pyStr(get(entry, "definition", "")).trim();
  const avoid = listOr(get(entry, "avoid")).map((a) => pyStr(a).trim()).filter(Boolean);
  let line = `**${term}** - ${definition}`;
  if (avoid.length) {
    if (definition && !".!?".includes(definition[definition.length - 1])) line += ".";
    line += " _Avoid_: " + avoid.join(", ");
  }
  return line;
}

// str.splitlines(): every line boundary Python recognises, no trailing empty line.
function splitlines(text) {
  const parts = text.split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

function splitSections(text) {
  const pre = [];
  const sections = [];
  let cur = null;
  for (const ln of splitlines(text)) {
    if (ln.startsWith("## ")) { cur = [ln, []]; sections.push(cur); }
    else if (cur === null) pre.push(ln);
    else cur[1].push(ln);
  }
  return [pre, sections];
}

function trim(lines) {
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  while (lines.length && !lines[0].trim()) lines.shift();
  return lines;
}

const SPEC = {
  options: {
    "--glossary": { dest: "glossary" },
    "--title": { dest: "title" },
    "--dry-run": { dest: "dry_run", action: "store_true" },
  },
  positionals: [{ dest: "discover_json" }],
};

export async function main(argv) {
  return runCommand({
    prog: "ddd discover glossary",
    usage: "<discover.json> [--glossary <ddd/glossary.md>] [--title \"Project title\"] [--dry-run]",
    doc: DOC, spec: SPEC,
  }, argv, (a) => {
    const err = (s) => process.stderr.write(s);
    const { doc: d, error } = readJson(a.discover_json);
    if (error !== undefined) { err(`error: cannot read ${a.discover_json}: ${error}\n`); return 2; }
    const gpath = truthy(a.glossary) ? a.glossary : path.join(path.dirname(path.dirname(path.resolve(a.discover_json))), "glossary.md");
    const title = manifestTitle(path.dirname(path.resolve(gpath)), a.title);

    const entries = [];
    const skipped = [];
    for (const g of listOr(get(isDict(d) ? d : {}, "glossary"))) {
      if (!isDict(g) || !truthy(get(g, "term"))) continue;
      const ctx = get(g, "context");
      (ctx === null || ctx === "" ? entries : skipped).push(g);
    }

    let pre;
    let sections;
    if (fs.existsSync(gpath)) {
      try {
        [pre, sections] = splitSections(fs.readFileSync(gpath, "utf8"));
      } catch (e) {
        err(`error: cannot read ${gpath}: ${e.message}\n`);
        return 2;
      }
    } else {
      pre = [`# Ubiquitous language: ${title}`, ""];
      sections = [];
    }
    if (!pre.some((ln) => ln.startsWith("# "))) pre = [`# Ubiquitous language: ${title}`, "", ...pre];

    let shared = sections.find((s) => s[0].slice(3).trim().toLowerCase() === "shared") ?? null;
    if (shared === null) {
      shared = ["## Shared", []];
      sections.unshift(shared);
    }

    const notes = [];
    // A Map so a term such as "42" keeps its place, as a Python dict would.
    const existing = new Map();
    let seenTerm = false;
    for (const ln of shared[1]) {
      if (ln.trim() === PLACEHOLDER) continue; // the stand-in line; real terms replace it
      const m = TERM_RE.exec(ln.trim());
      if (m) {
        existing.set(m[1].trim().toLowerCase(), ln.replace(/\s+$/, ""));
        seenTerm = true;
      } else if (ln.trim() && !seenTerm) {
        notes.push(ln.replace(/\s+$/, ""));
      }
    }
    const newTerms = new Set(entries.map((e) => pyStr(e.term).trim().toLowerCase()));
    const kept = [...existing].filter(([k]) => !newTerms.has(k)).map(([, v]) => v);

    const body = [...notes];
    if (body.length) body.push("");
    body.push(...entries.map(fmt));
    if (kept.length) body.push("", ...kept);
    shared[1] = body;

    const out = [...trim([...pre]), ""];
    for (const [heading, lines] of sections) {
      out.push(heading, ...trim([...lines]), "");
    }
    const text = out.join("\n").replace(/\n+$/, "") + "\n";

    if (a.dry_run) {
      process.stdout.write(text);
    } else {
      try {
        fs.mkdirSync(path.dirname(path.resolve(gpath)) || ".", { recursive: true });
        fs.writeFileSync(gpath, text);
      } catch (e) {
        err(`error: cannot write ${gpath}: ${e.message}\n`);
        return 2;
      }
      process.stdout.write(`wrote ${path.resolve(gpath)}: ${entries.length} shared terms\n`);
    }
    for (const k of kept) err(`note: kept from previous glossary (not in discover.json): ${k}\n`);
    for (const g of skipped) err(`note: skipped '${pyStr(get(g, "term"))}' (context=${pyRepr(get(g, "context"))}; discover seeds only context null)\n`);
    if (!entries.length) err("note: discover.json has no glossary entries - the Shared section is empty\n");
    return 0;
  });
}

export default main;
