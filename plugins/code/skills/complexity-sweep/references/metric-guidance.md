# Metric Interpretation & Refactoring Guidance

Use this reference to understand what each metric measures, why a high value is problematic, and what refactoring strategies address it.

---

## 1. Cyclomatic Complexity — v(G)

**What it measures:** The number of independent execution paths through a function. Starts at 1, increments for each decision point: `if`, `else if`, `for`, `for...in`, `for...of`, `while`, `do...while`, `case`, `catch`, `&&`, `||`, `??`, and ternary `? :`.

**Why high values are bad:**
- Functions with many paths are hard to reason about, test, and modify safely.
- Each path is a potential behavior that needs testing — high v(G) means combinatorial test explosion.
- Bugs hide in rarely-exercised paths.

**Refactoring strategies:**
- **Extract method** — Move branches into named helper functions that describe intent.
- **Replace conditionals with polymorphism** — Use strategy/state pattern instead of long if/else chains.
- **Replace nested conditionals with guard clauses** — Flatten deeply nested logic with early returns.
- **Decompose switch statements** — Use lookup tables/maps instead of case-heavy switches.
- **Simplify boolean expressions** — Combine or extract complex `&&`/`||` chains into named predicates.

---

## 2. Essential Complexity — ev(G)

**What it measures:** Unstructured control flow — code that breaks the single-entry/single-exit principle. Counts: `continue` statements, labeled `break` statements, `throw` inside conditionals, and early `return` statements (all returns except the lexically last one).

**Why high values are bad:**
- Multiple exit points make it difficult to determine what a function guarantees on completion.
- `continue` and labeled `break` create hidden jumps that disrupt reading flow.
- Conditional `throw` statements create implicit exit paths that callers must handle.
- High ev(G) correlates with functions that are hard to refactor because control flow is tangled.

**Refactoring strategies:**
- **Consolidate early returns** — Restructure to fewer, clearer exit points. Consider collecting a result and returning once.
- **Replace continue with filter** — Extract loop body conditions into a filter step or inverted guard.
- **Extract throw logic** — Move validation/throwing into a dedicated validation function.
- **Pipeline transformation** — Replace loops with `filter`/`map`/`reduce` chains that eliminate `continue`/`break`.
- **Decompose into phases** — Split a function with many early returns into validation, processing, and result phases.

---

## 3. Module Design Complexity — iv(G)

**What it measures:** The number of branching nodes (`if`, `for`, `for...in`, `for...of`, `while`, `do...while`, `switch`, ternary) whose subtrees contain at least one function call. Measures inter-module coupling under conditional logic.

**Why high values are bad:**
- Branches with calls couple this function's control flow to other modules' behavior.
- Testing requires mocking/stubbing the called functions for each branch path.
- Changes in called functions can break branching logic silently.
- High iv(G) means the function is both complex AND tightly coupled.

**Refactoring strategies:**
- **Extract and delegate** — Move call-containing branches into dedicated functions that encapsulate the coupling.
- **Separate decision from execution** — Compute what to do (pure logic), then do it (calls) in separate steps.
- **Strategy pattern** — Replace branching-with-calls using a dispatch table or strategy objects.
- **Dependency injection** — Pass collaborators in rather than calling them directly, making coupling explicit and testable.

---

## 4. Global Data Complexity — gdv(G)

**What it measures:** The count of distinct mutable module-scoped variables referenced inside a function. Variables are mutable if declared with `let`/`var`, or `const` with object/array/`new` initializers (contents are mutable).

**Why high values are bad:**
- Mutable shared state is the primary source of hard-to-reproduce bugs.
- Functions that read/write global state have hidden inputs/outputs beyond their signature.
- Testing requires carefully setting up and tearing down module state.
- Parallel or out-of-order execution becomes unsafe.

**Refactoring strategies:**
- **Parameterize** — Pass global state as function parameters instead of reaching into module scope.
- **Encapsulate state** — Wrap related mutable state into a class or closure that controls access.
- **Make state immutable** — Use `const` with immutable values, or use `Object.freeze`.
- **Reduce scope** — Move variables closer to where they're used; convert module-level state to local state.
- **Inject configuration** — Replace global config reads with explicit configuration parameters.

---

## 5. Specified Data Complexity — sdv(G)

**What it measures:** The number of distinct function parameters that appear in at least one branch condition (`if`, `for`, `while`, `do...while`, `switch`, ternary). Parameters that are only passed through without influencing control flow are not counted.

