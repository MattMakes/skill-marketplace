import type { ProjectMetrics } from "static-analysis-core";
import { describe, expect, it } from "vitest";

import { formatJson } from "../formatJson";

const emptyMax = {
  cyclomaticComplexity: 0,
  essentialComplexity: 0,
  moduleDesignComplexity: 0,
  globalDataComplexity: 0,
  specifiedDataComplexity: 0,
};

describe("formatJson", () => {
  it("produces valid JSON with metrics and violations", () => {
    const metrics: ProjectMetrics = {
      files: [],
      summary: {
        totalFiles: 0,
        totalFunctions: 0,
        max: { ...emptyMax },
        avg: { ...emptyMax },
      },
    };
    const parsed = JSON.parse(formatJson(metrics, []));
    expect(parsed).toHaveProperty("files");
    expect(parsed).toHaveProperty("summary");
    expect(parsed).toHaveProperty("violations");
  });

  it("whitelists function fields and omits empty details", () => {
    const metrics: ProjectMetrics = {
      files: [
        {
          filePath: "a.ts",
          functions: [
            {
              name: "f",
              filePath: "a.ts",
              line: 1,
              metrics: { cyclomaticComplexity: 3 },
            },
            {
              name: "g",
              filePath: "a.ts",
              line: 7,
              metrics: { cyclomaticComplexity: 1 },
              details: { abcScore: { a: 0, b: 0, c: 0 } },
            },
            {
              name: "h",
              filePath: "a.ts",
              line: 9,
              metrics: { cyclomaticComplexity: 2 },
              details: {},
            },
          ],
          summary: { totalFunctions: 3, max: { ...emptyMax }, avg: { ...emptyMax } },
        },
      ],
      summary: {
        totalFiles: 1,
        totalFunctions: 3,
        max: { ...emptyMax },
        avg: { ...emptyMax },
      },
    };

    const parsed = JSON.parse(formatJson(metrics, []));
    const fns = parsed.files[0].functions;

    expect(fns[0]).toEqual({
      name: "f",
      filePath: "a.ts",
      line: 1,
      metrics: { cyclomaticComplexity: 3 },
    });
    expect(fns[1].details).toEqual({ abcScore: { a: 0, b: 0, c: 0 } });
    expect(fns[2]).not.toHaveProperty("details");
  });

  it("preserves violations verbatim", () => {
    const metrics: ProjectMetrics = {
      files: [],
      summary: {
        totalFiles: 0,
        totalFunctions: 0,
        max: { ...emptyMax },
        avg: { ...emptyMax },
      },
    };
    const violations = [
      {
        functionName: "boom",
        filePath: "x.ts",
        line: 1,
        metric: "cyclomaticComplexity",
        value: 20,
        threshold: 10,
        severity: "error" as const,
      },
    ];
    const parsed = JSON.parse(formatJson(metrics, violations));
    expect(parsed.violations).toEqual(violations);
  });
});
