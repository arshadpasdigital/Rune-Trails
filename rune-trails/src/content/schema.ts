import { createBoard } from "../engine/board";
import {
  BoardState,
  CellPoint,
  Element,
  MutationRecord,
  PairSpec,
  TerrainKind,
  TerrainSpec,
} from "../engine/types";

export const LEVEL_ELEMENTS: Element[] = ["fire", "water", "earth", "air"];
export const LEVEL_TERRAIN_KINDS: TerrainKind[] = ["pit", "lava", "thorn", "stone"];

export interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
  pairs: PairSpec[];
  terrain: TerrainSpec[];
  hazardScript: MutationRecord[];
  initialState: BoardState;
}

export interface LevelError {
  path: string;
  reason: string;
}

export type ParseResult =
  | { ok: true; level: Level }
  | { ok: false; errors: LevelError[] };

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function readPoint(
  value: unknown,
  width: number,
  height: number,
  path: string,
  errors: LevelError[],
): CellPoint | null {
  if (!isObject(value)) {
    errors.push({ path, reason: "expected an object with integer x and y" });
    return null;
  }
  const { x, y } = value;
  if (!isInteger(x) || !isInteger(y)) {
    errors.push({ path, reason: "expected integer x and y" });
    return null;
  }
  if (x < 0 || y < 0 || x >= width || y >= height) {
    errors.push({ path, reason: `point (${x},${y}) is out of bounds` });
    return null;
  }
  return { x, y };
}

