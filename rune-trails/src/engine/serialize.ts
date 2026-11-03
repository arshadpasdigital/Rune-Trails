import { BoardState, CellKind } from "./types";

export interface SerializedBoardState {
  w: number;
  h: number;
  cells: CellKind[];
  pairOf: number[];
  element: number[];
  paths: Record<string, number[]>;
  connected: number[];
  order: number[];
  scriptIndex: number;
  moveIndex: number;
}

export function serializeState(state: BoardState): SerializedBoardState {
  return {
    w: state.w,
    h: state.h,
    cells: state.cells.slice(),
    pairOf: Array.from(state.pairOf),
    element: Array.from(state.element),
    paths: Object.fromEntries(
      Object.entries(state.paths).map(([id, path]) => [id, path.slice()]),
    ),
    connected: state.connected.slice(),
    order: state.order.slice(),
    scriptIndex: state.scriptIndex,
    moveIndex: state.moveIndex,
  };
}

export function deserializeState(json: SerializedBoardState): BoardState {
  return {
    w: json.w,
    h: json.h,
    cells: json.cells.slice(),
    pairOf: Int16Array.from(json.pairOf),
    element: Uint8Array.from(json.element),
    paths: Object.fromEntries(
      Object.entries(json.paths).map(([id, path]) => [id, path.slice()]),
    ),
    connected: json.connected.slice(),
    order: json.order.slice(),
    scriptIndex: json.scriptIndex,
    moveIndex: json.moveIndex,
  };
}

export function statesEqual(a: BoardState, b: BoardState): boolean {
  return (
    JSON.stringify(serializeState(a)) === JSON.stringify(serializeState(b))
  );
}
