#!/usr/bin/env node
// The one ddd CLI. `ddd <cmd> [sub] [dir] [flags]` mirrors every Python script and flag
// from design §3.3: same stdout/stderr, same exit codes (0 ok, 1 gate failed, 2
// usage/IO; lint always 0), same files written.
//
// init, mark and stamp live here (via ../lib/manifest.mjs). Every other subcommand is
// resolved to a module path in COMMANDS and imported on demand, so the CLI surface is
// complete before the ports land: an absent module prints `ddd: <cmd> is not
// implemented yet` and exits 2. A command module exports `main(argv, ctx)` (or a
// default export) that returns the exit code; `argv` is everything after the command
// words, `ctx` is `{ words, bin }`.
//
// The argument parser below covers the argparse subset the Python scripts used:
// `--flag value`, `--flag=value`, unique prefixes, `choices`, `type=int`,
// `action="append"`, `nargs="*"`, `store_true`, positionals with choices or a default,
// and `--` to end options. Usage errors go to stderr with exit 2; their wording is not
// golden-recorded, so it is plain rather than argparse's.
//
// Output is written with process.stdout.write and the exit code is set through
// process.exitCode, never process.exit(): on macOS a piped stdout is asynchronous and
// process.exit() can truncate what a caller such as the golden harness reads.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ExitError, STATUSES, STEPS, initWorkspace, markStep, stamp } from "../lib/manifest.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(HERE, "..", "lib");
const SKILLS = path.resolve(HERE, "..", "..", "skills");

const out = (s) => process.stdout.write(s);
const err = (s) => process.stderr.write(s);

// ---------------------------------------------------------------------------
// Subcommand table: design §3.3 plus `export blueprint` (design §4.5). `module` is
// where the dispatcher looks; null means built in.
// ---------------------------------------------------------------------------
const STEP_VERBS = {
  understand: ["lint"],
  discover: ["lint", "render", "glossary"],
  decompose: ["worksheet", "check"],
  strategize: ["worksheet", "lint", "render"],
  connect: ["inputs", "render"],
  organise: ["brief", "check", "mermaid"],
  define: ["prefill", "render"],
  code: ["prefill", "check"],
  contracts: ["prefill", "check", "render"],
};

export const COMMANDS = [
  { words: ["init"], module: null, usage: "[--dir ddd] --project <slug> [--title ...] [--mode interactive|auto] [--depth light|standard|deep] [--deployables-min N] [--deployables-max N] [--teams N] [--notes ...] [--source PATH ...] [--from-understand PATH]", help: "create or update ddd/manifest.json" },
  { words: ["mark"], module: null, usage: "[--dir ddd] <step> <status> [--mode interactive|auto] [--artifacts PATH ...] [--open-questions N] [--note ...]", help: "record a step's status in the manifest (then refresh the review page)" },
  { words: ["stamp"], module: null, usage: "<step.json> [...]", help: "set produced_at on step artifacts" },
  { words: ["validate"], module: path.join(LIB, "validate.mjs"), usage: "[dir] [--step <name>] [--status] [--strict] [--json] [--no-notes]", help: "schemas, cross-step references, staleness" },
  { words: ["review"], module: path.join(LIB, "review.mjs"), usage: "[dir] [-o FILE] [--title ...] [--no-diagrams] [--relayout]", help: "build the self-contained review page" },
  ...Object.entries(STEP_VERBS).flatMap(([step, verbs]) => verbs.map((verb) => ({
    words: [step, verb],
    module: path.join(SKILLS, `ddd-${step}`, "scripts", `${verb}.mjs`),
    usage: "[dir|file] [flags]",
    help: `ddd-${step} ${verb}`,
  }))),
  { words: ["export", "blueprint"], module: path.join(LIB, "render", "export", "blueprint.mjs"), usage: "<dir> [--deliver]", help: "write blueprint architecture and sequence specs" },
  { words: ["decision", "render"], module: path.join(LIB, "render", "diagrams", "decision.mjs"), usage: "<dir> <Did>", help: "render one decision's option diagrams side by side" },
];

export function usageText() {
  const lines = ["usage: ddd <command> [args]", "", "commands:"];
  const width = Math.max(...COMMANDS.map((c) => c.words.join(" ").length));
  for (const c of COMMANDS) lines.push(`  ${c.words.join(" ").padEnd(width)}  ${c.help}`);
  lines.push("", "run `ddd <command> --help` for the command's flags; `ddd --help` prints this list.");
  return lines.join("\n") + "\n";
}

