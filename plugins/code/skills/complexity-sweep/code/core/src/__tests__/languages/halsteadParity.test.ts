// Halstead parity across TypeScript, Python and Rust (design 5.9).
//
// Each case has the same logic in the 3 languages. Each language is asserted
// against its own hand count. Where the counts differ, the comment states the
// reason from the 5.9 table. TypeScript is the reference scheme: semantic
// operators, and braces, parentheses, commas, colons and semicolons are
// structural.

import { beforeAll, describe, expect, it } from "vitest";

import { halsteadVolumeDefinition } from "../../metrics/halstead";
import { pythonHalsteadVolume } from "../../languages/python/operations";
import { rustHalsteadVolume } from "../../languages/rust/operations";
import { createHarness } from "../metrics/testUtils";
import { initSyntaxParsers, syntaxCtx } from "./syntaxTestUtils";

interface HalsteadDetail {
  n1: number;
  n2: number;
  N1: number;
  N2: number;
}

beforeAll(async () => {
  await initSyntaxParsers();
});

function detailOf(result: number | { detail?: unknown }): HalsteadDetail {
  if (typeof result === "number" || result.detail === undefined) {
    throw new Error("Expected a metric result with detail");
  }
  return result.detail as HalsteadDetail;
}

function tsDetail(source: string, name: string): HalsteadDetail {
  return detailOf(halsteadVolumeDefinition.compute(createHarness(source).getCtx(name)));
}

function pyDetail(source: string): HalsteadDetail {
  return detailOf(pythonHalsteadVolume(syntaxCtx("python", source)));
}

function rsDetail(source: string): HalsteadDetail {
  return detailOf(rustHalsteadVolume(syntaxCtx("rust", source)));
}

describe("Halstead parity: a loop with a sum", () => {
  it("TypeScript", () => {
    const src = `function sumAll(xs: number[]): number {
  let total = 0;
  for (const x of xs) {
    total += x;
  }
  return total;
}`;
    // Operators: let = for of const += return -> n1 = 7, N1 = 7.
    // Operands: xs total 0 x xs total x total -> n2 = 4, N2 = 8.
    expect(tsDetail(src, "sumAll")).toEqual({ n1: 7, n2: 4, N1: 7, N2: 8 });
  });

  it("Python", () => {
    const src = `def sum_all(xs):
    total = 0
    for x in xs:
        total += x
    return total
`;
    // Operators: = for in += return -> n1 = 5, N1 = 5.
    // Python has no declaration keyword, so there is no `let` and no `const`.
    // The loop gives `for` and `in`, where TypeScript gives `for`, `of` and `const`.
    // Operands: xs total 0 x xs total x total -> n2 = 4, N2 = 8.
    expect(pyDetail(src)).toEqual({ n1: 5, n2: 4, N1: 5, N2: 8 });
  });

  it("Rust", () => {
    const src = `fn sum_all(xs: &[i32]) -> i32 {
    let mut total = 0;
    for x in xs {
        total += x;
    }
    total
}`;
    // Operators: let = for in += -> n1 = 5, N1 = 5.
    // `let` is a declaration keyword like TypeScript `let`; `mut` is structural.
    // The loop pattern has no declaration keyword, so there is no `const`.
    // The tail expression `total` has no `return` operator.
    // Operands: xs total 0 x xs total x total -> n2 = 4, N2 = 8.
    expect(rsDetail(src)).toEqual({ n1: 5, n2: 4, N1: 5, N2: 8 });
  });
});

describe("Halstead parity: an if/else chain", () => {
  it("TypeScript", () => {
    const src = `function sign(n: number): number {
  if (n > 0) {
    return 1;
  } else if (n < 0) {
    return -1;
  } else {
    return 0;
  }
}`;
    // Operators: if x2, else x2, >, <, return x3, unary- -> n1 = 6, N1 = 10.
    // Operands: n n 0 1 n 0 1 0 -> n2 = 3, N2 = 8.
    expect(tsDetail(src, "sign")).toEqual({ n1: 6, n2: 3, N1: 10, N2: 8 });
  });

  it("Python", () => {
    const src = `def sign(n):
    if n > 0:
        return 1
    elif n < 0:
        return -1
    else:
        return 0
`;
    // Operators: if; elif gives else and if; else; >, <, return x3, unary-
    // -> n1 = 6, N1 = 10. Same as TypeScript.
    // Operands: n n 0 1 n 0 1 0 -> n2 = 3, N2 = 8.
    expect(pyDetail(src)).toEqual({ n1: 6, n2: 3, N1: 10, N2: 8 });
  });

  it("Rust", () => {
    const src = `fn sign(n: i32) -> i32 {
    if n > 0 {
        1
    } else if n < 0 {
        -1
    } else {
        0
    }
}`;
    // Operators: if x2, else x2, >, <, unary- -> n1 = 5, N1 = 7.
    // The branch values are tail expressions, so there is no `return` operator.
    // Operands: n n 0 1 n 0 1 0 -> n2 = 3, N2 = 8.
    expect(rsDetail(src)).toEqual({ n1: 5, n2: 3, N1: 7, N2: 8 });
  });
});

