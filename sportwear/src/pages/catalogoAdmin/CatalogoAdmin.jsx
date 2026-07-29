// src/pages/catalogoAdmin/CatalogoAdmin.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import ExportButtons from "../../components/ExportButtons";
import Loader from "../../components/Loader";
import { IconSearch, IconX, IconBox, IconEdit, IconEye, IconAlertTriangle } from "../../components/Icons";
import "./CatalogoAdmin.css";

const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
const PRODUCTOS_POR_PAGINA = 12;
const STOCK_REFERENCIA = 40; // referencia visual para la barra de stock (100% = "bien abastecido")

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.9 18.9 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.9 18.9 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconExternalLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
  </svg>
);
const IconTagPromo = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.17H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .66 1.41l9.59 9.59a2 2 0 0 0 2.83 0l5-5a2 2 0 0 0 0-2.83z"/>
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

export default function CatalogoAdmin() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const tienePerm = (p) => (usuario?.permisos || []).includes(p);

  const [productos, setProductos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const [busqueda, setBusqueda]           = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroEstado, setFiltroEstado]   = useState("todos"); // todos | publicados | ocultos | bajo_stock
  const [orden, setOrden]                 = useState("nombre"); // nombre | precio_asc | precio_desc | stock | recientes
  const [pagina, setPagina]               = useState(1);
  const [verRapido, setVerRapido]         = useState(null);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, c] = await Promise.all([api.get("/productos"), api.get("/categorias")]);
      setCategorias(c.data || []);
      const conImagen = await Promise.all(
        (p.data || []).map(async (prod) => {
          try {
            const { data: imgs } = await api.get(`/imagenes?tipo=Producto&id=${prod.id_producto}`);
            return { ...prod, imagenPrincipal: imgs.length > 0 ? imgs[0].url : null, imagenes: imgs };
          } catch { return { ...prod, imagenPrincipal: null, imagenes: [] }; }
        })
      );
      setProductos(conImagen);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, []);

  const togglePublicado = async (p) => {
    if (p.estado === "Inactivo") { showToast("error", "No se puede publicar un producto inactivo."); return; }
    try {
      await api.patch(`/productos/${p.id_producto}/publicar`);
      setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, publicado: !x.publicado } : x));
      if (verRapido?.id_producto === p.id_producto) setVerRapido(prev => ({ ...prev, publicado: !prev.publicado }));
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo cambiar la publicación.");
    }
  };

  const toggleEstado = async (p) => {
    try {
      await api.patch(`/productos/${p.id_producto}/estado`);
      const nuevoEstado = p.estado === "Activo" ? "Inactivo" : "Activo";
      setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, estado: nuevoEstado, publicado: nuevoEstado === "Inactivo" ? false : x.publicado } : x));
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  // ── CORREGIDO: antes "Nuevo" se calculaba automáticamente por fecha de
  // creación (últimos 7 días) — ahora usa el flag real "destacado" que el
  // Admin asigna a mano desde Gestión de Productos. ──

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = productos.length;
    const publicados = productos.filter(p => p.publicado).length;
    const bajoStock = productos.filter(p => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).length;
    const agotados = productos.filter(p => (p.stock ?? 0) === 0).length;
    return { total, publicados, bajoStock, agotados };
  }, [productos]);

  // ── Conteo por categoría (para los chips) ──
  const categoriaChips = useMemo(() => {
    const conteo = {};
    productos.forEach(p => { conteo[p.categoria] = (conteo[p.categoria] || 0) + 1; });
    return [
      { nombre: "Todas", total: productos.length },
      ...categorias.map(c => ({ nombre: c.nombre, total: conteo[c.nombre] || 0 })),
    ];
  }, [productos, categorias]);

  // ── Filtro + orden ──
  const filtrados = useMemo(() => {
    let lista = productos.filter(p => {
      const coincideBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria = filtroCategoria === "Todas" || p.categoria === filtroCategoria;
      const coincideEstado =
        filtroEstado === "todos" ? true :
        filtroEstado === "publicados" ? p.publicado :
        filtroEstado === "ocultos" ? !p.publicado :
        filtroEstado === "bajo_stock" ? (p.stock ?? 0) < 5 : true;
      return coincideBusqueda && coincideCategoria && coincideEstado;
    });

    lista = [...lista].sort((a, b) => {
      if (orden === "precio_asc")  return (a.precio ?? 0) - (b.precio ?? 0);
      if (orden === "precio_desc") return (b.precio ?? 0) - (a.precio ?? 0);
      if (orden === "stock")       return (a.stock ?? 0) - (b.stock ?? 0);
      if (orden === "recientes")   return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
      return (a.nombre || "").localeCompare(b.nombre || "");
    });

    return lista;
  }, [productos, busqueda, filtroCategoria, filtroEstado, orden]);

  const totalPaginas = Math.ceil(filtrados.length / PRODUCTOS_POR_PAGINA) || 1;
  const paginados = filtrados.slice((pagina - 1) * PRODUCTOS_POR_PAGINA, pagina * PRODUCTOS_POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda, filtroCategoria, filtroEstado, orden]);

  const hayFiltroActivo = busqueda.trim() !== "" || filtroCategoria !== "Todas" || filtroEstado !== "todos";
  const limpiarFiltros = () => { setBusqueda(""); setFiltroCategoria("Todas"); setFiltroEstado("todos"); };

  const stockPct = (stock) => Math.min(100, Math.round(((stock ?? 0) / STOCK_REFERENCIA) * 100));
  const stockClase = (stock) => stock === 0 ? "agotado" : stock < 5 ? "bajo" : stock < 15 ? "medio" : "alto";

  if (loading) return <Loader text="Cargando catálogo..." />;
  if (error) return <div className="catadmin-error-banner"><IconAlertTriangle /> {error}</div>;

  return (
    <div className="catadmin-container">
      {/* ── KPIs ── */}
      <div className="catadmin-kpi-grid">
        <div className="catadmin-kpi-card">
          <span className="catadmin-kpi-icon catadmin-kpi-icon-neutral"><IconLayers /></span>
          <div>
            <span className="catadmin-kpi-label">Productos totales</span>
            <span className="catadmin-kpi-value">{kpis.total}</span>
          </div>
        </div>
        <div className="catadmin-kpi-card">
          <span className="catadmin-kpi-icon catadmin-kpi-icon-success"><IconGlobe /></span>
          <div>
            <span className="catadmin-kpi-label">Publicados</span>
            <span className="catadmin-kpi-value">{kpis.publicados}</span>
          </div>
        </div>
        <div className="catadmin-kpi-card">
          <span className="catadmin-kpi-icon catadmin-kpi-icon-warning"><IconAlertTriangle /></span>
          <div>
            <span className="catadmin-kpi-label">Bajo stock</span>
            <span className="catadmin-kpi-value">{kpis.bajoStock}</span>
          </div>
        </div>
        <div className="catadmin-kpi-card">
          <span className="catadmin-kpi-icon catadmin-kpi-icon-danger"><IconEyeOff /></span>
          <div>
            <span className="catadmin-kpi-label">Agotados</span>
            <span className="catadmin-kpi-value">{kpis.agotados}</span>
          </div>
        </div>
      </div>

      {/* ── Chips de categoría con conteo ── */}
      <div className="catadmin-chips-row">
        {categoriaChips.map((c) => (
          <button
            key={c.nombre}
            className={`catadmin-chip${filtroCategoria === c.nombre ? " active" : ""}`}
            onClick={() => setFiltroCategoria(c.nombre)}
          >
            {c.nombre} <span className="catadmin-chip-count">{c.total}</span>
          </button>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="catadmin-filtros-bar">
        <div className="catadmin-search-wrapper">
          <span className="catadmin-search-icon"><IconSearch /></span>
          <input
            className="catadmin-search-input"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && <button className="catadmin-search-clear" onClick={() => setBusqueda("")}><IconX /></button>}
        </div>

        <div className="catadmin-estado-tabs">
          <button className={`catadmin-estado-tab${filtroEstado === "todos" ? " active" : ""}`} onClick={() => setFiltroEstado("todos")}>Todos</button>
          <button className={`catadmin-estado-tab${filtroEstado === "publicados" ? " active" : ""}`} onClick={() => setFiltroEstado("publicados")}>Publicados</button>
          <button className={`catadmin-estado-tab${filtroEstado === "ocultos" ? " active" : ""}`} onClick={() => setFiltroEstado("ocultos")}>Ocultos</button>
          <button className={`catadmin-estado-tab${filtroEstado === "bajo_stock" ? " active" : ""}`} onClick={() => setFiltroEstado("bajo_stock")}>Bajo stock</button>
        </div>

        <select className="catadmin-select catadmin-select-orden" value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="nombre">Nombre (A-Z)</option>
          <option value="recientes">Más recientes</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
          <option value="stock">Stock: menor primero</option>
        </select>

        <ExportButtons
          datos={filtrados}
          columnas={[
            { header: "Producto", key: "nombre" },
            { header: "Código", key: "codigo" },
            { header: "Categoría", key: "categoria" },
            { header: "Precio", key: "precio" },
            { header: "Stock", key: "stock" },
            { header: "Publicado", value: (p) => p.publicado ? "Sí" : "No" },
            { header: "Estado", key: "estado" },
          ]}
          nombreArchivo="catalogo"
          titulo="Catálogo"
        />

        {/* ── NUEVO: acceso directo a la tienda pública, para poder ver cómo
        quedan los cambios sin tener que salir del panel admin ni adivinar la URL. ── */}
        <a
          className="catadmin-btn-ver-tienda"
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconExternalLink /> Ver tienda pública
        </a>
      </div>

      <div className="catadmin-results-count">
        {`${filtrados.length} producto${filtrados.length !== 1 ? "s" : ""} ${hayFiltroActivo ? "encontrado" + (filtrados.length !== 1 ? "s" : "") : "en el catálogo"}`}
        {hayFiltroActivo && (
          <button className="catadmin-limpiar-filtros" onClick={limpiarFiltros}>Limpiar filtros</button>
        )}
      </div>

      {/* ── Vitrina ── */}
      {filtrados.length === 0 ? (
        <div className="catadmin-empty-state">
          <IconBox />
          <p>No hay productos que coincidan con estos filtros.</p>
        </div>
      ) : (
        <>
          <div className="catadmin-grid">
            {paginados.map((p) => (
              <div key={p.id_producto} className="catadmin-card">
                <div className="catadmin-card-img-wrap" onClick={() => setVerRapido(p)}>
                  {p.imagenPrincipal ? (
                    <img src={p.imagenPrincipal} alt={p.nombre} className="catadmin-card-img" />
                  ) : (
                    <div className="catadmin-card-img-placeholder"><IconBox /></div>
                  )}

                  <div className="catadmin-card-top-badges">
                    <span className={`catadmin-badge-pill${p.publicado ? " publicado" : ""}`}>
                      {p.publicado ? "Publicado" : "Oculto"}
                    </span>
                    {p.destacado === "Nuevo" && <span className="catadmin-badge-pill nuevo"><IconSparkle /> Nuevo</span>}
                    {p.destacado === "Promocion" && <span className="catadmin-badge-pill promo"><IconTagPromo /> Promoción</span>}
                    {p.estado === "Inactivo" && <span className="catadmin-badge-pill inactivo">Inactivo</span>}
                  </div>

                  {/* Overlay de acciones — aparece al hover */}
                  <div className="catadmin-card-overlay">
                    <button
                      className="catadmin-overlay-btn"
                      title="Vista rápida"
                      onClick={(e) => { e.stopPropagation(); setVerRapido(p); }}
                    >
                      <IconEye />
                    </button>
                    {tienePerm('Productos.editar') && (
                      <button
                        className="catadmin-overlay-btn"
                        title="Editar producto"
                        onClick={(e) => { e.stopPropagation(); navigate(`/productos?edit=${p.id_producto}`); }}
                      >
                        <IconEdit />
                      </button>
                    )}
                  </div>
                </div>

                <div className="catadmin-card-body">
                  <span className="catadmin-card-categoria">{p.categoria}</span>
                  <h3 className="catadmin-card-nombre" title={p.nombre}>{p.nombre}</h3>
                  <div className="catadmin-card-precio-row">
                    <span className="catadmin-card-precio">{fmt(p.precio)}</span>
                    <span className={`catadmin-card-stock-label ${stockClase(p.stock ?? 0)}`}>
                      {p.stock === 0 ? "Agotado" : `${p.stock ?? 0} uds`}
                    </span>
                  </div>
                  <div className="catadmin-stock-bar-track">
                    <div className={`catadmin-stock-bar-fill ${stockClase(p.stock ?? 0)}`} style={{ width: `${stockPct(p.stock ?? 0)}%` }} />
                  </div>
                </div>

                <div className="catadmin-card-footer">
                  {tienePerm('Productos.publicar') && (
                    <label className={`catadmin-switch${p.estado === "Inactivo" ? " disabled" : ""}`} title={p.estado === "Inactivo" ? "No se puede publicar un producto inactivo" : "Publicar / ocultar del catálogo"}>
                      <input
                        type="checkbox"
                        checked={!!p.publicado}
                        disabled={p.estado === "Inactivo"}
                        onChange={() => togglePublicado(p)}
                      />
                      <span className="catadmin-switch-track"><span className="catadmin-switch-thumb" /></span>
                      <span className="catadmin-switch-label">{p.publicado ? "Publicado" : "Oculto"}</span>
                    </label>
                  )}
                  {tienePerm('Productos.estado') && (
                    <button
                      className={`catadmin-footer-estado${p.estado === "Activo" ? " activo" : " inactivo"}`}
                      onClick={() => toggleEstado(p)}
                    >
                      {p.estado}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="paginador">
              <button className="paginador-btn" onClick={() => setPagina(p => Math.max(p - 1, 1))} disabled={pagina === 1}>‹</button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                <button key={n} className={`paginador-btn ${n === pagina ? "paginador-btn-active" : ""}`} onClick={() => setPagina(n)}>{n}</button>
              ))}
              <button className="paginador-btn" onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))} disabled={pagina === totalPaginas}>›</button>
              <span className="paginador-info">Página {pagina} de {totalPaginas} · {filtrados.length} productos</span>
            </div>
          )}
        </>
      )}

      {/* ── Modal de vista rápida ── */}
      {verRapido && (
        <div className="catadmin-modal-overlay" onClick={() => setVerRapido(null)}>
          <div className="catadmin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="catadmin-modal-close" onClick={() => setVerRapido(null)}><IconX /></button>

            <div className="catadmin-modal-img-wrap">
              {verRapido.imagenPrincipal ? (
                <img src={verRapido.imagenPrincipal} alt={verRapido.nombre} className="catadmin-modal-img" />
              ) : (
                <div className="catadmin-modal-img-placeholder"><IconBox /></div>
              )}
            </div>

            <div className="catadmin-modal-body">
              <span className="catadmin-card-categoria">{verRapido.categoria}</span>
              <h2 className="catadmin-modal-nombre">{verRapido.nombre}</h2>
              {verRapido.descripcion && <p className="catadmin-modal-descripcion">{verRapido.descripcion}</p>}

              <div className="catadmin-modal-info-grid">
                <div><span className="catadmin-modal-info-label">Código</span><span className="catadmin-modal-info-valor">{verRapido.codigo || "—"}</span></div>
                <div><span className="catadmin-modal-info-label">Precio</span><span className="catadmin-modal-info-valor">{fmt(verRapido.precio)}</span></div>
                <div><span className="catadmin-modal-info-label">Stock total</span><span className="catadmin-modal-info-valor">{verRapido.stock ?? 0} unidades</span></div>
                <div><span className="catadmin-modal-info-label">Estado</span><span className={`catadmin-modal-info-valor ${verRapido.estado === "Activo" ? "activo" : "inactivo-txt"}`}>{verRapido.estado}</span></div>
              </div>

              {verRapido.variantes?.length > 0 && (
                <div className="catadmin-modal-seccion">
                  <h4 className="catadmin-modal-seccion-titulo">Variantes</h4>
                  <div className="catadmin-modal-variantes">
                    {verRapido.variantes.map(v => (
                      <div key={v.id_variante} className="catadmin-modal-variante-item">
                        <span className="catadmin-modal-variante-dot" style={{ background: v.codigo_hex || "#ccc" }} />
                        <span>{v.color_nombre} · {v.talla}</span>
                        <span className="catadmin-modal-variante-stock">{v.stock} uds</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="catadmin-modal-footer">
                <a
                  className="catadmin-modal-link-tienda"
                  href={`/catalogo/${verRapido.id_producto}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver en la tienda <IconExternalLink />
                </a>
                {tienePerm('Productos.editar') && (
                  <button
                    className="catadmin-modal-btn-editar"
                    onClick={() => navigate(`/productos?edit=${verRapido.id_producto}`)}
                  >
                    <IconEdit /> Editar producto
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}