import { cloneBoard, neighborsOf } from "../engine/board";
import { BoardState, Element, NO_PAIR } from "../engine/types";
import { EffectEvent } from "./events";

export interface EffectResult {
  state: BoardState;
  events: EffectEvent[];
}

function isCommittedPathCell(state: BoardState, index: number): boolean {
  if (state.cells[index] === "covered") return true;
  for (const id of Object.keys(state.paths)) {
    if (state.paths[Number(id)].includes(index)) return true;
  }
  return false;
}

function adjacentToPath(state: BoardState, path: number[]): number[] {
  const pathSet = new Set(path);
  const seen = new Set<number>();
  const result: number[] = [];
  for (const cell of path) {
    for (const nb of neighborsOf(state.w, state.h, cell)) {
      if (pathSet.has(nb) || seen.has(nb)) continue;
      seen.add(nb);
      result.push(nb);
    }
  }
  return result;
}

const CONVERSIONS: Record<
  Exclude<Element, "air">,
  { from: "thorn" | "lava" | "pit"; to: "free" | "stone" }
> = {
  fire: { from: "thorn", to: "free" },
  water: { from: "lava", to: "stone" },
  earth: { from: "pit", to: "free" },
};

/**
 * Applies the element of a completed path to its orthogonal neighbours. Only
 * one element effect kind applies per turn; cells on committed paths and the
 * completed path itself are never modified.
 */
export function applyElementEffect(
  state: BoardState,
  element: Element,
  path: number[],
): EffectResult {
  const events: EffectEvent[] = [];
  const next = cloneBoard(state);

  if (element === "air") {
    const pushed = pushEndpoint(next, path, events);
    return { state: pushed, events };
  }

  const conversion = CONVERSIONS[element];
  for (const cell of adjacentToPath(state, path)) {
    if (isCommittedPathCell(state, cell)) continue;
    if (state.cells[cell] !== conversion.from) continue;
    next.cells[cell] = conversion.to;
    events.push({
      type: "effect",
      element,
      effect: "convert",
      cell,
      from: conversion.from,
      to: conversion.to,
    });
  }
  return { state: next, events };
}

function pushEndpoint(
  state: BoardState,
  path: number[],
  events: EffectEvent[],
): BoardState {
  const connected = new Set(state.connected);
  for (const cell of adjacentToPath(state, path)) {
    if (state.cells[cell] !== "rune") continue;
    const pairId = state.pairOf[cell];
    if (pairId === NO_PAIR || connected.has(pairId)) continue;
    const destinations = neighborsOf(state.w, state.h, cell);
    for (const destination of destinations) {
      if (state.cells[destination] !== "free") continue;
      if (isCommittedPathCell(state, destination)) continue;
      const next = cloneBoard(state);
      next.cells[destination] = "rune";
      next.pairOf[destination] = pairId;
      next.element[destination] = state.element[cell];
      next.cells[cell] = "free";
      next.pairOf[cell] = NO_PAIR;
      next.element[cell] = 0;
      events.push({
        type: "effect",
        element: "air",
        effect: "push",
        cell,
        from: "rune",
        to: "free",
        movedTo: destination,
        clearedTrace: true,
      });
      return next;
    }
  }
  return state;
}
