import { allPairIds, isConnectedPair } from "../engine/board";
import { History, canUndo } from "../engine/history";
import { BoardState } from "../engine/types";

export interface HudState {
  levelId: string;
  connected: number;
  totalPairs: number;
  canUndo: boolean;
}

export function earliestUnsolved(levelIds: string[], completed: string[]): string {
  if (levelIds.length === 0) return "";
  const done = new Set(completed);
  const firstUnsolved = levelIds.find((id) => !done.has(id));
  return firstUnsolved ?? levelIds[levelIds.length - 1];
}

export function isUnlocked(
  levelId: string,
  levelIds: string[],
  completed: string[],
): boolean {
  const index = levelIds.indexOf(levelId);
  if (index < 0) return false;
  if (index === 0) return true;
  return completed.includes(levelIds[index - 1]);
}

export function nextLevelId(
  levelIds: string[],
  currentId: string,
): string | null {
  const index = levelIds.indexOf(currentId);
  if (index < 0 || index >= levelIds.length - 1) return null;
  return levelIds[index + 1];
}

/** Records a completion once; repeated completions do not duplicate. */
export function recordCompletion(completed: string[], levelId: string): string[] {
  return completed.includes(levelId) ? completed : [...completed, levelId];
}

export function hudState(
  levelId: string,
  board: BoardState,
  history: History,
): HudState {
  const totalPairs = allPairIds(board).length;
  const connected = allPairIds(board).filter((id) => isConnectedPair(board, id))
    .length;
  return {
    levelId,
    connected,
    totalPairs,
    canUndo: canUndo(history),
  };
}
