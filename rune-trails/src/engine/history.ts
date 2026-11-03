import { cloneBoard } from "./board";
import { BoardState } from "./types";

export interface History {
  current: BoardState;
  past: BoardState[];
}

export function createHistory(initial: BoardState): History {
  return { current: cloneBoard(initial), past: [] };
}

export function pushHistory(history: History, next: BoardState): History {
  return {
    current: cloneBoard(next),
    past: [...history.past, cloneBoard(history.current)],
  };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function undo(history: History): History {
  if (history.past.length === 0) return history;
  const past = history.past.slice();
  const previous = past.pop() as BoardState;
  return { current: cloneBoard(previous), past };
}

export function resetHistory(initial: BoardState): History {
  return createHistory(initial);
}
