#!/usr/bin/env python3
"""Controla el servidor local de Intersel Insight.

Uso:
  python dev-local.py                         # inicia y deja la consola conectada
  python dev-local.py start --detach         # inicia en segundo plano y espera a que responda
  python dev-local.py start --http           # fuerza HTTP en vez de HTTPS (por defecto usa HTTPS)
  python dev-local.py stop                    # detiene el servicio guardado
  python dev-local.py restart                 # detiene, inicia en segundo plano y espera
  python dev-local.py status                  # muestra estado, PID y URL

Por defecto usa HTTPS (certificado autofirmado de `next dev --experimental-https`,
ver docs/ARQUITECTURA.md §5) en el puerto de `.env` (`PORT`, hoy 4102) — es lo que
Supabase Auth espera para los links de confirmación/reset (NEXT_PUBLIC_SITE_URL).

Los procesos en segundo plano escriben en logs/dev-local/app.log y guardan su
PID en logs/dev-local/app.pid. En Windows se usa taskkill para cerrar todo el
árbol de npm/Next.js, evitando procesos huérfanos.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
LOG_DIR = ROOT / "logs" / "dev-local"
LOG_PATH = LOG_DIR / "app.log"
PID_PATH = LOG_DIR / "app.pid"
IS_WINDOWS = sys.platform.startswith("win")
APP_NAME = "Intersel Insight"


def dotenv_port() -> int:
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.lstrip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "PORT":
                try:
                    return int(value.strip().strip('"').strip("'"))
                except ValueError as error:
                    raise RuntimeError("PORT en .env debe ser un entero.") from error
    return 4102


def executable(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"No se encontró '{name}' en el PATH.")
    return found


def load_pid_file() -> dict[str, Any] | None:
    try:
        return json.loads(PID_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def save_pid_file(process: subprocess.Popen[str], host: str, port: int, scheme: str) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    PID_PATH.write_text(
        json.dumps({"pid": process.pid, "host": host, "port": port, "scheme": scheme}),
        encoding="utf-8",
    )


def clear_pid_file() -> None:
    try:
        PID_PATH.unlink()
    except FileNotFoundError:
        pass


def process_exists(pid: int) -> bool:
    if IS_WINDOWS:
        result = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"], capture_output=True, text=True, check=False)
        return str(pid) in result.stdout
    try:
        os.kill(pid, 0)
    except (ProcessLookupError, PermissionError):
        return False
    return True


def port_in_use(host: str, port: int) -> bool:
    # socket.create_connection() resolves `host` via getaddrinfo and tries
    # whichever family actually works — a plain AF_INET socket would miss a
    # server bound to ::1 (which is what `next dev --hostname localhost`
    # does on this stack), making this always report "not ready".
    try:
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except OSError:
        return False


def free_port(port: int) -> None:
    if IS_WINDOWS:
        output = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=False).stdout
        pids = {
            line.split()[-1]
            for line in output.splitlines()
            if "LISTENING" in line and len(line.split()) >= 5 and line.split()[1].rsplit(":", 1)[-1] == str(port)
        }
        for pid in pids:
            print(f"Liberando el puerto {port} (PID {pid})…")
            subprocess.run(["taskkill", "/T", "/F", "/PID", pid], check=False)
        return

    output = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True, check=False).stdout
    for pid in output.split():
        print(f"Liberando el puerto {port} (PID {pid})…")
        os.kill(int(pid), signal.SIGTERM)


def stop_pid(pid: int) -> None:
    if not process_exists(pid):
        return
    if IS_WINDOWS:
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(pid)], check=False)
    else:
        os.killpg(os.getpgid(pid), signal.SIGTERM)


def wait_until_ready(host: str, port: int, scheme: str, timeout: float) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if port_in_use(host, port):
            break
        time.sleep(0.25)
    else:
        return False

    url = f"{scheme}://{host}:{port}/"
    ssl_context = ssl._create_unverified_context() if scheme == "https" else None
    while time.monotonic() < deadline:
        try:
            remaining = min(30.0, max(5.0, deadline - time.monotonic()))
            with urllib.request.urlopen(url, timeout=remaining, context=ssl_context) as response:
                response.read(1)
                return True
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError):
            time.sleep(0.5)
    return False


def read_service() -> tuple[dict[str, Any] | None, bool]:
    info = load_pid_file()
    if not info or not isinstance(info.get("pid"), int):
        return info, False
    return info, process_exists(info["pid"])


def stop_service() -> int:
    info, running = read_service()
    if not info:
        print(f"{APP_NAME} no tiene un proceso registrado.")
        return 0
    if running:
        print(f"Deteniendo {APP_NAME} (PID {info['pid']})…")
        stop_pid(info["pid"])
        deadline = time.monotonic() + 10
        while process_exists(info["pid"]) and time.monotonic() < deadline:
            time.sleep(0.2)
    clear_pid_file()
    print(f"{APP_NAME} detenida." if running else "El proceso registrado ya no estaba activo.")
    return 0


def start_service(args: argparse.Namespace, detached: bool) -> int:
    info, running = read_service()
    if running:
        scheme = info.get("scheme", "https")
        print(f"{APP_NAME} ya está activa (PID {info['pid']}) en {scheme}://{info['host']}:{info['port']}")
        return 0
    clear_pid_file()

    if port_in_use(args.host, args.port):
        if not args.free_port:
            raise RuntimeError(f"El puerto {args.port} ya está en uso. Usa --free-port o detén el proceso que lo ocupa.")
        free_port(args.port)

    npm_name = "npm.cmd" if IS_WINDOWS else "npm"
    npm = executable(npm_name)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOG_PATH.open("a", encoding="utf-8", errors="replace", buffering=1)
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | (subprocess.CREATE_NO_WINDOW if detached and IS_WINDOWS else 0) if IS_WINDOWS else 0
    scheme = "http" if args.http else "https"
    script = "dev" if args.http else "dev:https"
    process = subprocess.Popen(
        [npm, "run", script, "--", "--hostname", args.host, "--port", str(args.port)],
        cwd=ROOT,
        stdout=log_file if detached else subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        start_new_session=not IS_WINDOWS,
        creationflags=creationflags,
    )
    save_pid_file(process, args.host, args.port, scheme)

    if not detached:
        assert process.stdout is not None
        try:
            for line in process.stdout:
                print(line, end="")
                log_file.write(line)
        except KeyboardInterrupt:
            print(f"\nDeteniendo {APP_NAME}…")
            stop_pid(process.pid)
        finally:
            clear_pid_file()
            log_file.close()
        return process.wait()

    log_file.close()
    print(f"Iniciando {APP_NAME} en {scheme}://{args.host}:{args.port}…")
    if not wait_until_ready(args.host, args.port, scheme, args.timeout):
        print(f"La app no respondió en {args.timeout:g}s. Revisa {LOG_PATH}.", file=sys.stderr)
        return 1
    print(f"{APP_NAME} levantada (PID {process.pid}).")
    print(f"Logs: {LOG_PATH}")
    return 0


def status_service() -> int:
    info, running = read_service()
    if not info:
        print(f"{APP_NAME} detenida (sin PID registrado).")
        return 0
    state = "activa" if running else "detenida (PID obsoleto)"
    scheme = info.get("scheme", "https")
    print(f"{APP_NAME} {state} — PID {info['pid']} — {scheme}://{info['host']}:{info['port']}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", nargs="?", choices=("start", "stop", "restart", "status"), default="start")
    parser.add_argument("--detach", action="store_true", help="deja la app en segundo plano y devuelve el prompt cuando responde")
    parser.add_argument("--port", type=int, default=dotenv_port())
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--http", action="store_true", help="fuerza HTTP en vez de HTTPS (por defecto usa HTTPS con certificado autofirmado)")
    parser.add_argument("--timeout", type=float, default=60, help="segundos máximos de espera para que responda la app")
    parser.add_argument("--free-port", action="store_true", help="termina el proceso que ocupa el puerto antes de iniciar")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if not (1 <= args.port <= 65535):
        raise RuntimeError("--port debe estar entre 1 y 65535")
    if args.timeout <= 0:
        raise RuntimeError("--timeout debe ser mayor que cero")
    if not (ROOT / "package.json").exists():
        raise RuntimeError(f"No se encontró package.json en {ROOT}")

    if args.command == "stop":
        return stop_service()
    if args.command == "status":
        return status_service()
    if args.command == "restart":
        stop_service()
        return start_service(args, detached=True)
    return start_service(args, detached=args.detach)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nOperación cancelada (Ctrl+C).", file=sys.stderr)
        info = load_pid_file()
        if info and isinstance(info.get("pid"), int) and process_exists(info["pid"]):
            print(
                f"{APP_NAME} puede seguir iniciando en segundo plano (PID {info['pid']}). "
                "Usa 'python dev-local.py status' para comprobarlo.",
                file=sys.stderr,
            )
        raise SystemExit(130)
    except (RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
