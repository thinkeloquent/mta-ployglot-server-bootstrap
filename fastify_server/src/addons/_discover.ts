import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sortByNumericPrefix } from "../contract/index.js";

export interface DiscoverResult {
  matched: string[];
  ignored: string[];
}

export async function discoverFiles(
  dir: string,
  suffixes: readonly string[],
): Promise<DiscoverResult> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return { matched: [], ignored: [] };
    throw err;
  }
  const matched: string[] = [];
  const ignored: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (!entry.isFile()) {
      ignored.push(full);
      continue;
    }
    if (suffixes.some((s) => entry.name.endsWith(s))) {
      matched.push(full);
    } else {
      ignored.push(full);
    }
  }
  return { matched: sortByNumericPrefix(matched), ignored };
}
