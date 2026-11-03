# Device Checklist

These checks require a physical device or simulator and are not covered by the
headless test suite. Run them on the lowest supported Android device and on an
iOS device before shipping.

## Rendering

- [ ] Each terrain kind is visually distinct: `pit` (dark well), `lava` (warm
      glow), `thorn` (brown), `stone` (grey), versus `free`.
- [ ] Committed paths remain visible while tracing another pair, each in its
      element colour.
- [ ] A three-cell trace shows no visible gap and uses the starting rune's
      palette for the core and glow.
- [ ] Touching the centre of a rendered cell targets exactly that cell; the
      board scales uniformly in both portrait and landscape-ish play areas.
- [ ] Starting a gesture on a non-rune cell starts no trace. A diagonal or
      blocked move does not extend the trail.
- [ ] Lifting the finger clears an incomplete trace and commits a completed one.
- [ ] Gesture does not fight a parent scroll container.

## Hazard animation

- [ ] An accepted `shift-row` visibly slides the affected row from its old
      position to the new one.
- [ ] A rejected mutation plays the brief shake/dim indication and no cell
      moves.
- [ ] Beginning a new trace during a hazard animation starts immediately
      without waiting, and the frame rate stays at or above 60 fps.

## Performance

- [ ] Sustained tracing holds at or above 60 fps on the lowest target Android
      device (record the device model and measured rate).
- [ ] If the rate drops, confirm the reduced glow tier is selected
      (`selectGlowTier(totalMemoryMb)`) and re-measure.
- [ ] React DevTools / React Native profiler shows no re-renders per pointer
      sample; only path commits update the store.

## Session and persistence

- [ ] First launch starts at level 1.
- [ ] Completing a level unlocks the next one; repeating a completed level does
      not duplicate progress.
- [ ] Closing and reopening the app restores completed levels and the next
      unlocked level.
- [ ] Airplane mode: level load, completion, and restart persistence all work.
- [ ] Light impact fires on a pair connection and a success notification on
      solve.
- [ ] Disabling haptics suppresses both and the preference survives a restart.
- [ ] Corrupt/older progress starts cleanly at level 1 without crashing.

## Integration play-through

Play the first three shipped levels end to end on both platforms, covering:
trace, hazard mutation, guard rejection, undo, completion, and app restart.
Record the platform, device, and result for each level.

## Native builds

- [ ] `npx expo prebuild` succeeds.
- [ ] `npx expo run:android` installs and launches the development build.
- [ ] `npx expo run:ios` installs and launches the development build (macOS).
