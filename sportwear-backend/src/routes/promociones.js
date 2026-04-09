// src/routes/promociones.js
const router = require('express').Router();
const make   = require('../controllers/crudFactory');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

const ctrl = make('Promociones', [
  'nombre', 'descripcion', 'tipo_descuento',
  'descuento', 'fecha_inicio', 'fecha_fin', 'estado'
], 'id_promocion');

router.get('/',              ctrl.getAll);                             // público
router.get('/:id',           ctrl.getOne);                            // público
router.post('/',             verificarToken, soloAdmin, ctrl.create);
router.put('/:id',           verificarToken, soloAdmin, ctrl.update);
router.patch('/:id/estado',  verificarToken, soloAdmin, ctrl.cambiarEstado);

module.exports = router;