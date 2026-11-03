import { BoardState, MutationRecord } from "../engine/types";

/**
 * Supplies at most one hazard mutation per completed connection. Implementations
 * read the board's `scriptIndex` so resolution stays a pure function of state.
 */
export interface HazardSource {
  propose(state: BoardState): MutationRecord | null;
}

export class ScriptedHazardSource implements HazardSource {
  readonly script: MutationRecord[];

  constructor(script: MutationRecord[]) {
    this.script = script;
  }

  propose(state: BoardState): MutationRecord | null {
    if (state.scriptIndex < 0 || state.scriptIndex >= this.script.length) {
      return null;
    }
    return this.script[state.scriptIndex];
  }

  get length(): number {
    return this.script.length;
  }
}

export const NO_HAZARD: HazardSource = { propose: () => null };
