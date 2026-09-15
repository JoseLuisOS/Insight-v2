# logs/

Logfiles detallados de sesiones y tareas de desarrollo. A diferencia de
[`../docs/LOG.md`](../docs/LOG.md) (bitácora resumida, versionada), aquí van salidas crudas y
notas largas que no conviene meter en la bitácora principal.

## Convención de nombres

```
logs/YYYY-MM-DD_<tema>.md        # log de una sesión o tarea
logs/YYYY-MM-DD_<tema>.log       # salida cruda (build, tests, migraciones)
```

Ejemplos:
- `logs/2026-06-27_fase0-setup.md`
- `logs/2026-06-28_rls-isolation-tests.log`

## Política de versionado

- Los `.md` de log **se versionan** (forman parte del historial de aprendizajes).
- Los `.log` crudos están **gitignored** por defecto (ver `.gitignore`); súbelos sólo si
  aportan valor duradero.
- **Nunca** escribas secretos, tokens, claves de Supabase ni connection strings en un log.

## Resumen vs. detalle

Al cerrar una tarea: el **resumen** va a `docs/LOG.md`, los **aprendizajes** a
`docs/APRENDIZAJES.md`, y el **detalle crudo** (si hace falta) se queda aquí.
