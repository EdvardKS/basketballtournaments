# SPEC-014 — Plan técnico

## Fases

| Fase | Entregable | Archivos |
|------|------------|----------|
| F1 | Backend: helper `assertAllMatchesCompleted` + auto-revert | `backend/src/services/lifecycle.ts`, `backend/src/services/matches.ts` |
| F2 | Backend: historial endpoint filtra por status OR match_date < today | `backend/src/routes/tournaments.ts` o queryset existente |
| F3 | Frontend: `/dashboard/historial` añade badge "PENDIENTE DE CIERRE" | `frontend/src/islands/AdminHistorial.tsx` |
| F4 | Frontend: admin panel muestra "Crear nuevo torneo" siempre que no haya live | ya implícito, doc only |
| F5 | Tests | `test/spec-014.sh` |

## Lógica clave

### Auto-completar definitivo

En `backend/src/services/matches.ts` después de completar la final + third_place, llamar a:

```ts
await assertAllMatchesCompletedAndSetStatus(tournamentId);
```

`assertAllMatchesCompletedAndSetStatus(tournamentId)`:

```sql
UPDATE tournaments SET status='completed'
 WHERE id = $1
   AND status <> 'completed'
   AND NOT EXISTS (
     SELECT 1 FROM matches
      WHERE tournament_id = $1
        AND status <> 'completed'
   );
```

Idempotente y forward-only.

Si la final completa el winner pero quedan matches pending, el código actual (`matches.ts:181`) marca `completed` prematuramente. **Modificación**: condicionar ese UPDATE a la nueva regla — sólo `completed` si todos los matches están `completed`.

### Historial incluye fechas pasadas

`backend/src/services/tournaments.ts` o un nuevo helper `listHistorical(today)` devuelve:

```sql
SELECT * FROM tournaments
 WHERE deleted_at IS NULL
   AND (
     status = 'completed'
     OR (match_date IS NOT NULL AND match_date::DATE < CURRENT_DATE)
   )
 ORDER BY match_date DESC NULLS LAST, created_at DESC;
```

Endpoint nuevo: `GET /tournaments/historical` o reutilizar `GET /tournaments` (filtrar en frontend). Para no romper consumidores, se añade endpoint nuevo.

### UI

`AdminHistorial.tsx`:
- Recibe ahora `tournaments` ya filtrados por backend.
- Para cada item, si `status !== "completed"`, muestra badge "PENDIENTE DE CIERRE" en color naranja.

### Constitution bump

`sdd/constitution/tournaments.md` pasa a `v1.1.0`:
- Añade invariante: status `completed` requiere que TODOS los matches estén `completed`.
- Añade nota: la página de historial agrupa `completed` + `match_date < today`.

## Test plan

`test/spec-014.sh`:
- Crear torneo con `match_date = ayer` + matches pending → status sigue `active`.
- Listar historial → torneo aparece con badge.
- Completar matches en orden → al cerrar el último, status pasa a `completed`.
- Panel admin → "Crear nuevo torneo" disponible.

## Estimación

- F1: 30 min
- F2-F3: 30 min
- F5: 30 min
- Total: ~90 min.
