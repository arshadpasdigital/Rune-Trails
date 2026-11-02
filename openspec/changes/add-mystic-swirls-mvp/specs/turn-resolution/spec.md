# Spec Delta

## Purpose

Defines how a completed connection resolves into a turn: elemental board effects, scripted hazard mutations, the solvability guard, and the ordered events emitted to the rest of the application.

## ADDED Requirements

### Requirement: Turn resolution order

A turn SHALL resolve in a fixed order: commit the connection, apply the path's element effect, apply the hazard mutation, then run the solvability guard. No step SHALL observe a later step's result.

#### Scenario: Element effect resolves before the hazard

- **WHEN** a completed fire path and a thorn-regrowth hazard both affect the same cell
- **THEN** the thorn is burned by the element effect before the hazard step runs
- **AND** the ordered event stream shows the element effect event before the hazard event

#### Scenario: Guard runs last

- **WHEN** a turn applies an element effect and a hazard mutation
- **THEN** the solvability guard evaluates the board after both have been applied

### Requirement: Elemental path effects

The element of a completed path SHALL apply exactly one board effect: `fire` converts `thorn` to `free`, `water` converts `lava` to `stone`, `earth` converts `pit` to `free`, and `air` pushes one adjacent unconnected rune endpoint by one cell into a `free` cell. Effects SHALL NOT modify cells belonging to a committed path.

#### Scenario: Fire burns thorns

- **WHEN** a fire path completes and a thorn cell is adjacent to the path
- **THEN** that thorn cell becomes `free`

#### Scenario: Water cools lava into stone

- **WHEN** a water path completes and a lava cell is adjacent to the path
- **THEN** that lava cell becomes `stone`

#### Scenario: Earth fills a pit

- **WHEN** an earth path completes and a pit cell is adjacent to the path
- **THEN** that pit cell becomes `free`

#### Scenario: Air pushes a rune endpoint

- **WHEN** an air path completes and an unconnected rune endpoint can move one cell into a `free` cell
- **THEN** that rune endpoint moves one cell
- **AND** any in-progress path attached to it is cleared

#### Scenario: Effect never alters a committed path

- **WHEN** an element effect's target cell would be part of a committed path
- **THEN** the effect does not apply to that cell

### Requirement: Hazard mutation model

Hazards SHALL be expressed as inert, serializable mutation records naming a kind and its target cells, and SHALL be applied atomically. Supported kinds for this release are `shift-row`, `spread`, and `grow`.

#### Scenario: Mutation record is serializable

- **WHEN** a hazard mutation is produced
- **THEN** it can be serialized to JSON and deserialized without loss
- **AND** applying it produces the same result as applying the original

#### Scenario: Mutation applies atomically

- **WHEN** a mutation targets multiple cells and one target is invalid
- **THEN** none of the mutation's changes are applied

### Requirement: Scripted hazard source

A level SHALL provide a hazard script consumed one entry per completed connection. When no scripted entry remains, the turn SHALL resolve with no hazard mutation. The hazard source SHALL be replaceable without changing turn-resolution behavior.

#### Scenario: Next scripted hazard is consumed

- **WHEN** a connection completes and the hazard script has a next entry
- **THEN** that entry's mutation is attempted for the turn

#### Scenario: Exhausted script performs no mutation

- **WHEN** a connection completes and the hazard script has no remaining entries
- **THEN** the turn resolves with no hazard mutation and no error

### Requirement: Solvability guard

After the element effect and hazard mutation are applied, the system SHALL verify that at least one solution still exists from the resulting state. If the mutation would leave no solution, the mutation SHALL be discarded and the guard SHALL record a rejection event.

#### Scenario: Mutation that breaks solvability is discarded

- **WHEN** a hazard mutation would make the remaining pairs impossible to route
- **THEN** the mutation is not applied
- **AND** the board retains the state after the element effect
- **AND** a hazard-rejected event is emitted

#### Scenario: Mutation that preserves solvability is applied

- **WHEN** a hazard mutation leaves at least one solution
- **THEN** the mutation is applied and a hazard-applied event is emitted

### Requirement: Ordered event emission

Each turn SHALL emit an ordered, serializable event stream sufficient to drive rendering, animation, and replay, covering connection commit, element effect, hazard application or rejection, and level solved.

#### Scenario: Event stream is complete and ordered

- **WHEN** a turn completes a pair, applies an element effect, and applies a hazard
- **THEN** the emitted events are, in order: connection committed, element effect applied, hazard applied
- **AND** if the level is solved, a level-solved event follows last

#### Scenario: Rejected hazard is visible to consumers

- **WHEN** the guard discards a mutation
- **THEN** a hazard-rejected event naming the mutation appears in the stream

### Requirement: Deterministic resolution

Given the same pre-turn state, script position, and move index, turn resolution SHALL produce the same resulting state and event stream.

#### Scenario: Repeated resolution matches

- **WHEN** the same pre-turn state and script position are resolved twice
- **THEN** both runs produce identical state and identical event sequences
