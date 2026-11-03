# Level Authoring

Levels are declarative JSON documents. They contain no executable code and are
parsed with `parseLevel` before being offered for play.

## Document shape

```json
{
  "id": "level-01",
  "name": "First Steps",
  "width": 4,
  "height": 4,
  "pairs": [
    {
      "id": 1,
      "element": "fire",
      "endpoints": [{ "x": 0, "y": 0 }, { "x": 3, "y": 3 }]
    }
  ],
  "terrain": [{ "x": 1, "y": 1, "kind": "lava" }],
  "hazardScript": [{ "kind": "shift-row", "row": 2, "dx": 1 }]
}
```

- `width`/`height` are positive integers.
- `pairs[].id` is a unique non-negative integer; each pair has exactly two
  endpoints. `element` is `fire`, `water`, `earth`, or `air`.
- Endpoints and terrain use zero-based `(x, y)` coordinates with the origin at
  the top-left. Coordinates outside the grid are rejected.
- `terrain[].kind` is `pit`, `lava`, `thorn`, or `stone`. Terrain may not sit on
  a rune endpoint.
- `hazardScript` is an ordered list consumed one entry per completed
  connection. Supported kinds: `shift-row`, `spread`, `grow`.
  - `shift-row`: `{ "row": number, "dx": -1 | 1 }`
  - `spread`: `{ "from": {x,y}, "to": {x,y} }`
  - `grow`: `{ "cell": {x,y} }`

## Validation

Every level must pass `src/content/validator.ts` before it ships:

1. The initial board must have a solution.
2. Each state produced by walking the hazard script must still have a solution.
3. Validation runs under a 5000 ms per-level budget. Exceeding it fails with the
   level id and script index rather than hanging.

```bash
bun run validate:levels   # exits non-zero and names the level on failure
```

The same parser and validator are used by the runtime loader, which skips and
reports an invalid level instead of crashing.

## Worked example

```json
{
  "id": "docs-3x3",
  "name": "Docs Example",
  "width": 3,
  "height": 3,
  "pairs": [
    {
      "id": 1,
      "element": "fire",
      "endpoints": [{ "x": 0, "y": 0 }, { "x": 2, "y": 1 }]
    },
    {
      "id": 2,
      "element": "water",
      "endpoints": [{ "x": 1, "y": 1 }, { "x": 2, "y": 2 }]
    }
  ],
  "terrain": [],
  "hazardScript": []
}
```

```ts
import { parseLevel } from "@/content/schema";
import { validateLevel } from "@/content/validator";

const parsed = parseLevel(doc);
if (!parsed.ok) throw new Error(parsed.errors[0].reason);

const result = validateLevel(parsed.level);
// result.ok === true; the pair paths [0,1,2,5] and [4,3,6,7,8] cover 3×3.
```

This example is exercised by `src/content/docsExample.test.ts`.

## Shipped envelope

The shipped set uses 4×4 to 7×7 boards with 2–6 pairs. Six of the ten levels
use no terrain; four use a single `lava` or `stone` cell. The solver supports
these sizes within the 8 ms runtime budget and the 5000 ms offline budget (see
`design.md`).
