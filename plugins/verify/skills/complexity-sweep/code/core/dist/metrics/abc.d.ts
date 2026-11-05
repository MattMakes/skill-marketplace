import { type Node } from "ts-morph";
import type { MetricDefinition, MetricResult } from "../registry";
export interface AbcCounts {
    a: number;
    b: number;
    c: number;
}
/**
 * Compute the raw ABC counts for a function node. Single `forEachDescendant`
 * pass; nested function/method/arrow bodies are boundary-skipped.
 */
export declare function computeAbcCounts(node: Node): AbcCounts;
export declare function computeAbcScore(node: Node): MetricResult<AbcCounts>;
declare const abcDefinition: MetricDefinition<AbcCounts>;
export default abcDefinition;
//# sourceMappingURL=abc.d.ts.map