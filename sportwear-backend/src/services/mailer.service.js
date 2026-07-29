// src/services/mailer.service.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Envío "fire and forget": si falla, se loguea pero nunca debe romper
// el flujo principal (registro de cliente, confirmación de pago, etc.)
// ── NUEVO: soporta "attachments" (ej. el PDF del comprobante de venta) ──
const enviarCorreo = async ({ to, subject, html, attachments }) => {
  try {
    await transporter.sendMail({
      from: `"DVNA SportWear" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    });
  } catch (err) {
    console.error('Error enviando correo:', err.message);
  }
};

const formatearFecha = (fecha = new Date()) =>
  new Date(fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

// Filas "etiqueta: valor" reutilizadas en todas las plantillas para incluir
// siempre fecha, nombre y documento del cliente cuando estén disponibles.
const filasDatos = (campos) => `
  <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
    ${campos
      .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
      .map(([label, valor]) => `
        <tr>
          <td style="color:#888;padding:3px 0">${label}</td>
          <td style="text-align:right;color:#1a1a1a">${valor}</td>
        </tr>
      `).join('')}
  </table>
`;

const plantillaBienvenida = ({ nombre, email, documento, fecha }) => `
  <div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#b49780">DVNA SportWear</h2>
    <p>Hola ${nombre},</p>
    <p>Tu cuenta fue creada exitosamente con el correo <strong>${email}</strong>.</p>
    ${filasDatos([['Fecha de registro', formatearFecha(fecha)], ['Documento', documento]])}
    <p>Ya puedes iniciar sesión y comenzar a comprar en nuestro catálogo.</p>
    <a href="${process.env.FRONTEND_URL}/login"
       style="display:inline-block;padding:12px 24px;background:#b49780;color:#fff;
              border-radius:6px;text-decoration:none;margin:16px 0">
      Ir a mi cuenta
    </a>
  </div>
`;

module.exports = { enviarCorreo, formatearFecha, filasDatos, plantillaBienvenida };