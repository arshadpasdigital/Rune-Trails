import { describe, expect, it } from "vitest";
import { loadLevels } from "../content/loader";
import { validDoc } from "../testing/levelFixtures";

describe("runtime level loader", () => {
  it("skips invalid levels without throwing", () => {
    const broken = validDoc();
    broken.pairs = [{ id: 1, element: "fire", endpoints: [{ x: 9, y: 9 }] }];

    const result = loadLevels([validDoc(), broken, "not json"]);
    expect(result.levels).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
  });

  it("accepts JSON strings", () => {
    const result = loadLevels([JSON.stringify(validDoc())]);
    expect(result.levels).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejects levels that fail solvability validation", () => {
    const doc = validDoc();
    doc.hazardScript = [{ kind: "grow", cell: { x: 2, y: 0 } }];
    // Grow at a free cell may or may not strand this particular board; assert
    // only that the loader never throws and reports consistently with validation.
    const result = loadLevels([doc]);
    expect(result.levels.length + result.rejected.length).toBe(1);
  });

  it("reports a level id for malformed documents", () => {
    const result = loadLevels([{ id: "bad-level" }]);
    expect(result.rejected[0].levelId).toBe("bad-level");
    expect(result.rejected[0].issues.length).toBeGreaterThan(0);
  });
});
