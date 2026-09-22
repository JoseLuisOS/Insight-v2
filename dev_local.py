#!/usr/bin/env python3
"""Arranca Intersel Insight en desarrollo local, por HTTPS, puerto 4102.

Uso:
    python dev_local.py

Requiere que ya hayas corrido `npm install` y que `.env` tenga las variables
de Supabase rellenas (ver .env.example / docs/ARQUITECTURA.md §5).

Usa `next dev --experimental-https`, que genera un certificado autofirmado
la primera vez (Next.js lo cachea; el navegador va a advertir "no seguro" la
primera vez — es esperado en local, acepta la excepción).
"""
from __future__ import annotations

import os
import shutil
import subprocess
import sys

PORT = 4102
HOST = "localhost"

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))


def find_next_bin() -> str:
    """Locate the local `next` CLI (node_modules/.bin), not a global install."""
    bin_name = "next.cmd" if os.name == "nt" else "next"
    candidate = os.path.join(REPO_ROOT, "node_modules", ".bin", bin_name)
    if os.path.isfile(candidate):
        return candidate

    # Fallback: whatever `next` resolves to on PATH.
    resolved = shutil.which("next")
    if resolved:
        return resolved

    print(
        "No encontré `next` en node_modules/.bin ni en PATH.\n"
        "Corre `npm install` en la raíz del proyecto primero.",
        file=sys.stderr,
    )
    sys.exit(1)


def main() -> None:
    if not os.path.isfile(os.path.join(REPO_ROOT, "package.json")):
        print(f"No parece la raíz del proyecto: {REPO_ROOT}", file=sys.stderr)
        sys.exit(1)

    next_bin = find_next_bin()

    env = os.environ.copy()
    env["PORT"] = str(PORT)

    cmd = [
        next_bin,
        "dev",
        "--experimental-https",
        "--hostname",
        HOST,
        "--port",
        str(PORT),
    ]

    print(f"Arrancando Next.js (Turbopack) en https://{HOST}:{PORT} ...")
    print(f"  cwd: {REPO_ROOT}")
    print("  (Ctrl+C para detener)\n")

    try:
        proc = subprocess.run(cmd, cwd=REPO_ROOT, env=env)
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        sys.exit(0)
    except FileNotFoundError:
        print(f"No pude ejecutar: {next_bin}", file=sys.stderr)
        sys.exit(1)

    sys.exit(proc.returncode)


if __name__ == "__main__":
    main()
