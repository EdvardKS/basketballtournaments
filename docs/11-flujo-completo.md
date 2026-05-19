# Roadmap del torneo · explicación para todos los públicos

Esto cuenta, paso a paso y sin tecnicismos, cómo funciona hoy la
aplicación desde que el admin la enciende hasta que llega el día del
partido. Pensado para que cualquier persona (no hace falta saber
programar) entienda el flujo y sepa qué pasa "por detrás" en cada
botón.

---

## 1. Encender la aplicación

1. El admin arranca la web en su servidor.
   1. Indica si quiere datos de ejemplo o empezar de cero (DB vacía).
   2. Define un usuario administrador inicial (nombre y contraseña).
2. La aplicación prepara la base de datos sola al arrancar.
   1. Crea las tablas necesarias si faltan.
   2. Mete los datos de ejemplo si así se pidió.
   3. Garantiza que el usuario administrador existe.
3. Cuando todo está listo, queda escuchando en `http://servidor:4322`.
   La web abre por ahí.

---

## 2. Iniciar sesión y recuperar contraseña

1. Cualquier persona entra a `/login`.
   1. Puede escribir su **móvil, su email o su nombre de usuario**.
      Los tres valen.
   2. Si el usuario y la contraseña coinciden, entra a su panel.
2. Si olvida la contraseña usa `/recover`:
   1. Primero resuelve una pregunta sencilla (suma corta) para
      demostrar que no es un robot.
   2. Después introduce los tres datos de su cuenta: móvil, email y
      usuario.
   3. Si los tres coinciden con la misma persona, la web le deja
      elegir una contraseña nueva.
   4. Si NO coinciden, la web le dice que escriba a
      `developerweks@gmail.com` para que el desarrollador le verifique
      la identidad manualmente.
3. Una vez dentro:
   1. El menú público (Inicio, Torneo, Galería, Bases) desaparece.
   2. Aparece un menú nuevo con las acciones que toquen a ese rol
      (admin, capitán o jugador).
   3. Los jugadores no ven menú: su panel propio ya tiene un botón
      "Salir".

---

## 3. Crear un torneo nuevo

1. El admin entra a su panel y pulsa "Crear torneo".
   1. Sólo puede crear uno cuando no hay otro torneo "en marcha".
   2. Si ya hay uno activo la web se lo impide hasta que el anterior
      acabe (en estado finalizado).
2. Rellena el formulario:
   1. Nombre del torneo, lugar, descripción y reglas.
   2. **Fechas clave**:
      - **Inicio de inscripciones**: cuándo se abren al público.
      - **Inicio del draft**: cuándo empiezan los capitanes a elegir.
      - **Fin del draft**: cuándo se cierra la elección.
      - **Día del torneo**: la fecha del partido.
3. Al guardar, el torneo queda en fase **"Inscripciones abiertas"** si
   las fechas ya están dentro del periodo de apuntarse.
4. A partir de aquí el botón "+ Nuevo torneo" desaparece y el admin
   gestiona ESE torneo desde su panel hasta finalizarlo.

---

## 4. Inscripciones (fase "open")

Quién y cómo se apunta al torneo:

1. **Personas sin cuenta** (vienen de la calle):
   1. Ven en la página del torneo el botón "Inscribirme".
   2. Crean una cuenta nueva (nombre, móvil, email, edad, foto y
      aceptan el aviso de privacidad).
   3. Al terminar, la web los inscribe automáticamente en el torneo.
2. **Personas con cuenta** que aún no se han inscrito:
   1. Al entrar a la página del torneo ven un botón azul:
      "Inscríbete a este torneo".
   2. Con un clic quedan inscritos.
3. **El admin** puede dar de alta a alguien manualmente:
   1. Desde el panel, pestaña "Inscripciones", pulsa
      "+ Alta de jugador".
   2. Rellena el nombre, móvil, email, edad y posición.
   3. La contraseña inicial es `123123123` (el jugador puede
      cambiarla más tarde desde su panel).
   4. Opcional: marcar la casilla "Capitán" en el mismo paso y poner
      nombre del equipo.
4. **El admin no puede inscribirse a sí mismo.** La aplicación lo
   bloquea — el admin organiza el torneo, no juega.
