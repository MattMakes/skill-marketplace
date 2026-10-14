// Pre-fill the DEFINE step (bounded context canvases) from the upstream DDD artifacts.
//
//   ddd define prefill [ddd-dir] [--write] [--context ID ...] [--mode interactive|auto]
//                      [--depth light|standard|deep] [--print] [--json]
//
// A line-for-line port of prefill.py. Reads decompose / connect / strategize / organise /
// discover / understand JSON, manifest.json and glossary.md and writes BRIEFS to
// <ddd-dir>/07-define/.prefill/: system.md (system facts, the generated C4Context block,
// the pre-fill's own envelope entries) and one <context>.md per bounded context with every
// fact its canvas is assembled from. stdout is a short index; --print echoes the selected
// briefs. The .prefill/ folder is scaffolding: `define render` removes it after a full
// render; re-run this command to regenerate it.
//
// With --write it also creates or refreshes <ddd-dir>/07-define/define.json as a DRAFT:
// deterministic fields are filled from upstream, judgement fields are left as "TODO ..." /
// "[draft ...]" markers which render refuses until a human or the skill replaces them, and
// the pre-fill's own guesses become envelope assumptions cited on the canvases they apply
// to. Re-running merges: judgement fields already written are kept, deterministic fields
// are refreshed, contexts that disappeared from decompose.json move to "deprecated".
//
// Parity notes. The goldens compare stdout, stderr, exit code and every written file with
// the Python twin, JSON structurally (key order included), Markdown byte for byte. So this
// file keeps the Python semantics that leak into output: dict/OrderedDict insertion order
// (Maps where data keys could look numeric), `None`/`True`/`False` spelling in f-strings,
// list repr in messages, `.get(k, default)` returning a present null, empty-collection
// falsiness, code-point string lengths, textwrap.fill's exact wrapping and the
// round-half-even `.1f` of the brief sizes. Message wording is Python-era on purpose
// (design §6 ruling): leaf 1.4.1 rewords code and goldens together.
//
// Exit 0 = ok; a missing workspace/decompose.json or unknown context id exits 1 with the
// message on stderr, the way sys.exit("...") did. Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { ExitError, now } from "../../../shared/lib/manifest.mjs";

export const STEP_FILES = [
  ["understand", "01-understand/understand.json"],
  ["discover", "02-discover/discover.json"],
  ["decompose", "03-decompose/decompose.json"],
  ["strategize", "04-strategize/strategize.json"],
  ["connect", "05-connect/connect.json"],
  ["organise", "06-organise/organise.json"],
  ["define", "07-define/define.json"],
];
const DOMAIN_RANK = { core: 3, supporting: 2, generic: 1 };
const EVOLUTION_RANK = { genesis: 0, custom: 1, product: 2, commodity: 3 };
export const PATTERNS = new Set(["partnership", "shared-kernel", "customer-supplier", "conformist", "anticorruption-layer",
  "open-host-service", "published-language", "separate-ways", "big-ball-of-mud"]);
export const JUDGEMENT_KEYS = ["purpose", "domain_roles", "domain_roles_rationale", "business_decisions",
  "assumptions", "verification_metrics", "open_questions", "model_traits", "read_models"];
export const TODO = "TODO";
// connect.integration_patterns[].mechanism -> [via, sync] for a context edge no flow step drew
const MECHANISM_VIA = { "in-process-call": ["in-process", true], "sync-api": ["http", true], "async-events": ["message-bus", false],
  "shared-db": ["db", false], batch: ["file", false] };
const CARRY_CAP = 15; // carried upstream assumptions/questions per canvas before collapsing into a count
const WRAP = 110; // brief line width
const DASHES = "‐‑‒–—―−";
const C4_ELEMENTS = new Set(["Person", "Person_Ext", "System", "System_Ext", "SystemDb", "SystemQueue", "SystemDb_Ext", "SystemQueue_Ext",
  "Container", "Container_Ext", "ContainerDb", "ContainerQueue", "Component"]);
const C4_BOUNDARIES = new Set(["Boundary", "Enterprise_Boundary", "System_Boundary", "Container_Boundary"]);
const C4_RELS = new Set(["Rel", "BiRel", "Rel_U", "Rel_D", "Rel_L", "Rel_R", "Rel_Up", "Rel_Down", "Rel_Left", "Rel_Right", "Rel_Back"]);
const C4_OTHER = new Set(["UpdateLayoutConfig", "UpdateElementStyle", "UpdateRelStyle"]);

// ---------------------------------------------------------------- Python semantics helpers
// The output-visible corners of Python that JavaScript spells differently. Every
// interpolation of an upstream value goes through pystr so an absent or null field prints
// `None` exactly where the Python did.
export function truthy(v) {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v instanceof Map || v instanceof Set) return v.size > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

