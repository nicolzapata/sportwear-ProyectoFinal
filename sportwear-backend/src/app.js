// src/app.js
const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ── Middlewares globales ──────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Archivos estáticos ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

app.get("/api", (req, res) => {
  res.json({
    "succes": true,
    "message": "SportWear API",
    "version": "1.0.0",
      "status": "OK"
  });
});
// ── Rutas ─────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/roles',          require('./routes/roles'));
app.use('/api/usuarios',       require('./routes/usuarios'));
app.use('/api/barrios',        require('./routes/barrios'));
app.use('/api/clientes',       require('./routes/clientes'));
app.use('/api/colores',        require('./routes/colores'));
app.use('/api/categorias',     require('./routes/categorias'));
app.use('/api/productos',      require('./routes/productos'));
app.use('/api/proveedores',    require('./routes/proveedores'));
app.use('/api/compras',        require('./routes/compras'));
app.use('/api/detalle-compra', require('./routes/detalleCompra'));
app.use('/api/ventas',         require('./routes/ventas'));
app.use('/api/detalle-venta',  require('./routes/detalleVenta'));
app.use('/api/pedidos',        require('./routes/pedidos'));
app.use('/api/pagos',          require('./routes/pagos'));
app.use('/api/metodos-pago',   require('./routes/metodosPago'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/imagenes',       require('./routes/imagenes'));
app.use('/api/variantes',      require('./routes/variantes'));

// ── Manejador de rutas no encontradas (404) ────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "El recurso solicitado no fue encontrado.",
    status: 404
  });
});

// ── Manejador de errores global ───────────────────────────────
app.use(require('./middlewares/errorHandler'));

module.exports = app;
