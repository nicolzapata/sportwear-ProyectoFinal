// src/components/ExportButtons.jsx
// Reemplazo del botón "Imprimir": exporta la tabla visible a Excel o PDF real.
import { useState, useRef, useEffect } from "react";
import { exportarExcel, exportarPDF } from "../utils/exportar";
import { useToast } from "../contexts/ToastContext";
import { IconFileText } from "./Icons";
import "./ExportButtons.css";

export default function ExportButtons({ datos, obtenerDatos, columnas, nombreArchivo = "exportacion", titulo = "" }) {
  const [abierto, setAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const ref = useRef(null);
  const showToast = useToast();

  useEffect(() => {
    const onClickFuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const manejarExportar = async (formato) => {
    setAbierto(false);
    setExportando(true);
    try {
      // Si la tabla pagina contra el backend, "datos" solo trae la página actual;
      // obtenerDatos() (si se pasa) trae el total de resultados filtrados para exportar.
      const filas = obtenerDatos ? await obtenerDatos() : datos;
      if (formato === "excel") await exportarExcel(filas, columnas, nombreArchivo, titulo);
      else await exportarPDF(filas, columnas, nombreArchivo, titulo);
    } catch {
      showToast("error", "No se pudo generar el archivo de exportación.");
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="export-buttons" ref={ref}>
      <button
        type="button"
        className="btn-print"
        title="Exportar tabla"
        disabled={exportando}
        onClick={() => setAbierto((v) => !v)}
      >
        <IconFileText />
      </button>
      {abierto && (
        <div className="export-menu">
          <button type="button" onClick={() => manejarExportar("excel")}>
            Exportar a Excel
          </button>
          <button type="button" onClick={() => manejarExportar("pdf")}>
            Exportar a PDF
          </button>
        </div>
      )}
    </div>
  );
}
