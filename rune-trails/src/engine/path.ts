import {
  areOrthogonallyAdjacent,
  cloneBoard,
  isConnectedPair,
  isTraversable,
  pairEndpoints,
} from "./board";
import {
  BoardState,
  EngineError,
  Element,
  NO_PAIR,
} from "./types";

export interface Trace {
  pairId: number;
  element: Element;
  cells: number[];
}

export function startTrace(state: BoardState, index: number): Trace | null {
  if (index < 0 || index >= state.cells.length) return null;
  const pairId = state.pairOf[index];
  if (pairId === NO_PAIR) return null;
  if (isConnectedPair(state, pairId)) return null;
  if (state.cells[index] === "covered") return null;
  const elementCode = state.element[index];
  const element = elementFromCode(elementCode);
  if (!element) return null;
  return { pairId, element, cells: [index] };
}

function elementFromCode(code: number): Element | undefined {
  if (code === 1) return "fire";
  if (code === 2) return "water";
  if (code === 3) return "earth";
  if (code === 4) return "air";
  return undefined;
}

function isOccupiedByCommittedPath(state: BoardState, index: number): boolean {
  for (const id of Object.keys(state.paths)) {
    if (state.paths[Number(id)].includes(index)) return true;
  }
  return false;
}

/**
 * Extends a trace towards `target`. Invalid moves leave the trace unchanged.
 * Moving onto the immediately previous cell backtracks.
 */
export function extendTrace(
  state: BoardState,
  trace: Trace,
  target: number,
): Trace {
  const cells = trace.cells;
  const head = cells[cells.length - 1];
  if (target < 0 || target >= state.cells.length) return trace;
  if (!areOrthogonallyAdjacent(state.w, head, target)) return trace;
  if (!isInBoundsIndex(state, target)) return trace;

  if (cells.length >= 2 && cells[cells.length - 2] === target) {
    return { ...trace, cells: cells.slice(0, -1) };
  }

  if (cells.includes(target)) return trace;
  if (isOccupiedByCommittedPath(state, target)) return trace;

  const kind = state.cells[target];
  if (!isTraversable(kind)) return trace;

  if (kind === "rune") {
    const targetPair = state.pairOf[target];
    if (targetPair !== trace.pairId) return trace;
  }

  return { ...trace, cells: [...cells, target] };
}

function isInBoundsIndex(state: BoardState, index: number): boolean {
  return index >= 0 && index < state.cells.length;
}

export interface PathValidation {
  ok: boolean;
  reason?: string;
}

export function validateConnectionPath(
  state: BoardState,
  pairId: number,
  path: number[],
): PathValidation {
  if (isConnectedPair(state, pairId)) {
    return { ok: false, reason: "pair already connected" };
  }
  if (path.length < 2) {
    return { ok: false, reason: "path must contain both endpoints" };
  }
  const endpoints = pairEndpoints(state, pairId);
  if (endpoints.length !== 2) {
    return { ok: false, reason: `pair ${pairId} does not have two endpoints` };
  }

  const first = path[0];
  const last = path[path.length - 1];
  const startsAtEndpoint =
    (first === endpoints[0] && last === endpoints[1]) ||
    (first === endpoints[1] && last === endpoints[0]);
  if (!startsAtEndpoint) {
    return { ok: false, reason: "path must run between the pair's two endpoints" };
  }

  const seen = new Set<number>();
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    if (cell < 0 || cell >= state.cells.length) {
      return { ok: false, reason: `cell ${cell} is out of bounds` };
    }
    if (seen.has(cell)) {
      return { ok: false, reason: `path revisits cell ${cell}` };
    }
    seen.add(cell);
    if (i > 0 && !areOrthogonallyAdjacent(state.w, path[i - 1], cell)) {
      return { ok: false, reason: `cells ${path[i - 1]} and ${cell} are not adjacent` };
    }
    const kind = state.cells[cell];
    if (!isTraversable(kind)) {
      return { ok: false, reason: `cell ${cell} is not traversable` };
    }
    if (kind === "rune" && state.pairOf[cell] !== pairId) {
      return { ok: false, reason: `cell ${cell} belongs to another pair` };
    }
    if (isOccupiedByCommittedPath(state, cell)) {
      return { ok: false, reason: `cell ${cell} is occupied by another path` };
    }
  }
  return { ok: true };
}

export function commitConnection(
  state: BoardState,
  pairId: number,
  path: number[],
): BoardState {
  const validation = validateConnectionPath(state, pairId, path);
  if (!validation.ok) {
    throw new EngineError("invalid-path", validation.reason ?? "invalid path");
  }
  const next = cloneBoard(state);
  for (const cell of path) {
    next.cells[cell] = "covered";
  }
  next.paths[pairId] = path.slice();
  next.connected = [...next.connected, pairId];
  next.order = [...next.order, pairId];
  next.moveIndex += 1;
  return next;
}

export function isConnectionComplete(state: BoardState, trace: Trace): boolean {
  if (trace.cells.length < 2) return false;
  const endpoints = pairEndpoints(state, trace.pairId);
  const last = trace.cells[trace.cells.length - 1];
  const first = trace.cells[0];
  return (
    endpoints.length === 2 &&
    endpoints.includes(last) &&
    endpoints.includes(first) &&
    last !== first
  );
}

