from __future__ import annotations

import importlib.util
import os
from dataclasses import dataclass, field
from types import ModuleType
from typing import List, Tuple

from fastapi_server.bootstrap.contract import sort_by_numeric_prefix


@dataclass
class DiscoverResult:
    matched: List[str] = field(default_factory=list)
    ignored: List[str] = field(default_factory=list)


def find_matching_files(directory: str, suffixes: Tuple[str, ...]) -> List[str]:
    return discover_files(directory, suffixes).matched


def discover_files(directory: str, suffixes: Tuple[str, ...]) -> DiscoverResult:
    if not os.path.isdir(directory):
        return DiscoverResult()
    matched: List[str] = []
    ignored: List[str] = []
    for name in os.listdir(directory):
        full = os.path.join(directory, name)
        if not os.path.isfile(full):
            ignored.append(full)
            continue
        if name.endswith(suffixes):
            matched.append(full)
        else:
            ignored.append(full)
    return DiscoverResult(matched=sort_by_numeric_prefix(matched), ignored=ignored)


def import_file(path: str, module_name_prefix: str = "polyglot_dyn") -> ModuleType:
    base = os.path.splitext(os.path.basename(path))[0].replace("-", "_").replace(".", "_")
    module_name = f"{module_name_prefix}.{base}"
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot build import spec for {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module
