# SPEC-014 — UI

## `/dashboard/historial`

Cambios mínimos:
- Datasource: `GET /tournaments/historical` (en vez de `GET /tournaments` filtrado en cliente).
- Render por item: si `pendingClose=true`, badge naranja "PENDIENTE DE CIERRE" junto al nombre + tooltip "Falta puntuar matches".

## `/dashboard/admin`

Sin cambios visibles — el botón "+ Nuevo torneo" ya estaba siempre presente; el endpoint POST sigue protegido por `assertSingleLive`. Tras este spec, la única gating es: si TODOS los torneos están `completed`, crear pasa; si hay UN torneo con cualquier otro status, devuelve `409 ONE_ACTIVE_ONLY`.

El admin tendrá que cerrar el torneo activo (completar todos sus matches) antes de crear el siguiente.

## Mensaje al admin

Cuando crea torneo y se devuelve `ONE_ACTIVE_ONLY`:

> Ya hay un torneo en curso. Termina de puntuar sus matches para cerrarlo automáticamente, o márcalo como completed manualmente desde el panel.
