# PRD - Estado actual (hecho)

## Objetivo
- Gestionar torneos de basketball con flujo completo: registro, draft, equipos, WhatsApp, grupos y partidos.

## Roles
- Player: se registra, se inscribe a torneos, ve info publica y jugadores.
- Captain: participa en draft, configura equipo/WhatsApp, puede solicitar intercambios antes del dia del torneo.
- Admin: crea/edita torneos, inicia/cierra draft, gestiona capitanes, mueve jugadores entre equipos, resuelve intercambios.

## Flujos principales implementados
- Registro/login con roles y sesion persistente.
- Creacion y edicion de torneos con estados: open, draft, setup, scheduled, active, completed.
- Draft:
  - Solo admin puede iniciar.
  - Validaciones: estado correcto, al menos 2 capitanes, jugadores inscritos.
  - Turnos por ronda con orden aleatorio y avance automatico.
  - No se puede draftear capitanes ni jugadores repetidos.
  - Cierre automatico cuando se agotan jugadores drafteables y paso a setup.
- Equipos:
  - Creacion de equipo por capitan en inicio de draft.
  - Configuracion de WhatsApp por capitan y bloqueo hasta completar.
  - Vista de plantillas con jugadores asignados.
- Intercambios:
  - Capitan solicita jugador de otro equipo.
  - Puede ofrecer entre 1 y 3 jugadores propios (sin capitan).
  - Maximo 2 ofertas por jugador objetivo.
  - Aceptar/rechazar por capitan receptor (admin puede resolver).
  - Registro visible de todas las ofertas.
  - Bloqueo automatico cuando llega el dia del torneo (solo capitan).
- Admin realtime:
  - Mover jugadores entre equipos en cualquier momento (excepto torneo completado).
  - Animacion de sobre para jugadores movidos o drafteados.
- UX:
  - Guia de tooltips temporalizados por rol y estado.
  - Filtros de jugadores por rol y stats.
  - PlayerCard estilo carta y animacion de sobre al recibir jugador.

## Arquitectura (resumen)
- Backend: Express + Postgres + Drizzle.
- Frontend: React + Vite + Tailwind + Zustand.
- Estado "realtime": polling cada 10s en vista de torneo.

## Errores manejados
- Validaciones de draft, inscripcion y roles.
- Mensajes claros en UI cuando una accion no esta permitida.

