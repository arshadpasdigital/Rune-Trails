# Turn Resolution

A turn happens when a player completes a connection. Resolution is a pure fold
in a fixed order; no step observes a later step.

```
resolveTurn(state, pairId, path, hazardSource, { guardBudgetMs }) -> { state, events }

  1. commit the connection
  2. apply the path's element effect
  3. propose the next scripted hazard
  4. validate and apply the mutation atomically
  5. solvability guard (default 8 ms)
  6. solved check
```

## Element effects

Exactly one effect kind applies per completed path, to orthogonal neighbours of
the path:

| Element | Effect |
| --- | --- |
| `fire` | every adjacent `thorn` becomes `free` |
| `water` | every adjacent `lava` becomes `stone` |
| `earth` | every adjacent `pit` becomes `free` |
| `air` | pushes one adjacent unconnected rune endpoint one cell into a `free` cell |

Cells belonging to a committed path are never modified. The effect step emits
one `effect` event per changed cell (or one `push` event for air).

For shipped content, `lava`/`stone` are the only terrain kinds used and `air` is
not assigned to any shipped pair, so water is the only effect that changes a
cell (lava → stone, still impassable) and the traversable cell set is preserved.
This keeps the offline validator's solvability guarantee intact. `fire`, `earth`,
and `air` remain fully supported and unit-tested.

## Hazard mutations

Mutations are inert, serializable records:

```ts
type MutationRecord =
  | { kind: "shift-row"; row: number; dx: -1 | 1 }
  | { kind: "spread"; from: { x: number; y: number }; to: { x: number; y: number } }
  | { kind: "grow"; cell: { x: number; y: number } };
```

- `shift-row` permutes one row by one cell. The cell pushed off the edge must be
  `free`, and no cell in the row may belong to a committed path. The vacated
  edge cell becomes `free`. `pairOf` and `element` travel with their cells.
- `spread` copies terrain from `from` to a `free` `to`.
- `grow` turns a `free` cell into `thorn`.

`validateMutation` checks every target first; `applyMutation` clones and throws
for an illegal record, so a mutation is all-or-nothing.

## Hazard source

```ts
interface HazardSource {
  propose(state: BoardState): MutationRecord | null;
}
```

`ScriptedHazardSource` returns `script[state.scriptIndex]`. Resolution advances
`scriptIndex` exactly once per completed connection; an exhausted script is a
no-op. Swapping the source is the only change needed for seeded/contextual
hazards later.

## Guard

After the effect and mutation, `solve(candidate, guardBudgetMs)` runs. If the
candidate is unsolvable or the budget expires, the mutation is discarded and a
`hazard-rejected` event is emitted with reason `unsolvable` or `timeout`.
Timeout is deliberately conservative: no environmental change.

## Event stream

Events are plain, serializable objects:

```ts
type GameEvent =
  | { type: "connection"; pairId: number; element: Element; path: number[] }
  | { type: "effect"; element: Element; effect: "convert" | "push"; cell: number; ... }
  | { type: "hazard-applied"; mutation: MutationRecord }
  | { type: "hazard-rejected"; mutation: MutationRecord; reason: "unsolvable" | "timeout" | "illegal" }
  | { type: "solved" }
  | { type: "undo" };
```

Order is guaranteed: `connection`, then effect events, then the hazard event,
then `solved` last. Rendering and hazard animation consume this stream; replay
reproduces it exactly.

## Example

A 2×3 board with a thorn at `(1,1)`:

1. Connect pair 1 across the top row `[0, 1]`.
2. Fire burns the adjacent thorn at `(1,1)`, emitting an `effect` event.
3. The scripted `shift-row` on row 1 is legal after the burn.
4. The guard accepts it and emits `hazard-applied`.

The event order is `connection → effect → hazard-applied`, asserted by
`src/sim/resolve.test.ts`. The same test suite covers a mutation that is
discarded as unsolvable, a mutation discarded as a timeout, determinism, and
JSON round-tripping of the event stream.
