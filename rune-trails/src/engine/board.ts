import {
  BoardState,
  CellPoint,
  Element,
  ELEMENT_CODE,
  EngineError,
  NO_PAIR,
  PairSpec,
  TerrainSpec,
} from "./types";

export interface BoardSpec {
  w: number;
  h: number;
  pairs: PairSpec[];
  terrain?: TerrainSpec[];
}

export function isInBounds(w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h;
}

export function cellIndex(w: number, h: number, x: number, y: number): number {
  if (!isInBounds(w, h, x, y)) return -1;
  return y * w + x;
}

export function pointOf(w: number, index: number): CellPoint {
  return { x: index % w, y: Math.floor(index / w) };
}

export function neighborsOf(w: number, h: number, index: number): number[] {
  const x = index % w;
  const y = Math.floor(index / w);
  const result: number[] = [];
  if (y > 0) result.push(index - w);
  if (x > 0) result.push(index - 1);
  if (y < h - 1) result.push(index + w);
  if (x < w - 1) result.push(index + 1);
  return result;
}

export function areOrthogonallyAdjacent(w: number, a: number, b: number): boolean {
  const ax = a % w;
  const ay = Math.floor(a / w);
  const bx = b % w;
  const by = Math.floor(b / w);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

export function createBoard(spec: BoardSpec): BoardState {
  const { w, h } = spec;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
    throw new EngineError("dimensions", "board dimensions must be positive integers");
  }

  const cells: BoardState["cells"] = new Array(w * h).fill("free");
  const pairOf = new Int16Array(w * h).fill(NO_PAIR);
  const element = new Uint8Array(w * h);

  const pairIds = new Set<number>();
  for (const pair of spec.pairs) {
    if (pairIds.has(pair.id)) {
      throw new EngineError("duplicate-pair", `duplicate pair id ${pair.id}`);
    }
    pairIds.add(pair.id);
    for (const endpoint of pair.endpoints) {
      const index = cellIndex(w, h, endpoint.x, endpoint.y);
      if (index < 0) {
        throw new EngineError(
          "out-of-bounds",
          `pair ${pair.id} endpoint (${endpoint.x},${endpoint.y}) is out of bounds`,
        );
      }
      if (cells[index] !== "free") {
        throw new EngineError(
          "occupied-cell",
          `pair ${pair.id} endpoint (${endpoint.x},${endpoint.y}) is not a free cell`,
        );
      }
      cells[index] = "rune";
      pairOf[index] = pair.id;
      element[index] = ELEMENT_CODE[pair.element];
    }
  }

  for (const cell of spec.terrain ?? []) {
    const index = cellIndex(w, h, cell.x, cell.y);
    if (index < 0) {
      throw new EngineError(
        "out-of-bounds",
        `terrain (${cell.x},${cell.y}) is out of bounds`,
      );
    }
    if (cells[index] !== "free") {
      throw new EngineError(
        "occupied-cell",
        `terrain (${cell.x},${cell.y}) is not a free cell`,
      );
    }
    cells[index] = cell.kind;
  }

  return {
    w,
    h,
    cells,
    pairOf,
    element,
    paths: {},
    connected: [],
    order: [],
    scriptIndex: 0,
    moveIndex: 0,
  };
}

export function cloneBoard(state: BoardState): BoardState {
  return {
    w: state.w,
    h: state.h,
    cells: state.cells.slice(),
    pairOf: state.pairOf.slice(),
    element: state.element.slice(),
    paths: Object.fromEntries(
      Object.entries(state.paths).map(([id, path]) => [id, path.slice()]),
    ),
    connected: state.connected.slice(),
    order: state.order.slice(),
    scriptIndex: state.scriptIndex,
    moveIndex: state.moveIndex,
  };
}

export function isTraversable(kind: BoardState["cells"][number]): boolean {
  return kind === "free" || kind === "rune";
}

export function isBlockedTerrain(kind: BoardState["cells"][number]): boolean {
  return kind === "pit" || kind === "lava" || kind === "thorn" || kind === "stone";
}

export function isCovered(state: BoardState, index: number): boolean {
  if (state.cells[index] === "covered") return true;
  for (const id of Object.keys(state.paths)) {
    if (state.paths[Number(id)].includes(index)) return true;
  }
  return false;
}

export function elementOf(state: BoardState, index: number): Element | undefined {
  const code = state.element[index];
  if (code === 1) return "fire";
  if (code === 2) return "water";
  if (code === 3) return "earth";
  if (code === 4) return "air";
  return undefined;
}

export function isRune(state: BoardState, index: number): boolean {
  return state.pairOf[index] !== NO_PAIR;
}

export function isConnectedPair(state: BoardState, pairId: number): boolean {
  return state.connected.includes(pairId);
}

export function pairEndpoints(state: BoardState, pairId: number): number[] {
  const found: number[] = [];
  for (let i = 0; i < state.pairOf.length; i += 1) {
    if (state.pairOf[i] === pairId) found.push(i);
  }
  return found;
}

export function allPairIds(state: BoardState): number[] {
  const ids = new Set<number>();
  for (let i = 0; i < state.pairOf.length; i += 1) {
    if (state.pairOf[i] !== NO_PAIR) ids.add(state.pairOf[i]);
  }
  return [...ids].sort((a, b) => a - b);
}
