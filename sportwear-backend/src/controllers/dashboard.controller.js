// src/controllers/dashboard.controller.js
const dashboardService = require('../services/dashboard.service');

const getResumen = async (req, res) => {
  try {
    const data = await dashboardService.getResumen();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getVentasMensuales = async (req, res) => {
  try {
    const data = await dashboardService.getVentasMensuales();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

const getComprasMensuales = async (req, res) => {
  try {
    const data = await dashboardService.getComprasMensuales();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ── NUEVO: reporte de ventas filtrado por rango de fechas (?desde=&hasta=) ──
const getReporteVentas = async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const data = await dashboardService.getReporteVentas({ desde, hasta });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

module.exports = { getResumen, getVentasMensuales, getComprasMensuales, getReporteVentas };