import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadLevels } from "./loader";

function main(): number {
  const levelsDir = resolve(process.cwd(), "src/content/levels");
  let files: string[];
  try {
    files = readdirSync(levelsDir).filter((name) => name.endsWith(".json"));
  } catch (error) {
    console.error(`Could not read levels directory: ${levelsDir}`);
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  files.sort();
  const documents: unknown[] = [];
  for (const file of files) {
    const full = join(levelsDir, file);
    try {
      documents.push(JSON.parse(readFileSync(full, "utf8")));
    } catch (error) {
      console.error(`FAIL ${file}: not valid JSON (${error instanceof Error ? error.message : String(error)})`);
      return 1;
    }
  }

  const { levels, rejected } = loadLevels(documents);

  if (rejected.length > 0) {
    for (const item of rejected) {
      for (const issue of item.issues) {
        const script =
          issue.scriptIndex !== undefined ? ` (script index ${issue.scriptIndex})` : "";
        console.error(`FAIL ${item.levelId}${script}: ${issue.reason}`);
      }
    }
    console.error(`\n${rejected.length} level(s) failed validation.`);
    return 1;
  }

  console.log(`Validated ${levels.length} level(s): ${levels.map((l) => l.id).join(", ")}`);
  return 0;
}

process.exit(main());
