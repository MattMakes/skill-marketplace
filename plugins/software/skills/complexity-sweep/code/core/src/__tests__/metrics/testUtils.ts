import { Project, type SourceFile } from "ts-morph";
import { extractFunctions } from "../../utils/astHelpers";
import type {
  AnalysisOptions,
  MetricComputeContext,
} from "../../registry";

export interface TestHarness {
  sourceFile: SourceFile;
  getCtx: (name: string, options?: AnalysisOptions) => MetricComputeContext;
}

export function createHarness(source: string, filePath = "test.ts"): TestHarness {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filePath, source);
  const functions = extractFunctions(sourceFile);

  const getCtx = (
    name: string,
    options: AnalysisOptions = {},
  ): MetricComputeContext => {
    const found = functions.find((fn) => fn.name === name);
    if (!found) {
      throw new Error(
        `Function "${name}" not found. Available: ${functions.map((f) => f.name).join(", ")}`,
      );
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
