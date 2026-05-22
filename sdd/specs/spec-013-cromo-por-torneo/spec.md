# SPEC-013 — Especificación funcional

## Historia de usuario

> Como jugador de VBL, quiero un cromo único por cada torneo en el que me he inscrito, con la paleta de ese torneo, con mis stats congeladas de ese año, y poder navegar mis cromos antiguos en un carousel para compartir el que esté viendo.

## Reglas

1. **Cromo válido sii** existe `tournament_registrations(player_id, tournament_id)` con `registered_at` anterior a `tournament.inscription_end` (si está definida).
2. **Cierre del torneo bloquea nuevos cromos** — un jugador que se inscribe después de `status='completed'` no recibe cromo de ese torneo (en la práctica el endpoint de inscripción ya impide registrarse en torneos cerrados).
3. **Header del cromo** muestra:
   - Línea 1: `tournament.name` en uppercase, letter-spacing 0.3em, 14px.
   - Línea 2: `tournament.year` en Bebas Neue, 32px.
   - El año se deriva de `tournament.date` (`YYYY-MM-DD`); fallback `created_at`.
4. **Paleta** = fila de `tournament_themes` apuntada por `tournaments.theme_id`. Si no existe aún, el endpoint `GET /tournaments/:id/theme` la crea reservando el `catalog_index` libre más bajo.
5. **Stats** —
   - `tournament.status == 'completed'` → leer `player_skill_snapshots WHERE tournament_id AND player_id`. Si no hay snapshot, fallback a stats actuales.
   - Otros estados → stats actuales de `players`.
6. **Versión del cromo** = ordinal cronológico del jugador en torneos donde participó. Primer torneo = `v1`, segundo = `v2`, etc. Se calcula ordenando por `tournament.date` (asc) + `tournament.created_at` como tiebreaker.
7. **Vista por defecto** — el dashboard del jugador (`/dashboard/player` y `/dashboard/captain`) muestra el cromo del torneo **más reciente** del jugador.
8. **Carousel manual** — botones ← → permiten navegar a los anteriores, en orden cronológico descendente. Indicadores de posición debajo (dots con `theme.frame` del torneo).
9. **Share opera sobre el cromo activo** — `CromoShare` exporta el nodo DOM con `data-active="true"`, no el `#cromo-root` genérico.
10. **Sin inscripciones** — si el jugador no tiene cromos, se muestra `CromoEmptyState` con CTA según haya o no torneo abierto.

## Criterios de aceptación

| # | Escenario | Resultado esperado |
|---|-----------|---------------------|
| AC1 | Jugador sin inscripciones abre su dashboard | Ve `CromoEmptyState` con CTA "Inscríbete al torneo de XYZ" si hay torneo open, o "Espera al próximo torneo" si no. |
| AC2 | Jugador inscrito en torneo `open` abre su dashboard | Ve el cromo con el theme del torneo y las stats actuales (no congeladas). |
| AC3 | Jugador con 3 torneos (2022, 2025, 2026) abre su dashboard | Ve por defecto el cromo de 2026. Carousel ← → permite ir a 2025 y 2022. Los dots muestran 3 posiciones con los colores de los 3 themes. |
| AC4 | Torneo pasa a `completed` y el jugador sube `overall` después | El cromo de ese torneo en el carousel sigue mostrando las stats del snapshot al cierre. El cromo del torneo abierto (si lo hay) sí refleja el cambio. |
| AC5 | Crear dos torneos consecutivos y abrir su theme endpoint | Reciben `catalog_index` distintos (0 y 1) y por tanto palette distintas. La UNIQUE constraint impide colisiones. |
| AC6 | Jugador en el carousel posicionado en el cromo de 2022, pulsa "Descargar PNG" | El PNG descargado es el cromo de 2022 (header + theme + stats de 2022), no el de 2026. |
| AC7 | Catálogo de paletas se agota | `GET /tournaments/:id/theme` devuelve `409 THEME_CATALOG_EXHAUSTED`. Admin extiende el catálogo vía `POST /admin/tournament-themes/seed`. |
| AC8 | Migración aplicada sobre DB con torneos existentes | Cada torneo recibe `theme_id` único; ningún torneo queda sin theme. |
| AC9 | Animación del carousel | Las transiciones entre slides usan GSAP (`gsap.to`) con duración 0.45s y ease `power2.out`. No hay flash ni jump visible. |
| AC10 | Compartir vía WhatsApp en móvil | Web Share API recibe el `File` del cromo activo, no de `#cromo-root` por defecto. |

## Aspectos de calidad

- **Performance** — el endpoint `/players/:id/cromos` debe responder en <300ms con 10 torneos.
- **Accesibilidad** — botones del carousel con `aria-label`, indicadores con `role="tablist"`.
- **Mobile** — carousel funciona con swipe (scroll-snap nativo) + clicks en flechas.
- **Sin race** — abrir 5 torneos en paralelo (5 requests a `/tournaments/:id/theme` simultáneos) no genera dos `catalog_index` iguales (lockear vía `SELECT ... FOR UPDATE` o `INSERT ... ON CONFLICT DO NOTHING` + retry).

## Out of scope

- Permitir al admin elegir manualmente la paleta de un torneo (queda como futuro spec).
- Animar el cromo (foil con shimmer continuo) — fuera de scope por pixel parity.
- Compartir un "cromo combinado" de varios años — fuera de scope.
