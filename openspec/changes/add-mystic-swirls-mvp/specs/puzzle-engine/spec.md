# Spec Delta

## Purpose

Defines the rules of a Mystic Swirls level — grid and terrain, elemental rune pairs, orthogonal path tracing, connection completion, win condition, and undo — independent of how the board is rendered.

## ADDED Requirements

### Requirement: Grid and terrain model

The system SHALL represent a level as a fixed-width, fixed-height grid where every cell has exactly one kind: `free`, `rune`, `pit`, `lava`, `thorn`, `stone`, or `covered`. Coordinates outside the grid SHALL be rejected.

#### Scenario: Level exposes its dimensions and terrain

- **WHEN** a level is loaded
- **THEN** each cell reports its kind and, for rune cells, its pair and element
- **AND** no cell has more than one kind

#### Scenario: Out-of-bounds cell access is rejected

- **WHEN** an action targets a cell outside the grid bounds
- **THEN** the action is rejected and the board state is unchanged

### Requirement: Orthogonal path tracing

A path SHALL extend only from its current head to an orthogonally adjacent cell (up, down, left, right). Diagonal moves SHALL be rejected.

#### Scenario: Orthogonal step is accepted

- **WHEN** the player moves from the path head to an adjacent cell sharing an edge
- **THEN** the path extends by one cell

#### Scenario: Diagonal step is rejected

- **WHEN** the player moves from the path head to a diagonally adjacent cell
- **THEN** the path is unchanged

### Requirement: Path ownership and traversal restrictions

A path SHALL begin at the first endpoint of a rune pair and SHALL end only at that pair's matching endpoint. Paths SHALL NOT enter another pair's rune cells, SHALL NOT share or cross a cell used by another path, and SHALL NOT pass through `pit`, `lava`, `thorn`, or `stone` cells.

#### Scenario: Entering another pair's rune is rejected

- **WHEN** a path head attempts to enter a rune cell belonging to a different pair
- **THEN** the move is rejected and the path is unchanged

#### Scenario: Crossing an existing path is rejected

- **WHEN** a path head attempts to enter a cell occupied by another path
- **THEN** the move is rejected and the path is unchanged

#### Scenario: Blocked terrain is impassable

- **WHEN** a path head attempts to enter a cell whose kind is `pit`, `lava`, `thorn`, or `stone`
- **THEN** the move is rejected and the path is unchanged

#### Scenario: A path may backtrack over itself

- **WHEN** the player moves the path head onto the immediately preceding cell of the same path
- **THEN** the last step is removed and the path shortens by one cell

### Requirement: Connection completion

When a path reaches its matching endpoint, the system SHALL mark the pair connected, commit the path, and mark every cell on it as `covered`.

#### Scenario: Reaching the matching endpoint completes the pair

- **WHEN** a path reaches the second endpoint of its own pair
- **THEN** the pair becomes connected
- **AND** all cells on that path become `covered`
- **AND** the connected-pair count increases by one

#### Scenario: A committed path cannot be extended

- **WHEN** the player attempts to trace from a connected pair
- **THEN** no new trace begins for that pair unless the connection is undone

### Requirement: Win condition

A level SHALL be solved when every rune pair is connected and every `free` or `rune` cell is covered by a committed path. `pit`, `lava`, `thorn`, `stone`, and `covered` cells SHALL NOT be counted as uncovered.

#### Scenario: All pairs connected with full coverage solves the level

- **WHEN** every pair is connected and no `free` or `rune` cell remains uncovered
- **THEN** the level reports solved

#### Scenario: An uncovered free cell prevents solving

- **WHEN** every pair is connected but at least one `free` cell is uncovered
- **THEN** the level does not report solved

#### Scenario: An unconnected pair prevents solving

- **WHEN** every cell is covered but at least one pair is unconnected
- **THEN** the level does not report solved

#### Scenario: Hazard terrain is exempt from coverage

- **WHEN** every pair is connected and the only uncovered cells are `pit`, `lava`, `thorn`, or `stone`
- **THEN** the level reports solved

### Requirement: Undo

The system SHALL allow undoing the most recent committed action and restore the exact prior board state, including any element effects and hazard mutations applied by that action.

#### Scenario: Undo restores the pre-action state

- **WHEN** the player undoes an action that committed a path and triggered a hazard
- **THEN** the path, terrain, rune positions, and connected-pair set all match the state before that action

#### Scenario: Undo on an empty history is a no-op

- **WHEN** the player requests undo with no committed actions
- **THEN** the board state is unchanged

### Requirement: Deterministic state reproduction

The system SHALL produce an identical board state when replaying the same initial level, the same hazard script, and the same sequence of player actions.

#### Scenario: Replay yields identical state

- **WHEN** a recorded action sequence is replayed against the same level and hazard script
- **THEN** the resulting board state, connected-pair set, and completion order are identical to the original run
