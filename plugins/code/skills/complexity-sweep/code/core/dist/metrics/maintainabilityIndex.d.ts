import { type SourceFile } from "ts-morph";
import { type MetricComputeContext, type MetricDefinition } from "../registry";
import type { FunctionLike } from "../types";
/**
 * Count non-blank, non-comment, non-brace-only lines in a function body,
 * excluding any lines that fall inside nested functions.
 *
 * Per spec 05 §4.2 this belongs with Maintainability Index (NOT in
 * `utils/astHelpers`, which is shared library code).
 *
 * Behavior notes:
 * - Single-line body (`{}` or `{ x }` on one line): 0 or 1 based on content.
 * - Multi-line body: counts lines strictly interior to the body braces
 *   (`bodyStart+1 ... bodyEnd-1`), so the lines holding `{` and `}`
 *   themselves are intrinsically excluded.
 * - Block comments are tracked via a simple `inBlockComment` flag. This is a
 *   deliberately naive line-level classifier — mixed comment/code lines like
 *   `const x = 1; /* stuff *​/` are NOT specially handled; the current tests
 *   do not exercise that case.
 *
 * The `sourceFile` parameter is accepted for call-site symmetry with
 * other metric helpers; the implementation uses `node.getSourceFile()`
 * (which returns the same SourceFile in all tested configurations).
 */
export declare function countLoc(fn: FunctionLike, _sourceFile?: SourceFile): number;
/**
 * Guard choice: when `V <= 0` (empty function, no tokens) OR `LOC <= 0`
 * (empty body), we return 100 — i.e. "maximally maintainable". This is the
 * behavior of the reference implementation. Alternatives like NaN or 0 would
 * collide with the lower-is-worse threshold semantics; 100 keeps trivial
 * functions safely above any reasonable threshold.
 */
export declare function computeMaintainabilityIndex(ctx: MetricComputeContext): number;
export declare const maintainabilityIndexDefinition: MetricDefinition;
//# sourceMappingURL=maintainabilityIndex.d.ts.map