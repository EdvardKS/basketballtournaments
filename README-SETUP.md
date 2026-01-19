# 🏀 Basketball Tournaments - Guía de Ejecución

## ⚠️ Requisitos Previos

### En Windows (WSL + Docker)
Si trabajas en Windows, debes tener instalados:
1. **WSL 2** (Windows Subsystem for Linux 2) - [Instalación](https://docs.microsoft.com/es-es/windows/wsl/install)
2. **Docker Desktop** - [Descargar](https://www.docker.com/products/docker-desktop)
3. Habilitar WSL 2 como backend de Docker Desktop

### En Linux/Mac
- **Docker** y **Docker Compose**
- **Node.js** 20+ (opcional, para desarrollo local)

---

## 🚀 Opción 1: Ejecución con Docker (Recomendado)

### Paso 1: Preparar el proyecto
```bash
cd basketballtournaments

# Instalar dependencias (si no lo has hecho)
npm install
```

### Paso 2: Configurar variables de entorno
El archivo `.env` ya está configurado con valores por defecto. En producción, **cambia estos valores**:

```bash
# Ver contenido actual
cat .env
```

**Variables importantes:**
- `DATABASE_URL`: Conexión a PostgreSQL (ya configurada para Docker)
- `SESSION_SECRET`: Secreto para sesiones (ya configurado, cambiar en producción)
- `ADMIN_PASSWORD`: Contraseña del admin (cambiar en producción)
- `NODE_ENV`: `development` o `production`

### Paso 3: Levantar los servicios con Docker Compose
```bash
# Iniciar contenedores (PostgreSQL + App)
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Detener contenedores
docker-compose down
```

### Paso 4: Acceder a la aplicación
- **App:** http://localhost:5000
- **PostgreSQL:** localhost:5433 (usuario: `postgres`, contraseña: `postgres`)

### Paso 5: Inicializar la base de datos (primera vez)
```bash
# Dentro del contenedor o con npm
npm run db:push
```

---

## 🚀 Opción 2: Ejecución Local (Sin Docker)

### Paso 1: Requisitos
- **Node.js 20+** instalado
- **PostgreSQL 16+** ejecutándose localmente
- Base de datos `basketball` creada

### Paso 2: Configurar PostgreSQL local
```bash
# Crear base de datos
createdb basketball

# O en psql:
psql
CREATE DATABASE basketball;
```

### Paso 3: Actualizar .env
```bash
# Cambiar DATABASE_URL en .env a tu PostgreSQL local:
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/basketball
```

### Paso 4: Instalar dependencias
```bash
npm install
```

### Paso 5: Ejecutar migraciones
```bash
npm run db:push
```

### Paso 6: Iniciar los servidores

**Terminal 1 - Servidor Backend:**
```bash
npm run dev
```

**Terminal 2 - Cliente (Vite):**
```bash
npm run dev:client
```

Accede a: http://localhost:5000

---

## 🔐 Seguridad en Producción

### ⚠️ Variables de Entorno Críticas

**DEBE hacer estos cambios antes de desplegar:**

#### 1. SESSION_SECRET
Generar un secreto aleatorio seguro:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Bash/Linux
openssl rand -hex 32
```

Copiar el resultado y actualizar `.env`:
```
SESSION_SECRET=tu_valor_generado_aqui
```

#### 2. ADMIN_PASSWORD
Cambiar la contraseña por defecto:
```
ADMIN_PASSWORD=tu_contraseña_segura_aqui
```

#### 3. DATABASE_URL
Usar credenciales seguras y host remoto:
```
DATABASE_URL=postgres://usuario_seguro:contraseña_fuerte@tu-host.com:5432/basketball
```

#### 4. NODE_ENV
En producción debe ser:
```
NODE_ENV=production
```

### 🛡️ Checklist de Seguridad
- [ ] SESSION_SECRET cambiadofromash
- [ ] ADMIN_PASSWORD actualizado
- [ ] DATABASE_URL apunta a BD remota segura
- [ ] NODE_ENV=production
- [ ] Certificados SSL configurados
- [ ] Firewall configurado correctamente
- [ ] Backups de BD programados

---

## 📝 Cambios Implementados Recientemente

### ✅ Seguridad de Contraseñas
- **bcrypt** implementado: todas las contraseñas se hashean antes de guardarse
- Las contraseñas nunca se envían de vuelta al cliente en respuestas API
- Login valida contraseñas hasheadas de forma segura

### ✅ Validación de Fotos
- Campo `avatar` es **obligatorio** en registro
- Se valida en frontend y backend
- Soporta formatos: JPG, PNG, WebP (máx 2MB)
- Se muestra en tarjetas de jugadores y draft

### ✅ Variables de Entorno
- `SESSION_SECRET` configurado para sesiones seguras
- `ADMIN_PASSWORD` configurable por variable de entorno
- `.env.example` incluido como referencia

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL must be set"
```bash
# Verificar que .env existe
ls -la .env

# Verificar que tiene contenido
cat .env | grep DATABASE_URL
```

### Error: "connect ECONNREFUSED 127.0.0.1:5432"
```bash
# PostgreSQL no está ejecutándose
# Con Docker:
docker-compose up -d postgres

# Local:
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

### Error: "Error al registrar jugador"
Verifica que:
1. La foto está subida (es obligatoria)
2. Email y usuario no existen previamente
3. Contraseña tiene al menos 6 caracteres

### Contenedores no inician
```bash
# Limpiar y reiniciar
docker-compose down -v
docker-compose up --build
```

---

## 📚 Scripts Disponibles

```bash
# Desarrollo
npm run dev:client          # Cliente Vite (puerto 5000)
npm run dev                 # Servidor Node.js
npm run dev:all             # Ambos (si está configurado)

# Construcción
npm run build               # Compilar TypeScript

# Base de datos
npm run db:push             # Aplicar migraciones

# Validación
npm run check               # Verificar tipos TypeScript

# Producción
npm run start               # Ejecutar versión compilada
```

---

## 🔑 Credenciales de Desarrollo

**Admin:**
- Usuario: `edvardks`
- Contraseña: `SX515wifi` (cambiar en .env)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa que todas las variables de entorno estén configuradas
2. Verifica que PostgreSQL está corriendo
3. Limpia `node_modules` e instala de nuevo
4. Comprueba logs: `docker-compose logs app`

---

## 📖 Documentación Adicional

- [despliegue_local.md](./despliegue_local.md) - Configuración Docker detallada
- [docs/PRD_hecho.md](./docs/PRD_hecho.md) - Funcionalidades implementadas
- [docs/PRD_pendiente.md](./docs/PRD_pendiente.md) - Funcionalidades planeadas

---

**Última actualización:** 16 de enero de 2026
