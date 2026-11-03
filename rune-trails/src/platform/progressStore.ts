export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

export const PROGRESS_KEY = "rune-trails.progress";
export const PROGRESS_VERSION = 1;

export interface ProgressData {
  version: number;
  completed: string[];
  hapticsEnabled: boolean;
}

export function defaultProgress(): ProgressData {
  return { version: PROGRESS_VERSION, completed: [], hapticsEnabled: true };
}

function isProgressData(value: unknown): value is ProgressData {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.version !== PROGRESS_VERSION) return false;
  if (!Array.isArray(record.completed)) return false;
  if (!record.completed.every((item) => typeof item === "string")) return false;
  if (typeof record.hapticsEnabled !== "boolean") return false;
  return true;
}

/**
 * Reads progress defensively. Missing, corrupt, structurally invalid, or
 * newer-version data all fall back to defaults without throwing or touching
 * unrelated keys.
 */
export function readProgress(storage: KeyValueStorage): ProgressData {
  let raw: string | undefined;
  try {
    raw = storage.getString(PROGRESS_KEY);
  } catch {
    return defaultProgress();
  }
  if (typeof raw !== "string") return defaultProgress();
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProgressData(parsed) ? parsed : defaultProgress();
  } catch {
    return defaultProgress();
  }
}

export function writeProgress(storage: KeyValueStorage, data: ProgressData): void {
  storage.set(PROGRESS_KEY, JSON.stringify(data));
}

export function withCompletion(
  data: ProgressData,
  levelId: string,
): ProgressData {
  if (data.completed.includes(levelId)) return data;
  return { ...data, completed: [...data.completed, levelId] };
}

export function withHaptics(
  data: ProgressData,
  hapticsEnabled: boolean,
): ProgressData {
  return { ...data, hapticsEnabled };
}
