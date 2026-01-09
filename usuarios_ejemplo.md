# Usuarios de Ejemplo - Torneos Baloncesto Villena

## Credenciales de Acceso

### Administrador
| Usuario | Contraseña | Rol |
|---------|------------|-----|
| edvardks | SX515wifi | Admin |

### Capitanes
| Móvil | Contraseña | Nombre | Overall |
|-------|------------|--------|---------|
| 600100001 | capitan1 | Carlos 'El Capitán' Martínez | 82 |
| 600100002 | capitan2 | Miguel Ángel López | 80 |
| 600100003 | capitan3 | Adrián 'El Muro' García | 78 |
| 600100004 | capitan4 | Pablo Sánchez Ruiz | 79 |
| 600100005 | capitan5 | Roberto 'Flash' Vega | 76 |
| 600100006 | capitan6 | Fernando Torres Díaz | 82 |

### Jugadores
| Móvil | Nombre | Overall | Especialidad |
|-------|--------|---------|--------------|
| 600200001 | Javier 'Jet' Fernández | 73 | Velocidad (PAC 94) |
| 600200002 | Daniel Ruiz | 74 | Tiro (TIR 88) |
| 600200003 | Sergio 'El Mago' Torres | 73 | Pase (PAS 92) |
| 600200004 | Luis 'La Roca' Ramírez | 72 | Defensa (DEF 95) |
| 600200005 | Antonio Moreno | 79 | Equilibrado |
| 600200006 | Pedro Jiménez | 75 | Físico |
| 600200007 | Raúl 'El Artillero' Díaz | 72 | Tiro (TIR 95) |
| 600200008 | Iván Castro | 75 | Regate |
| 600200009 | Álvaro Ortiz | 78 | Equilibrado |
| 600200010 | Diego 'Turbo' Herrera | 71 | Velocidad (PAC 96) |
| 600200011 | Marcos Delgado | 77 | Defensa |
| 600200012 | Alejandro 'Nene' Núñez | 75 | Pase (PAS 92) |
| 600200013 | Víctor 'Tank' Molina | 75 | Físico (FIS 96) |
| 600200014 | Hugo Blanco | 78 | Equilibrado |
| 600200015 | Óscar 'El Sniper' Reyes | 73 | Tiro (TIR 94) |
| 600200016 | Nicolás Fuentes | 77 | Equilibrado |
| 600200017 | Cristian 'El Pulpo' Luna | 75 | Defensa (DEF 90) |
| 600200018 | Samuel Ríos | 77 | Velocidad |
| 600200019 | Adrián 'Sombra' Pardo | 74 | Regate (REG 92) |
| 600200020 | Gonzalo Medina | 78 | Equilibrado |

## Torneos de Ejemplo

### Finalizados (completed)
- **Copa Villena 2024** - 15 Jun 2024
- **Liga Invierno 2024** - 20 Feb 2024
- **Torneo Navidad 2024** - 22 Dic 2024
- **3x3 Street Cup** - 10 Ago 2024

### En Curso (active)
- **Liga Primavera 2025** - Desde 10 Ene 2025
- **Copa Reyes 2025** - Desde 6 Ene 2025

### En Draft (draft)
- **Torneo San Valentín** - 14 Feb 2025
- **Copa Carnaval 2025** - 28 Feb 2025

### Inscripciones Abiertas (open)
- **Copa Fallas 2025** - 19 Mar 2025
- **Liga Verano 2025** - 21 Jun 2025
- **Torneo Moros y Cristianos** - 5 Sep 2025
- **3x3 Summer Jam** - 15 Jul 2025

## Cómo Ejecutar el Seed

```bash
npx tsx server/seed.ts
```

## Notas
- Los jugadores se registran automáticamente en torneos abiertos
- Las contraseñas están en texto plano (pendiente hashear con bcrypt)
- Los avatares son null por defecto (los jugadores pueden subir su foto)
