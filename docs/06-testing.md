# Testing

## Smoke tests por sprint

Cada sprint añade un script `test/sprintN.sh` que golpea los endpoints
que acaba de introducir. Todos los scripts usan `curl` y `jq` y
imprimen `[OK]` / `[FAIL]`.

Ejecutar manualmente:

```bash
./test/smoke.sh        # corre todos los sprints secuencialmente
./test/sprint3.sh      # sólo el sprint 3
```

La carpeta `test/` está **gitignored** a propósito: no forman parte
de la build de producción, son utilidades locales.

## Credenciales de prueba

```
admin:   base1 / 123123123
admin:   base2 / 123123123
captain: 600000001 / 123123123    (Lucas Gil)
captain: 600000002 / 123123123    (Mario Ruiz)
player:  600000004 / 123123123    (Adrian Lopez)
```

## Flujos E2E manuales

1. **Login admin → crear torneo → añadir capitanes → arrancar draft →
   hacer picks hasta fin → cerrar draft.**
2. **Login capitán → configurar nombre y WhatsApp → pedir intercambio
   → segundo capitán acepta.**
3. **Admin marca partidos → introduce marcador → la tabla del grupo
   se recalcula.**

## Errores esperados (no bugs)

- Intento de pick fuera de turno → `409 Conflict`.
- Intento de registro doble al mismo torneo → `409 Conflict`.
- Intento de `start draft` con < 2 capitanes → `400 Bad Request`.
- Intento de `resolve` por un capitán que no es el target → `403`.
