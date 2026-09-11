// Helpers the three ddd-discover commands share: the argparse subset their Python
// twins used, and the handful of Python semantics (dict.get, truthiness, sorting)
// the ports lean on. Kept local to this folder because the CLI shell's parser is
// private to shared/bin/ddd.mjs and step scripts must not reach into other steps.
import fs from "node:fs";
import path from "node:path";
import { pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

// spec: { prog, options: { "--flag": { dest, choices, action: "store_true", default, aliases: ["-o"] } },
//         positionals: [{ dest }] }
// Returns the parsed values, `{ help: true }` for -h/--help, or throws UsageError.
export class UsageError extends Error {}

export function parseArgs(spec, argv) {
  const res = {};
  const byName = new Map();
  for (const [name, o] of Object.entries(spec.options)) {
    res[o.dest] = o.action === "store_true" ? false : (o.default ?? null);
    byName.set(name, o);
    for (const a of o.aliases ?? []) byName.set(a, o);
  }
  const longNames = Object.keys(spec.options);
  const positional = [];
  let onlyPositional = false;
  const isOpt = (a) => !onlyPositional && a.startsWith("-") && a.length > 1 && !/^-\d/.test(a);
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (!onlyPositional && a === "--") { onlyPositional = true; i++; continue; }
    if (!isOpt(a)) { positional.push(a); i++; continue; }
    let [name, inline] = a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, undefined];
    if (name === "-h" || name === "--help") return { help: true };
    if (!byName.has(name)) {
      // argparse accepts any unambiguous prefix of a long option.
      const matches = longNames.filter((n) => n.startsWith(name));
      if (matches.length === 1) name = matches[0];
      else if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      else throw new UsageError(`unrecognized arguments: ${a}`);
    }
    const o = byName.get(name);
    i++;
    if (o.action === "store_true") {
      if (inline !== undefined) throw new UsageError(`argument ${name}: ignored explicit argument '${inline}'`);
      res[o.dest] = true;
      continue;
    }
    let value = inline;
    if (value === undefined) {
      if (i >= argv.length || (isOpt(argv[i]) && argv[i] !== "--")) throw new UsageError(`argument ${name}: expected one argument`);
      value = argv[i++];
    }
    if (o.choices && !o.choices.includes(value)) {
      throw new UsageError(`argument ${name}: invalid choice: '${value}' (choose from ${o.choices.map((c) => `'${c}'`).join(", ")})`);
    }
    res[o.dest] = value;
  }
  let p = 0;
  for (const ps of spec.positionals ?? []) {
    if (p >= positional.length) throw new UsageError(`the following arguments are required: ${ps.dest}`);
    res[ps.dest] = positional[p++];
  }
  if (p < positional.length) throw new UsageError(`unrecognized arguments: ${positional.slice(p).join(" ")}`);
  return res;
}

// Runs a command's main with the usage-error convention of the CLI: usage plus the
// message on stderr and exit 2, -h/--help prints the docstring and exits 0.
export async function runCommand({ prog, usage, doc, spec }, argv, body) {
  const err = (s) => process.stderr.write(s);
  let a;
  try {
    a = parseArgs(spec, argv);
  } catch (e) {
    if (e instanceof UsageError) {
      err(`usage: ${prog} ${usage}\n${prog}: error: ${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (a.help) {
    process.stdout.write(`usage: ${prog} ${usage}\n\n${doc}\n`);
    return 0;
  }
  return body(a);
}

// json.load(open(path)) with the Python error wording for the two cases a user hits:
// a missing file ([Errno 2] ...) and unparsable JSON. Returns { doc } or { error }.
export function readJson(file) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return { error: `[Errno 2] No such file or directory: ${pyRepr(file)}` };
    if (e.code === "EISDIR") return { error: `[Errno 21] Is a directory: ${pyRepr(file)}` };
    if (e.code === "EACCES") return { error: `[Errno 13] Permission denied: ${pyRepr(file)}` };
    return { error: e.message };
  }
  try {
    return { doc: JSON.parse(text) };
  } catch (e) {
    return { error: e.message };
  }
}

// title/project from the manifest.json next to `dir`, else "project" (find_title).
export function manifestTitle(dir, override) {
  if (truthy(override)) return override;
  const mpath = path.join(dir, "manifest.json");
  if (fs.existsSync(mpath)) {
    try {
      const m = JSON.parse(fs.readFileSync(mpath, "utf8"));
      // `m.get("title") or m.get("project") or "project"`; a manifest that is not an
      // object raised in the Python and fell through to the default, as get() does here.
      if (truthy(get(m, "title"))) return get(m, "title");
      if (truthy(get(m, "project"))) return get(m, "project");
      return "project";
    } catch {
      // unreadable manifest: fall through to the default, as the Python does
    }
  }
  return "project";
}

// ---------------------------------------------------------------------------
// Python semantics.
// ---------------------------------------------------------------------------
export const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
// dict.get(k[, default]): the default only when the key is absent, None when present as null.
export const get = (o, k, dflt = null) => (has(o, k) ? o[k] : dflt);
// Python truthiness for JSON values.
export const truthy = (v) => !(v === null || v === undefined || v === false || v === 0 || v === "" ||
  (Array.isArray(v) && v.length === 0) || (isDict(v) && Object.keys(v).length === 0));
// `x or []`: an empty or missing collection becomes a list; a dict iterates its keys.
export function listOr(v) {
  if (!truthy(v)) return [];
  return Array.isArray(v) ? v : (isDict(v) ? Object.keys(v) : Array.from(String(v)));
}
export const dicts = (v) => listOr(v).filter(isDict);
// `str(x)` and `str(x if x is not None else "")`.
export { pyStr, pyRepr };
export const strOrEmpty = (v) => (v === null || v === undefined ? "" : pyStr(v));
// Python `<` on the scalar keys the sorts use: numbers before nothing else is needed,
// strings by code point. Mixed int/str keys raise in Python; here they order numbers first.
export function cmp(a, b) {
  const na = typeof a === "number" || typeof a === "boolean";
  const nb = typeof b === "number" || typeof b === "boolean";
  if (na && nb) return Number(a) - Number(b);
  if (na !== nb) return na ? -1 : 1;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
// Tuple comparison, element by element.
export function cmpTuple(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const c = cmp(a[i], b[i]);
    if (c) return c;
  }
  return a.length - b.length;
}
// sorted(items, key=...) with a tuple key; Array.prototype.sort is stable like Python's.
export function sortedBy(items, key) {
  return items.map((x, i) => [key(x), i, x]).sort((p, q) => cmpTuple(p[0], q[0]) || p[1] - q[1]).map((t) => t[2]);
}
// `{x.get("id"): x for x in items if isinstance(x, dict) and x.get("id") is not None}` as a Map,
// so ids keep their raw type and their insertion order (a later duplicate wins in place).
export function byId(items) {
  const m = new Map();
  for (const x of dicts(items)) {
    const id = get(x, "id");
    if (id !== null) m.set(id, x);
  }
  return m;
}
