// src/routes/variantes.js
const router = require('express').Router();
const {
  getVariantesByProducto,
  crearVariante,
  actualizarVariante,
  eliminarVariante,
} = require('../models/variante.model');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// GET /api/variantes?id_producto=X
router.get('/', async (req, res) => {
  try {
    const { id_producto } = req.query;
    if (!id_producto) return res.status(400).json({ message: 'Falta id_producto' });
    const data = await getVariantesByProducto(parseInt(id_producto));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

// POST /api/variantes
router.post('/', verificarToken, soloAdmin, async (req, res) => {
  try {
    const data = await crearVariante(req.body);
    res.status(201).json(data);
  } catch (err) {
    // Violación unique: combinación ya existe
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe una variante con esa talla y color para este producto.' });
    }
    res.status(err.status || 500).json({ message: err.message });
  }
});

// PUT /api/variantes/:id
router.put('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const data = await actualizarVariante(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe una variante con esa talla y color para este producto.' });
    }
    res.status(err.status || 500).json({ message: err.message });
  }
});

// DELETE /api/variantes/:id
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    await eliminarVariante(req.params.id);
    res.json({ ok: true, message: 'Variante eliminada' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;