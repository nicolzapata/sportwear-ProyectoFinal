// src/routes/barrios.js
const router = require('express').Router();
const { getBarrios, getZonas } = require('../controllers/barrios.controller');

router.get('/', getBarrios);
router.get('/zonas', getZonas);

module.exports = router;