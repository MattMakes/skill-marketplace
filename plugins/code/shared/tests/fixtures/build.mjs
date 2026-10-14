// Derives the three golden fixtures from the shipped meal-kit example at run time.
//
// The fixtures are never checked in as directories: keeping them as a derivation
// means `mealkit` is verbatim by construction (it is a plain copy) and the two
// mutants can never drift from the example they claim to be based on. Every
// caller gets a fresh copy in a directory it owns, so nothing here can touch
// plugins/code/shared/examples/mealkit or a real workspace.
//
//   import { FIXTURES, materialise } from "./build.mjs";
//   const root = materialise("truncated-3", "/tmp/somewhere");   // -> /tmp/somewhere/truncated-3
//
// `root` is the project root; the workspace is `<root>/ddd`. See README.md next to
// this file for what each fixture is meant to prove.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SHARED = path.resolve(HERE, "..", "..");
export const MEALKIT = path.join(SHARED, "examples", "mealkit");

export const STEPS = ["understand", "discover", "decompose", "strategize", "connect",
  "organise", "define", "code", "contracts"];
const FOLDER = Object.fromEntries(STEPS.map((s, i) => [s, `${String(i + 1).padStart(2, "0")}-${s}`]));

// A dangling event id for broken-refs. It must not exist anywhere in discover.json,
// otherwise validate would accept it and the fixture would stop proving anything.
export const DANGLING_EVENT = "subscription-teleported";

export const FIXTURES = {
  // The example as shipped. Every step done, every gate green.
  mealkit(root) { void root; },

  // Steps 1-3 done, 4-9 not started: what a workspace looks like mid-run. Step
  // folders 04..09 are removed and their manifest entries reset to a bare
  // `pending`, dropping `artifacts` and `open_questions` that would otherwise
  // point at files that no longer exist.
  "truncated-3"(root) {
    const ddd = path.join(root, "ddd");
    for (const step of STEPS.slice(3)) {
      fs.rmSync(path.join(ddd, FOLDER[step]), { recursive: true, force: true });
    }
    const mp = path.join(ddd, "manifest.json");
    const manifest = readJson(mp);
    for (const step of STEPS.slice(3)) manifest.steps[step] = { status: "pending" };
    writeJson(mp, manifest);
  },

  // mealkit with one dangling event id in decompose.json so `validate` exits 1.
  // The id is appended to the first context's `owns_events`; nothing else changes,
  // so every other command still has a complete workspace to work on.
  "broken-refs"(root) {
    const dp = path.join(root, "ddd", FOLDER.decompose, "decompose.json");
    const decompose = readJson(dp);
    const ctx = decompose.bounded_contexts?.[0] ?? decompose.contexts?.[0];
    if (!ctx || !Array.isArray(ctx.owns_events)) {
      throw new Error(`broken-refs: cannot find a bounded context with owns_events in ${dp}`);
    }
    ctx.owns_events.push(DANGLING_EVENT);
    writeJson(dp, decompose);
  },
};

export const FIXTURE_NAMES = Object.keys(FIXTURES);

// Copy the example into `<destDir>/<name>` and apply the fixture's mutation.
// Returns the project root of the copy.
export function materialise(name, destDir) {
  const mutate = FIXTURES[name];
  if (!mutate) throw new Error(`unknown fixture '${name}' (known: ${FIXTURE_NAMES.join(", ")})`);
  const root = path.join(destDir, name);
  fs.rmSync(root, { recursive: true, force: true });
  fs.cpSync(MEALKIT, root, { recursive: true });
  mutate(root);
  return root;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// Same shape as the Python writers: indent 2, non-ASCII preserved, trailing newline.
function writeJson(p, value) {
  fs.writeFileSync(p, JSON.stringify(value, null, 2) + "\n");
}

// `node build.mjs <destDir>` materialises all three, for a look by hand.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = process.argv[2];
  if (!dest) {
    console.error("usage: node build.mjs <destDir>");
    process.exit(2);
  }
  for (const name of FIXTURE_NAMES) console.log(materialise(name, path.resolve(dest)));
}
