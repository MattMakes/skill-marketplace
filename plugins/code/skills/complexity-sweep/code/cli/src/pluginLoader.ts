// Plugin loader: dynamically imports user-provided MetricDefinitions and
// registers them on the registry. Plugin paths beginning with "." are
// resolved relative to the cosmiconfig file's directory; everything else is
// passed verbatim to `import()` (bare specifier or absolute path).
//
// A plugin missing `key` or `compute` is warned-about and skipped. Any
// thrown error (missing module, syntax error, etc.) is a hard exit(2).

import { resolve } from "node:path";

import type {
  MetricDefinition,
  MetricRegistry,
} from "static-analysis-core";

export async function loadPlugins(
  pluginPaths: readonly string[],
  registry: MetricRegistry,
  configDir: string,
): Promise<void> {
  for (const pluginPath of pluginPaths) {
    await loadOne(pluginPath, registry, configDir);
  }
}

async function loadOne(
  pluginPath: string,
  registry: MetricRegistry,
  configDir: string,
): Promise<void> {
  const resolvedPath = pluginPath.startsWith(".")
    ? resolve(configDir, pluginPath)
    : pluginPath;

  try {
    const mod = await importModule(resolvedPath);
    const definitions = extractDefinitions(mod);
    for (const def of definitions) {
      if (!isValidDefinition(def)) {
        console.warn(
          `Warning: Plugin "${pluginPath}" exported invalid MetricDefinition.`,
        );
        continue;
      }
      registry.register(def);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error loading plugin "${pluginPath}": ${message}`);
    process.exit(2);
  }
}

/** Load a plugin module by absolute path or bare specifier.
 *
 *  We pass the raw path (not a `file://` URL) straight to `import(...)`.
 *  - In vitest (native ESM TS execution), `import()` accepts absolute paths
 *    for `.cjs` / `.js` / `.mjs` files.
 *  - In the shipped CLI (`tsc` emits `module: commonjs`), `import(x)` is
 *    downleveled to `require(x)`, which handles absolute paths for `.cjs`
 *    and `.js` files.
 *  - Bare specifiers fall through to the host module resolver in both
 *    environments.
 *
 *  `.mjs` plugins are not loadable from the compiled CJS CLI — this matches
 *  the original's limitation; the behavior appendix only exercises `.cjs`.  */
async function importModule(spec: string): Promise<Record<string, unknown>> {
  return (await import(spec)) as Record<string, unknown>;
}

function extractDefinitions(
  mod: Record<string, unknown>,
): Array<MetricDefinition | unknown> {
  const def = mod.default;
  if (Array.isArray(def)) return def;
  return [def];
}

function isValidDefinition(def: unknown): def is MetricDefinition {
  if (!def || typeof def !== "object") return false;
  const d = def as Record<string, unknown>;
  return typeof d.key === "string" && typeof d.compute === "function";
}
