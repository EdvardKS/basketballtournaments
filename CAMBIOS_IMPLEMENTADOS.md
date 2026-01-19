# ✅ Cambios Implementados - Basketball Tournaments

## 📋 Resumen Ejecutivo

Se han implementado 4 características principales de seguridad y validación en el proyecto:

1. ✅ **Hasheo de contraseñas con bcrypt**
2. ✅ **Validación obligatoria de foto en registro**
3. ✅ **Mostrar fotos en tarjetas de jugadores**
4. ✅ **Configuración segura de variables de entorno**

---

## 🔐 1. Seguridad de Contraseñas - bcrypt

### Implementado:

#### **Server (Node.js) - `/server/routes.ts`**

**Cambio 1: Agregar import de bcrypt**
```typescript
import bcrypt from "bcrypt";
```

**Cambio 2: Hashear contraseña en registro**
```typescript
// Antes: req.body.password = String(password);
// Ahora:
req.body.password = await bcrypt.hash(String(password), 10);
```
- Salt rounds: 10 (balance seguridad-performance)
- Se ejecuta ANTES de guardar en BD
- La contraseña nunca se almacena en texto plano

**Cambio 3: Validar contraseña en login**
```typescript
// Antes: if (player.password === password)
// Ahora:
const isPasswordValid = await bcrypt.compare(password, player.password);
if (isPasswordValid) {
  // Nunca enviar contraseña al cliente
  const { password: _, ...safePlayer } = player;
  return res.json({ player: safePlayer });
}
```
- Usa `bcrypt.compare()` para validación segura
- No expone la contraseña hasheada

#### **Admin Login Actualizado**
```typescript
// Ahora usa variable de entorno en lugar de texto plano
if (identifier === "edvardks" && password === process.env.ADMIN_PASSWORD) {
  // ...
}
```

### Dependencias Agregadas:
- `bcrypt@^6.0.0` - Ya estaba en package.json
- `@types/bcrypt@^6.0.0` - Tipos TypeScript

---

## 📸 2. Validación Obligatoria de Foto

### Schema Validación - `/shared/schema.ts`

```typescript
export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
}).extend({
  avatar: z.string().min(1, "La foto es obligatoria"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
```

### Validaciones en Cliente - `/client/src/pages/Register.tsx`

✅ Ya implementado:
- Máximo 2MB
- Formatos permitidos: JPG, PNG, WebP
- Preview en tiempo real
- Mensaje de error si no se sube foto
- No se permite enviar sin foto

### Validaciones en Servidor - `/server/routes.ts`

```typescript
if (!req.body.avatar) {
  return res.status(400).json({ error: "La foto es obligatoria" });
}
```

---

## 🎨 3. Mostrar Fotos en Tarjetas

### Ya Implementado en PlayerCard - `/client/src/components/PlayerCard.tsx`

```typescript
const showAvatar = !!player.avatar && !imgError;

// Mostrar foto o icono de rol
{showAvatar ? (
  <img
    src={player.avatar}
    alt={player.name}
    className="w-full h-full object-cover"
    onError={() => setImgError(true)}
  />
) : (
  <div className="w-full h-full flex items-center justify-center bg-slate-800">
    <RoleIcon role={player.role} />
  </div>
)}
```

**Características:**
- Foto ocupa la parte superior de la tarjeta (aspecto cuadrado)
- Fallback con icono de rol si no hay foto
- Manejo de errores de carga
- Se aplica gradiente sobre la foto para legibilidad

### API Response - `/server/routes.ts`

Las fotos se incluyen en las respuestas de:
- `GET /api/players` - Listado de jugadores
- `GET /api/players/:id` - Detalle de jugador
- `POST /api/players/register` - Registro (excluye password)

---

## 🔐 4. Configuración Segura de Variables de Entorno

### Archivos Creados/Actualizados:

#### `.env` (Producción local)
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/basketball
SESSION_SECRET=3a5b7c9d1e2f4g6h8i0j1k2l3m4n5o6p
ADMIN_PASSWORD=SX515wifi
NODE_ENV=development
PORT=5000
```

#### `.env.example` (Template para otros desarrolladores)
```env
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/basketball
SESSION_SECRET=tu_secret_aleatorio_de_32_caracteres_aqui
ADMIN_PASSWORD=SX515wifi
NODE_ENV=development
PORT=5000
```

### En el Código - `/server/index.ts`

```typescript
app.use(session({
  // ...
  secret: process.env.SESSION_SECRET || 'villena-basket-league-secret-2024',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  }
}));
```

**Características de Seguridad:**
- En producción: `secure: true` (solo HTTPS)
- HttpOnly: Previene acceso desde JavaScript
- SameSite: Protección CSRF
- 30 días de expiración

---

## 📖 Documentación

### Nuevos Archivos:

#### `README-SETUP.md`
- Guía completa de instalación y ejecución
- Opción 1: Con Docker (recomendado)
- Opción 2: Local sin Docker
- Checklist de seguridad para producción
- Troubleshooting
- Scripts disponibles

#### `.env.example`
- Template de configuración
- Documentación de cada variable

---

## 🚀 Cómo Ejecutar

### Opción 1: Con Docker (Recomendado)

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar servicios
docker-compose up -d

# 3. Acceder
# App: http://localhost:5000
# BD: localhost:5433
```

