// src/components/GaleriaImagenes.jsx
import { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { useConfirm } from "../contexts/ConfirmContext";
import "./GaleriaImagenes.css";
import { IconImage } from "./galeria-imagenes/icons";
import ZonaSubida from "./galeria-imagenes/ZonaSubida";
import GruposImagenes from "./galeria-imagenes/GruposImagenes";
import GaleriaNuevoProducto from "./galeria-imagenes/GaleriaNuevoProducto";
import { contarFotos as contarFotosHelper } from "../utils/galeriaImagenesHelpers";
import { detectarColoresDeImagen, emparejarConCatalogo } from "../utils/colorDetection";

export default function GaleriaImagenes({
  tipoReferencia,
  idReferencia,
  soloLectura = false,
  onPendingChange,
  coloresPendientes = [],
  coloresAPurgar = [],
  onColoresPurgados,
  refrescarColores,
  onColoresDetectados,
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
  const [detectandoColor,  setDetectandoColor]  = useState(false);

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

  // Igual que cambiarColor, pero para una foto todavía sin guardar (pendiente
  // de subir) — no hay nada que pedirle a la API, solo se actualiza el estado
  // local. Sirve para corregir a mano el color que detectó automáticamente
  // (p. ej. en una prenda mitad y mitad, donde solo se puede adivinar uno).
  const cambiarColorLocal = (idx, id_color) => {
    setImagenesLocales(prev => {
      const updated = prev.map((img, i) => i === idx ? { ...img, id_color: id_color != null ? Number(id_color) : null } : img);
      onPendingChange?.(updated);
      return updated;
    });
    setEditandoColor(null);
  };

  // ── Subida de imágenes (común a ambos modos) ───────────────────────────────
  // Con un solo color, se asigna automáticamente sin pedirle nada al usuario;
  // con 2+ colores, se usa el que haya elegido en los chips (colorSubida).
  const colorParaSubir = todosColores.length === 1 ? todosColores[0].id_color : colorSubida;

  // ── Detección automática de color: corre siempre que se sube una primera
  // foto, sin importar cuántos colores tenga ya el producto — así, al editar
  // un producto que ya tiene 2+ colores, subir la foto de un color nuevo
  // también dispara la sugerencia en vez de exigir elegir el color a mano
  // antes de poder subir. No bloquea la subida: corre en paralelo. ─────────
  const detectarColorAutomatico = async (primerArchivo, colorExistente) => {
    if (!onColoresDetectados || !primerArchivo.type?.startsWith("image/")) return;
    setDetectandoColor(true);
    try {
      const [detectados, { data: catalogo }] = await Promise.all([
        detectarColoresDeImagen(primerArchivo),
        api.get("/colores"),
      ]);
      const { todos, principales } = emparejarConCatalogo(detectados, catalogo.filter(c => c.estado === "Activo"));
      if (todos.length === 0) return;

      // Si ya había un único color en el producto y esta foto detectó ese
      // mismo color, no hay nada que hacer — colorParaSubir ya la dejó
      // asignada ahí. Solo se avisa/reasigna cuando la foto resulta ser de
      // un color distinto al que ya existía.
      const mismoColorQueYaExiste = colorExistente && principales.length === 1
        && String(principales[0].id_color) === String(colorExistente.id_color);
      if (mismoColorQueYaExiste) return;

      onColoresDetectados(todos, principales.map(c => c.id_color));

      // Con un solo color principal claro, se asigna directo a la foto que se
      // acaba de subir — no basta con sugerirlo en Variantes, la idea es que
      // la foto quede realmente etiquetada con ese color (reemplazando el
      // color existente con el que se había asignado "a ciegas" si resultó
      // ser otro). Si es "mitad y mitad" (2 principales) no se puede saber
      // cuál va con esta foto sin ambigüedad, así que se deja para que el
      // usuario la asigne a mano con la paleta de la tarjeta.
      if (principales.length === 1) {
        const idColor = principales[0].id_color;
        setImagenesLocales(prev => {
          const updated = prev.map(img => img.file === primerArchivo ? { ...img, id_color: idColor } : img);
          onPendingChange?.(updated);
          return updated;
        });
      }
    } catch {
      // La detección es una ayuda opcional — si falla, el usuario simplemente
      // elige los colores a mano como siempre.
    } finally {
      setDetectandoColor(false);
    }
  };

  const procesarArchivos = (files) => {
    const listaArchivos = Array.from(files);
    if (listaArchivos[0]) {
      detectarColorAutomatico(listaArchivos[0], todosColores.length === 1 ? todosColores[0] : null);
    }

    const nuevas = listaArchivos.map(file => ({
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
    inputRef.current?.click();
  };

  // Nunca bloquea la subida por falta de color: con 2+ colores, el chip de
  // arriba sigue siendo útil si el usuario YA sabe el color, pero si no lo
  // elige, la foto sube igual sin color y la detección automática (o el
  // selector por foto en GruposImagenes) se encarga de asignarlo después.
  const onDrop = (e) => {
    e.preventDefault();
    if (!e.dataTransfer.files.length) return;
    procesarArchivos(e.dataTransfer.files);
  };

  // Igual que onDrop — se mantiene aparte solo porque la galería de "nuevo
  // producto" usa su propio dropzone.
  const onDropNuevo = onDrop;

  const onDropCollapsado = (e) => {
    e.preventDefault();
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
    errorSubida, subiendo,
    inputRef, onInputChange, onDrop, onDropzoneClick,
  };

  const gruposProps = {
    imagenes, imagenesLocales, todosColores, soloLectura, tieneColores,
    eliminarLocal, setPrincipal, eliminar, cambiarColor, cambiarColorLocal,
    editandoColor, setEditandoColor, dropdownPos, setDropdownPos, paletteBtnRefs,
  };

  // ════════════════════════════════════════════════════════════════
  // MODO SIN PRODUCTO GUARDADO (idReferencia null/undefined)
  // Permite subir imágenes y previsualizarlas antes de guardar
  // ════════════════════════════════════════════════════════════════
  if (!idReferencia) {
    if (soloLectura) {
      // Modo solo-lectura sin producto guardado no aplica en la práctica
      // (no hay nada que mostrar), pero se cubre por completitud.
      return null;
    }
    return (
      <GaleriaNuevoProducto
        imagenesLocales={imagenesLocales} todosColores={todosColores} tieneColores={tieneColores}
        eliminarLocal={eliminarLocal} cambiarColorLocal={cambiarColorLocal}
        editandoColor={editandoColor} setEditandoColor={setEditandoColor}
        dropdownPos={dropdownPos} setDropdownPos={setDropdownPos} paletteBtnRefs={paletteBtnRefs}
        detectandoColor={detectandoColor}
        inputRef={inputRef} onInputChange={onInputChange} onDrop={onDropNuevo}
      />
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

      {detectandoColor && (
        <div className="gi-detectando-color"><div className="gi-spinner" /> Detectando el color de la prenda...</div>
      )}

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