5. Cada inscripción, alta o baja:
   1. Se guarda en la base de datos.
   2. Se reescribe un **CSV de seguridad** con todos los inscritos en
      ese torneo (Excel-friendly). El fichero se llama como la fecha
      del partido (`2026-06-18.csv`) y vive en `backend/data/csv/`.

---

## 5. Designar capitanes (durante "open")

1. El admin entra a la card de un jugador inscrito.
   1. Marca el check "Capitán de este torneo".
   2. Escribe el nombre del equipo (si lo deja vacío la web le pone
      uno por defecto).
2. La aplicación, por detrás:
   1. Crea el equipo con ese nombre.
   2. Mete al capitán en su propio equipo (slot 1 de la plantilla).
   3. Sube su rol de "jugador" a "capitán".
3. Si el admin **quita** el rol de capitán a alguien (sólo posible
   antes de que empiece el draft):
   1. La web pide confirmación dos veces.
   2. Le muestra el logo, nombre, WhatsApp y descripción del equipo
      que va a desaparecer.
   3. Al confirmar, borra el equipo completo y baja al jugador a rol
      "jugador" normal.
4. Una vez los capitanes están claros, **se pasa al draft**.

---

## 6. Editar el equipo (capitán)

1. El capitán entra a su panel y ve la sección "Mi equipo".
2. Puede:
   1. Subir un logo (la web lo recorta y reduce a 200 px).
   2. Editar el nombre del equipo, una descripción y el enlace de
      WhatsApp del grupo.
3. Tiene tiempo hasta el **día anterior** al partido para tocar
   estas cosas.
4. A partir de la víspera, la web bloquea esos campos. El admin sí
   puede tocarlos en cualquier momento por si hay una urgencia.

---

## 7. Empezar el draft (paso de "open" a "draft")

1. Cuando llega la fecha de "Inicio del draft":
   1. La aplicación pasa el torneo, automáticamente, de "open" a
      "draft" la próxima vez que alguien entra a verlo.
   2. Sortea el orden de los capitanes (Fisher-Yates aleatorio).
   3. Marca el draft como "en curso".
2. Desde ese instante el admin **ya no puede tocar capitanías**.
3. La página pública del torneo muestra "DRAFT EN VIVO".

---

## 8. Elegir jugadores (draft)

1. Cada capitán entra a su panel y, cuando le toca, pulsa al jugador
   que quiere fichar.
2. La aplicación va rotando turnos entre los capitanes ronda tras
   ronda.
   1. En cada ronda se baraja el orden de modo que **ningún capitán
      repite la misma posición** (algoritmo de no-repetición).
   2. Si en una ronda un capitán fue el segundo, en la siguiente ya
      no podrá ser el segundo otra vez. Y así.
3. El draft continúa **hasta repartir a todos los inscritos**.
   1. Si quedan 53 jugadores y hay 6 capitanes, unos equipos tendrán
      8 jugadores y otros 9 (reparto desigual controlado).
   2. Cuando se acaba la "pool", la aplicación cierra el draft sola:
      no hace falta que el admin pulse nada.
4. Al cerrarse el draft, la aplicación, automáticamente:
   1. **Genera los grupos** (un grupo por cada 4 equipos, equilibrado).
   2. **Genera el calendario**: pone hora a cada partido en función
      del día, las canchas disponibles, la duración del partido y si
      se juega en media cancha (2 partidos a la vez).
   3. Marca el torneo como "fase de grupos lista" (status "setup").
   4. Confirma que las horas están publicadas (los jugadores ya las
      ven en la web).
5. La página pública del torneo cambia a "Fase de grupos".

---

## 9. Traspasar la capitanía (durante el draft o después)

1. Una vez que el draft empezó, el admin **ya no puede quitar
   capitanes**.
2. Pero un capitán que ya haya elegido al menos a un jugador sí puede
   **pasarle el rol de capitán** a uno de los miembros de su equipo:
   1. Entra a "Traspasar capitanía" en su panel.
   2. Selecciona al nuevo capitán de la lista de su plantilla.
   3. Confirma dos veces.
