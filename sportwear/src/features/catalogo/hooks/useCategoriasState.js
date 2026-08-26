import { useState } from "react";
import api from "../../../shared/services/api";
import { MAX_LONGITUD_NOMBRE } from "../../../shared/utils/numerico";

const FILAS_POR_PAGINA = 10;

/**
 * useCategoriasState
 *
 * Listado completo (para el <select> del formulario de producto), listado
 * paginado, formulario y CRUD de la pestaña "Categorías" de GestProductos.
 */
export function useCategoriasState({ busquedaDebounced, setModal, setLoading, mostrarToast, recargarTodo }) {
  const [categorias,       setCategorias]       = useState([]); // listado completo, para el <select> del formulario
  const [categoriasPagina, setCategoriasPagina] = useState([]); // página actual de la pestaña "Categorías"
  const [totalCategorias,  setTotalCategorias]  = useState(0);
  const [paginaCategorias, setPaginaCategorias] = useState(1);
  const [formCategoria,    setFormCategoria]    = useState({ nombre: "", icono: "tag" });
  const [editarCategoria,  setEditarCategoria]  = useState(null);
  const [erroresCategoria, setErroresCategoria] = useState({ nombre: "" });
  const [ordenCategorias,  setOrdenCategorias]  = useState("nombre");
  const [verDetalleCategoria, setVerDetalleCategoria] = useState(null);

  // Listado completo de categorías (sin paginar): alimenta el <select> del formulario de producto.
  const cargarCategoriasCompletas = async () => {
    try {
      const { data } = await api.get("/categorias");
      setCategorias(data);
    } catch { /* el formulario simplemente mostrará el select vacío */ }
  };

  const cargarCategoriasPagina = async (pagina = paginaCategorias, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/categorias", { params: { page: pagina, limit: FILAS_POR_PAGINA, q: q || undefined } });
      const filas = ordenCategorias === "fecha"
        ? [...data.data].sort((a, b) => new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0))
        : data.data;
      setCategoriasPagina(filas);
      setTotalCategorias(data.total);
    } catch { mostrarToast("error", "No se pudo cargar."); }
    finally { setLoading(false); }
  };

  const totalPaginasCategorias = Math.ceil(totalCategorias / FILAS_POR_PAGINA) || 1;

  const abrirRegistrarCategoria = () => { setEditarCategoria(null); setFormCategoria({ nombre: "", descripcion: "", icono: "tag" }); setErroresCategoria({ nombre: "" }); setModal(true); };
  const abrirEditarCategoria    = (c) => { setEditarCategoria(c.id_categoria); setFormCategoria({ nombre: c.nombre, descripcion: c.descripcion || "", icono: c.icono || "tag" }); setErroresCategoria({ nombre: "" }); setModal(true); };

  const validarNombreCategoria = (valor) => {
    const texto = (valor ?? "").trim();
    if (!texto) return "El nombre de la categoría es obligatorio";
    if (texto.length > MAX_LONGITUD_NOMBRE) return `No puede tener más de ${MAX_LONGITUD_NOMBRE} caracteres.`;
    return "";
  };

  const validarPasoCategoriaForm = () => {
    const e = { nombre: validarNombreCategoria(formCategoria.nombre) };
    setErroresCategoria(e);
    return !e.nombre;
  };

  const guardarCategoria = async () => {
    if (!validarPasoCategoriaForm()) return;
    try {
      if (editarCategoria) await api.put(`/categorias/${editarCategoria}`, formCategoria);
      else                 await api.post("/categorias", formCategoria);
      setModal(false); recargarTodo();
      mostrarToast("exito", editarCategoria ? "Categoría actualizada." : "Categoría creada.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo guardar la categoría.");
    }
  };

  const abrirDetalleCategoria = async (c) => {
    setVerDetalleCategoria({ ...c, productos: [] });
    try {
      const { data } = await api.get(`/categorias/${c.id_categoria}`);
      setVerDetalleCategoria(data);
    } catch {
      mostrarToast("error", "No se pudo cargar el detalle de la categoría.");
    }
  };

  const cambiarEstadoCategoria = async (id, nuevoEstado) => {
    await api.patch(`/categorias/${id}/estado`);
    setCategoriasPagina(prev => prev.map(c => c.id_categoria === id ? { ...c, estado: nuevoEstado } : c));
    setCategorias(prev => prev.map(c => c.id_categoria === id ? { ...c, estado: nuevoEstado } : c));
  };

  return {
    categorias, categoriasPagina, totalCategorias, paginaCategorias, setPaginaCategorias, totalPaginasCategorias,
    formCategoria, setFormCategoria, editarCategoria, erroresCategoria, setErroresCategoria,
    ordenCategorias, setOrdenCategorias, verDetalleCategoria, setVerDetalleCategoria,
    cargarCategoriasCompletas, cargarCategoriasPagina,
    abrirRegistrarCategoria, abrirEditarCategoria, validarNombreCategoria, guardarCategoria,
    abrirDetalleCategoria, cambiarEstadoCategoria,
  };
}
