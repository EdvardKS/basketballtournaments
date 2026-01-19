# 🎯 Guía Rápida: Qué Hacer Para Ejecutar

## ⚡ Inicio en 5 Minutos

### Si usas Windows:

```powershell
# 1. Abrir PowerShell en el proyecto
cd C:\Users\FRAN\Desktop\PROJECTS\basketballtournaments

# 2. Instalar dependencias (primera vez)
npm install

# 3. Levantar servicios con Docker
docker-compose up -d

# 4. Ver que está corriendo
docker-compose logs -f

# 5. Ir a http://localhost:5000
```

### Si usas Mac/Linux:

```bash
cd ~/path/to/basketballtournaments

npm install

docker-compose up -d

docker-compose logs -f

# Luego: http://localhost:5000
```

---

## 📋 Qué Se Ejecuta

| Servicio | Puerto | URL |
|----------|--------|-----|
| App (Node.js + Vite) | 5000 | http://localhost:5000 |
| PostgreSQL BD | 5433 | localhost:5433 |

---

## 🔑 Credenciales por Defecto

**Admin:**
- Usuario: `edvardks`
- Contraseña: `SX515wifi`

---

## 🐛 Si Algo Falla

### Error: "Cannot find module 'bcrypt'"
```bash
npm install
```

### Error: "DATABASE_URL must be set"
```bash
# Verificar que .env existe
cat .env
```

### Error: "connect ECONNREFUSED" (BD)
```bash
# Reiniciar contenedores
docker-compose down
docker-compose up -d
```

### Contenedor no inicia
```bash
# Limpiar todo y empezar de nuevo
docker-compose down -v
npm install
docker-compose up --build
```

---

## 📸 Qué Cambió

✅ **Contraseñas** se hashean con bcrypt (seguro)  
✅ **Fotos** son obligatorias en registro  
✅ **Fotos** se muestran en tarjetas de jugadores  
✅ **Sesiones** con SESSION_SECRET seguro  

---

## 🔐 Para Producción

Antes de subir a producción, cambiar en `.env`:

```env
# 1. Generar nuevo SECRET (copiar salida del comando)
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=tu_valor_aqui

# 2. Nueva contraseña admin
ADMIN_PASSWORD=contraseña_nueva_segura

# 3. BD remota segura
DATABASE_URL=postgres://...

# 4. Marcar como producción
NODE_ENV=production
```

---

## 📖 Documentación Completa

Ver:
- [README-SETUP.md](./README-SETUP.md) - Guía detallada
- [CAMBIOS_IMPLEMENTADOS.md](./CAMBIOS_IMPLEMENTADOS.md) - Qué se cambió
- [despliegue_local.md](./despliegue_local.md) - Docker Compose

---

## ✅ Checklist Rápido

- [ ] Clonar/descargar proyecto
- [ ] `npm install`
- [ ] Verificar que `docker-compose.yml` existe
- [ ] `docker-compose up -d`
- [ ] Ir a http://localhost:5000
- [ ] Probar registro con foto
- [ ] Probar login

¡Listo! 🎉
