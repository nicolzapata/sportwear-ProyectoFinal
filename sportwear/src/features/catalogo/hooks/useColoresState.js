import { useState } from "react";
import api from "../../../shared/services/api";
import { MAX_LONGITUD_NOMBRE_COLOR } from "../utils/gestProductosHelpers.jsx";

const COLORES_POR_PAGINA = 18; // grid de muestras: cabe más por página que una tabla

/**
 * useColoresState
 *
 * Listado paginado, formulario y CRUD de la pestaña "Colores" de
 * GestProductos (catálogo de colores disponibles, independiente de las
 * variantes de un producto puntual).
 */
export function useColoresState({ busquedaDebounced, setModal, setLoading, mostrarToast, recargarTodo }) {
  const [coloresPagina,   setColoresPagina]   = useState([]);
  const [totalColores,    setTotalColores]    = useState(0);
  const [paginaColores,   setPaginaColores]   = useState(1);
  const [coloresTodos,    setColoresTodos]    = useState([]); // vitrina: todos los colores activos de una vez, filtro en cliente
  const [productosDeColores, setProductosDeColores] = useState([]); // para calcular "prendas con este color" en el panel de detalle
  const [formColor,       setFormColor]       = useState({ nombre: "", codigo_hex: "#000000", estado: "Activo" });
  const [editarColor,     setEditarColor]     = useState(null);
  const [erroresColor,    setErroresColor]    = useState({ nombre: "", codigo_hex: "" });
  const [eliminarColorId, setEliminarColorId] = useState(null);

  const cargarColoresPagina = async (pagina = paginaColores, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/colores", { params: { page: pagina, limit: COLORES_POR_PAGINA, q: q || undefined } });
      setColoresPagina(data.data);
      setTotalColores(data.total);
    } catch { mostrarToast("error", "No se pudo cargar."); }
    finally { setLoading(false); }
  };

  // Vitrina de colores (pestaña "Colores"): la paleta es chica (decenas, no
  // miles), así que en vez de paginar en el servidor se trae todo de una vez
  // y el buscador filtra en el cliente.
  const cargarColoresTodos = async () => {
    try {
      const { data } = await api.get("/colores");
      setColoresTodos(data);
    } catch { mostrarToast("error", "No se pudo cargar."); }
    finally { setLoading(false); }
  };

  // El panel de detalle muestra "prendas con este color" — se arma en el
  // cliente a partir de las variantes que ya vienen embebidas en cada
  // producto (mismo /productos que usa la pestaña "Productos"), sin agregar
  // ningún endpoint ni campo nuevo.
  const cargarProductosDeColores = async () => {
    try {
      const { data } = await api.get("/productos");
      setProductosDeColores(data);
    } catch { /* el panel simplemente mostrará "sin productos asociados" */ }
  };

  const totalPaginasColores = Math.ceil(totalColores / COLORES_POR_PAGINA) || 1;

  const abrirRegistrarColor = () => { setEditarColor(null); setFormColor({ nombre: "", codigo_hex: "#000000", estado: "Activo" }); setErroresColor({ nombre: "", codigo_hex: "" }); setModal(true); };
  const abrirEditarColor    = (c) => { setEditarColor(c.id_color); setFormColor({ nombre: c.nombre, codigo_hex: c.codigo_hex, estado: c.estado }); setErroresColor({ nombre: "", codigo_hex: "" }); setModal(true); };

  const mensajeErrorNombreColor = (valor) => {
    const texto = (valor ?? "").trim();
    if (!texto) return "El nombre del color es obligatorio";
    if (texto.length > MAX_LONGITUD_NOMBRE_COLOR) return `No puede tener más de ${MAX_LONGITUD_NOMBRE_COLOR} caracteres.`;
    return "";
  };

  const validarPasoColorForm = () => {
    const eNombre = mensajeErrorNombreColor(formColor.nombre);
    const eHex = (!formColor.codigo_hex || !/^#[0-9A-Fa-f]{6}$/.test(formColor.codigo_hex)) ? "Selecciona un color válido" : "";
    setErroresColor({ nombre: eNombre, codigo_hex: eHex });
    return !eNombre && !eHex;
  };

  const guardarColor = async () => {
    if (!validarPasoColorForm()) return;
    try {
      if (editarColor) await api.put(`/colores/${editarColor}`, formColor);
      else             await api.post("/colores", formColor);
      setModal(false); recargarTodo();
      mostrarToast("exito", editarColor ? "Color actualizado." : "Color creado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo guardar el color.");
    }
  };

  const cambiarEstadoColor = async (id, nuevoEstado) => {
    await api.patch(`/colores/${id}/estado`);
    setColoresPagina(prev => prev.map(c => c.id_color === id ? { ...c, estado: nuevoEstado } : c));
    // El listado sin paginar del backend solo trae Activos — si se desactiva
    // un color, desaparece de la vitrina igual que ya pasaba en la tabla vieja.
    setColoresTodos(prev => nuevoEstado === "Activo"
      ? prev.map(c => c.id_color === id ? { ...c, estado: nuevoEstado } : c)
      : prev.filter(c => c.id_color !== id));
  };

  const confirmarEliminarColor = async () => {
    const id = eliminarColorId;
    setEliminarColorId(null);
    try {
      await api.delete(`/colores/${id}`);
      cargarColoresTodos();
      mostrarToast("exito", "Color eliminado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo eliminar el color.");
    }
  };

  return {
    coloresPagina, totalColores, paginaColores, setPaginaColores, totalPaginasColores,
    coloresTodos, productosDeColores,
    formColor, setFormColor, editarColor, erroresColor, setErroresColor,
    eliminarColorId, setEliminarColorId,
    cargarColoresPagina, cargarColoresTodos, cargarProductosDeColores, abrirRegistrarColor, abrirEditarColor,
    mensajeErrorNombreColor, guardarColor, cambiarEstadoColor, confirmarEliminarColor,
  };
}
