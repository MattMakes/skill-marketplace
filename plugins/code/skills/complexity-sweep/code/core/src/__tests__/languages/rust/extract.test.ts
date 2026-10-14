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

  it("returns an empty list for a file without function bodies", () => {
    const file = parseFixture("rust", "trait Empty { fn required(&self); }");
    expect(extractRustFunctions(file)).toEqual([]);
  });
});
