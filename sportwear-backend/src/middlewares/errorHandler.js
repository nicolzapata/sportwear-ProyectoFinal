// src/middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('ERROR GLOBAL:', err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  }
  // Violación de unique constraint en PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Ya existe un registro con ese valor.' });
  }
  // Foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referencia a un registro inexistente.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;
