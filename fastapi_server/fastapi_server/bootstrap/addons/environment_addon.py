from __future__ import annotations

from fastapi_server.bootstrap.contract import create_loader_report, report_error
from fastapi_server.bootstrap.registry.registry import Addon
from fastapi_server.bootstrap.addons._discover import find_matching_files, import_file

_SUFFIXES = (".env.py",)


def _run(_server, config, ctx):
    report = create_loader_report("environment")
    for d in config.paths.environment:
        try:
            files = find_matching_files(d, _SUFFIXES)
        except Exception as err:  # noqa: BLE001
            report_error(report, "discover", err, d)
            continue
        report.discovered += len(files)
        for file in files:
            try:
                import_file(file, module_name_prefix="polyglot_env")
                report.imported += 1
                report.registered += 1
                ctx.logger.debug(f"environment: loaded {file}")
            except Exception as err:  # noqa: BLE001
                report_error(report, "import", err, file)
    return report


environment_addon = Addon(name="environment", priority=10, run=_run)
