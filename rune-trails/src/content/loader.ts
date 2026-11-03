import { Level, ParseResult, parseLevel } from "./schema";
import { LevelValidationIssue, validateLevel } from "./validator";

export interface RejectedLevel {
  levelId: string;
  issues: LevelValidationIssue[];
}

export interface LoadedLevels {
  levels: Level[];
  rejected: RejectedLevel[];
}

export interface LoadOptions {
  budgetMs?: number;
}

function parseInput(input: unknown): ParseResult {
  if (typeof input === "string") {
    try {
      return parseLevel(JSON.parse(input));
    } catch {
      return {
        ok: false,
        errors: [{ path: "$", reason: "level is not valid JSON" }],
      };
    }
  }
  return parseLevel(input);
}

/**
 * Parses and validates a set of level documents. Invalid levels are skipped and
 * reported rather than thrown, so a bad document can never crash the app.
 */
export function loadLevels(inputs: unknown[], options: LoadOptions = {}): LoadedLevels {
  const levels: Level[] = [];
  const rejected: RejectedLevel[] = [];

  inputs.forEach((input, index) => {
    const parsed = parseInput(input);
    if (!parsed.ok) {
      const levelId =
        typeof input === "object" && input !== null && "id" in input
          ? String((input as { id: unknown }).id)
          : `#${index}`;
      rejected.push({
        levelId,
        issues: parsed.errors.map((error) => ({
          levelId,
          reason: `${error.path}: ${error.reason}`,
        })),
      });
      return;
    }

    const result = validateLevel(parsed.level, { budgetMs: options.budgetMs });
    if (!result.ok) {
      rejected.push({ levelId: parsed.level.id, issues: result.issues });
      return;
    }
    levels.push(parsed.level);
  });

  return { levels, rejected };
}
