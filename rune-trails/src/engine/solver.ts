import { BoardState, NO_PAIR } from "./types";

export type SolveStatus = "solvable" | "unsolvable" | "timeout";

export interface SolveResult {
  status: SolveStatus;
  elapsedMs: number;
}

interface PairInfo {
  id: number;
  a: number;
  b: number;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function manhattan(w: number, a: number, b: number): number {
  return Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
}

/**
 * Decides whether a state still admits a complete solution: every unconnected
 * pair routed orthogonally over disjoint paths that together cover every
 * remaining `free`/`rune` cell. Returns `timeout` when `budgetMs` is exhausted.
 */
export function solve(state: BoardState, budgetMs = 8): SolveResult {
  const started = nowMs();
  const deadline = started + budgetMs;
  const n = state.w * state.h;
  const w = state.w;
  const h = state.h;

  const usable = new Uint8Array(n);
  const owner = new Int16Array(n).fill(NO_PAIR);
  const endpoints = new Map<number, number[]>();
  const connected = new Set(state.connected);
  let requiredCount = 0;

  for (let i = 0; i < n; i += 1) {
    const kind = state.cells[i];
    if (kind === "free") {
      usable[i] = 1;
      requiredCount += 1;
    } else if (kind === "rune") {
      const pairId = state.pairOf[i];
      if (pairId === NO_PAIR || connected.has(pairId)) {
        return { status: "unsolvable", elapsedMs: nowMs() - started };
      }
      usable[i] = 1;
      owner[i] = pairId;
      requiredCount += 1;
      const list = endpoints.get(pairId) ?? [];
      list.push(i);
      endpoints.set(pairId, list);
    }
  }

  const pairs: PairInfo[] = [];
  for (const [id, list] of endpoints) {
    if (list.length !== 2) {
      return { status: "unsolvable", elapsedMs: nowMs() - started };
    }
    pairs.push({ id, a: list[0], b: list[1] });
  }
  pairs.sort(
    (p, q) => manhattan(w, q.a, q.b) - manhattan(w, p.a, p.b) || p.id - q.id,
  );

  if (pairs.length === 0) {
    return {
      status: requiredCount === 0 ? "solvable" : "unsolvable",
      elapsedMs: nowMs() - started,
    };
  }

  const occupied = new Uint8Array(n);
  const failed = new Set<string>();
  const componentId = new Int16Array(n).fill(-1);
  let timedOut = false;
  let nodes = 0;

  const neighbors = (index: number): number[] => {
    const x = index % w;
    const y = Math.floor(index / w);
    const result: number[] = [];
    if (y > 0) result.push(index - w);
    if (x > 0) result.push(index - 1);
    if (y < h - 1) result.push(index + w);
    if (x < w - 1) result.push(index + 1);
    return result;
  };

  const checkBudget = (): boolean => {
    nodes += 1;
    if (!timedOut && (nodes === 1 || nodes % 64 === 0) && nowMs() > deadline) {
      timedOut = true;
    }
    return timedOut;
  };

  /**
   * Checks that every still-required cell can be covered and that each
   * remaining pair's endpoints still share a component.
   */
  const componentsValid = (remaining: PairInfo[]): boolean => {
    componentId.fill(-1);
    let nextComponent = 0;

    for (let start = 0; start < n; start += 1) {
      if (!usable[start] || occupied[start] || componentId[start] !== -1) continue;
      const id = nextComponent;
      nextComponent += 1;
      const queue: number[] = [start];
      componentId[start] = id;
      let hasFree = false;
      let hasEndpoint = false;
      for (let q = 0; q < queue.length; q += 1) {
        const cell = queue[q];
        if (owner[cell] === NO_PAIR) hasFree = true;
        else hasEndpoint = true;
        for (const nb of neighbors(cell)) {
          if (!usable[nb] || occupied[nb] || componentId[nb] !== -1) continue;
          componentId[nb] = id;
          queue.push(nb);
        }
      }
      // A component made only of free cells can never be covered by a path.
      if (hasFree && !hasEndpoint) return false;
    }

    for (const pair of remaining) {
      if (componentId[pair.a] !== componentId[pair.b]) return false;
    }
    return true;
  };

  const prune = (remaining: PairInfo[]): boolean => {
    let occupiedUsable = 0;
    for (let i = 0; i < n; i += 1) {
      if (usable[i] && occupied[i]) occupiedUsable += 1;
    }
    const remainingCells = requiredCount - occupiedUsable;

    let minCells = 0;
    for (const pair of remaining) {
      minCells += manhattan(w, pair.a, pair.b) + 1;
    }
    if (minCells > remainingCells) return false;

    for (let i = 0; i < n; i += 1) {
      if (!usable[i] || occupied[i]) continue;
      let degree = 0;
      for (const nb of neighbors(i)) {
        if (usable[nb] && !occupied[nb]) degree += 1;
      }
      if (owner[i] === NO_PAIR) {
        if (degree < 2) return false;
      } else if (degree < 1) {
        return false;
      }
    }

    return componentsValid(remaining);
  };

  const allRequiredCovered = (): boolean => {
    for (let i = 0; i < n; i += 1) {
      if (usable[i] && !occupied[i]) return false;
    }
    return true;
  };

  const routePair = (pair: PairInfo, remaining: PairInfo[]): boolean => {
    const visited = new Uint8Array(n);
    const path: number[] = [];

    const dfs = (cur: number): boolean => {
      if (checkBudget()) return false;
      path.push(cur);
      visited[cur] = 1;

      if (cur === pair.b) {
        for (const cell of path) occupied[cell] = 1;
        const nextRemaining = remaining.slice(1);
        const key = `${nextRemaining.length}:${occupied.join("")}`;
        let success: boolean;
        if (failed.has(key)) {
          success = false;
        } else {
          if (nextRemaining.length === 0) {
            success = allRequiredCovered();
          } else if (prune(nextRemaining)) {
            success = search(nextRemaining);
          } else {
            success = false;
          }
          if (!success) failed.add(key);
        }
        if (!success) {
          for (const cell of path) occupied[cell] = 0;
        }
        visited[cur] = 0;
        path.pop();
        return success;
      }

      for (const nb of neighbors(cur)) {
        if (!usable[nb] || occupied[nb] || visited[nb]) continue;
        if (owner[nb] !== NO_PAIR && nb !== pair.b) continue;
        if (dfs(nb)) return true;
      }
      visited[cur] = 0;
      path.pop();
      return false;
    };

    return dfs(pair.a);
  };

  const search = (remaining: PairInfo[]): boolean => {
    if (checkBudget()) return false;
    if (remaining.length === 0) return allRequiredCovered();
    if (!prune(remaining)) return false;
    return routePair(remaining[0], remaining);
  };

  const solvable = search(pairs);
  const elapsedMs = nowMs() - started;
  if (timedOut) return { status: "timeout", elapsedMs };
  return { status: solvable ? "solvable" : "unsolvable", elapsedMs };
}

export function isSolvable(state: BoardState, budgetMs = 8): boolean {
  return solve(state, budgetMs).status === "solvable";
}
