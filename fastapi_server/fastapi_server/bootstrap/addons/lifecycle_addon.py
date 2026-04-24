from __future__ import annotations

from fastapi_server.bootstrap.contract import create_loader_report, report_error
from fastapi_server.bootstrap.registry.registry import Addon
from fastapi_server.bootstrap.addons._discover import find_matching_files, import_file

_SUFFIXES = (".lifecycle.py",)
_HOOK_KEYS = ("on_init", "on_startup", "on_shutdown")


def _run(_server, config, ctx):
    report = create_loader_report("lifecycle")
    init_count = 0
    start_count = 0
    stop_count = 0

    for d in config.paths.lifecycles:
        try:
            files = find_matching_files(d, _SUFFIXES)
        except Exception as err:  # noqa: BLE001
            report_error(report, "discover", err, d)
            continue
        report.discovered += len(files)

        for file in files:
            try:
                mod = import_file(file, module_name_prefix="polyglot_lifecycle")
                report.imported += 1
            except Exception as err:  # noqa: BLE001
                report_error(report, "import", err, file)
                continue

            registered_any = False
            on_init = getattr(mod, "on_init", None)
            on_startup = getattr(mod, "on_startup", None)
            on_shutdown = getattr(mod, "on_shutdown", None)

            if callable(on_init):
                ctx.register_init_hook(on_init)
                init_count += 1
                registered_any = True
            if callable(on_startup):
                ctx.register_startup_hook(on_startup)
                start_count += 1
                registered_any = True
            if callable(on_shutdown):
                ctx.register_shutdown_hook(on_shutdown)
                stop_count += 1
                registered_any = True

            if registered_any:
                report.registered += 1
            else:
                report.skipped += 1

    report.details = {
        "init_hooks": init_count,
        "startup_hooks": start_count,
        "shutdown_hooks": stop_count,
    }
    return report


lifecycle_addon = Addon(name="lifecycle", priority=20, run=_run)