export function parseLevel(input: unknown): ParseResult {
  const errors: LevelError[] = [];
  if (!isObject(input)) {
    return {
      ok: false,
      errors: [{ path: "$", reason: "level must be a JSON object" }],
    };
  }

  const id = typeof input.id === "string" && input.id.length > 0 ? input.id : "";
  if (!id) errors.push({ path: "id", reason: "level id is required" });
  const name = typeof input.name === "string" ? input.name : id;

  const width = input.width;
  const height = input.height;
  if (!isInteger(width) || width <= 0) {
    errors.push({ path: "width", reason: "width must be a positive integer" });
  }
  if (!isInteger(height) || height <= 0) {
    errors.push({ path: "height", reason: "height must be a positive integer" });
  }
  if (errors.length > 0) return { ok: false, errors };

  const w = width as number;
  const h = height as number;

  const pairsInput = input.pairs;
  if (!Array.isArray(pairsInput) || pairsInput.length === 0) {
    errors.push({ path: "pairs", reason: "pairs must be a non-empty array" });
  }

  const pairs: PairSpec[] = [];
  const pairIds = new Set<number>();
  const runeCells = new Map<number, string>();

  if (Array.isArray(pairsInput)) {
    pairsInput.forEach((rawPair, pairIndex) => {
      const path = `pairs[${pairIndex}]`;
      if (!isObject(rawPair)) {
        errors.push({ path, reason: "pair must be an object" });
        return;
      }
      const pairId = rawPair.id;
      if (!isInteger(pairId) || pairId < 0) {
        errors.push({ path: `${path}.id`, reason: "pair id must be a non-negative integer" });
        return;
      }
      if (pairIds.has(pairId)) {
        errors.push({ path: `${path}.id`, reason: `duplicate pair id ${pairId}` });
        return;
      }
      pairIds.add(pairId);

      const element = rawPair.element;
      if (!LEVEL_ELEMENTS.includes(element as Element)) {
        errors.push({
          path: `${path}.element`,
          reason: `unknown element "${String(element)}"`,
        });
        return;
      }

      const endpointsRaw = rawPair.endpoints;
      if (!Array.isArray(endpointsRaw) || endpointsRaw.length !== 2) {
        errors.push({
          path: `${path}.endpoints`,
          reason: `pair ${pairId} must have exactly two endpoints`,
        });
        return;
      }

      const endpoints: CellPoint[] = [];
      let valid = true;
      endpointsRaw.forEach((rawPoint, endpointIndex) => {
        const point = readPoint(
          rawPoint,
          w,
          h,
          `${path}.endpoints[${endpointIndex}]`,
          errors,
        );
        if (!point) {
          valid = false;
          return;
        }
        endpoints.push(point);
      });
      if (!valid) return;

      if (endpoints[0].x === endpoints[1].x && endpoints[0].y === endpoints[1].y) {
        errors.push({
          path: `${path}.endpoints`,
          reason: `pair ${pairId} has two endpoints on the same cell`,
        });
        return;
      }

      for (const endpoint of endpoints) {
        const index = endpoint.y * w + endpoint.x;
        if (runeCells.has(index)) {
          errors.push({
            path: `${path}.endpoints`,
            reason: `cell (${endpoint.x},${endpoint.y}) already holds a rune`,
          });
          return;
        }
        runeCells.set(index, `${path}.endpoints`);
      }

      pairs.push({
        id: pairId,
        element: element as Element,
        endpoints: [endpoints[0], endpoints[1]],
      });
    });
  }

  const terrain: TerrainSpec[] = [];
  const terrainNames: Record<TerrainKind, string> = {
    pit: "pit",
    lava: "lava",
    thorn: "thorn",
    stone: "stone",
  };
  const terrainCells = new Map<number, string>();
  if (input.terrain !== undefined) {
    if (!Array.isArray(input.terrain)) {
      errors.push({ path: "terrain", reason: "terrain must be an array" });
    } else {
      input.terrain.forEach((rawCell, index) => {
        const path = `terrain[${index}]`;
        if (!isObject(rawCell)) {
          errors.push({ path, reason: "terrain cell must be an object" });
          return;
        }
        const kind = rawCell.kind;
        if (typeof kind !== "string" || !(kind in terrainNames)) {
          errors.push({ path: `${path}.kind`, reason: `unknown terrain kind "${String(kind)}"` });
          return;
        }
        const point = readPoint(rawCell, w, h, path, errors);
        if (!point) return;
        const cellIndex = point.y * w + point.x;
        if (runeCells.has(cellIndex)) {
          errors.push({
            path,
            reason: `terrain (${point.x},${point.y}) is on a rune cell`,
          });
          return;
        }
        if (terrainCells.has(cellIndex)) {
          errors.push({ path, reason: `duplicate terrain at (${point.x},${point.y})` });
          return;
        }
        terrainCells.set(cellIndex, path);
        terrain.push({ ...point, kind: kind as TerrainKind });
      });
    }
  }

  const hazardScript: MutationRecord[] = [];
  if (input.hazardScript !== undefined) {
    if (!Array.isArray(input.hazardScript)) {
      errors.push({ path: "hazardScript", reason: "hazardScript must be an array" });
    } else {
      input.hazardScript.forEach((rawEntry, index) => {
        const path = `hazardScript[${index}]`;
        if (!isObject(rawEntry)) {
          errors.push({ path, reason: "hazard entry must be an object" });
          return;
        }
        const kind = rawEntry.kind;
        if (kind === "shift-row") {
          const row = rawEntry.row;
          const dx = rawEntry.dx;
          if (!isInteger(row) || row < 0 || row >= h) {
            errors.push({ path: `${path}.row`, reason: `row ${String(row)} is out of bounds` });
            return;
          }
          if (dx !== -1 && dx !== 1) {
            errors.push({ path: `${path}.dx`, reason: "dx must be -1 or 1" });
            return;
          }
          hazardScript.push({ kind: "shift-row", row, dx });
          return;
        }
        if (kind === "spread") {
          const from = readPoint(rawEntry.from, w, h, `${path}.from`, errors);
          const to = readPoint(rawEntry.to, w, h, `${path}.to`, errors);
          if (!from || !to) return;
          hazardScript.push({ kind: "spread", from, to });
          return;
        }
        if (kind === "grow") {
          const cell = readPoint(rawEntry.cell, w, h, `${path}.cell`, errors);
          if (!cell) return;
          hazardScript.push({ kind: "grow", cell });
          return;
        }
        errors.push({
          path: `${path}.kind`,
          reason: `unknown mutation kind "${String(kind)}" at script index ${index}`,
        });
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  try {
    const initialState = createBoard({ w, h, pairs, terrain });
    return {
      ok: true,
      level: {
        id,
        name,
        width: w,
        height: h,
        pairs,
        terrain,
        hazardScript,
        initialState,
      },
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          reason: error instanceof Error ? error.message : "could not build board",
        },
      ],
    };
  }
}
