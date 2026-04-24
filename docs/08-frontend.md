# Frontend — cómo funciona

El frontend usa **Astro 5** con **React islands** para la
interactividad puntual. El objetivo es HTML rápido desde el servidor
+ JS sólo donde es necesario.

## Estructura

```
frontend/src
├── layouts/
│   └── Main.astro       # shell con <head>, nav y slot principal
├── components/           # .astro reutilizables (navbar, footer, tarjetas estáticas)
├── islands/              # React: montados como client:load o client:idle
├── pages/                # cada .astro es una ruta
│   ├── index.astro       # home (lista torneos)
│   ├── login.astro
│   ├── register.astro
│   ├── tournaments/[id].astro
│   ├── dashboard/
│   │   ├── player.astro
│   │   ├── captain.astro
│   │   └── admin.astro
│   └── docs/index.astro  # muestra la documentación embebida
├── lib/
│   ├── api.ts            # wrapper fetch → /api, maneja cookies y JSON
│   └── session.ts        # helper para leer sesión en SSR
└── styles/global.css     # Tailwind 4 + variables del tema
```

## Ciclo de vida de una página

```
Request ─▶ Astro SSR ─▶ api.ts llama al backend ─▶ renderiza HTML
                        │
                        └─▶ inyecta <script> sólo para islas activas
Hydration ─▶ React monta <IslandX client:load> ─▶ reactivo
```

## Islas React

| Isla                 | Dónde aparece                   | Qué hace                          |
|----------------------|---------------------------------|-----------------------------------|
| `LoginForm`          | `/login`                        | POST a `/api/auth/login`.         |
| `RegisterForm`       | `/register`                     | stats con sliders + POST register.|
| `TournamentRegister` | `tournaments/[id]`              | botón inscripción / desinscripción.|
| `DraftBoard`         | `dashboard/admin` y `captain`   | polling del estado del draft + pick. |
| `AdminTournaments`   | `dashboard/admin`               | CRUD de torneos y capitanes.      |
| `MatchScore`         | dentro de `tournaments/[id]`    | edita marcador en vivo (admin).   |

Todas las islas consumen `lib/api.ts`, que a su vez usa `fetch` con
`credentials: 'include'` para mandar la cookie de sesión.

## Animaciones

Se usan CSS transiciones + `framer-motion` para:

- **Flip card** al revelar un PlayerCard.
- **Sobre abriéndose** cuando un capitán dreafta o recibe un jugador.
- **Pulse + glow** cuando es el turno del equipo del usuario.

Todo con animaciones cortas (< 600ms) para no estorbar la operación.

## Estilo

Tailwind 4 con tres variables clave en `global.css`:

```css
--court-dark: #0b0f1a;
--court-accent: #ff6b1a;
--court-muted: #a0a7b8;
```

Fuente display: **Teko** (Google Fonts) para números y titulares.

## Accesibilidad

- Todos los botones con `aria-label` cuando sólo tienen icono.
- Focus ring visible (`--court-accent`) en inputs y links.
- Roles anunciados en el toast que aparece tras draft pick.
