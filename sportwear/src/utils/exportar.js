// src/utils/exportar.js
const filasPlanas = (datos, columnas) =>
  datos.map((fila) => columnas.map((c) => (typeof c.value === "function" ? c.value(fila) : fila[c.key] ?? "")));

export async function exportarExcel(datos, columnas, nombreArchivo = "exportacion") {
  const XLSX = await import("xlsx");
  const filas = [columnas.map((c) => c.header), ...filasPlanas(datos, columnas)];
  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Datos");
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

export async function exportarPDF(datos, columnas, nombreArchivo = "exportacion", titulo = "") {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: columnas.length > 5 ? "landscape" : "portrait" });
  if (titulo) {
    doc.setFontSize(14);
    doc.text(titulo, 14, 15);
  }
  autoTable(doc, {
    startY: titulo ? 22 : 12,
    head: [columnas.map((c) => c.header)],
    body: filasPlanas(datos, columnas),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [26, 26, 26] },
  });
  doc.save(`${nombreArchivo}.pdf`);
}