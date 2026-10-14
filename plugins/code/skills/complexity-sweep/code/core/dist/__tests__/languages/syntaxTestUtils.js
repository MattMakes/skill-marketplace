"use strict";
// Test helpers for the Python and Rust backends. Contract file.
//
// Call `await initSyntaxParsers()` in `beforeAll` before any helper here.
// Trees are not deleted: a test process is short-lived.
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSyntaxParsers = void 0;
exports.parseFixture = parseFixture;
exports.functionNodes = functionNodes;
exports.syntaxCtx = syntaxCtx;
const syntaxHelpers_1 = require("../../languages/syntaxHelpers");
const treeSitter_1 = require("../../languages/treeSitter");
var treeSitter_2 = require("../../languages/treeSitter");
Object.defineProperty(exports, "initSyntaxParsers", { enumerable: true, get: function () { return treeSitter_2.initSyntaxParsers; } });
const FUNCTION_TYPE = {
    python: "function_definition",
    rust: "function_item",
};
function parseFixture(language, text, filePath = language === "python" ? "test.py" : "test.rs") {
    return (0, treeSitter_1.parseSyntaxSource)({ language, filePath, text });
}
/** Every function node in the file, in pre-order (outer before nested). */
function functionNodes(file) {
    const found = [];
    (0, syntaxHelpers_1.walkDescendants)(file.tree.rootNode, (node) => {
        if (node.type === FUNCTION_TYPE[file.language])
            found.push(node);
    });
    return found;
}
/**
 * Metric context for the `index`-th function node (pre-order) in `text`.
 * Does not depend on a backend's extractFunctions, so every unit can use it.
 */
function syntaxCtx(language, text, index = 0, options = {}, dependencyValues = {}) {
    const file = parseFixture(language, text);
    const nodes = functionNodes(file);
    const node = nodes[index];
    if (node === undefined) {
        throw new Error(`Function node #${index} not found; the file has ${nodes.length}.`);
    }
    return { language, node, file, options, dependencyValues };
}
//# sourceMappingURL=syntaxTestUtils.js.map