import type { DefUseEntry } from "../../utils/defUseAnalysis";
import type { SyntaxNode } from "../types";
export type { DefUseEntry };
/** The first binding of one name in a unit. */
interface Binding {
    name: string;
    line: number;
}
/** The scope facts of one `function_definition`. */
export interface PythonScope {
    /** First binding per name, parameters first, then body bindings in source order. */
    bindings: Binding[];
    /** Every name the unit binds locally: parameters (also `self`/`cls`), bindings, nested def/class names. */
    localNames: Set<string>;
    /** Names in a `global` statement of the unit. */
    declaredGlobal: Set<string>;
    /** Names in a `nonlocal` statement of the unit. */
    declaredNonlocal: Set<string>;
}
/** The name `identifier` nodes of a `parameters` or `lambda_parameters` node, in order. */
export declare function parameterNameNodes(params: SyntaxNode | null): SyntaxNode[];
/**
 * The parameter names of a unit that count as entries (sections 5.5, 5.6):
 * every parameter, except a first `self`/`cls` parameter of a method.
 */
export declare function unitParameterNodes(fn: SyntaxNode): SyntaxNode[];
/**
 * True for an `identifier` that names a variable. False for the attribute part
 * of `obj.name`, a keyword-argument name, a keyword in a class pattern, the
 * tail of a dotted name, and an import module path.
 */
export declare function isNameOccurrence(node: SyntaxNode): boolean;
/** Scope facts of a `function_definition`. Cached per node. */
export declare function pythonScope(fn: SyntaxNode): PythonScope;
/**
 * Visits every name occurrence in the unit `fn` that resolves to the scope of
 * `fn`. It descends into nested units (closures) and skips the names that a
 * nested unit binds itself or declares `global`.
 */
export declare function forEachResolvedName(fn: SyntaxNode, visit: (id: SyntaxNode) => void): void;
/**
 * Def-use entries `{ name, defLine, lastUseLine }` of a Python unit, in
 * declaration order. Cached per function node (peakLiveVariables and
 * variableSpan both read it).
 */
export declare function buildPythonDefUse(fn: SyntaxNode): DefUseEntry[];
//# sourceMappingURL=dataFlow.defUse.d.ts.map