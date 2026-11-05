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

/** `name:defLine-lastUseLine`, the short form that the review uses. */
function shortEntries(source: string, index = 0): string[] {
  return entries(source, index).map(
    (entry) => `${entry.name}:${entry.defLine}-${entry.lastUseLine}`,
  );
}

describe("Rust review defects (rust-fix-2a)", () => {
  it("F1: inline format arguments are occurrences", () => {
    const source = `fn n3(a: i32) {
    let name = "x";
    let width = 5;
    let other = 1;
    let s = format!("{a:?}");
    println!("{name:>width$}");
    write!(f, "{other}")?;
}`;

    // a: 1..5 (inline {a:?}); name: 2..6; width: 3..6 (width$); other: 4..7;
    // s: 5..5. Line 5 holds a, name, width, other and s, so the peak is 5.
    // Spans: a 4, name 4, width 3, other 3, s 0. The maximum is 4.
    expect(shortEntries(source)).toEqual([
      "a:1-5",
      "name:2-6",
      "width:3-6",
      "other:4-7",
      "s:5-5",
    ]);
    expect(metric(rustPeakLiveVariables, source)).toBe(5);
    expect(metric(rustVariableSpan, source)).toBe(4);
  });

  it("F3: bare variants, paths and constants bind nothing", () => {
    const orderingSource = `fn d3(o: Ordering) -> i32 {
    match o {
        Ordering::Less => -1,
        Ordering::Equal => 0,
        Ordering::Greater => 1,
    }
}`;
    const optionSource = `fn d4(o: Option<i32>) -> i32 {
    match o { None => 0, Some(v) => v }
}`;
    const constantSource = `fn d4c(n: usize) -> i32 {
    match n {
        MAX_LEN => 1,
        _ => 0,
    }
}`;

    // d3: only o (1..2). The peak is 1 and the span is 1.
    expect(shortEntries(orderingSource)).toEqual(["o:1-2"]);
    expect(metric(rustPeakLiveVariables, orderingSource)).toBe(1);
    expect(metric(rustVariableSpan, orderingSource)).toBe(1);
    // d4: o 1..2 and v 2..2. None binds nothing.
    expect(shortEntries(optionSource)).toEqual(["o:1-2", "v:2-2"]);
    // d4c: only n (1..2). MAX_LEN is a constant pattern.
    expect(shortEntries(constantSource)).toEqual(["n:1-2"]);
  });

  it("F4: a match guard resolves to the arm binding", () => {
    const source = `fn d5(o: Option<i32>) -> i32 {
    let n = 5;
    let q = 1;
    let r = 2;
    match o {
        Some(n) if n > 3 => 1,
        _ => q + r,
    }
}`;

    // Outer n: 2..2. The guard n is the arm n: 6..6. o: 1..5, q: 3..7, r: 4..7.
    // Line 5 holds o, q and r. Line 6 holds q, r and the arm n. The peak is 3.
    // Spans: o 4, q 4, r 3. The maximum is 4.
    expect(shortEntries(source)).toEqual([
      "o:1-5",
      "n:2-2",
      "q:3-7",
      "r:4-7",
      "n:6-6",
    ]);
    expect(metric(rustPeakLiveVariables, source)).toBe(3);
    expect(metric(rustVariableSpan, source)).toBe(4);
  });

  it("F5: path segments, labels and lifetimes are not occurrences", () => {
    const pathSource = `fn d8(a: i32, b: i32) -> i32 {
    let max = 3;
    let y = 4;
    let z = 5;
    let m = std::cmp::max(a, b);
    m + y + z
}`;
    const labelSource = `fn d9() {
    let a = 1;
    let b = 2;
    let c = 3;
    'a: loop { break 'a; }
}`;

    // d8: max 2..2 (the path segment is not a use). Line 5 holds a, b, y, z
    // and m, so the peak is 5. Spans: a 4, b 4, y 3, z 2, m 1.
    expect(shortEntries(pathSource)).toEqual([
      "a:1-5",
      "b:1-5",
      "max:2-2",
      "y:3-6",
      "z:4-6",
      "m:5-6",
    ]);
    expect(metric(rustPeakLiveVariables, pathSource)).toBe(5);
    expect(metric(rustVariableSpan, pathSource)).toBe(4);
    // d9: the label 'a is not a use of a. Every entry is 1 line, so peak 1, span 0.
    expect(shortEntries(labelSource)).toEqual(["a:2-2", "b:3-3", "c:4-4"]);
    expect(metric(rustPeakLiveVariables, labelSource)).toBe(1);
    expect(metric(rustVariableSpan, labelSource)).toBe(0);
  });

  it("F3: Some(v) and a struct pattern still bind lower-case names", () => {
    const optionSource = `fn run(p: Point, o: Option<i32>) -> i32 {
    let Point { x, y } = p;
    match o {
        Some(v) => v + x + y,
        None => 0,
    }
}`;
    const armSource = `fn run(p: Point) -> i32 {
    match p {
        Point { x, y } => x + y,
    }
}`;

    // p: 1..2; o: 1..3; x and y: 2..4; v: 4..4. None binds nothing.
    expect(shortEntries(optionSource)).toEqual([
      "p:1-2",
      "o:1-3",
      "x:2-4",
      "y:2-4",
      "v:4-4",
    ]);
    // p: 1..2; x and y: 3..3. Point is the struct type, not a binding.
    expect(shortEntries(armSource)).toEqual(["p:1-2", "x:3-3", "y:3-3"]);
  });

  it("F3: a let pattern still binds an upper-case name", () => {
    const source = `static mut STATE: i32 = 0;
fn run() {
    let STATE = 1;
    use_it(STATE);
}`;

    // let is irrefutable, so STATE: 3..4 is a binding that shadows the global.
    expect(shortEntries(source, 0)).toEqual(["STATE:3-4"]);
  });

  it("F4: a guard name that no arm binds resolves to the outer variable", () => {
    const source = `fn run(n: i32, o: Option<i32>) -> i32 {
    match o {
        None => 0,
        Some(v) if n > 3 => v,
        _ => 1,
    }
}`;

    // n: 1..4 because the guard on line 4 reads the parameter. o: 1..2. v: 4..4.
    expect(shortEntries(source)).toEqual(["n:1-4", "o:1-2", "v:4-4"]);
  });

  it("F5: a local named like a path segment still counts as a plain use", () => {
    const source = `fn run(a: i32, b: i32) -> i32 {
    let max = 3;
    let m = std::cmp::max(a, b);
    let k = max + 1;
    k + m
}`;

    // max: 2..4 because of max + 1 on line 4. m: 3..5. k: 4..5.
    expect(shortEntries(source)).toEqual([
      "a:1-3",
      "b:1-3",
      "max:2-4",
      "m:3-5",
      "k:4-5",
    ]);
  });

  it("F5: use declarations and macro token paths are not occurrences", () => {
    const useSource = `fn run(a: i32) -> i32 {
    let max = 3;
    let z = a;
    use std::cmp::max;
    z
}`;
    const macroSource = `fn run(a: i32, b: i32) {
    let max = 3;
    let z = 1;
    println!("{}", std::cmp::max(a, b));
}`;

    // max: 2..2 (the use declaration on line 4 names the item). a: 1..3. z: 3..5.
    expect(shortEntries(useSource)).toEqual(["a:1-3", "max:2-2", "z:3-5"]);
    // max: 2..2 (the path segment in the token tree). a and b: 1..4. z: 3..3.
    expect(shortEntries(macroSource)).toEqual([
      "a:1-4",
      "b:1-4",
      "max:2-2",
      "z:3-3",
    ]);
  });

  it("F1: an escaped brace pair is not an occurrence", () => {
    const source = `fn run(name: &str) {
    let other = 1;
    println!("{{name}}");
    println!("{{{other}}}");
}`;

    // name: 1..1 (only {{name}}). other: 2..4 (the inner {other} on line 4).
    expect(shortEntries(source)).toEqual(["name:1-1", "other:2-4"]);
  });

  it("F1: a positional placeholder adds nothing, its argument still counts", () => {
    const source = `fn run(first: i32) {
    let other = 1;
    println!("{} {0}", other);
    use_it(first);
}`;

    // other: 2..3 through the argument identifier. first: 1..4.
    expect(shortEntries(source)).toEqual(["first:1-4", "other:2-3"]);
  });

  it("F1: an inline argument on a later line of a string counts on that line", () => {
    const source = `fn run(a: i32) {
    let msg = format!("x
{a}");
}`;

    // a: 1..3 because {a} is on line 3. msg: 2..2.
    expect(shortEntries(source)).toEqual(["a:1-3", "msg:2-2"]);
  });
});
