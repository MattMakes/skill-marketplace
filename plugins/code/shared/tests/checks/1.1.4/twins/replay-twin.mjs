#!/usr/bin/env node
// Positive-control twin: stands in for the recorded Python output itself.
//
// golden.mjs tells a twin which snapshot it is being compared against through
// GOLDEN_SNAPSHOT_DIR. This twin reads that snapshot, reverses the placeholders
// the harness normalises (`<DDD_DIR>`, `<ROOT>`, `<TS>`, `<KB>`), prints the
// recorded stdout and stderr, writes and deletes the recorded files, and exits
// with the recorded code. Replaying it must pass, and it needs no Python, so
// the harness check stays runnable after the scripts are deleted.
//
// GOLDEN_MUTATE=exit|stdout|files makes it deliberately wrong in one channel,
// which the harness check uses to prove each channel is compared.
import fs from "node:fs";
import path from "node:path";

const dir = process.env.GOLDEN_SNAPSHOT_DIR;
if (!dir || !fs.existsSync(path.join(dir, "exit.txt"))) {
  process.stderr.write("replay-twin: GOLDEN_SNAPSHOT_DIR is not set or has no snapshot\n");
  process.exit(2);
}
const root = process.cwd();
const read = (n) => fs.readFileSync(path.join(dir, n), "utf8");
const meta = JSON.parse(read("meta.json"));
const files = JSON.parse(read("files.json"));
const mutate = process.env.GOLDEN_MUTATE || "";

const reverse = (text) => text
  .split("<DDD_DIR>").join(path.join(root, "ddd"))
  .split("<ROOT>").join(root)
  .split("<TS>").join("2026-01-01T00:00:00Z")
  .split("<KB>").join("123");

for (const e of files.changed) {
  const p = path.join(root, e.path);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (typeof e.content === "string") {
    fs.writeFileSync(p, reverse(e.content));
  } else if (meta.files_policy === "paths") {
    // Compared by path only, so any bytes will do.
    fs.writeFileSync(p, "");
  } else {
    process.stderr.write(`replay-twin: ${e.path} was recorded as a hash; cannot reproduce it\n`);
    process.exit(2);
  }
  if (mutate === "files") fs.appendFileSync(p, "tampered\n");
}
for (const rel of files.deleted) fs.rmSync(path.join(root, rel), { force: true });

process.stdout.write(reverse(read("stdout.txt")) + (mutate === "stdout" ? "tampered\n" : ""));
process.stderr.write(reverse(read("stderr.txt")));
const exit = Number(read("exit.txt").trim());
process.exitCode = mutate === "exit" ? (exit === 0 ? 1 : 0) : exit;
