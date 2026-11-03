import { CellKind, Element, MutationRecord } from "../engine/types";

export interface ConnectionEvent {
  type: "connection";
  pairId: number;
  element: Element;
  path: number[];
}

export interface EffectEvent {
  type: "effect";
  element: Element;
  effect: "convert" | "push";
  cell: number;
  from?: CellKind;
  to?: CellKind;
  movedTo?: number;
  clearedTrace?: boolean;
}

export interface HazardAppliedEvent {
  type: "hazard-applied";
  mutation: MutationRecord;
}

export type HazardRejectReason = "unsolvable" | "timeout" | "illegal";

export interface HazardRejectedEvent {
  type: "hazard-rejected";
  mutation: MutationRecord;
  reason: HazardRejectReason;
}

export interface SolvedEvent {
  type: "solved";
}

export interface UndoEvent {
  type: "undo";
}

export type GameEvent =
  | ConnectionEvent
  | EffectEvent
  | HazardAppliedEvent
  | HazardRejectedEvent
  | SolvedEvent
  | UndoEvent;
