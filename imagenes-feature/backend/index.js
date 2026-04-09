// ================================================================
//  CAMBIOS A HACER EN sportzone-backend/src/index.js
// ================================================================

const express = require("express");
const cors    = require("cors");
const path    = require("path");   // ← AGREGAR si no está
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ── AGREGAR ESTA LÍNEA: sirve las imágenes como archivos estáticos ──
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ... tus rutas existentes ...
app.use("/api/auth",           require("./routes/auth"));
app.use("/api/roles",          require("./routes/roles"));
app.use("/api/usuarios",       require("./routes/usuarios"));
app.use("/api/barrios",        require("./routes/barrios"));
app.use("/api/clientes",       require("./routes/clientes"));
app.use("/api/colores",        require("./routes/colores"));
app.use("/api/categorias",     require("./routes/categorias"));
app.use("/api/productos",      require("./routes/productos"));
app.use("/api/proveedores",    require("./routes/proveedores"));
app.use("/api/compras",        require("./routes/compras"));
app.use("/api/detalle-compra", require("./routes/detalleCompra"));
app.use("/api/ventas",         require("./routes/ventas"));
app.use("/api/detalle-venta",  require("./routes/detalleVenta"));
app.use("/api/promociones",    require("./routes/promociones"));
app.use("/api/pagos",          require("./routes/pagos"));
app.use("/api/dashboard",      require("./routes/dashboard"));
app.use("/api/imagenes",       require("./routes/imagenes"));  // ← AGREGAR

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
