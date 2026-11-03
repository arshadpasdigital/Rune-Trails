import { describe, expect, it } from "vitest";
import { parseLevel } from "@/content/schema";
import { validateLevel } from "@/content/validator";

const doc = {
  id: "docs-3x3",
  name: "Docs Example",
  width: 3,
  height: 3,
  pairs: [
    {
      id: 1,
      element: "fire",
      endpoints: [
        { x: 0, y: 0 },
        { x: 2, y: 1 },
      ],
    },
    {
      id: 2,
      element: "water",
      endpoints: [
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ],
    },
  ],
  terrain: [],
  hazardScript: [],
};

describe("documented level example", () => {
  it("parses and validates as written", () => {
    const parsed = parseLevel(doc);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = validateLevel(parsed.level);
    expect(result.ok).toBe(true);
  });
});
