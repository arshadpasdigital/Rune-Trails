# Spec Delta

## Purpose

Defines the authoring format for levels and the validation that must pass before a level can ship, guaranteeing that every state reachable under its hazard script is still solvable.

## ADDED Requirements

### Requirement: Level document format

A level SHALL be a declarative document declaring its dimensions, rune pairs, initial terrain, and an ordered hazard script with one entry per completed connection. The document SHALL NOT contain executable code.

#### Scenario: Level declares everything needed to play

- **WHEN** a level document is read
- **THEN** it provides width, height, every rune's pair identifier, element, and two endpoint positions, every non-free terrain cell, and the ordered hazard script

#### Scenario: Level is pure data

- **WHEN** a level document is loaded
- **THEN** it can be parsed as JSON without evaluating any expressions or code

### Requirement: Level document validation

The system SHALL reject a level document that has out-of-bounds coordinates, a pair without exactly two endpoints, duplicate pair identifiers, runes on non-free cells, or a hazard script entry that does not match a supported mutation kind.

#### Scenario: Malformed endpoint is rejected

- **WHEN** a level places a rune endpoint outside the grid
- **THEN** validation fails and the reason identifies the offending cell

#### Scenario: Incomplete pair is rejected

- **WHEN** a pair identifier appears on exactly one rune
- **THEN** validation fails and identifies the pair

#### Scenario: Unsupported mutation is rejected

- **WHEN** a hazard script entry names an unknown mutation kind
- **THEN** validation fails and identifies the script index

### Requirement: Solvability validation

The system SHALL validate that, from every state reachable by following the level's hazard script, at least one solution exists. A level that has any reachable unsolvable state SHALL be rejected and SHALL NOT be shipped.

#### Scenario: Sustainable level passes

- **WHEN** every state reachable under the level's script admits at least one solution
- **THEN** the level passes validation

#### Scenario: Level whose hazard strands the board fails

- **WHEN** a hazard entry leaves free cells unreachable by any remaining path
- **THEN** the level fails validation and the failing state and script index are reported

#### Scenario: Level with no initial solution fails

- **WHEN** the initial board admits no solution
- **THEN** the level fails validation before any hazard is considered

### Requirement: Shared win and traversal semantics

Validation SHALL use the same win condition and traversal restrictions as the puzzle engine, including exempting `pit`, `lava`, `thorn`, and `stone` from coverage and treating them as impassable.

#### Scenario: Validator and engine agree on a state

- **WHEN** validation evaluates a board state
- **THEN** it applies the same coverage and traversal rules as the engine
- **AND** a state the engine reports solved is reported solved by validation

### Requirement: Validation gates shipping

Validation SHALL run as a non-interactive command in continuous integration and SHALL fail the build when any shipped level fails. The same validation logic SHALL be reusable by the runtime loader.

#### Scenario: CI blocks an invalid level

- **WHEN** a shipped level fails validation
- **THEN** the continuous-integration command exits non-zero and names the level

#### Scenario: Runtime rejects an invalid level

- **WHEN** the runtime loader encounters a level that fails validation
- **THEN** the level is not offered for play and the failure is reported without crashing the app

### Requirement: Validation completes within a budget

Validation of a shipped level set SHALL complete within a bounded time so it can gate continuous integration.The per-level search budget SHALL be 5000 milliseconds by default, configurable for local authoring. A level exceeding its per-level budget SHALL fail validation rather than block indefinitely, reporting the level name, the failing state, and the script index.

#### Scenario: Slow level fails instead of hanging

- **WHEN** validating a level exceeds its configured search budget of 5000 ms
- **THEN** validation reports the level as failed with a budget-exceeded reason
- **AND** the report names the level and the script index at which the budget was exhausted
