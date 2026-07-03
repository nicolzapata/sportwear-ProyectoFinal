// src/services/pdf.service.js
const PDFDocument = require('pdfkit');

const fmt = (n) =>
  Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

// Genera el PDF del comprobante de una venta y lo escribe directo en la respuesta HTTP.
const generarComprobanteVentaPDF = (res, { venta, items }) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="comprobante-venta-${venta.id_venta}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor('#b49780').text('DVNA SportWear', { align: 'left' });
  doc.fontSize(11).fillColor('#666').text('Comprobante de pago', { align: 'left' });
  doc.moveDown(1.2);

  doc.strokeColor('#e5e5e5').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.8);

  doc.fillColor('#1a1a1a').fontSize(13).text(`Pedido #${venta.id_venta}`);
  doc.fontSize(10).fillColor('#666');
  doc.text(`Fecha: ${new Date(venta.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  doc.text(`Cliente: ${venta.cliente || '—'}`);
  doc.text(`Estado: ${venta.estado}`);
  doc.moveDown(1);

  doc.fillColor('#1a1a1a').fontSize(12).text('Productos', { underline: false });
  doc.moveDown(0.3);

  const colX = { producto: 50, talla: 300, cant: 360, precio: 420, subtotal: 480 };
  doc.fontSize(9).fillColor('#888');
  doc.text('Producto', colX.producto, doc.y, { continued: false });
  doc.text('Talla', colX.talla, doc.y - 11);
  doc.text('Cant.', colX.cant, doc.y - 11);
  doc.text('Precio', colX.precio, doc.y - 11);
  doc.text('Subtotal', colX.subtotal, doc.y - 11);
  doc.moveDown(0.4);
  doc.strokeColor('#eee').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);

  doc.fillColor('#1a1a1a').fontSize(9.5);
  (items || []).forEach((item) => {
    const y = doc.y;
    const subtotal = item.cantidad * item.precio_unitario - (item.descuento_linea || 0);
    doc.text(item.producto || '—', colX.producto, y, { width: 240 });
    doc.text(item.talla || '—', colX.talla, y);
    doc.text(String(item.cantidad), colX.cant, y);
    doc.text(fmt(item.precio_unitario), colX.precio, y);
    doc.text(fmt(subtotal), colX.subtotal, y);
    doc.moveDown(0.6);
  });

  doc.moveDown(0.5);
  doc.strokeColor('#e5e5e5').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);

  doc.fontSize(10).fillColor('#666');
  doc.text(`Subtotal: ${fmt(venta.subtotal)}`, { align: 'right' });
  if (Number(venta.descuento) > 0) doc.text(`Descuento: -${fmt(venta.descuento)}`, { align: 'right' });
  if (Number(venta.impuesto) > 0) doc.text(`Impuesto: ${fmt(venta.impuesto)}`, { align: 'right' });
  doc.fontSize(13).fillColor('#1a1a1a').text(`Total: ${fmt(venta.total)}`, { align: 'right' });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999').text(
    'Este comprobante se generó automáticamente y es válido como constancia de la transacción.',
    { align: 'center' }
  );

  doc.end();
};

module.exports = { generarComprobanteVentaPDF };
