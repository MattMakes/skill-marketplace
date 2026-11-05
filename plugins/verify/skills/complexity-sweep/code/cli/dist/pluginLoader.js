"use strict";
// Plugin loader: dynamically imports user-provided MetricDefinitions and
// registers them on the registry. Plugin paths beginning with "." are
// resolved relative to the cosmiconfig file's directory; everything else is
// passed verbatim to `import()` (bare specifier or absolute path).
//
// A plugin missing `key` or `compute` is warned-about and skipped. Any
// thrown error (missing module, syntax error, etc.) is a hard exit(2).
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPlugins = loadPlugins;
const node_path_1 = require("node:path");
async function loadPlugins(pluginPaths, registry, configDir) {
    for (const pluginPath of pluginPaths) {
        await loadOne(pluginPath, registry, configDir);
    }
}
async function loadOne(pluginPath, registry, configDir) {
    const resolvedPath = pluginPath.startsWith(".")
        ? (0, node_path_1.resolve)(configDir, pluginPath)
        : pluginPath;
    try {
        const mod = await importModule(resolvedPath);
        const definitions = extractDefinitions(mod);
        for (const def of definitions) {
            if (!isValidDefinition(def)) {
                console.warn(`Warning: Plugin "${pluginPath}" exported invalid MetricDefinition.`);
                continue;
            }
            registry.register(def);
        }
    }
    catch (err) {
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
async function importModule(spec) {
    return (await Promise.resolve(`${spec}`).then(s => __importStar(require(s))));
}
function extractDefinitions(mod) {
    const def = mod.default;
    if (Array.isArray(def))
        return def;
    return [def];
}
function isValidDefinition(def) {
    if (!def || typeof def !== "object")
        return false;
    const d = def;
    return typeof d.key === "string" && typeof d.compute === "function";
}
//# sourceMappingURL=pluginLoader.js.map