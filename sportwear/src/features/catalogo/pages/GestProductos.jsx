// src/pages/productos/GestProductos.jsx
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { MAX_MONTO, MAX_LONGITUD_NOMBRE, MAX_LONGITUD_TEXTO_LIBRE } from "../../../shared/utils/numerico";
import GaleriaImagenes from "../../../shared/components/GaleriaImagenes";
import GestVariantes from "../components/GestVariantes";
import { DetalleItem, DetalleGrid } from "../../../shared/components/ModalDetalle";
import StatusToggle from "../../../shared/components/StatusToggle";
import ConfirmModal from "../../../shared/components/ConfirmModal";
import Loader from "../../../shared/components/Loader";
import ExportButtons from "../../../shared/components/ExportButtons";
import { IconAlertTriangle, IconEdit, IconEye, IconSearch, IconX, IconBox, IconTag, IconTrash, IconPalette } from "../../../shared/components/Icons";
import "./GestProductos.css";
// Reutiliza los estilos del selector de color / vista previa (picker, preview) tal
// cual como en la antigua página de Colores — evita duplicar esas reglas acá.
import "./Colores.css";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const ERRORES_INICIALES = { nombre: "", id_categoria: "", precio: "", general: "" };
const FORM_VACIO = { nombre: "", descripcion: "", id_categoria: "", precio: "", publicado: false, estado: "Activo", destacado: "" };

// ── Medición de chips de la columna Tallas/Colores ─────────────────────────
// La columna tiene un ancho fijo (ver .gestproductos-th-variantes en el CSS);
// en vez de mostrar un número fijo de chips, se estima el ancho real de cada
// uno (canvas measureText) y se calculan cuántos caben antes de resumir el
// resto en un chip "+N más".
const ANCHO_COL_VARIANTES = 190;
const ANCHO_CHIP_MAS = 56;
const ANCHO_CHIP_FIJO = 14 /* swatch */ + 6 /* gap swatch-texto */ + 20 /* padding */ + 2 /* borde */;
const GAP_CHIPS = 6;
let medirCanvas = null;
const anchoTexto = (texto) => {
  if (typeof document === "undefined") return texto.length * 6.5;
  if (!medirCanvas) medirCanvas = document.createElement("canvas");
  const ctx = medirCanvas.getContext("2d");
  ctx.font = "500 12px Jost, sans-serif";
  return ctx.measureText(texto).width;
};
const anchoChip = (texto) => ANCHO_CHIP_FIJO + anchoTexto(texto);

