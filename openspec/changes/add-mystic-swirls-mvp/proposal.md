# Proposal

## Why

Mystic Swirls is a greenfield mobile puzzle game whose core loop — trace elemental paths on a grid while the environment mutates after every connection — has never been built or validated. Nothing exists in this repository yet except OpenSpec scaffolding. We need the smallest playable vertical slice that proves the loop is fun and technically feasible on Expo/React Native before investing in content, monetization, and live services.

## What Changes

- Introduce the project skeleton: Expo SDK 52+ app in TypeScript, with a strict one-way dependency layout (`engine` and `content` must not import React, Skia, or zustand).
- Build a pure TypeScript puzzle engine: flat grid model, orthogonal path tracing, crossing/occupancy validation, connection completion, win condition, and cheap undo.
- Build a turn-resolution pipeline that runs, in order: commit connection → element effect → hazard mutation → solvability guard, and emits serializable events for rendering and replay.
- Introduce the mutation model as data (`shift-row`, `spread`, `grow`) behind a `HazardSource` interface, so the unresolved "scripted vs seeded vs contextual" decision stays a one-file swap.
- Build the offline content pipeline: a level JSON schema plus a Node-run validator that proves every reachable state (given the scripted hazard sequence) remains solvable, before a level ships.
- Build the Skia board: one canvas rendering grid, terrain, runes, committed paths, and the in-progress glowing trail; gestures drive shared values and only commit to state on discrete events.
- Animate hazard mutations from the event stream (wind row-push slides cells, rejected mutations shake) at 60 fps within the same rendering budget.
- Build the minimal game session: load a level, play, detect completion, advance, persist progress to MMKV, show a minimal HUD and win screen.
- Add haptic feedback (light impact on pair connection, success notification on solve) with a user-facing disable toggle.
- Ship 8–10 validated levels in the first slice.

Explicitly **out of scope** for this change: rewarded ads, IAP/subscriptions, Firebase cloud saves/analytics/daily boards, spells inventory, sprite narration, hand-painted art, audio, particles beyond a minimal completion burst, and procedural level generation.

## Capabilities

### New Capabilities

- `puzzle-engine`: grid and cell model, rune pairs, orthogonal path tracing and validation, connection completion, win condition, undo/replay determinism.
- `turn-resolution`: ordered effect/hazard pipeline, serializable mutation model, `HazardSource` contract, solvability guard(8 ms runtime budget, conservative timeout-as-rejected), deterministic event emission.
- `level-content`: level schema, scripted hazard sequences, and the offline validator that gates a level on solvability of every reachable state(5000 ms offline budget; timeout = validation failure naming the level).
- `board-rendering`: single-canvas Skia rendering of the board and elemental trails, gesture-to-shared-value tracing, hazard-mutation animation driven by the event stream, 60fps interaction budget, no React re-render while tracing.
- `game-session`: level load/advance flow, completion and win presentation,haptic feedback with disable toggle, progress persistence via MMKV, minimal HUD.

### Modified Capabilities

None — this is the first change in the repository and `openspec/specs/` is empty.

## Assumptions

Decisions the exploration left open, recorded so the design and tasks can proceed. Each is reversible without reshaping the architecture.

- **Hazard source**: scripted per level for this slice. It is the only option the offline validator can fully guarantee, and `HazardSource` keeps seeded/contextual selectable later.
- **First hazard**: wind, pushing one row by one cell on each completed connection. The first level starts on an empty board (no `pit`, `lava`, `thorn`, or `stone`), so wind shifts only `free` cells and unconnected rune endpoints; later levels may add terrain so the element effects are exercised. Wind is the only hazard kind the shipped scripts use.
- **Committed paths are immutable**: hazards never move or invalidate cells belonging to a completed path. This is what makes solvability tractable.
- **Traversal**: `pit`, `lava`, `thorn`, and `stone` are not traversable. Paths must route around them or neutralize them with an element effect.
- **Stone**: permanent inert terrain. `water` cooling `lava` produces it; nothing removes it in this slice.
- **Win condition**: all pairs connected, and every `free` or `rune` cell is covered by a path. Hazard cells (`pit`, `lava`, `thorn`, `stone`) are exempt from coverage.

## Impact

- New Expo application (no existing app code): `app/`, `src/engine/`, `src/sim/`, `src/content/`, `src/render/`, `src/state/`, `src/platform/`.
- New dependencies: `expo` (SDK 52+), `react-native`, `typescript`, `@shopify/react-native-skia`, `react-native-reanimated` v3, `react-native-gesture-handler`, `zustand`, `react-native-mmkv`, plus `vitest` for engine/validator tests.
- New Node tooling: level validator runnable in CI, sharing source with the runtime content loader.
- No existing APIs or specs are affected; no migration or backwards-compatibility work.
