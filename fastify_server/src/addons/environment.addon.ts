import { pathToFileURL } from "node:url";
import type { Addon } from "../registry/registry.js";
import { createLoaderReport } from "../contract/index.js";
import { createLoaderLogger } from "../registry/loader_logger.js";
import { discoverFiles } from "./_discover.js";

const ENV_SUFFIXES = [".env.mjs", ".env.js"] as const;

export const environmentAddon: Addon = {
  name: "environment",
  priority: 10,
  async run(_server, config, ctx) {
    const report = createLoaderReport("environment");
    const log = createLoaderLogger("environment", ctx.logger, report);

    for (const dir of config.paths.environment) {
      let result;
      try {
        result = await discoverFiles(dir, ENV_SUFFIXES);
      } catch (err) {
        log.failed("discover", dir, err);
        continue;
      }
      log.scanDir(dir, result.matched.length, result.ignored.length);
      for (const p of result.ignored) log.ignored(p);
      report.discovered += result.matched.length;

      for (const file of result.matched) {
        try {
          await import(pathToFileURL(file).href);
          report.imported += 1;
          report.registered += 1;
          log.loaded(file);
        } catch (err) {
          log.failed("import", file, err);
        }
      }
    }
    return report;
  },
};

export default environmentAddon;
