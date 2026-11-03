import { cloneBoard, elementOf } from "../engine/board";
import { commitConnection } from "../engine/path";
import { solve } from "../engine/solver";
import { BoardState } from "../engine/types";
import { isSolved } from "../engine/win";
import { applyElementEffect } from "./effects";
import { GameEvent } from "./events";
import { HazardSource } from "./hazard";
import { applyMutation, validateMutation } from "../engine/mutations";

export interface ResolveOptions {
  guardBudgetMs?: number;
}

export interface TurnResult {
  state: BoardState;
  events: GameEvent[];
}

/**
 * Resolves one completed connection in the fixed order:
 * commit -> element effect -> hazard mutation -> solvability guard.
 */
export function resolveTurn(
  state: BoardState,
  pairId: number,
  path: number[],
  hazards: HazardSource,
  options: ResolveOptions = {},
): TurnResult {
  const budgetMs = options.guardBudgetMs ?? 8;
  const events: GameEvent[] = [];

  const committed = commitConnection(state, pairId, path);
  const element = elementOf(committed, path[0]);
  if (element) {
    events.push({ type: "connection", pairId, element, path: path.slice() });
  }

  let afterEffects = committed;
  if (element) {
    const effect = applyElementEffect(committed, element, path);
    afterEffects = effect.state;
    events.push(...effect.events);
  }

  let finalState = afterEffects;
  const proposed = hazards.propose(afterEffects);
  if (proposed) {
    const legality = validateMutation(afterEffects, proposed);
    if (!legality.ok) {
      events.push({ type: "hazard-rejected", mutation: proposed, reason: "illegal" });
    } else {
      const candidate = applyMutation(afterEffects, proposed);
      const guard = solve(candidate, budgetMs);
      if (guard.status === "solvable") {
        finalState = candidate;
        events.push({ type: "hazard-applied", mutation: proposed });
      } else {
        events.push({
          type: "hazard-rejected",
          mutation: proposed,
          reason: guard.status === "timeout" ? "timeout" : "unsolvable",
        });
      }
    }
  }

  finalState = cloneBoard(finalState);
  finalState.scriptIndex = afterEffects.scriptIndex + 1;

  if (isSolved(finalState)) {
    events.push({ type: "solved" });
  }

  return { state: finalState, events };
}
