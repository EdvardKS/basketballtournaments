# Auth — Constitución del servicio

**Versión**: `1.0.0` — 2026-05-22
**Owner**: producto
**Estado**: vigente

## Misión

Identificar al usuario, mantener su sesión, autorizarlo por rol y proteger las mutaciones contra origen cruzado.

## Invariantes

1. **Sesión por cookie** firmada httpOnly + SameSite=Lax. Nunca en localStorage ni headers manuales.
2. **Roles** son tres y sólo tres: `admin`, `captain`, `player`. Cualquier endpoint que requiera autorización declara su rol mínimo.
3. **Recuperación de contraseña** no expone si un email existe (siempre responde 200).
4. **CSRF** — Astro 5 trae `checkOrigin` desactivado a nivel de framework (`astro.config.mjs`) porque el proxy interno no preserva Host. Las protecciones son: cookies SameSite=Lax + middleware backend que valida `Origin` contra una whitelist propia cuando aplica.

## Dependencias

- `players` (tabla raíz) — un usuario = un row.
- `sessions` (`db/init/09_session_table.sql`) — almacena sesiones server-side.

## No-objetivos

- 2FA / OTP — fuera de scope hasta nuevo spec.
- SSO / OAuth — fuera de scope.
- Audit log de logins — fuera de scope (resolverá un futuro spec si surge la necesidad).

## API pública

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/login` | público | inicia sesión por mobile+password |
| POST | `/auth/logout` | sesión | cierra la sesión actual |
| POST | `/auth/recover` | público | inicia flujo de recuperación |
| POST | `/auth/reset` | token | cierra el flujo de recuperación |
| GET | `/auth/session` | sesión | devuelve el `player` actual |

## Historial

```
1.0.0 — 2026-05-22 — Constitución inicial documentando el estado actual del servicio.
```
