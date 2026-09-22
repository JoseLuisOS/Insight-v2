#!/usr/bin/env python3
"""Punto de entrada alternativo (con guion bajo) para controlar el servidor local de Intersel Insight."""

from __future__ import annotations

import runpy
from pathlib import Path

if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "dev-local.py"
    runpy.run_path(str(target), run_name="__main__")
