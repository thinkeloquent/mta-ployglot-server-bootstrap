import type { LoaderReport } from "../contract/index.js";
import { reportError } from "../contract/index.js";
import type { Logger } from "./ctx.js";

export interface LoaderLogger {
  scanDir(dir: string, matched: number, ignored: number): void;
  ignored(path: string): void;
  loaded(path: string): void;
  registered(path: string, kind?: string): void;
  skipped(path: string, reason: string): void;
  failed(step: string, target: string | undefined, err: unknown): void;
}

export function createLoaderLogger(
  addonName: string,
  logger: Logger,
  report: LoaderReport,
): LoaderLogger {
  const tag = `[${addonName}]`;
  return {
    scanDir(dir, matched, ignored) {
      logger.debug(`${tag} scan ${dir}: matched=${matched} ignored=${ignored}`);
    },
    ignored(path) {
      logger.debug(`${tag} ignored ${path}`);
    },
    loaded(path) {
      logger.debug(`${tag} loaded ${path}`);
    },
    registered(path, kind) {
      logger.debug(`${tag} registered ${path}${kind ? ` (${kind})` : ""}`);
    },
    skipped(path, reason) {
      logger.info(`${tag} skipped ${path}: ${reason}`);
    },
    failed(step, target, err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.info(`${tag} FAIL [${step}]${target ? ` ${target}` : ""}: ${msg}`);
      reportError(report, step, err, target);
    },
  };
}
