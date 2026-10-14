"use strict";
// Rust implementations of the 4 data-flow metrics. Tree-sitter nodes are
// compared by id through the shared helpers because each access creates a new
// JavaScript wrapper.
Object.defineProperty(exports, "__esModule", { value: true });
exports.rustGlobalDataComplexity = exports.rustSpecifiedDataComplexity = exports.rustVariableSpan = exports.rustPeakLiveVariables = void 0;
exports.buildRustDefUse = buildRustDefUse;
const syntaxHelpers_1 = require("../syntaxHelpers");
const nodeTypes_1 = require("./nodeTypes");
const INTERIOR_MUTABILITY_TYPES = [
    "Mutex",
    "RwLock",
    "RefCell",
    "Cell",
    "Atomic",
    "OnceCell",
    "OnceLock",
    "LazyLock",
    "Lazy",
];
const defUseCache = (0, syntaxHelpers_1.createNodeCache)();
/** Build Rust binding ranges in declaration order. */
function buildRustDefUse(node) {
    const cached = defUseCache.get(node);
    if (cached !== undefined)
        return cached;
    const infos = [];
    const patternSyntax = new Set();
    collectFunctionParameters(node, node, infos, patternSyntax);
    collectLocalDeclarations(node, infos, patternSyntax);
    const lastUseLines = infos.map((info) => info.defLine);
    scanIdentifierUses(node, infos, patternSyntax, lastUseLines);
    const entries = infos.map((info, index) => ({
        name: info.name,
        defLine: info.defLine,
        lastUseLine: lastUseLines[index] ?? info.defLine,
    }));
    defUseCache.set(node, entries);
    return entries;
}
function collectFunctionParameters(functionNode, scopeBoundary, infos, patternSyntax) {
    const parameters = functionNode.childForFieldName("parameters");
    if (parameters === null)
        return;
    for (const parameter of parameters.namedChildren) {
        if (parameter.type !== "parameter")
            continue;
        const pattern = parameter.childForFieldName("pattern");
        if (pattern === null)
            continue;
        addPatternBindings(pattern, scopeBoundary, null, null, infos, patternSyntax);
    }
}
function collectLocalDeclarations(root, infos, patternSyntax) {
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        if (node.type === "let_declaration") {
            const pattern = node.childForFieldName("pattern");
            const block = nearestAncestorOfType(node, "block", root);
            if (pattern !== null && block !== null) {
                addPatternBindings(pattern, block, node.childForFieldName("value"), null, infos, patternSyntax);
            }
            return;
        }
        if (node.type === "for_expression") {
            const pattern = node.childForFieldName("pattern");
            const body = node.childForFieldName("body");
            if (pattern !== null && body !== null) {
                addPatternBindings(pattern, body, node.childForFieldName("value"), null, infos, patternSyntax);
            }
            return;
        }
        if (node.type === "closure_expression") {
            collectClosureParameters(node, infos, patternSyntax);
            return;
        }
        if (node.type === "match_arm") {
            const pattern = node.childForFieldName("pattern");
            if (pattern !== null) {
                addPatternBindings(pattern, node, null, null, infos, patternSyntax);
            }
            return;
        }
        if (node.type === "let_condition") {
            collectLetCondition(node, root, infos, patternSyntax);
        }
    });
}
function collectClosureParameters(closure, infos, patternSyntax) {
    const parameters = closure.childForFieldName("parameters");
    const body = closure.childForFieldName("body");
    if (parameters === null || body === null)
        return;
    for (const parameter of parameters.namedChildren) {
        const pattern = parameter.type === "parameter"
            ? parameter.childForFieldName("pattern")
            : parameter;
        if (pattern === null)
            continue;
        addPatternBindings(pattern, body, null, null, infos, patternSyntax);
    }
}
function collectLetCondition(condition, root, infos, patternSyntax) {
    const pattern = condition.childForFieldName("pattern");
    if (pattern === null)
        return;
    const owner = nearestAncestorWithTypes(condition, new Set(["if_expression", "while_expression"]), root);
    if (owner === null)
        return;
    const excludedScope = owner.type === "if_expression"
        ? owner.childForFieldName("alternative")
        : null;
    addPatternBindings(pattern, owner, condition.childForFieldName("value"), excludedScope, infos, patternSyntax);
}
function addPatternBindings(pattern, scopeBoundary, initializer, excludedScope, infos, patternSyntax) {
    const bindings = bindingLeaves(pattern, patternSyntax);
    for (const binding of bindings) {
        infos.push({
            name: binding.name,
            defLine: (0, syntaxHelpers_1.lineOf)(binding.node),
            pattern,
            scopeBoundary,
            initializer,
            excludedScope,
        });
    }
}
function bindingLeaves(pattern, patternSyntax) {
    const bindings = [];
    const names = new Set();
    const guard = pattern.type === "match_pattern"
        ? pattern.childForFieldName("condition")
        : null;
    visitPatternNode(pattern, pattern, bindings, names, patternSyntax);
    (0, syntaxHelpers_1.walkDescendants)(pattern, (node) => {
        if (guard !== null && (0, syntaxHelpers_1.sameNode)(node, guard))
            return false;
        visitPatternNode(node, pattern, bindings, names, patternSyntax);
    });
    return bindings;
}
function visitPatternNode(node, pattern, bindings, names, patternSyntax) {
    if (node.type !== "identifier" && node.type !== "shorthand_field_identifier") {
        return;
    }
    patternSyntax?.add(node.id);
    // Rust constructors and type paths use identifier nodes in some patterns.
    // Treat only value-position leaves as bindings; this is the closest Rust
    // equivalent to TypeScript destructured binding leaves.
    if (node.type === "identifier" && isInsidePatternType(node, pattern))
        return;
    const name = node.text.replace(/^(?:ref|mut)\s+/, "");
    if (name.length === 0 || names.has(name))
        return;
    names.add(name);
    bindings.push({ name, node });
}
function isInsidePatternType(node, pattern) {
    let current = node;
    while (current !== null) {
        const parent = current.parent;
        if (parent === null)
            return false;
        const typeNode = parent.childForFieldName("type");
        if (typeNode !== null && containsNode(typeNode, node))
            return true;
        if ((0, syntaxHelpers_1.sameNode)(parent, pattern))
            return false;
        current = parent;
    }
    return false;
}
function scanIdentifierUses(root, infos, patternSyntax, lastUseLines) {
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        if (node.type !== "identifier" || patternSyntax.has(node.id))
            return;
        if (isMacroName(node))
            return;
        for (let index = infos.length - 1; index >= 0; index--) {
            const info = infos[index];
            if (info === undefined || info.name !== node.text)
                continue;
            if (node.startIndex <= info.pattern.endIndex)
                continue;
            if (!containsNode(info.scopeBoundary, node))
                continue;
            if (info.initializer !== null && containsNode(info.initializer, node)) {
                continue;
            }
            if (info.excludedScope !== null && containsNode(info.excludedScope, node)) {
                continue;
            }
            const useLine = (0, syntaxHelpers_1.lineOf)(node);
            const previous = lastUseLines[index] ?? info.defLine;
            if (useLine > previous)
                lastUseLines[index] = useLine;
            break;
        }
    });
}
function isMacroName(node) {
    // The design calls out identifiers inside token trees. The macro path is
    // callable syntax, so it does not resolve as a variable use.
    let current = node.parent;
    while (current !== null && current.type === "scoped_identifier") {
        current = current.parent;
    }
    if (current?.type !== "macro_invocation")
        return false;
    const macro = current.childForFieldName("macro");
    return macro !== null && containsNode(macro, node);
}
const rustPeakLiveVariables = (ctx) => {
    const entries = buildRustDefUse(ctx.node);
    if (entries.length === 0)
        return 0;
    let minLine = Infinity;
    let maxLine = 0;
    for (const entry of entries) {
        minLine = Math.min(minLine, entry.defLine);
        maxLine = Math.max(maxLine, entry.lastUseLine);
    }
    let peak = 0;
    for (let line = minLine; line <= maxLine; line++) {
        let live = 0;
        for (const entry of entries) {
            if (entry.defLine <= line && line <= entry.lastUseLine)
                live++;
        }
        peak = Math.max(peak, live);
    }
    return peak;
};
exports.rustPeakLiveVariables = rustPeakLiveVariables;
const rustVariableSpan = (ctx) => {
    let maximum = 0;
    for (const entry of buildRustDefUse(ctx.node)) {
        maximum = Math.max(maximum, entry.lastUseLine - entry.defLine);
    }
    return maximum;
};
exports.rustVariableSpan = rustVariableSpan;
const rustSpecifiedDataComplexity = (ctx) => {
    const parameterNames = new Set();
    const parameters = ctx.node.childForFieldName("parameters");
    if (parameters !== null) {
        for (const parameter of parameters.namedChildren) {
            if (parameter.type !== "parameter")
                continue;
            const pattern = parameter.childForFieldName("pattern");
            if (pattern === null)
                continue;
            for (const binding of bindingLeaves(pattern)) {
                parameterNames.add(binding.name);
            }
        }
    }
    if (parameterNames.size === 0)
        return 0;
    const influencing = new Set();
    (0, syntaxHelpers_1.walkDescendants)(ctx.node, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        if (node.type === "if_expression" || node.type === "while_expression") {
            addConditionParameters(node.childForFieldName("condition"), parameterNames, influencing);
        }
        else if (node.type === "match_expression") {
            addConditionParameters(node.childForFieldName("value"), parameterNames, influencing);
        }
        else if (node.type === "match_arm") {
            const pattern = node.childForFieldName("pattern");
            addConditionParameters(pattern?.childForFieldName("condition") ?? null, parameterNames, influencing);
        }
    });
    return influencing.size;
};
exports.rustSpecifiedDataComplexity = rustSpecifiedDataComplexity;
function addConditionParameters(condition, parameterNames, influencing) {
    if (condition === null)
        return;
    const patternSyntax = new Set();
    if (condition.type === "let_condition") {
        const pattern = condition.childForFieldName("pattern");
        if (pattern !== null)
            bindingLeaves(pattern, patternSyntax);
    }
    (0, syntaxHelpers_1.walkDescendants)(condition, (node) => {
        if (node.type === "let_condition") {
            const pattern = node.childForFieldName("pattern");
            if (pattern !== null)
                bindingLeaves(pattern, patternSyntax);
        }
    });
    visitConditionIdentifier(condition, patternSyntax, parameterNames, influencing);
    (0, syntaxHelpers_1.walkDescendants)(condition, (node) => {
        visitConditionIdentifier(node, patternSyntax, parameterNames, influencing);
    });
}
function visitConditionIdentifier(node, patternSyntax, parameterNames, influencing) {
    if (node.type === "identifier" &&
        !patternSyntax.has(node.id) &&
        parameterNames.has(node.text)) {
        influencing.add(node.text);
    }
}
const rustGlobalDataComplexity = (ctx) => {
    const mutableGlobals = collectMutableGlobals(ctx.file.tree.rootNode);
    if (mutableGlobals.size === 0)
        return 0;
    const localNames = new Set(buildRustDefUse(ctx.node).map((entry) => entry.name));
    const referenced = new Set();
    const body = ctx.node.childForFieldName("body");
    if (body === null)
        return 0;
    (0, syntaxHelpers_1.walkDescendants)(body, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        if (node.type === "identifier" &&
            mutableGlobals.has(node.text) &&
            !localNames.has(node.text)) {
            referenced.add(node.text);
        }
    });
    return referenced.size;
};
exports.rustGlobalDataComplexity = rustGlobalDataComplexity;
function collectMutableGlobals(root) {
    const names = new Set();
    (0, syntaxHelpers_1.walkDescendants)(root, (node) => {
        if ((0, nodeTypes_1.isRustFunction)(node))
            return false;
        if (node.type !== "static_item")
            return;
        const name = node.childForFieldName("name")?.text;
        if (name === undefined)
            return false;
        const isStaticMut = node.namedChildren.some((child) => child.type === "mutable_specifier");
        const typeText = node.childForFieldName("type")?.text ?? "";
        const hasInteriorMutability = INTERIOR_MUTABILITY_TYPES.some((marker) => typeText.includes(marker));
        if (isStaticMut || hasInteriorMutability)
            names.add(name);
        return false;
    });
    return names;
}
function nearestAncestorOfType(node, type, boundary) {
    let current = node.parent;
    while (current !== null && !(0, syntaxHelpers_1.sameNode)(current, boundary)) {
        if (current.type === type)
            return current;
        current = current.parent;
    }
    return boundary.type === type ? boundary : null;
}
function nearestAncestorWithTypes(node, types, boundary) {
    let current = node.parent;
    while (current !== null && !(0, syntaxHelpers_1.sameNode)(current, boundary)) {
        if (types.has(current.type))
            return current;
        current = current.parent;
    }
    return types.has(boundary.type) ? boundary : null;
}
function containsNode(ancestor, node) {
    let current = node;
    while (current !== null) {
        if ((0, syntaxHelpers_1.sameNode)(current, ancestor))
            return true;
        current = current.parent;
    }
    return false;
}
//# sourceMappingURL=dataFlow.js.map