function findCommand(argv) {
  for (const c of COMMANDS) {
    if (c.words.every((w, i) => argv[i] === w)) return c;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Argument parser (argparse subset).
// ---------------------------------------------------------------------------
class UsageError extends Error {}

// spec: { prog, options: { "--flag": { dest, type: "int"|"string", choices, action: "append"|"store_true", nargs: "*", default } },
//         positionals: [{ dest, choices, nargs: "?"|"*", default }] }
function parseArgs(spec, argv) {
  const res = {};
  const names = Object.keys(spec.options);
  for (const n of names) {
    const o = spec.options[n];
    res[o.dest] = o.action === "append" ? [...(o.default ?? [])] : o.action === "store_true" ? false : (o.default ?? undefined);
  }
  const positional = [];
  let i = 0;
  let onlyPositional = false;
  const isOpt = (a) => !onlyPositional && a.startsWith("-") && a.length > 1 && !/^-\d/.test(a);
  while (i < argv.length) {
    const a = argv[i];
    if (!onlyPositional && a === "--") { onlyPositional = true; i++; continue; }
    if (!isOpt(a)) { positional.push(a); i++; continue; }
    let [name, inline] = a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, undefined];
    if (name === "-h" || name === "--help") return { help: true };
    if (!spec.options[name]) {
      const matches = names.filter((n) => n.startsWith(name));
      if (matches.length === 1) name = matches[0];
      else if (matches.length > 1) throw new UsageError(`ambiguous option: ${name} could match ${matches.join(", ")}`);
      else throw new UsageError(`unrecognized arguments: ${a}`);
    }
    const o = spec.options[name];
    i++;
    if (o.action === "store_true") {
      if (inline !== undefined) throw new UsageError(`argument ${name}: ignored explicit argument '${inline}'`);
      res[o.dest] = true;
      continue;
    }
    if (o.nargs === "*") {
      const vals = inline !== undefined ? [inline] : [];
      while (inline === undefined && i < argv.length && !isOpt(argv[i]) && argv[i] !== "--") vals.push(argv[i++]);
      res[o.dest] = vals.map((v) => convert(o, name, v));
      continue;
    }
    let value = inline;
    if (value === undefined) {
      if (i >= argv.length || (isOpt(argv[i]) && argv[i] !== "--")) throw new UsageError(`argument ${name}: expected one argument`);
      value = argv[i++];
    }
    value = convert(o, name, value);
    if (o.action === "append") res[o.dest].push(value);
    else res[o.dest] = value;
  }
  // Positionals.
  let p = 0;
  for (const spec_ of spec.positionals ?? []) {
    if (spec_.nargs === "*") { res[spec_.dest] = positional.slice(p); p = positional.length; continue; }
    if (p >= positional.length) {
      if (spec_.nargs === "?") { res[spec_.dest] = spec_.default; continue; }
      throw new UsageError(`the following arguments are required: ${spec_.dest}`);
    }
    const v = positional[p++];
    if (spec_.choices && !spec_.choices.includes(v)) {
      throw new UsageError(`argument ${spec_.dest}: invalid choice: '${v}' (choose from ${spec_.choices.map((c) => `'${c}'`).join(", ")})`);
    }
    res[spec_.dest] = v;
  }
  if (p < positional.length) throw new UsageError(`unrecognized arguments: ${positional.slice(p).join(" ")}`);
  return res;
}

function convert(o, name, v) {
  if (o.type === "int") {
    if (!/^\s*[+-]?\d+\s*$/.test(v)) throw new UsageError(`argument ${name}: invalid int value: '${v}'`);
    return parseInt(v, 10);
  }
  if (o.choices && !o.choices.includes(v)) {
    throw new UsageError(`argument ${name}: invalid choice: '${v}' (choose from ${o.choices.map((c) => `'${c}'`).join(", ")})`);
  }
  return v;
}

// ---------------------------------------------------------------------------
// init / mark / stamp
// ---------------------------------------------------------------------------
const INIT_SPEC = {
  options: {
    "--dir": { dest: "dir", default: "ddd" },
    "--project": { dest: "project" },
    "--title": { dest: "title" },
    "--mode": { dest: "mode", choices: ["interactive", "auto"] },
    "--depth": { dest: "depth", choices: ["light", "standard", "deep"] },
    "--deployables-min": { dest: "deployablesMin", type: "int" },
    "--deployables-max": { dest: "deployablesMax", type: "int" },
    "--teams": { dest: "teams", type: "int" },
    "--notes": { dest: "notes" },
    "--source": { dest: "source", action: "append", default: [] },
    "--from-understand": { dest: "fromUnderstand" },
  },
  positionals: [],
};

const MARK_SPEC = {
  options: {
    "--dir": { dest: "dir", default: "ddd" },
    "--mode": { dest: "mode", choices: ["interactive", "auto"] },
    "--artifacts": { dest: "artifacts", nargs: "*" },
    "--open-questions": { dest: "openQuestions", type: "int" },
    "--note": { dest: "note" },
  },
  positionals: [
    { dest: "step", choices: STEPS },
    { dest: "status", choices: STATUSES },
  ],
};

function runInit(argv) {
  const a = parseArgs(INIT_SPEC, argv);
  if (a.help) { out(`usage: ddd init ${findCommand(["init"]).usage}\n`); return 0; }
  const r = initWorkspace(a);
  out(r.stdout.join("\n") + "\n");
  return 0;
}

async function runMark(argv) {
  const a = parseArgs(MARK_SPEC, argv);
  if (a.help) { out(`usage: ddd mark ${findCommand(["mark"]).usage}\n`); return 0; }
  const r = markStep(a.dir, a.step, a.status, a);
  out(r.stdout.join("\n") + "\n");
  await reviewHook(a.dir);
  return 0;
}

// The `ddd mark` seam: after the manifest is written, refresh the review page and
// the diagrams if review.mjs exists (leaf 1.2.4 supplies it). DDD_NO_RENDER=1 skips
// the import entirely, which is how the goldens keep mark's output Python-identical.
// Whatever happens in here is reported on stderr with a `review:` prefix and never
// changes mark's exit code.
async function reviewHook(dir) {
  if (process.env.DDD_NO_RENDER === "1") return;
  const file = path.join(LIB, "review.mjs");
  if (!fs.existsSync(file)) return;
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.buildPage === "function") {
      const page = await mod.buildPage(dir, {});
      if (page && page.path) err(`review: wrote ${page.path}${page.bytes ? ` (${page.bytes} bytes)` : ""}\n`);
      for (const w of page?.warnings ?? []) err(`review: warning: ${w}\n`);
    }
    if (typeof mod.renderDiagrams === "function") {
      const d = await mod.renderDiagrams(dir);
      if (d) err(`review: ${(d.svg ?? []).length} svg, ${(d.png ?? []).length} png${d.note ? ` (${d.note})` : ""}\n`);
    }
  } catch (e) {
    err(`review: ${e && e.message ? e.message : String(e)}\n`);
  }
}