3. El equipo se mantiene íntegro: el logo, el nombre, el WhatsApp y
   toda la plantilla siguen siendo los mismos. Sólo cambia quién es
   el "capitán visible". El ex capitán se queda como jugador normal
   del equipo.

---

## 10. El día del torneo (paso de "setup" a "active")

1. Cuando llega la fecha del partido la aplicación cambia el torneo
   automáticamente a estado "TORNEO EN JUEGO" en cuanto alguien entra
   a verlo.
2. La home pública lo refleja con el banner "TORNEO EN JUEGO".
3. Aparece la lista completa de partidos con sus horas asignadas.
4. Los partidos todavía están como "pendientes" hasta que el admin
   los empieza desde el panel (eso ya es la **fase post-partido**, que
   por ahora queda fuera de este flujo).

---

## 11. Copia de seguridad permanente (CSV)

1. Por cada cambio en las inscripciones la aplicación reescribe un
   fichero `.csv` con TODOS los inscritos de ese torneo.
2. El fichero se guarda en `backend/data/csv/<fecha-del-partido>.csv`
   y se puede abrir directamente en Excel/LibreOffice.
3. Contiene, fila a fila: cuándo se inscribió, datos del torneo,
   datos del jugador (nombre, móvil, email, edad, posición, stats,
   consentimiento RGPD) y, si es capitán, su equipo.
4. El CSV se actualiza en cada uno de estos eventos:
   1. Alguien se inscribe.
   2. Alguien se da de baja.
   3. El admin nombra o quita un capitán.
   4. El admin da de alta o elimina un jugador del torneo.
   5. El admin edita los datos de un jugador.
   6. Un capitán traspasa su rol.
5. Si la aplicación se cayera, este CSV es el seguro de vida: con él
   se reconstruyen las inscripciones aunque la base de datos se
   pierda.

---

## 12. Resumen visual de las fases

```
   upcoming                  open                    draft                   setup                   active
  (próxima)            (inscripciones)            (eligiendo)        (grupos publicados)         (día del partido)
      │                       │                       │                       │                       │
      ▼                       ▼                       ▼                       ▼                       ▼
   nadie ve              gente se                capitanes              grupos + horas            empiezan los
   nada todavía          inscribe                eligen                 publicados                partidos
                                                 jugadores
                                                 (round-robin)
```

Las transiciones entre fases las dispara la **fecha**: si pasa la
fecha de inicio del draft, la aplicación lo enciende. Si pasa la
fecha del partido, lo cambia a "en juego". El admin no necesita
pulsar nada, pero también puede forzar manualmente si quiere acelerar
algún paso.

---

## 13. Quién ve qué

1. **Visitante anónimo** (no ha iniciado sesión):
   1. Home, página de torneos, galería, bases.
   2. Botones para inscribirse / iniciar sesión / registrarse.
2. **Jugador**:
   1. Su panel: su carta tipo FIFA con stats, su torneo activo y
      botón Salir.
3. **Capitán**:
   1. Su panel: gestión del equipo (logo, nombre, WhatsApp), draft
      en vivo cuando toca, traspaso de capitanía si ya picó.
4. **Admin**:
   1. Panel completo con pestañas: Inscripciones, Draft, Jugadores,
      Grupos, Eliminatorias, Partidos, Resultados, Resumen,
      Configuración.
   2. Edita el torneo desde la pestaña Configuración sin abrir
      ventanas emergentes.

---

## 14. Cosas que la aplicación impide a propósito

1. Tener **dos torneos en marcha a la vez** (siempre uno).
2. Que el **admin se apunte** como jugador.
3. Tocar **capitanes** una vez empezado el draft.
4. Que un **capitán edite su equipo** desde la víspera del partido.
5. Inscribirse **fuera del periodo** de inscripción / draft.
6. Usar un **móvil ya registrado** para una cuenta nueva.

Cada una de estas reglas devuelve un mensaje claro a quien intenta
saltársela.

---

## 15. Pendiente para próximas iteraciones

1. Marcar partidos (empezar, anotar tantos, finalizar).
2. Generar y verificar la fase eliminatoria (cuartos, semis, final).
3. Pasar contraseñas a `bcrypt` (ahora se guardan en claro).
4. Poner HTTPS real delante (Caddy/Traefik).
5. Bracket interactivo de partidos en directo.
