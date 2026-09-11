#!/usr/bin/env node
// G2 for leaf 1.4.1: every command the docs tell Claude to run exists. For each mention of
// `ddd.mjs <cmd…>` in a SKILL.md, README, reference or agent file, the command words must
// resolve to a real subcommand of `node shared/bin/ddd.mjs --help`, and every `--flag` named on
// that line must be one the subcommand's own `--help` accepts. Backticked short forms
// (`ddd validate --status`, the documents' shorthand for the same call) are checked the same way.
//
// A doc that tells Claude to run a command that does not exist is the worst outcome of the
// cut-over, so the surface is read from the CLI itself, never from a list kept here.
//
// Usage: node plugins/code/shared/tests/checks/1.4.1/check-doc-commands.mjs <plugin-dir>
// Exit 0 pass, 1 fail, 2 usage.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const MARKER = "doc-commands verification passed";

const args = process.argv.slice(2);
if (args.length !== 1 || args[0].startsWith("-")) {
  console.error("usage: node plugins/code/shared/tests/checks/1.4.1/check-doc-commands.mjs <plugin-dir>");
  process.exit(2);
}
const plugin = path.resolve(args[0]);
const BIN = path.join(plugin, "shared", "bin", "ddd.mjs");
if (!fs.existsSync(BIN)) { console.error(`usage: ${args[0]} has no shared/bin/ddd.mjs`); process.exit(2); }

function run(argv) {
  const r = spawnSync(process.execPath, [BIN, ...argv], { encoding: "utf8", env: { ...process.env, DDD_NO_RENDER: "1" } });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

// 1. The real surface: command words from --help, flags from each command's --help.
const help = run(["--help"]);
if (help.code !== 0) { console.error(`error: ddd --help exited ${help.code}`); process.exit(2); }
const commands = new Map(); // "validate" | "discover lint" -> Set(flags)
for (const line of help.out.split("\n")) {
  const m = /^  ([a-z]+(?: [a-z]+)?)\s{2,}\S/.exec(line);
  if (m) commands.set(m[1], null);
}
if (!commands.size) { console.error("error: could not read the command list from --help"); process.exit(2); }
const failures = [];
for (const name of commands.keys()) {
  const r = run([...name.split(" "), "--help"]);
  if (r.code !== 0) { failures.push(`${name} --help exits ${r.code}`); commands.set(name, new Set()); continue; }
  const flags = new Set(r.out.match(/(?<![\w-])--?[a-zA-Z][\w-]*/g) || []);
  flags.add("--help"); flags.add("-h");
  commands.set(name, flags);
}

// 2. The docs.
function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!["node_modules", ".git", "goldens", "fixtures"].includes(ent.name)) yield* walk(p); }
    else if (ent.isFile() && ent.name.endsWith(".md")) yield p;
  }
}
const docs = [];
for (const root of ["skills", "agents", "shared/references", "shared/tests"]) {
  const d = path.join(plugin, root);
  if (fs.existsSync(d)) docs.push(...walk(d));
}
for (const f of ["README.md", "docs/ddd.md", "shared/README.md"]) if (fs.existsSync(path.join(plugin, f))) docs.push(path.join(plugin, f));

function resolveWords(w1, w2) {
  if (w2 && commands.has(`${w1} ${w2}`)) return { name: `${w1} ${w2}`, consumed: 2 };
  if (commands.has(w1)) return { name: w1, consumed: 1 };
  return null;
}
const WORD = /^[a-z]+$/;
let mentions = 0;
// argText is everything after `ddd.mjs` / `ddd` up to the end of the line or the closing backtick.
function checkMention(file, lineNo, argText, form) {
  const toks = argText.trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return;
  if (toks[0] === "--help" || toks[0] === "-h") { mentions++; return; }
  if (/^<[^>]+>$/.test(toks[0]) || toks[0] === "…") return; // `ddd <cmd>` placeholder in prose
  if (!WORD.test(toks[0])) return;                             // prose after the path, not a call
  mentions++;
  const w1 = toks[0];
  const w2 = toks[1] && WORD.test(toks[1]) ? toks[1] : undefined;
  const r = resolveWords(w1, w2);
  const where = `${path.relative(plugin, file)}:${lineNo}`;
  if (!r) { failures.push(`${where}: ${form} '${[w1, w2].filter(Boolean).join(" ")}' is not a command`); return; }
  for (const raw of toks.slice(r.consumed)) {
    if (raw.startsWith("#")) break;                            // a trailing comment
    const t = raw.replace(/[,.;:)\]]+$/, "");
    if (!/^--?[a-zA-Z][\w-]*$/.test(t)) continue;
    if (!commands.get(r.name).has(t)) failures.push(`${where}: '${r.name}' does not accept ${t}`);
  }
}
for (const file of docs) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // Long form: node …/ddd.mjs <words> <args…>
    for (const m of line.matchAll(/node\s+\S*ddd\.mjs\s+([^`\n]*)/g)) checkMention(file, i + 1, m[1], "ddd.mjs");
    // Short form inside backticks: `ddd <words> <args…>`
    for (const m of line.matchAll(/`ddd ([^`]*)`/g)) checkMention(file, i + 1, m[1], "`ddd …`");
  });
}

// Positive control: a made-up command and a made-up flag must be caught.
const before = failures.length;
checkMention("control.md", 1, "validate ddd --no-such-flag", "control");
checkMention("control.md", 2, "frobnicate all", "control");
if (failures.length !== before + 2) { console.log("doc-commands verification FAILED: the control mentions were not caught"); process.exit(1); }
failures.length = before;

if (failures.length) {
  console.log(`doc-commands verification FAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`${mentions} command mention(s) in ${docs.length} document(s) resolve to ${commands.size} real subcommands with accepted flags`);
console.log(MARKER);