export function isDict(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// dict.get(k, default): the default only when the key is absent; a present null stays null.
export function get(o, k, d = null) {
  if (isDict(o) && Object.prototype.hasOwnProperty.call(o, k)) return o[k] === undefined ? null : o[k];
  return d;
}

// `a or b`: the first truthy operand, else the last one.
export function or(...vals) {
  for (let i = 0; i < vals.length - 1; i++) if (truthy(vals[i])) return vals[i];
  return vals[vals.length - 1];
}

export function pystr(v) {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return v;
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : pyfloat(v);
  return pyrepr(v);
}

function pyfloat(v) {
  if (!Number.isFinite(v)) return v > 0 ? "inf" : v < 0 ? "-inf" : "nan";
  const s = String(v);
  return /[.e]/.test(s) ? s.replace("e+", "e+").replace(/e([+-])(\d)$/, "e$10$2") : s + ".0";
}

// repr() for the values the scripts embed in messages: strings, numbers, booleans, None,
// lists, dicts. Strings take single quotes unless they contain one and no double quote.
export function pyrepr(v) {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return pystr(v);
  if (typeof v === "string") {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    let out = "";
    for (const ch of v) {
      const c = ch.codePointAt(0);
      if (ch === "\\") out += "\\\\";
      else if (ch === q) out += "\\" + q;
      else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else if (c < 0x20 || c === 0x7f) out += "\\x" + c.toString(16).padStart(2, "0");
      else out += ch;
    }
    return q + out + q;
  }
  if (Array.isArray(v)) return "[" + v.map(pyrepr).join(", ") + "]";
  if (v instanceof Map) return "{" + [...v].map(([k, x]) => `${pyrepr(k)}: ${pyrepr(x)}`).join(", ") + "}";
  if (v instanceof Set) return v.size ? "{" + [...v].map(pyrepr).join(", ") + "}" : "set()";
  return "{" + Object.entries(v).map(([k, x]) => `${pyrepr(k)}: ${pyrepr(x)}`).join(", ") + "}";
}

// Python compares strings by code point; JS's default sort compares UTF-16 units.
export function pycmp(a, b) {
  const A = String(a), B = String(b);
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    const x = A.codePointAt(i), y = B.codePointAt(j);
    if (x !== y) return x < y ? -1 : 1;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return (A.length - i) - (B.length - j) < 0 ? -1 : (A.length - i) - (B.length - j) > 0 ? 1 : 0;
}

export function sortedUnique(items) {
  return [...new Set(items)].sort(pycmp);
}

export function plen(s) {
  return [...String(s)].length;
}

export function pyslice(s, n) {
  return [...String(s)].slice(0, n).join("");
}

const PYSPACE = "\\t\\n\\v\\f\\r \\x1c-\\x1f\\x85\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const RE_SPACE_RUN = new RegExp(`[${PYSPACE}]+`, "g");
const RE_SPLIT_WS = new RegExp(`([${PYSPACE}]+)`);
const RE_STRIP = new RegExp(`^[${PYSPACE}]+|[${PYSPACE}]+$`, "g");
const RE_RSTRIP = new RegExp(`[${PYSPACE}]+$`);
const RE_LSTRIP = new RegExp(`^[${PYSPACE}]+`);

export function pystrip(s) {
  return String(s).replace(RE_STRIP, "");
}
export function pyrstrip(s, chars) {
  if (chars === undefined) return String(s).replace(RE_RSTRIP, "");
  const set = new Set([...chars]);
  const a = [...String(s)];
  let end = a.length;
  while (end > 0 && set.has(a[end - 1])) end--;
  return a.slice(0, end).join("");
}
export function pylstrip(s) {
  return String(s).replace(RE_LSTRIP, "");
}
export function pystripChars(s, chars) {
  const set = new Set([...chars]);
  const a = [...String(s)];
  let start = 0, end = a.length;
  while (start < end && set.has(a[start])) start++;
  while (end > start && set.has(a[end - 1])) end--;
  return a.slice(start, end).join("");
}

// str.splitlines(): every line boundary Python knows, no trailing empty string.
export function splitlines(s) {
  if (s === "" || s === null || s === undefined) return [];
  const parts = String(s).split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// open(..., "r") in text mode: universal newlines on read.
function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
}

export function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Python's `\w` is any Unicode letter, digit or underscore.
const W = "\\p{L}\\p{N}_";

// textwrap.fill(text, width=110, subsequent_indent=indent, break_long_words=False,
// break_on_hyphens=False) with the defaults expand_tabs, replace_whitespace and
// drop_whitespace. Chunks are words and whitespace runs; a run inside a line survives, one
// at a line boundary is dropped (except at the very start of the text), and a word longer
// than the width goes alone on its own line.
export function fill(text, width, subsequentIndent) {
  let t = expandTabs(String(text));
  t = t.replace(/[\t\n\v\f\r]/g, " ");
  const chunks = t.split(RE_SPLIT_WS).filter((c) => c !== "").reverse();
  const lines = [];
  const isBlank = (c) => pystrip(c) === "";
  while (chunks.length) {
    const curLine = [];
    let curLen = 0;
    const indent = lines.length ? subsequentIndent : "";
    const w = width - plen(indent);
    if (isBlank(chunks[chunks.length - 1]) && lines.length) chunks.pop();
    while (chunks.length) {
      const l = plen(chunks[chunks.length - 1]);
      if (curLen + l <= w) { curLine.push(chunks.pop()); curLen += l; } else break;
    }
    if (chunks.length && plen(chunks[chunks.length - 1]) > w && !curLine.length) {
      curLine.push(chunks.pop());
    }
    if (curLine.length && isBlank(curLine[curLine.length - 1])) curLine.pop();
    if (curLine.length) lines.push(indent + curLine.join(""));
  }
  return lines.join("\n");
}

function expandTabs(s) {
  let out = "", col = 0;
  for (const ch of s) {
    if (ch === "\t") { const n = 8 - (col % 8); out += " ".repeat(n); col += n; }
    else if (ch === "\n" || ch === "\r") { out += ch; col = 0; }
    else { out += ch; col++; }
  }
  return out;
}

// `os.path.join(a, b)`: an absolute second part wins.
export function pyjoin(a, b) {
  return path.isAbsolute(b) ? b : path.join(a, b);
}

// f"{bytes / 1024:.1f}" is round-half-even on the exact quotient; done in integers so a
// tie (remainder exactly 512 of 1024) rounds the way Python does, not the way toFixed does.
export function kb1(bytes) {
  const q10 = bytes * 10;
  let n = Math.floor(q10 / 1024);
  const r = q10 - n * 1024;
  if (r > 512 || (r === 512 && n % 2 === 1)) n++;
  return `${Math.floor(n / 10)}.${n % 10}`;
}

// Order-insensitive deep equality (Python dict ==), used for the `deprecated` check.
function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isDict(a) && isDict(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

export function isTodo(v) {
  const s = typeof v === "string" ? v : JSON.stringify(v === undefined ? null : v);
  return s.includes(TODO) || s.includes("[draft");
}

// ---------------------------------------------------------------- workspace
export function loadWorkspace(dddDirIn) {
  const dddDir = path.resolve(dddDirIn);
  if (!fs.existsSync(dddDir) || !fs.statSync(dddDir).isDirectory()) {
    throw new ExitError(`error: ${dddDir} does not exist`);
  }
  const ws = { ddd_dir: dddDir, manifest: {}, steps: {}, inputs: [], glossary_md: null };
  const mpath = path.join(dddDir, "manifest.json");
  if (fs.existsSync(mpath)) ws.manifest = JSON.parse(readText(mpath));
  const rel = or(pystripChars(or(get(ws.manifest, "ddd_dir"), path.basename(dddDir)), "/"), "ddd");
  ws.rel = rel;
  const suffix = path.sep + rel.split("/").join(path.sep);
  ws.project_root = dddDir.endsWith(suffix) ? dddDir.slice(0, dddDir.length - suffix.length) : path.dirname(dddDir);
  if (ws.project_root === "") ws.project_root = path.sep;
  for (const [step, fname] of STEP_FILES) {
    const p = path.join(dddDir, fname);
    if (fs.existsSync(p)) {
      ws.steps[step] = JSON.parse(readText(p));
      if (step !== "define") ws.inputs.push(`${rel}/${fname}`);
    }
  }
  if (truthy(ws.manifest)) ws.inputs.push(`${rel}/manifest.json`);
  const gpath = path.join(dddDir, "glossary.md");
  if (fs.existsSync(gpath)) {
    ws.glossary_md = readText(gpath);
    ws.inputs.push(`${rel}/glossary.md`);
  }
  return ws;
}

// {section: [ {term, definition, avoid[]} ]} as a Map; sections are 'Shared' and '<Name> context'.
export function parseGlossary(text) {
  const sections = new Map();
  let current = null;
  for (const line of splitlines(text || "")) {
    let m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      current = pystrip(m[1]);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    m = line.match(/^\*\*(.+?)\*\*\s*[—–-]+\s*(.*)$/);
    if (m && current !== null) {
      const term = pystrip(m[1]);
      let rest = pystrip(m[2]);
      let avoid = [];
      const am = rest.match(/_Avoid_:\s*(.*)$/);
      if (am) {
        avoid = am[1].split(",").map((a) => pystrip(a)).filter((a) => a);
        rest = pystrip(rest.slice(0, am.index));
      }
      sections.get(current).push({ term, definition: pyrstrip(rest, " ."), avoid });
    }
  }
  return sections;
}

export function byId(items, key = "id") {
  const out = new Map();
  for (const x of items || []) {
    if (isDict(x) && get(x, key) !== null) out.set(x[key], x);
  }
  return out;
}

// Mermaid alias from an id: alphanumeric/underscore only (never derived from a title).
export function alias(s) {
  const a = pystr(s).replace(/[^A-Za-z0-9_]/g, "_");
  return (!a || /^[0-9]/.test(a)) ? "x_" + a : a;
}

// Text safe inside a double-quoted mermaid C4 label: dashes -> '-', quotes -> ', no HTML/brace/
// comment markers or control characters. Digits, parentheses, semicolons and commas are kept.
export function label(s) {
  s = pystr(or(s, ""));
  for (const d of DASHES) s = s.split(d).join("-");
  s = s.split('"').join("'").split("`").join("'").split("%%").join("%");
  s = s.replace(/[<>{}\x00-\x1f]/g, " ");
  return pystrip(s.replace(RE_SPACE_RUN, " "));
}

// True when text names one of the needles as a whole word (case-insensitive, singular or plural).
export function names(text, needles) {
  const t = or(text, "");
  for (let n of needles) {
    n = pystrip(or(n, ""));
    if (plen(n) < 2) continue;
    const stem = (n.toLowerCase().endsWith("s") && plen(n) > 3) ? [...n].slice(0, -1).join("") : n;
    if (new RegExp(`(?<![${W}-])${escapeRe(stem)}(?:e?s)?(?![${W}-])`, "iu").test(t)) return true;
  }
  return false;
}

// Case-insensitive identity of a term; a trailing parenthetical does not make a new term.
export function termKey(term) {
  return pystrip(pystr(or(term, "")).replace(/\s*\([^\n]*\)\s*$/, "")).toLowerCase();
}

export function wrap(text, indent = "  ") {
  return fill(text, WRAP, indent);
}

// {id: {name, kind}} for every party a canvas may name: bounded contexts, actors, external
// systems, connect parties.
export function partyIndex(ws) {
  const S = ws.steps;
  const idx = new Map();
  const uActors = byId(get(or(S.understand, {}), "actors"));
  for (const b of get(or(S.decompose, {}), "bounded_contexts", [])) idx.set(b.id, { name: or(get(b, "name"), b.id), kind: "context" });
  for (const a of get(or(S.discover, {}), "actors", [])) {
    const ua = or(uActors.get(or(get(a, "from_understand"), get(a, "id"))), {});
    idx.set(a.id, { name: or(get(a, "name"), a.id), kind: get(ua, "kind") === "system" ? "system-actor" : "actor" });
  }
  for (const a of uActors.values()) {
    if (!idx.has(a.id)) idx.set(a.id, { name: or(get(a, "name"), a.id), kind: get(a, "kind") === "system" ? "system-actor" : "actor" });
  }
  for (const e of get(or(S.discover, {}), "external_systems", [])) idx.set(e.id, { name: or(get(e, "name"), e.id), kind: "external" });
  for (const p of get(or(S.connect, {}), "parties", [])) {
    if (!idx.has(p.id)) idx.set(p.id, { name: or(get(p, "name"), p.id), kind: get(p, "kind") === "external-system" ? "external" : "actor" });
  }
  return idx;
}

// ---------------------------------------------------------------- C4 helpers
// Split 'a, "b, c", d' on top-level commas (quote-aware); returns the args without their quotes.
function splitArgs(s) {
  const out = [];
  let cur = "", q = false;
  for (const ch of s) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(pystrip(cur)); cur = ""; }
    else cur += ch;
  }
  out.push(pystrip(cur));
  return out;
}

// Does the C4Context block round-trip? One System, valid unique aliases, no empty labels,
// balanced quotes, every Rel endpoint declared. Returns [errors, warnings].
export function lintC4(block) {
  const errors = [], warnings = [];
  const lines = splitlines(pystr(or(block, ""))).map((l) => pystrip(l)).filter((l) => l);
  if (!lines.length || lines[0] !== "C4Context") return [["must start with 'C4Context'"], warnings];
  const parsed = [];
  for (let k = 1; k < lines.length; k++) {
    const i = k + 1, l = lines[k];
    if (l.startsWith("title ") || l === "}") continue;
    const m = l.match(/^([A-Za-z_]+)\s*\(([^\n]*)\)\s*\{?$/);
    if (!m) { errors.push(`line ${i}: cannot parse '${pyslice(l, 70)}'`); continue; }
    const kw = m[1], raw = m[2];
    if ((raw.split('"').length - 1) % 2) { errors.push(`line ${i}: unbalanced quotes in ${kw}(…)`); continue; }
    parsed.push([i, kw, splitArgs(raw)]);
  }
  const declared = new Map();
  let systems = 0;
  for (const [i, kw, args] of parsed) {
    if (C4_ELEMENTS.has(kw) || C4_BOUNDARIES.has(kw)) {
      const a = args.length ? args[0] : "";
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(a)) errors.push(`line ${i}: alias '${a}' must be alphanumeric/underscore`);
      if (declared.has(a)) errors.push(`line ${i}: alias '${a}' declared twice`);
      declared.set(a, kw);
      if (args.length < 2 || !args[1]) errors.push(`line ${i}: ${kw}(${a}) has an empty label`);
      systems += kw === "System" ? 1 : 0;
    }
  }
  for (const [i, kw, args] of parsed) {
    if (C4_RELS.has(kw)) {
      if (args.length < 3 || !args[2]) errors.push(`line ${i}: ${kw}(${args.slice(0, 2).join(", ")}) has no label`);
      for (const end of args.slice(0, 2)) {
        if (!declared.has(end)) errors.push(`line ${i}: ${kw} endpoint '${end}' is not a declared element`);
      }
    } else if (!C4_ELEMENTS.has(kw) && !C4_BOUNDARIES.has(kw) && !C4_OTHER.has(kw)) {
      warnings.push(`line ${i}: unknown keyword '${kw}'`);
    }
  }
  if (systems === 0) errors.push("no System(...) — the system in scope must be one box");
  else if (systems > 1) warnings.push(`${systems} System(...) boxes — level 1 shows the whole product as one`);
  return [errors, warnings];
}

