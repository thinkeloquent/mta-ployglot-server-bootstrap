import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Addon } from "../registry/registry.js";
import type { HookFn } from "../contract/index.js";
import { createLoaderReport, reportError, sortByNumericPrefix } from "../contract/index.js";

const LIFECYCLE_SUFFIXES = [".lifecycle.mjs", ".lifecycle.js"];

async function discoverLifecycleFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const matches: string[] = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (LIFECYCLE_SUFFIXES.some((s) => entry.name.endsWith(s))) {
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

interface LifecycleModule {
  default?: unknown;
  onInit?: HookFn;
  onStartup?: HookFn;
  onShutdown?: HookFn;
}

export const lifecycleAddon: Addon = {
  name: "lifecycle",
  priority: 20,
  async run(_server, config, ctx) {
    const report = createLoaderReport("lifecycle");
    let initCount = 0;
    let startCount = 0;
    let stopCount = 0;

    for (const dir of config.paths.lifecycles) {
      let files: string[] = [];
      try {
        files = await discoverLifecycleFiles(dir);
      } catch (err) {
        reportError(report, "discover", err, dir);
        continue;
      }
      report.discovered += files.length;

      for (const file of files) {
        let mod: LifecycleModule;
        try {
          mod = (await import(pathToFileURL(file).href)) as LifecycleModule;
          report.imported += 1;
        } catch (err) {
          reportError(report, "import", err, file);
          continue;
        }

        const source = (mod.default && typeof mod.default === "object")
          ? (mod.default as LifecycleModule)
          : mod;

        let registeredAny = false;
        if (typeof source.onInit === "function") {
          ctx.registerInitHook(source.onInit);
          initCount += 1;
          registeredAny = true;
        }
        if (typeof source.onStartup === "function") {
          ctx.registerStartupHook(source.onStartup);
          startCount += 1;
          registeredAny = true;
        }
        if (typeof source.onShutdown === "function") {
          ctx.registerShutdownHook(source.onShutdown);
          stopCount += 1;
          registeredAny = true;
        }
        if (registeredAny) report.registered += 1;
        else report.skipped += 1;
      }
    }

    report.details = { init_hooks: initCount, startup_hooks: startCount, shutdown_hooks: stopCount };
    return report;
  },
};

export default lifecycleAddon;
