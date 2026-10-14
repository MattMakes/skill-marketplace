"use strict";
// Contract shared by the tree-sitter language backends (Python, Rust).
//
// TypeScript/JavaScript keep the ts-morph path (`MetricDefinition.compute`).
// Every other language is parsed with web-tree-sitter and analyzed through a
// `LanguageBackend`, which supplies function extraction and one
// `SyntaxMetricCompute` per built-in metric key.
//
// web-tree-sitter gotcha: every node access returns a NEW JS object, so
// `a === b` is false for the same node. Compare nodes with `sameNode` from
// `./syntaxHelpers` (`a.id === b.id`), and cache per node with
// `createNodeCache` (keyed on the Tree object, then on `node.id`).
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=types.js.map