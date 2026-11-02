# Spec Delta

## Purpose

Defines what the player sees and how tracing feels: a single GPU-rendered board surface, elemental glowing trails, finger-driven path tracing, and the interaction performance the game must sustain.

## ADDED Requirements

### Requirement: Single board surface

All board visuals — terrain, runes, committed paths, the in-progress trail, and completion effects — SHALL be drawn on one rendering surface for the playable board. HUD and menus SHALL remain outside that surface.

#### Scenario: Board layers share one surface

- **WHEN** a level is displayed
- **THEN** grid, terrain, runes, committed paths, and the active trail are drawn on the same canvas
- **AND** HUD elements are drawn by the normal UI layer, not the board canvas

### Requirement: Elemental glowing trail

The active path SHALL be rendered as a continuous glowing trail in its pair's element colour, snapped to cell centres, with no gaps between consecutive cells. A glow layer SHALL surround the trail core.

#### Scenario: Trail follows cell centres

- **WHEN** the player traces across three orthogonally adjacent cells
- **THEN** the trail passes through those cells' centres in order with no visible gap

#### Scenario: Trail uses the element colour

- **WHEN** the player traces from a fire rune
- **THEN** the trail core and glow use the fire palette

#### Scenario: Committed paths remain visible

- **WHEN** a pair is connected
- **THEN** its path remains rendered with the same elemental styling while the player traces another pair

### Requirement: Trace interaction

Tracing SHALL follow the pointer along orthogonally adjacent cells and SHALL NOT extend the path on invalid moves. Starting a trace SHALL require beginning on an unconnected rune endpoint.

#### Scenario: Invalid move does not extend the path

- **WHEN** the pointer moves diagonally or over a blocked or occupied cell during a trace
- **THEN** the rendered path does not extend
- **AND** the trace remains active at its previous head

#### Scenario: Trace begins only at an unconnected rune

- **WHEN** the player begins a gesture on a cell that is not an unconnected rune endpoint
- **THEN** no path tracing starts

#### Scenario: Releasing ends the trace

- **WHEN** the player lifts their finger
- **THEN** an incomplete path is cleared and a completed path is committed to game state

### Requirement: Interaction frame budget

During tracing, the board SHALL sustain the device's display refresh rate with a 60 frames-per-second floor on supported devices. Pointer movement SHALL NOT trigger React re-renders or state-store updates.

#### Scenario: Tracing does not re-render the React tree

- **WHEN** the pointer moves continuously across cells
- **THEN** no React component re-render occurs for individual pointer samples
- **AND** game state updates only on discrete events such as path commit

#### Scenario: Frame rate holds on a supported device

- **WHEN** tracing continuously on a supported device
- **THEN** the measured frame rate remains at or above 60 frames per second

### Requirement: Board layout and hit testing

The board SHALL scale to the available play area while preserving its aspect ratio and device-pixel resolution. Hit testing SHALL map pointer positions to the same cells the player sees.

#### Scenario: Board fits without distortion

- **WHEN** the play area has a different aspect ratio than the grid
- **THEN** the board scales uniformly and remains fully visible

#### Scenario: Hit testing matches visuals

- **WHEN** the player touches the centre of a rendered cell
- **THEN** the traced path targets exactly that cell

### Requirement: Visual state feedback

The board SHALL distinguish blocked terrain from traversable cells, highlight the endpoints of an active pair, and visibly indicate when a connection completes.

#### Scenario: Blocked terrain is distinguishable

- **WHEN** a level contains `pit`, `lava`, `thorn`, or `stone` cells
- **THEN** each is rendered with an appearance distinct from traversable free cells

#### Scenario: Completed connection is acknowledged

- **WHEN** a pair is connected
- **THEN** the board plays a visible completion indication for that pair

#### Scenario: Rejected hazard is conveyed

- **WHEN** the turn-resolution guard rejects a hazard mutation
- **THEN** the board shows that no environmental change occurred for that turn
