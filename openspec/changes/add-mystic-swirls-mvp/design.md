# Design

## Context

See `proposal.md` — Why. This is a greenfield Expo application; the repository currently contains only OpenSpec scaffolding. The two constraints that shape every decision below are:

1. The board mutates after each connection, so the engine must resolve turns in a fixed order and stay deterministic.
2. The feasibility of "the board is never unsolvable" determines whether the premise works at all, so it must be proven before UI investment.

Requirements live in `specs/puzzle-engine`, `specs/turn-resolution`, `specs/level-content`, `specs/board-rendering`, and `specs/game-session`; this document explains how to satisfy them.

## Goals / Non-Goals

**Goals:**

- A pure, headless engine that can be unit-tested and run in Node with zero React Native dependencies.
- A turn pipeline whose steps are individually testable and whose output is a serializable event stream.
- A solvability guarantee that is cheap at runtime and absolute at content-build time.
- A rendering approach that keeps tracing on the UI thread and off React's render path.
- Two feasibility spikes (solver, Skia/gesture) that can invalidate the plan before the app is built.

**Non-Goals:**

- General-purpose Numberlink solving performance. We only solve constrained states, and only offline for shipped levels.
- A level editor or procedural generator. Levels are authored JSON for this slice.
- Multiplayer, sync, analytics, ads, IAP, and asset pipeline work.
- Handling grid sizes or pair counts beyond what the shipped levels need. The solver is allowed to have a documented budget.

## Decisions

### D1. Layering with an enforced dependency direction

```
app/ (expo-router)
  UI/ -> render/ -> sim/ -> engine/ <- content/
                          \-> state/ (zustand) -> platform/ (MMKV)
```

`engine/` and `content/` import nothing from React, React Native, Skia, Reanimated, or zustand. `sim/` may import `engine/` and `content/`; `render/` and `ui/` import downward only; `platform/` is the only place native modules are touched.

**Why:** the engine must run in Vitest and in a Node validator. A single accidental RN import breaks that, and the failure is silent until CI. Enforce with ESLint `no-restricted-imports` path rules rather than convention.

**Alternative considered:** a monorepo with a `packages/engine` package. Rejected for the MVP — workspace tooling adds friction without a second consumer yet. Revisit if a level-editor CLI grows.

### D2. Flat, plain-data board state

```ts
type CellKind = 'free' | 'rune' | 'pit' | 'lava' | 'thorn' | 'stone' | 'covered';

interface BoardState {
  w: number; h: number;
  cells: CellKind[];            // row-major, length w*h
  pairOf: Int16Array;           // -1 or pairId per cell
  element: Uint8Array;          // element code per cell, 0 = none
  paths: Record<number, number[]>;  // pairId -> ordered cell indices
  connected: number[];
  order: number[];
  scriptIndex: number;
  moveIndex: number;
}
```

Mutations are plain data, snapshots are cheap clones (grids are small: ≤ 8x8 = 64 entries), so undo is a stack of states rather than a patch log.

**Why flat:** the solver hashes and clones states thousands of times; typed arrays and index arithmetic avoid object-graph churn. `paths` keyed by pair id keeps per-path operations simple.

**Alternative considered:** `Cell[][]` of objects for readability. Rejected — it makes the solver noticeably slower and invites accidental shared references.

### D3. Turn resolution is a pure fold over steps

```
resolveTurn(state, action, script) -> { state, events, rejected? }

  1. applyAction      (extend path, complete connection, or undo)
  2. applyElement     (only when a connection completed)
  3. proposeHazard    (HazardSource; script entry at scriptIndex)
  4. applyMutation    (atomic; only if every target is legal)
  5. guard            (isSolvable; discard mutation on failure)
```

Each step is a pure function returning a new state plus events. `HazardSource` is an interface with one implementation for this slice (`ScriptedHazardSource`), so the deferred "scripted vs seeded vs contextual" choice is a swap, not a rewrite.

**Why a fold:** steps are independently testable, and the ordered event stream falls out of concatenation. It also makes the guard's position explicit and testable.

**Alternative considered:** a class-based `Game` with mutable fields and methods. Rejected — replay determinism and snapshotting become error-prone.

### D4. Immutable committed paths, and mutations as data

Hazards never modify a cell that belongs to a committed path. Mutations are inert records (`{ kind: 'shift-row', row, dx }`, `{ kind: 'spread', from, to }`, `{ kind: 'grow', cell }`) validated for legality before application.

**Why:** if a hazard could invalidate a committed path, every turn would require a full re-solve and the player would watch their work get destroyed. Fixing committed geometry also shrinks the search space for the guard from "solve the level" to "route the remaining pairs through the remaining cells."

**Alternative considered:** allow hazards to break paths and force an automatic undo of the affected pair. Rejected — it creates surprising state changes and a much larger solvability problem.

### D5. Solvability is a content-build guarantee; runtime guard is a cheap safety net

- **Build time (authoritative):** `content/validate.ts` runs in Node/CI. It performs a depth-first search with pruning over the level with committed paths fixed, and it simulates the scripted hazard sequence, checking every reachable state. A level is shippable only if all reachable states are solvable.
- **Runtime (defensive):** `engine/solver.ts` exposes the same `isSolvable(state, budgetMs)` with an 8 ms default budget. Timeout is treated as `unknown` and the mutation is *rejected* (conservative), so behavior is deterministic and never random.

