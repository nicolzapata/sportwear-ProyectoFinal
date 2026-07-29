// src/routes/auth.js
const router = require('express').Router();
const { login, registro, perfil, recuperar, restablecer, checkEmail, checkDocumento } = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.post('/login',       login);                  // público
router.post('/registro',    registro);               // público
router.post('/recuperar',   recuperar);               // público
router.post('/restablecer', restablecer);             // público
router.get('/check-email',  checkEmail);              // público (validación en tiempo real)
router.get('/check-documento', checkDocumento);       // público (validación en tiempo real)
router.get('/perfil',       verificarToken, perfil);  // protegida


module.exports = router;