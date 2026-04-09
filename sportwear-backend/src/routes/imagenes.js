// src/routes/imagenes.js
const router     = require('express').Router();
const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const pool       = require('../config/db');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// ── Cloudinary config ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer en memoria ─────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Solo JPG, PNG, WEBP o GIF'), false);
  },
});

// ── Helper: subir buffer a Cloudinary ────────────────────────
const subirACloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        'productos',
        public_id:     `img_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

// ── GET /api/imagenes?tipo=Producto&id=X[&id_color=Y]  (público) ──
// Si se pasa id_color filtra por ese color; sin él devuelve todas.
router.get('/', async (req, res) => {
  try {
    const { tipo = 'Producto', id, id_color } = req.query;
    if (!id) return res.status(400).json({ message: 'Falta el parámetro id' });

    let query, params;
    if (id_color) {
      query  = `SELECT * FROM "Imagenes"
                WHERE tipo_referencia = $1 AND id_referencia = $2
                  AND (id_color = $3 OR id_color IS NULL)
                  AND estado = 'Activo'
                ORDER BY
                  CASE WHEN id_color = $3 THEN 0 ELSE 1 END,
                  orden ASC, id_imagen ASC`;
      params = [tipo, parseInt(id), parseInt(id_color)];
    } else {
      query  = `SELECT * FROM "Imagenes"
                WHERE tipo_referencia = $1 AND id_referencia = $2
                ORDER BY orden ASC, id_imagen ASC`;
      params = [tipo, parseInt(id)];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/imagenes/:id  (público) ──────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "Imagenes" WHERE id_imagen = $1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Imagen no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/imagenes  (admin) ───────────────────────────────
// Body (multipart): tipo_referencia, id_referencia, id_color?, titulo?, descripcion?
router.post('/', verificarToken, soloAdmin, upload.array('imagenes', 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length)
      return res.status(400).json({ message: 'No se recibió ninguna imagen' });

    const {
      tipo_referencia = 'Producto',
      id_referencia,
      id_color,
      titulo,
      descripcion,
    } = req.body;

    if (!id_referencia) return res.status(400).json({ message: 'Falta id_referencia' });

    const idColor = id_color ? parseInt(id_color) : null;

    const maxRes = await pool.query(
      `SELECT COALESCE(MAX(orden), 0) AS max_orden FROM "Imagenes"
       WHERE tipo_referencia = $1 AND id_referencia = $2`,
      [tipo_referencia, parseInt(id_referencia)]
    );
    let ordenActual  = parseInt(maxRes.rows[0].max_orden);
    const esLaPrimera = ordenActual === 0;
    const insertadas  = [];

    for (const file of req.files) {
      ordenActual++;
      const resultado  = await subirACloudinary(file.buffer);
      const esPrincipal = esLaPrimera && ordenActual === 1;

      const ins = await pool.query(
        `INSERT INTO "Imagenes"
           (tipo_referencia, id_referencia, id_color, url, nombre_archivo,
            tipo_mime, tamanio_bytes, titulo, descripcion, orden, es_principal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [
          tipo_referencia,
          parseInt(id_referencia),
          idColor,
          resultado.secure_url,
          resultado.public_id,
          file.mimetype,
          file.size,
          titulo || file.originalname,
          descripcion || null,
          ordenActual,
          esPrincipal,
        ]
      );
      insertadas.push(ins.rows[0]);
    }
    res.status(201).json(insertadas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/imagenes/:id/color  (admin) ────────────────────
// Cambia o quita el color asociado a una imagen
router.patch('/:id/color', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { id_color } = req.body; // null para quitar el color
    const idColor = id_color != null ? parseInt(id_color) : null;
    const result = await pool.query(
      `UPDATE "Imagenes" SET id_color = $1 WHERE id_imagen = $2 RETURNING *`,
      [idColor, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Imagen no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PATCH /api/imagenes/:id/principal  (admin) ────────────────
router.patch('/:id/principal', verificarToken, soloAdmin, async (req, res) => {
  try {
    const img = await pool.query(`SELECT * FROM "Imagenes" WHERE id_imagen = $1`, [req.params.id]);
    if (!img.rows.length) return res.status(404).json({ message: 'Imagen no encontrada' });
    const { tipo_referencia, id_referencia } = img.rows[0];

    await pool.query(
      `UPDATE "Imagenes" SET es_principal = FALSE
       WHERE tipo_referencia = $1 AND id_referencia = $2`,
      [tipo_referencia, id_referencia]
    );
    const result = await pool.query(
      `UPDATE "Imagenes" SET es_principal = TRUE WHERE id_imagen = $1 RETURNING *`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PATCH /api/imagenes/:id/orden  (admin) ────────────────────
router.patch('/:id/orden', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { orden } = req.body;
    const result = await pool.query(
      `UPDATE "Imagenes" SET orden = $1 WHERE id_imagen = $2 RETURNING *`,
      [orden, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Imagen no encontrada' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/imagenes/:id  (admin) ─────────────────────────
router.delete('/:id', verificarToken, soloAdmin, async (req, res) => {
  try {
    const img = await pool.query(`SELECT * FROM "Imagenes" WHERE id_imagen = $1`, [req.params.id]);
    if (!img.rows.length) return res.status(404).json({ message: 'Imagen no encontrada' });
    const { nombre_archivo, es_principal, tipo_referencia, id_referencia } = img.rows[0];

    await cloudinary.uploader.destroy(nombre_archivo);
    await pool.query(`DELETE FROM "Imagenes" WHERE id_imagen = $1`, [req.params.id]);

    if (es_principal) {
      await pool.query(
        `UPDATE "Imagenes" SET es_principal = TRUE
         WHERE id_imagen = (
           SELECT id_imagen FROM "Imagenes"
           WHERE tipo_referencia = $1 AND id_referencia = $2
           ORDER BY orden ASC LIMIT 1
         )`,
        [tipo_referencia, id_referencia]
      );
    }
    res.json({ ok: true, message: 'Imagen eliminada correctamente' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;