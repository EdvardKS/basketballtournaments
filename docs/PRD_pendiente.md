# PRD - Pendiente (test y ajustes)

## Pendiente de test end-to-end
- Inicio de draft con base de datos ya existente y sin migraciones (debe pasar sin error).
- Draft completo con multiples rondas y cierre automatico.
- Admin mueve jugadores entre equipos en draft activo y en setup.
- Flujo de intercambios: oferta, rechazo, nueva oferta y aceptacion.
- Limite de 2 ofertas por jugador objetivo.
- Bloqueo de ofertas el dia del torneo (zona horaria).
- Animacion de sobre en draft y en intercambios desde varios roles.
- Visualizacion del historial de ofertas para todos los roles.

## Pendiente tecnico / riesgos
- Migracion de base de datos para columnas nuevas en teams y tabla trade_offers.
- Consistencia en clientes sin sesion (rosters filtrados).
- Confirmar que el orden aleatorio por ronda es el esperado (no snake).
- Revisar manejo de errores en API para mensajes mas especificos.

## Mejoras futuras sugeridas
- Websockets para tiempo real real (evitar polling).
- Notificaciones cuando llega una nueva oferta o se resuelve una existente.
- Historial de cambios admin (auditoria).
- Pantalla dedicada para intercambios.
- Tests automatizados (API y UI).

