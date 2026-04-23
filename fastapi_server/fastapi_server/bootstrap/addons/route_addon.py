from __future__ import annotations

from fastapi_server.bootstrap.contract import create_loader_report, report_error
from fastapi_server.bootstrap.registry.registry import Addon
from fastapi_server.bootstrap.addons._discover import find_matching_files, import_file

_SUFFIXES = ("_routes.py", ".routes.py", "_route.py", ".route.py")


def _run(server, config, ctx):
    report = create_loader_report("route")
    adapter = ctx.get_adapter()

    for d in config.paths.routes:
        try:
            files = find_matching_files(d, _SUFFIXES)
        except Exception as err:  # noqa: BLE001
            report_error(report, "discover", err, d)
            continue
        report.discovered += len(files)

        for file in files:
            try:
                mod = import_file(file, module_name_prefix="polyglot_routes")
                report.imported += 1
            except Exception as err:  # noqa: BLE001
                report_error(report, "import", err, file)
                continue

            fn = getattr(mod, "mount", None) or getattr(mod, "router", None) or getattr(mod, "default", None)
            if fn is None:
                report.skipped += 1
                report_error(report, "shape", "module exposes no 'mount', 'router' or 'default'", file)
                continue

            try:
                if callable(fn):
                    adapter.register_routes(server, fn)
                else:
                    # Assume it's already an APIRouter-like object
                    adapter.register_routes(server, lambda _s, _c, _fn=fn: _fn)
                report.registered += 1
            except Exception as err:  # noqa: BLE001
                report_error(report, "register", err, file)

    return report


route_addon = Addon(name="route", priority=30, run=_run)
