# Spec Audit

Every scenario in `openspec/changes/add-mystic-swirls-mvp/specs/` is mapped to
an automated test or a manual checklist item. Manual items live in
`docs/device-checklist.md`.

## puzzle-engine

| Scenario | Coverage |
| --- | --- |
| Level exposes dimensions and terrain | `src/engine/board.test.ts` |
| Out-of-bounds cell access rejected | `src/engine/board.test.ts` |
| Orthogonal step accepted | `src/engine/path.test.ts` |
| Diagonal step rejected | `src/engine/path.test.ts` |
| Entering another pair's rune rejected | `src/engine/path.test.ts` |
| Crossing an existing path rejected | `src/engine/path.test.ts` |
| Blocked terrain impassable | `src/engine/path.test.ts` |
| Path may backtrack | `src/engine/path.test.ts` |
| Reaching matching endpoint completes | `src/engine/path.test.ts` |
| Committed path cannot be extended | `src/engine/path.test.ts` |
| Full coverage solves | `src/engine/win.test.ts` |
| Uncovered free cell prevents solving | `src/engine/win.test.ts` |
| Unconnected pair prevents solving | `src/engine/win.test.ts` |
| Hazard terrain exempt from coverage | `src/engine/win.test.ts` |
| Undo restores pre-action state | `src/sim/game.test.ts`, `src/engine/property.test.ts` |
| Undo on empty history is a no-op | `src/sim/game.test.ts`, `src/engine/serialize.test.ts` |
| Replay yields identical state | `src/sim/game.test.ts` |

## turn-resolution

| Scenario | Coverage |
| --- | --- |
| Element effect resolves before hazard | `src/sim/resolve.test.ts` |
| Guard runs last | `src/sim/resolve.test.ts` |
| Fire burns thorns | `src/sim/effects.test.ts` |
| Water cools lava to stone | `src/sim/effects.test.ts` |
| Earth fills a pit | `src/sim/effects.test.ts` |
| Air pushes a rune endpoint | `src/sim/effects.test.ts` |
| Effect never alters a committed path | `src/sim/effects.test.ts` |
| Mutation record is serializable | `src/sim/mutations.test.ts` |
| Mutation applies atomically | `src/sim/mutations.test.ts` |
| Next scripted hazard consumed | `src/sim/hazard.test.ts`, `src/sim/resolve.test.ts` |
| Exhausted script is a no-op | `src/sim/hazard.test.ts`, `src/sim/resolve.test.ts` |
| Mutation breaking solvability discarded | `src/sim/resolve.test.ts` |
| Mutation preserving solvability applied | `src/sim/resolve.test.ts` |
| Guard timeout conservatively rejected | `src/sim/resolve.test.ts` |
| Event stream complete and ordered | `src/sim/resolve.test.ts` |
| Rejected hazard visible to consumers | `src/sim/resolve.test.ts` |
| Repeated resolution matches | `src/sim/resolve.test.ts` |

## level-content

| Scenario | Coverage |
| --- | --- |
| Level declares everything needed | `src/content/schema.test.ts` |
| Level is pure data | Level JSON + `src/content/loader.test.ts` |
| Malformed endpoint rejected | `src/content/schema.test.ts` |
| Incomplete pair rejected | `src/content/schema.test.ts` |
| Unsupported mutation rejected | `src/content/schema.test.ts` |
| Sustainable level passes | `src/content/validator.test.ts` |
| Hazard strands the board | `src/content/validator.test.ts` |
| No initial solution fails | `src/content/validator.test.ts` |
| Validator and engine agree | `src/content/agreement.test.ts` |
| CI blocks an invalid level | `bun run validate:levels` (verified: exits 1, names level) |
| Runtime rejects an invalid level | `src/content/loader.test.ts` |
| Slow level fails instead of hanging | `src/content/validator.test.ts` |

## board-rendering

| Scenario | Coverage |
| --- | --- |
| Board layers share one surface | `src/render/BoardCanvas.tsx` + manual checklist |
| Trail follows cell centres | Manual checklist (board rendering) |
| Trail uses the element colour | `src/render/palette.ts` + manual checklist |
| Committed paths remain visible | `src/render/BoardCanvas.tsx` + manual checklist |
| Invalid move does not extend | `src/engine/path.test.ts` + worklet logic + manual |
| Trace begins only at unconnected rune | `src/engine/path.test.ts` + worklet logic + manual |
| Releasing ends the trace | `src/render/BoardCanvas.tsx` `onEnd` + manual |
| Tracing does not re-render the tree | Store updates only on commit; React profiler manual check |
| Frame rate holds on a supported device | Manual checklist (performance) |
| Board fits without distortion | `src/render/layout.test.ts` |
| Hit testing matches visuals | `src/render/layout.test.ts` |
| Blocked terrain distinguishable | `src/render/BoardCanvas.tsx` styles + manual checklist |
| Completed connection acknowledged | `src/render/BoardCanvas.tsx` committed path + completion panel |
| Rejected hazard conveyed | `src/app/index.tsx` feedback text + `src/sim/resolve.test.ts` |
| Wind push slides cells | `src/render/BoardCanvas.tsx` row animation + manual checklist |
| Rejected mutation does not move cells | `src/sim/resolve.test.ts` + `src/render/BoardCanvas.tsx` shake |
| Tracing during hazard animation | `src/render/BoardCanvas.tsx` independent shared values + manual |

## game-session

| Scenario | Coverage |
| --- | --- |
| First launch starts at the first level | `src/state/sessionLogic.test.ts` |
| Returning player resumes progression | `src/state/sessionLogic.test.ts` |
| Completed levels are replayable | `src/state/sessionLogic.test.ts`, `src/state/store.ts` |
| Progress updates after a connection | `src/state/sessionLogic.test.ts` |
| Undo available during play | `src/state/sessionLogic.test.ts` |
| Undo disabled with no history | `src/state/sessionLogic.test.ts` |
| Solving presents completion | `src/app/index.tsx` + `src/state/store.ts` |
| Next level unlocks | `src/state/sessionLogic.test.ts` |
| Completion recorded once | `src/state/sessionLogic.test.ts`, `src/platform/progressStore.test.ts` |
| Progress survives restart | `src/platform/progressStore.test.ts` |
| Play works offline | Manual checklist (session and persistence) |
| Corrupt progress resets safely | `src/platform/progressStore.test.ts` |
| Connection produces a light impact | `src/platform/haptics.ts`, `src/state/store.ts` + manual |
| Solving produces a success notification | `src/platform/haptics.ts`, `src/state/store.ts` + manual |
| Haptics respect the disable toggle | `src/platform/progressStore.test.ts` + manual |

## Outstanding manual checks

Device-only checks (frame rate, gesture feel, visual distinction, haptics,
offline play, native builds, both-platform play-through) are listed in
`docs/device-checklist.md` and are not yet verified.
