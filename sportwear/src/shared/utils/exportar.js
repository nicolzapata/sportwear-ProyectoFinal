// src/utils/exportar.js
const NEGRO = [26, 26, 26];
const ACENTO = [179, 139, 106]; // tono dorado/tostado de la marca Sportwear
const GRIS_TEXTO = [60, 60, 60];
const GRIS_CLARO = [246, 243, 240];
const GRIS_BORDE = [228, 224, 219];

const filasPlanas = (datos, columnas) =>
  datos.map((fila) => columnas.map((c) => (typeof c.value === "function" ? c.value(fila) : fila[c.key] ?? "")));

const fechaGenerado = () =>
  new Date().toLocaleString("es-CO", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

export async function exportarExcel(datos, columnas, nombreArchivo = "exportacion", titulo = "") {
  const XLSX = await import("xlsx");
  const encabezado = columnas.map((c) => c.header);
  const filas = filasPlanas(datos, columnas);
  const ultimaCol = Math.max(columnas.length - 1, 0);

  const hoja = XLSX.utils.aoa_to_sheet([
    ["SPORTWEAR"],
    [titulo || nombreArchivo, `Generado el ${fechaGenerado()} · ${datos.length} registro${datos.length !== 1 ? "s" : ""}`],
    [],
    encabezado,
    ...filas,
  ]);

  hoja["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: ultimaCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: ultimaCol } },
  ];
  hoja["!cols"] = columnas.map((c, i) => {
    const largoMax = Math.max(c.header.length, ...filas.map((f) => String(f[i] ?? "").length));
    return { wch: Math.min(Math.max(largoMax + 2, 10), 40) };
  });
  hoja["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3, c: ultimaCol } }) };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Datos");
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

export async function exportarPDF(datos, columnas, nombreArchivo = "exportacion", titulo = "") {
  const [{ default: jsPDF }, { default: autoTable }, { LOGO_SPORTWEAR_PNG }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("../assets/logoBase64"),
  ]);

  const doc = new jsPDF({ orientation: columnas.length > 5 ? "landscape" : "portrait" });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 14;

  const LOGO_ANCHO = 32;
  const LOGO_ALTO = LOGO_ANCHO * (174 / 900);
  const ENCABEZADO_Y = 14;

  const dibujarEncabezado = () => {
    doc.addImage(LOGO_SPORTWEAR_PNG, "PNG", margen, ENCABEZADO_Y - LOGO_ALTO + 2, LOGO_ANCHO, LOGO_ALTO);

    if (titulo) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...NEGRO);
      doc.text(titulo, anchoPagina - margen, ENCABEZADO_Y - 4, { align: "right" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado el ${fechaGenerado()} · ${datos.length} registro${datos.length !== 1 ? "s" : ""}`,
      anchoPagina - margen,
      ENCABEZADO_Y + 1,
      { align: "right" }
    );

    doc.setDrawColor(...ACENTO);
    doc.setLineWidth(0.7);
    doc.line(margen, ENCABEZADO_Y + 5, anchoPagina - margen, ENCABEZADO_Y + 5);
  };

  const dibujarPie = () => {
    const altoPagina = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...GRIS_BORDE);
    doc.setLineWidth(0.2);
    doc.line(margen, altoPagina - 12, anchoPagina - margen, altoPagina - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("Sportwear · Sistema de gestión", margen, altoPagina - 7);
  };

  autoTable(doc, {
    startY: ENCABEZADO_Y + 11,
    margin: { top: ENCABEZADO_Y + 11, bottom: 18, left: margen, right: margen },
    head: [columnas.map((c) => c.header)],
    body: filasPlanas(datos, columnas),
    theme: "striped",
    styles: {
      fontSize: 8.5,
      textColor: GRIS_TEXTO,
      cellPadding: { top: 4.5, right: 4, bottom: 4.5, left: 4 },
      lineColor: GRIS_BORDE,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: NEGRO,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
    },
    alternateRowStyles: { fillColor: GRIS_CLARO },
    didDrawPage: () => {
      dibujarEncabezado();
      dibujarPie();
    },
  });

  const totalPaginas = doc.internal.getNumberOfPages();
  const altoPagina = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margen, altoPagina - 7, { align: "right" });
  }

  doc.save(`${nombreArchivo}.pdf`);
}