Pruning rules, in order: out-of-bounds/impassable rejection; degree check (a free cell with fewer than two usable neighbours must be an endpoint or dead-end); connected-component check (each remaining pair's endpoints must lie in the same free component); remaining-free-cell count ≥ sum of Manhattan distances; dead-end parity.

**Why:** Numberlink solvability is NP-complete. Doing it only at build time makes the runtime cost zero for shipped levels, where the script is pre-validated. Keeping the same code path for both means no drift between what CI proves and what the runtime believes.

**Alternative considered:** solve on a worker at runtime. Deferred — it adds threading, serialization, and platform complexity for a case the content pipeline already eliminates. If contextual hazards arrive later, this becomes necessary.

### D6. Rendering: one Skia canvas, shared-value-driven, no React on the trace path

```
<Canvas>                         // one surface, one onDraw
  drawBoardStatic()              // grid + terrain, paint objects cached
  drawCommittedPaths()           // per-pair elemental stroke
  drawActiveTrail()              // reads useSharedValue on UI thread
  drawParticles()                // capped pool, preallocated
  drawRunes()                    // endpoints on top
</Canvas>
```

- Gesture: a single `Gesture.Pan()` on the board. `onBegin/onUpdate` run as worklets, convert pointer position to a cell index, and perform orthogonal adjacency checks in worklet-safe pure code.
- State crossing: `runOnJS` only on discrete events (path commit, connection complete). Pointer samples never cross the bridge.
- Trail glow: three strokes of the same `Skia.Path` — wide low-alpha blurred halo, mid bloom, saturated core — with round caps. Path is built from cell centres, and only the leading segment is interpolated, which gives the magnetic feel and keeps rebuilds cheap.
- `Paint` and `Path` objects are created outside `onDraw`; nothing is allocated per frame.

**Why one canvas:** a composed per-cell component tree would put hundreds of components on the render path and make z-ordering and shared-value wiring fragile. One surface also makes the frame budget measurable in one place.

**Alternative considered:** `react-native-svg` or a tile-based native view. Rejected — insufficient for glow/particle effects at 60fps on Android.

### D7. Store is a thin projection of committed events

Zustand holds `BoardState`, session metadata, and the level list. It is updated only from committed events, never from pointer movement. An in-progress trace lives entirely in `render/` shared values; on commit, the store replaces its state with the turn result and the renderer reconciles.

**Why:** this is what makes the frame-budget requirement in `specs/board-rendering` achievable while keeping the UI declarative.

### D8. Progress persistence via MMKV with a schema version

Progress is a small JSON blob under a versioned key: `{ version, completed: string[] }`. On read: missing → default; parse failure or unknown/invalid shape → default (do not throw, do not delete unrelated keys); newer version → default (forward-compatible refusal).

**Why:** MMKV is synchronous and fast, well suited to a tiny record. Versioning costs almost nothing now and prevents silent misreads after a format change.

### D9. Testing strategy

- **Engine:** Vitest unit + property tests. Random boards, check invariants (no cell in two paths, no path through blocked terrain, undo restores exactly).
- **Turn pipeline:** table-driven tests over each effect/hazard combination, including guard rejection.
- **Determinism:** replay a recorded action log and assert deep equality, including event order.
- **Validator:** golden levels — a known-solvable level passes, a designed-unsolvable level fails, a budget-exceeded case fails rather than hangs.
- **Rendering:** no unit tests for pixels; a manual device checklist plus a frame-rate measurement on the lowest supported device.

## Risks / Trade-offs

- **Solver complexity explodes with grid size** → Document a supported size envelope (start ≤ 8x8 with ≤ 6 pairs); the validator's per-level budget turns a slow level into a hard failure rather than a CI hang. Revisit pruning before increasing sizes.
- **The offline guarantee weakens if hazards become contextual/random** → `HazardSource` isolates the change, but runtime `isSolvable` becomes mandatory at that point. This is the trigger to implement the worker-based solver.
- **Worklet-safe path validation duplicates engine logic** → Keep the worklet layer to hit-testing and adjacency only; all rule enforcement happens in the engine on commit. Resist putting win/coverage logic into the worklet.
- **Skia glow performance on low-end Android** → Blur is the expensive part. Mitigate with a reduced-quality glow tier selected at startup by device capability, and cap particles. Measure on a real mid-tier Android device during the spike, not a simulator.
- **Gesture conflicts with parent scroll containers** → Board screen owns the gesture and disables ancestor scrolling while a trace is active; verify with a scrollable level-select underneath.
- **Level authoring cost is high given order-dependent effects** → Ship 8–10 levels only after the validator can report *why* a level fails (failing state + script index), and add a debug view that steps through the scripted hazard sequence.
- **"Air push" moves an endpoint** → Since committed paths are immutable, the design clears any in-progress path attached to the pushed endpoint and emits an event. If playtesting finds this confusing, restrict air to terrain effects only.

## Migration Plan

Greenfield; no data or API migration. Rollout is incremental and reversible at every step:

1. Scaffold Expo app and test tooling; no game code.
2. Land engine + validator with tests; nothing user-visible.
3. Land renderer and session behind the single playable screen.
4. Ship the validated level set.

Rollback: each milestone is additive and unreferenced until the playable screen exists. Reverting the final milestone returns the repo to a tested headless engine, which remains useful.

## Open Questions

- Grid size and pair count envelope to commit to for the first shipped set. Resolvable with the solver spike; affects the validator budget only, not the architecture.
- Whether `stone` can ever become traversable in later content. Deferred; this slice treats it as permanent.
- Exact glow quality tiers per device class. Resolvable during the rendering spike; does not change the API.
