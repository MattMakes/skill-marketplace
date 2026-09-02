#!/usr/bin/env node
// Root G5: the review page checker. The assertions live in checks/1.2.4/check-review.mjs
// (sections in order, self-contained, optionally an open decision with option cards and inline
// diagrams); this root script runs it with the same arguments so the root ledger has one path.
//
// Usage: node plugins/ddd/shared/tests/checks/root/check-review.mjs <review.html> [--require-open-decision] [--require-diagrams]
// Exit 0 pass (prints `review verification passed`), 1 fail, 2 usage.
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INNER = path.resolve(HERE, "..", "1.2.4", "check-review.mjs");
const r = spawnSync(process.execPath, [INNER, ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(r.status === null ? 2 : r.status);
