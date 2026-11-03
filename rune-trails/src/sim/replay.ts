import { Action, BoardState } from "../engine/types";
import { GameEvent } from "./events";
import {
  Game,
  connect,
  createGame,
  undoAction,
} from "./game";
import { HazardSource } from "./hazard";
import { ResolveOptions } from "./resolve";

export interface ReplayResult {
  game: Game;
  events: GameEvent[];
}

/**
 * Replays a recorded action log against the same initial board and hazard
 * source. Resolution is deterministic, so the resulting state and the flattened
 * event stream must match the original run exactly.
 */
export function replay(
  initial: BoardState,
  actions: Action[],
  hazards: HazardSource,
  options: ResolveOptions = {},
): ReplayResult {
  let game = createGame(initial);
  const events: GameEvent[] = [];
  for (const action of actions) {
    if (action.type === "connect") {
      const result = connect(
        game,
        action.pairId,
        action.path,
        hazards,
        options,
      );
      game = result.game;
      events.push(...result.events);
    } else {
      const result = undoAction(game);
      game = result.game;
      events.push(...result.events);
    }
  }
  return { game, events };
}

