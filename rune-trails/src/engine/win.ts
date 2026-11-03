import { allPairIds, isConnectedPair } from "./board";
import { BoardState } from "./types";

/**
 * A level is solved when every pair is connected and every traversable cell
 * (`free` or `rune`) is covered. Hazard terrain is exempt from coverage.
 */
export function isSolved(state: BoardState): boolean {
  for (const pairId of allPairIds(state)) {
    if (!isConnectedPair(state, pairId)) return false;
  }
  for (const kind of state.cells) {
    if (kind === "free" || kind === "rune") return false;
  }
  return true;
}

export function uncoveredTraversableCells(state: BoardState): number[] {
  const uncovered: number[] = [];
  for (let i = 0; i < state.cells.length; i += 1) {
    if (state.cells[i] === "free" || state.cells[i] === "rune") {
      uncovered.push(i);
    }
  }
  return uncovered;
}
