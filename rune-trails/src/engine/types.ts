export type CellKind =
  | "free"
  | "rune"
  | "pit"
  | "lava"
  | "thorn"
  | "stone"
  | "covered";

export type Element = "fire" | "water" | "earth" | "air";

export type TerrainKind = "pit" | "lava" | "thorn" | "stone";

export const NO_PAIR = -1;

export const ELEMENT_CODE: Record<Element, number> = {
  fire: 1,
  water: 2,
  earth: 3,
  air: 4,
};

export const CODE_ELEMENT: Record<number, Element | undefined> = {
  1: "fire",
  2: "water",
  3: "earth",
  4: "air",
};

export interface BoardState {
  w: number;
  h: number;
  cells: CellKind[];
  pairOf: Int16Array;
  element: Uint8Array;
  paths: Record<number, number[]>;
  connected: number[];
  order: number[];
  scriptIndex: number;
  moveIndex: number;
}

export interface CellPoint {
  x: number;
  y: number;
}

export interface PairSpec {
  id: number;
  element: Element;
  endpoints: [CellPoint, CellPoint];
}

export interface TerrainSpec extends CellPoint {
  kind: TerrainKind;
}

export type MutationRecord =
  | { kind: "shift-row"; row: number; dx: -1 | 1 }
  | { kind: "spread"; from: CellPoint; to: CellPoint }
  | { kind: "grow"; cell: CellPoint };

export const MUTATION_KINDS = ["shift-row", "spread", "grow"] as const;

export type Action =
  | { type: "connect"; pairId: number; path: number[] }
  | { type: "undo" };

export class EngineError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}
