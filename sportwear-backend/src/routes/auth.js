// src/routes/auth.js
const router = require('express').Router();
const { login, registro, perfil, recuperar, restablecer } = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/login',     login);                  // público
router.post('/registro',  registro);               // público
router.post('/recuperar', recuperar);              // público
router.post('/restablecer', restablecer); // público
router.get('/perfil',     verificarToken, perfil); // protegida


module.exports = router;