// Keep an existing C4Context block's manual additions, add whatever the fresh generation has
// that it lacks. The System box follows the fresh alias (old Rel lines are rewritten to it).
export function mergeC4(oldBlock, newBlock) {
  if (!truthy(oldBlock) || !pylstrip(pystr(oldBlock)).startsWith("C4Context")) return newBlock;
  const split = (block) => {
    const header = [], elements = [], rels = [];
    for (const line of splitlines(pystr(block))) {
      const s = pystrip(line);
      if (!s) continue;
      if (s.startsWith("C4Context") || s.startsWith("title")) header.push(line);
      else if (s.startsWith("Rel") || s.startsWith("BiRel")) rels.push(line);
      else elements.push(line);
    }
    return [header, elements, rels];
  };
  const sysAlias = (elements) => {
    for (const l of elements) {
      const m = l.match(/^\s*System\(\s*([A-Za-z0-9_]+)/);
      if (m) return m[1];
    }
    return null;
  };
  const [nh, ne, nr] = split(newBlock);
  let [oh, oe, orl] = split(oldBlock);
  const oldSys = sysAlias(oe), newSys = sysAlias(ne);
  if (oldSys && newSys && oldSys !== newSys) {
    oe = oe.filter((l) => !/^\s*System\(/.test(l));
    const re = new RegExp(`(?<![A-Za-z0-9_])${escapeRe(oldSys)}(?![A-Za-z0-9_])`, "g");
    orl = orl.map((l) => l.replace(re, newSys));
  }
  const key = (l) => l.split(",")[0].replace(RE_SPACE_RUN, "");
  const relKey = (l) => l.split(",").slice(0, 2).join(",").replace(RE_SPACE_RUN, "");
  const oeKeys = new Set(oe.map(key));
  const orlKeys = new Set(orl.map(relKey));
  const elements = [...oe, ...ne.filter((l) => !oeKeys.has(key(l)))];
  const rels = [...orl, ...nr.filter((l) => !orlKeys.has(relKey(l)))];
  return [...(nh.length ? nh : oh), ...elements, ...rels].join("\n");
}

// ---------------------------------------------------------------- facts
const EMPTY = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const same = (a, b) => (a ?? null) === (b ?? null);

export function buildFacts(ws) {
  const S = ws.steps;
  const dc = S.decompose;
  if (!truthy(dc)) throw new ExitError("error: 03-decompose/decompose.json missing — run ddd-decompose first (modes.md §0)");
  const cn = or(S.connect, {}), st = or(S.strategize, {}), org = or(S.organise, {});
  const di = or(S.discover, {}), un = or(S.understand, {});
  const warnings = [];
  if (!truthy(S.connect)) warnings.push("connect.json missing — inbound/outbound derived from discover only (record as an assumption)");
  if (!truthy(st)) warnings.push("strategize.json missing — strategic classification left as TODO");
  if (!truthy(org)) warnings.push("organise.json missing — owning team / deployable unknown");

  const subs = byId(get(dc, "subdomains"));
  const bcs = get(dc, "bounded_contexts", []);
  const bcIds = bcs.map((b) => b.id);
  const rels = get(dc, "relationships", []);
  const cls = new Map();
  for (const c of get(st, "classifications", [])) cls.set(get(c, "subdomain"), c);
  const events = byId(get(di, "events")), commands = byId(get(di, "commands"));
  const policies = byId(get(di, "policies")), aggs = byId(get(di, "aggregate_candidates"));
  const readModels = get(di, "read_models", []), hotspots = get(di, "hotspots", []), scenarios = get(di, "scenarios", []);
  const dActors = byId(get(di, "actors")), dExt = byId(get(di, "external_systems"));
  const cnParties = byId(get(cn, "parties"));
  const uActors = byId(get(un, "actors"));
  const caps = byId(get(un, "capabilities")), goals = get(un, "goals", []), constraints = get(un, "constraints", []);
  const cnMsgs = byId(get(cn, "messages"));
  const mechByRel = new Map();
  for (const p of get(cn, "integration_patterns", [])) if (truthy(get(p, "relationship"))) mechByRel.set(get(p, "relationship"), get(p, "mechanism"));
  const teams = get(org, "teams", []), deps = get(org, "deployables", []);
  const deployableOf = new Map();
  for (const d of deps) for (const c of get(d, "contexts", [])) deployableOf.set(c, get(d, "id"));
  const glossary = parseGlossary(ws.glossary_md);
  const dGloss = new Map();
  for (const g of get(di, "glossary", [])) if (truthy(get(g, "term"))) dGloss.set(get(g, "term"), g);

  const ownerE = new Map(), ownerC = new Map();
  for (const b of bcs) {
    for (const e of get(b, "owns_events", [])) ownerE.set(e, b.id);
    for (const c of get(b, "owns_commands", [])) ownerC.set(c, b.id);
  }

  const partyKind = (pid) => {
    if (bcIds.includes(pid)) return "context";
    if (dExt.has(pid)) return "external";
    if (dActors.has(pid) || uActors.has(pid)) {
      const a = or(uActors.get(or(get(or(dActors.get(pid), {}), "from_understand"), pid)), uActors.get(pid), {});
      return get(a, "kind") === "system" ? "system-actor" : "actor";
    }
    if (cnParties.has(pid)) return get(cnParties.get(pid), "kind") === "external-system" ? "external" : "actor";
    return "unknown";
  };

  const partyName = (pid) => {
    for (const src of [dActors, dExt, uActors, cnParties]) {
      if (src.has(pid)) return or(get(src.get(pid), "name"), pid);
    }
    for (const b of bcs) if (b.id === pid) return or(get(b, "name"), pid);
    return pid;
  };

  const relBetween = (up, down) => {
    for (const r of rels) if (same(get(r, "upstream"), up) && same(get(r, "downstream"), down)) return [get(r, "pattern"), get(r, "id"), "forward"];
    for (const r of rels) if (same(get(r, "upstream"), down) && same(get(r, "downstream"), up)) return [get(r, "pattern"), get(r, "id"), "reverse"];
    return [null, null, null];
  };

  const msgKind = (mid, hint = null) => {
    if (["command", "event", "query", "response"].includes(hint)) return hint;
    if (cnMsgs.has(mid) && truthy(get(cnMsgs.get(mid), "kind"))) return get(cnMsgs.get(mid), "kind");
    if (events.has(mid)) return "event";
    if (commands.has(mid)) return "command";
    return "query";
  };

  const msgName = (mid) => or(get(or(events.get(mid), commands.get(mid), {}), "name"), mid);

  const msgPayload = (mid) => {
    const m = or(cnMsgs.get(mid), {});
    return or(get(m, "payload"), get(or(events.get(mid), {}), "data"), []);
  };

  const facts = new Map();
  for (const b of bcs) {
    const X = b.id;
    const subObjs = get(b, "subdomains", []).filter((s) => subs.has(s)).map((s) => subs.get(s));
    const subCls = subObjs.filter((s) => cls.has(s.id)).map((s) => cls.get(s.id));
    // --- classification (merge across subdomains: highest domain rank wins, least evolved wins)
    let dom = null;
    if (subCls.length) {
      const types = subCls.map((c) => get(c, "type")).filter((t) => truthy(t));
      for (const t of types) if (dom === null || (DOMAIN_RANK[t] ?? 0) > (DOMAIN_RANK[dom] ?? 0)) dom = t;
    }
    let evo = null;
    const evos = subCls.map((c) => get(c, "evolution")).filter((e) => typeof e === "string" && e in EVOLUTION_RANK);
    for (const e of evos) if (evo === null || EVOLUTION_RANK[e] < EVOLUTION_RANK[evo]) evo = e;
    const patterns = sortedUnique(subCls.map((c) => get(c, "implementation_pattern")).filter((p) => truthy(p)));
    const sourcing = sortedUnique(subCls.map((c) => get(c, "sourcing")).filter((p) => truthy(p)));
    const investment = sortedUnique(subCls.map((c) => get(c, "investment")).filter((p) => truthy(p)));
    const team = teams.find((t) => get(t, "owns_contexts", []).includes(X)) ?? null;
    const dep = deps.find((d) => get(d, "contexts", []).includes(X)) ?? null;

    // --- inbound / outbound (one row per collaborator x message; responses fold into their request row)
    const inb = new Map(), outb = new Map();
    const notes = new Map(); // text -> kind (assumption | question | note); deduped, insertion-ordered
    const note = (kind, text) => { if (!notes.has(text)) notes.set(text, kind); };
    const store = (side) => (side === "in" ? inb : outb);
    const find = (side, collab, mid) => {
      for (const m of get(or(store(side).get(collab), {}), "messages", [])) if (same(m.id, mid)) return m;
      return null;
    };
    // Record a message row and return it; an existing row only gains the extras it lacks.
    // `extra` is an ordered list of [key, value] pairs, as the Python kwargs were.
    const add = (side, collab, mid, hint = null, extra = []) => {
      if (collab === null || collab === undefined || mid === null || mid === undefined || collab === X) return null;
      let m = find(side, collab, mid);
      if (m !== null) {
        for (const [k, v] of extra) if (!EMPTY(v) && !(k in m)) m[k] = v;
        return m;
      }
      if (!store(side).has(collab)) store(side).set(collab, { collaborator: collab, messages: [] });
      const entry = store(side).get(collab);
      m = { id: mid, kind: msgKind(mid, hint), name: msgName(mid) };
      const payload = msgPayload(mid);
      if (truthy(payload)) m.payload = payload;
      const cm = or(cnMsgs.get(mid), {});
      if (truthy(get(cm, "delivery"))) m.delivery = get(cm, "delivery");
      for (const [k, v] of extra) if (!EMPTY(v)) m[k] = v;
      entry.messages.push(m);
      return m;
    };

    for (const m of get(cn, "messages", [])) { // producer -> consumers
      if (same(get(m, "producer"), X)) {
        for (const c of get(m, "consumers", [])) add("out", c, get(m, "id"), get(m, "kind"), [["source", "connect.messages"]]);
      }
      if (get(m, "consumers", []).includes(X)) add("in", get(m, "producer"), get(m, "id"), get(m, "kind"), [["source", "connect.messages"]]);
    }
    for (const f of get(cn, "flows", [])) {
      const prev = [];
      for (const s of get(f, "steps", [])) {
        const frm = get(s, "from"), to = get(s, "to"), mid = get(s, "message"), kind = get(s, "kind");
        const src = `flow ${pystr(get(f, "id"))}`;
        if (kind === "response") {
          const rev = [...prev].reverse();
          const req = rev.find((p) => same(get(p, "from"), to) && same(get(p, "to"), frm) && ["command", "query"].includes(get(p, "kind")))
            ?? rev.find((p) => same(get(p, "from"), to) && same(get(p, "to"), frm)) ?? null;
          if (same(frm, X) || same(to, X)) {
            if (req === null) {
              note("question", `${src} step ${pystr(get(s, "seq"))}: response '${pystr(mid)}' has no request step ${pystr(to)}→${pystr(frm)} before it — not recorded; fix the flow in ddd-connect`);
            } else {
              const side = same(get(req, "to"), X) ? "in" : "out";
              const collab = side === "in" ? get(req, "from") : get(req, "to");
              const target = find(side, collab, get(req, "message"))
                ?? add(side, collab, get(req, "message"), get(req, "kind"), [["via", get(req, "via")], ["sync", get(req, "sync")], ["source", src]]);
              if (target !== null && !("response" in target)) {
                target.response = { id: mid, name: msgName(mid), payload: msgPayload(mid) };
              }
            }
          }
          prev.push(s);
          continue;
        }
        if (same(to, X)) add("in", frm, mid, kind, [["via", get(s, "via")], ["sync", get(s, "sync")], ["source", src]]);
        if (same(frm, X)) {
          const actor = get(or(commands.get(mid), {}), "actor");
          if (kind === "command" && truthy(actor) && same(actor, to) && partyKind(to) === "actor") {
            add("in", to, mid, "command", [["via", get(s, "via")], ["sync", get(s, "sync")], ["source", src]]);
            note("assumption", `${src} step ${pystr(get(s, "seq"))} draws '${pystr(mid)}' ${X}→${pystr(to)}, but discover says ${pystr(to)} issues that command — recorded as inbound (producer → consumer)`);
          } else {
            add("out", to, mid, kind, [["via", get(s, "via")], ["sync", get(s, "sync")], ["source", src]]);
          }
        }
        prev.push(s);
      }
    }
    for (const cid of get(b, "owns_commands", [])) {
      const c = or(commands.get(cid), {});
      if (truthy(get(c, "actor"))) add("in", get(c, "actor"), cid, "command", [["source", "discover.commands"]]);
    }
    for (const p of policies.values()) {
      const when = get(p, "when"), owner = ownerE.get(when) ?? null;
      for (const cid of get(p, "then", [])) {
        if (same(ownerC.get(cid), X) && truthy(owner) && owner !== X) add("in", owner, when, "event", [["source", `policy ${pystr(get(p, "id"))}`]]);
        if (owner === X && truthy(ownerC.get(cid)) && ownerC.get(cid) !== X) add("out", ownerC.get(cid), when, "event", [["source", `policy ${pystr(get(p, "id"))}`]]);
      }
    }

    const contractOf = (side, collab) => {
      for (const m of store(side).get(collab).messages) {
        if (cnMsgs.has(m.id) && PATTERNS.has(get(cnMsgs.get(m.id), "contract"))) return get(cnMsgs.get(m.id), "contract");
      }
      return null;
    };
    const relationshipFor = (side, collab) => {
      const k = partyKind(collab);
      if (k === "context") {
        const [up, down] = side === "in" ? [collab, X] : [X, collab];
        const [pat, rid, direction] = relBetween(up, down);
        if (truthy(pat)) return [pat, rid, direction, null, null];
        const contract = contractOf(side, collab);
        if (contract) return [contract, null, null, "assumption", `relationship with ${pystr(collab)} taken from the connect message contract ('${contract}'); decompose has no relationship ${pystr(up)}→${pystr(down)}`];
        return ["unspecified", null, null, "note", `messages flow between ${pystr(up)} and ${pystr(down)} but decompose.json has no relationship between them — the canvas relationship is define's choice; ddd-decompose should adopt it`];
      }
      if (k === "external" || k === "system-actor") {
        const contract = contractOf(side, collab);
        if (contract) return [contract, null, null, null, null];
        const pat = dom === "core" ? "anticorruption-layer" : "conformist";
        return [pat, null, null, "assumption", `'${pat}' guessed for external system ${pystr(collab)} (core contexts protect their model; others conform) — confirm`];
      }
      if (k === "actor") return ["user-interaction", null, null, null, null];
      return ["unspecified", null, null, "question", `collaborator '${pystr(collab)}' is not a known context, actor, external system or connect party`];
    };

    for (const [side, st_] of [["in", inb], ["out", outb]]) {
      for (const [collab, entry] of st_) {
        const [pat, rid, direction, nkind, ntext] = relationshipFor(side, collab);
        entry.relationship = pat;
        entry.collaborator_kind = partyKind(collab);
        entry.collaborator_name = partyName(collab);
        if (truthy(rid)) entry.relationship_id = rid;
        if (direction === "reverse") entry.relationship_note = `decompose ${pystr(rid)} lists ${pystr(collab)} as downstream of ${X}; message direction is the other way — check`;
        if (truthy(ntext)) note(nkind, ntext);
        // via from the relationship's integration decision when no flow step drew the edge
        const mech = truthy(rid) ? (mechByRel.get(rid) ?? null) : null;
        if (entry.collaborator_kind === "context" && typeof mech === "string" && mech in MECHANISM_VIA) {
          const sameDep = (deployableOf.get(X) ?? null) !== null && same(deployableOf.get(X), deployableOf.get(collab));
          let [via, sync] = MECHANISM_VIA[mech];
          if (sameDep && (mech === "in-process-call" || mech === "async-events")) via = "in-process";
          for (const m of entry.messages) {
            if (!truthy(get(m, "via"))) {
              m.via = via;
              if (!("sync" in m)) m.sync = get(m, "kind") === "event" ? false : sync;
              m.via_source = `integration decision ${pystr(rid)} (${mech}${sameDep ? ", same deployable" : ""})`;
            }
          }
        }
      }
    }
    const outMsgIds = new Set();
    for (const en of outb.values()) for (const m of en.messages) outMsgIds.add(m.id);
    const unconsumed = get(b, "owns_events", []).filter((e) => !outMsgIds.has(e));

    // --- terms
    const terms = new Map();
    const putTerm = (term, definition, avoid = null, source = null) => {
      if (!truthy(term)) return;
      if (!terms.has(term)) terms.set(term, { term, definition: "", avoid: [], sources: [] });
      const t = terms.get(term);
      if (truthy(definition) && (!truthy(t.definition) || source === "decompose.bounded_contexts.terms" || source === "glossary.md context section")) t.definition = definition;
      for (const a of or(avoid, [])) if (!t.avoid.includes(a)) t.avoid.push(a);
      if (truthy(source) && !t.sources.includes(source)) t.sources.push(source);
    };

    for (const s of subObjs) {
      for (const term of get(s, "terms", [])) {
        const g = or(dGloss.get(term), {});
        const shared = (glossary.get("Shared") || []).find((e) => e.term === term) ?? null;
        putTerm(term, or(get(or(shared, {}), "definition"), get(g, "definition")), or(get(g, "avoid"), get(or(shared, {}), "avoid")),
          (truthy(shared) || truthy(g)) ? "shared glossary" : "decompose.subdomains.terms");
      }
    }
    for (const g of get(di, "glossary", [])) {
      if (same(get(g, "context"), X)) putTerm(get(g, "term"), get(g, "definition"), get(g, "avoid"), "discover.glossary (context-specific)");
    }
    for (const t of get(b, "terms", [])) putTerm(get(t, "term"), get(t, "meaning_here"), null, "decompose.bounded_contexts.terms");
    const bName = pystr(get(b, "name", ""));
    for (const [sec, entries] of glossary) {
      const low = sec.toLowerCase();
      if (low === `${bName.toLowerCase()} context` || low === `${X} context`) {
        for (const e of entries) putTerm(e.term, e.definition, e.avoid, "glossary.md context section");
      }
    }
    const keys = new Map();
    for (const t of terms.keys()) keys.set(termKey(t), t);
    for (const aid of get(b, "owns_aggregates", [])) {
      const a = or(aggs.get(aid), {});
      const an = get(a, "name");
      if (truthy(an) && !keys.has(termKey(an))) {
        putTerm(an, `${TODO}: define '${an}' as a concept (it is aggregate candidate ${pystr(aid)}: handles ` +
          `${or(get(a, "handles", []).join(", "), "—")}; emits ${or(get(a, "emits", []).join(", "), "—")}) — say what it IS here`,
        null, "discover.aggregate_candidates");
        keys.set(termKey(an), an);
      }
    }
    const seenKeys = new Map();
    for (const t of terms.values()) {
      const k = termKey(t.term);
      if (seenKeys.has(k)) {
        t.definition = `${TODO}: duplicate of '${seenKeys.get(k)}' (case or wording differs) — keep one term per concept: merge or rename`;
        t.sources.push("duplicate");
      } else {
        seenKeys.set(k, t.term);
      }
      if (!truthy(t.definition)) t.definition = `${TODO}: define '${t.term}' as used in this context`;
    }

    // --- decisions from policies (draft), hotspots, questions
    const decisions = [];
    for (const p of policies.values()) {
      const when = get(p, "when");
      for (const cid of get(p, "then", [])) {
        if (same(ownerC.get(cid), X)) {
          const src = ownerE.get(when) ?? null;
          const origin = truthy(src) && src !== X ? ` (event from ${pystr(src)})` : "";
          decisions.push(`[draft from policy ${pystr(get(p, "id"))}] Whenever '${pystr(msgName(when))}'${origin} → '${pystr(msgName(cid))}' (${pystr(get(p, "kind", "automatic"))})`);
        }
      }
    }
    const ownedIds = new Set([...get(b, "owns_events", []), ...get(b, "owns_commands", []), ...get(b, "owns_aggregates", [])]);
    const aggNames = get(b, "owns_aggregates", []).map((a) => get(or(aggs.get(a), {}), "name"));
    const needles = [X, get(b, "name", ""), ...terms.keys(), ...get(b, "owns_aggregates", []), ...aggNames.filter((n) => truthy(n))];
    const nearHotspots = hotspots.filter((h) => ownedIds.has(get(h, "near")) || names(get(h, "text"), [X, get(b, "name", "")]));
    const concerns = get(cn, "coupling_concerns", []).filter((c) => get(c, "contexts", []).includes(X));
    const myScenarios = scenarios.filter((s) => get(s, "events", []).some((e) => ownedIds.has(e)));
    let carriedA = [], carriedQ = [], otherA = 0, otherQ = 0;
    for (const [step, art] of Object.entries(S)) { // carry only what names this context (id, name, its terms, its aggregates)
      if (step === "define") continue;
      for (const a of get(art, "assumptions", [])) {
        if (names(get(a, "text"), needles)) carriedA.push(`[${step} ${pystr(get(a, "id"))}] ${pystr(get(a, "text"))} (confidence ${pystr(get(a, "confidence"))})`);
        else otherA++;
      }
      for (const q of get(art, "open_questions", [])) {
        if (names(get(q, "text"), needles)) carriedQ.push(`[${step} ${pystr(get(q, "id"))}${truthy(get(q, "blocking")) ? " — blocking" : ""}] ${pystr(get(q, "text"))}`);
        else otherQ++;
      }
    }
    for (const h of nearHotspots) carriedQ.push(`[discover ${pystr(get(h, "id"))} near ${pystr(get(h, "near"))} — ${pystr(get(h, "kind"))}] ${pystr(get(h, "text"))}`);
    for (const c of concerns) carriedQ.push(`[connect ${pystr(get(c, "id"))} — coupling, ${pystr(get(c, "severity"))}] ${pystr(get(c, "text"))}`);
    for (const [lst, what] of [[carriedA, "assumptions"], [carriedQ, "questions"]]) {
      if (lst.length > CARRY_CAP) {
        const extra = lst.length - CARRY_CAP;
        lst.length = CARRY_CAP;
        lst.push(`[upstream] … ${extra} more upstream ${what} name this context — see the step JSON files`);
      }
    }

    // --- goals, constraints, capabilities (for purpose / metrics / quality attributes)
    const actorIds = new Set();
    for (const c of get(b, "owns_commands", [])) if (commands.has(c) && truthy(get(commands.get(c), "actor"))) actorIds.add(get(commands.get(c), "actor"));
    const goalIds = new Set();
    for (const aid of actorIds) {
      const ua = uActors.get(or(get(or(dActors.get(aid), {}), "from_understand"), aid));
      if (truthy(ua)) for (const g of get(ua, "goals", [])) goalIds.add(g);
    }
    const myGoals = goals.filter((g) => goalIds.has(get(g, "id")));
    const myCaps = [];
    for (const s of subObjs) for (const c of get(s, "capabilities", [])) if (caps.has(c)) myCaps.push(caps.get(c));
    const myImpacts = get(un, "impacts", []).filter((i) => actorIds.has(get(i, "actor")));
    const rms = readModels.filter((r) => get(b, "owns_commands", []).includes(get(r, "informs")));
    const personCmds = get(b, "owns_commands", []).filter((c) => partyKind(get(or(commands.get(c), {}), "actor")) === "actor");
    let reactions = 0;
    for (const p of policies.values()) for (const cid of get(p, "then", [])) if (same(ownerC.get(cid), X)) reactions++;

    // --- domain-role suggestion from evidence (the skill must justify or change it)
    const ext = [];
    for (const c of [...inb.keys(), ...outb.keys()]) {
      if (["external", "system-actor"].includes(partyKind(c)) && !ext.includes(c)) ext.push(c);
    }
    const extDetail = [];
    for (const c of ext) {
      const ins = get(or(inb.get(c), {}), "messages", []).map((m) => m.id);
      const outs = get(or(outb.get(c), {}), "messages", []).map((m) => m.id);
      extDetail.push(`${pystr(c)} (` + [ins.length ? "in: " + ins.join(", ") : "", outs.length ? "out: " + outs.join(", ") : ""].filter((x) => x).join("; ") + ")");
    }
    const heur = sortedUnique(subObjs.flatMap((s) => get(s, "heuristics_applied", [])));
    const aggIds = get(b, "owns_aggregates", []);
    const evidence = `external systems as message endpoints: ${or(extDetail.join(", "), "none")}; decompose heuristics: ${or(heur.join(", "), "none")}; ` +
      `aggregates owned: ${or(aggIds.join(", "), "none")}; commands from people: ${personCmds.length} of ${get(b, "owns_commands", []).length}; ` +
      `policy reactions owned: ${reactions}; read models: ${rms.length}`;
    let roles = [], why = [];
    if (ext.length && !aggIds.length) {
      roles.push("gateway");
      why.push(`talks to ${ext.join(", ")} and owns no aggregate — an edge/translation context`);
    } else if (heur.includes("external-system") && !ext.length && !aggIds.length) {
      roles.push("gateway");
      why.push("decompose applied the external-system heuristic, but no external message endpoint is recorded — check connect");
    }
    if (aggIds.length || personCmds.length) {
      roles.push("execution-context");
      why.push(`owns ${or(aggIds.join(", "), "no aggregate")} and performs/tracks work through ${get(b, "owns_commands", []).length} command(s)` +
        (ext.length && aggIds.length ? `; also talks to ${ext.join(", ")} — an adapter inside the context, not a gateway role` : ""));
    }
    if (!truthy(get(b, "owns_commands")) && rms.length) {
      roles.push("analysis-context");
      why.push("no commands, only read models — monitors/reports");
    }
    if (!roles.length) { roles = ["other"]; why = ["no heuristic matched — choose from references/domain-roles.md"]; }

    facts.set(X, {
      id: X, name: or(get(b, "name"), X), rationale: get(b, "rationale", ""),
      subdomains: subObjs.map((s) => ({ id: s.id, name: get(s, "name"), description: get(s, "description", ""), rationale: get(s, "rationale", ""), heuristics_applied: get(s, "heuristics_applied", []) })),
      capabilities: myCaps.map((c) => ({ id: c.id, name: get(c, "name"), description: get(c, "description", ""), evolution: get(c, "evolution") })),
      classification: {
        domain: dom, evolution: evo, implementation_pattern: patterns, sourcing, investment,
        rationale: subCls.map((c) => get(c, "rationale")).filter((r) => truthy(r)),
        future_direction: subCls.map((c) => get(c, "future_direction")).filter((r) => truthy(r)),
      },
      team: truthy(team) ? { id: get(team, "id"), name: get(team, "name"), type: get(team, "type"), cognitive_load: get(team, "cognitive_load") } : null,
      deployable: truthy(dep) ? { id: get(dep, "id"), name: get(dep, "name"), kind: get(dep, "kind"), data_store: get(dep, "data_store"), independent_deploy: get(dep, "independent_deploy"), contexts: get(dep, "contexts", []), hosts_runtime_of: get(dep, "hosts_runtime_of", []) } : null,
      hosted_by: deps.filter((d) => get(d, "hosts_runtime_of", []).includes(X)).map((d) => get(d, "id")),
      owns_commands: get(b, "owns_commands", []).map((c) => ({ id: c, name: msgName(c), actor: get(or(commands.get(c), {}), "actor"), description: get(or(commands.get(c), {}), "description", "") })),
      owns_events: get(b, "owns_events", []).map((e) => ({ id: e, name: msgName(e), pivotal: get(or(events.get(e), {}), "pivotal", false), data: get(or(events.get(e), {}), "data", []), description: get(or(events.get(e), {}), "description", "") })),
      owns_aggregates: get(b, "owns_aggregates", []).map((a) => ({ id: a, name: get(or(aggs.get(a), {}), "name"), handles: get(or(aggs.get(a), {}), "handles", []), emits: get(or(aggs.get(a), {}), "emits", []) })),
      read_models: rms.map((r) => ({ id: get(r, "id"), name: get(r, "name"), informs: get(r, "informs"), used_by: get(r, "used_by") })),
      inbound: [...inb.values()], outbound: [...outb.values()], unconsumed_events: unconsumed,
      relationship_notes: [...notes].map(([t, k]) => ({ kind: k, text: t })),
      terms: [...terms.values()], draft_decisions: decisions,
      hotspots: nearHotspots, coupling_concerns: concerns, scenarios: myScenarios.map((s) => ({ id: get(s, "id"), name: get(s, "name") })),
      carried_assumptions: carriedA, carried_questions: carriedQ,
      uncarried: { assumptions: otherA, open_questions: otherQ },
      goals: myGoals, impacts: myImpacts, constraints,
      suggested_roles: roles, suggested_roles_why: why, role_evidence: evidence,
      independent_service_check: get(b, "independent_service_check", {}),
    });
  }

  const partiesCn = [...cnParties.values()].filter((p) => !dActors.has(p.id) && !dExt.has(p.id)).map((p) => ({
    id: p.id, name: or(get(p, "name"), p.id), kind: get(p, "kind") === "external-system" ? "external" : "actor",
    description: get(p, "description", ""), source: "connect.parties",
  }));
  const integration = {};
  for (const [k, v] of mechByRel) integration[k] = v;
  const system = {
    title: or(get(ws.manifest, "title"), get(or(get(un, "system"), {}), "name"), get(ws.manifest, "project"), "System"),
    project: or(get(ws.manifest, "project"), ""),
    one_liner: get(or(get(un, "system"), {}), "one_liner", ""),
    actors: [
      ...[...dActors.keys()].map((a) => ({ id: a, name: partyName(a), kind: partyKind(a), description: get(or(uActors.get(or(get(or(dActors.get(a), {}), "from_understand"), a)), {}), "description", "") })),
      ...partiesCn.filter((p) => p.kind === "actor"),
    ],
    external_systems: [
      ...[...dExt].map(([e, x]) => ({ id: e, name: or(get(x, "name"), e), description: get(x, "description", "") })),
      ...partiesCn.filter((p) => p.kind === "external"),
    ],
    existing_systems: get(un, "existing_systems", []),
    deployables: deps, teams, topology_style: get(org, "topology_style"),
    relationships: rels, integration, goals, constraints, warnings,
  };
  return [facts, system];
}

// ---------------------------------------------------------------- C4 context diagram
// C4Context from the canvases' rows: Persons/System_Exts by id, one System (alias = project
// slug), one Rel per party and direction (producer -> consumer); responses are not drawn.
export function c4Mermaid(facts, system) {
  const lines = ["C4Context", `  title System context - ${label(system.title)}`];
  const declared = new Map(); // party id -> alias
  const declare = (pid, kind, name, desc) => {
    if (declared.has(pid)) return;
    declared.set(pid, alias(pid));
    const kw = kind === "actor" ? "Person" : "System_Ext";
    lines.push(`  ${kw}(${declared.get(pid)}, "${or(label(name), pid)}", "${label(desc)}")`);
  };
  for (const a of system.actors) declare(a.id, a.kind, a.name, get(a, "description", ""));
  let sysAlias = or(alias(or(get(system, "project"), "system")), "system");
  while ([...declared.values()].includes(sysAlias)) sysAlias += "_system";
  lines.push(`  System(${sysAlias}, "${or(label(system.title), "System")}", "${label(get(system, "one_liner", ""))}")`);
  for (const e of system.external_systems) declare(e.id, "external", e.name, get(e, "description", ""));
  const relIn = new Map(), relOut = new Map();
  for (const f of facts.values()) {
    for (const [st_, target] of [[f.inbound, relIn], [f.outbound, relOut]]) {
      for (const entry of st_) {
        const kind = get(entry, "collaborator_kind");
        if (!["actor", "external", "system-actor"].includes(kind)) continue;
        const pid = entry.collaborator;
        declare(pid, kind === "actor" ? "actor" : "external", or(get(entry, "collaborator_name"), pid), "");
        for (const m of entry.messages) {
          if (get(m, "kind") === "response") continue;
          if (!target.has(pid)) target.set(pid, []);
          if (!target.get(pid).includes(m.name)) target.get(pid).push(m.name);
        }
      }
    }
  }
  for (const [p, msgs] of relIn) lines.push(`  Rel(${declared.get(p)}, ${sysAlias}, "${label(msgs.join(", "))}")`);
  for (const [p, msgs] of relOut) lines.push(`  Rel(${sysAlias}, ${declared.get(p)}, "${label(msgs.join(", "))}")`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- draft define.json
function draftCanvas(ws, f) {
  const X = f.id;
  const cl = f.classification;
  const dom = or(cl.domain, "supporting");
  let bm = dom === "core" ? "revenue-generator" : "cost-reducer";
  const blurb = [f.name, f.rationale, ...f.subdomains.map((s) => s.description)].map(pystr).join(" ");
  if (f.constraints.some((c) => names(get(c, "text"), ["compliance", "regulation", "regulatory", "audit", "tax", "gdpr", "consent", "safety", "legal"]) &&
    names(blurb, ["compliance", "regulation", "regulatory", "audit", "tax", "consent", "safety", "legal", "label"]))) {
    bm = "compliance-enforcer";
  }
  const sc = { domain: dom, business_model: bm };
  if (truthy(cl.evolution)) sc.evolution = cl.evolution;

  const io = (entries) => entries.map((e) => ({
    collaborator: e.collaborator, relationship: e.relationship,
    messages: e.messages.map((m) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== "source" && k !== "via_source"))),
  }));

  const ul = [];
  for (const t of f.terms) {
    const e = { term: t.term, definition: t.definition };
    if (truthy(t.avoid)) e.avoid = t.avoid;
    ul.push(e);
  }
  const purposeHint = [...f.subdomains.map((s) => s.description), f.rationale].filter((x) => truthy(x)).join("; ");
  const goalHint = f.goals.map((g) => `${pystr(get(g, "id"))}: ${pystr(get(g, "statement"))}`).join("; ");
  return {
    context: X, name: f.name,
    purpose: `${TODO}: write 2–4 sentences in business language — what this context decides/provides and for whom. Draft from: ${or(purposeHint, "—")}. Goals: ${or(goalHint, "—")}`,
    strategic_classification: sc,
    domain_roles: f.suggested_roles,
    domain_roles_rationale: `${TODO}: justify (suggested: ${f.suggested_roles_why.join("; ")}; evidence: ${f.role_evidence})`,
    inbound: io(f.inbound), outbound: io(f.outbound),
    ubiquitous_language: ul,
    business_decisions: truthy(f.draft_decisions) ? f.draft_decisions : [`${TODO}: write at least one rule/invariant/policy as a decision (see hotspots, aggregate candidates, read models in the brief)`],
    assumptions: [...f.carried_assumptions],
    verification_metrics: [`${TODO}: 2–4 metrics — one business (goal-linked), one structural (does the boundary hold?)`],
    open_questions: [...f.carried_questions],
    canvas_path: `${ws.rel}/07-define/${X}/bounded-context-canvas.md`,
    subdomains: f.subdomains.map((s) => s.id),
    owning_team: get(or(f.team, {}), "id"),
    deployable: get(or(f.deployable, {}), "id"),
    implementation_pattern: or(cl.implementation_pattern.join("/"), null),
  };
}

// Union of carried/cited strings: keep everything the skill wrote, add new items whose '[step id]' tag is new.
function mergeList(oldList, newList) {
  const tag = (s) => { const m = pystr(s).match(/^\[[^\]]+\]/); return m ? m[0] : pystr(s).split("\n")[0]; };
  const have = new Set(oldList.map(tag));
  return [...oldList, ...newList.filter((s) => !have.has(tag(s)))];
}

// Keep judgement fields the skill already wrote; refresh deterministic ones.
function mergeCanvas(oldC, newC) {
  if (!truthy(oldC)) return newC;
  for (const k of JUDGEMENT_KEYS) {
    if (k === "assumptions" || k === "open_questions") {
      if (truthy(get(oldC, k))) newC[k] = mergeList(oldC[k], get(newC, k, []));
      continue;
    }
    if (k in oldC && !isTodo(oldC[k]) && !EMPTY(oldC[k])) newC[k] = oldC[k];
  }
  for (const k of ["business_model", "evolution"]) {
    if (truthy(get(get(oldC, "strategic_classification", {}), k))) newC.strategic_classification[k] = oldC.strategic_classification[k];
  }
  const oldTerms = new Map();
  for (const t of get(oldC, "ubiquitous_language", [])) oldTerms.set(t.term, t);
  const merged = [];
  for (const t of newC.ubiquitous_language) {
    const o = oldTerms.get(t.term) ?? null;
    oldTerms.delete(t.term);
    if (truthy(o) && !isTodo(get(o, "definition", ""))) merged.push(o);
    else merged.push(t);
  }
  merged.push(...oldTerms.values());
  newC.ubiquitous_language = merged;
  for (const side of ["inbound", "outbound"]) {
    // union: refreshed upstream entries + anything the skill added by hand (rule 9) that upstream still
    // lacks; old 'response' rows are dropped: responses live on their request row now
    const oldEntries = new Map();
    for (const e of get(oldC, side, [])) if (truthy(get(e, "collaborator"))) oldEntries.set(e.collaborator, e);
    for (const e of newC[side]) {
      const o = oldEntries.get(e.collaborator) ?? null;
      oldEntries.delete(e.collaborator);
      if (!truthy(o)) continue;
      if (truthy(get(o, "relationship")) && ["unspecified", "conformist", "anticorruption-layer", "user-interaction"].includes(e.relationship)) e.relationship = o.relationship;
      const have = new Set(e.messages.map((m) => get(m, "id")));
      for (const m of get(o, "messages", [])) {
        if (!have.has(get(m, "id")) && get(m, "kind") !== "response") e.messages.push(m);
      }
    }
    for (const o of oldEntries.values()) {
      o.messages = get(o, "messages", []).filter((m) => get(m, "kind") !== "response");
      if (o.messages.length) newC[side].push(o);
    }
  }
  for (const [k, v] of Object.entries(oldC)) if (!(k in newC)) newC[k] = v;
  return newC;
}

function draftDefine(ws, facts, system, mode, depth, only = null) {
  const old = or(ws.steps.define, {});
  const oldCanvases = new Map();
  for (const c of get(old, "canvases", [])) oldCanvases.set(get(c, "context"), c);
  const drafts = new Map();
  for (const [X, f] of facts) drafts.set(X, draftCanvas(ws, f));
  const assumptions = [...get(old, "assumptions", [])], questions = [...get(old, "open_questions", [])], notes = [...get(old, "notes_for_downstream", [])];
  const texts = { A: new Set(assumptions.map((a) => get(a, "text"))), Q: new Set(questions.map((q) => get(q, "text"))), N: new Set(notes.map((n) => get(n, "text"))) };

  const nextId = (items, prefix) => {
    let n = 0;
    for (const it of items) {
      const m = pystr(get(it, "id", "")).match(new RegExp(`^${prefix}(\\d+)$`));
      if (m) n = Math.max(n, parseInt(m[1], 10));
    }
    return `${prefix}${n + 1}`;
  };
  const addA = (text, confidence = "medium") => {
    if (!texts.A.has(text)) { assumptions.push({ id: nextId(assumptions, "A"), text, confidence }); texts.A.add(text); }
    return assumptions.find((a) => same(get(a, "text"), text)).id;
  };
  const addQ = (text, blocking = false, owner = "domain expert") => {
    if (!texts.Q.has(text)) { questions.push({ id: nextId(questions, "Q"), text, blocking, owner }); texts.Q.add(text); }
    return questions.find((q) => same(get(q, "text"), text)).id;
  };
  const addN = (text, kind = "other", for_ = ["code"]) => {
    if (!texts.N.has(text)) { notes.push({ id: nextId(notes, "N"), text, for: [...for_], kind }); texts.N.add(text); }
    return notes.find((n) => same(get(n, "text"), text)).id;
  };
  const cite = (X, key, text) => { if (!drafts.get(X)[key].includes(text)) drafts.get(X)[key].push(text); };

  for (const w of system.warnings) { // system-wide: applies to every canvas
    const aid = addA(w, "low");
    for (const X of drafts.keys()) cite(X, "assumptions", `[define ${aid}] ${w}`);
  }
  for (const [X, f] of facts) {
    for (const n of f.relationship_notes) {
      const text = n.text;
      if (n.kind === "assumption") cite(X, "assumptions", `[define ${addA(X + ": " + text, "low")}] ${text}`);
      else if (n.kind === "question") cite(X, "open_questions", `[define ${addQ(X + ": " + text, false, "ddd-connect")}] ${text}`);
      else addN(X + ": " + text, "boundary"); // a finding for step 8, not a question for a person
    }
    if (f.classification.implementation_pattern.length > 1) {
      addN(`${X}: its subdomains have different implementation patterns ${pyrepr(f.classification.implementation_pattern)} — pick one per module`, "decision");
    }
  }
  const canvases = [];
  for (const X of facts.keys()) {
    if (only && !only.has(X) && oldCanvases.has(X)) canvases.push(oldCanvases.get(X));
    else canvases.push(mergeCanvas(oldCanvases.get(X) ?? null, drafts.get(X)));
  }
  const deprecated = [...get(old, "deprecated", [])];
  for (const [X, c0] of oldCanvases) {
    if (!facts.has(X) && !deprecated.some((d) => deepEqual(d, c0))) {
      const c = { ...c0 };
      c.deprecated_at = now();
      deprecated.push(c);
    }
  }
  const define = {
    schema_version: 1, step: "define", produced_by: "ddd-define", produced_at: now(),
    mode, depth, inputs: ws.inputs,
    assumptions, open_questions: questions,
    canvases,
    system_context_c4_mermaid: mergeC4(get(old, "system_context_c4_mermaid"), c4Mermaid(facts, system)),
    quality_attributes: [...get(old, "quality_attributes", [])],
  };
  if (notes.length) define.notes_for_downstream = notes;
  if (deprecated.length) define.deprecated = deprecated;
  return define;
}

// ---------------------------------------------------------------- briefs
const KIND_LABEL = { context: "bounded context", external: "external system", actor: "person", "system-actor": "external system", unknown: "UNKNOWN party" };

function viaOf(m) {
  const s = get(m, "sync");
  const sync = s === true ? "sync" : s === false ? "async" : "sync ?";
  const bits = [or(get(m, "via"), "via ?"), sync];
  if (truthy(get(m, "delivery")) && m.delivery !== "sync") bits.push(m.delivery);
  return bits.join(", ");
}

function rows(P, entries) {
  if (!entries.length) P("- — (none)");
  for (const e of entries) {
    let head = `- **${pystr(e.collaborator_name)}** (\`${pystr(e.collaborator)}\`, ${KIND_LABEL[e.collaborator_kind] ?? pystr(e.collaborator_kind)}; relationship: ${pystr(e.relationship)}`;
    head += truthy(get(e, "relationship_id")) ? ` ${pystr(e.relationship_id)}` : "";
    head += truthy(get(e, "relationship_note")) ? `; ${e.relationship_note}` : "";
    P(wrap(head + ")"));
    for (const m of e.messages) {
      let line = `  - \`${pystr(m.id)}\` ${pystr(m.name)} — ${pystr(m.kind)}; ${viaOf(m)}; payload: ${or(or(get(m, "payload", []), []).join(", "), "—")}`;
      const r = get(m, "response");
      if (truthy(r)) line += `; response \`${pystr(get(r, "id"))}\`: ${or(or(get(r, "payload", []), []).join(", "), "—")}`;
      let src = pystr(get(m, "source", ""));
      if (truthy(get(m, "via_source"))) src += `; via from ${m.via_source}`;
      P(wrap(line + ` [${src}]`, "    "));
    }
  }
}

function contextBrief(ws, facts, system, define, X) {
  const f = facts.get(X);
  const cv = define.canvases.find((c) => c.context === X);
  const cl = f.classification;
  const team = or(f.team, {}), dep = or(f.deployable, {});
  const L = [];
  const P = (s) => L.push(s);
  const j = (arr, sep = "; ") => arr.join(sep);
  P(`# DEFINE brief — ${f.name} (\`${X}\`)`);
  P(wrap(`mode=${pystr(define.mode)} depth=${pystr(define.depth)} domain=${or(cl.domain, "?")}. Everything below is FACT from upstream unless marked ` +
    "(suggested)/(draft). Judgement to write: purpose, role rationale, business decisions (rewrite drafts, add invariants), " +
    "verification metrics, quality attributes (core first), every TODO term."));
  P("");
  P("## Facts");
  P(wrap("- Subdomains: " + or(j(f.subdomains.map((s) => `\`${s.id}\` — ${pystr(s.description)} (rationale: ${pystr(s.rationale)}; heuristics: ${or(s.heuristics_applied.join(", "), "—")})`)), "—")));
  P(wrap(`- Decompose rationale: ${or(f.rationale, "—")}; ISH verdict: ${pystr(get(f.independent_service_check, "verdict", "—"))}`));
  P(wrap("- Capabilities: " + or(j(f.capabilities.map((c) => `${pystr(c.name)} (${pystr(c.evolution)}) — ${pystr(c.description)}`)), "—")));
  P(wrap(`- Classification (strategize): domain=${pystr(cl.domain)} evolution=${pystr(cl.evolution)} pattern=${or(cl.implementation_pattern.join("/"), "—")} ` +
    `sourcing=${or(cl.sourcing.join("/"), "—")} investment=${or(cl.investment.join("/"), "—")}; rationale: ${or(cl.rationale.map(pystr).join(" | "), "—")}; ` +
    `future: ${or(cl.future_direction.map(pystr).join(" | "), "—")}`));
  P(wrap(`- Business model (suggested): ${pystr(cv.strategic_classification.business_model)} — choose revenue-generator / engagement-creator / compliance-enforcer / cost-reducer`));
  P(wrap(`- Team: ${pystr(get(team, "name", "—"))} (\`${pystr(get(team, "id", "—"))}\`, ${pystr(get(team, "type", "—"))}, load ${pystr(get(team, "cognitive_load", "—"))}); ` +
    `deployable: ${pystr(get(dep, "name", "—"))} (\`${pystr(get(dep, "id", "—"))}\`, ${pystr(get(dep, "kind", "—"))}, data store ${pystr(get(dep, "data_store", "—"))}, ` +
    `shared with: ${or(get(dep, "contexts", []).filter((c) => c !== X).join(", "), "nobody")})` +
    (truthy(f.hosted_by) ? `; runtime also hosted by ${f.hosted_by.map(pystr).join(", ")}` : "")));
  P(wrap("- Owns commands: " + or(j(f.owns_commands.map((c) => `\`${c.id}\` ${pystr(c.name)} (actor ${or(c.actor, "system/policy")})`)), "—")));
  P(wrap("- Owns events: " + or(j(f.owns_events.map((e) => `\`${e.id}\` ${pystr(e.name)}${truthy(e.pivotal) ? " PIVOTAL" : ""} [${or(e.data.join(", "), "—")}]`)), "—")));
  P(wrap("- Aggregate candidates: " + or(j(f.owns_aggregates.map((a) => `\`${a.id}\` ${pystr(a.name)} (handles ${or(a.handles.join(", "), "—")}; emits ${or(a.emits.join(", "), "—")})`)), "— (none: probably not a domain model)")));
  P(wrap("- Read models informing its commands: " + or(j(f.read_models.map((r) => `\`${pystr(r.id)}\` ${pystr(r.name)} (informs \`${pystr(r.informs)}\`, used by ${pystr(r.used_by)})`)), "— (add `read_models: [{name, informs, note}]` to the canvas if one is missing)")));
  P(wrap("- Scenarios touching it: " + or(j(f.scenarios.map((s) => `${pystr(s.id)} ${pystr(s.name)}`)), "—")));
  P(wrap("- Suggested domain roles: " + f.suggested_roles.join(", ") + " — because " + f.suggested_roles_why.join("; ")));
  P(wrap("- Role evidence: " + f.role_evidence));
  P("");
  P("## Inbound (collaborator → this context)");
  rows(P, f.inbound);
  P("");
  P("## Outbound (this context → collaborator)");
  rows(P, f.outbound);
  if (truthy(f.unconsumed_events)) {
    P(wrap(`- Owned events with no consumer row: ${f.unconsumed_events.map((e) => "`" + e + "`").join(", ")} (fine if internal; else connect missed a flow)`));
  }
  for (const n of f.relationship_notes) P(wrap(`- NOTE (${n.kind}): ${n.text}`));
  P("");
  P("## Terms (one meaning per term here; define every TODO)");
  for (const t of f.terms) {
    P(wrap(`- **${t.term}** — ${t.definition}` + (truthy(t.avoid) ? ` (avoid: ${t.avoid.join(", ")})` : "") + ` [${t.sources.join(", ")}]`));
  }
  if (!f.terms.length) P("- — (none recorded upstream; add the aggregate/event nouns)");
  P("");
  P("## Decisions — drafts from policies (rewrite each as condition → outcome; add invariants)");
  for (const d of f.draft_decisions) P(wrap(`- ${d}`));
  if (!f.draft_decisions.length) P("- — (none: write the invariants — see hotspots and aggregate candidates)");
  P(wrap("- Hotspots near it: " + or(j(f.hotspots.map((h) => `${pystr(get(h, "id"))} [${pystr(get(h, "kind"))}] ${pystr(get(h, "text"))}`)), "—")));
  P(wrap("- Coupling concerns: " + or(j(f.coupling_concerns.map((c) => `${pystr(get(c, "id"))} [${pystr(get(c, "severity"))}] ${pystr(get(c, "text"))}`)), "—")));
  P("");
  P("## Pre-filled canvas assumptions and open questions (carried items name this context; `[define …]` = this pre-fill's own)");
  for (const a of get(cv, "assumptions", [])) P(wrap(`- assumption: ${pystr(a)}`));
  for (const q of get(cv, "open_questions", [])) P(wrap(`- question: ${pystr(q)}`));
  if (!truthy(get(cv, "assumptions")) && !truthy(get(cv, "open_questions"))) P("- — (none carried)");
  const u = f.uncarried;
  P(wrap(`- Not carried: ${u.assumptions} upstream assumption(s) and ${u.open_questions} question(s) do not name \`${X}\` — read the upstream step JSON (inputs listed in system.md) if a canvas needs one.`));
  P("");
  P("## Hints for purpose, metrics, quality attributes");
  P(wrap("- Goals via its actors: " + or(j(f.goals.map((g) => `${pystr(get(g, "id"))} ${pystr(get(g, "statement"))} — metric ${pystr(get(g, "metric"))}, target ${pystr(get(g, "target"))} in ${pystr(get(g, "horizon"))}`)), "— (none linked; pick a system goal from understand)")));
  P(wrap("- Impacts via its actors: " + or(j(f.impacts.map((i) => `${pystr(get(i, "id"))} ${pystr(get(i, "change"))} (→ ${pystr(get(i, "goal"))})`)), "—")));
  P(wrap("- Constraints (system-wide): " + or(j(f.constraints.map((c) => `${pystr(get(c, "id"))} [${pystr(get(c, "kind"))}] ${pystr(get(c, "text"))}`)), "—")));
  const qaHints = [];
  if (cl.domain === "core") qaHints.push("core → protect invariants: consistency/correctness scenario first");
  for (const e of [...f.inbound, ...f.outbound]) {
    for (const m of e.messages) {
      if (get(m, "delivery") === "at-least-once") {
        qaHints.push(`${m.id} is at-least-once → idempotent handling / duplicate scenario`);
        break;
      }
    }
  }
  if ([...f.inbound, ...f.outbound].some((e) => ["external", "system-actor"].includes(e.collaborator_kind))) {
    qaHints.push("external system in the loop → availability/timeout/retry scenario" + (cl.domain !== "core" ? " (one row even for a generic context when the partner is on the critical path)" : ""));
  }
  if (truthy(get(dep, "independent_deploy"))) qaHints.push("independently deployed → deployability/compatibility of its published messages");
  P(wrap("- Quality-attribute hints: " + or(qaHints.join("; "), "—")));
  return L.join("\n") + "\n";
}

function systemBrief(ws, facts, system, define, briefPaths) {
  const L = [];
  const P = (s) => L.push(s);
  const j = (arr) => arr.join("; ");
  const core = [...facts].filter(([, f]) => f.classification.domain === "core").map(([X]) => X);
  P(`# DEFINE brief — system: ${pystr(system.title)}`);
  P(wrap(`workspace: ${ws.ddd_dir}; inputs: ${ws.inputs.join(", ")}`));
  P(wrap(`mode=${pystr(define.mode)} depth=${pystr(define.depth)} contexts=${facts.size} (core: ${or(core.join(", "), "—")}) deployables=${system.deployables.length} topology=${pystr(get(system, "topology_style"))}`));
  for (const w of system.warnings) P(wrap(`WARNING: ${w}`));
  P("");
  P("## Facts (for system-context.md)");
  P(wrap(`- Title: ${pystr(system.title)} — ${or(system.one_liner, "—")}`));
  P(wrap("- Actors: " + or(j(system.actors.map((a) => `${pystr(a.name)} (\`${pystr(a.id)}\`, ${a.kind}${truthy(get(a, "source")) ? ", connect party" : ""})`)), "—")));
  P(wrap("- External systems: " + or(j(system.external_systems.map((e) => `${pystr(e.name)} (\`${pystr(e.id)}\`${truthy(get(e, "source")) ? ", connect party" : ""}) — ${or(e.description, "—")}`)), "—")));
  P(wrap("- Existing systems (understand): " + or(j(system.existing_systems.map((e) => `${pystr(get(e, "name"))} (${pystr(get(e, "role"))}, will ${pystr(get(e, "will"))})`)), "—")));
  P(wrap("- Deployables: " + or(j(system.deployables.map((d) => `${pystr(get(d, "name"))} (\`${pystr(get(d, "id"))}\`, ${pystr(get(d, "kind"))}, contexts ${or(get(d, "contexts", []).join(", "), "—")}` + (truthy(get(d, "hosts_runtime_of")) ? `, hosts runtime of ${d.hosts_runtime_of.join(", ")}` : "") + ")")), "—")));
  P(wrap("- Teams: " + or(j(system.teams.map((t) => `${pystr(get(t, "name"))} (\`${pystr(get(t, "id"))}\`, ${pystr(get(t, "type"))}, owns ${or(get(t, "owns_contexts", []).join(", "), "—")})`)), "—")));
  P(wrap("- Relationships: " + or(j(system.relationships.map((r) => `${pystr(get(r, "id"))} ${pystr(get(r, "upstream"))}→${pystr(get(r, "downstream"))} ${pystr(get(r, "pattern"))}` + (truthy(get(system.integration, get(r, "id"))) ? ` (integration: ${pystr(system.integration[get(r, "id")])})` : ""))), "—")));
  P(wrap("- Goals: " + or(j(system.goals.map((g) => `${pystr(get(g, "id"))} ${pystr(get(g, "statement"))} (${pystr(get(g, "metric"))} → ${pystr(get(g, "target"))})`)), "—")));
  P(wrap("- Constraints: " + or(j(system.constraints.map((c) => `${pystr(get(c, "id"))} [${pystr(get(c, "kind"))}] ${pystr(get(c, "text"))}`)), "—")));
  P("");
  const [errs, warns] = lintC4(define.system_context_c4_mermaid);
  P("## C4 context block (generated from the canvases' rows; lint: " + (errs.length ? `${errs.length} error(s)` : "ok") + (warns.length ? `, ${warns.length} warning(s)` : "") + ")");
  for (const e of errs) P(`- ERROR: ${e}`);
  for (const w of warns) P(`- warning: ${w}`);
  P("");
  P("```mermaid");
  P(define.system_context_c4_mermaid);
  P("```");
  P("");
  P("## This pre-fill's own envelope entries (already cited on the canvases they apply to)");
  for (const a of get(define, "assumptions", [])) P(wrap(`- ${pystr(get(a, "id"))} (${pystr(get(a, "confidence"))}): ${pystr(get(a, "text"))}`));
  for (const q of get(define, "open_questions", [])) P(wrap(`- ${pystr(get(q, "id"))}${truthy(get(q, "blocking")) ? " BLOCKING" : ""} (owner ${pystr(get(q, "owner"))}): ${pystr(get(q, "text"))}`));
  for (const n of get(define, "notes_for_downstream", [])) P(wrap(`- ${pystr(get(n, "id"))} (note for ${get(n, "for", []).join(", ")}, ${pystr(get(n, "kind"))}): ${pystr(get(n, "text"))}`));
  if (!truthy(get(define, "assumptions")) && !truthy(get(define, "open_questions")) && !truthy(get(define, "notes_for_downstream"))) P("- — (none)");
  P("");
  P("## Context briefs (read one at a time, core first)");
  for (const [X, p] of briefPaths) P(`- \`${p}\` — ${facts.get(X).name}, ${or(facts.get(X).classification.domain, "?")}`);
  return L.join("\n") + "\n";
}

// Write .prefill/system.md and .prefill/<context>.md; returns Map path -> text (system first).
function writeBriefs(ws, facts, system, define, only = null) {
  const pre = path.join(ws.ddd_dir, "07-define", ".prefill");
  fs.mkdirSync(pre, { recursive: true });
  const ids = [...facts.keys()];
  const order = ids.map((X, i) => [X, i]).sort((a, b) => {
    const ka = facts.get(a[0]).classification.domain !== "core" ? 1 : 0;
    const kb = facts.get(b[0]).classification.domain !== "core" ? 1 : 0;
    return ka - kb || a[1] - b[1];
  }).map(([X]) => X);
  const texts = new Map(), paths = new Map();
  for (const X of order) {
    if (only && !only.has(X)) continue;
    paths.set(X, `${ws.rel}/07-define/.prefill/${X}.md`);
    texts.set(path.join(pre, `${X}.md`), contextBrief(ws, facts, system, define, X));
  }
  const sysText = systemBrief(ws, facts, system, define, paths);
  const out = new Map([[path.join(pre, "system.md"), sysText], ...texts]);
  for (const [p, text] of out) fs.writeFileSync(p, text);
  return out;
}

// ---------------------------------------------------------------- argv
// The argparse subset the two define scripts used: an optional positional, store_true
// flags, `choices`, one `nargs="*"` option, `--flag=value`, unique prefixes and -h. Usage
// errors are not golden-recorded (they embedded the Python program name), so the wording
// is plain: `usage:` plus `error:` on stderr, exit 2.
export class UsageError extends Error {}

export function parseArgs(spec, argv) {
  const res = { ddd_dir: "ddd" };
  const names = Object.keys(spec);
  for (const n of names) {
    const o = spec[n];
    res[o.dest] = o.action === "store_true" ? false : null;
  }
  const positional = [];
  let i = 0;
  const isOpt = (a) => a.startsWith("-") && a.length > 1 && !/^-\d/.test(a);
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--") { positional.push(...argv.slice(i + 1)); break; }
    if (!isOpt(a)) { positional.push(a); i++; continue; }
    let name = a, inline;
    if (a.startsWith("--") && a.includes("=")) { name = a.slice(0, a.indexOf("=")); inline = a.slice(a.indexOf("=") + 1); }
    if (name === "-h" || name === "--help") return { help: true };
    if (!spec[name]) {
      const matches = names.filter((n) => n.startsWith(name));
      if (matches.length === 1) name = matches[0];
      else if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      else throw new UsageError(`unrecognized arguments: ${a}`);
    }
    const o = spec[name];
    i++;
    if (o.action === "store_true") {
      if (inline !== undefined) throw new UsageError(`argument ${name}: ignored explicit argument '${inline}'`);
      res[o.dest] = true;
      continue;
    }
    if (o.nargs === "*") {
      const vals = inline !== undefined ? [inline] : [];
      while (inline === undefined && i < argv.length && !isOpt(argv[i]) && argv[i] !== "--") vals.push(argv[i++]);
      res[o.dest] = vals;
      continue;
    }
    let value = inline;
    if (value === undefined) {
      if (i >= argv.length || isOpt(argv[i])) throw new UsageError(`argument ${name}: expected one argument`);
      value = argv[i++];
    }
    if (o.choices && !o.choices.includes(value)) {
      throw new UsageError(`argument ${name}: invalid choice: '${value}' (choose from ${o.choices.map((c) => `'${c}'`).join(", ")})`);
    }
    res[o.dest] = value;
  }
  if (positional.length > 1) throw new UsageError(`unrecognized arguments: ${positional.slice(1).join(" ")}`);
  if (positional.length === 1) res.ddd_dir = positional[0];
  return res;
}

