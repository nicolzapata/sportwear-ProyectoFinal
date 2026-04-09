// src/controllers/barrios.controller.js
const barriosService = require('../services/barrios.service');

const getBarrios = async (req, res) => {
  try {
    const data = await barriosService.getBarrios();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getZonas = async (req, res) => {
  try {
    const data = await barriosService.getZonas();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getBarrios, getZonas };