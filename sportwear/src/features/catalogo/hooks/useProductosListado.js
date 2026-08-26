import { useState } from "react";
import api from "../../../shared/services/api";

const FILAS_POR_PAGINA = 10;

/**
 * useProductosListado
 *
 * Listado, paginación y acciones de fila (ver detalle, publicar/despublicar,
 * activar/inactivar, eliminar) de la pestaña "Productos" — separado del
 * formulario de alta/edición, que vive en useProductoFormulario.
 */
export function useProductosListado({ busquedaDebounced, setLoading, mostrarToast, recargarTodo }) {
  const [datos,          setDatos]          = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [paginaProductos, setPaginaProductos] = useState(1);
  const [verDetalle,     setVerDetalle]     = useState(null);
  const [eliminarId,     setEliminarId]     = useState(null);
  const [variantesDropdownAbierto, setVariantesDropdownAbierto] = useState(null);

  const cargarProductos = async (pagina = paginaProductos, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/productos", { params: { page: pagina, limit: FILAS_POR_PAGINA, q: q || undefined } });
      const productosConImagen = await Promise.all(
        data.data.map(async (prod) => {
          try {
            const { data: imgs } = await api.get(`/imagenes?tipo=Producto&id=${prod.id_producto}`);
            return { ...prod, imagenPrincipal: imgs.length > 0 ? imgs[0].url : null };
          } catch { return { ...prod, imagenPrincipal: null }; }
        })
      );
      setDatos(productosConImagen);
      setTotalProductos(data.total);
      return productosConImagen;
    } catch { mostrarToast("error", "No se pudo cargar."); return []; }
    finally { setLoading(false); }
  };

  const totalPaginasProductos = Math.ceil(totalProductos / FILAS_POR_PAGINA) || 1;

  const abrirDetalle = async (p) => {
    setVerDetalle({ ...p, historialPrecios: [] });
    try {
      const { data } = await api.get(`/productos/${p.id_producto}/historial-precios`);
      setVerDetalle(prev => prev && prev.id_producto === p.id_producto ? { ...prev, historialPrecios: data } : prev);
    } catch { /* el detalle base ya se muestra sin el historial */ }
  };

  const toggleEstadoProducto = async (id, nuevoEstado) => {
    const { data } = await api.patch(`/productos/${id}/estado`);
    setDatos(prev => prev.map(p => p.id_producto === id ? { ...p, estado: nuevoEstado, publicado: data?.publicado ?? p.publicado } : p));
  };

  const togglePublicado = async (id) => {
    const producto = datos.find(p => p.id_producto === id);
    if (producto?.estado === "Inactivo") {
      throw { response: { data: { message: "No se puede publicar un producto inactivo." } } };
    }
    await api.patch(`/productos/${id}/publicar`);
    recargarTodo();
  };

  const confirmarEliminar = async () => {
    const id = eliminarId;
    setEliminarId(null);
    try {
      await api.delete(`/productos/${id}`);
      cargarProductos();
      mostrarToast("exito", "Producto eliminado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo eliminar el producto.");
    }
  };

  return {
    datos, totalProductos, paginaProductos, setPaginaProductos, totalPaginasProductos,
    verDetalle, setVerDetalle, eliminarId, setEliminarId,
    variantesDropdownAbierto, setVariantesDropdownAbierto,
    cargarProductos, abrirDetalle, toggleEstadoProducto, togglePublicado, confirmarEliminar,
  };
}
