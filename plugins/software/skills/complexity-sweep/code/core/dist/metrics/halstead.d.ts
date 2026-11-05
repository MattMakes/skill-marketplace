import { type MetricDefinition } from "../registry";
import type { FunctionLike } from "../types";
/**
 * Halstead counts — two multisets of tokens, one for operators, one for
 * operands. Exposed so other metrics (and tests) can introspect raw token
 * classification without reducing to the V/D/E formulas.
 */
export interface HalsteadCounts {
    operators: Map<string, number>;
    operands: Map<string, number>;
}
/**
 * Detail payload attached to each of the three Halstead MetricResults.
 *
 * Per behavior-spec 06, the three metrics emit the verbatim-identical detail
 * block — we do NOT dedupe it across V/D/E. Tests assert the same `{n1, n2,
 * N1, N2}` fields on all three results.
 */
export interface HalsteadDetail {
    n1: number;
    n2: number;
    N1: number;
    N2: number;
}
/**
 * Main classifier. Single descent over the function's AST, classifying each
 * encountered node as operator, operand, or structural. Skips nested function
 * bodies and type-only subtrees.
 *
 * Result is cached per-node so V/D/E share one walk.
 */
export declare function collectHalsteadCounts(node: FunctionLike): HalsteadCounts;
export declare const halsteadVolumeDefinition: MetricDefinition<HalsteadDetail>;
export declare const halsteadDifficultyDefinition: MetricDefinition<HalsteadDetail>;
export declare const halsteadEffortDefinition: MetricDefinition<HalsteadDetail>;
//# sourceMappingURL=halstead.d.ts.map