**Ventajas:**
- Sin instalaciones locales
- Ambiente reproducible
- Fácil de limpiar

### Opción 2: Local sin Docker

```bash
# 1. Asegurar PostgreSQL corriendo
# macOS: brew services start postgresql
# Linux: sudo service postgresql start

# 2. Crear BD
createdb basketball

# 3. Instalar dependencias
npm install

# 4. Terminal 1: Servidor
npm run dev

# 5. Terminal 2: Cliente
npm run dev:client
```

**Acceder:** http://localhost:5000

---

## ⚠️ IMPORTANTE: Cambios de Seguridad para Producción

Antes de desplegar a producción, **DEBE hacer esto:**

### 1️⃣ Generar SESSION_SECRET Nuevo

```bash
# Generar 32 caracteres aleatorios seguros
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# o
openssl rand -hex 32
```

Copiar el valor y actualizar en `.env`:
```
SESSION_SECRET=tu_valor_generado_aqui
```

### 2️⃣ Cambiar ADMIN_PASSWORD

```
ADMIN_PASSWORD=tu_contraseña_fuerte_segura_aqui
```

### 3️⃣ Actualizar DATABASE_URL

Usar servidor PostgreSQL remoto seguro:
```
DATABASE_URL=postgres://usuario_seguro:contraseña_fuerte@servidor-remoto.com:5432/basketball
```

### 4️⃣ Configurar NODE_ENV

```
NODE_ENV=production
```

### 5️⃣ Verificar Certificados SSL

- Configurar HTTPS en el servidor
- Certificados válidos (Let's Encrypt, etc.)

### 6️⃣ Habilitar Backups

- Backup automático de la BD
- Backups cifrados
- Repositorio separado

---

## 🔍 Validación de Cambios

### Testing Manual:

#### Registro Nueva Cuenta
1. Ir a `/register`
2. Intentar sin foto → Error "La foto es obligatoria"
3. Subir foto + datos → Contraseña hasheada en BD
4. Intentar login → Valida contra hash

#### Login
1. Probar con credenciales correctas → ✅ Acceso
2. Probar con contraseña incorrecta → ❌ Acceso denegado
3. Admin login → Valida contra `process.env.ADMIN_PASSWORD`

#### Visualización de Fotos
1. Ir a `/tournaments/<id>/players`
2. Ver foto en cada tarjeta de jugador
3. En draft → Mostrar fotos en "disponibles"

---

## 📊 Resumen de Archivos Modificados

| Archivo | Cambios | Razón |
|---------|---------|-------|
| `package.json` | Verificar bcrypt y tipos | Dependencia para hasheo |
| `shared/schema.ts` | Validación avatar/password | Requerir foto y validar contraseña |
| `server/routes.ts` | bcrypt import, hasheo, comparación | Seguridad de contraseñas |
| `.env` | Agregar DATABASE_URL | Variables de entorno |
| `.env.example` | Crear | Template para developers |
| `despliegue_local.md` | Actualizar | Mejorar instrucciones Docker |
| `README-SETUP.md` | Crear | Guía completa de ejecución |

---

## ✨ Próximos Pasos Opcionales

1. **Migración de contraseñas antiguas**
   - Si hay usuarios existentes con contraseñas en texto plano, necesitarán hacer reset

2. **Validación de email**
   - Implementar confirmación de email al registrarse

3. **Recuperación de contraseña**
   - Flujo de reset password seguro

4. **2FA (Two-Factor Authentication)**
   - SMS o TOTP para cuentas admin

5. **Rate limiting**
   - Proteger endpoints de login/registro de ataques

6. **Auditoría**
   - Log de cambios de contraseña
   - Log de intentos de login fallidos

---

## 📞 Preguntas Frecuentes

**P: ¿Qué pasa si alguien cambia la contraseña hasheada en la BD?**
R: Solo funciona si la nuevo es hash válido. Los intentos de login fallarán.

**P: ¿Se puede recuperar la contraseña original de su hash?**
R: No, bcrypt es unidireccional. Solo se compara contra el hash.

**P: ¿Cuánto tarda la validación de login?**
R: ~0.1-0.2 segundos (bcrypt es lento intencionalmente por seguridad).

**P: ¿Por qué 10 salt rounds?**
R: Balance entre seguridad y velocidad. Recomendado por OWASP.

---

**Fecha:** 16 de enero de 2026  
**Versión:** 1.0  
**Estado:** ✅ Completado
