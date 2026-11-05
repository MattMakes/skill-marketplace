import { type Node } from "ts-morph";
import { type CyclomaticWeights, type MetricDefinition } from "../registry";
export declare function computeCyclomaticComplexity(node: Node, weights?: CyclomaticWeights): number;
declare const cyclomaticComplexity: MetricDefinition;
export default cyclomaticComplexity;
//# sourceMappingURL=cyclomaticComplexity.d.ts.map