import { beforeAll, describe, expect, it } from "vitest";

import {
  buildRustDefUse,
  rustGlobalDataComplexity,
  rustPeakLiveVariables,
  rustSpecifiedDataComplexity,
  rustVariableSpan,
} from "../../../languages/rust/dataFlow";
import type {
  SyntaxMetricCompute,
  SyntaxMetricContext,
} from "../../../languages/types";
import { initSyntaxParsers, syntaxCtx } from "../syntaxTestUtils";

beforeAll(async () => initSyntaxParsers());

function metric(
  compute: SyntaxMetricCompute,
  source: string,
  index = 0,
): number {
  const result = compute(syntaxCtx("rust", source, index));
  if (typeof result !== "number") throw new Error("expected numeric metric");
  return result;
}

function entries(source: string, index = 0) {
  const ctx: SyntaxMetricContext = syntaxCtx("rust", source, index);
  return buildRustDefUse(ctx.node);
}

describe("buildRustDefUse", () => {
  it("collects destructured parameters and excludes self", () => {
    const result = entries(`
struct Sample;
impl Sample {
    fn run(&self, (left, right): (i32, i32)) {
        use_it(left);
    }
}
`);

    // left: 4..5; right: 4..4; self is not an entry.
    expect(result).toEqual([
      { name: "left", defLine: 4, lastUseLine: 5 },
      { name: "right", defLine: 4, lastUseLine: 4 },
    ]);
  });

  it("collects let and for pattern leaves in declaration order", () => {
    const result = entries(`fn run() {
    let (first, second) = pair();
    for (index, value) in values() {
        use_it(first, index, value);
    }
}`);

    // first: 2..4; second: 2..2; index/value: 3..4.
    expect(result).toEqual([
      { name: "first", defLine: 2, lastUseLine: 4 },
      { name: "second", defLine: 2, lastUseLine: 2 },
      { name: "index", defLine: 3, lastUseLine: 4 },
      { name: "value", defLine: 3, lastUseLine: 4 },
    ]);
  });

  it("collects closure parameters and closure uses", () => {
    const result = entries(`fn run(seed: i32) {
    let apply = |value: i32, (left, right): (i32, i32)| {
        use_it(seed, value, left);
    };
    apply(1, (2, 3));
}`);

    // seed: 1..3; apply: 2..5; value/left: 2..3; right: 2..2.
    expect(result).toEqual([
      { name: "seed", defLine: 1, lastUseLine: 3 },
      { name: "apply", defLine: 2, lastUseLine: 5 },
      { name: "value", defLine: 2, lastUseLine: 3 },
      { name: "left", defLine: 2, lastUseLine: 3 },
      { name: "right", defLine: 2, lastUseLine: 2 },
    ]);
  });

  it("collects if-let, while-let, and match-arm bindings", () => {
    const result = entries(`fn run(input: Option<i32>, mut queue: Vec<i32>, result: Result<i32, i32>, limit: i32) {
    if let Some(item) = input { use_it(item); }
    while let Some(next) = queue.pop() { use_it(next); }
    match result {
        Ok(value) if value > limit => use_it(value),
        Err(error) => use_it(error),
    }
}`);

    // Parameters are line 1. Pattern bindings live only in their branch scopes.
    expect(result).toEqual([
      { name: "input", defLine: 1, lastUseLine: 2 },
      { name: "queue", defLine: 1, lastUseLine: 3 },
      { name: "result", defLine: 1, lastUseLine: 4 },
      { name: "limit", defLine: 1, lastUseLine: 5 },
      { name: "item", defLine: 2, lastUseLine: 2 },
      { name: "next", defLine: 3, lastUseLine: 3 },
      { name: "value", defLine: 5, lastUseLine: 5 },
      { name: "error", defLine: 6, lastUseLine: 6 },
    ]);
  });

  it("resolves block shadowing and a let initializer to the outer binding", () => {
    const result = entries(`fn run() {
    let value = 0;
    {
        let value = value + 1;
        use_it(value);
    }
    use_it(value);
}`);

    // Outer value: 2..7, including the inner initializer. Inner value: 4..5.
    expect(result).toEqual([
      { name: "value", defLine: 2, lastUseLine: 7 },
      { name: "value", defLine: 4, lastUseLine: 5 },
    ]);
  });

  it("counts identifiers inside macro token trees", () => {
    const result = entries(`fn run() {
    let value = 1;
    println!("{}", value);
}`);

    // value: 2..3 because the macro token tree contains its last use.
    expect(result).toEqual([
      { name: "value", defLine: 2, lastUseLine: 3 },
    ]);
  });

  it("does not collect or resolve bindings in nested function units", () => {
    const result = entries(`fn outer() {
    let value = 1;
    fn inner(value: i32) { use_it(value); }
}`);

    // The outer value is unused, and the nested parameter is not an outer entry.
    expect(result).toEqual([
      { name: "value", defLine: 2, lastUseLine: 2 },
    ]);
  });

  it("returns the cached array for the same function node", () => {
    const ctx = syntaxCtx("rust", "fn run(value: i32) { use_it(value); }");

    expect(buildRustDefUse(ctx.node)).toBe(buildRustDefUse(ctx.node));
  });
});