// The Python twin read argv raw: no flags, zero files is a silent success. `-h`/`--help`
// is the one addition (a file named --help would need `./--help`).
function runStamp(argv) {
  if (argv[0] === "-h" || argv[0] === "--help") { out(`usage: ddd stamp ${findCommand(["stamp"]).usage}\n`); return 0; }
  for (const file of argv) {
    let line;
    try {
      line = stamp(file);
    } catch (e) {
      err(`error: cannot stamp ${file}: ${e.message}\n`);
      return 1;
    }
    out(line + "\n");
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
export async function main(argv) {
  if (argv.length === 0) { err(usageText()); return 2; }
  if (argv[0] === "--help" || argv[0] === "-h") { out(usageText()); return 0; }
  const cmd = findCommand(argv);
  if (!cmd) {
    err(`ddd: unknown command '${argv.slice(0, 2).join(" ")}'\n\n${usageText()}`);
    return 2;
  }
  const rest = argv.slice(cmd.words.length);
  const name = cmd.words.join(" ");
  try {
    if (name === "init") return runInit(rest);
    if (name === "mark") return await runMark(rest);
    if (name === "stamp") return runStamp(rest);
    if (!fs.existsSync(cmd.module)) {
      err(`ddd: ${name} is not implemented yet\n`);
      return 2;
    }
    const mod = await import(pathToFileURL(cmd.module).href);
    const fn = typeof mod.main === "function" ? mod.main : mod.default;
    if (typeof fn !== "function") {
      err(`ddd: ${name}: ${cmd.module} exports no main()\n`);
      return 2;
    }
    const code = await fn(rest, { words: cmd.words, bin: fileURLToPath(import.meta.url) });
    return typeof code === "number" ? code : (process.exitCode ?? 0);
  } catch (e) {
    if (e instanceof UsageError) {
      err(`usage: ddd ${name} ${cmd.usage}\nddd ${name}: error: ${e.message}\n`);
      return 2;
    }
    if (e instanceof ExitError) {
      err(e.message + "\n");
      return e.exitCode;
    }
    throw e;
  }
}

const invokedDirectly = process.argv[1] && realpath(process.argv[1]) === fileURLToPath(import.meta.url);

function realpath(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}
if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
    err(`ddd: ${e && e.stack ? e.stack : e}\n`);
    process.exitCode = 2;
  });
}
