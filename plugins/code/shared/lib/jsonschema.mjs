// The JSON-Schema subset validator shared by `ddd validate` and `ddd contracts check`.
//
// Ported from two Python twins that had drifted apart: validate.py knew five keywords
// (type, enum, required, properties, items) and contracts.py grew into the 2020-12
// subset below ($ref, oneOf/anyOf/allOf/not/if, const, patternProperties, bounds and so
// on). Their message strings for the shared keywords are identical, so one module can
// serve both callers. `checkSchema` is the contracts.py superset; `checkSchemaCore` is
// the validate.py subset, kept because the shared step schemas use `additionalProperties`,
// `minItems` and `pattern`, which validate.py silently ignored and whose goldens therefore
// never mention. Leaf 1.1.2 picks whichever keeps `validate` byte-identical.
//
// Message fidelity: the Python strings embed `repr()` of values and `type(v).__name__`,
// so this file carries small Python formatters (pyRepr, pyDumps, pyNum). Two things a
// JSON.parse'd value cannot reproduce: Python keeps `1.0` as a float (so `expected
// integer, got float` never happens here, `1.0` is an integer in JS), and Python keeps
// integer-like object keys in insertion order (JS lists them first). Neither occurs in
// the shipped schemas or examples.
//
// Zero dependencies, ESM, Node >= 18.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA_DIR = path.resolve(HERE, "..", "schemas");

// ---------------------------------------------------------------------------
// Keyword vocabulary (contracts.py). A key outside SCHEMA_KEYWORDS at a schema
// position is an error, because every validator ignores it and the rule it
// describes is unenforced.
// ---------------------------------------------------------------------------
export const SCHEMA_KEYWORDS = new Set([
  "$schema", "$id", "$ref", "$defs", "definitions", "$comment", "$anchor",
  "title", "description", "default", "examples", "deprecated", "readOnly", "writeOnly", "format",
  "type", "enum", "const",
  "required", "properties", "patternProperties", "additionalProperties", "propertyNames",
  "dependentRequired", "dependentSchemas", "minProperties", "maxProperties",
  "items", "prefixItems", "contains", "minItems", "maxItems", "uniqueItems", "minContains", "maxContains",
  "minLength", "maxLength", "pattern",
  "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
  "allOf", "anyOf", "oneOf", "not", "if", "then", "else",
]);
const SUB_ONE = ["additionalProperties", "propertyNames", "contains", "not", "if", "then", "else", "items"];
const SUB_MAP = ["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"];
const SUB_LIST = ["allOf", "anyOf", "oneOf", "prefixItems"];
const CONDITIONAL_KEYWORDS = ["anyOf", "oneOf", "allOf", "not", "if", "const", "dependentRequired", "dependentSchemas"];

