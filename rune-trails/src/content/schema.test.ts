import { describe, expect, it } from "vitest";
import { parseLevel } from "../content/schema";
import { validDoc } from "../testing/levelFixtures";

function errorsOf(input: unknown): string {
  const parsed = parseLevel(input);
  expect(parsed.ok).toBe(false);
  if (parsed.ok) return "";
  return parsed.errors.map((error) => `${error.path}: ${error.reason}`).join(" | ");
}

describe("level document parser", () => {
  it("parses a complete level document", () => {
    const parsed = parseLevel(validDoc());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.level.width).toBe(3);
    expect(parsed.level.pairs).toHaveLength(2);
    expect(parsed.level.initialState.cells.filter((cell) => cell === "rune")).toHaveLength(
      4,
    );
  });

  it("rejects out-of-bounds endpoints", () => {
    const doc = validDoc();
    (doc.pairs as { endpoints: unknown[] }[])[0].endpoints[1] = { x: 5, y: 0 };
    expect(errorsOf(doc)).toMatch(/out of bounds/);
  });

  it("rejects an incomplete pair", () => {
    const doc = validDoc();
    (doc.pairs as { endpoints: unknown[] }[])[0].endpoints = [{ x: 0, y: 0 }];
    expect(errorsOf(doc)).toMatch(/exactly two endpoints/);
  });

  it("rejects duplicate pair ids", () => {
    const doc = validDoc();
    (doc.pairs as { id: number }[])[1].id = 1;
    expect(errorsOf(doc)).toMatch(/duplicate pair id 1/);
  });

  it("rejects runes placed on non-free terrain", () => {
    const doc = validDoc();
    doc.terrain = [{ x: 0, y: 0, kind: "stone" }];
    expect(errorsOf(doc)).toMatch(/on a rune cell/);
  });

  it("rejects an unknown mutation kind at a named script index", () => {
    const doc = validDoc();
    doc.hazardScript = [{ kind: "flood" }];
    const message = errorsOf(doc);
    expect(message).toMatch(/unknown mutation kind "flood" at script index 0/);
  });

  it("rejects non-object input", () => {
    expect(errorsOf("nope")).toMatch(/JSON object/);
  });
});
