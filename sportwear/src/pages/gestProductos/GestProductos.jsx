// src/pages/productos/GestProductos.jsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import GaleriaImagenes from "../../components/GaleriaImagenes";
import GestVariantes from "../../components/GestVariantes";
import ModalSteps from "../../components/ModalSteps";
import StatusToggle from "../../components/StatusToggle";
import ConfirmModal from "../../components/ConfirmModal";
import Loader from "../../components/Loader";
import ExportButtons from "../../components/ExportButtons";
import { IconAlertTriangle, IconCheck, IconEdit, IconEye, IconSearch, IconX, IconBox, IconTag, IconTrash } from "../../components/Icons";
import "./GestProductos.css";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const ERRORES_INICIALES = { nombre: "", id_categoria: "", precio: "", general: "" };
const FORM_VACIO = { nombre: "", descripcion: "", id_categoria: "", precio: "", publicado: false, estado: "Activo" };

export default function GestProductos() {
  const { usuario } = useAuth();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);
  const [searchParams, setSearchParams] = useSearchParams();

  const [datos,            setDatos]            = useState([]);
  const [categorias,       setCategorias]       = useState([]);
  const [busqueda,         setBusqueda]         = useState("");
  const [modal,            setModal]            = useState(false);
  const [verDetalle,       setVerDetalle]       = useState(null);
  const [editar,           setEditar]           = useState(null);
  const [productoId,       setProductoId]       = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [guardando,        setGuardando]        = useState(false);
  const [errores,          setErrores]          = useState(ERRORES_INICIALES);
  const [toast,            setToast]            = useState(null);
  const [form,             setForm]             = useState(FORM_VACIO);
  const [pendingVariantes, setPendingVariantes] = useState([]);
  const [pendingImagenes,  setPendingImagenes]  = useState([]);
  const [tab,              setTab]              = useState("productos");
  const [paginaProductos,  setPaginaProductos]  = useState(1);
  const [paginaCategorias, setPaginaCategorias] = useState(1);
  const FILAS_POR_PAGINA = 10;

  const [formCategoria,    setFormCategoria]    = useState({ nombre: "", icono: "tag" });
  const [editarCategoria,  setEditarCategoria]  = useState(null);
  const [erroresCategoria, setErroresCategoria] = useState({ nombre: "" });
  const [eliminarId,       setEliminarId]       = useState(null);
  const [ordenCategorias,  setOrdenCategorias]  = useState("nombre");
  const [verDetalleCategoria, setVerDetalleCategoria] = useState(null);

  const mostrarToast = (tipo, mensaje) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  };

  const cargar = async () => {
    try {
      const [p, c] = await Promise.all([api.get("/productos"), api.get("/categorias")]);
      setCategorias(c.data);
      const productosConImagen = await Promise.all(
        p.data.map(async (prod) => {
          try {
            const { data: imgs } = await api.get(`/imagenes?tipo=Producto&id=${prod.id_producto}`);
            return { ...prod, imagenPrincipal: imgs.length > 0 ? imgs[0].url : null };
          } catch { return { ...prod, imagenPrincipal: null }; }
        })
      );
      setDatos(productosConImagen);
      return productosConImagen;
    } catch { mostrarToast("error", "No se pudo cargar."); return []; }
    finally { setLoading(false); }
  };

  // ── Carga inicial + soporte de deep-link "?edit=ID" (viene desde el catálogo admin) ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    cargar().then((productosConImagen) => {
      const editId = searchParams.get('edit');
      if (editId) {
        const producto = productosConImagen.find(p => String(p.id_producto) === String(editId));
        if (producto) {
          abrirEditar(producto);
        }
        // Limpia el query param para que no se re-abra al refrescar/cerrar
        setSearchParams({}, { replace: true });
      }
    });
    // eslint-disable-next-line
  }, []);

  const filtradosAll = datos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  );
  const filtrados             = filtradosAll.slice((paginaProductos - 1) * FILAS_POR_PAGINA, paginaProductos * FILAS_POR_PAGINA);
  const totalPaginasProductos = Math.ceil(filtradosAll.length / FILAS_POR_PAGINA);

  const categoriasFiltradasAll = categorias
    .filter(c => c.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
    .slice()
    .sort((a, b) => ordenCategorias === "fecha"
      ? new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0)
      : a.nombre.localeCompare(b.nombre));
  const categoriasFiltradas    = categoriasFiltradasAll.slice((paginaCategorias - 1) * FILAS_POR_PAGINA, paginaCategorias * FILAS_POR_PAGINA);
  const totalPaginasCategorias = Math.ceil(categoriasFiltradasAll.length / FILAS_POR_PAGINA);

  // ── Productos ──────────────────────────────────────────────────────────────
  const abrirRegistrar = () => {
    setEditar(null); setProductoId(null); setErrores(ERRORES_INICIALES);
    setForm({ ...FORM_VACIO, id_categoria: categorias[0]?.id_categoria || "" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_producto); setProductoId(p.id_producto); setErrores(ERRORES_INICIALES);
    setForm({ nombre: p.nombre ?? "", descripcion: p.descripcion ?? "", id_categoria: p.id_categoria ?? "", precio: p.precio ?? "", publicado: !!p.publicado, estado: p.estado ?? "Activo" });
    setPendingVariantes([]); setPendingImagenes([]); setModal(true);
  };

  const validarPasoDatos = () => {
    const e = { ...ERRORES_INICIALES }; let ok = true;
    if (!form.nombre.trim()) { e.nombre = "El nombre del producto es obligatorio."; ok = false; }
    else if (form.nombre.trim().length < 3) { e.nombre = "El nombre debe tener al menos 3 caracteres."; ok = false; }
    if (!form.id_categoria) { e.id_categoria = "Selecciona una categoría."; ok = false; }
    if (!form.precio || Number(form.precio) <= 0) { e.precio = "El precio debe ser mayor a $0."; ok = false; }
    setErrores(e); return ok;
  };

  const validar = () => validarPasoDatos();

  const guardar = async () => {
    if (!validar()) return;
    if (!editar) {
      if (pendingImagenes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una imagen del producto." })); return; }
      if (pendingVariantes.length === 0) { setErrores(p => ({ ...p, general: "Agrega al menos una talla disponible." })); return; }
    }
    setGuardando(true);
    try {
      const payload = { nombre: form.nombre, descripcion: form.descripcion || null, id_categoria: Number(form.id_categoria), precio: Number(form.precio), publicado: !!form.publicado, estado: form.estado };

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
        setModal(false); window.scrollTo(0, 0); cargar();
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
        setModal(false); window.scrollTo(0, 0); cargar();
      }
    } catch (err) {
      setErrores(prev => ({ ...prev, general: err.response?.data?.message || "Error al guardar." }));
    } finally { setGuardando(false); }
  };

  const toggleEstadoProducto = async (id, nuevoEstado) => {
    try {
      await api.patch(`/productos/${id}/estado`);
      setDatos(prev => prev.map(p => p.id_producto === id ? { ...p, estado: nuevoEstado } : p));
      mostrarToast("exito", "Estado actualizado.");
    } catch { mostrarToast("error", "No se pudo cambiar."); }
  };

  const togglePublicado = async (id) => {
    try {
      const producto = datos.find(p => p.id_producto === id);
      if (producto?.estado === "Inactivo") { mostrarToast("error", "No se puede publicar un producto inactivo."); return; }
      await api.patch(`/productos/${id}/publicar`);
      cargar();
    } catch (err) { console.error(err); }
  };

  const confirmarEliminar = async () => {
    const id = eliminarId;
    setEliminarId(null);
    try {
      await api.delete(`/productos/${id}`);
      setDatos(prev => prev.filter(p => p.id_producto !== id));
      mostrarToast("exito", "Producto eliminado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo eliminar el producto.");
    }
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModal(false); setErrores(ERRORES_INICIALES); setProductoId(null);
    setPendingVariantes([]); setPendingImagenes([]);
    cargar();
  };

  // ── Categorías ─────────────────────────────────────────────────────────────
  const abrirRegistrarCategoria = () => { setEditarCategoria(null); setFormCategoria({ nombre: "", descripcion: "", icono: "tag" }); setErroresCategoria({ nombre: "" }); setModal(true); };
  const abrirEditarCategoria    = (c) => { setEditarCategoria(c.id_categoria); setFormCategoria({ nombre: c.nombre, descripcion: c.descripcion || "", icono: c.icono || "tag" }); setErroresCategoria({ nombre: "" }); setModal(true); };

  const validarPasoCategoriaForm = () => {
    const e = { nombre: "" };
    if (!formCategoria.nombre?.trim()) { e.nombre = "El nombre de la categoría es obligatorio"; }
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
    try {
      await api.patch(`/categorias/${id}/estado`);
      setCategorias(prev => prev.map(c => c.id_categoria === id ? { ...c, estado: nuevoEstado } : c));
      mostrarToast("exito", "Estado actualizado.");
    } catch (err) {
      mostrarToast("error", err.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  const stockBadge = (stock) => {
    if (stock === 0) return <span className="tabla-stock agotado">Agotado</span>;
    if (stock < 5)  return <span className="tabla-stock bajo">{stock} uds <IconAlertTriangle /></span>;
    return <span className="tabla-stock normal">{stock} uds</span>;
  };

  if (loading) return <Loader text="Cargando productos..." />;

  const coloresPendientes = [...new Map(pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])).values()];

  const PasoCategoriaForm = (
    <div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Nombre de la categoría <span className="gestproductos-required">*</span></label>
        <input type="text" className={`gestproductos-form-input${erroresCategoria.nombre ? " input-error" : ""}`} placeholder="Ej: Ropa Deportiva"
          value={formCategoria.nombre}
          onChange={e => {
            const nombre = e.target.value;
            setFormCategoria({ ...formCategoria, nombre });
            if (erroresCategoria.nombre) setErroresCategoria(prev => ({ ...prev, nombre: nombre.trim() ? "" : prev.nombre }));
          }}
          onBlur={() => setErroresCategoria(prev => ({ ...prev, nombre: formCategoria.nombre?.trim() ? "" : "El nombre de la categoría es obligatorio" }))} />
        {erroresCategoria.nombre && <p className="gestproductos-field-error">{erroresCategoria.nombre}</p>}
      </div>
      <div className="gestproductos-form-group">
        <label className="gestproductos-form-label">Descripción</label>
        <textarea className="gestproductos-form-input" rows={3} placeholder="Descripción breve de la categoría (opcional)"
          value={formCategoria.descripcion || ""}
          onChange={e => setFormCategoria({ ...formCategoria, descripcion: e.target.value })} />
      </div>
    </div>
  );

  return (
    <div className="gestproductos-container">
      {toast && (
        <div className={`gestproductos-toast gestproductos-toast-${toast.tipo}`}>
          <span>{toast.tipo === "exito" ? <IconCheck /> : <IconX />}</span>
          <span>{toast.mensaje}</span>
        </div>
      )}

      <div className="gestproductos-actions-bar">
        <div className="gestproductos-actions-left">
          <div className="gestproductos-search-wrapper">
            <span className="gestproductos-search-icon"><IconSearch /></span>
            <input className="gestproductos-search-input" placeholder={tab === 'productos' ? "Buscar por nombre, código o categoría..." : "Buscar categoría por nombre..."} value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaProductos(1); setPaginaCategorias(1); }} />
            {busqueda && <button className="gestproductos-search-clear" onClick={() => { setBusqueda(""); setPaginaProductos(1); setPaginaCategorias(1); }}><IconX /></button>}
          </div>
          <div className="gestproductos-tabs-bar">
            <button className={`gestproductos-tab-btn${tab === 'productos' ? ' active' : ''}`} onClick={() => setTab('productos')}><IconBox /> Productos</button>
            <button className={`gestproductos-tab-btn${tab === 'categorias' ? ' active' : ''}`} onClick={() => setTab('categorias')}><IconTag /> Categorías</button>
          </div>
        </div>
        <div className="gestproductos-actions-right">
          {tab === 'productos' && tienePerm('Productos.crear') && (
            <button className="gestproductos-btn-primary" onClick={abrirRegistrar}><span>+</span> Nuevo producto</button>
          )}
          {tab === 'categorias' && tienePerm('Categorias.crear') && (
            <button className="gestproductos-btn-primary" onClick={abrirRegistrarCategoria}><span>+</span> Nueva categoría</button>
          )}
          {tab === 'productos' ? (
            <ExportButtons
              datos={filtradosAll}
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
          ) : (
            <ExportButtons
              datos={categoriasFiltradasAll}
              columnas={[
                { header: "Nombre", key: "nombre" },
                { header: "Estado", key: "estado" },
              ]}
              nombreArchivo="categorias"
              titulo="Categorías"
            />
          )}
        </div>
      </div>

      {tab === 'productos' ? (
        <div className="gestproductos-table-container">
          <table className="tbl">
            <thead className="tbl-header">
              <tr>
                <th className="tbl-th">Imagen</th>
                <th className="tbl-th">Producto</th>
                <th className="tbl-th">Categoría</th>
                <th className="tbl-th">Precio</th>
                <th className="tbl-th">Stock</th>
                <th className="tbl-th">Variantes</th>
                {tienePerm('Productos.publicar') && <th className="tbl-th">Publicado</th>}
                {tienePerm('Productos.estado') && <th className="tbl-th">Estado</th>}
                <th className="tbl-th">Acciones</th>
              </tr>
            </thead>
            <tbody className="tbl-body">
              {filtrados.length === 0 ? (
                <tr><td colSpan={9} className="gestproductos-empty-row">No se encontraron productos.</td></tr>
              ) : filtrados.map((p) => (
                <tr key={p.id_producto} className="tbl-row">
                  <td className="tbl-td">
                    <div className="gestproductos-img-cell">
                      {p.imagenPrincipal
                        ? <img src={p.imagenPrincipal} alt={p.nombre} className="gestproductos-table-img" />
                        : <div className="gestproductos-img-placeholder">Sin imagen</div>}
                    </div>
                  </td>
                  <td className="tbl-td"><div className="gestproductos-product-name">{p.nombre}</div></td>
                  <td className="tbl-td"><span className="tabla-categoria">{p.categoria}</span></td>
                  <td className="tbl-td gestproductos-precio-cell">{fmt(p.precio)}</td>
                  <td className="tbl-td">{stockBadge(p.stock ?? 0)}</td>
                  <td className="tbl-td">
                    {p.variantes?.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {p.variantes.map(v => (
                          <span key={v.id_variante} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "2px 7px" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.codigo_hex || "#ccc", flexShrink: 0 }} />
                            {v.talla}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--dvna-muted)", fontStyle: "italic" }}>Sin variantes</span>
                    )}
                  </td>
                  {tienePerm('Productos.publicar') && (
                    <td className="tbl-td">
                      <StatusToggle
                        id={p.id_producto}
                        estado={p.publicado ? "Activo" : "Inactivo"}
                        onToggle={(id) => togglePublicado(id)}
                        showConfirmation={false}
                        labels={{ activo: "Sí", inactivo: "No" }}
                      />
                    </td>
                  )}
                  {tienePerm('Productos.estado') && (
                    <td className="tbl-td">
                      <StatusToggle id={p.id_producto} estado={p.estado} onToggle={toggleEstadoProducto} showConfirmation={true} />
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
              <span className="paginador-info">Página {paginaProductos} de {totalPaginasProductos} · {filtradosAll.length} registros</span>
            </div>
          )}
        </div>
      ) : (
        <div className="gestproductos-table-container">
          <div className="gestproductos-orden-bar">
            <label className="gestproductos-form-label" htmlFor="ordenCategorias">Ordenar por</label>
            <select id="ordenCategorias" className="gestproductos-form-select" value={ordenCategorias} onChange={e => setOrdenCategorias(e.target.value)}>
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
              {categoriasFiltradas.length === 0 ? (
                <tr><td colSpan={4} className="gestproductos-empty-row">No se encontraron categorías.</td></tr>
              ) : categoriasFiltradas.map((c) => (
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
                      <StatusToggle id={c.id_categoria} estado={c.estado} onToggle={cambiarEstadoCategoria} showConfirmation={true} />
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
              <span className="paginador-info">Página {paginaCategorias} de {totalPaginasCategorias} · {categoriasFiltradasAll.length} registros</span>
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
                    onChange={e => {
                      const nombre = e.target.value;
                      setForm({ ...form, nombre });
                      if (errores.nombre) {
                        let msg = "";
                        if (!nombre.trim()) msg = "El nombre del producto es obligatorio.";
                        else if (nombre.trim().length < 3) msg = "El nombre debe tener al menos 3 caracteres.";
                        setErrores(p => ({ ...p, nombre: msg }));
                      }
                    }}
                    onBlur={() => {
                      let msg = "";
                      if (!form.nombre.trim()) msg = "El nombre del producto es obligatorio.";
                      else if (form.nombre.trim().length < 3) msg = "El nombre debe tener al menos 3 caracteres.";
                      setErrores(p => ({ ...p, nombre: msg }));
                    }} />
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

                  <div className="gestproductos-form-group">
                    <label className="gestproductos-form-label">Precio (COP) <span className="gestproductos-required">*</span></label>
                    <input type="number" min={0} className={`gestproductos-form-input${errores.precio ? " input-error" : ""}`} placeholder="0" value={form.precio}
                      onChange={e => {
                        const precio = e.target.value;
                        setForm({ ...form, precio });
                        if (errores.precio) setErrores(p => ({ ...p, precio: (precio && Number(precio) > 0) ? "" : p.precio }));
                      }}
                      onBlur={() => setErrores(p => ({ ...p, precio: (form.precio && Number(form.precio) > 0) ? "" : "El precio debe ser mayor a $0." }))} />
                    {errores.precio && <p className="gestproductos-field-error"><IconAlertTriangle /> {errores.precio}</p>}
                  </div>
                </div>

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

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Variantes</h3>
                <GestVariantes idProducto={editar || productoId} estadoProducto={form.estado} onPendingChange={setPendingVariantes} />
              </div>

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Imágenes</h3>
                <GaleriaImagenes tipoReferencia="Producto" idReferencia={productoId} onPendingChange={setPendingImagenes} coloresPendientes={coloresPendientes} />
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

      {modal && tab === 'categorias' && (
        <ModalSteps
          titulo={editarCategoria ? "Editar categoría" : "Nueva categoría"}
          pasos={["Datos"]}
          onClose={() => setModal(false)} onGuardar={guardarCategoria}
          validaciones={[validarPasoCategoriaForm]}
          labelGuardar={editarCategoria ? "Actualizar" : "Registrar"}
        >
          {PasoCategoriaForm}
        </ModalSteps>
      )}

      {/* ── Modal ver detalle: panel único tipo factura ── */}
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
              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Información general</h3>
                <div className="gestproductos-detalle-info-grid">
                  <div><span className="gestproductos-detalle-info-label">ID</span><span className="gestproductos-detalle-info-valor">#{String(verDetalle.id_producto).padStart(3, "0")}</span></div>
                  <div><span className="gestproductos-detalle-info-label">Código</span><span className="gestproductos-detalle-info-valor">{verDetalle.codigo}</span></div>
                  <div><span className="gestproductos-detalle-info-label">Categoría</span><span className="gestproductos-detalle-info-valor">{verDetalle.categoria}</span></div>
                  <div><span className="gestproductos-detalle-info-label">Precio</span><span className="gestproductos-detalle-info-valor">{fmt(verDetalle.precio)}</span></div>
                  <div><span className="gestproductos-detalle-info-label">Stock total</span><span className="gestproductos-detalle-info-valor">{verDetalle.stock ?? 0} unidades</span></div>
                  <div>
                    <span className="gestproductos-detalle-info-label">Estado</span>
                    <span className={`tabla-status${verDetalle.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalle.estado}</span>
                  </div>
                  <div><span className="gestproductos-detalle-info-label">Publicado</span><span className="gestproductos-detalle-info-valor">{verDetalle.publicado ? "Sí, visible en catálogo" : "No publicado"}</span></div>
                </div>
              </div>

              {verDetalle.variantes?.length > 0 && (
                <div className="gestproductos-factura-seccion">
                  <h3 className="gestproductos-factura-titulo">Variantes</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {verDetalle.variantes.map(v => (
                      <div key={v.id_variante} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "4px 10px", fontSize: 11 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.codigo_hex || "#ccc", border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                        <span>{v.color_nombre}</span><span style={{ color: "var(--dvna-muted)" }}>·</span>
                        <span>{v.talla}</span><span style={{ color: "var(--dvna-muted)" }}>·</span>
                        <span style={{ fontWeight: 600 }}>{v.stock} uds</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="gestproductos-factura-seccion">
                <h3 className="gestproductos-factura-titulo">Imágenes</h3>
                <GaleriaImagenes tipoReferencia="Producto" idReferencia={verDetalle.id_producto} soloLectura />
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

      {/* ── Modal ver detalle de categoría ── */}
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
                <div className="gestproductos-detalle-info-grid">
                  <div><span className="gestproductos-detalle-info-label">Descripción</span><span className="gestproductos-detalle-info-valor">{verDetalleCategoria.descripcion || "Sin descripción"}</span></div>
                  <div><span className="gestproductos-detalle-info-label">Fecha de creación</span><span className="gestproductos-detalle-info-valor">{verDetalleCategoria.fecha_creacion ? new Date(verDetalleCategoria.fecha_creacion).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "—"}</span></div>
                  <div>
                    <span className="gestproductos-detalle-info-label">Estado</span>
                    <span className={`tabla-status${verDetalleCategoria.estado === "Activo" ? ' activo' : ' inactivo'}`}>{verDetalleCategoria.estado}</span>
                  </div>
                </div>
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
          message="¿Seguro que deseas eliminar este producto? Dejará de mostrarse en el catálogo y en la gestión de productos. No se puede eliminar si tiene pedidos pendientes."
          confirmLabel="Sí, eliminar"
          onConfirm={confirmarEliminar}
          onCancel={() => setEliminarId(null)}
        />
      )}
    </div>
  );
}