**Why high values are bad:**
- When many parameters drive branching, the function is doing too many things — each parameter-driven branch is a separate concern.
- Testing requires covering each parameter's influence on control flow, creating combinatorial complexity.
- The function's behavior is hard to predict from its call site because many inputs affect the path taken.

**Refactoring strategies:**
- **Split by concern** — If different parameters drive different branches, split into separate functions per concern.
- **Introduce parameter object** — Group related parameters into an options/config object that encapsulates a coherent concern.
- **Extract validation** — Move parameter-driven guards into a separate validation step.
- **Use defaults and normalization** — Reduce branching by normalizing parameter values before the main logic.
- **Builder/fluent pattern** — Replace parameter-driven configuration branches with a builder that constructs the right behavior.

---

## 6. Peak Live Variables — PLV

**What it measures:** The maximum number of variables simultaneously "live" at any single point in a function. A variable is live from the line it is defined until the line it is last referenced. The peak across all lines is the metric value.

**Why high values are bad:**
- Directly measures working memory load — how many names a reader must hold in their head at the function's most congested point.
- Cognitive psychology research (Miller's 7 ± 2) establishes humans can track roughly 7 items in working memory.
- Functions exceeding this threshold force readers to re-scan earlier code to recall what variables hold.
- This metric is orthogonal to cyclomatic complexity — a function with zero branching can still have 10+ live variables.
- Common signature of AI-generated code: long sequential setup with many intermediate variables.

**Refactoring strategies:**
- **Extract helper functions** — Move groups of related variables into a helper that returns a single result, reducing the live count at the call site.
- **Inline temporary variables** — If a variable is used only once immediately after definition, inline it.
- **Introduce intermediate data structures** — Group related variables into an object/tuple and pass that around.
- **Narrow variable scope** — Move definitions closer to their first use to shrink live ranges.
- **Pipeline transformation** — Replace sequential assign-then-use patterns with chained operations.

---

## 7. Variable Span — VSpan

**What it measures:** For each variable in a function, the span is the number of lines between its definition and its last use. The metric value is the maximum span across all variables.

**Why high values are bad:**
- Long spans mean a reader encountering a variable's usage must scroll backward many lines to recall its definition, type, and initial value.
- Long spans signal that a function is doing too much between setup and consumption — the variable is "waiting around" while unrelated work happens.
- Long spans correlate with refactoring opportunities: if a variable is defined early and used late, the work in between is likely an independent concern that could be extracted.

**Refactoring strategies:**
- **Move definitions closer to use** — Define variables immediately before they're needed, not at the top of the function.
- **Extract phases** — If a variable spans many lines, the lines in between are probably a separate concern. Extract them.
- **Reduce function length** — Shorter functions naturally have shorter spans.
- **Re-order operations** — Rearrange independent operations so that define-then-use happens in tight sequences.

---

## 8. ABC Score — ABC

**What it measures:** Counts three categories of operations — Assignments (A), Branches/calls (B), Conditions (C) — and computes the Euclidean magnitude: `sqrt(A² + B² + C²)`. The raw `(A, B, C)` vector is also available in the output details.

**Why high values are bad:**
- Cyclomatic complexity only counts conditions (C). ABC captures two additional dimensions: state setup (A) and external calls (B).
- The `(A, B, C)` vector reveals the **character** of complexity:
  - High A, low B, low C: heavy data setup — consider data structures or builders.
  - Low A, high B, low C: pure orchestrator/delegator — may be fine if called functions are well-tested.
  - Low A, low B, high C: decision-heavy — classic cyclomatic complexity target.
  - High A, high B, low C: setup-and-call pattern — prime candidate for decomposition.

**Refactoring strategies:**
- **For high A (assignments):** Extract data setup into builder/factory functions. Use destructuring to reduce intermediate variables. Replace multi-step transformations with pipelines.
- **For high B (branches/calls):** Extract call sequences into orchestrator helpers. Use dependency injection to reduce direct coupling. Replace sequential calls with batch operations where possible.
- **For high C (conditions):** Same strategies as cyclomatic complexity — extract predicates, use lookup tables, apply polymorphism.
- **For balanced high A+B+C:** The function is doing too much. Decompose into single-responsibility helpers.

---

## 9. Scope-Depth Weighted LOC — SDWL

**What it measures:** A variant of lines-of-code where each line is weighted by its nesting depth. A line at depth 0 has weight 1, at depth 1 has weight 2, etc. The metric is the sum of all weights.

**Why high values are bad:**
- A line at nesting depth 3 requires more cognitive context to understand than a line at depth 1.
- High weighted LOC means a significant portion of the function lives inside deeply nested blocks.
- The ratio of weighted LOC to raw LOC (Scope-Depth Ratio) is also informative: ratio near 1.0 = flat code (good); ratio > 1.3 = significant nesting; ratio > 1.5 = heavy nesting.

**Refactoring strategies:**
- **Early return / guard clause** — Invert conditions and return early to flatten nesting.
- **Extract nested blocks** — Move deeply nested logic into named helper functions.
- **Replace loops with higher-order functions** — `map`/`filter`/`reduce` avoid nesting.
- **Decompose nested conditionals** — Use lookup tables or strategy patterns instead of nested if/else.

---

## 10. Scope-Depth Ratio — SDR

**What it measures:** The ratio of scope-depth weighted LOC to raw LOC. A pure measure of how nested the code is, independent of function length.

**Why high values are bad:** Same as Scope-Depth Weighted LOC. A ratio > 1.3 indicates significant nesting; > 1.5 indicates heavy nesting that likely needs restructuring.

**Refactoring strategies:** Same as Scope-Depth Weighted LOC.

---

## 11. Halstead Volume — HVol

**What it measures:** The information content of a function in bits, computed from the count of distinct and total operators and operands: `V = N * log2(n)` where N = total tokens and n = distinct tokens.

**Why high values are bad:**
- High volume means the function contains a large amount of information that a reader must process.
- Volume scales with both function length and vocabulary diversity — a function with many unique tokens is harder to understand.
- Halstead Volume is an input to the Maintainability Index formula.

**Refactoring strategies:**
- **Reduce function length** — Shorter functions have lower volume.
- **Extract repeated patterns** — If the same operator/operand sequences repeat, extract them into helper functions.
- **Simplify expressions** — Replace complex expressions with named intermediate values or utility functions.

---

## 12. Halstead Difficulty — HDiff

**What it measures:** How error-prone a function is: `D = (n1/2) * (N2/n2)` where n1 = distinct operators, N2 = total operands, n2 = distinct operands.

**Why high values are bad:**
- High difficulty means operands are reused heavily (N2/n2 is high) — the same variables appear in many contexts, increasing the chance of using the wrong one.
- High difficulty also correlates with operator diversity (n1/2) — many different operations make the function harder to follow.

**Refactoring strategies:**
- **Reduce operand reuse** — Extract sequences that reuse the same variables into focused helpers.
- **Reduce operator diversity** — Simplify expressions, replace manual operations with library calls.
- **Split by concern** — A function with high difficulty is likely doing multiple things.

---

## 13. Halstead Effort — HEff

**What it measures:** Total cognitive effort to comprehend or write a function: `E = D * V` (Difficulty × Volume). Estimated in "elementary mental discriminations."

**Why high values are bad:**
- Effort is the product of how much information there is (Volume) and how error-prone it is (Difficulty).
- It is particularly effective at catching AI-generated code that chains many SDK calls with many intermediate variables — code that looks "simple" by cyclomatic standards but is genuinely dense.

**Refactoring strategies:** Combine strategies from Volume and Difficulty — reduce function length, extract repeated patterns, simplify expressions, split by concern.

---

## 14. Maintainability Index — MI

**What it measures:** A composite score combining Halstead Volume, cyclomatic complexity, and lines of code into a single 0-100 number. Formula: `MI = max(0, (171 - 5.2*ln(V) - 0.23*CC - 16.2*ln(LOC)) * 100/171)`.

**⚠️ Direction: Lower values are worse.** MI = 100 is perfectly maintainable. MI < 40 is poor. This is the **only metric where lower values trigger violations**.

**Why low values are bad:**
- MI below 60 indicates moderate maintainability concerns.
- MI below 40 indicates poor maintainability — the function should be refactored.
- MI provides a single actionable score for quick triage. Functions below the threshold warrant deeper investigation with individual metrics to understand *why*.

**Refactoring strategies:**
- MI is a composite — improving any of its inputs improves MI:
  - **Reduce Halstead Volume** — Shorter, simpler functions.
  - **Reduce cyclomatic complexity** — Fewer decision points.
  - **Reduce LOC** — Shorter functions.
- Start by checking which input metric is the primary driver (compare the function's V, CC, and LOC against their individual thresholds) and target that one first.