const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Dropdown "+N más" de Tallas/Colores (mismo patrón visual que el
// dropdown de estado de Compras): botón pill con chevron que abre, vía
// portal a document.body, un panel con los colores ocultos — así no queda
// recortado por el overflow de la tabla ni por el ancho fijo de la celda. ──
function VariantesMasDropdown({ grupos, restantes, abierto, onToggle, productoId }) {
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!abierto || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 6, left: r.left, width: r.width, arriba: false });
  }, [abierto]);

  // Si el trigger está en una de las últimas filas, el panel abierto hacia
  // abajo no entra en pantalla y queda cortado. Una vez que el panel ya está
  // en el DOM (y por lo tanto se puede medir su alto real), si no entra
  // debajo del trigger se reposiciona arriba — mismo criterio que usan los
  // selects/autocompletes nativos. useLayoutEffect corre antes del paint
  // para que no se note el reacomodo.
  useLayoutEffect(() => {
    if (!abierto || !coords || coords.arriba || !panelRef.current || !btnRef.current) return;
    const panelAlto = panelRef.current.getBoundingClientRect().height;
    const r = btnRef.current.getBoundingClientRect();
    const espacioAbajo = window.innerHeight - r.bottom;
    if (panelAlto + 12 > espacioAbajo) {
      setCoords({ top: r.top - panelAlto - 6, left: r.left, width: r.width, arriba: true });
    }
  }, [abierto, coords]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) onToggle(null);
    };
    const cerrarPorScroll = () => onToggle(null);
    document.addEventListener('mousedown', cerrar);
    window.addEventListener('scroll', cerrarPorScroll, true);
    window.addEventListener('resize', cerrarPorScroll);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      window.removeEventListener('scroll', cerrarPorScroll, true);
      window.removeEventListener('resize', cerrarPorScroll);
    };
  }, [abierto, onToggle]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="gestproductos-variante-chip gestproductos-variante-mas"
        onClick={() => onToggle(abierto ? null : productoId)}
        title={`+${restantes} más`}
        aria-label={`Ver ${restantes} colores más`}
      >
        <IconChevronDown />
      </button>

      {abierto && coords && createPortal(
        <div
          ref={panelRef}
          className="gestproductos-variantes-panel"
          style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(coords.width, 190) }}
        >
          {grupos.map(g => (
            <div key={g.id_color} className="gestproductos-variantes-panel-item">
              <span className="gestproductos-variantes-panel-dot" style={{ background: g.codigo_hex || "#ccc" }} />
              <span className="gestproductos-variantes-panel-label">{g.nombre}: {g.tallas.join(", ")}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function GestProductos() {
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
  const FILAS_POR_PAGINA = 10;
  const COLORES_POR_PAGINA = 18; // grid de muestras: cabe más por página que una tabla

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
  const getBrightness = (hex) => {
    const r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  };
  const MAX_LONGITUD_NOMBRE_COLOR = 40;

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

  const stockBadge = (stock) => {
    if (stock === 0) return <span className="tabla-stock agotado"><IconAlertTriangle /> Agotado</span>;
    if (stock <= 6)  return <span className="tabla-stock bajo"><IconAlertTriangle /> {stock} uds</span>;
    return <span className="tabla-stock normal">{stock} uds</span>;
  };

  // Agrupa las variantes de un producto por color: un solo chip por color
  // con sus tallas concatenadas, en vez de un chip por combinación color+talla.
  const agruparVariantesPorColor = (variantes) => {
    const grupos = new Map();
    variantes.forEach(v => {
      if (!grupos.has(v.id_color)) grupos.set(v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex, tallas: [] });
      grupos.get(v.id_color).tallas.push(v.talla);
    });
    return [...grupos.values()];
  };

  // Colores blancos/muy claros necesitan un borde más marcado en el swatch
  // para no perderse contra el fondo claro de la tabla.
  const esColorClaro = (hex) => {
    if (!hex || hex.length !== 7) return true;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.85;
  };

  if (loading) return <Loader text="Cargando productos..." />;

  const coloresPendientes = [...new Map(pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])).values()];

  const PasoCategoriaForm = (
    <div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Nombre de la categoría <span className="gestproductos-required">*</span></label>
        <input type="text" className={`gestproductos-form-input${erroresCategoria.nombre ? " input-error" : ""}`} placeholder="Ej: Ropa Deportiva"
          value={formCategoria.nombre} maxLength={MAX_LONGITUD_NOMBRE}
          onChange={e => {
            const nombre = e.target.value;
            setFormCategoria({ ...formCategoria, nombre });
            if (erroresCategoria.nombre) setErroresCategoria(prev => ({ ...prev, nombre: validarNombreCategoria(nombre) }));
          }}
          onBlur={() => setErroresCategoria(prev => ({ ...prev, nombre: validarNombreCategoria(formCategoria.nombre) }))} />
        {erroresCategoria.nombre && <p className="gestproductos-field-error">{erroresCategoria.nombre}</p>}
      </div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Descripción</label>
        <textarea className="gestproductos-form-input" rows={3} placeholder="Descripción breve de la categoría (opcional)"
          value={formCategoria.descripcion || ""} maxLength={MAX_LONGITUD_TEXTO_LIBRE}
          onChange={e => setFormCategoria({ ...formCategoria, descripcion: e.target.value })} />
      </div>
    </div>
  );

  const PasoColorForm = (
    <div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Color HEX <span className="gestproductos-required">*</span></label>
        <div className="colores-color-picker-wrapper">
          <input
            type="color"
            className={`colores-color-picker${erroresColor.codigo_hex ? " input-error" : ""}`}
            value={formColor.codigo_hex}
            onChange={e => {
              setFormColor({ ...formColor, codigo_hex: e.target.value });
              if (erroresColor.codigo_hex) setErroresColor(prev => ({ ...prev, codigo_hex: "" }));
            }}
          />
          <span className="colores-color-value">{formColor.codigo_hex}</span>
        </div>
        {erroresColor.codigo_hex && <p className="gestproductos-field-error">{erroresColor.codigo_hex}</p>}
      </div>
      <div className="colores-preview" style={{ marginTop: 8 }}>
        <div className="colores-preview-label">Vista previa</div>
        <div className="colores-preview-sample" style={{ backgroundColor: formColor.codigo_hex }}>
          <span style={{ color: getBrightness(formColor.codigo_hex) > 128 ? '#000' : '#fff' }}>{formColor.nombre || 'Color'}</span>
        </div>
      </div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Nombre del color <span className="gestproductos-required">*</span></label>
        <input type="text" className={`gestproductos-form-input${erroresColor.nombre ? " input-error" : ""}`} placeholder="Ej: Rojo Intenso"
          value={formColor.nombre} maxLength={MAX_LONGITUD_NOMBRE_COLOR}
          onChange={e => {
            const nombre = e.target.value;
            setFormColor({ ...formColor, nombre });
            if (erroresColor.nombre) setErroresColor(prev => ({ ...prev, nombre: mensajeErrorNombreColor(nombre) }));
          }}
          onBlur={() => setErroresColor(prev => ({ ...prev, nombre: mensajeErrorNombreColor(formColor.nombre) }))} />
        {erroresColor.nombre && <p className="gestproductos-field-error">{erroresColor.nombre}</p>}
      </div>
    </div>
  );

  // ── Detalle de producto: info general + variantes/imágenes ──
  const DetalleInfoGeneral = verDetalle && (
    <>
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Información general</h3>
        <DetalleGrid>
          <DetalleItem label="ID" value={`#${String(verDetalle.id_producto).padStart(3, "0")}`} />
          <DetalleItem label="Código" value={verDetalle.codigo} />
          <DetalleItem label="Categoría" value={verDetalle.categoria} />
          <DetalleItem label="Precio base" value={fmt(verDetalle.precio)} />
          <DetalleItem label="Stock total" value={`${verDetalle.stock ?? 0} unidades`} />
          <DetalleItem label="Publicado" value={verDetalle.publicado ? "Sí, visible en catálogo" : "No publicado"} />
          <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalle.estado === "Activo" ? " activo" : " inactivo"}`}>{verDetalle.estado}</span>} />
          <DetalleItem label="Destacado" value={verDetalle.destacado === "Nuevo" ? "Nuevo" : verDetalle.destacado === "Promocion" ? "Promoción" : "Ninguno"} />
        </DetalleGrid>
      </div>
      {verDetalle.historialPrecios?.length > 0 && (
        <div className="gestproductos-factura-seccion">
          <h3 className="gestproductos-factura-titulo">Historial de precios</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {verDetalle.historialPrecios.map(h => (
              <div key={h.id_historial} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 12 }}>
                <span>{new Date(h.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })} {h.usuario ? `· ${h.usuario}` : ""}</span>
                <span>{fmt(h.precio_anterior)} <span style={{ color: "var(--dvna-muted)" }}>→</span> <b>{fmt(h.precio_nuevo)}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const DetalleVariantesImagenes = verDetalle && (
    <>
      {verDetalle.variantes?.length > 0 && (() => {
        const conStock = verDetalle.variantes.filter(v => v.stock > 0);
        const sinStock = verDetalle.variantes.filter(v => v.stock === 0);
        const gruposConStock = agruparVariantesPorColor(conStock);
        const gruposSinStock = agruparVariantesPorColor(sinStock);
        // ── NUEVO: cada variante (talla) puede tener su propio precio —
        // antes el chip solo mostraba "L, M, S" sin decir a qué precio
        // vende cada una. Se arma un mapa talla->precio por color para
        // mostrar el precio de cada talla individualmente cuando alguna
        // difiere del precio base del producto. ──
        const preciosPorColor = new Map();
        verDetalle.variantes.forEach(v => {
          if (!preciosPorColor.has(v.id_color)) preciosPorColor.set(v.id_color, new Map());
          preciosPorColor.get(v.id_color).set(v.talla, v.precio);
        });
        const renderChip = (g, agotada) => {
          const swatchStyle = esColorClaro(g.codigo_hex)
            ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
            : { background: g.codigo_hex || "#ccc" };
          const mapaPrecios = preciosPorColor.get(g.id_color) || new Map();
          // Si TODAS las tallas de este color tienen el mismo precio (o
          // ninguna tiene precio propio), se muestra un solo precio al
          // final. Si varían entre sí, se muestra el precio junto a cada talla.
          const preciosDistintos = new Set(
            g.tallas.map(t => Number(mapaPrecios.get(t) ?? verDetalle.precio))
          );
          const hayVariacion = preciosDistintos.size > 1;
          return (
            <div key={g.id_color} className={`gestproductos-detalle-variante-chip${agotada ? " agotada" : ""}`}>
              <span className="gestproductos-detalle-variante-dot" style={swatchStyle} />
              {hayVariacion ? (
                <span>
                  {g.nombre}: {g.tallas.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ", "}
                      {t} <span style={{ color: "var(--dvna-circle)", fontWeight: 600 }}>({fmt(mapaPrecios.get(t) ?? verDetalle.precio)})</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span>
                  {g.nombre}: {g.tallas.join(", ")}
                  {" "}<span style={{ color: "var(--dvna-circle)", fontWeight: 600 }}>({fmt([...preciosDistintos][0])})</span>
                </span>
              )}
              {agotada && <span className="gestproductos-detalle-variante-stock"> · Agotado</span>}
            </div>
          );
        };
        return (
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Variantes</h3>
            <p style={{ fontSize: 11, color: "var(--dvna-muted)", margin: "0 0 10px" }}>
              Si una talla no tiene precio propio, se usa el precio base del producto (mostrado arriba).
            </p>
            <div className="gestproductos-detalle-variantes-cell">
              {gruposConStock.map(g => renderChip(g, false))}
            </div>
            {gruposSinStock.length > 0 && (
              <>
                <div className="gestproductos-detalle-variantes-divider"><span>Sin stock</span></div>
                <div className="gestproductos-detalle-variantes-cell">
                  {gruposSinStock.map(g => renderChip(g, true))}
                </div>
              </>
            )}
          </div>
        );
      })()}
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Imágenes</h3>
        <GaleriaImagenes tipoReferencia="Producto" idReferencia={verDetalle.id_producto} soloLectura />
      </div>
    </>
  );

  return (
    <div className="gestproductos-container">
      <div className="gestproductos-actions-bar">
        <div className="gestproductos-actions-left">
          <div className="gestproductos-search-wrapper">
            <span className="gestproductos-search-icon"><IconSearch /></span>
            <input className="gestproductos-search-input" placeholder={tab === 'productos' ? "Buscar por nombre, código o categoría..." : tab === 'categorias' ? "Buscar categoría por nombre..." : "Buscar color por nombre..."} value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} />
            {busqueda && <button className="gestproductos-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
          </div>
          <div className="gestproductos-tabs-bar">
            <button className={`gestproductos-tab-btn${tab === 'productos' ? ' active' : ''}`} onClick={() => setTab('productos')}><IconBox /> Productos</button>
            <button className={`gestproductos-tab-btn${tab === 'categorias' ? ' active' : ''}`} onClick={() => setTab('categorias')}><IconTag /> Categorías</button>
            <button className={`gestproductos-tab-btn${tab === 'colores' ? ' active' : ''}`} onClick={() => setTab('colores')}><IconPalette /> Colores</button>
          </div>
        </div>
        <div className="gestproductos-actions-right">
          {tab === 'productos' && tienePerm('Productos.crear') && (
            <button className="gestproductos-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo producto</button>
          )}
          {tab === 'categorias' && tienePerm('Categorias.crear') && (
            <button className="gestproductos-btn-primary" onClick={abrirRegistrarCategoria}><span>+</span> Nueva categoría</button>
          )}
          {tab === 'colores' && tienePerm('Colores.crear') && (
            <button className="gestproductos-btn-primary" onClick={abrirRegistrarColor}><span>+</span> Nuevo color</button>
          )}
          {tab === 'productos' ? (
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/productos", { params: { q: busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Producto", key: "nombre" },
                { header: "Categoría", key: "categoria" },
                { header: "Precio", key: "precio" },
                { header: "Stock", key: "stock" },
                { header: "Publicado", value: (p) => p.publicado ? "Sí" : "No" },
                { header: "Estado", key: "estado" },
              ]}
              nombreArchivo="productos"
              titulo="Productos"
            />
          ) : tab === 'categorias' ? (
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/categorias", { params: { q: busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Nombre", key: "nombre" },
                { header: "Estado", key: "estado" },
              ]}
              nombreArchivo="categorias"
              titulo="Categorías"
            />
          ) : (
            <ExportButtons
              obtenerDatos={async () => {
                const { data } = await api.get("/colores", { params: { q: busquedaDebounced || undefined } });
                return data;
              }}
              columnas={[
                { header: "Nombre", key: "nombre" },
                { header: "HEX", key: "codigo_hex" },
                { header: "Estado", key: "estado" },
              ]}
              nombreArchivo="colores"
              titulo="Colores"
            />
          )}
        </div>
      </div>

      {tab === 'productos' ? (
        <div className="gestproductos-table-container">
          <table className="tbl gestproductos-tabla">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th gestproductos-th-imagen">Imagen</th>
                <th className="tbl-th gestproductos-th-producto">Producto</th>
                <th className="tbl-th gestproductos-th-compacto gestproductos-th-precio">Precio</th>
                <th className="tbl-th gestproductos-th-compacto gestproductos-th-stock">Stock</th>
                <th className="tbl-th gestproductos-th-variantes">Tallas/Colores</th>
                {tienePerm('Productos.publicar') && <th className="tbl-th gestproductos-th-toggle">Publicado</th>}
                {tienePerm('Productos.estado') && <th className="tbl-th gestproductos-th-toggle">Estado</th>}
                <th className="tbl-th gestproductos-th-acciones">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {datos.length === 0 ? (
                <tr><td colSpan={8} className="gestproductos-empty-row">No se encontraron productos.</td></tr>
              ) : datos.map((p) => (
                <tr key={p.id_producto} className="tbl-row">
                  <td className="tbl-td">
                    <div className="gestproductos-img-cell">
                      {p.imagenPrincipal
                        ? <img src={p.imagenPrincipal} alt={p.nombre} className="gestproductos-table-img" />
                        : <div className="gestproductos-img-placeholder">Sin imagen</div>}
                      {p.destacado === "Nuevo" && <span className="gestproductos-img-badge gestproductos-img-badge-nuevo" title="Destacado como Nuevo">N</span>}
                      {p.destacado === "Promocion" && <span className="gestproductos-img-badge gestproductos-img-badge-promo" title="Destacado como Promoción">%</span>}
                    </div>
                  </td>
                  <td className="tbl-td">
                    <div className="gestproductos-product-name" title={p.nombre}>{p.nombre}</div>
                    <span className="tabla-categoria" title={p.categoria}>{p.categoria}</span>
                  </td>
                  <td className="tbl-td gestproductos-td-compacto gestproductos-precio-cell">{fmt(p.precio)}</td>
                  <td className="tbl-td gestproductos-td-compacto gestproductos-stock-cell">{stockBadge(p.stock ?? 0)}</td>
                  <td className="tbl-td">
                    {p.variantes?.length > 0 ? (() => {
                      const grupos = agruparVariantesPorColor(p.variantes).map(g => ({ ...g, texto: g.tallas.join(" · ") }));

                      let anchoUsado = 0;
                      let visibles = [];
                      for (let i = 0; i < grupos.length; i++) {
                        const g = grupos[i];
                        const hayMasDespues = i < grupos.length - 1;
                        const anchoNecesario = anchoChip(g.texto) + (visibles.length > 0 ? GAP_CHIPS : 0) + (hayMasDespues ? ANCHO_CHIP_MAS + GAP_CHIPS : 0);
                        if (anchoUsado + anchoNecesario > ANCHO_COL_VARIANTES) break;
                        visibles.push(g);
                        anchoUsado += anchoChip(g.texto) + (visibles.length > 1 ? GAP_CHIPS : 0);
                      }
                      const restantes = grupos.length - visibles.length;

                      return (
                        <div className="gestproductos-variantes-cell">
                          {visibles.map(g => {
                            const swatchStyle = esColorClaro(g.codigo_hex)
                              ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
                              : { background: g.codigo_hex || "#ccc" };
                            return (
                              <span key={g.id_color} className="gestproductos-variante-chip" title={`${g.nombre}: ${g.tallas.join(", ")}`}>
                                <span className="gestproductos-variante-swatch" style={swatchStyle} />
                                <span className="gestproductos-variante-tallas">{g.texto}</span>
                              </span>
                            );
                          })}
                          {restantes > 0 && (
                            <VariantesMasDropdown
                              grupos={grupos.slice(visibles.length)}
                              restantes={restantes}
                              productoId={p.id_producto}
                              abierto={variantesDropdownAbierto === p.id_producto}
                              onToggle={setVariantesDropdownAbierto}
                            />
                          )}
                        </div>
                      );
                    })() : (
                      <span className="gestproductos-sin-variantes">Sin variantes</span>
                    )}
                  </td>
                  {tienePerm('Productos.publicar') && (
                    <td className="tbl-td gestproductos-td-toggle">
                      <StatusToggle
                        id={p.id_producto}
                        estado={p.publicado ? "Activo" : "Inactivo"}
                        onToggle={(id) => togglePublicado(id)}
                        showConfirmation={false}
                        labels={{ activo: "Sí", inactivo: "No" }}
                        size="sm"
                      />
                    </td>
                  )}
                  {tienePerm('Productos.estado') && (
                    <td className="tbl-td gestproductos-td-toggle">
                      <StatusToggle id={p.id_producto} estado={p.estado} onToggle={toggleEstadoProducto} showConfirmation={true} size="sm" nombreRegistro={p.nombre} />
                    </td>
                  )}
                  <td className="tbl-td">
                    <div className="gestproductos-action-cell">
                      <button className="gestproductos-action-btn gestproductos-view-btn" onClick={() => abrirDetalle(p)}><IconEye /></button>
                      {tienePerm('Productos.editar') && (
                        <button className="gestproductos-action-btn gestproductos-edit-btn" onClick={() => abrirEditar(p)}><IconEdit /></button>
                      )}
                      {tienePerm('Productos.eliminar') && (
                        <button className="gestproductos-action-btn gestproductos-delete-btn" title="Eliminar producto" onClick={() => setEliminarId(p.id_producto)}><IconTrash /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginasProductos > 1 && (
            <div className="paginador">
              <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.max(p - 1, 1))} disabled={paginaProductos === 1}>‹</button>
              {Array.from({ length: totalPaginasProductos }, (_, i) => i + 1).map(n => (
                <button key={n} className={`paginador-btn ${n === paginaProductos ? "paginador-btn-active" : ""}`} onClick={() => setPaginaProductos(n)}>{n}</button>
              ))}
              <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.min(p + 1, totalPaginasProductos))} disabled={paginaProductos === totalPaginasProductos}>›</button>
              <span className="paginador-info">Página {paginaProductos} de {totalPaginasProductos} · {totalProductos} registros</span>
            </div>
          )}
        </div>
      ) : tab === 'categorias' ? (
        <div className="gestproductos-table-container">
          <div className="gestproductos-orden-bar">
            <select id="ordenCategorias" className="gestproductos-form-select gestproductos-orden-select" value={ordenCategorias} onChange={e => setOrdenCategorias(e.target.value)}>
              <option value="nombre">Nombre (A-Z)</option>
              <option value="fecha">Más recientes primero</option>
            </select>
          </div>
          <table className="tbl">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th">Nombre</th>
                <th className="tbl-th">Productos</th>
                {tienePerm('Categorias.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {categoriasPagina.length === 0 ? (
                <tr><td colSpan={4} className="gestproductos-empty-row">No se encontraron categorías.</td></tr>
              ) : categoriasPagina.map((c) => (
                <tr key={c.id_categoria} className="tbl-row">
                  <td className="tbl-td">
                    <div className="catproductos-categoria-cell">
                      <div className="catproductos-categoria-avatar"><IconTag /></div>
                      <span className="catproductos-categoria-name">{c.nombre}</span>
                    </div>
                  </td>
                  <td className="tbl-td">{c.total_productos ?? 0}</td>
                  {tienePerm('Categorias.estado') && (
                    <td className="tbl-td">
                      <StatusToggle id={c.id_categoria} estado={c.estado} onToggle={cambiarEstadoCategoria} showConfirmation={true} nombreRegistro={c.nombre} />
                    </td>
                  )}
                  <td className="tbl-td">
                    <div className="catproductos-action-cell">
                      <button className="catproductos-action-btn catproductos-view-btn" onClick={() => abrirDetalleCategoria(c)} title="Ver detalle"><IconEye /></button>
                      {tienePerm('Categorias.editar') && (
                        <button className="catproductos-action-btn catproductos-edit-btn" onClick={() => abrirEditarCategoria(c)} title="Editar"><IconEdit /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPaginasCategorias > 1 && (
            <div className="paginador">
              <button className="paginador-btn" onClick={() => setPaginaCategorias(p => Math.max(p - 1, 1))} disabled={paginaCategorias === 1}>‹</button>
              {Array.from({ length: totalPaginasCategorias }, (_, i) => i + 1).map(n => (
                <button key={n} className={`paginador-btn ${n === paginaCategorias ? "paginador-btn-active" : ""}`} onClick={() => setPaginaCategorias(n)}>{n}</button>
              ))}
              <button className="paginador-btn" onClick={() => setPaginaCategorias(p => Math.min(p + 1, totalPaginasCategorias))} disabled={paginaCategorias === totalPaginasCategorias}>›</button>
              <span className="paginador-info">Página {paginaCategorias} de {totalPaginasCategorias} · {totalCategorias} registros</span>
            </div>
          )}
        </div>
      ) : (
        <div className="gestproductos-table-container">
          {coloresPagina.length === 0 ? (
            <p style={{ color: "var(--dvna-muted)", fontSize: 13, padding: 24 }}>No se encontraron colores.</p>
          ) : (
            <div className="gestproductos-colores-grid">
              {coloresPagina.map((c) => (
                <div key={c.id_color} className="gestproductos-colores-card">
                  <div className="gestproductos-colores-swatch" style={{ backgroundColor: c.codigo_hex }} />
                  <div className="gestproductos-colores-info">
                    <div className="gestproductos-colores-name">{c.nombre}</div>
                    <div className="gestproductos-colores-hex">{c.codigo_hex}</div>
                    <div className="gestproductos-colores-actions">
                      {tienePerm('Colores.estado') ? (
                        <StatusToggle id={c.id_color} estado={c.estado} onToggle={cambiarEstadoColor} showConfirmation={true} size="sm" nombreRegistro={c.nombre} />
                      ) : (
                        <span className={`tabla-status ${c.estado === "Activo" ? "activo" : "inactivo"}`}>{c.estado}</span>
                      )}
                      <div className="gestproductos-colores-actions-btns">
                        {tienePerm('Colores.editar') && (
                          <button className="catproductos-action-btn catproductos-edit-btn" style={{ width: 28, height: 28 }} onClick={() => abrirEditarColor(c)} title="Editar"><IconEdit /></button>
                        )}
                        {tienePerm('Colores.eliminar') && (
                          <button className="catproductos-action-btn catproductos-deactivate-btn" style={{ width: 28, height: 28 }} onClick={() => setEliminarColorId(c.id_color)} title="Eliminar"><IconTrash /></button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPaginasColores > 1 && (
            <div className="paginador">
              <button className="paginador-btn" onClick={() => setPaginaColores(p => Math.max(p - 1, 1))} disabled={paginaColores === 1}>‹</button>
              {Array.from({ length: totalPaginasColores }, (_, i) => i + 1).map(n => (
                <button key={n} className={`paginador-btn ${n === paginaColores ? "paginador-btn-active" : ""}`} onClick={() => setPaginaColores(n)}>{n}</button>
              ))}
              <button className="paginador-btn" onClick={() => setPaginaColores(p => Math.min(p + 1, totalPaginasColores))} disabled={paginaColores === totalPaginasColores}>›</button>
              <span className="paginador-info">Página {paginaColores} de {totalPaginasColores} · {totalColores} registros</span>
            </div>
          )}
        </div>
      )}

      {/* ── Modal crear/editar producto: panel único tipo factura ── */}
      {modal && tab === 'productos' && (
        <div className="gestproductos-modal-overlay" onClick={cerrarModal}>
          <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="gestproductos-modal-header">
              <h2 className="gestproductos-modal-title">{editar ? "Editar producto" : "Nuevo producto"}</h2>
              <button className="gestproductos-modal-close" onClick={cerrarModal}><IconX /></button>
            </div>

            <div className="gestproductos-modal-body gestproductos-factura-body">
              {errores.general && <div className="gestproductos-error-banner"><IconAlertTriangle /> {errores.general}</div>}

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Datos del producto</h3>

                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Nombre <span className="gestproductos-required">*</span></label>
                  <input className={`gestproductos-form-input${errores.nombre ? " input-error" : ""}`} placeholder="Ej: Camiseta Deportiva" value={form.nombre}
                    maxLength={MAX_LONGITUD_NOMBRE}
                    onChange={e => {
                      const nombre = e.target.value;
                      setForm({ ...form, nombre });
                      if (errores.nombre) setErrores(p => ({ ...p, nombre: validarNombreProducto(nombre) }));
                    }}
                    onBlur={() => setErrores(p => ({ ...p, nombre: validarNombreProducto(form.nombre) }))} />
                  {errores.nombre && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.nombre}</p>}
                </div>

                <div className="gestproductos-form-row">
                  <div className="gestproductos-form-group">
                    <label className="gestproductos-form-label">Categoría <span className="gestproductos-required">*</span></label>
                    <select className={`gestproductos-form-select${errores.id_categoria ? " input-error" : ""}`} value={form.id_categoria}
                      onChange={e => {
                        const id_categoria = Number(e.target.value);
                        setForm({ ...form, id_categoria });
                        if (errores.id_categoria) setErrores(p => ({ ...p, id_categoria: id_categoria ? "" : p.id_categoria }));
                      }}
                      onBlur={() => setErrores(p => ({ ...p, id_categoria: form.id_categoria ? "" : "Selecciona una categoría." }))}>
                      <option value="">— Seleccionar —</option>
                      {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
                    </select>
                    {errores.id_categoria && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.id_categoria}</p>}
                  </div>

                  {editar && (
                    <div className="gestproductos-form-group">
                      <label className="gestproductos-form-label">Precio (COP)</label>
                      <input type="number" min={0} max={MAX_MONTO} className={`gestproductos-form-input${errores.precio ? " input-error" : ""}`} placeholder="0" value={form.precio}
                        onChange={e => {
                          const precio = e.target.value;
                          setForm({ ...form, precio });
                          if (errores.precio) {
                            const invalido = precio !== "" && (isNaN(Number(precio)) || Number(precio) < 0);
                            setErrores(p => ({ ...p, precio: invalido ? "El precio debe ser un número válido, mayor o igual a $0." : "" }));
                          }
                        }}
                        onBlur={() => {
                          const invalido = form.precio !== "" && (isNaN(Number(form.precio)) || Number(form.precio) < 0);
                          setErrores(p => ({ ...p, precio: invalido ? "El precio debe ser un número válido, mayor o igual a $0." : "" }));
                        }} />
                      {errores.precio && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.precio}</p>}
                    </div>
                  )}
                </div>

                {!editar && (
                  <div className="gestproductos-aviso-stock">
                    <IconAlertTriangle />
                    El stock y el precio de venta de este producto se registran al hacer la primera compra
                    (módulo Compras) — aquí solo defines sus datos generales y sus tallas/colores.
                  </div>
                )}

                <div className="gestproductos-form-row">
                  {editar && (
                    <div className="gestproductos-form-group">
                      <label className="gestproductos-form-label">Estado</label>
                      <select className="gestproductos-form-select" value={form.estado}
                        onChange={e => setForm({ ...form, estado: e.target.value, publicado: e.target.value === "Inactivo" ? false : form.publicado })}>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                      </select>
                    </div>
                  )}

                  {tienePerm('Productos.publicar') && (
                    <div className="gestproductos-form-group">
                      <label className="gestproductos-form-label">Publicar en catálogo</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                        <input type="checkbox" id="publicado" checked={!!form.publicado} disabled={form.estado === "Inactivo"}
                          onChange={e => setForm({ ...form, publicado: e.target.checked })}
                          style={{ width: 18, height: 18, cursor: form.estado === "Inactivo" ? "not-allowed" : "pointer" }} />
                        <label htmlFor="publicado" style={{ cursor: form.estado === "Inactivo" ? "not-allowed" : "pointer", fontSize: 13, color: form.estado === "Inactivo" ? "#999" : "inherit" }}>
                          {form.estado === "Inactivo" ? "No puede publicarse si está inactivo" : (form.publicado ? "Visible en catálogo" : "No publicado")}
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="gestproductos-form-group">
                  <label className="gestproductos-form-label">Destacar como <span className="gestproductos-optional">(opcional)</span></label>
                  <select className="gestproductos-form-select" value={form.destacado}
                    onChange={e => setForm({ ...form, destacado: e.target.value })}>
                    <option value="">Ninguno</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Promocion">Promoción</option>
                  </select>
                </div>
              </div>

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Variantes</h3>
                <GestVariantes
                  idProducto={editar || productoId} estadoProducto={form.estado} onPendingChange={setPendingVariantes}
                  coloresAPurgar={coloresAPurgar} onColoresPurgados={onColoresPurgados}
                  imagenesPendientes={pendingImagenes} onEliminarFotosDeColor={eliminarFotosDeColor}
                  onVariantesChange={() => setVariantesVersion(v => v + 1)}
                />
              </div>

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Imágenes</h3>
                <GaleriaImagenes
                  tipoReferencia="Producto" idReferencia={productoId} onPendingChange={setPendingImagenes} coloresPendientes={coloresPendientes}
                  coloresAPurgar={coloresAPurgarFotos} onColoresPurgados={onFotosDeColorPurgadas}
                  refrescarColores={variantesVersion}
                />
              </div>
            </div>

            <div className="gestproductos-modal-footer">
              <button className="gestproductos-btn-secondary" onClick={cerrarModal} disabled={guardando}>Cancelar</button>
              <button className="gestproductos-btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : (editar ? "Actualizar" : "Registrar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal crear/editar categoría — panel único, mismo estilo que
          "Nuevo producto" (antes usaba el wizard ModalSteps con "Paso 1 de 1",
          visualmente distinto al resto). ── */}
      {modal && tab === 'categorias' && (
        <div className="gestproductos-modal-overlay" onClick={() => setModal(false)}>
          <div className="gestproductos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gestproductos-modal-header">
              <h2 className="gestproductos-modal-title">{editarCategoria ? "Editar categoría" : "Nueva categoría"}</h2>
              <button className="gestproductos-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>
            <div className="gestproductos-modal-body gestproductos-factura-body">
              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Datos de la categoría</h3>
                {PasoCategoriaForm}
              </div>
            </div>
            <div className="gestproductos-modal-footer">
              <button className="gestproductos-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="gestproductos-btn-primary" onClick={guardarCategoria}>
                {editarCategoria ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal crear/editar color — mismo criterio: panel único, no wizard. ── */}
      {modal && tab === 'colores' && (
        <div className="gestproductos-modal-overlay" onClick={() => setModal(false)}>
          <div className="gestproductos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gestproductos-modal-header">
              <h2 className="gestproductos-modal-title">{editarColor ? "Editar color" : "Nuevo color"}</h2>
              <button className="gestproductos-modal-close" onClick={() => setModal(false)}><IconX /></button>
            </div>
            <div className="gestproductos-modal-body gestproductos-factura-body">
              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Color y nombre</h3>
                {PasoColorForm}
              </div>
            </div>
            <div className="gestproductos-modal-footer">
              <button className="gestproductos-btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="gestproductos-btn-primary" onClick={guardarColor}>
                {editarColor ? "Actualizar" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {eliminarColorId && (
        <ConfirmModal
          title="Eliminar color"
          message={`¿Eliminar el color "${coloresPagina.find((c) => c.id_color === eliminarColorId)?.nombre || ""}"? No se podrá eliminar si está asociado a algún producto.`}
          onCancel={() => setEliminarColorId(null)}
          onConfirm={confirmarEliminarColor}
          confirmLabel="Sí, eliminar"
        />
      )}

      {/* ── Modal ver detalle: panel único tipo factura, igual al resto de módulos ── */}
      {verDetalle && (
        <div className="gestproductos-modal-overlay" onClick={() => setVerDetalle(null)}>
          <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="gestproductos-modal-header">
              <div>
                <h2 className="gestproductos-modal-title">{verDetalle.nombre}</h2>
                <p className="gestproductos-modal-subtitulo">Detalle del producto</p>
              </div>
              <button className="gestproductos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
            </div>

            <div className="gestproductos-modal-body gestproductos-factura-body">
              {DetalleInfoGeneral}
              {DetalleVariantesImagenes}
            </div>

            <div className="gestproductos-modal-footer">
              <button className="gestproductos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
              {tienePerm('Productos.editar') && (
                <button className="gestproductos-btn-primary" onClick={() => { setVerDetalle(null); abrirEditar(verDetalle); }}>
                  <IconEdit /> Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ver detalle de categoría: mismo panel tipo factura ── */}
      {verDetalleCategoria && (
        <div className="gestproductos-modal-overlay" onClick={() => setVerDetalleCategoria(null)}>
          <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
            <div className="gestproductos-modal-header">
              <div>
                <h2 className="gestproductos-modal-title">{verDetalleCategoria.nombre}</h2>
                <p className="gestproductos-modal-subtitulo">Detalle de la categoría</p>
              </div>
              <button className="gestproductos-modal-close" onClick={() => setVerDetalleCategoria(null)}><IconX /></button>
            </div>

            <div className="gestproductos-modal-body gestproductos-factura-body">
              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Información general</h3>
                <DetalleGrid>
                  <DetalleItem label="Descripción" value={verDetalleCategoria.descripcion} full />
                  <DetalleItem label="Fecha de creación" value={verDetalleCategoria.fecha_creacion ? new Date(verDetalleCategoria.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : null} />
                  <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalleCategoria.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalleCategoria.estado}</span>} />
                </DetalleGrid>
              </div>

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Productos en esta categoría ({verDetalleCategoria.productos?.length ?? 0})</h3>
                {verDetalleCategoria.productos?.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {verDetalleCategoria.productos.map(p => (
                      <div key={p.id_producto} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 13 }}>
                        <span>{p.nombre} <span style={{ color: "var(--dvna-muted)" }}>· {p.codigo}</span></span>
                        <span style={{ fontWeight: 600 }}>{fmt(p.precio)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--dvna-muted)", fontSize: 13 }}>Esta categoría todavía no tiene productos.</p>
                )}
              </div>
            </div>

            <div className="gestproductos-modal-footer">
              <button className="gestproductos-btn-secondary" onClick={() => setVerDetalleCategoria(null)}>Cerrar</button>
              {tienePerm('Categorias.editar') && (
                <button className="gestproductos-btn-primary" onClick={() => { setVerDetalleCategoria(null); abrirEditarCategoria(verDetalleCategoria); }}>
                  <IconEdit /> Editar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {eliminarId && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Seguro que deseas eliminar "${datos.find((p) => p.id_producto === eliminarId)?.nombre || "este producto"}"? Dejará de mostrarse en el catálogo y en la gestión de productos. No se puede eliminar si tiene pedidos pendientes.`}
          confirmLabel="Sí, eliminar"
          onConfirm={confirmarEliminar}
          onCancel={() => setEliminarId(null)}
        />
      )}

      {coloresSinFotos.length > 0 && (
        <ConfirmModal
          title="Colores sin fotos"
          message={`Un producto no puede tener colores sin fotos asociadas. ${coloresSinFotos.length > 1 ? "Los siguientes colores no tienen" : "El siguiente color no tiene"} ninguna foto: ${coloresSinFotos.map(c => c.nombre).join(", ")}. Puedes eliminarlos para continuar o cancelar y subirles fotos.`}
          confirmLabel="Eliminar esos colores"
          onConfirm={confirmarEliminarColoresSinFotos}
          onCancel={() => setColoresSinFotos([])}
        />
      )}
    </div>
  );
}