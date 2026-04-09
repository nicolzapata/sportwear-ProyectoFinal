// src/pages/productos/GestProductos.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import GaleriaImagenes from "../../components/GaleriaImagenes";
import GestVariantes from "../../components/GestVariantes";
import ModalSteps from "../../components/ModalSteps";
import ModalDetalle, { DetalleItem, DetalleGrid, DetalleSeccion } from "../../components/ModalDetalle";
import "./GestProductos.css";
import { IconAlertTriangle, IconBan, IconCheck, IconEdit, IconEye, IconSearch, IconShoppingBag, IconX } from "../../components/Icons";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const ERRORES_INICIALES = { nombre: "", id_categoria: "", precio: "", general: "" };
const FORM_VACIO = { nombre: "", descripcion: "", id_categoria: "", precio: "", publicado: false, estado: "Activo" };

export default function GestProductos() {
  const [datos,      setDatos]      = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda,   setBusqueda]   = useState("");
  const [modal,      setModal]      = useState(false);
  const [verDetalle, setVerDetalle] = useState(null);
  const [editar,     setEditar]     = useState(null);
  const [productoId, setProductoId] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [guardando,  setGuardando]  = useState(false);
  const [errores,    setErrores]    = useState(ERRORES_INICIALES);
  const [toast,      setToast]      = useState(null);
  const [form,       setForm]       = useState(FORM_VACIO);
  const [pendingVariantes, setPendingVariantes] = useState([]);
  const [pendingImagenes, setPendingImagenes] = useState([]);

  const mostrarToast = (tipo, mensaje) => {
    setToast({ tipo, mensaje });
    setTimeout(() => setToast(null), 3500);
  };

  const cargar = async () => {
    try {
      const [p, c] = await Promise.all([
        api.get("/productos"),
        api.get("/categorias"),
      ]);
      setDatos(p.data);
      setCategorias(c.data.filter(c => c.estado === "Activo"));
    } catch {
      mostrarToast("error", "No se pudo cargar.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(); }, []);

  const filtrados = datos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirRegistrar = () => {
    setEditar(null);
    setProductoId(null);
    setErrores(ERRORES_INICIALES);
    setForm({ ...FORM_VACIO, id_categoria: categorias[0]?.id_categoria || "" });
    setPendingVariantes([]);
    setPendingImagenes([]);
    setModal(true);
  };

  const abrirEditar = (p) => {
    setEditar(p.id_producto);
    setProductoId(p.id_producto);
    setErrores(ERRORES_INICIALES);
    setForm({
      nombre:       p.nombre       ?? "",
      descripcion:  p.descripcion  ?? "",
      id_categoria: p.id_categoria ?? "",
      precio:       p.precio       ?? "",
      publicado:    !!p.publicado,
      estado:       p.estado       ?? "Activo",
    });
    setPendingVariantes([]);
    setPendingImagenes([]);
    setModal(true);
  };

  const validar = () => {
    const e = { ...ERRORES_INICIALES };
    let ok = true;
    if (!form.nombre.trim() || form.nombre.trim().length < 3) { e.nombre = "Mínimo 3 caracteres."; ok = false; }
    if (!form.id_categoria) { e.id_categoria = "Selecciona una categoría."; ok = false; }
    if (!form.precio || Number(form.precio) <= 0) { e.precio = "El precio debe ser mayor a $0."; ok = false; }
    setErrores(e);
    return ok;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        nombre:       form.nombre,
        descripcion:  form.descripcion || null,
        id_categoria: Number(form.id_categoria),
        precio:       Number(form.precio),
        publicado:    !!form.publicado,
        estado:       form.estado,
      };

      if (editar) {
        await api.put(`/productos/${editar}`, payload);
        if (pendingVariantes.length > 0) {
          await Promise.all(pendingVariantes.map(v =>
            api.post('/variantes', {
              id_producto: editar,
              id_color: v.id_color,
              talla: v.talla,
              stock: v.stock || 0,
            })
          ));
        }
        if (pendingImagenes.length > 0) {
          for (const img of pendingImagenes) {
            const fd = new FormData();
            fd.append("imagenes", img.file);
            fd.append("tipo_referencia", "Producto");
            fd.append("id_referencia", editar);
            if (img.id_color) fd.append("id_color", img.id_color);
            await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
          }
        }
        setPendingVariantes([]);
        setPendingImagenes([]);
        mostrarToast("exito", "Producto actualizado.");
        setModal(false);
        cargar();
      } else {
        const { data } = await api.post("/productos", payload);
        setProductoId(data.id_producto);
        setEditar(data.id_producto);
        
        if (pendingVariantes.length > 0) {
          await Promise.all(pendingVariantes.map(v =>
            api.post('/variantes', {
              id_producto: data.id_producto,
              id_color: v.id_color,
              talla: v.talla,
              stock: v.stock || 0,
            })
          ));
        }
        
        if (pendingImagenes.length > 0) {
          for (const img of pendingImagenes) {
            const fd = new FormData();
            fd.append("imagenes", img.file);
            fd.append("tipo_referencia", "Producto");
            fd.append("id_referencia", data.id_producto);
            if (img.id_color) fd.append("id_color", img.id_color);
            await api.post("/imagenes", fd, { headers: { "Content-Type": "multipart/form-data" } });
          }
        }
        
        setPendingVariantes([]);
        setPendingImagenes([]);
        mostrarToast("exito", "Producto guardado con variantes e imágenes.");
        cargar();
      }
    } catch (err) {
      setErrores(prev => ({ ...prev, general: err.response?.data?.message || "Error al guardar." }));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado   = async (id) => { try { await api.patch(`/productos/${id}/estado`); cargar(); mostrarToast("exito", "Estado actualizado."); } catch { mostrarToast("error", "No se pudo cambiar."); } };
  const togglePublicado = async (id) => { try { await api.patch(`/productos/${id}/publicar`); cargar(); } catch (err) { console.error(err); } };
  const cerrarModal     = () => { if (guardando) return; setModal(false); setErrores(ERRORES_INICIALES); setProductoId(null); setPendingVariantes([]); setPendingImagenes([]); cargar(); };

  const stockBadge = (stock) => {
    if (stock === 0)  return <span className="gestproductos-stock-badge sin-stock">Agotado</span>;
    if (stock < 5)    return <span className="gestproductos-stock-badge bajo-stock">{stock} uds <IconAlertTriangle /></span>;
    return <span className="gestproductos-stock-badge normal">{stock} uds</span>;
  };

  if (loading) return (
    <div className="gestproductos-loading-container">
      <div className="gestproductos-loading-spinner" />
      <p className="gestproductos-loading-text">Cargando productos...</p>
    </div>
  );

  // ── Paso 1: Info + Variantes ───────────────────────────────────────────────
  const PasoInfo = (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {errores.general && (
        <div className="gestproductos-error-banner">
          <IconAlertTriangle /> {errores.general}
        </div>
      )}

      <div className="ms-form-group">
        <label className="ms-form-label">Nombre <span className="ms-req">*</span></label>
        <input
          className={`ms-form-input${errores.nombre ? " error" : ""}`}
          placeholder="Ej: Camiseta Deportiva"
          value={form.nombre}
          onChange={e => { setForm({ ...form, nombre: e.target.value }); if (errores.nombre) setErrores(p => ({ ...p, nombre: "" })); }}
        />
        {errores.nombre && <p className="ms-form-error"><IconAlertTriangle /> {errores.nombre}</p>}
      </div>

      <div className="ms-form-group">
        <label className="ms-form-label">Descripción</label>
        <textarea
          className="ms-form-input" rows={3} placeholder="Descripción..."
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          style={{ resize: "vertical", minHeight: 70 }}
        />
      </div>

      {/* Variantes: modo local para permitir registrar todo junto */}
      <div style={{ marginTop: 8 }}>
        <GestVariantes onPendingChange={setPendingVariantes} />
      </div>
    </div>
  );

  // ── Paso 2: Categoría y precio ─────────────────────────────────────────────
  const PasoCategoria = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Categoría <span className="ms-req">*</span></label>
        <select
          className={`ms-form-select${errores.id_categoria ? " error" : ""}`}
          value={form.id_categoria}
          onChange={e => { setForm({ ...form, id_categoria: Number(e.target.value) }); if (errores.id_categoria) setErrores(p => ({ ...p, id_categoria: "" })); }}
        >
          <option value="">— Seleccionar —</option>
          {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
        </select>
        {errores.id_categoria && <p className="ms-form-error"><IconAlertTriangle /> {errores.id_categoria}</p>}
      </div>

      <div className="ms-form-group">
        <label className="ms-form-label">Precio (COP) <span className="ms-req">*</span></label>
        <input
          type="number" min={0}
          className={`ms-form-input${errores.precio ? " error" : ""}`}
          placeholder="0" value={form.precio}
          onChange={e => { setForm({ ...form, precio: e.target.value }); if (errores.precio) setErrores(p => ({ ...p, precio: "" })); }}
        />
        {errores.precio && <p className="ms-form-error"><IconAlertTriangle /> {errores.precio}</p>}
      </div>
    </div>
  );

  // ── Paso 3: Publicación ────────────────────────────────────────────────────
  const PasoEstado = (
    <div>
      <div className="ms-form-group">
        <label className="ms-form-label">Publicar en catálogo</label>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <input
            type="checkbox" id="publicado" checked={!!form.publicado}
            onChange={e => setForm({ ...form, publicado: e.target.checked })}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <label htmlFor="publicado" style={{ cursor: "pointer", fontSize: 13 }}>
            {form.publicado ? "Visible en catálogo" : "No publicado"}
          </label>
        </div>
      </div>
    </div>
  );

  const coloresPendientes = [...new Map(
    pendingVariantes.map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])
  ).values()];

  // ── Paso 4: Imágenes ───────────────────────────────────────────────────────
  const PasoImagenes = (
    <div>
      <GaleriaImagenes 
        tipoReferencia="Producto" 
        idReferencia={productoId} 
        onPendingChange={setPendingImagenes}
        coloresPendientes={coloresPendientes}
      />
    </div>
  );

  // ── Pasos detalle ──────────────────────────────────────────────────────────
  const p = verDetalle;

  const DetalleInfo = p && (
    <DetalleSeccion>
      <DetalleGrid>
        <DetalleItem label="ID"          value={`#${String(p.id_producto).padStart(3, "0")}`} />
        <DetalleItem label="Nombre"      value={p.nombre} />
        <DetalleItem label="Stock total" value={`${p.stock ?? 0} unidades`} />
        <DetalleItem label="Descripción" value={p.descripcion} full />
      </DetalleGrid>
      {/* Variantes en detalle */}
      {p.variantes?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--dvna-muted)", marginBottom: 8 }}>
            Variantes
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {p.variantes.map(v => (
              <div key={v.id_variante} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)",
                borderRadius: "var(--r)", padding: "4px 10px", fontSize: 11,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: v.codigo_hex || "#ccc", border: "1px solid rgba(0,0,0,0.1)", flexShrink: 0 }} />
                <span>{v.color_nombre}</span>
                <span style={{ color: "var(--dvna-muted)" }}>·</span>
                <span>{v.talla}</span>
                <span style={{ color: "var(--dvna-muted)" }}>·</span>
                <span style={{ fontWeight: 600 }}>{v.stock} uds</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DetalleSeccion>
  );

  const DetallePrecio = p && (
    <DetalleSeccion>
      <DetalleGrid>
        <DetalleItem label="Categoría" value={p.categoria} />
        <DetalleItem label="Precio"    value={fmt(p.precio)} />
      </DetalleGrid>
    </DetalleSeccion>
  );

  const DetalleEstado = p && (
    <DetalleSeccion>
      <DetalleGrid>
        <DetalleItem label="Estado"    value={p.estado} />
        <DetalleItem label="Publicado" value={p.publicado ? "Sí, visible en catálogo" : "No publicado"} />
      </DetalleGrid>
      <div style={{ marginTop: 16 }}>
        <GaleriaImagenes tipoReferencia="Producto" idReferencia={p.id_producto} soloLectura />
      </div>
    </DetalleSeccion>
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
        <div className="gestproductos-search-wrapper">
          <span className="gestproductos-search-icon"><IconSearch /></span>
          <input className="gestproductos-search-input" placeholder="Buscar por nombre o categoría..."
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className="gestproductos-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
        </div>
         <div>
        <button className="gestproductos-btn-primary" onClick={abrirRegistrar}><span>+</span> Nueva producto</button>
      </div>
      </div>
      <div className="gestproductos-results-count">
        {filtrados.length} producto{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
      </div>

      <div className="tbl-container">
        <table className="tbl">
          <thead className="tbl-header">
            <tr>
              <th className="tbl-th">ID</th>
              <th className="tbl-th">Producto</th>
              <th className="tbl-th">Categoría</th>
              <th className="tbl-th">Precio</th>
              <th className="tbl-th">Stock</th>
              <th className="tbl-th">Variantes</th>
              <th className="tbl-th">Publicado</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody className="tbl-body">
            {filtrados.length === 0 ? (
              <tr><td colSpan={9} className="gestproductos-empty-row">No se encontraron productos.</td></tr>
            ) : filtrados.map((p) => (
              <tr key={p.id_producto} className="tbl-row">
                <td className="tbl-td gestproductos-id-cell">#{String(p.id_producto).padStart(3, "0")}</td>
                <td className="tbl-td">
                  <div className="gestproductos-product-cell">
                    <div className="gestproductos-product-avatar">
                      {p.imagen_principal
                        ? <img src={p.imagen_principal} alt={p.nombre} />
                        : <IconShoppingBag />}
                    </div>
                    <div>
                      <div className="gestproductos-product-name">{p.nombre}</div>
                    </div>
                  </div>
                </td>
                <td className="tbl-td"><span className="gestproductos-categoria-badge">{p.categoria}</span></td>
                <td className="tbl-td gestproductos-precio-cell">{fmt(p.precio)}</td>
                <td className="tbl-td">{stockBadge(p.stock ?? 0)}</td>
                <td className="tbl-td">
                  {p.variantes?.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {p.variantes.map(v => (
                        <span key={v.id_variante} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 10, background: "var(--dvna-pale)",
                          border: "1px solid var(--dvna-border)",
                          borderRadius: "var(--r)", padding: "2px 7px",
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.codigo_hex || "#ccc", flexShrink: 0 }} />
                          {v.talla}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--dvna-muted)", fontStyle: "italic" }}>Sin variantes</span>
                  )}
                </td>
                <td className="tbl-td">
                  <button className={`gestproductos-toggle-publicado ${p.publicado ? "publicado" : "no-publicado"}`}
                    onClick={() => togglePublicado(p.id_producto)}>
                    {p.publicado ? "Sí" : "No"}
                  </button>
                </td>
                <td className="tbl-td">
                  <span className={`gestproductos-status-badge ${p.estado === "Activo" ? "active" : "inactive"}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="tbl-td">
                  <div className="gestproductos-action-cell">
                    <button className="gestproductos-action-btn gestproductos-view-btn" onClick={() => setVerDetalle(p)}><IconEye /></button>
                    <button className="gestproductos-action-btn gestproductos-edit-btn" onClick={() => abrirEditar(p)}><IconEdit /></button>
                    <button className="gestproductos-action-btn gestproductos-toggle-btn" onClick={() => cambiarEstado(p.id_producto)}>
                      {p.estado === "Activo" ? <IconBan /> : <IconCheck />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalSteps
          titulo={editar ? "Editar producto" : "Nuevo producto"}
          pasos={["Info y variantes", "Categoría y precio", "Publicación", "Imágenes"]}
          onClose={cerrarModal}
          onGuardar={guardar}
          labelGuardar={editar ? "Actualizar" : "Registrar"}
          guardando={guardando}
        >
          {PasoInfo}
          {PasoCategoria}
          {PasoEstado}
          {PasoImagenes}
        </ModalSteps>
      )}

      {verDetalle && (
        <ModalDetalle
          titulo="Detalle del producto"
          subtitulo={verDetalle.nombre}
          avatar={<IconShoppingBag />}
          avatarColor="var(--dvna-circle, #b49780)"
          badge={<span className={`gestproductos-status-badge ${verDetalle.estado === "Activo" ? "active" : "inactive"}`}>{verDetalle.estado}</span>}
          pasos={["Info y variantes", "Categoría y precio", "Estado e imágenes"]}
          onClose={() => setVerDetalle(null)}
          onEditar={() => { setVerDetalle(null); abrirEditar(verDetalle); }}
        >
          {DetalleInfo}
          {DetallePrecio}
          {DetalleEstado}
        </ModalDetalle>
      )}
    </div>
  );
}