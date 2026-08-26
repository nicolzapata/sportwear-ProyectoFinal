import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { ERRORES_INICIALES, FORM_VACIO, MAX_LONGITUD_NOMBRE_COLOR } from "../utils/gestProductosHelpers.jsx";
import { MAX_LONGITUD_NOMBRE } from "../../../shared/utils/numerico";

const FILAS_POR_PAGINA = 10;
const COLORES_POR_PAGINA = 18; // grid de muestras: cabe más por página que una tabla

export function useGestProductos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const [searchParams, setSearchParams] = useSearchParams();

  const [datos,            setDatos]            = useState([]);
  const [totalProductos,   setTotalProductos]   = useState(0);
  const [categorias,       setCategorias]       = useState([]); // listado completo, para el <select> del formulario
  const [categoriasPagina, setCategoriasPagina] = useState([]); // página actual de la pestaña "Categorías"
  const [totalCategorias,  setTotalCategorias]  = useState(0);
  const [busqueda,         setBusqueda]         = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [modal,            setModal]            = useState(false);
  const [verDetalle,       setVerDetalle]       = useState(null);
  const [editar,           setEditar]           = useState(null);
  const [productoId,       setProductoId]       = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [guardando,        setGuardando]        = useState(false);
  const [errores,          setErrores]          = useState(ERRORES_INICIALES);
  const { mostrarToast } = useToast();
  const [form,             setForm]             = useState(FORM_VACIO);
  const [pendingVariantes, setPendingVariantes] = useState([]);
  const [pendingImagenes,  setPendingImagenes]  = useState([]);
  const [coloresSinFotos,  setColoresSinFotos]  = useState([]);
  const [coloresAPurgar,   setColoresAPurgar]   = useState([]);
  const [coloresAPurgarFotos, setColoresAPurgarFotos] = useState([]);
  // Se incrementa cada vez que GestVariantes agrega/quita un color en modo
  // conectado (producto ya existente) — GaleriaImagenes lo usa como disparador
  // para refrescar su propia lista de colores disponibles para subir fotos,
  // ya que ambos componentes son hermanos y no comparten estado por su cuenta.
  const [variantesVersion, setVariantesVersion] = useState(0);
  const [tab,              setTab]              = useState("productos");
  const [paginaProductos,  setPaginaProductos]  = useState(1);
  const [paginaCategorias, setPaginaCategorias] = useState(1);
  const [variantesDropdownAbierto, setVariantesDropdownAbierto] = useState(null);

  const [formCategoria,    setFormCategoria]    = useState({ nombre: "", icono: "tag" });
  const [editarCategoria,  setEditarCategoria]  = useState(null);
  const [erroresCategoria, setErroresCategoria] = useState({ nombre: "" });
  const [eliminarId,       setEliminarId]       = useState(null);
  const [ordenCategorias,  setOrdenCategorias]  = useState("nombre");
  const [verDetalleCategoria, setVerDetalleCategoria] = useState(null);

  // ── Colores (mismo patrón que Categorías: gestión embebida en esta página) ──
  const [coloresPagina,   setColoresPagina]   = useState([]);
  const [totalColores,    setTotalColores]    = useState(0);
  const [paginaColores,   setPaginaColores]   = useState(1);
  const [formColor,       setFormColor]       = useState({ nombre: "", codigo_hex: "#000000", estado: "Activo" });
  const [editarColor,     setEditarColor]     = useState(null);
  const [erroresColor,    setErroresColor]    = useState({ nombre: "", codigo_hex: "" });
  const [eliminarColorId, setEliminarColorId] = useState(null);

  // Listado completo de categorías (sin paginar): alimenta el <select> del formulario de producto.
  const cargarCategoriasCompletas = async () => {
    try {
      const { data } = await api.get("/categorias");
      setCategorias(data);
    } catch { /* el formulario simplemente mostrará el select vacío */ }
  };

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

  const cargarColoresPagina = async (pagina = paginaColores, q = busquedaDebounced) => {
    try {
      const { data } = await api.get("/colores", { params: { page: pagina, limit: COLORES_POR_PAGINA, q: q || undefined } });
      setColoresPagina(data.data);
      setTotalColores(data.total);
    } catch { mostrarToast("error", "No se pudo cargar."); }
    finally { setLoading(false); }
  };

  const cargar = async () => {
    await Promise.all([
      cargarCategoriasCompletas(),
      tab === 'productos' ? cargarProductos() : tab === 'categorias' ? cargarCategoriasPagina() : cargarColoresPagina(),
    ]);
  };

  // ── Carga inicial (categorías completas para el <select>) + soporte de deep-link "?edit=ID" ──
  // La tabla de productos se carga por el efecto de paginación de más abajo.
  useEffect(() => {
    cargarCategoriasCompletas();

    const editId = searchParams.get('edit');
    if (editId) {
      api.get('/productos', { params: { id: editId } }).then(({ data }) => {
        if (data && data[0]) abrirEditar(data[0]);
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
  useEffect(() => { setPaginaProductos(1); setPaginaCategorias(1); setPaginaColores(1); }, [busquedaDebounced]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'productos') cargarProductos(paginaProductos, busquedaDebounced); }, [tab, paginaProductos, busquedaDebounced]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'categorias') cargarCategoriasPagina(paginaCategorias, busquedaDebounced); }, [tab, paginaCategorias, busquedaDebounced, ordenCategorias]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'colores') cargarColoresPagina(paginaColores, busquedaDebounced); }, [tab, paginaColores, busquedaDebounced]);

  const totalPaginasProductos  = Math.ceil(totalProductos / FILAS_POR_PAGINA) || 1;
  const totalPaginasCategorias = Math.ceil(totalCategorias / FILAS_POR_PAGINA) || 1;
  const totalPaginasColores    = Math.ceil(totalColores / COLORES_POR_PAGINA) || 1;

  // ── Productos ──────────────────────────────────────────────────────────────
  const abrirRegistrar = () => {
    setEditar(null); setProductoId(null); setErrores(ERRORES_INICIALES);
    setForm({ ...FORM_VACIO, id_categoria: categorias[0]?.id_categoria || "" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_producto); setProductoId(p.id_producto); setErrores(ERRORES_INICIALES);
    setForm({ nombre: p.nombre ?? "", descripcion: p.descripcion ?? "", id_categoria: p.id_categoria ?? "", precio: p.precio ?? "", publicado: !!p.publicado, estado: p.estado ?? "Activo", destacado: p.destacado ?? "" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const validarNombreProducto = (valor) => {
    const texto = valor.trim();
    if (!texto) return "El nombre del producto es obligatorio.";
    if (texto.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (texto.length > MAX_LONGITUD_NOMBRE) return `No puede tener más de ${MAX_LONGITUD_NOMBRE} caracteres.`;
    return "";
  };

  const validarPasoDatos = () => {
    const e = { ...ERRORES_INICIALES }; let ok = true;
    const msgNombre = validarNombreProducto(form.nombre);
    if (msgNombre) { e.nombre = msgNombre; ok = false; }
    if (!form.id_categoria) { e.id_categoria = "Selecciona una categoría."; ok = false; }
    // ── NUEVO: el precio solo se pide al EDITAR — al crear, el producto nace
    // sin precio ni stock; ambos se definen con la primera compra que se le
    // registre (ver Compras). Y aun al editar, el precio es OPCIONAL: el valor
    // real de venta lo define Compras, así que 0 o vacío es válido aquí — solo
    // se marca error si el usuario escribió algo que no es un número válido. ──
    if (editar) {
      const val = form.precio;
      if (val !== "" && val !== null && val !== undefined && (isNaN(Number(val)) || Number(val) < 0)) {
        e.precio = "El precio debe ser un número válido, mayor o igual a $0.";
        ok = false;
      }
    }
    if (!ok) console.log("[validarPasoDatos] errores encontrados:", e);
    setErrores(e); return ok;
  };

  const validar = () => validarPasoDatos();

  // Un producto no puede tener colores sin ninguna foto asociada. Compara los
  // colores en juego (variantes existentes + pendientes) contra los colores
  // que sí tienen al menos una imagen (existente + pendiente de subir).
  const obtenerColoresSinFotos = async () => {
    let coloresEnJuego = [];
    const idsConFoto = new Set();

    if (editar) {
      try {
        const [{ data: varsData }, { data: imgsData }] = await Promise.all([
          api.get(`/variantes?id_producto=${editar}`),
          api.get(`/imagenes?tipo=Producto&id=${editar}`),
        ]);
        coloresEnJuego = varsData.filter(v => v.id_color).map(v => ({ id_color: v.id_color, nombre: v.color_nombre }));
        imgsData.forEach(i => { if (i.id_color) idsConFoto.add(String(i.id_color)); });
      } catch { return []; /* si falla la verificación, no bloqueamos el guardado */ }
    }

    pendingVariantes.forEach(v => { if (v.id_color) coloresEnJuego.push({ id_color: v.id_color, nombre: v.color_nombre }); });
    pendingImagenes.forEach(i => { if (i.id_color) idsConFoto.add(String(i.id_color)); });

    const coloresUnicos = [...new Map(coloresEnJuego.map(c => [String(c.id_color), c])).values()];
    return coloresUnicos.filter(c => !idsConFoto.has(String(c.id_color)));
  };

  const guardar = async () => {
    if (!validar()) { console.log("[guardar] bloqueado por validación (ver detalle arriba)"); return; }
    if (!editar) {
      if (pendingImagenes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una imagen del producto." })); return; }
      if (pendingVariantes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una talla disponible." })); return; }
    }
    const sinFotos = await obtenerColoresSinFotos();
    if (sinFotos.length > 0) { console.log("[guardar] bloqueado por colores sin fotos:", sinFotos); setColoresSinFotos(sinFotos); return; }
    console.log("[guardar] validación OK, llamando a guardarProducto()");
    await guardarProducto();
  };

  const guardarProducto = async () => {
    setGuardando(true);
    let huboExito = false;
    try {
      const payload = { nombre: form.nombre, descripcion: form.descripcion || null, id_categoria: Number(form.id_categoria), precio: editar ? Number(form.precio) : 0, publicado: !!form.publicado, estado: form.estado, destacado: form.destacado || null };

      if (editar) {
        await api.put(`/productos/${editar}`, payload);
        if (pendingVariantes.length > 0) {
          await Promise.all(pendingVariantes.map(v => api.post('/variantes', { id_producto: editar, id_color: v.id_color, talla: v.talla, stock: v.stock || 0 })));
        }
        if (pendingImagenes.length > 0) {
          for (const img of pendingImagenes) {
            const fd = new FormData();
            fd.append("imagenes", img.file); fd.append("tipo_referencia", "Producto"); fd.append("id_referencia", editar);
            if (img.id_color) fd.append("id_color", img.id_color);
            await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
          }
        }
        setPendingVariantes([]); setPendingImagenes([]);
        mostrarToast("exito", "Producto actualizado.");
        huboExito = true;
      } else {
        const { data } = await api.post("/productos", payload);
        setProductoId(data.id_producto); setEditar(data.id_producto);
        if (pendingVariantes.length > 0) {
          await Promise.all(pendingVariantes.map(v => api.post('/variantes', { id_producto: data.id_producto, id_color: v.id_color, talla: v.talla, stock: v.stock || 0 })));
        }
        if (pendingImagenes.length > 0) {
          for (const img of pendingImagenes) {
            const fd = new FormData();
            fd.append("imagenes", img.file); fd.append("tipo_referencia", "Producto"); fd.append("id_referencia", data.id_producto);
            if (img.id_color) fd.append("id_color", img.id_color);
            await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
          }
        }
        setPendingVariantes([]); setPendingImagenes([]);
        mostrarToast("exito", "Producto guardado con variantes e imágenes.");
        huboExito = true;
      }
    } catch (err) {
      console.error("[guardarProducto] error real:", err);
      const msg = err.response?.data?.message || "Error al guardar.";
      setErrores(prev => ({ ...prev, general: msg }));
      mostrarToast("error", msg);
    } finally {
      setGuardando(false);
      if (huboExito) {
        console.log("[guardarProducto] éxito — cerrando modal y refrescando lista");
        setModal(false);
        window.scrollTo(0, 0);
        cargar();
      } else {
        console.log("[guardarProducto] NO hubo éxito — el modal se queda abierto a propósito");
      }
    }
  };

  const confirmarEliminarColoresSinFotos = () => {
    setColoresAPurgar(coloresSinFotos.map(c => c.id_color));
    setColoresSinFotos([]);
  };

  const onColoresPurgados = () => {
    setColoresAPurgar([]);
    guardarProducto();
  };

  const eliminarFotosDeColor = (id_color) => setColoresAPurgarFotos([id_color]);
  const onFotosDeColorPurgadas = () => setColoresAPurgarFotos([]);

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
    cargar();
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

  const cerrarModal = () => {
    if (guardando) return;
    setModal(false); setErrores(ERRORES_INICIALES); setProductoId(null);
    setPendingVariantes([]); setPendingImagenes([]);
    setColoresSinFotos([]); setColoresAPurgar([]); setColoresAPurgarFotos([]);
    setVariantesVersion(0);
    cargar();
  };

  // ── Categorías ─────────────────────────────────────────────────────────────
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
      setModal(false); cargar();
      mostrarToast("exito", editarCategoria ? "Categoría actualizada." : "Categoría creada.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo guardar la categoría.");
    }
  };

  const abrirDetalle = async (p) => {
    setVerDetalle({ ...p, historialPrecios: [] });
    try {
      const { data } = await api.get(`/productos/${p.id_producto}/historial-precios`);
      setVerDetalle(prev => prev && prev.id_producto === p.id_producto ? { ...prev, historialPrecios: data } : prev);
    } catch { /* el detalle base ya se muestra sin el historial */ }
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

  // ── Colores ────────────────────────────────────────────────────────────────
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
      setModal(false); cargar();
      mostrarToast("exito", editarColor ? "Color actualizado." : "Color creado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo guardar el color.");
    }
  };

  const cambiarEstadoColor = async (id, nuevoEstado) => {
    await api.patch(`/colores/${id}/estado`);
    setColoresPagina(prev => prev.map(c => c.id_color === id ? { ...c, estado: nuevoEstado } : c));
  };

  const confirmarEliminarColor = async () => {
    const id = eliminarColorId;
    setEliminarColorId(null);
    try {
      await api.delete(`/colores/${id}`);
      cargarColoresPagina();
      mostrarToast("exito", "Color eliminado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo eliminar el color.");
    }
  };

  const coloresPendientes = [...new Map(pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])).values()];

  return {
    tienePerm,
    datos, totalProductos, categorias, categoriasPagina, totalCategorias,
    busqueda, setBusqueda, busquedaDebounced,
    modal, setModal, verDetalle, setVerDetalle, editar, productoId,
    loading, guardando, errores, setErrores, form, setForm,
    pendingVariantes, setPendingVariantes, pendingImagenes, setPendingImagenes,
    coloresSinFotos, setColoresSinFotos, coloresAPurgar, coloresAPurgarFotos,
    variantesVersion, setVariantesVersion,
    tab, setTab, paginaProductos, setPaginaProductos, paginaCategorias, setPaginaCategorias,
    variantesDropdownAbierto, setVariantesDropdownAbierto,
    formCategoria, setFormCategoria, editarCategoria, erroresCategoria, setErroresCategoria,
    eliminarId, setEliminarId, ordenCategorias, setOrdenCategorias, verDetalleCategoria, setVerDetalleCategoria,
    coloresPagina, totalColores, paginaColores, setPaginaColores,
    formColor, setFormColor, editarColor, erroresColor, setErroresColor, eliminarColorId, setEliminarColorId,
    totalPaginasProductos, totalPaginasCategorias, totalPaginasColores,
    coloresPendientes,
    abrirRegistrar, abrirEditar, validarNombreProducto, guardar,
    confirmarEliminarColoresSinFotos, onColoresPurgados, eliminarFotosDeColor, onFotosDeColorPurgadas,
    toggleEstadoProducto, togglePublicado, confirmarEliminar, cerrarModal,
    abrirRegistrarCategoria, abrirEditarCategoria, validarNombreCategoria, guardarCategoria,
    abrirDetalle, abrirDetalleCategoria, cambiarEstadoCategoria,
    abrirRegistrarColor, abrirEditarColor, mensajeErrorNombreColor, guardarColor, cambiarEstadoColor, confirmarEliminarColor,
    cargarProductos, cargarColoresPagina,
  };
}
