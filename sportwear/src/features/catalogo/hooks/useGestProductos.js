import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useProductosListado } from "./useProductosListado";
import { useProductoFormulario } from "./useProductoFormulario";
import { useCategoriasState } from "./useCategoriasState";
import { useColoresState } from "./useColoresState";

/**
 * useGestProductos
 *
 * Orquestador liviano de la página GestProductos: posee el estado que es
 * realmente transversal a las 3 pestañas (tab activo, búsqueda, modal
 * compartido, loading de pantalla completa) y compone los hooks de dominio
 * (listado de productos, formulario de producto, categorías, colores), sin
 * duplicar su estado.
 */
export function useGestProductos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const [searchParams, setSearchParams] = useSearchParams();
  const { mostrarToast } = useToast();

  const [busqueda,          setBusqueda]          = useState("");
  const [busquedaDebounced, setBusquedaDebounced]  = useState("");
  const [modal,             setModal]              = useState(false);
  const [loading,           setLoading]            = useState(true);
  const [tab,               setTab]                = useState("productos");

  // La pestaña activa decide qué se recarga tras guardar/publicar/cerrar un
  // modal — igual que en el hook original, siempre se refresca también el
  // listado completo de categorías (alimenta el <select> del formulario).
  const recargarTodo = async () => {
    await Promise.all([
      categoriasState.cargarCategoriasCompletas(),
      tab === 'productos' ? productosListado.cargarProductos()
        : tab === 'categorias' ? categoriasState.cargarCategoriasPagina()
        : coloresState.cargarColoresTodos(),
    ]);
  };

  const categoriasState = useCategoriasState({ busquedaDebounced, setModal, setLoading, mostrarToast, recargarTodo });
  const productosListado = useProductosListado({ busquedaDebounced, setLoading, mostrarToast, recargarTodo });
  const productoFormulario = useProductoFormulario({
    cargarCategoriasCompletas: categoriasState.cargarCategoriasCompletas, setModal, mostrarToast, recargarTodo,
  });
  const coloresState = useColoresState({ busquedaDebounced, setModal, setLoading, mostrarToast, recargarTodo });

  // ── Soporte de deep-link "?edit=ID" ── La tabla de productos se carga por
  // el efecto de paginación de más abajo; las categorías completas para el
  // <select> las pide abrirEditar/abrirRegistrar recién al abrir el modal,
  // no hace falta pedirlas de entrada solo por visitar la pestaña.
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      api.get('/productos', { params: { id: editId } }).then(({ data }) => {
        if (data && data[0]) productoFormulario.abrirEditar(data[0]);
      }).finally(() => setSearchParams({}, { replace: true }));
    }
    // eslint-disable-next-line
  }, []);

  // Buscador con debounce: evita disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  // Al cambiar de búsqueda vuelve a la página 1 de todas las pestañas.
  useEffect(() => {
    productosListado.setPaginaProductos(1);
    categoriasState.setPaginaCategorias(1);
    coloresState.setPaginaColores(1);
  }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'productos') productosListado.cargarProductos(productosListado.paginaProductos, busquedaDebounced); }, [tab, productosListado.paginaProductos, busquedaDebounced]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'categorias') categoriasState.cargarCategoriasPagina(categoriasState.paginaCategorias, busquedaDebounced); }, [tab, categoriasState.paginaCategorias, busquedaDebounced, categoriasState.ordenCategorias]);
  // La vitrina de "Colores" no pagina en servidor (ver useColoresState): se
  // trae completa una sola vez al entrar a la pestaña, y el buscador filtra
  // en el cliente sin volver a pedirla en cada tecla. Junto con los colores
  // se trae también /productos, para poder calcular "prendas con este
  // color" en el panel de detalle.
  useEffect(() => {
    if (tab === 'colores') {
      coloresState.cargarColoresTodos();
      coloresState.cargarProductosDeColores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return {
    tienePerm,
    busqueda, setBusqueda, busquedaDebounced,
    modal, setModal, loading,
    tab, setTab,
    ...productosListado,
    ...productoFormulario,
    ...categoriasState,
    ...coloresState,
  };
}
