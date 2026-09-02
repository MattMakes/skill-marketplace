#!/usr/bin/env node
// Second positive-control twin: re-runs the recorded Python script for the
// subcommand words it is given, so replaying it is Python replaying itself.
// This catches nondeterminism the normaliser missed. It only works while the
// scripts still exist; the harness check skips it, with a printed note, once
// leaf 1.4.1 has deleted them.
import { spawnSync } from "node:child_process";
import { findCommand, pythonArgv } from "../../../golden.mjs";

const argv = process.argv.slice(2);
const two = argv.length > 1 ? findCommand([argv[0], argv[1]]) : null;
const cmd = two || findCommand([argv[0]]);
if (!cmd) {
  process.stderr.write(`python-twin: unknown subcommand ${argv.slice(0, 2).join(" ")}\n`);
  process.exit(2);
}
const rest = argv.slice(two ? 2 : 1);
const r = spawnSync(process.env.PYTHON || "python3", pythonArgv(cmd, rest), { stdio: "inherit" });
if (r.error) {
  process.stderr.write(`python-twin: ${r.error.message}\n`);
  process.exit(2);
}
process.exit(r.status ?? 1);
