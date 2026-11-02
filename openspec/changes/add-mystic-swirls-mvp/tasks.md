# Tasks

## 1. Scaffold and tooling

- [ ] 1.1 Scaffold an Expo SDK 52+ TypeScript app at the repository root and verify `npx expo start` boots the app and `npx tsc --noEmit` passes
- [ ] 1.2 Add runtime dependencies (`@shopify/react-native-skia`, `react-native-reanimated` v3, `react-native-gesture-handler`, `zustand`, `react-native-mmkv`) and verify the native build runs via `npx expo prebuild` plus a local device/simulator build
- [ ] 1.3 Configure Reanimated's Babel plugin and Gesture Handler's root wrapper and verify tracing gestures respond in the scaffolded screen
- [ ] 1.4 Add Vitest with a `test` script and verify a sample engine test runs green
- [ ] 1.5 Configure ESLint `no-restricted-imports` boundaries so `src/engine` and `src/content` cannot import React, React Native, Skia, Reanimated, or zustand, and verify a deliberate violating import fails lint
- [ ] 1.6 Add a CI workflow running typecheck, lint, tests, and level validation, and verify it passes on the scaffold
- [ ] 1.7 Document the layer boundaries and directory layout in `docs/architecture.md` and verify every command in it runs as written

## 2. Feasibility spikes (de-risk before building UI)

- [ ] 2.1 Implement a throwaway Node solver prototype for 6x6 and 7x7 boards with 4–6 pairs, and verify it solves known-solvable boards and rejects known-unsolvable ones within an 8 ms budget
- [ ] 2.2 Record the supported grid-size and pair-count envelope from 2.1 and verify the chosen envelope is written into `design.md` Open Questions
- [ ] 2.3 Build a throwaway Skia + gesture harness that traces a glowing trail on a 6x6 grid, and verify ≥60 fps measured with the performance monitor on the lowest target Android device
- [ ] 2.4 Record glow-quality tier findings from 2.3 and verify the tier rule (halo/bloom flags per device class) is written into `design.md`
- [ ] 2.5 Confirm the provisional assumptions (scripted hazard source, wind terrain-only first hazard, immutable committed paths, `stone` permanent) and verify they are reflected in `design.md` before pipeline work starts
- [ ] 2.6 If either spike fails its acceptance check, record the finding and the required design change in `design.md` before continuing to group 3

## 3. Puzzle engine

- [ ] 3.1 Define engine types and a board factory (flat cells, pair map, element map) and verify tests cover dimensions, terrain kinds, and out-of-bounds rejection
- [ ] 3.2 Implement path start, orthogonal extension, backtrack, and rejection of diagonal/occupied/blocked/foreign-rune moves, and verify unit tests cover each rejection case
- [ ] 3.3 Implement connection completion, coverage marking, and connected-pair tracking and verify tests cover reach-endpoint completion and that committed paths cannot be extended
- [ ] 3.4 Implement the win condition with hazard terrain exempt from coverage and verify tests cover solved, uncovered-free-cell, unconnected-pair, and hazard-exempt cases
- [ ] 3.5 Implement undo as a snapshot stack and verify a test proves undo restores state across a connection with effects and a hazard
- [ ] 3.6 Implement state serialization and deterministic action replay, and verify a replayed action log deep-equals the original state and event order
- [ ] 3.7 Add property tests over randomly generated boards for core invariants (no cell in two paths, no path through blocked terrain, undo is involutive) and verify they run green
- [ ] 3.8 Document the engine public API in `docs/engine.md` and verify the documented example compiles and produces the stated result

## 4. Turn resolution

- [ ] 4.1 Implement element effects (fire→thorn-free, water→lava-stone, earth→pit-free, air→endpoint push) and verify tests cover all four mappings plus the committed-path immutability rule
- [ ] 4.2 Implement serializable mutation records with atomic legality validation and verify tests cover JSON round-trip equality and all-or-nothing application
- [ ] 4.3 Implement `HazardSource` with a scripted implementation, including script exhaustion as a no-op, and verify tests cover consumption order and the exhausted case
- [ ] 4.4 Implement the resolution fold in fixed order and verify a test asserts effect→hazard→guard ordering via the event stream
- [ ] 4.5 Wire the solvability guard with a time budget and conservative timeout rejection, and verify tests cover mutation applied, mutation discarded, and timeout-as-rejected
- [ ] 4.6 Implement the ordered event stream (connection, effect, hazard applied/rejected, solved) and verify a test asserts exact order and serializability
- [ ] 4.7 Verify determinism of repeated resolution with a test asserting identical state and identical events for the same inputs
- [ ] 4.8 Document the turn pipeline and mutation kinds in `docs/turn-resolution.md` and verify the documented sequence matches the tests

