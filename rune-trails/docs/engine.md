# Engine API

`src/engine` is a pure, headless module. It has no React Native, Skia, or store
dependencies, so it can be imported from Vitest, Node, or the app.

## Board state

```ts
type CellKind = "free" | "rune" | "pit" | "lava" | "thorn" | "stone" | "covered";

interface BoardState {
  w: number;
  h: number;
  cells: CellKind[];            // row-major, length w * h
  pairOf: Int16Array;           // pair id per cell, -1 when none
  element: Uint8Array;          // 1 fire, 2 water, 3 earth, 4 air, 0 none
  paths: Record<number, number[]>; // committed pair id -> ordered cell indices
  connected: number[];
  order: number[];              // completion order
  scriptIndex: number;          // next hazard script entry
  moveIndex: number;            // committed connections
}
```

`createBoard({ w, h, pairs, terrain })` builds a board and throws `EngineError`
for out-of-bounds endpoints, duplicate pair ids, or terrain on a non-free cell.

## Tracing

```ts
startTrace(state, cellIndex): Trace | null
extendTrace(state, trace, targetIndex): Trace
isConnectionComplete(state, trace): boolean
commitConnection(state, pairId, path): BoardState
```

- `startTrace` succeeds only on an unconnected rune endpoint.
- `extendTrace` accepts orthogonal steps, backtracks when the target is the
  previous cell, and otherwise returns the trace unchanged for invalid moves
  (diagonal, occupied, blocked, foreign rune, revisited cell).
- `commitConnection` validates the whole path, marks its cells `covered`,
  records the path, and appends the pair to `connected`/`order`.

## Win and undo

```ts
isSolved(state): boolean
createHistory(state): History
pushHistory(history, nextState): History
canUndo(history): boolean
undo(history): History
```

`isSolved` requires every pair connected and no `free` or `rune` cell left
uncovered. `pit`, `lava`, `thorn`, `stone`, and `covered` are exempt.

## Serialization

```ts
serializeState(state): SerializedBoardState
deserializeState(json): BoardState
statesEqual(a, b): boolean
```

## Solver

```ts
solve(state, budgetMs = 8): { status: "solvable" | "unsolvable" | "timeout"; elapsedMs: number }
isSolvable(state, budgetMs = 8): boolean
```

The solver routes remaining pairs over disjoint orthogonal paths that cover
every remaining `free`/`rune` cell. It prunes on degree, components, minimum
path length, and memoizes failed occupancy states. `timeout` must be treated
conservatively by callers.

## Worked example

```ts
import {
  createBoard,
  startTrace,
  extendTrace,
  commitConnection,
  isSolved,
} from "@/engine";

const board = createBoard({
  w: 3,
  h: 3,
  pairs: [
    { id: 1, element: "fire", endpoints: [{ x: 0, y: 0 }, { x: 2, y: 1 }] },
    { id: 2, element: "water", endpoints: [{ x: 1, y: 1 }, { x: 2, y: 2 }] },
  ],
});

let trace = startTrace(board, 0)!; // (0,0)
trace = extendTrace(board, trace, 1); // (1,0)
trace = extendTrace(board, trace, 2); // (2,0)
trace = extendTrace(board, trace, 5); // (2,1) — pair 1 endpoint

const afterFirst = commitConnection(board, 1, trace.cells);
// afterFirst.paths[1] is [0, 1, 2, 5]
// afterFirst.connected is [1]

const afterSecond = commitConnection(afterFirst, 2, [4, 3, 6, 7, 8]);
// isSolved(afterSecond) === true
```

This example is exercised by `src/engine/docsExample.test.ts`.
