import type { SyntaxNode } from "../types";
export interface RustHalsteadDetail {
    n1: number;
    n2: number;
    N1: number;
    N2: number;
}
export declare function computeRustHalstead(root: SyntaxNode, metric: "volume" | "difficulty" | "effort"): {
    value: number;
    detail: RustHalsteadDetail;
};
//# sourceMappingURL=operations.halstead.d.ts.map