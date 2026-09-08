"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHarness = createHarness;
const ts_morph_1 = require("ts-morph");
const astHelpers_1 = require("../../utils/astHelpers");
function createHarness(source, filePath = "test.ts") {
    const project = new ts_morph_1.Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile(filePath, source);
    const functions = (0, astHelpers_1.extractFunctions)(sourceFile);
    const getCtx = (name, options = {}) => {
        const found = functions.find((fn) => fn.name === name);
        if (!found) {
            throw new Error(`Function "${name}" not found. Available: ${functions.map((f) => f.name).join(", ")}`);
        }
        return {
            node: found.node,
            sourceFile,
            options,
            dependencyValues: {},
        };
    };
    return { sourceFile, getCtx };
}
//# sourceMappingURL=testUtils.js.map