# Spec Delta

## Purpose

Defines the player's session flow around a level: loading and resuming, the in-play HUD, completion and advancing, and durable progress that survives app restarts.

## ADDED Requirements

### Requirement: Level start and resume

The session SHALL open the earliest unsolved level by default and SHALL allow selecting any previously unlocked level.

#### Scenario: First launch starts at the first level

- **WHEN** the app opens with no saved progress
- **THEN** the first level is loaded and playable

#### Scenario: Returning player resumes progression

- **WHEN** the app opens with saved progress
- **THEN** the earliest unsolved, unlocked level is offered

#### Scenario: Completed levels are replayable

- **WHEN** the player selects a previously completed level
- **THEN** that level starts from its initial state without altering saved progress on load

### Requirement: In-play HUD

The session SHALL show the current level, connected-pair progress, and an undo control. The HUD SHALL reflect state after every committed action.

#### Scenario: Progress updates after a connection

- **WHEN** a pair is connected
- **THEN** the connected-pair indicator updates before the next action can be taken

#### Scenario: Undo is available during play

- **WHEN** at least one action has been committed
- **THEN** the undo control is enabled and reverts the last action

#### Scenario: Undo is disabled with no history

- **WHEN** no action has been committed in the current attempt
- **THEN** the undo control is disabled

### Requirement: Level completion and advance

When the engine reports the level solved, the session SHALL present a completion state and unlock the next level.

#### Scenario: Solving presents completion

- **WHEN** the last required connection completes the level
- **THEN** the session presents a completion state and stops accepting board input

#### Scenario: Next level unlocks

- **WHEN** a level is completed for the first time
- **THEN** the following level becomes selectable

#### Scenario: Completion is recorded once

- **WHEN** an already-completed level is completed again
- **THEN** progress is unchanged and no duplicate completion is recorded

### Requirement: Durable progress

The session SHALL persist completed-level progress locally and SHALL restore it across app restarts and offline launches.

#### Scenario: Progress survives restart

- **WHEN** the player completes a level and restarts the app
- **THEN** that level is still marked complete and the next level remains unlocked

#### Scenario: Play works offline

- **WHEN** the device has no network connection
- **THEN** all levels and progress remain available

### Requirement: Safe recovery from unreadable progress

If persisted progress cannot be read or is structurally invalid, the session SHALL start from a clean default state without crashing and without deleting unrelated local data.

#### Scenario: Corrupt progress resets safely

- **WHEN** persisted progress is unreadable or invalid
- **THEN** the app opens at the first level with no crash
- **AND** subsequent completion writes valid progress
