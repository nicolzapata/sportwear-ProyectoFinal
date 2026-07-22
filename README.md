# SportWear

## Descripción general

SportWear es un sistema web de gestión y venta para una tienda de ropa deportiva. La plataforma cubre tanto el catálogo público de cara al cliente (navegación de productos, carrito, checkout, pedidos) como un panel administrativo completo para la gestión del negocio: productos, variantes, colores, categorías, proveedores, compras, ventas, pagos/abonos, clientes, usuarios, roles y un dashboard de indicadores.

El proyecto está dividido en dos aplicaciones independientes:

- **`sportwear-backend`**: API REST construida con Node.js y Express, con persistencia en PostgreSQL.
- **`sportwear`**: aplicación frontend construida con React y Vite que consume la API.

## Tecnologías utilizadas

### Backend (`sportwear-backend`)

- Node.js + Express
- PostgreSQL (driver `pg`)
- JWT (`jsonwebtoken`) para autenticación
- `bcryptjs` para el hash de contraseñas
- `multer` para carga de archivos
- `cloudinary` para almacenamiento de imágenes
- `nodemailer` para envío de correos (recuperación de contraseña)
- `pdfkit` para generación de PDF
- `express-rate-limit` para limitar peticiones
- `nodemon` (entorno de desarrollo)

### Frontend (`sportwear`)

- React 18 + Vite
- React Router DOM
- Axios para consumo de la API
- `jspdf` / `jspdf-autotable` para generación de reportes en PDF
- `xlsx` para exportación a Excel
- `react-icons`
- ESLint

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior y npm
- [PostgreSQL](https://www.postgresql.org/) (instancia local o remota)
- Una cuenta de [Cloudinary](https://cloudinary.com/) (para el almacenamiento de imágenes)
- Una cuenta de correo (SMTP) para el envío de emails de recuperación de contraseña

## Instrucciones de instalación

Clona el repositorio y luego instala las dependencias de cada aplicación por separado.

```bash
git clone https://github.com/nicolzapata/sportwear-backend.git
cd sportwear-ProyectoFinal
```

### Backend

```bash
cd sportwear-backend
npm install
```

### Frontend

```bash
cd sportwear
npm install
```

## Configuración de variables de entorno

### Backend (`sportwear-backend/.env`)

Crea un archivo `.env` dentro de `sportwear-backend` con las siguientes variables:

```env
# Base de datos
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
DATABASE_URL=

# Servidor
PORT=
FRONTEND_URL=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Recuperación de contraseña (correo)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASS=
```

### Frontend (`sportwear/.env` o `sportwear/.env.local`)

```env
VITE_API_URL=
```

`VITE_API_URL` debe apuntar a la URL base donde corre el backend (por ejemplo `http://localhost:4000/api`).

## Instrucciones para ejecutar el proyecto en entorno local

### 1. Levantar el backend

```bash
cd sportwear-backend
npm run dev
```

El servidor quedará disponible en `http://localhost:<PORT>` (por defecto `4000`).

### 2. Levantar el frontend

En otra terminal:

```bash
cd sportwear
npm run dev
```

Vite levantará la aplicación en `http://localhost:5173` (por defecto).

Con ambos servicios corriendo, el frontend consumirá la API del backend usando la URL definida en `VITE_API_URL`.

## Estructura general del proyecto

```
Modelado/
├── sportwear-backend/         # API REST (Node.js + Express + PostgreSQL)
│   └── src/
│       ├── assets/
│       ├── config/            # Conexión a la base de datos, configuración general
│       ├── controllers/       # Lógica de cada recurso (colores, productos, ventas, etc.)
│       ├── middlewares/       # Autenticación, manejo de errores, etc.
│       ├── models/            # Acceso a datos
│       ├── routes/            # Definición de endpoints de la API
│       ├── services/          # Lógica de negocio
│       ├── utils/
│       └── index.js           # Punto de entrada del servidor
│
├── sportwear/                 # Frontend (React + Vite)
│   └── src/
│       ├── assets/
│       ├── components/        # Componentes reutilizables (Sidebar, Galería, etc.)
│       ├── config/
│       ├── context/           # Contextos de React (auth, etc.)
│       ├── pages/             # Vistas: catálogo, carrito, checkout, dashboard,
│       │                      # gestión de productos, compras, pedidos, usuarios, roles, etc.
│       ├── router/            # Configuración de rutas
│       ├── services/          # Llamadas a la API
│       ├── styles/
│       └── utils/
│
├── Dockerfile                 # Imagen para desplegar el frontend
├── nixpacks.toml               # Configuración de build/deploy
└── package-lock.json
```

## Integrantes del equipo

- Nicol Zapata ([@nicolzapata](https://github.com/nicolzapata))
- Sofia Suaza

## Licencia

Este proyecto se desarrolla con fines académicos como Proyecto Final del curso de Modelado (5to trimestre). No cuenta con una licencia de código abierto definida.
