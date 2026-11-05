// Contract smoke test for the GDScript grammar and test helpers. Owned by the
// orchestrator; the gdscript-* units add their own test files beside it.

import { beforeAll, describe, expect, it } from "vitest";

import { languageForPath } from "../../../languages";
import { functionNodes, initSyntaxParsers, parseFixture } from "../syntaxTestUtils";

beforeAll(async () => {
  await initSyntaxParsers();
});

const SAMPLE = `@tool
class_name Player
extends CharacterBody2D

signal hit(amount: int)

static var count := 0
var health: int = 10:
	set(value):
		health = clampi(value, 0, 100)
	get:
		return health

func _init() -> void:
	super()

@abstract func area() -> float

func attack(target: Node) -> int:
	var cb := func(x): return x * 2
	match target.kind:
		1, 2:
			return cb.call(1)
		var k when k > 3:
			hit.emit(k)
		_:
			pass
	return 0

class Inner:
	func _init():
		pass
`;

describe("GDScript contract", () => {
  it("parses Godot 4 syntax without errors", () => {
    const file = parseFixture("gdscript", SAMPLE);
    expect(file.tree.rootNode.hasError).toBe(false);
  });

  it("finds the 5 unit nodes in pre-order and skips a body-less func", () => {
    // health.set, health.get, script _init, attack, Inner._init. @abstract area has no body.
    const nodes = functionNodes(parseFixture("gdscript", SAMPLE));
    expect(nodes.map((n) => n.type)).toEqual([
      "set_body",
      "get_body",
      "constructor_definition",
      "function_definition",
      "function_definition",
    ]);
  });

  it("routes .gd files to the gdscript backend", () => {
    expect(languageForPath("scenes/player.gd")).toBe("gdscript");
    expect(languageForPath("scenes/PLAYER.GD")).toBe("gdscript");
  });
});
