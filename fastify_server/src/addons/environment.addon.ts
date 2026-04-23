import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Addon } from "../registry/registry.js";
import { createLoaderReport, reportError, sortByNumericPrefix } from "../contract/index.js";

const ENV_SUFFIXES = [".env.mjs", ".env.js"];

async function discoverEnvFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const matches: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (ENV_SUFFIXES.some((s) => entry.name.endsWith(s))) {
        matches.push(join(dir, entry.name));
      }
    }
    return sortByNumericPrefix(matches);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return [];
    throw err;
  }
}

export const environmentAddon: Addon = {
  name: "environment",
  priority: 10,
  async run(_server, config, ctx) {
    const report = createLoaderReport("environment");
    const dirs = config.paths.environment;
    for (const dir of dirs) {
      let files: string[] = [];
      try {
        files = await discoverEnvFiles(dir);
      } catch (err) {
        reportError(report, "discover", err, dir);
        continue;
      }
      report.discovered += files.length;
      for (const file of files) {
        try {
          await import(pathToFileURL(file).href);
          report.imported += 1;
          report.registered += 1;
          ctx.logger.debug(`environment: loaded ${file}`);
        } catch (err) {
          reportError(report, "import", err, file);
        }
      }
    }
    return report;
  },
};

export default environmentAddon;