describe("rustPeakLiveVariables", () => {
  it("returns 0 without bindings", () => {
    // No entries produce a peak of 0.
    expect(metric(rustPeakLiveVariables, "fn run() { work(); }")).toBe(0);
  });

  it("counts overlapping live ranges", () => {
    const source = `fn run() {
    let first = 1;
    let second = 2;
    use_it(first);
    use_it(second);
}`;

    // first: 2..4 and second: 3..5 overlap, so the peak is 2.
    expect(metric(rustPeakLiveVariables, source)).toBe(2);
  });

  it("includes closure parameters and captured uses", () => {
    const source = `fn run() {
    let captured = 1;
    let callback = |argument: i32| {
        use_it(captured, argument);
    };
    callback(2);
}`;

    // captured, callback, and argument are live together on line 3.
    expect(metric(rustPeakLiveVariables, source)).toBe(3);
  });

  it("counts shadowed entries independently", () => {
    const source = `fn run() {
    let value = 0;
    {
        let value = value + 1;
        use_it(value);
    }
    use_it(value);
}`;

    // Outer value: 2..7 and inner value: 4..5, so the peak is 2.
    expect(metric(rustPeakLiveVariables, source)).toBe(2);
  });
});

describe("rustVariableSpan", () => {
  it("returns 0 without bindings or with only unused bindings", () => {
    // The only entry has defLine equal to lastUseLine, so its span is 0.
    expect(metric(rustVariableSpan, "fn run() { let unused = 1; }")).toBe(0);
  });

  it("uses the largest hand-counted span", () => {
    const source = `fn run(first: i32) {
    let second = 1;
    use_it(second);

    use_it(first);
}`;

    // first: 1..5 gives 4; second: 2..3 gives 1. The maximum is 4.
    expect(metric(rustVariableSpan, source)).toBe(4);
  });

  it("includes closure declarations and captured uses", () => {
    const source = `fn run() {
    let captured = 1;
    let callback = || use_it(captured);

    callback();
}`;

    // callback: 3..5 gives 2; captured: 2..3 gives 1. The maximum is 2.
    expect(metric(rustVariableSpan, source)).toBe(2);
  });

  it("uses the outer span when a binding is shadowed", () => {
    const source = `fn run() {
    let value = 0;
    {
        let value = value + 1;
        use_it(value);
    }
    use_it(value);
}`;

    // Outer value: 2..7 gives 5; inner value: 4..5 gives 1.
    expect(metric(rustVariableSpan, source)).toBe(5);
  });
});

