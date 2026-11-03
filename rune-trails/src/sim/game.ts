import {
  History,
  canUndo,
  createHistory,
  pushHistory,
  undo as undoHistory,
} from "../engine/history";
import { BoardState } from "../engine/types";
import { GameEvent } from "./events";
import { HazardSource } from "./hazard";
import { ResolveOptions, resolveTurn } from "./resolve";

export interface Game {
  history: History;
}

export function createGame(initial: BoardState): Game {
  return { history: createHistory(initial) };
}

export function currentBoard(game: Game): BoardState {
  return game.history.current;
}

export function canUndoAction(game: Game): boolean {
  return canUndo(game.history);
}

export function connect(
  game: Game,
  pairId: number,
  path: number[],
  hazards: HazardSource,
  options: ResolveOptions = {},
): { game: Game; events: GameEvent[] } {
  const result = resolveTurn(
    game.history.current,
    pairId,
    path,
    hazards,
    options,
  );
  return {
    game: { history: pushHistory(game.history, result.state) },
    events: result.events,
  };
}

export function undoAction(game: Game): { game: Game; events: GameEvent[] } {
  if (!canUndo(game.history)) {
    return { game, events: [] };
  }
  return {
    game: { history: undoHistory(game.history) },
    events: [{ type: "undo" }],
  };
}
