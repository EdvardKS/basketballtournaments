# SPEC-015 — Clarifications

## Decisiones cerradas

1. La vista de jornada se activa solo si `matchDate == hoy`.
2. "Hoy" significa día calendario `Europe/Madrid` comparado contra el string
   `YYYY-MM-DD` de `matchDate`.
3. No se activa desde víspera, aunque el código actual tenga lógica visual de
   víspera en `derivePhase`.
4. El cronómetro debe persistirse en servidor.
5. La URL temporal no requiere login.
6. La URL temporal cierra automáticamente el partido al pulsar **Enviar
   resultados**.
7. No hay ratificación previa del admin en SPEC-015.
8. El admin puede corregir después con el flujo existente de editar resultado
   cerrado y recalcular clasificación.
9. Si el admin puntúa desde su cuenta, tampoco hay ratificación adicional.
10. El resultado final directo sigue siendo necesario para partidos llevados en
   otra aplicación.
11. Las eliminatorias siguen apareciendo automáticamente con el mecanismo actual
    cuando se completan todos los grupos.

## Alineación con constitución

- **Matches** debe subir minor: `1.0.0 -> 1.1.0`.
- Motivo del bump: añade capacidad compatible, sesiones temporales de marcador,
  sin cambiar la semántica de `completed`.
- **Tournaments** no necesita cambio de contrato para este spec. SPEC-015 solo
  cambia qué ve el admin en matchday, no el ciclo de vida del torneo.
- Se mantiene el principio de idempotencia: reintentos de submit no deben duplicar
  efectos en `group_members`.
- Se mantiene la inmutabilidad histórica: un match `completed` no se reabre.

## Reglas quirúrgicas para implementación futura

1. No tocar el cálculo de clasificación de grupos salvo para consumir
   `completeMatch`.
2. No tocar `generateKnockout`, `provisionBracket` ni
   `propagateBracketWinner`.
3. No cambiar el contrato de endpoints existentes de partidos.
4. No eliminar ni reemplazar `QuickScoreSheet` o `MatchEditOverlay` sin antes
   demostrar compatibilidad funcional.
5. No introducir dependencia de sesión/cookie en `/score/:token`.
6. No guardar token público en texto plano.
7. No permitir mutaciones por token si el partido está `completed`.
8. No avanzar entre slices si fallan typecheck, build o test funcional del slice.
9. Los endpoints públicos de mutación deben devolver `410` para sesiones no
   mutables conocidas y `404` para tokens inexistentes.
10. El submit debe bloquear sesión y match para evitar carreras entre doble click,
    refresh, dos dispositivos o admin cerrando a la vez.

## Ambigüedades resueltas

### Ratificación del admin

El texto inicial planteaba que el admin recibía el resultado y lo ratificaba.
La decisión final para SPEC-015 es distinta: la persona externa con URL temporal
cierra el partido al enviar resultados.

Razonamiento:

- Reduce pasos durante el torneo.
- Mantiene una vía de corrección admin posterior.
- Evita crear un estado intermedio adicional que pueda bloquear bracket o tablas.

### Fin automático del tiempo

El cronómetro puede llegar a cero y la UI puede mostrar el partido como tiempo
agotado, pero el backend no debe cerrar el partido sin acción explícita de
enviar/finalizar.

Razonamiento:

- Permite corregir una canasta anotada justo antes de acabar.
- Evita cierres accidentales por desfase de reloj.

### Resultado final directo

El modo directo no usa cronómetro. Es el flujo para casos donde el resultado se
ha llevado fuera de la app.

Debe guardar marcador y completar partido con el mismo camino que cualquier
otro cierre admin.

## Riesgos principales

- Doble submit externo que duplique puntos de grupo.
- Token activo que siga mutando tras `completed`.
- Cambio visual de admin que oculte configuración necesaria durante el día del
  torneo.
- Romper la generación automática de eliminatorias al cerrar el último grupo.
- Desincronizar marcador provisional de sesión y marcador persistido en
  `matches`.

## Señales de aceptación operacional

- El torneo completo sigue pasando de inscripción a campeón con el runner actual.
- Un partido de grupo cerrado desde URL temporal incrementa `group_members` una
  sola vez.
- El último partido de grupo cerrado desde URL temporal dispara bracket.
- Un partido de eliminatoria cerrado desde URL temporal propaga ganador.
- Una URL antigua muestra caducada después de cerrar el partido.
