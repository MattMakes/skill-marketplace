import { beforeAll, describe, expect, it } from "vitest";

import { extractRustFunctions } from "../../../languages/rust/extract";
import { initSyntaxParsers, parseFixture } from "../syntaxTestUtils";

beforeAll(async () => initSyntaxParsers());

describe("extractRustFunctions", () => {
  it("extracts free and nested functions in pre-order with 1-based lines", () => {
    const file = parseFixture(
      "rust",
      `
fn outer() {
    fn inner() {}
}

fn last() {}
`,
    );

    expect(
      extractRustFunctions(file).map(({ name, line }) => ({ name, line })),
    ).toEqual([
      { name: "outer", line: 2 },
      { name: "outer::inner", line: 3 },
      { name: "last", line: 6 },
    ]);
  });

  it("qualifies inherent and trait implementation methods", () => {
    const file = parseFixture(
      "rust",
      `
impl<T> Stack<T> {
    fn push(&mut self, value: T) {}
}
impl Display for Point {
    fn fmt(&self) {}
}
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "Stack::push",
      "Point::fmt",
    ]);
  });

  it("extracts trait defaults but not function signatures", () => {
    const file = parseFixture(
      "rust",
      `
trait Shape {
    fn required(&self);
    fn area(&self) -> f64 { 0.0 }
}
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "Shape::area",
    ]);
  });

  it("qualifies functions in inline modules", () => {
    const file = parseFixture(
      "rust",
      `
mod net {
    pub fn connect() {}
}
mod external;
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "net::connect",
    ]);
  });

  it("uses the function line instead of an outer attribute line", () => {
    const file = parseFixture(
      "rust",
      `
#[inline]
fn tagged() {}
`,
    );

    expect(
      extractRustFunctions(file).map(({ name, line }) => ({ name, line })),
    ).toEqual([{ name: "tagged", line: 3 }]);
  });

  it("excludes test functions and cfg(test) modules", () => {
    const file = parseFixture(
      "rust",
      `
#[test]
fn unit_test() {}

#[tokio::test]
// A comment can separate the attribute from the function.
async fn async_test() {}

#[cfg(test)]
mod tests {
    fn helper() {}
}

fn production() {}
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "production",
    ]);
  });

  it("removes reference prefixes and lifetimes from impl type names (F11)", () => {
    const file = parseFixture(
      "rust",
      `
impl<'a> IntoIterator for &'a Utf8Sequence {
    fn into_iter(self) {}
}
impl<'a, I: Iterator> PeekingNext for &'a mut I {
    fn peeking_next(&mut self) {}
}
impl Foo for &Bar {
    fn one(&self) {}
}
impl Foo for dyn Baz {
    fn two(&self) {}
}
impl<A, B> Parser for (A, B) {
    fn parse(&self) {}
}
impl<A> Parser for &(A, A) {
    fn choice(&self) {}
}
`,
    );

    // The trait name is not added. A tuple type keeps its text.
    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "Utf8Sequence::into_iter",
      "I::peeking_next",
      "Bar::one",
      "Baz::two",
      "(A, B)::parse",
      "(A, A)::choice",
    ]);
  });

  it("excludes test code that the attribute rule misses (F14)", () => {
    const file = parseFixture(
      "rust",
      `
#[cfg(all(test, feature = "x"))]
mod tests2 { fn helper2() {} }
#[cfg(test)]
fn cfg_test_fn() {}
#[rstest]
fn rs() {}
#[test_case(1)]
fn tc() {}
`,
    );

    // 4 test-only items give 0 units.
    expect(extractRustFunctions(file)).toEqual([]);
  });

  it("keeps cfg(not(test)) and cfg(any(test, ...)) code (F14)", () => {
    const file = parseFixture(
      "rust",
      `
#[cfg(not(test))]
fn a() {}
#[cfg(any(test, feature = "x"))]
fn b() {}
#[cfg(feature = "test")]
fn c() {}
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("skips a mod with cfg(all(..., test)) and a fn with a path ending in test (F14)", () => {
    const file = parseFixture(
      "rust",
      `
#[cfg(all(feature = "x", test))]
mod m {
    fn inside() {}
}
#[async_std::test]
async fn c() {}
#[bench]
fn d(b: &mut Bencher) {}
#[cfg(all(not(test), unix))]
fn e() {}
fn kept() {}
`,
    );

    expect(extractRustFunctions(file).map(({ name }) => name)).toEqual([
      "e",
      "kept",
    ]);
  });

  it("returns an empty list for a file without function bodies", () => {
    const file = parseFixture("rust", "trait Empty { fn required(&self); }");
    expect(extractRustFunctions(file)).toEqual([]);
  });
});