const SPEC = {
  "--write": { dest: "write", action: "store_true" },
  "--context": { dest: "context", nargs: "*" },
  "--mode": { dest: "mode", choices: ["interactive", "auto"] },
  "--depth": { dest: "depth", choices: ["light", "standard", "deep"] },
  "--print": { dest: "echo", action: "store_true" },
  "--json": { dest: "json", action: "store_true" },
};
const USAGE = "usage: ddd define prefill [ddd_dir] [--write] [--context [ID ...]] [--mode {interactive,auto}] [--depth {light,standard,deep}] [--print] [--json]";

// ---------------------------------------------------------------- main
export function main(argv) {
  const out = (s) => process.stdout.write(s);
  let a;
  try {
    a = parseArgs(SPEC, argv);
  } catch (e) {
    if (e instanceof UsageError) { process.stderr.write(`${USAGE}\nddd define prefill: error: ${e.message}\n`); return 2; }
    throw e;
  }
  if (a.help) { out(USAGE + "\n"); return 0; }
  try {
    return run(a, out);
  } catch (e) {
    if (e instanceof ExitError) { process.stderr.write(e.message + "\n"); return e.exitCode; }
    throw e;
  }
}

function run(a, out) {
  const ws = loadWorkspace(a.ddd_dir);
  const [facts, system] = buildFacts(ws);
  const only = truthy(a.context) ? new Set(a.context) : null;
  const unknown = [...(only ?? [])].filter((x) => !facts.has(x));
  if (unknown.length) {
    throw new ExitError(`error: unknown context id(s) ${pyrepr(sortedUnique(unknown))}; known: ${pyrepr([...facts.keys()])}`);
  }
  const old = or(ws.steps.define, {});
  const mode = or(a.mode, get(old, "mode"), get(ws.manifest, "mode"), "interactive");
  const depth = or(a.depth, get(ws.manifest, "depth"), get(old, "depth"), "standard");
  const define = draftDefine(ws, facts, system, mode, depth, only);

  const written = writeBriefs(ws, facts, system, define, only);
  if (a.json) {
    out(JSON.stringify({ facts: Object.fromEntries(facts), system, define }, null, 2) + "\n");
    return 0;
  }
  const core = [...facts].filter(([, f]) => f.classification.domain === "core").map(([X]) => X);
  out(`DEFINE pre-fill — ${pystr(system.title)}: ${facts.size} context(s) (core: ${or(core.join(", "), "—")}), ${system.deployables.length} deployable(s), ` +
    `topology ${or(get(system, "topology_style"), "—")}; mode=${mode} depth=${depth}\n`);
  for (const w of system.warnings) out(`WARNING: ${w}\n`);
  if (a.write) {
    const file = path.join(ws.ddd_dir, "07-define", "define.json");
    fs.writeFileSync(file, JSON.stringify(define, null, 2) + "\n");
    const todo = define.canvases.filter((c) => JUDGEMENT_KEYS.some((k) => k in c && isTodo(c[k])) || get(c, "ubiquitous_language", []).some((t) => isTodo(get(t, "definition", "")))).length;
    out(`wrote draft ${file} (${define.canvases.length} canvases, ${todo} still contain TODO/draft markers)\n`);
  }
  const sizes = [...written].map(([p, text]) => {
    const base = path.basename(p);
    const X = base.slice(0, -3);
    return `${base} ${kb1(Buffer.byteLength(text, "utf8"))} KB` + (facts.has(X) ? ` (${or(facts.get(X).classification.domain, "?")})` : "");
  }).join("; ");
  out(`briefs → ${path.join(ws.ddd_dir, "07-define", ".prefill")}/: ${sizes}\n`);
  const [errs, warns] = lintC4(define.system_context_c4_mermaid);
  out("C4 block: " + (errs.length ? errs.map((e) => "ERROR " + e).join("; ") : "ok") + (warns.length ? " | " + warns.map((w) => "warning " + w).join("; ") : "") + "\n");
  out("next: read system.md, then one context brief at a time (core first); --print [--context ID] echoes briefs to stdout; ddd define render removes .prefill/ after a full render\n");
  if (a.echo) {
    for (const text of written.values()) out("\n" + text);
  }
  return 0;
}
