# Guia de Testeo - Villena Basket League

Este documento describe paso a paso como probar todas las funcionalidades de la aplicacion.

---

## CREDENCIALES DE PRUEBA

### Administrador
- **Usuario:** `edvardks`
- **Contrasena:** `SX515wifi`

### Capitanes (usar numero movil + contrasena)
| Nombre | Movil | Contrasena |
|--------|-------|------------|
| Carlos 'El Capitan' Martinez | 600100001 | cap001 |
| Miguel Angel Lopez | 600100002 | cap002 |
| Adrian 'El Muro' Garcia | 600100003 | cap003 |
| Pablo Sanchez Ruiz | 600100004 | cap004 |
| Roberto 'Flash' Vega | 600100005 | cap005 |
| Fernando Torres Diaz | 600100006 | cap006 |
| Alex 'El Deslizador' Rivera | 600555001 | pass123 |

---

## PARTE 1: NAVEGACION PUBLICA (Sin iniciar sesion)

### Test 1.1: Pagina Principal
1. Abre la aplicacion (pagina inicial `/`)
2. **Verifica:**
   - Se muestra el titulo "Villena Basket League"
   - Hay botones para ver Torneos y Jugadores
   - Aparece opcion de Iniciar Sesion en el menu

### Test 1.2: Ver Lista de Torneos
1. Haz clic en "Torneos" en el menu o boton principal
2. **Verifica:**
   - Se muestran los torneos organizados por estado
   - Estados visibles: Abiertos, En Draft, Activos, Completados
   - Cada torneo muestra: nombre, fecha, ubicacion, equipos max

### Test 1.3: Ver Detalle de Torneo
1. Haz clic en cualquier torneo (ej: "Copa Fallas 2025")
2. **Verifica:**
   - Se muestra la descripcion del torneo
   - Se ven los jugadores inscritos (si los hay)
   - Los numeros de movil estan ocultos (***) porque no has iniciado sesion

### Test 1.4: Ver Lista de Jugadores
1. Haz clic en "Jugadores" en el menu
2. **Verifica:**
   - Se muestran tarjetas estilo FIFA de todos los jugadores
   - Cada tarjeta muestra: foto/icono, nombre, estadisticas, overall
   - Los numeros de movil estan ocultos (***) para usuarios no autenticados
   - Los colores de las tarjetas varian segun nivel:
     - Dorado: ELITE (85+)
     - Morado: PRO (75-84)
     - Azul: SEMI (65-74)
     - Verde: AMATEUR (<65)

### Test 1.5: Registrarse como Jugador
1. Haz clic en "Inscribirse" o "Registrarse"
2. Completa el formulario:
   - Nombre: Tu nombre de prueba
   - Movil: Un numero unico (ej: 699123456)
   - Foto: **OBLIGATORIA** - sube una imagen
   - Estadisticas: Ajusta los 6 sliders (Ritmo, Tiro, Pase, Regate, Defensa, Fisico)
3. **Verifica:**
   - El boton de registro solo se activa cuando hay foto
   - Al registrar, se muestra mensaje de exito
   - Tu tarjeta aparece en la lista de jugadores

---

## PARTE 2: FUNCIONES DE ADMINISTRADOR

### Test 2.1: Iniciar Sesion como Admin
1. Haz clic en "Iniciar Sesion"
2. Introduce:
   - Usuario: `edvardks`
   - Contrasena: `SX515wifi`
3. **Verifica:**
   - Redirige al panel de administracion
   - Aparece "Admin Dashboard" o similar
   - El menu muestra opciones adicionales

### Test 2.2: Crear Nuevo Torneo
1. En el panel admin, busca "Crear Torneo" o "Nuevo Torneo"
2. Completa:
   - Nombre: "Torneo de Prueba"
   - Fecha: Fecha futura
   - Ubicacion: "Polideportivo Municipal"
   - Descripcion: "Torneo de prueba para testeo"
   - Equipos maximos: 4
3. **Verifica:**
   - El torneo aparece en la lista con estado "open" (abierto)

### Test 2.3: Ver y Gestionar Jugadores
1. Navega a la seccion de Jugadores en el admin
2. **Verifica:**
   - Puedes ver todos los jugadores con sus moviles visibles
   - Hay opciones para editar/eliminar jugadores

### Test 2.4: Promover Jugador a Capitan
1. Selecciona un jugador normal (no capitan)
2. Busca opcion "Promover a Capitan"
3. Introduce una contrasena para el nuevo capitan
4. **Verifica:**
   - El jugador ahora tiene rol "captain"
   - Aparece icono de capitan en su tarjeta

### Test 2.5: Cambiar Estado de Torneo
1. Selecciona un torneo en estado "open"
2. Cambia el estado a "draft"
3. **Verifica:**
   - El torneo ahora aparece en seccion "En Draft"

### Test 2.6: Crear Equipos para Torneo
1. Selecciona un torneo en estado "draft"
2. Crea equipos asignando capitanes:
   - Equipo 1: Nombre + Capitan 1
   - Equipo 2: Nombre + Capitan 2
