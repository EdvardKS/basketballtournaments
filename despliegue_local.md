# ⚠️ IMPORTANTE

**SI TRABAJAS WINDOWS DEBES TENER INSTALADO WSL Y DOCKERDESKTOP**

---

## 🐳 Entorno de desarrollo con Docker

Este proyecto utiliza **Docker** y **Docker Compose** para levantar un entorno de desarrollo con Node.js y PostgreSQL.

---

## 📁 Estructura del proyecto

```text
.
├── Dockerfile.dev
├── docker-compose.yml
├── package.json
├── package-lock.json
├── .env
└── src/
```
---
## Dockerfile 
## Dockerfile 
## Dockerfile 
```r
FROM node:20-alpine

WORKDIR /app

# deps
COPY package.json package-lock.json ./
RUN npm install

# NO copiamos código aquí (se monta con volume)

EXPOSE 5000

CMD ["npm", "run", "dev"]
```
---
## Docker compose yml
## Docker compose yml
## Docker compose yml
``` yml
services:
  postgres:
    image: postgres:16
    container_name: basketball_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: basketball
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: basketball_app
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/basketball
    depends_on:
      - postgres
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "5000:5000"
    command: npm run dev

volumes:
  postgres_data:

```
---
