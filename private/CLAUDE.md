# SportWear — Resumen general del proyecto

> Este archivo es el punto de entrada para entender el proyecto completo. Para el detalle técnico de cada capa, ver:
> - [`frontend/CLAUDE.md`](./frontend/CLAUDE.md) — panel web (React + Vite)
> - [`backend/CLAUDE.md`](./backend/CLAUDE.md) — API REST (Node.js + Express + PostgreSQL)
> - [`movil/CLAUDE.md`](./movil/CLAUDE.md) — app móvil (Flutter)

## Qué es SportWear

SportWear es un sistema de gestión y venta para una tienda de ropa deportiva. Cubre dos frentes:

1. **Cara al cliente**: catálogo público de productos, carrito, checkout con cuotas/abonos, seguimiento de pedidos y "mi cuenta".
2. **Panel administrativo**: gestión de productos, variantes, colores, categorías, proveedores, compras, ventas, pagos/abonos, clientes, usuarios, roles/permisos y un dashboard de indicadores.

El mismo backend sirve **tres clientes**: el panel web administrativo/catálogo (React), la app móvil de cliente (Flutter) y potencialmente integraciones futuras — todos consumen la misma API REST.

## Arquitectura general

```
                     ┌───────────────────────┐
                     │   PostgreSQL (DB)     │
                     └───────────▲───────────┘
                                 │ pg (pool)
                     ┌───────────┴───────────┐
                     │  sportwear-backend    │  API REST (Express)
                     │  Node.js + JWT +      │  Puerto 4000 (dev)
                     │  Cloudinary + SMTP    │
                     └───▲───────────────▲───┘
              REST/JSON  │               │  REST/JSON
        ┌─────────────────┴───┐   ┌───────┴──────────────┐
        │     sportwear        │   │   sportwear_movil    │
        │  React 18 + Vite     │   │   Flutter (Dio)      │
        │  Panel admin +       │   │   App cliente         │
        │  catálogo público    │   │   (Android/iOS/Web)   │
        └───────────────────────┘   └───────────────────────┘
```

- **Backend**: única fuente de verdad de datos y reglas de negocio (autenticación, permisos por módulo, stock, pagos). Expone todo bajo el prefijo `/api`.
- **Frontend web**: consume la API vía Axios; incluye tanto rutas públicas (catálogo, carrito, checkout) como rutas protegidas por rol/módulo (dashboard, gestión).
- **Móvil**: app orientada al cliente final (catálogo, carrito, checkout, pedidos, perfil); consume la API vía Dio con interceptor de JWT.

## Repositorios / carpetas del monorepo

| Carpeta | Capa | Stack |
|---|---|---|
| `sportwear-backend/` | Backend / API | Node.js, Express, PostgreSQL (`pg`), JWT, Cloudinary, Nodemailer, PDFKit |
| `sportwear/` | Frontend web | React 18, Vite, React Router DOM, Axios |
| `sportwear_movil/` | App móvil | Flutter (Dart), Dio, Provider, go_router |

Nota: el repositorio también contiene artefactos sueltos en la raíz (`Dockerfile`, `nixpacks.toml`, scripts `check-*.js`, `fix-and-seed.js`) usados para despliegue/diagnóstico puntual del backend/frontend en plataformas tipo Render/Railway — no forman parte del código de las apps.

## Autenticación y autorización

- JWT emitido por el backend (`JWT_SECRET`, `JWT_EXPIRES_IN`).
- El frontend web y la app móvil guardan el token y lo envían como `Authorization: Bearer <token>`.
- El backend maneja **roles y permisos por módulo** (tabla de roles/permisos, middleware `auth.middleware.js`); el frontend refleja esto con `ProtectedRoute` y rutas condicionadas por módulos del usuario (ver `sportwear/src/routes.jsx`).

## Variables de entorno (visión general)

- **Backend**: base de datos (`DB_*` / `DATABASE_URL`), servidor (`PORT`, `FRONTEND_URL`), JWT (`JWT_SECRET`, `JWT_EXPIRES_IN`), Cloudinary (`CLOUDINARY_*`), correo SMTP (`EMAIL_*`).
- **Frontend**: `VITE_API_URL` (URL base de la API, ej. `http://localhost:4000/api`).
- **Móvil**: actualmente la URL base de la API está **hardcodeada** en `lib/core/api/api_client.dart` (`https://sportwear-proyectofinal.onrender.com/api`), no se configura por variable de entorno. Ver detalle en [`movil/CLAUDE.md`](./movil/CLAUDE.md).

## Entornos y despliegue conocido

- Backend y frontend tienen despliegue existente vía Render/Railway (usan `nixpacks.toml` y el `Dockerfile` legacy en la raíz del repo — no tocado por este trabajo).
- La app móvil apunta en duro a un backend desplegado en Render (`sportwear-proyectofinal.onrender.com`).
- Para desarrollo/local se agregaron:
  - `sportwear-backend/Dockerfile` (Node 18 + build en dos etapas), con `image: sportwear-backend:latest`.
  - `sportwear/Dockerfile` + `sportwear/nginx.conf` (build con Vite, servido con Nginx, `VITE_API_URL` como build arg), con `image: sportwear-frontend:latest`.
  - `docker-compose.yml` en la raíz del monorepo: levanta PostgreSQL, backend y frontend en una red interna (`sportwear`), leyendo variables desde `.env.example` (copiar a `.env`).
  - `.dockerignore` en `sportwear-backend/` y `sportwear/`, y `.env.example` en la raíz.
  - **La app móvil (`sportwear_movil/`) no está containerizada** — ver el motivo (versión de Dart SDK no disponible aún en ninguna imagen pública de Flutter) en [`movil/CLAUDE.md`](./movil/CLAUDE.md). Se sigue usando el flujo nativo de Flutter para esa capa.

### Levantar el stack local (backend + frontend)

```bash
cp .env.example .env   # completar credenciales de Cloudinary/SMTP si se necesitan
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api
- PostgreSQL: localhost:5432

### Distribuir las imágenes offline (`docker save` / `docker load`)

Las imágenes `backend` y `frontend` tienen nombre fijo (`image:` en `docker-compose.yml`), así que se pueden empaquetar y compartir sin depender del nombre de la carpeta del proyecto en la máquina destino:

```bash
# En la máquina con las imágenes ya construidas (docker compose build)
docker save -o sportwear-images.tar sportwear-backend:latest sportwear-frontend:latest postgres:16-alpine

# En la máquina destino (offline), junto con docker-compose.yml y .env
docker load -i sportwear-images.tar
docker compose up   # sin --build: ya usa las imágenes cargadas
```

## Integrantes

- Nicol Zapata ([@nicolzapata](https://github.com/nicolzapata))
- Sofia Suaza

## Contexto académico

Proyecto Final del curso de Modelado (5to trimestre). Sin licencia open source definida.
