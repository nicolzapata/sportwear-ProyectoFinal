// src/components/GaleriaImagenes.jsx
import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useConfirm } from "../contexts/ConfirmContext";
import "./GaleriaImagenes.css";
import { IconImage } from "./galeria-imagenes/icons";
import ZonaSubida from "./galeria-imagenes/ZonaSubida";
import GruposImagenes from "./galeria-imagenes/GruposImagenes";
import { contarFotos as contarFotosHelper } from "../utils/galeriaImagenesHelpers";

export default function GaleriaImagenes({
  tipoReferencia,
  idReferencia,
  soloLectura = false,
  onPendingChange,
  coloresPendientes = [],
  coloresAPurgar = [],
  onColoresPurgados,
  refrescarColores,
}) {
  const [imagenes,         setImagenes]         = useState([]);
  const [coloresVariantes, setColoresVariantes] = useState([]);
  const [cargando,         setCargando]         = useState(true);
  const [subiendo,         setSubiendo]         = useState(false);
  const [error,            setError]            = useState("");
  const [errorSubida,      setErrorSubida]      = useState("");
  const [colorSubida,      setColorSubida]      = useState("");
  const [editandoColor,    setEditandoColor]    = useState(null);
  const [dropdownPos,      setDropdownPos]      = useState({ top: 0, left: 0 });
  const [imagenesLocales,  setImagenesLocales]  = useState([]);
  const [dropzoneAbierto,  setDropzoneAbierto]  = useState(false);

  const inputRef       = useRef();
  const paletteBtnRefs = useRef({});
  const confirmar      = useConfirm();

  const cargar = async () => {
    if (!idReferencia) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const [imgs, vars] = await Promise.all([
        api.get(`/imagenes?tipo=${tipoReferencia}&id=${idReferencia}`),
        tipoReferencia === "Producto"
          ? api.get(`/variantes?id_producto=${idReferencia}`)
          : Promise.resolve({ data: [] }),
      ]);

      setImagenes(imgs.data);

      const coloresUnicos = [
        ...new Map(
          vars.data
            .filter(v => v.id_color && v.color_nombre)
            .map(v => [
              v.id_color,
              { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex },
            ])
        ).values(),
      ];
      setColoresVariantes(coloresUnicos);
    } catch {
      setError("No se pudieron cargar las imágenes.");
    } finally {
      setCargando(false);
    }
  };

  // Se recarga también cuando `refrescarColores` cambia — eso pasa cada vez
  // que GestVariantes agrega o quita un color, ya que ambos viven en el mismo
  // modal pero son componentes hermanos y no comparten estado por su cuenta.
  useEffect(() => { cargar(); }, [idReferencia, refrescarColores]);

  // ── Purga externa: se pidió eliminar todas las fotos de ciertos colores
  // (p. ej. al eliminar la última talla de un color desde GestVariantes y el
  // usuario elige "eliminar también las fotos"). Borra las imágenes de esos
  // colores — vía API si están conectadas, filtro local si son pendientes. ──
  useEffect(() => {
    if (!coloresAPurgar || coloresAPurgar.length === 0) return;
    const idsAPurgar = coloresAPurgar.map(String);
    const purgar = async () => {
      if (idReferencia) {
        const aEliminar = imagenes.filter(i => idsAPurgar.includes(String(i.id_color)));
        await Promise.all(aEliminar.map(img => api.delete(`/imagenes/${img.id_imagen}`).catch(() => {})));
        await cargar();
      } else {
        const updated = imagenesLocales.filter(i => !idsAPurgar.includes(String(i.id_color)));
        setImagenesLocales(updated);
        onPendingChange?.(updated);
      }
      onColoresPurgados?.();
    };
    purgar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coloresAPurgar]);

  // ── Helpers de color ───────────────────────────────────────────────────────
  // Fuente de colores según el modo (conectado vs local)
  const todosColores = coloresVariantes.length > 0
    ? coloresVariantes
    : coloresPendientes;

  const tieneColores = todosColores.length > 0;

  const contarFotos = (id_color) => contarFotosHelper(id_color, imagenes, imagenesLocales);

  const totalImagenes = imagenes.length + imagenesLocales.length;
  // Solo hace falta elegir color si hay más de uno — con un solo color no hay
  // ambigüedad posible, así que no tiene sentido pedirle al usuario que lo
  // seleccione: se asigna solo.
  const necesitaColor = tieneColores && todosColores.length > 1 && !colorSubida;
  const mostrarDropzoneCompleto = totalImagenes === 0 || dropzoneAbierto;

  // ── Acciones sobre imágenes existentes (modo conectado) ───────────────────
  const setPrincipal = async (id) => {
    try { await api.patch(`/imagenes/${id}/principal`); cargar(); }
    catch { setError("No se pudo marcar como principal."); }
  };

  const eliminar = async (id) => {
    const ok = await confirmar({ title: "Eliminar imagen", message: "¿Eliminar esta imagen?", confirmLabel: "Sí, eliminar" });
    if (!ok) return;
    try { await api.delete(`/imagenes/${id}`); cargar(); }
    catch { setError("No se pudo eliminar."); }
  };

  const cambiarColor = async (id, id_color) => {
    try {
      const payload = id_color != null ? { id_color: Number(id_color) } : { id_color: null };
      await api.patch(`/imagenes/${id}/color`, payload);
      setEditandoColor(null);
      cargar();
    } catch {
      setError("No se pudo actualizar el color.");
    }
  };

  // ── Subida de imágenes (común a ambos modos) ───────────────────────────────
  // Con un solo color, se asigna automáticamente sin pedirle nada al usuario;
  // con 2+ colores, se usa el que haya elegido en los chips (colorSubida).
  const colorParaSubir = todosColores.length === 1 ? todosColores[0].id_color : colorSubida;

  const procesarArchivos = (files) => {
    const nuevas = Array.from(files).map(file => ({
      file,
      id_color: colorParaSubir || null,
      preview: URL.createObjectURL(file),
    }));
    setImagenesLocales(prev => {
      const updated = [...prev, ...nuevas];
      onPendingChange?.(updated);
      return updated;
    });
    setColorSubida("");
    setErrorSubida("");
    setDropzoneAbierto(false);
  };

  const seleccionarColorSubida = (id_color) => {
    setColorSubida(id_color);
    setErrorSubida("");
  };

  const onInputChange = (e) => {
    if (!e.target.files.length) return;
    procesarArchivos(e.target.files);
    e.target.value = "";
  };

  const onDropzoneClick = () => {
    if (subiendo) return;
    if (necesitaColor) { setErrorSubida("Selecciona un color antes de subir fotos."); return; }
    inputRef.current?.click();
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (necesitaColor) { setErrorSubida("Selecciona un color antes de subir fotos."); return; }
    if (!e.dataTransfer.files.length) return;
    procesarArchivos(e.dataTransfer.files);
  };

  const onDropCollapsado = (e) => {
    e.preventDefault();
    if (necesitaColor) {
      setErrorSubida("Selecciona un color antes de subir fotos.");
      setDropzoneAbierto(true);
      return;
    }
    if (!e.dataTransfer.files.length) { setDropzoneAbierto(true); return; }
    procesarArchivos(e.dataTransfer.files);
  };

  const eliminarLocal = (index) => {
    setImagenesLocales(prev => {
      const updated = prev.filter((_, i) => i !== index);
      onPendingChange?.(updated);
      return updated;
    });
  };

  const zonaSubidaProps = {
    mostrarDropzoneCompleto, setDropzoneAbierto, onDropCollapsado,
    tieneColores, todosColores, colorSubida, seleccionarColorSubida, contarFotos,
    errorSubida, necesitaColor, subiendo,
    inputRef, onInputChange, onDrop, onDropzoneClick,
  };

  const gruposProps = {
    imagenes, imagenesLocales, todosColores, soloLectura, tieneColores,
    eliminarLocal, setPrincipal, eliminar, cambiarColor,
    editandoColor, setEditandoColor, dropdownPos, setDropdownPos, paletteBtnRefs,
  };

  // ════════════════════════════════════════════════════════════════
  // MODO SIN PRODUCTO GUARDADO (idReferencia null/undefined)
  // Permite subir imágenes y previsualizarlas antes de guardar
  // ════════════════════════════════════════════════════════════════
  if (!idReferencia) {
    return (
      <div className="gi-container">
        {!soloLectura && <ZonaSubida {...zonaSubidaProps} />}
        {totalImagenes > 0 && <GruposImagenes {...gruposProps} />}
        {totalImagenes === 0 && (
          <div className="gi-empty">
            <IconImage />
            <span>Sube al menos una foto por color para poder publicar el producto.</span>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MODO CON PRODUCTO GUARDADO
  // ════════════════════════════════════════════════════════════════
  if (cargando) return (
    <div className="gi-loading"><div className="gi-spinner" /> Cargando imágenes...</div>
  );

  return (
    <div className="gi-container">
      {error && <p className="gi-error">{error}</p>}

      {!soloLectura && <ZonaSubida {...zonaSubidaProps} />}

      {totalImagenes > 0 && <GruposImagenes {...gruposProps} />}

      {totalImagenes === 0 && (
        <div className="gi-empty">
          <IconImage />
          <span>Sin imágenes todavía.</span>
        </div>
      )}
    </div>
  );
}
