import { describe, expect, it } from "vitest";
import {
  PROGRESS_KEY,
  PROGRESS_VERSION,
  KeyValueStorage,
  defaultProgress,
  readProgress,
  withCompletion,
  withHaptics,
  writeProgress,
} from "../platform/progressStore";

class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.data.get(key);
  }

  set(key: string, value: string): void {
    this.data.set(key, value);
  }
}

describe("progress persistence", () => {
  it("returns defaults when no progress exists", () => {
    const storage = new MemoryStorage();
    expect(readProgress(storage)).toEqual(defaultProgress());
  });

  it("writes and reads progress back", () => {
    const storage = new MemoryStorage();
    const progress = withCompletion(defaultProgress(), "level-01");
    writeProgress(storage, progress);
    expect(readProgress(storage)).toEqual(progress);
  });

  it("falls back safely on corrupt data and keeps unrelated keys", () => {
    const storage = new MemoryStorage();
    storage.set(PROGRESS_KEY, "{not json");
    storage.set("unrelated", "keep me");
    expect(readProgress(storage)).toEqual(defaultProgress());
    expect(storage.getString("unrelated")).toBe("keep me");
  });

  it("falls back on structurally invalid data", () => {
    const storage = new MemoryStorage();
    storage.set(PROGRESS_KEY, JSON.stringify({ version: PROGRESS_VERSION }));
    expect(readProgress(storage)).toEqual(defaultProgress());

    storage.set(
      PROGRESS_KEY,
      JSON.stringify({ version: PROGRESS_VERSION, completed: [1], hapticsEnabled: true }),
    );
    expect(readProgress(storage)).toEqual(defaultProgress());
  });

  it("refuses newer-version data without throwing", () => {
    const storage = new MemoryStorage();
    storage.set(
      PROGRESS_KEY,
      JSON.stringify({ version: PROGRESS_VERSION + 1, completed: ["x"], hapticsEnabled: false }),
    );
    expect(readProgress(storage)).toEqual(defaultProgress());
  });

  it("survives a storage that throws", () => {
    const storage: KeyValueStorage = {
      getString() {
        throw new Error("boom");
      },
      set() {},
    };
    expect(readProgress(storage)).toEqual(defaultProgress());
  });

  it("records completions once and persists the haptics preference", () => {
    let progress = defaultProgress();
    progress = withCompletion(progress, "level-01");
    progress = withCompletion(progress, "level-01");
    progress = withCompletion(progress, "level-02");
    expect(progress.completed).toEqual(["level-01", "level-02"]);

    progress = withHaptics(progress, false);
    const storage = new MemoryStorage();
    writeProgress(storage, progress);
    expect(readProgress(storage).hapticsEnabled).toBe(false);
  });
});
