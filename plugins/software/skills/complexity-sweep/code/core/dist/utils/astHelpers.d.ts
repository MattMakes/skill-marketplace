import { type ArrowFunction, type FunctionDeclaration, type FunctionExpression, type MethodDeclaration, type SourceFile } from "ts-morph";
import type { FunctionLike } from "../types";
/**
 * Canonical unit-of-analysis shape emitted by `extractFunctions` and consumed
 * by every metric (and by `buildDefUseMap` in tests).
 */
export interface ExtractedFunction {
    name: string;
    node: FunctionLike;
    line: number;
}
/**
 * Walks a SourceFile and returns an entry for every function-like node:
 * FunctionDeclaration, MethodDeclaration, ArrowFunction, FunctionExpression.
 *
 * Traversal is a full recursive descent (no skip), so nested functions are
 * emitted as their own entries in source order. Class `constructor` methods
 * are NOT emitted — `MethodDeclaration` covers named methods only; ts-morph
 * classifies constructors as a distinct `ConstructorDeclaration` kind.
 */
export declare function extractFunctions(sourceFile: SourceFile): ExtractedFunction[];
export type { ArrowFunction, FunctionDeclaration, FunctionExpression, MethodDeclaration };
//# sourceMappingURL=astHelpers.d.ts.map