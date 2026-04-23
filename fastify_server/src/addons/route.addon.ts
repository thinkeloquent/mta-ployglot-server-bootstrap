import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Addon } from "../registry/registry.js";
import { createLoaderReport, reportError, sortByNumericPrefix } from "../contract/index.js";

const ROUTE_SUFFIXES = [".routes.mjs", ".routes.js", ".route.mjs", ".route.js"];

async function discoverRouteFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const matches: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (ROUTE_SUFFIXES.some((s) => entry.name.endsWith(s))) {
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

export const routeAddon: Addon = {
  name: "route",
  priority: 30,
  async run(server, config, ctx) {
    const report = createLoaderReport("route");
    const adapter = ctx.getAdapter();

    for (const dir of config.paths.routes) {
      let files: string[] = [];
      try {
        files = await discoverRouteFiles(dir);
      } catch (err) {
        reportError(report, "discover", err, dir);
        continue;
      }
      report.discovered += files.length;

      for (const file of files) {
        let mod: { default?: unknown; mount?: unknown };
        try {
          mod = (await import(pathToFileURL(file).href)) as { default?: unknown; mount?: unknown };
          report.imported += 1;
        } catch (err) {
          reportError(report, "import", err, file);
          continue;
        }
        const fn = (mod.default ?? mod.mount) as
          | ((s: unknown, c: unknown) => void | Promise<void>)
          | undefined;
        if (typeof fn !== "function") {
          report.skipped += 1;
          reportError(report, "shape", `module has no default or mount function`, file);
          continue;
        }
        try {
          await adapter.registerRoutes(server, fn as never);
          report.registered += 1;
        } catch (err) {
          reportError(report, "register", err, file);
        }
      }
    }

    return report;
  },
};

export default routeAddon;