// ---------------------------------------------------------------------------
// Python value helpers.
// ---------------------------------------------------------------------------
const isDict = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isInt = (v) => typeof v === "number" && Number.isInteger(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const has = (o, k) => isDict(o) && Object.prototype.hasOwnProperty.call(o, k);
// Python's `d.get(k)`: None when the key is absent, the value (which may be None) otherwise.
const get = (o, k) => (has(o, k) ? o[k] : null);

// type(value).__name__ for a JSON.parse'd value.
export function pyTypeName(v) {
  if (v === null || v === undefined) return "NoneType";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  if (typeof v === "string") return "str";
  if (Array.isArray(v)) return "list";
  return "dict";
}

// repr()/str() of a number: ints print in full, floats follow float.__repr__
// (shortest round trip, fixed notation for exponents in [-4, 16), else `1e-05` style).
export function pyNum(n) {
  if (Number.isInteger(n)) return Math.abs(n) < 1e21 ? String(n) : BigInt(n).toString();
  if (!Number.isFinite(n)) return Number.isNaN(n) ? "nan" : (n < 0 ? "-inf" : "inf");
  let [mant, exp] = n.toExponential().split("e");
  const e = parseInt(exp, 10);
  const neg = mant.startsWith("-");
  if (neg) mant = mant.slice(1);
  const digits = mant.replace(".", "");
  let out;
  if (e >= -4 && e < 16) {
    if (e >= 0) {
      const intPart = digits.slice(0, e + 1).padEnd(e + 1, "0");
      const frac = digits.slice(e + 1);
      out = `${intPart}.${frac || "0"}`;
    } else {
      out = `0.${"0".repeat(-e - 1)}${digits}`;
    }
  } else {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    out = `${m}e${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
  }
  return (neg ? "-" : "") + out;
}

// repr() of a str: single quotes unless the text has a single quote and no double
// quote; backslash, the quote, \n \r \t escaped; other control characters as \xNN.
export function pyStrRepr(s) {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = q;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (ch === "\\") out += "\\\\";
    else if (ch === q) out += `\\${q}`;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20 || c === 0x7f) out += `\\x${c.toString(16).padStart(2, "0")}`;
    else if (c >= 0x80 && c <= 0xa0) out += `\\x${c.toString(16)}`;
    else out += ch;
  }
  return out + q;
}

// repr() of any JSON value.
export function pyRepr(v) {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return pyNum(v);
  if (typeof v === "string") return pyStrRepr(v);
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
  return `{${Object.keys(v).map((k) => `${pyStrRepr(k)}: ${pyRepr(v[k])}`).join(", ")}}`;
}

// str() of any JSON value: the same as repr() except for strings.
export function pyStr(v) {
  return typeof v === "string" ? v : pyRepr(v);
}

// json.dumps(). Defaults follow Python: ensure_ascii=True, separators (", ", ": "),
// no indent. indent=N switches to the multi-line layout Python uses.
export function pyDumps(v, { indent = null, sortKeys = false, ensureAscii = true } = {}) {
  const str = (s) => {
    let out = '"';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const c = s.charCodeAt(i);
      if (ch === '"') out += '\\"';
      else if (ch === "\\") out += "\\\\";
      else if (ch === "\n") out += "\\n";
      else if (ch === "\r") out += "\\r";
      else if (ch === "\t") out += "\\t";
      else if (ch === "\b") out += "\\b";
      else if (ch === "\f") out += "\\f";
      else if (c < 0x20 || (ensureAscii && c > 0x7e)) out += `\\u${c.toString(16).padStart(4, "0")}`;
      else out += ch;
    }
    return out + '"';
  };
  const walk = (x, level) => {
    if (x === null || x === undefined) return "null";
    if (typeof x === "boolean") return x ? "true" : "false";
    if (typeof x === "number") return Number.isFinite(x) ? pyNum(x) : (Number.isNaN(x) ? "NaN" : (x < 0 ? "-Infinity" : "Infinity"));
    if (typeof x === "string") return str(x);
    const isArr = Array.isArray(x);
    const keys = isArr ? null : (sortKeys ? Object.keys(x).sort(cmpStr) : Object.keys(x));
    const n = isArr ? x.length : keys.length;
    if (n === 0) return isArr ? "[]" : "{}";
    const items = isArr ? x.map((it) => walk(it, level + 1)) : keys.map((k) => `${str(k)}: ${walk(x[k], level + 1)}`);
    if (indent === null) return isArr ? `[${items.join(", ")}]` : `{${items.join(", ")}}`;
    const pad = " ".repeat(indent * (level + 1));
    const end = " ".repeat(indent * level);
    return `${isArr ? "[" : "{"}\n${items.map((it) => pad + it).join(",\n")}\n${end}${isArr ? "]" : "}"}`;
  };
  return walk(v, 0);
}

function cmpStr(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Python `==` on JSON values: 1 == 1.0 == True, deep for lists and dicts.
export function pyEq(a, b) {
  const numLike = (v) => typeof v === "number" || typeof v === "boolean";
  if (numLike(a) && numLike(b)) return Number(a) === Number(b);
  if (a === null || b === null || a === undefined || b === undefined) return (a ?? null) === (b ?? null);
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => has(b, k) && pyEq(a[k], b[k]));
}

// Python len(): code points for strings, entries for lists and dicts.
function pyLen(v) {
  if (typeof v === "string") return [...v].length;
  if (Array.isArray(v)) return v.length;
  return Object.keys(v).length;
}

// re.compile / re.search stand-ins. JS and Python regex syntax agree on everything
// the shipped schemas use; a pattern JS rejects is reported the way Python reports
// a re.error.
function compileRe(pat) {
  try { return new RegExp(pat); } catch { return null; }
}

// ---------------------------------------------------------------------------
// The validator.
// ---------------------------------------------------------------------------
export function typeOk(value, t) {
  if (Array.isArray(t)) return t.some((x) => typeOk(value, x));
  switch (t) {
    case "string": return typeof value === "string";
    case "integer": return isInt(value);
    case "number": return isNum(value);
    case "boolean": return typeof value === "boolean";
    case "array": return Array.isArray(value);
    case "object": return isDict(value);
    case "null": return value === null || value === undefined;
    default: return true;
  }
}

// Every key at a schema position must be a keyword this checker evaluates.
export function vocabProblems(schema, p, out) {
  if (!isDict(schema)) return;
  for (const k of Object.keys(schema)) {
    if (!SCHEMA_KEYWORDS.has(k)) {
      out.push(`${p}: '${k}' is not a JSON Schema keyword, so no validator reads it and ` +
        "whatever it says is unenforced (use a keyword, or move it into `description`)");
    }
  }
  const ref = get(schema, "$ref");
  if (typeof ref === "string" && !ref.startsWith("#")) {
    out.push(`${p}.$ref: '${ref}' is not a local reference (#/...) — this checker cannot ` +
      "follow it, so that subschema is never applied");
  }
  for (const k of SUB_ONE) if (isDict(get(schema, k))) vocabProblems(schema[k], `${p}.${k}`, out);
  for (const k of SUB_MAP) {
    if (isDict(get(schema, k))) for (const [name, sub] of Object.entries(schema[k])) vocabProblems(sub, `${p}.${k}.${name}`, out);
  }
  for (const k of SUB_LIST) {
    if (Array.isArray(get(schema, k))) schema[k].forEach((sub, i) => vocabProblems(sub, `${p}.${k}[${i}]`, out));
  }
}

// True when the schema encodes a rule beyond shape: a negative example should prove it.
export function hasConditional(schema) {
  if (!isDict(schema)) return false;
  if (CONDITIONAL_KEYWORDS.some((k) => has(schema, k))) return true;
  for (const k of SUB_ONE) if (hasConditional(get(schema, k))) return true;
  for (const k of SUB_MAP) {
    if (isDict(get(schema, k)) && Object.values(schema[k]).some(hasConditional)) return true;
  }
  for (const k of SUB_LIST) {
    if (Array.isArray(get(schema, k)) && schema[k].some(hasConditional)) return true;
  }
  return false;
}

// Follow a local $ref so `$defs` is usable. External refs are left alone;
// vocabProblems reports them. Mirrors contracts.py `_resolve`.
export function resolveRef(schema, root, depth = 0) {
  while (isDict(schema) && typeof get(schema, "$ref") === "string" && depth < 20) {
    const ref = schema.$ref;
    if (!ref.startsWith("#")) return schema;
    let node = root;
    for (let part of ref.replace(/^#+/, "").split("/").filter(Boolean)) {
      part = part.replace(/~1/g, "/").replace(/~0/g, "~");
      if (Array.isArray(node)) {
        if (!/^\s*[+-]?\d+\s*$/.test(part)) return schema;
        const i = parseInt(part, 10);
        const idx = i < 0 ? node.length + i : i;
        if (idx < 0 || idx >= node.length) return schema;
        node = node[idx];
      } else if (isDict(node) && has(node, part)) {
        node = node[part];
      } else {
        return schema;
      }
    }
    schema = node;
    depth += 1;
  }
  return schema;
}

function valid(value, schema, root) {
  const probs = [];
  checkSchema(value, schema, "", probs, root);
  return probs.length === 0;
}

// contracts.py `check_schema`: the full subset. Messages are appended to `out`.
export function checkSchema(value, schema, p, out, root = null) {
  root = root === null || root === undefined ? schema : root;
  schema = resolveRef(schema, root);
  if (schema === true || schema === null || schema === undefined) return;
  if (schema === false) {
    out.push(`${p}: schema is \`false\` — nothing is allowed here`);
    return;
  }
  if (!isDict(schema)) return;
  if (value === undefined) value = null;

  const t = get(schema, "type");
  if (truthy(t) && !typeOk(value, t)) {
    out.push(`${p}: expected ${pyStr(t)}, got ${pyTypeName(value)}`);
    return;
  }
  if (has(schema, "enum") && !pyIn(value, schema.enum)) {
    out.push(`${p}: ${pyRepr(value)} not in ${pyRepr(schema.enum)}`);
  }
  if (has(schema, "const") && !pyEq(value, schema.const)) {
    out.push(`${p}: ${pyRepr(value)} is not the required const ${pyRepr(schema.const)}`);
  }
  const allOf = get(schema, "allOf");
  if (Array.isArray(allOf)) for (const sub of allOf) checkSchema(value, sub, p, out, root);
  const anyOf = get(schema, "anyOf");
  if (Array.isArray(anyOf) && !anyOf.some((x) => valid(value, x, root))) {
    out.push(`${p}: matches none of the ${anyOf.length} anyOf alternatives`);
  }
  const oneOf = get(schema, "oneOf");
  if (Array.isArray(oneOf)) {
    const n = oneOf.filter((x) => valid(value, x, root)).length;
    if (n !== 1) out.push(`${p}: matches ${n} of the ${oneOf.length} oneOf alternatives (exactly one must match)`);
  }
  if (has(schema, "not") && valid(value, schema.not, root)) {
    out.push(`${p}: matches the \`not\` subschema, which forbids it`);
  }
  if (has(schema, "if")) {
    const branch = valid(value, schema.if, root) ? "then" : "else";
    if (has(schema, branch)) checkSchema(value, schema[branch], p, out, root);
  }

  if (isDict(value)) {
    for (const r of asList(get(schema, "required"))) {
      if (!has(value, r)) out.push(`${p}: missing required key '${r}'`);
    }
    for (const [k, needed] of Object.entries(orDict(get(schema, "dependentRequired")))) {
      if (has(value, k)) for (const r of asList(needed)) if (!has(value, r)) out.push(`${p}: '${k}' is present, so '${r}' is required too`);
    }
    for (const [k, sub] of Object.entries(orDict(get(schema, "dependentSchemas")))) {
      if (has(value, k)) checkSchema(value, sub, p, out, root);
    }
    const mnP = get(schema, "minProperties");
    const mxP = get(schema, "maxProperties");
    const nProps = pyLen(value);
    if (isInt(mnP) && nProps < mnP) out.push(`${p}: has ${nProps} propertie(s), minProperties is ${mnP}`);
    if (isInt(mxP) && nProps > mxP) out.push(`${p}: has ${nProps} propertie(s), maxProperties is ${mxP}`);
    const props = orDict(get(schema, "properties"));
    const patterns = orDict(get(schema, "patternProperties"));
    for (const [k, sub] of Object.entries(props)) {
      if (has(value, k)) checkSchema(value[k], sub, `${p}.${k}`, out, root);
    }
    for (const [pat, sub] of Object.entries(patterns)) {
      const rx = compileRe(pat);
      if (!rx) { out.push(`${p}: patternProperties key '${pat}' is not a valid regex`); continue; }
      for (const k of Object.keys(value)) if (rx.test(k)) checkSchema(value[k], sub, `${p}.${k}`, out, root);
    }
    if (has(schema, "propertyNames")) {
      for (const k of Object.keys(value)) checkSchema(k, schema.propertyNames, `${p}.<key ${k}>`, out, root);
    }
    const ap = get(schema, "additionalProperties");
    if (ap !== null && ap !== true) {
      const covered = (k) => has(props, k) || Object.keys(patterns).some((pat) => { const rx = compileRe(pat); return rx ? rx.test(k) : false; });
      for (const k of Object.keys(value)) {
        if (covered(k)) continue;
        if (ap === false) out.push(`${p}.${k}: additional property not allowed`);
        else if (isDict(ap)) checkSchema(value[k], ap, `${p}.${k}`, out, root);
      }
    }
  }

  if (Array.isArray(value)) {
    const prefix = get(schema, "prefixItems");
    if (Array.isArray(prefix)) {
      prefix.slice(0, value.length).forEach((sub, i) => checkSchema(value[i], sub, `${p}[${i}]`, out, root));
    }
    const rest = Array.isArray(prefix) ? prefix.length : 0;
    if (has(schema, "items") && schema.items !== true) {
      if (schema.items === false) {
        if (value.length > rest) out.push(`${p}: ${value.length - rest} extra item(s) but items is \`false\``);
      } else {
        for (let i = rest; i < value.length; i++) checkSchema(value[i], schema.items, `${p}[${i}]`, out, root);
      }
    }
    const mnI = get(schema, "minItems");
    const mxI = get(schema, "maxItems");
    if (isInt(mnI) && value.length < mnI) out.push(`${p}: has ${value.length} item(s), minItems is ${mnI}`);
    if (isInt(mxI) && value.length > mxI) out.push(`${p}: has ${value.length} item(s), maxItems is ${mxI}`);
    if (get(schema, "uniqueItems") === true) {
      const seen = [];
      for (const it of value) {
        const key = pyDumps(it, { sortKeys: true, ensureAscii: false });
        if (seen.includes(key)) { out.push(`${p}: uniqueItems, but ${key} appears more than once`); break; }
        seen.push(key);
      }
    }
    if (has(schema, "contains")) {
      const hits = value.filter((it) => valid(it, schema.contains, root)).length;
      const lo = has(schema, "minContains") ? schema.minContains : 1;
      const hi = get(schema, "maxContains");
      if (isInt(lo) && hits < lo) out.push(`${p}: ${hits} item(s) match \`contains\`, minContains is ${lo}`);
      if (isInt(hi) && hits > hi) out.push(`${p}: ${hits} item(s) match \`contains\`, maxContains is ${hi}`);
    }
  }

  if (typeof value === "string") {
    const mnL = get(schema, "minLength");
    const mxL = get(schema, "maxLength");
    const pat = get(schema, "pattern");
    const n = pyLen(value);
    if (isInt(mnL) && n < mnL) out.push(`${p}: ${n} character(s), minLength is ${mnL}`);
    if (isInt(mxL) && n > mxL) out.push(`${p}: ${n} character(s), maxLength is ${mxL}`);
    if (typeof pat === "string") {
      const rx = compileRe(pat);
      if (!rx) out.push(`${p}: pattern ${pyRepr(pat)} is not a valid regex`);
      else if (!rx.test(value)) out.push(`${p}: ${pyRepr(value)} does not match pattern ${pyRepr(pat)}`);
    }
  }

  if (isNum(value)) {
    const bounds = [
      ["minimum", (v, b) => v >= b, "below minimum"],
      ["maximum", (v, b) => v <= b, "above maximum"],
      ["exclusiveMinimum", (v, b) => v > b, "not above exclusiveMinimum"],
      ["exclusiveMaximum", (v, b) => v < b, "not below exclusiveMaximum"],
    ];
    for (const [k, ok, word] of bounds) {
      const b = get(schema, k);
      if (isNum(b) && !ok(value, b)) out.push(`${p}: ${pyNum(value)} is ${word} ${pyNum(b)}`);
    }
    const mo = get(schema, "multipleOf");
    if (isNum(mo) && mo > 0 && value % mo !== 0) out.push(`${p}: ${pyNum(value)} is not a multiple of ${pyNum(mo)}`);
  }
}

// validate.py `check_schema`: type, enum, required, properties, items only, no $ref.
// Same message strings as the superset, so a caller can switch without a wording change.
export function checkSchemaCore(value, schema, p, out) {
  if (!isDict(schema)) return;
  if (value === undefined) value = null;
  const t = get(schema, "type");
  if (truthy(t) && !typeOk(value, t)) {
    out.push(`${p}: expected ${pyStr(t)}, got ${pyTypeName(value)}`);
    return;
  }
  if (has(schema, "enum") && !pyIn(value, schema.enum)) {
    out.push(`${p}: ${pyRepr(value)} not in ${pyRepr(schema.enum)}`);
  }
  if (isDict(value)) {
    for (const r of asList(get(schema, "required"))) {
      if (!has(value, r)) out.push(`${p}: missing required key '${r}'`);
    }
    for (const [k, sub] of Object.entries(orDict(get(schema, "properties")))) {
      if (has(value, k)) checkSchemaCore(value[k], sub, `${p}.${k}`, out);
    }
  }
  if (Array.isArray(value) && has(schema, "items")) {
    value.forEach((item, i) => checkSchemaCore(item, schema.items, `${p}[${i}]`, out));
  }
}

// Python truthiness of a `type` value: a non-empty string or non-empty list.
function truthy(t) {
  if (t === null || t === undefined || t === false) return false;
  if (typeof t === "string" || Array.isArray(t)) return t.length > 0;
  return true;
}

function pyIn(value, coll) {
  if (Array.isArray(coll)) return coll.some((x) => pyEq(value, x));
  if (isDict(coll)) return typeof value === "string" && has(coll, value);
  if (typeof coll === "string") return typeof value === "string" && coll.includes(value);
  return false;
}

const asList = (v) => (Array.isArray(v) ? v : []);
const orDict = (v) => (isDict(v) ? v : {});

// shared/schemas/<name>.schema.json, or null when it cannot be read (validate.py `load_schema`).
export function loadSchema(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, `${name}.schema.json`), "utf8"));
  } catch {
    return null;
  }
}
