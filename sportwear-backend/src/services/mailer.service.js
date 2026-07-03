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
const enviarCorreo = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"DVNA SportWear" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Error enviando correo:', err.message);
  }
};

module.exports = { enviarCorreo };