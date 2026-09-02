// Small Python stand-ins shared by prefill.mjs and check.mjs: the argparse subset the
// two scripts used, textwrap.fill, `:.1f`, str.splitlines and dict-style `.get`.
//
// They exist because the goldens compare stdout and every written file byte for byte
// against the Python twins, so the ports have to reproduce Python's formatting quirks
// (half-to-even rounding, code-point lengths, `None`/`True`/`[]` reprs) rather than
// Node's. Nothing here is specific to ddd-code beyond that.
//
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import { pyRepr, pyStr } from "../../../shared/lib/jsonschema.mjs";

export { pyRepr, pyStr };

// Python `d.get(k)`: undefined and null both come back as null so that `?? x`
// and `=== null` behave like `is None` on a JSON.parse'd value.
export function get(o, k, dflt = null) {
  if (o === null || o === undefined || typeof o !== "object" || Array.isArray(o)) return dflt;
  if (!Object.prototype.hasOwnProperty.call(o, k)) return dflt;
  const v = o[k];
  return v === undefined ? dflt : v;
}

// `d.get(k, [])` for lists: the default when the key is absent or null.
export function getList(o, k) {
  const v = get(o, k);
  return Array.isArray(v) ? v : [];
}

export function isDict(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Python truthiness for a JSON value.
export function truthy(v) {
  if (v === null || v === undefined || v === false || v === 0 || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

// len() on a string counts code points, not UTF-16 units.
export function plen(s) {
  return [...String(s)].length;
}

export function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function readText(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

// f"{x:.1f}" and friends. toFixed rounds an exact tie away from zero while Python
// rounds it to even (1.25 -> "1.2"), and a brief of exactly 1250 bytes is a real size,
// so ties are detected on the exact decimal expansion and settled by hand.
export function pyFixed(x, digits) {
  if (!Number.isFinite(x)) return pyStr(x);
  const exact = x.toFixed(Math.min(100, digits + 30));
  const dot = exact.indexOf(".");
  const tail = exact.slice(dot + 1 + digits);
  if (/^50*$/.test(tail)) {
    const kept = exact.slice(0, dot + 1 + digits).replace(/\.$/, "");
    const last = parseInt(kept[kept.length - 1], 10);
    if (last % 2 === 0) return kept;
    // Odd last digit on a tie: round away from zero by one unit in the last place.
    const sign = kept.startsWith("-") ? -1 : 1;
    const step = Math.pow(10, -digits) * sign;
    return (x + step / 2).toFixed(digits);
  }
  return x.toFixed(digits);
}

// str.splitlines(): every line boundary Python knows, trailing empty line dropped.
export function splitlines(s) {
  const parts = String(s).split(/\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/);
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

// sorted() on strings: code point order.
export function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// textwrap.fill(text, width, subsequent_indent, break_long_words=False,
// break_on_hyphens=False): the chunk loop of TextWrapper._wrap_chunks, statement for
// statement, because the line breaks in the briefs and the index are part of the bytes.
// A word longer than the line goes on a line of its own; leading whitespace on a
// continuation line and trailing whitespace on any line are dropped.
export function fill(text, width, subsequentIndent = "") {
  const chunks = String(text).split(/(\s+)/).filter((c) => c !== "").reverse();
  const lines = [];
  while (chunks.length) {
    const cur = [];
    let curLen = 0;
    const indent = lines.length ? subsequentIndent : "";
    const w = width - plen(indent);
    if (chunks[chunks.length - 1].trim() === "" && lines.length) chunks.pop();
    while (chunks.length) {
      const l = plen(chunks[chunks.length - 1]);
      if (curLen + l <= w) {
        cur.push(chunks.pop());
        curLen += l;
      } else break;
    }
    if (chunks.length && plen(chunks[chunks.length - 1]) > w) {
      if (!cur.length) cur.push(chunks.pop());
      curLen = cur.reduce((n, c) => n + plen(c), 0);
    }
    if (cur.length && cur[cur.length - 1].trim() === "") {
      curLen -= plen(cur[cur.length - 1]);
      cur.pop();
    }
    if (cur.length) lines.push(indent + cur.join(""));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// argparse subset: `--flag value`, `--flag=value`, unique prefixes, choices,
// store_true, one optional positional with a default, `--` and -h/--help.
// spec: { prog, usage, options: { "--name": { dest, action?: "store_true", choices?, help? } },
//         positional: { dest, default } }
// Returns { help: true } for -h, otherwise the parsed values. Throws ArgError on a
// usage problem; the caller prints it and exits 2 (argparse's own wording embeds the
// Python program name and is not golden-recorded, so the text here is plain).
// ---------------------------------------------------------------------------
export class ArgError extends Error {}

export function parseArgs(spec, argv) {
  const res = {};
  const names = Object.keys(spec.options);
  for (const n of names) {
    const o = spec.options[n];
    res[o.dest] = o.action === "store_true" ? false : (o.default ?? null);
  }
  const positional = [];
  let onlyPositional = false;
  const isOpt = (a) => !onlyPositional && a.startsWith("-") && a.length > 1 && !/^-\d/.test(a);
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (!onlyPositional && a === "--") { onlyPositional = true; i++; continue; }
    if (!isOpt(a)) { positional.push(a); i++; continue; }
    const eq = a.indexOf("=");
    let name = eq >= 0 ? a.slice(0, eq) : a;
    const inline = eq >= 0 ? a.slice(eq + 1) : undefined;
    if (name === "-h" || name === "--help") return { help: true };
    if (!spec.options[name]) {
      const matches = names.filter((n) => n.startsWith(name));
      if (matches.length === 1) name = matches[0];
      else if (matches.length > 1) throw new ArgError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      else throw new ArgError(`unrecognized arguments: ${a}`);
    }
    const o = spec.options[name];
    i++;
    if (o.action === "store_true") {
      if (inline !== undefined) throw new ArgError(`argument ${name}: ignored explicit argument '${inline}'`);
      res[o.dest] = true;
      continue;
    }
    let value = inline;
    if (value === undefined) {
      if (i >= argv.length || (isOpt(argv[i]) && argv[i] !== "--")) throw new ArgError(`argument ${name}: expected one argument`);
      value = argv[i++];
    }
    if (o.choices && !o.choices.includes(value)) {
      throw new ArgError(`argument ${name}: invalid choice: '${value}' (choose from ${o.choices.map((c) => `'${c}'`).join(", ")})`);
    }
    res[o.dest] = value;
  }
  if (spec.positional) {
    res[spec.positional.dest] = positional.length ? positional.shift() : spec.positional.default;
  }
  if (positional.length) throw new ArgError(`unrecognized arguments: ${positional.join(" ")}`);
  return res;
}

export function helpText(spec) {
  const lines = [`usage: ${spec.usage}`, ""];
  if (spec.description) lines.push(spec.description.trimEnd(), "");
  lines.push("options:");
  for (const [n, o] of Object.entries(spec.options)) {
    const val = o.action === "store_true" ? "" : (o.choices ? ` {${o.choices.join(",")}}` : ` ${o.dest.toUpperCase()}`);
    lines.push(`  ${n}${val}${o.help ? `  ${o.help}` : ""}`);
  }
  return lines.join("\n") + "\n";
}
