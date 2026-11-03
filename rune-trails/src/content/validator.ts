import { cloneBoard } from "../engine/board";
import { serializeState } from "../engine/serialize";
import { solve } from "../engine/solver";
import { BoardState, MutationRecord } from "../engine/types";
import { applyMutation, validateMutation } from "../engine/mutations";
import { Level } from "./schema";

export interface LevelValidationIssue {
  levelId: string;
  reason: string;
  scriptIndex?: number;
  state?: ReturnType<typeof serializeState>;
}

export interface LevelValidationResult {
  ok: boolean;
  levelId: string;
  issues: LevelValidationIssue[];
  statesChecked: number;
}

export interface ValidateOptions {
  budgetMs?: number;
}

export interface EnumeratedState {
  index: number;
  state: BoardState;
  mutation?: MutationRecord;
}

/**
 * Enumerates the board states produced by walking the level's hazard script
 * from the initial board. Each entry is the state after consuming the script
 * entry at `index`. It is the reachable terrain evolution under the script.
 */
export function enumerateScriptStates(level: Level): EnumeratedState[] {
  const states: EnumeratedState[] = [
    { index: -1, state: cloneBoard(level.initialState) },
  ];
  let state = cloneBoard(level.initialState);
  level.hazardScript.forEach((mutation, index) => {
    if (validateMutation(state, mutation).ok) {
      state = applyMutation(state, mutation);
    }
    states.push({ index, state: cloneBoard(state), mutation });
  });
  return states;
}

export function validateLevel(
  level: Level,
  options: ValidateOptions = {},
): LevelValidationResult {
  const budgetMs = options.budgetMs ?? 5000;
  const issues: LevelValidationIssue[] = [];

  const initial = solve(cloneBoard(level.initialState), budgetMs);
  if (initial.status === "timeout") {
    return {
      ok: false,
      levelId: level.id,
      statesChecked: 1,
      issues: [
        {
          levelId: level.id,
          reason: `initial solvability check exceeded the ${budgetMs} ms budget`,
        },
      ],
    };
  }
  if (initial.status === "unsolvable") {
    return {
      ok: false,
      levelId: level.id,
      statesChecked: 1,
      issues: [
        {
          levelId: level.id,
          reason: "initial board has no solution",
          state: serializeState(level.initialState),
        },
      ],
    };
  }

  const states = enumerateScriptStates(level);
  let checked = 1;
  for (const entry of states) {
    if (entry.index < 0) continue;
    const result = solve(entry.state, budgetMs);
    checked += 1;
    if (result.status === "timeout") {
      issues.push({
        levelId: level.id,
        scriptIndex: entry.index,
        reason: `solvability check at script index ${entry.index} exceeded the ${budgetMs} ms budget`,
        state: serializeState(entry.state),
      });
      break;
    }
    if (result.status === "unsolvable") {
      issues.push({
        levelId: level.id,
        scriptIndex: entry.index,
        reason: `hazard at script index ${entry.index} leaves free cells unreachable`,
        state: serializeState(entry.state),
      });
      break;
    }
  }

  return {
    ok: issues.length === 0,
    levelId: level.id,
    issues,
    statesChecked: checked,
  };
}
