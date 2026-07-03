// src/routes/detalleVenta.js
const router  = require('express').Router();
const pool    = require('../config/db');
const {
  getDetalles, getDetalleById, crearDetalle,
  actualizarDetalle, eliminarDetalle
} = require('../controllers/detalleVenta.controller');
const {
  verificarToken, soloAdmin, soloCliente
} = require('../middlewares/auth.middleware');

// ── Rutas de Admin ─────────────────────────────────────────────────────────
router.get('/',       verificarToken, soloAdmin, getDetalles);
router.get('/:id',    verificarToken, soloAdmin, getDetalleById);
router.post('/',      verificarToken, soloAdmin, crearDetalle);
router.put('/:id',    verificarToken, soloAdmin, actualizarDetalle);
router.delete('/:id', verificarToken, soloAdmin, eliminarDetalle);

// ── Middleware: verifica que la venta del detalle pertenece al cliente ──────
// Se usa en las rutas de cliente para evitar que manipulen ventas ajenas.
const esDetallePropio = async (req, res, next) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const id_detalle = req.params.id;

    const result = await pool.query(`
      SELECT v.id_cliente
      FROM "DetalleVenta" dv
      JOIN "Ventas" v ON dv.id_venta = v.id_venta
      WHERE dv.id_detalle_venta = $1
    `, [id_detalle]);

    if (!result.rows.length)
      return res.status(404).json({ message: 'Detalle no encontrado.' });

    if (result.rows[0].id_cliente !== id_cliente)
      return res.status(403).json({ message: 'No tienes permiso sobre este detalle.' });

    next();
  } catch (err) {
    res.status(500).json({ message: 'Error de verificación.' });
  }
};

// ── Middleware: verifica que la venta del body pertenece al cliente ─────────
// Se usa en POST para evitar que el cliente inserte en ventas ajenas.
const esVentaPropia = async (req, res, next) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const id_venta   = req.body.id_venta;

    if (!id_venta)
      return res.status(400).json({ message: 'id_venta es requerido.' });

    const result = await pool.query(
      `SELECT id_cliente FROM "Ventas" WHERE id_venta = $1`,
      [id_venta]
    );

    if (!result.rows.length)
      return res.status(404).json({ message: 'Venta no encontrada.' });

    if (result.rows[0].id_cliente !== id_cliente)
      return res.status(403).json({ message: 'No tienes permiso sobre esta venta.' });

    next();
  } catch (err) {
    res.status(500).json({ message: 'Error de verificación.' });
  }
};

// ── Rutas de Cliente ───────────────────────────────────────────────────────
// GET  /api/detalle-venta/mis-items?id_venta=X  → solo los detalles de sus ventas
router.get('/mis-items', verificarToken, soloCliente, async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;
    const id_venta   = req.query.id_venta;

    // Si pasa id_venta, verificar que le pertenezca
    if (id_venta) {
      const check = await pool.query(
        `SELECT id_cliente FROM "Ventas" WHERE id_venta = $1`,
        [id_venta]
      );
      if (!check.rows.length)
        return res.status(404).json({ message: 'Venta no encontrada.' });
      if (check.rows[0].id_cliente !== id_cliente)
        return res.status(403).json({ message: 'No tienes permiso sobre esta venta.' });
    }

    const result = await pool.query(`
      SELECT dv.*, p.nombre AS producto, pv.talla,
             cat.nombre AS categoria, col.nombre AS color,
             v.fecha AS fecha_venta, v.estado AS estado_venta
      FROM "DetalleVenta" dv
      JOIN "Productos"  p   ON dv.id_producto = p.id_producto
      JOIN "Categorias" cat ON p.id_categoria = cat.id_categoria
      LEFT JOIN "ProductoVariantes" pv ON dv.id_variante = pv.id_variante
      LEFT JOIN "Colores" col ON pv.id_color  = col.id_color
      JOIN "Ventas"     v   ON dv.id_venta   = v.id_venta
      WHERE v.id_cliente = $1
        ${id_venta ? 'AND dv.id_venta = $2' : ''}
      ORDER BY dv.id_detalle_venta DESC
    `, id_venta ? [id_cliente, id_venta] : [id_cliente]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/detalle-venta/mis-items  → agregar ítem a una venta propia
router.post('/mis-items', verificarToken, soloCliente, esVentaPropia, crearDetalle);

// PUT  /api/detalle-venta/mis-items/:id  → actualizar ítem propio
router.put('/mis-items/:id',
  verificarToken, soloCliente,
  (req, res, next) => { req.params.id = req.params.id; next(); },
  esDetallePropio,
  actualizarDetalle
);

// DELETE /api/detalle-venta/mis-items/:id  → eliminar ítem propio
router.delete('/mis-items/:id',
  verificarToken, soloCliente,
  esDetallePropio,
  eliminarDetalle
);

module.exports = router;