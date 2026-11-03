import { cloneBoard, isBlockedTerrain } from "./board";
import {
  BoardState,
  CellKind,
  CellPoint,
  MutationRecord,
  NO_PAIR,
  TerrainKind,
} from "./types";

export interface MutationValidation {
  ok: boolean;
  reason?: string;
}

function toIndex(state: BoardState, point: CellPoint): number {
  if (
    !point ||
    !Number.isInteger(point.x) ||
    !Number.isInteger(point.y) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x >= state.w ||
    point.y >= state.h
  ) {
    return -1;
  }
  return point.y * state.w + point.x;
}

function isCommittedPathCell(state: BoardState, index: number): boolean {
  if (state.cells[index] === "covered") return true;
  for (const id of Object.keys(state.paths)) {
    if (state.paths[Number(id)].includes(index)) return true;
  }
  return false;
}

export function validateMutation(
  state: BoardState,
  mutation: MutationRecord,
): MutationValidation {
  switch (mutation.kind) {
    case "shift-row": {
      if (!Number.isInteger(mutation.row) || mutation.row < 0 || mutation.row >= state.h) {
        return { ok: false, reason: `row ${mutation.row} is out of bounds` };
      }
      if (mutation.dx !== -1 && mutation.dx !== 1) {
        return { ok: false, reason: `dx ${mutation.dx} must be -1 or 1` };
      }
      const edgeX = mutation.dx === 1 ? state.w - 1 : 0;
      for (let x = 0; x < state.w; x += 1) {
        const index = mutation.row * state.w + x;
        if (isCommittedPathCell(state, index)) {
          return {
            ok: false,
            reason: `row ${mutation.row} contains a cell committed to a path`,
          };
        }
      }
      const edge = mutation.row * state.w + edgeX;
      if (state.cells[edge] !== "free") {
        return {
          ok: false,
          reason: `cell (${edgeX},${mutation.row}) would be pushed off the board`,
        };
      }
      return { ok: true };
    }
    case "spread": {
      const from = toIndex(state, mutation.from);
      const to = toIndex(state, mutation.to);
      if (from < 0) return { ok: false, reason: "spread source is out of bounds" };
      if (to < 0) return { ok: false, reason: "spread target is out of bounds" };
      if (!isBlockedTerrain(state.cells[from])) {
        return { ok: false, reason: "spread source must be hazard terrain" };
      }
      if (state.cells[to] !== "free") {
        return { ok: false, reason: "spread target must be a free cell" };
      }
      if (isCommittedPathCell(state, to)) {
        return { ok: false, reason: "spread target belongs to a committed path" };
      }
      return { ok: true };
    }
    case "grow": {
      const cell = toIndex(state, mutation.cell);
      if (cell < 0) return { ok: false, reason: "grow target is out of bounds" };
      if (state.cells[cell] !== "free") {
        return { ok: false, reason: "grow target must be a free cell" };
      }
      if (isCommittedPathCell(state, cell)) {
        return { ok: false, reason: "grow target belongs to a committed path" };
      }
      return { ok: true };
    }
    default:
      return { ok: false, reason: "unknown mutation kind" };
  }
}

const GROW_KIND: TerrainKind = "thorn";

/**
 * Applies a mutation to a clone of the state. Callers must validate first;
 * invalid mutations throw so they can never be partially applied.
 */
export function applyMutation(state: BoardState, mutation: MutationRecord): BoardState {
  const validation = validateMutation(state, mutation);
  if (!validation.ok) {
    throw new Error(`illegal mutation: ${validation.reason}`);
  }
  const next = cloneBoard(state);

  switch (mutation.kind) {
    case "shift-row": {
      const { row, dx } = mutation;
      const kinds: CellKind[] = [];
      const pairs: number[] = [];
      const elements: number[] = [];
      for (let x = 0; x < state.w; x += 1) {
        const src = row * state.w + x;
        kinds.push(state.cells[src]);
        pairs.push(state.pairOf[src]);
        elements.push(state.element[src]);
      }
      for (let x = 0; x < state.w; x += 1) {
        const srcX = x - dx;
        const dst = row * state.w + x;
        if (srcX < 0 || srcX >= state.w) {
          next.cells[dst] = "free";
          next.pairOf[dst] = NO_PAIR;
          next.element[dst] = 0;
        } else {
          next.cells[dst] = kinds[srcX];
          next.pairOf[dst] = pairs[srcX];
          next.element[dst] = elements[srcX];
        }
      }
      return next;
    }
    case "spread": {
      const from = toIndex(state, mutation.from);
      const to = toIndex(state, mutation.to);
      next.cells[to] = state.cells[from];
      next.pairOf[to] = NO_PAIR;
      next.element[to] = 0;
      return next;
    }
    case "grow": {
      const cell = toIndex(state, mutation.cell);
      next.cells[cell] = GROW_KIND;
      next.pairOf[cell] = NO_PAIR;
      next.element[cell] = 0;
      return next;
    }
    default:
      return next;
  }
}