describe("rustSpecifiedDataComplexity", () => {
  it("counts parameters in if and if-let conditions", () => {
    const source = `fn run(flag: bool, input: Option<i32>, ignored: i32) {
    if flag { work(); }
    if let Some(_) = input { work(); }
}`;

    // flag and input influence conditions. ignored does not, so the count is 2.
    expect(metric(rustSpecifiedDataComplexity, source)).toBe(2);
  });

  it("counts parameters in while and while-let conditions", () => {
    const source = `fn run(keep_going: bool, mut input: Option<i32>) {
    while keep_going { break; }
    while let Some(_) = input.take() { break; }
}`;

    // keep_going and input each influence one while condition.
    expect(metric(rustSpecifiedDataComplexity, source)).toBe(2);
  });

  it("counts parameters in match values and match-arm guards", () => {
    const source = `fn run(choice: Option<i32>, limit: i32) {
    match choice {
        Some(value) if value > limit => work(),
        _ => work(),
    }
}`;

    // choice influences the match value, and limit influences the guard.
    expect(metric(rustSpecifiedDataComplexity, source)).toBe(2);
  });

  it("counts destructured leaves and never counts self", () => {
    const source = `struct Sample;
impl Sample {
    fn run(&self, (enabled, ignored): (bool, bool)) {
        if enabled { work(); }
        if self.ready() { work(); }
    }
}`;

    // enabled is the only parameter leaf that influences control flow.
    expect(metric(rustSpecifiedDataComplexity, source)).toBe(1);
  });

  it("includes closure conditions but skips nested function units", () => {
    const source = `fn run(closure_flag: bool, nested_flag: bool) {
    let callback = || if closure_flag { work(); };
    fn nested(nested_flag: bool) { if nested_flag { work(); } }
    callback();
}`;

    // closure_flag counts through the closure. nested_flag appears only in a nested unit.
    expect(metric(rustSpecifiedDataComplexity, source)).toBe(1);
  });
});

describe("rustGlobalDataComplexity", () => {
  it("counts a static mut once across repeated reads and writes", () => {
    const source = `static mut STATE: i32 = 0;
fn run() {
    unsafe { STATE += 1; use_it(STATE); }
}`;

    // STATE is one distinct mutable module-scope name.
    expect(metric(rustGlobalDataComplexity, source)).toBe(1);
  });

  it("counts every interior-mutability type marker", () => {
    const source = `
static A: Mutex<i32> = make();
static B: RwLock<i32> = make();
static C: RefCell<i32> = make();
static D: Cell<i32> = make();
static E: AtomicUsize = make();
static F: OnceCell<i32> = make();
static G: OnceLock<i32> = make();
static H: LazyLock<i32> = make();
static I: Lazy<i32> = make();
fn run() { use_it(A, B, C, D, E, F, G, H, I); }
`;

    // The 9 configured type markers make all 9 statics mutable globals.
    expect(metric(rustGlobalDataComplexity, source)).toBe(9);
  });

  it("excludes immutable statics, const items, and thread-local macros", () => {
    const source = `
static FIXED: i32 = 1;
const LIMIT: i32 = 2;
thread_local! { static LOCAL: Cell<i32> = Cell::new(0); }
fn run() { use_it(FIXED, LIMIT, LOCAL); }
`;

    // None of the 3 names meets a mutable static-item rule.
    expect(metric(rustGlobalDataComplexity, source)).toBe(0);
  });

  it("excludes static items declared inside a function", () => {
    const source = `fn run() {
    static mut LOCAL: i32 = 0;
    unsafe { LOCAL += 1; }
}`;

    // LOCAL is inside a function, so it is not module-scope.
    expect(metric(rustGlobalDataComplexity, source)).toBe(0);
  });

  it("excludes a global when any local binding has the same name", () => {
    const source = `static mut STATE: i32 = 0;
fn run() {
    let STATE = 1;
    use_it(STATE);
}`;

    // The local STATE binding hides the mutable global, so the count is 0.
    expect(metric(rustGlobalDataComplexity, source)).toBe(0);
  });

  it("does not count field identifiers", () => {
    const source = `static mut STATE: i32 = 0;
fn run(object: Object) { use_it(object.STATE); }
`;

    // STATE is only a field_identifier, so the count is 0.
    expect(metric(rustGlobalDataComplexity, source)).toBe(0);
  });

  it("skips references in nested function units", () => {
    const source = `static mut STATE: i32 = 0;
fn outer() {
    fn inner() { unsafe { STATE += 1; } }
}`;

    // outer has no direct STATE reference because inner is a separate unit.
    expect(metric(rustGlobalDataComplexity, source)).toBe(0);
  });
});
