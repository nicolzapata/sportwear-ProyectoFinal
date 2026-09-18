# SportWear Backend — `sportwear-backend/`

> Ver también el [resumen general del proyecto](../CLAUDE.md).

## Qué es

API REST del sistema SportWear. Expone todos los recursos de negocio (productos, ventas, compras, clientes, usuarios, roles, etc.) bajo el prefijo `/api`, y es consumida tanto por el panel web (`sportwear/`) como por la app móvil (`sportwear_movil/`).

## Stack técnico

- **Runtime**: Node.js (imagen Docker basada en `node:18-alpine`)
- **Framework**: Express 4
- **Base de datos**: PostgreSQL, driver `pg` (pool de conexiones, sin ORM)
- **Autenticación**: `jsonwebtoken` (JWT) + `bcryptjs` (hash de contraseñas)
- **Uploads / imágenes**: `multer` + `cloudinary`
- **Correo**: `nodemailer` (recuperación de contraseña)
- **PDFs**: `pdfkit` (recibos/reportes)
- **Rate limiting**: `express-rate-limit`
- **Dev**: `nodemon`
- **Tests**: `jest` + `supertest`

## Punto de entrada y arranque

- `src/index.js`: conecta el pool de PostgreSQL, hace `SELECT NOW()` como chequeo de salud al arrancar, y levanta Express en `process.env.PORT` (default `4000`) sobre `0.0.0.0`.
- `src/app.js`: configura middlewares globales (`cors`, `express.json`, `express.urlencoded`), sirve estáticos (`/uploads`, `public/`), monta todas las rutas bajo `/api/*`, y agrega manejo de 404 + manejador de errores global (`middlewares/errorHandler.js`).
- Endpoint de salud simple: `GET /api` → `{ success, message, version, status }`.

## Estructura (`src/`)

```
src/
├── index.js            # bootstrap: conexión DB + app.listen
├── app.js              # configuración de Express y montaje de rutas
├── config/             # conexión a la base de datos (db.js), configuración de módulos
├── controllers/        # un controlador por recurso; crudFactory.js genera CRUD genérico
├── services/           # lógica de negocio (reglas de stock, pagos/cuotas, dashboard, mailer, pdf, roles)
├── models/             # acceso a datos vía pg (queries SQL), base.model.js como helper común
├── routes/             # un router por recurso, montado en app.js bajo /api/<recurso>
├── middlewares/        # auth.middleware.js (JWT + permisos), errorHandler.js
├── utils/              # validaciones (numérico), roles protegidos
└── assets/
```

Patrón repetido por recurso: `routes/<recurso>.js` → `controllers/<recurso>.controller.js` → `services/<recurso>.service.js` → `models/<recurso>.model.js`. Recursos simples (colores, categorías, etc.) reutilizan `crudFactory.js` para no repetir CRUD boilerplate.

## Recursos expuestos (`/api/...`)

`auth`, `roles`, `usuarios`, `barrios`, `clientes`, `colores`, `categorias`, `productos`, `variantes`, `proveedores`, `compras`, `detalle-compra`, `ventas`, `detalle-venta`, `pedidos`, `metodos-pago`, `dashboard`, `imagenes`.

Documentación OpenAPI disponible en `docs/openapi.yaml`.

## Autenticación y permisos

- Login emite un JWT (`auth.service.js` / `auth.controller.js`), firmado con `JWT_SECRET`, expiración `JWT_EXPIRES_IN`.
- `middlewares/auth.middleware.js` valida el token en rutas protegidas.
- Modelo de **roles + permisos por módulo** (`rol.model.js`, `permiso.model.js`, `modulo.model.js`, `roles.service.js`), con protección especial para roles del sistema (`utils/rolesProtegidos.js`).
- El frontend consulta los "módulos" del usuario autenticado para decidir qué rutas/menús mostrar.

## Base de datos

- PostgreSQL. Conexión en `src/config/db.js`:
  - Si existe `DATABASE_URL`, se usa esa cadena de conexión (con `ssl: { rejectUnauthorized: false }`, típico de proveedores cloud tipo Render/Supabase).
  - Si no, se arma con `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (con defaults locales).
- Migraciones/ajustes puntuales como SQL suelto en `sql/*.sql` (no hay un sistema formal de migraciones tipo knex/sequelize — son scripts que se corren manualmente).
- Scripts de utilidad en la raíz del monorepo (`check-db.js`, `check-tables.js`, `check-schema.js`, `check-fk.js`, `check-constraint.js`, `fix-and-seed.js`, `seed-modulos-permisos.js`) para diagnóstico y siembra de datos.

## Variables de entorno

Archivo `.env` en `sportwear-backend/`:

```env
# Base de datos
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DATABASE_URL=          # si está presente, tiene prioridad sobre DB_*

# Servidor
PORT=                  # default 4000
FRONTEND_URL=          # usado para CORS (origin)

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Correo (recuperación de contraseña)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

## Scripts

```bash
npm install
npm run dev     # nodemon src/index.js
npm start       # node src/index.js
npm test        # jest (tests/unit + tests/integration)
```

## Tests

- `tests/unit/modules/productos/productos.service.test.js`
- `tests/integration/productos.route.test.js`
- Config en `jest.config.js` (`testEnvironment: node`, `testMatch: tests/**/*.test.js`).

## Docker

Ver `sportwear-backend/Dockerfile` (imagen `node:18-alpine`, expone el puerto vía `PORT`) y el `docker-compose.yml` en la raíz del monorepo, que además provee el servicio de PostgreSQL y las variables de entorno necesarias.