## 5. Level content and validation

- [ ] 5.1 Define the level document schema and parser and verify tests reject out-of-bounds endpoints, incomplete pairs, duplicate pair ids, runes on non-free cells, and unknown mutation kinds with specific reasons
- [ ] 5.2 Implement the runtime loader that validates before offering a level and verify a test shows an invalid level is skipped without crashing the app
- [ ] 5.3 Implement the depth-first solver with pruning and a per-level budget and verify golden tests for solvable, unsolvable, and budget-exceeded cases
- [ ] 5.4 Implement scripted-hazard state enumeration that checks solvability of every reachable state and verify a test rejects a level whose hazard strands free cells and reports the failing script index
- [ ] 5.5 Add the CI validation command and verify a deliberately broken level exits non-zero and names the level while the shipped set passes
- [ ] 5.6 Author 8–10 levels using the confirmed size envelope and verify every one passes the validator
- [ ] 5.7 Document the level authoring format with a worked example in `docs/levels.md` and verify the example parses and validates as written

## 6. Board rendering

- [ ] 6.1 Implement single-canvas board layout with uniform scaling, DPR handling, and hit testing, and verify a test of pointer→cell mapping against rendered geometry
- [ ] 6.2 Render static layers (grid, terrain, runes) with cached paint objects and verify each terrain kind is visually distinct in a manual device check
- [ ] 6.3 Render committed paths with elemental styling and verify all connected paths remain visible while tracing another pair
- [ ] 6.4 Render the active glowing trail with cell-centre snapping and a leading-edge interpolation, and verify by manual check that three-cell traces show no gaps and use the pair's palette
- [ ] 6.5 Implement worklet-based tracing (start only on an unconnected rune, orthogonal adjacency, invalid moves do not extend) and verify unit tests for adjacency/hit logic plus a manual trace on device
- [ ] 6.6 Wire commit-only store updates and verify with the React profiler that continuous tracing produces no per-sample re-renders
- [ ] 6.7 Add discrete feedback: pair completion indication, hazard-rejected indication, and trace cancellation on release
- [ ] 6.8 Measure sustained frame rate during tracing on the lowest target device and verify it holds at or above 60 fps; if not, apply the recorded glow tier and re-measure
- [ ] 6.9 Write a device rendering checklist (terrain distinction, trail gaps, hit accuracy, gesture conflict with scroll) and verify it passes on both iOS and Android

## 7. Game session and persistence

- [ ] 7.1 Implement the session store and level ordering (first level on clean install, earliest unsolved on return, replay without progress change) and verify tests for all three cases
- [ ] 7.2 Build the in-play HUD with level, connected-pair progress, and undo enabled/disabled states, and verify tests cover updates after a connection and the empty-history case
- [ ] 7.3 Implement completion presentation, input lock after solve, and next-level unlock, and verify tests cover first completion and repeat completion recording once
- [ ] 7.4 Implement versioned MMKV progress persistence and verify tests cover write/read, missing data, corrupt data, and newer-version fallback without throwing
- [ ] 7.5 Verify offline play manually (airplane mode) for level load, completion, and restart persistence

## 8. Integration

- [ ] 8.1 Play the first three shipped levels end to end on both platforms covering trace, hazard mutation, guard rejection, undo, completion, and restart, and verify the written checklist passes
- [ ] 8.2 Audit every scenario in `specs/` against an implemented test or listed manual check, and verify no scenario is unaccounted for
- [ ] 8.3 Run the full gate (typecheck, lint, tests, level validation, native build) and verify it passes from a clean checkout

## Workflow follow-up

- Archive the change after review and after the full gate passes.
- Verify the archived specs appear under `openspec/specs/` with their purposes intact.
