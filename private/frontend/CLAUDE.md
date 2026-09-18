# SportWear Frontend — `sportwear/`

> Ver también el [resumen general del proyecto](../CLAUDE.md).

## Qué es

Aplicación web que sirve dos propósitos en una sola SPA:

1. **Catálogo público / cliente**: catálogo, detalle de producto, carrito, checkout (con cuotas), "sobre nosotros" y "mi cuenta".
2. **Panel administrativo**: dashboard, gestión de productos/variantes/colores/categorías, proveedores, compras, ventas/pedidos, clientes, usuarios y roles — protegido por rol/módulo.

## Stack técnico

- **React 18** + **Vite 5** (`@vitejs/plugin-react`)
- **React Router DOM v6** (`BrowserRouter`, rutas con flags `v7_startTransition` / `v7_relativeSplatPath`)
- **Axios** para consumo de la API
- **jsPDF** + `jspdf-autotable` para generación de PDFs (recibos/reportes)
- **xlsx** para exportación a Excel
- **react-icons**
- **ESLint** (flat config, `eslint.config.js`)
- Sin librería de estilos/CSS framework: CSS plano por módulo (`*.css` junto a cada componente/página) + `src/styles/`

## Estructura (`src/`)

Organización **feature-based** (no por tipo de archivo):

```
src/
├── main.jsx
├── App.jsx              # monta <AppRouter />
├── routes.jsx           # definición de todas las rutas (AppRouter)
├── config/               # configuración (p.ej. cliente Axios)
├── router/
├── services/             # llamadas HTTP a la API por recurso
├── context/              # contextos legacy/compartidos
├── shared/
│   ├── components/       # componentes reutilizables (Navbar, Modal, Toast, Select, ProtectedRoute...)
│   ├── contexts/         # AuthContext, CartContext, ToastContext, ConfirmContext, ThemeContext
│   ├── pages/            # NotFound, etc.
│   └── utils/
├── features/
│   ├── auth/             # Login, Registro, Recuperar/Restablecer contraseña
│   ├── catalogo/         # Catálogo público + gestión (productos, variantes, colores, categorías)
│   ├── carrito/
│   ├── checkout/         # incluye lógica de cuotas/calendario
│   ├── clientes/         # Mi cuenta, gestión de clientes
│   ├── compras/
│   ├── ventas/           # Pedidos, PedidosVentas (panel admin)
│   ├── proveedores/
│   ├── usuarios/
│   ├── roles/
│   └── dashboard/
└── styles/
```

Cada feature suele traer su propia carpeta `components/`, `hooks/`, `pages/`, `utils/` — es decir, el corte principal es por dominio de negocio, no por tipo técnico.

## Enrutamiento y control de acceso (`src/routes.jsx`)

- Providers globales anidados: `ThemeProvider` → `ToastProvider` → `ConfirmProvider` → `AuthProvider` → `CartProvider` → `BrowserRouter`.
- Rutas **sin navbar**: `/login`, `/registro`, `/recuperar`, `/restablecer-contrasena`.
- Rutas **públicas con navbar de cliente** (`PublicLayout`): `/`, `/catalogo`, `/catalogo/:id`, `/carrito`, `/checkout`, `/sobre-nosotros`.
- `/mi-cuenta`: layout condicional — si el usuario es "Cliente" pero tiene módulos de admin asignados, usa el layout admin (`Layout`); si no, `PublicLayout`.
- Rutas **protegidas** (`ProtectedRoute` + `Layout` admin): `/dashboard`, `/roles`, `/usuarios`, `/productos`, `/catalogo-admin`, `/proveedores`, `/compras`, `/pedidos`, `/ventas` — cada una envuelta además en `<P k="...">` que valida el módulo/permiso específico (`ProtectedRoute` con `requiredKey`).
- El control de qué es "admin" vs "cliente" se basa en los `modulos` que trae el usuario autenticado (ver `MODULOS_CLIENTE` en `routes.jsx`), reflejando el modelo de permisos del backend.

## Consumo de la API

- Variable de entorno `VITE_API_URL` define la URL base (ej. `http://localhost:4000/api`).
- Servicios en `src/services/` (y por feature) encapsulan las llamadas Axios a cada recurso del backend.
- El token JWT (de `AuthContext`) se envía en cada request protegida.

## Variables de entorno

Archivo `.env` o `.env.local` en `sportwear/`:

```env
VITE_API_URL=
```

## Scripts

```bash
npm install
npm run dev       # vite (default http://localhost:5173)
npm run build     # vite build -> dist/
npm run preview   # sirve el build localmente
npm run lint      # eslint .
```

## Build / despliegue

- `npm run build` genera `dist/` (estático).
- Config de Vercel en `sportwear/vercel.json` (despliegue actual conocido).
- El `Dockerfile` en la raíz del monorepo también construye este proyecto (`npm install && npm run build`) y sirve `dist/` con `serve`.

## Docker

Ver `sportwear/Dockerfile` (build multi-stage: Node para compilar, Nginx para servir el estático) y el `docker-compose.yml` en la raíz, que inyecta `VITE_API_URL` apuntando al servicio `backend` interno de la red de Docker.