describe("Halstead parity: a call chain with member access", () => {
  it("TypeScript", () => {
    const src = `function names(users: Users): string {
  return users.filter(isActive).map(getName).join(", ");
}`;
    // Operators: return, . x3, () x3 -> n1 = 3, N1 = 7.
    // Operands: users users filter isActive map getName join ", " -> n2 = 7, N2 = 8.
    expect(tsDetail(src, "names")).toEqual({ n1: 3, n2: 7, N1: 7, N2: 8 });
  });

  it("Python", () => {
    const src = `def names(users):
    return users.filter(is_active).map(get_name).join(", ")
`;
    // Operators: return, . x3, () x3 -> n1 = 3, N1 = 7. Same as TypeScript.
    // Operands: users users filter is_active map get_name join ", " -> n2 = 7, N2 = 8.
    expect(pyDetail(src)).toEqual({ n1: 3, n2: 7, N1: 7, N2: 8 });
  });

  it("Rust", () => {
    const src = `fn names(users: Users) -> String {
    users.filter(is_active).map(get_name).join(", ")
}`;
    // Operators: . x3, () x3 -> n1 = 2, N1 = 6.
    // The chain is the tail expression, so there is no `return` operator.
    // Operands: users users filter is_active map get_name join ", " -> n2 = 7, N2 = 8.
    expect(rsDetail(src)).toEqual({ n1: 2, n2: 7, N1: 6, N2: 8 });
  });
});

describe("Halstead parity: an index read and write", () => {
  it("TypeScript", () => {
    const src = `function swap(a: number[], i: number, j: number): void {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}`;
    // Operators: const, = x3, [] x4 -> n1 = 3, N1 = 8.
    // Operands: a i j t a i a i a j a j t -> n2 = 4, N2 = 13.
    expect(tsDetail(src, "swap")).toEqual({ n1: 3, n2: 4, N1: 8, N2: 13 });
  });

  it("Python", () => {
    const src = `def swap(a, i, j):
    t = a[i]
    a[i] = a[j]
    a[j] = t
`;
    // Operators: = x3, [] x4 -> n1 = 2, N1 = 7.
    // Python has no declaration keyword, so there is no `const`.
    // Operands: a i j t a i a i a j a j t -> n2 = 4, N2 = 13.
    expect(pyDetail(src)).toEqual({ n1: 2, n2: 4, N1: 7, N2: 13 });
  });

  it("Rust", () => {
    const src = `fn swap(a: &mut [i32], i: usize, j: usize) {
    let t = a[i];
    a[i] = a[j];
    a[j] = t;
}`;
    // Operators: let, = x3, [] x4 -> n1 = 3, N1 = 8.
    // `let` is a declaration keyword like TypeScript `const`. Same counts as TypeScript.
    // Operands: a i j t a i a i a j a j t -> n2 = 4, N2 = 13.
    expect(rsDetail(src)).toEqual({ n1: 3, n2: 4, N1: 8, N2: 13 });
  });
});

describe("Halstead parity: a boolean condition", () => {
  it("TypeScript", () => {
    const src = `function canEdit(user: User, doc: Doc): boolean {
  return user.isAdmin || (user.id === doc.ownerId && !doc.locked);
}`;
    // Operators: return || && === ! and . x4 -> n1 = 6, N1 = 9.
    // Operands: user doc user isAdmin user id doc ownerId doc locked -> n2 = 6, N2 = 10.
    expect(tsDetail(src, "canEdit")).toEqual({ n1: 6, n2: 6, N1: 9, N2: 10 });
  });

  it("Python", () => {
    const src = `def can_edit(user, doc):
    return user.is_admin or (user.id == doc.owner_id and not doc.locked)
`;
    // Operators: return or and == not and . x4 -> n1 = 6, N1 = 9. Same as TypeScript.
    // Operands: user doc user is_admin user id doc owner_id doc locked -> n2 = 6, N2 = 10.
    expect(pyDetail(src)).toEqual({ n1: 6, n2: 6, N1: 9, N2: 10 });
  });

  it("Rust", () => {
    const src = `fn can_edit(user: &User, doc: &Doc) -> bool {
    user.is_admin || (user.id == doc.owner_id && !doc.locked)
}`;
    // Operators: || && == ! and . x4 -> n1 = 5, N1 = 8.
    // The condition is the tail expression, so there is no `return` operator.
    // Operands: user doc user is_admin user id doc owner_id doc locked -> n2 = 6, N2 = 10.
    expect(rsDetail(src)).toEqual({ n1: 5, n2: 6, N1: 8, N2: 10 });
  });
});

describe("Halstead parity: an early return", () => {
  it("TypeScript", () => {
    const src = `function safeDiv(a: number, b: number): number {
  if (b === 0) {
    return 0;
  }
  return a / b;
}`;
    // Operators: if === return x2 / -> n1 = 4, N1 = 5.
    // Operands: a b b 0 0 a b -> n2 = 3, N2 = 7.
    expect(tsDetail(src, "safeDiv")).toEqual({ n1: 4, n2: 3, N1: 5, N2: 7 });
  });

  it("Python", () => {
    const src = `def safe_div(a, b):
    if b == 0:
        return 0
    return a / b
`;
    // Operators: if == return x2 / -> n1 = 4, N1 = 5. Same as TypeScript.
    // Operands: a b b 0 0 a b -> n2 = 3, N2 = 7.
    expect(pyDetail(src)).toEqual({ n1: 4, n2: 3, N1: 5, N2: 7 });
  });

  it("Rust", () => {
    const src = `fn safe_div(a: i32, b: i32) -> i32 {
    if b == 0 {
        return 0;
    }
    a / b
}`;
    // Operators: if == return / -> n1 = 4, N1 = 4.
    // The last value is a tail expression, so it has no `return` operator.
    // Operands: a b b 0 0 a b -> n2 = 3, N2 = 7.
    expect(rsDetail(src)).toEqual({ n1: 4, n2: 3, N1: 4, N2: 7 });
  });
});