3. **Verifica:**
   - Los equipos aparecen listados en el torneo
   - Cada equipo tiene su capitan asignado

### Test 2.7: Cerrar Sesion
1. Haz clic en "Cerrar Sesion"
2. **Verifica:**
   - Vuelves a la pagina publica
   - Ya no ves opciones de admin
   - Los moviles vuelven a estar ocultos (***)

---

## PARTE 3: FUNCIONES DE CAPITAN

### Test 3.1: Iniciar Sesion como Capitan
1. Haz clic en "Iniciar Sesion"
2. Introduce (ejemplo con Carlos):
   - Movil: `600100001`
   - Contrasena: `cap001`
3. **Verifica:**
   - Redirige al panel de capitan
   - Muestra informacion de tu equipo (si tienes asignado)

### Test 3.2: Ver Tu Equipo
1. En el panel de capitan, busca "Mi Equipo"
2. **Verifica:**
   - Se muestra el nombre de tu equipo
   - Lista de jugadores ya drafteados (si los hay)
   - Tu rol como capitan esta visible

### Test 3.3: Cerrar Sesion de Capitan
1. Haz clic en "Cerrar Sesion"
2. **Verifica:**
   - Vuelves a la pagina publica

---

## PARTE 4: SISTEMA DE DRAFT (Flujo Completo)

Este es el flujo completo de un draft. Requiere preparacion previa.

### Preparacion (como Admin):
1. Inicia sesion como admin (`edvardks` / `SX515wifi`)
2. Crea o selecciona un torneo en estado "open"
3. Asegurate de que hay jugadores inscritos en el torneo
4. Cambia el estado del torneo a "draft"
5. Crea al menos 2 equipos con diferentes capitanes
6. Inicia el draft (boton "Iniciar Draft")

### Test 4.1: Verificar Orden de Turnos
1. Como admin, observa el estado del draft
2. **Verifica:**
   - Se muestra que equipo tiene el turno actual
   - Se muestra la ronda actual (1, 2, 3...)
   - El orden de equipos fue aleatorizado

### Test 4.2: Draftear como Capitan (En su turno)
1. Cierra sesion del admin
2. Inicia sesion como el capitan que tiene el turno
3. Intenta seleccionar un jugador disponible
4. **Verifica:**
   - Puedes seleccionar porque es tu turno
   - El jugador se anade a tu equipo
   - El turno pasa al siguiente capitan

### Test 4.3: Intentar Draftear Fuera de Turno
1. Inicia sesion como un capitan que NO tiene el turno
2. Intenta seleccionar un jugador
3. **Verifica:**
   - Aparece error "No es tu turno"
   - No se anade ningun jugador

### Test 4.4: Finalizar Draft (como Admin)
1. Inicia sesion como admin
2. Haz clic en "Finalizar Draft"
3. **Verifica:**
   - El torneo cambia a estado "active"
   - Los equipos mantienen sus jugadores

---

## PARTE 5: VERIFICACIONES ADICIONALES

### Test 5.1: Seguridad de Moviles
1. Sin iniciar sesion, ve a Jugadores
2. **Verifica:** Todos los moviles muestran "***"
3. Inicia sesion como admin o capitan
4. **Verifica:** Los moviles son visibles

### Test 5.2: Iconos de Rol (sin foto)
1. Observa jugadores sin foto
2. **Verifica:**
   - Admin: Icono de escudo con check (rojo)
   - Capitan: Icono de escudo (ambar)
   - Jugador: Icono de persona (gris)

### Test 5.3: Colores de Nivel
1. Observa las tarjetas de jugadores
2. **Verifica:**
   - Overall 85+: Borde/gradiente dorado, etiqueta "ELITE"
   - Overall 75-84: Borde morado, etiqueta "PRO"
   - Overall 65-74: Borde azul, etiqueta "SEMI"
   - Overall <65: Borde verde, etiqueta "AMATEUR"

---

## RESUMEN DE RUTAS

| Ruta | Descripcion | Requiere Login |
|------|-------------|----------------|
| `/` | Pagina principal | No |
| `/tournaments` | Lista de torneos | No |
| `/tournaments/:id` | Detalle de torneo | No |
| `/players` | Lista de jugadores | No |
| `/register` | Registro de jugador | No |
| `/login` | Iniciar sesion | No |
| `/admin` | Panel de administracion | Admin |
| `/captain` | Panel de capitan | Capitan |

---

## PROBLEMAS COMUNES

1. **"No puedo registrarme"**
   - Verifica que subiste una foto (es obligatoria)
   - Verifica que el numero de movil no existe ya

2. **"No veo las opciones de admin"**
   - Verifica que iniciaste sesion como `edvardks`

3. **"No puedo draftear"**
   - Verifica que el torneo esta en estado "draft"
   - Verifica que es tu turno (si eres capitan)
   - El admin puede draftear en cualquier momento

4. **"Los moviles aparecen como ***"**
   - Es correcto si no has iniciado sesion
   - Inicia sesion para ver los moviles
