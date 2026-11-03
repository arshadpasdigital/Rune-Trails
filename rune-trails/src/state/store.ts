import { create } from "zustand";
import { cloneBoard, createBoard } from "../engine/board";
import { isSolved } from "../engine/win";
import { LEVEL_DOCUMENTS } from "../content/levels";
import { loadLevels } from "../content/loader";
import { Level } from "../content/schema";
import { GameEvent } from "../sim/events";
import {
  Game,
  canUndoAction,
  connect as connectGame,
  createGame,
  currentBoard,
  undoAction,
} from "../sim/game";
import { ScriptedHazardSource } from "../sim/hazard";
import { lightImpact, successNotification } from "../platform/haptics";
import { mmkvStorage } from "../platform/mmkv";
import {
  ProgressData,
  defaultProgress,
  readProgress,
  withCompletion,
  withHaptics,
  writeProgress,
} from "../platform/progressStore";
import { earliestUnsolved, isUnlocked, nextLevelId } from "./sessionLogic";

function placeholderGame(): Game {
  return createGame(createBoard({ w: 1, h: 1, pairs: [] }));
}

export interface SessionStore {
  ready: boolean;
  levels: Level[];
  levelIndex: number;
  game: Game;
  events: GameEvent[];
  solved: boolean;
  progress: ProgressData;
  load: () => void;
  startLevel: (index: number) => void;
  connect: (pairId: number, path: number[]) => void;
  undo: () => void;
  advance: () => void;
  toggleHaptics: () => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  ready: false,
  levels: [],
  levelIndex: 0,
  game: placeholderGame(),
  events: [],
  solved: false,
  progress: defaultProgress(),

  load: () => {
    const { levels } = loadLevels(LEVEL_DOCUMENTS, { budgetMs: 5000 });
    const progress = readProgress(mmkvStorage);
    const ids = levels.map((level) => level.id);
    const targetId = earliestUnsolved(ids, progress.completed);
    const index = Math.max(
      0,
      levels.findIndex((level) => level.id === targetId),
    );
    const level = levels[index];
    set({
      ready: true,
      levels,
      levelIndex: index,
      progress,
      game: level ? createGame(cloneBoard(level.initialState)) : placeholderGame(),
      events: [],
      solved: false,
    });
  },

  startLevel: (index: number) => {
    const { levels, progress } = get();
    const level = levels[index];
    if (!level) return;
    if (!isUnlocked(level.id, levels.map((item) => item.id), progress.completed)) {
      return;
    }
    set({
      levelIndex: index,
      game: createGame(cloneBoard(level.initialState)),
      events: [],
      solved: false,
    });
  },

  connect: (pairId: number, path: number[]) => {
    const { game, levelIndex, levels, solved, progress } = get();
    if (solved) return;
    const level = levels[levelIndex];
    if (!level) return;

    let result: ReturnType<typeof connectGame>;
    try {
      result = connectGame(
        game,
        pairId,
        path,
        new ScriptedHazardSource(level.hazardScript),
      );
    } catch {
      return;
    }

    const nowSolved = isSolved(currentBoard(result.game));
    let nextProgress = progress;
    if (nowSolved) {
      nextProgress = withCompletion(progress, level.id);
      writeProgress(mmkvStorage, nextProgress);
    }

    if (nextProgress.hapticsEnabled) {
      if (result.events.some((event) => event.type === "connection")) {
        lightImpact(true);
      }
      if (nowSolved) successNotification(true);
    }

    set({
      game: result.game,
      events: result.events,
      solved: nowSolved,
      progress: nextProgress,
    });
  },

  undo: () => {
    const { game, solved } = get();
    if (solved || !canUndoAction(game)) return;
    const result = undoAction(game);
    set({ game: result.game, events: result.events });
  },

  advance: () => {
    const { levels, levelIndex } = get();
    const current = levels[levelIndex];
    if (!current) return;
    const nextId = nextLevelId(
      levels.map((level) => level.id),
      current.id,
    );
    if (!nextId) return;
    const nextIndex = levels.findIndex((level) => level.id === nextId);
    if (nextIndex >= 0) get().startLevel(nextIndex);
  },

  toggleHaptics: () => {
    const progress = withHaptics(get().progress, !get().progress.hapticsEnabled);
    writeProgress(mmkvStorage, progress);
    set({ progress });
  },
}));
