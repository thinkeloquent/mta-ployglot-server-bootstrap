from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Callable, Protocol

from fastapi_server.bootstrap.contract import (
    HookCollector,
    LoaderReport,
    ResolvedBootstrapConfig,
    create_loader_report,
)


class Logger(Protocol):
    def info(self, msg: str, *args: Any) -> None: ...
    def warn(self, msg: str, *args: Any) -> None: ...
    def error(self, msg: str, *args: Any) -> None: ...
    def debug(self, msg: str, *args: Any) -> None: ...


class StdoutLogger:
    def info(self, msg: str, *args: Any) -> None:
        print("[polyglot]", msg, *args)

    def warn(self, msg: str, *args: Any) -> None:
        print("[polyglot:warn]", msg, *args)

    def error(self, msg: str, *args: Any) -> None:
        print("[polyglot:error]", msg, *args)

    def debug(self, msg: str, *args: Any) -> None:
        if os.environ.get("POLYGLOT_DEBUG"):
            print("[polyglot:debug]", msg, *args)


HookFn = Callable[[Any, ResolvedBootstrapConfig], Any]


@dataclass
class RuntimeContext:
    adapter: Any
    config: ResolvedBootstrapConfig
    hooks: HookCollector
    logger: Logger

    def register_init_hook(self, fn: HookFn) -> None:
        self.hooks.init.append(fn)

    def register_startup_hook(self, fn: HookFn) -> None:
        self.hooks.startup.append(fn)

    def register_shutdown_hook(self, fn: HookFn) -> None:
        self.hooks.shutdown.append(fn)

    def get_adapter(self) -> Any:
        return self.adapter

    def get_config(self) -> ResolvedBootstrapConfig:
        return self.config

    def create_report(self, name: str) -> LoaderReport:
        return create_loader_report(name)


def create_context(
    adapter: Any,
    config: ResolvedBootstrapConfig,
    hooks: HookCollector,
    logger: Logger | None = None,
) -> RuntimeContext:
    return RuntimeContext(
        adapter=adapter,
        config=config,
        hooks=hooks,
        logger=logger or StdoutLogger(),
    )
