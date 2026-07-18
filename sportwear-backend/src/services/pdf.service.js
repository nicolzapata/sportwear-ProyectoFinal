// src/services/pdf.service.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const fmt = (n) =>
  Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

const BROWN    = '#b49780';
const CHARCOAL = '#1a1a1a';
const MUTED    = '#888888';
const LIGHT    = '#f7f5f2';
const BORDER   = '#e5e0d8';

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

// ── Toda la lógica de dibujo del comprobante, compartida entre las dos salidas
// (descarga directa por HTTP, y buffer en memoria para adjuntar a un correo) ──
const dibujarComprobante = (doc, { venta, items }) => {
  const anchoUtil = doc.page.width - 100; // margen 50 a cada lado
  const izquierda = 50;

  // ── Encabezado: logo + nombre de marca a la izquierda, "COMPROBANTE" a la derecha ──
  let logoOk = false;
  try {
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, izquierda, 45, { width: 46, height: 46 });
      logoOk = true;
    }
  } catch { /* si el logo falla por cualquier motivo, el comprobante sigue generándose igual */ }

  const textoX = logoOk ? izquierda + 58 : izquierda;
  doc.fontSize(19).fillColor(BROWN).text('DVNA SportWear', textoX, 50);
  doc.fontSize(9).fillColor(MUTED).text('Moda deportiva', textoX, 72);

  doc.fontSize(9).fillColor(MUTED).text('COMPROBANTE DE PAGO', izquierda, 50, { width: anchoUtil, align: 'right' });
  doc.fontSize(15).fillColor(CHARCOAL).text(`#${String(venta.id_venta).padStart(4, '0')}`, izquierda, 63, { width: anchoUtil, align: 'right' });

  doc.moveTo(izquierda, 108).lineTo(izquierda + anchoUtil, 108).strokeColor(BROWN).lineWidth(1.5).stroke();
  doc.y = 122;

  // ── Caja de información: cliente / fecha / estado, sobre fondo claro ──
  const cajaY = doc.y;
  doc.roundedRect(izquierda, cajaY, anchoUtil, 54, 6).fillColor(LIGHT).fill();

  const col1 = izquierda + 16;
  const col2 = izquierda + anchoUtil / 2 + 10;

  doc.fontSize(8).fillColor(MUTED).text('CLIENTE', col1, cajaY + 10);
  doc.fontSize(11).fillColor(CHARCOAL).text(venta.cliente || '—', col1, cajaY + 22);

  doc.fontSize(8).fillColor(MUTED).text('FECHA', col2, cajaY + 10);
  doc.fontSize(11).fillColor(CHARCOAL).text(
    new Date(venta.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }),
    col2, cajaY + 22
  );

  const estadoColor = venta.estado === 'Pagado' ? '#2e7d32' : venta.estado === 'Anulado' ? '#b83232' : '#b96422';
  doc.fontSize(8).fillColor(MUTED).text('ESTADO', col1, cajaY + 38);
  doc.fontSize(10).fillColor(estadoColor).text(venta.estado, col1, cajaY + 38, { continued: false, indent: 42 });

  doc.y = cajaY + 70;

  // ── Tabla de productos — anchos calculados a partir del ancho real de la tabla,
  // para que ninguna columna (sobre todo "Subtotal") se pueda salir del borde. ──
  doc.fontSize(11).fillColor(CHARCOAL).text('Productos', izquierda, doc.y);
  doc.moveDown(0.5);

  const tablaDerecha = izquierda + anchoUtil;
  const colX = {
    producto: izquierda,
    talla:    izquierda + Math.round(anchoUtil * 0.46), // ~46% del ancho
    cant:     izquierda + Math.round(anchoUtil * 0.62),
    precio:   izquierda + Math.round(anchoUtil * 0.71),
    subtotal: izquierda + Math.round(anchoUtil * 0.84),
  };
  const anchoProducto = colX.talla - colX.producto - 8;
  const anchoPrecio   = colX.subtotal - colX.precio - 8;
  const anchoSubtotal = tablaDerecha - colX.subtotal - 8; // lo que de verdad queda hasta el borde
  const filaAlto = 22;

  // encabezado de tabla con fondo de color
  const headerY = doc.y;
  doc.rect(izquierda, headerY, anchoUtil, filaAlto).fillColor(CHARCOAL).fill();
  doc.fontSize(8.5).fillColor('#ffffff');
  doc.text('PRODUCTO', colX.producto + 8, headerY + 7);
  doc.text('TALLA', colX.talla, headerY + 7);
  doc.text('CANT.', colX.cant, headerY + 7);
  doc.text('PRECIO', colX.precio, headerY + 7);
  doc.text('SUBTOTAL', colX.subtotal, headerY + 7, { width: anchoSubtotal, align: 'right' });

  let filaY = headerY + filaAlto;
  (items || []).forEach((item, i) => {
    const subtotalLinea = item.cantidad * item.precio_unitario - (item.descuento_linea || 0);
    if (i % 2 === 1) {
      doc.rect(izquierda, filaY, anchoUtil, filaAlto).fillColor(LIGHT).fill();
    }
    doc.fontSize(9.5).fillColor(CHARCOAL);
    doc.text(item.producto || '—', colX.producto + 8, filaY + 6, { width: anchoProducto, ellipsis: true });
    doc.text(item.talla || '—', colX.talla, filaY + 6);
    doc.text(String(item.cantidad), colX.cant, filaY + 6);
    doc.text(fmt(item.precio_unitario), colX.precio, filaY + 6, { width: anchoPrecio });
    doc.text(fmt(subtotalLinea), colX.subtotal, filaY + 6, { width: anchoSubtotal, align: 'right' });
    filaY += filaAlto;
  });

  doc.rect(izquierda, headerY, anchoUtil, filaY - headerY).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.y = filaY + 18;

  // ── Caja de totales, alineada a la derecha ──
  const totalesAncho = 220;
  const totalesX = izquierda + anchoUtil - totalesAncho;
  let totalesY = doc.y;

  const lineaTotal = (label, valor, destacado = false) => {
    doc.fontSize(destacado ? 12 : 9.5)
       .fillColor(destacado ? CHARCOAL : MUTED)
       .text(label, totalesX, totalesY, { width: totalesAncho - 100 });
    doc.fontSize(destacado ? 13 : 9.5)
       .fillColor(destacado ? BROWN : CHARCOAL)
       .text(valor, totalesX + totalesAncho - 100, totalesY, { width: 100, align: 'right' });
    totalesY += destacado ? 20 : 16;
  };

  lineaTotal('Subtotal', fmt(venta.subtotal));
  if (Number(venta.descuento) > 0) lineaTotal('Descuento', `-${fmt(venta.descuento)}`);
  if (Number(venta.impuesto) > 0) lineaTotal('Impuesto', fmt(venta.impuesto));

  doc.moveTo(totalesX, totalesY + 2).lineTo(totalesX + totalesAncho, totalesY + 2).strokeColor(BORDER).lineWidth(0.5).stroke();
  totalesY += 10;

  lineaTotal('TOTAL', fmt(venta.total), true);

  if (venta.motivo_descuento) {
    doc.fontSize(8).fillColor(MUTED).text(`Motivo del descuento: ${venta.motivo_descuento}`, izquierda, totalesY + 6, { width: anchoUtil });
    totalesY += 18;
  }

  doc.y = totalesY + 30;

  // ── Pie de página ──
  const pieY = Math.max(doc.y, doc.page.height - 90);
  doc.moveTo(izquierda, pieY).lineTo(izquierda + anchoUtil, pieY).strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fontSize(9).fillColor(CHARCOAL).text('¡Gracias por tu compra!', izquierda, pieY + 12, { width: anchoUtil, align: 'center' });
  doc.fontSize(7.5).fillColor(MUTED).text(
    'Este comprobante se generó automáticamente y es válido como constancia de la transacción.',
    izquierda, pieY + 27, { width: anchoUtil, align: 'center' }
  );
};

// Genera el PDF del comprobante de una venta y lo escribe directo en la respuesta HTTP.
const generarComprobanteVentaPDF = (res, { venta, items }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="comprobante-venta-${venta.id_venta}.pdf"`);
  doc.pipe(res);

  dibujarComprobante(doc, { venta, items });

  doc.end();
};

// Genera el mismo comprobante pero como Buffer en memoria (para adjuntar a un correo).
const generarComprobanteVentaBuffer = ({ venta, items }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    dibujarComprobante(doc, { venta, items });

    doc.end();
  });
};

module.exports = { generarComprobanteVentaPDF, generarComprobanteVentaBuffer };