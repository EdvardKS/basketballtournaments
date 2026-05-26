# test/playwright/ — Suite TDD E2E (iteración 1)

Suite Playwright en TypeScript que verifica el core de VBL **función a función**
(`unit/`) y **flujo a flujo** (`flow/`), midiendo latencia p95 < 500ms por
endpoint. Coexiste con `backend/test/full_flow.py` (E2E Python original).

## Alcance iteración 1

Cubre los bloques §1–§3 de [../../docs/11-flujo-completo.md](../../docs/11-flujo-completo.md):
arranque, login admin y creación del primer torneo (con `assertSingleLive` y
soft-delete).

Iteraciones siguientes (definidas en
`C:\Users\EdvardKhachatryanSah\.claude\plans\dentro-de-test-hazme-piped-hellman.md`):
inscripciones → capitanes → draft → grupos → eliminatorias → SPEC-014 cierre
real → SPEC-015 score sessions → cromo/share → recovery completo.

## Layout

```
test/playwright/
├── playwright.config.ts        baseURL=http://localhost:4322, reporter custom
├── package.json
├── tsconfig.json
├── support/
│   ├── api.ts                  cliente HTTP + helpers (loginAdmin, createTournament, softDeleteTournament)
│   ├── fixtures.ts             apiAnon / apiAdmin (cookie jar aislado por test)
│   ├── seed.ts                 factories (móvil único, payloads canónicos)
│   └── latency-reporter.ts     agrega p95 por endpoint pattern, falla si >500ms
├── unit/                       1 spec por endpoint
│   ├── auth-login.spec.ts
│   ├── auth-logout.spec.ts
│   ├── auth-recover.spec.ts
│   ├── tournaments-list.spec.ts
│   ├── tournaments-get.spec.ts
│   └── tournaments-create.spec.ts
└── flow/
    └── 01-bootstrap-and-create.spec.ts
```

## Precondición — reset del stack

La suite asume DB limpia + admin bootstrap. Antes de cada run completo:

**Linux/macOS/WSL:**
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

**Windows PowerShell:**
```powershell
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d --build
```

Comprobar que el backend responde:

```bash
curl http://localhost:4010/api/health
```

Variables (defaults match `backend/.env`):

| Var | Default |
|-----|---------|
| `VBL_API_BASE` | `http://localhost:4010` |
| `VBL_APP_BASE` | `http://localhost:4322` |
| `BOOTSTRAP_ADMIN_USERNAME` | `tester` |
| `BOOTSTRAP_ADMIN_PASSWORD` | `test1234` |

## Instalación

```bash
cd test/playwright
npm install
npx playwright install chromium
```

## Ejecutar

```bash
# Suite completa (unit + flow)
npm test

# Sólo unit (función a función)
npm run test:unit

# Sólo flow (flujo completo)
npm run test:flow

# Inspeccionar resultados
npm run report
```

## Criterio de aceptación

1. Exit code 0 (todos los tests verdes).
2. Tabla final `Latency p95 by endpoint pattern` — **todos los patterns con
   `p95 < 500ms`**. Si alguno supera, el reporter degrada la suite a `failed`.
3. Cualquier `// DOC DRIFT:` encontrado durante RED queda comentado en el
   spec; decidir con el owner si fix va a doc o a app.

## Añadir un test nuevo

1. **Función nueva**: añadir `unit/<modulo>-<verbo>.spec.ts`. Header con
   referencias a constitution + spec + ruta del código.
2. **Flujo nuevo**: añadir `flow/0N-<nombre>.spec.ts`. Numerar
   incrementalmente para preservar orden de lectura.
3. Reusar helpers de `support/api.ts` y factories de `support/seed.ts` — no
   duplicar payloads.
