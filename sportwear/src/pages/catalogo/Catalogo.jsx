// src/pages/catalogo/Catalogo.jsx
import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../services/api";
import "./Catalogo.css";
import { IconBox, IconSearch } from "../../components/Icons";

const IconGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);
const IconList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

const IconMinus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const ICONO_CAT = () => <IconBox />;
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconWhatsApp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const IconInstagram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const IconCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

// ── Helpers compartidos ───────────────────────────────────────
const extraerColores = (vars) => [
  ...new Map(
    (vars || [])
      .filter(v => v.id_color && v.color_nombre)
      .map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre, codigo_hex: v.codigo_hex }])
  ).values(),
];

const tallasDeColor = (vars, id_color) =>
  [...new Set(
    (vars || [])
      .filter(v => v.id_color === id_color)
      .map(v => v.talla)
      .filter(Boolean)
  )];

const filtrarImagenes = (imgs, id_color) => {
  if (!imgs?.length) return [];
  if (!id_color) return imgs.map(i => i.url ?? i);
  const delColor  = imgs.filter(i => i.id_color === id_color);
  if (delColor.length > 0) return delColor.map(i => i.url);
  const generales = imgs.filter(i => !i.id_color);
  return (generales.length > 0 ? generales : imgs).map(i => i.url ?? i);
};

// ── Tarjeta ───────────────────────────────────────────────────
function ProductCard({ p, onTogglePublicado, esAdmin }) {
  const navigate = useNavigate();
  const { agregarAlCarrito } = useCart();
  const { usuario } = useAuth();

  const [imgsData,  setImgsData]  = useState(null);
  const [variantes, setVariantes] = useState(null);
  const [cargando,  setCargando]  = useState(false);
  const [imgIdx,    setImgIdx]    = useState(0);
  const [colorSel,  setColorSel]  = useState(null);
  const [tallaSel,  setTallaSel]  = useState(null);
  const [cantidad,  setCantidad]  = useState(1);
  const [agregado,  setAgregado]  = useState(false);

  const stock   = p.stock ?? 0;
  const agotado = stock === 0;

  const cargarDatos = async () => {
    if ((imgsData !== null && variantes !== null) || cargando) return;
    setCargando(true);
    try {
      const [imgRes, varRes] = await Promise.all([
        api.get(`/imagenes?tipo=Producto&id=${p.id_producto}`),
        api.get(`/variantes?id_producto=${p.id_producto}`),
      ]);

      const imgs = imgRes.data.length > 0
        ? imgRes.data
        : p.imagen_principal
          ? [{ url: p.imagen_principal, id_color: null }]
          : [];
      setImgsData(imgs);

      const vars = varRes.data || [];
      setVariantes(vars);

      const colores = extraerColores(vars);
      if (colores.length > 0) {
        setColorSel(colores[0]);
        const ts = tallasDeColor(vars, colores[0].id_color);
        if (ts.length > 0) setTallaSel(ts[0]);
      }
    } catch {
      setImgsData(p.imagen_principal ? [{ url: p.imagen_principal, id_color: null }] : []);
      setVariantes([]);
    } finally {
      setCargando(false);
    }
  };

  const rawImgs = imgsData ?? (p.imagen_principal ? [{ url: p.imagen_principal, id_color: null }] : []);
  const imgs    = filtrarImagenes(rawImgs, colorSel?.id_color ?? null);
  const total   = imgs.length;

  const prev = (e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + total) % total); };
  const next = (e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % total); };

  const colores = extraerColores(variantes || []);
  const tallas  = colorSel ? tallasDeColor(variantes || [], colorSel.id_color) : [];

  const handleColorClick = (e, color) => {
    e.stopPropagation();
    setColorSel(color);
    setImgIdx(0);
    const ts = tallasDeColor(variantes || [], color.id_color);
    setTallaSel(ts[0] ?? null);
    setCantidad(1);
  };

  const handleTallaClick = (e, talla) => { e.stopPropagation(); setTallaSel(talla); setCantidad(1); };

  const decrementar = (e) => { e.stopPropagation(); setCantidad(c => Math.max(1, c - 1)); };
  const incrementar = (e) => { e.stopPropagation(); setCantidad(c => Math.min(stock, c + 1)); };

  const varianteSel = variantes?.find(v => v.id_color === colorSel?.id_color && v.talla === tallaSel);
  const stockColorTalla = varianteSel?.stock ?? stock;

  return (
    <div className="catalog-card" onMouseEnter={cargarDatos}>
      <div
        className="catalog-card-img"
        onClick={() => navigate(`/catalogo/${p.id_producto}`)}
        style={{ cursor: "pointer" }}
      >
        {imgs.length > 0 ? (
          <img
            src={imgs[imgIdx]}
            alt={p.nombre}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <span style={{ fontSize: 52 }}><ICONO_CAT /></span>
        )}

        {total > 1 && (
          <>
            <button className="catalog-arrow catalog-arrow-left"  onClick={prev}><IconChevronLeft /></button>
            <button className="catalog-arrow catalog-arrow-right" onClick={next}><IconChevronRight /></button>
            <div className="catalog-dots">
              {imgs.map((_, i) => (
                <span
                  key={i}
                  className={`catalog-dot${i === imgIdx ? " active" : ""}`}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                />
              ))}
            </div>
          </>
        )}

        {agotado && <span className="catalog-card-badge badge badge-inactive">Agotado</span>}
        {esAdmin && p.estado !== "Activo" && (
          <span className="catalog-card-badge badge badge-inactive" style={{ top: 36 }}>Inactivo</span>
        )}
      </div>

      <div className="catalog-card-body">
        <div className="catalog-card-cat">{p.categoria}</div>
        <div className="catalog-card-name">{p.nombre}</div>

        {p.descripcion && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>
            {p.descripcion.length > 70 ? p.descripcion.slice(0, 70) + "…" : p.descripcion}
          </div>
        )}

        {(colores.length > 0 || tallas.length > 0) && (
          <div className="catalog-variant-line">
{colores.length > 0 && (
  <div className="catalog-colores">
    {colores.map(c => (
      <button
        key={c.id_color}
        className={`catalog-color-dot${colorSel?.id_color === c.id_color ? " selected" : ""}`}
        style={{ background: c.codigo_hex || "#ccc" }}
        onClick={(e) => handleColorClick(e, c)}
      />
    ))}
  </div>
)}

            {tallas.length > 0 && (
              <div className="catalog-tallas">
                {tallas.map(t => (
                  <button
                    key={t}
                    className={`catalog-talla-chip${tallaSel === t ? " selected" : ""}`}
                    onClick={(e) => handleTallaClick(e, t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="catalog-card-footer">
          <div className="catalog-card-price">{fmt(p.precio)}</div>
          {!agotado && !esAdmin && (
            <div className="catalog-qty-wrap" onClick={(e) => e.stopPropagation()}>
              <button className="catalog-qty-btn" onClick={decrementar} disabled={cantidad <= 1}>
                <IconMinus />
              </button>
              <span className="catalog-qty-value">{cantidad}</span>
              <button className="catalog-qty-btn" onClick={incrementar} disabled={cantidad >= stockColorTalla}>
                <IconPlus />
              </button>
              <button
                className={`btn btn-sm btn-primary ${agregado ? "btn-success" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!usuario) { navigate("/login"); return; }
                  if (!colorSel || !tallaSel) {
                    alert("Por favor selecciona color y talla");
                    return;
                  }
                  agregarAlCarrito({
                    id: p.id_producto,
                    id_variante: varianteSel?.id_variante ?? null,
                    nombre: p.nombre,
                    precio: p.precio,
                    imagen: p.imagen_principal,
                    categoria: p.categoria,
                    talla: tallaSel,
                    color: colorSel?.nombre,
                    stock: stockColorTalla,
                    cantidad,
                  });
                  setAgregado(true);
                  setTimeout(() => setAgregado(false), 1500);
                }}
              >
                {agregado ? <IconCheck /> : <IconCart />}
              </button>
            </div>
          )}
          {esAdmin && (
            <button
              className={`btn btn-sm ${p.publicado ? "btn-warning" : "btn-success"}`}
              onClick={(e) => { e.stopPropagation(); onTogglePublicado(p); }}
            >
              {p.publicado ? "Despublicar" : "Publicar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function Catalogo() {
  const { usuario } = useAuth();
  const esAdmin     = usuario?.rol === "Administrador" || usuario?.rol === "Admin";
  const { busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, setCategorias } = useOutletContext();

  const [datos,   setDatos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [vista,        setVista]        = useState("grid"); // 'grid' | 'list'
  const [precioMin,     setPrecioMin]     = useState("");
  const [precioMax,     setPrecioMax]     = useState("");
  const [filtroTalla,   setFiltroTalla]   = useState("");
  const [filtroColor,   setFiltroColor]   = useState("");

  const cargar = async () => {
    try {
      const { data } = await api.get("/productos?publicado=1");
      setDatos(esAdmin
        ? data.filter(p => p.publicado)
        : data.filter(p => p.publicado && p.estado === "Activo")
      );
    } catch {
      setError("No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [esAdmin]);
  useEffect(() => {
    const categorias = ["Todos", ...new Set(datos.map(p => p.categoria).filter(Boolean))];
    setCategorias(categorias);
  }, [datos, setCategorias]);

  const tallasDisponibles = [...new Set(
    datos.flatMap(p => (p.variantes || []).map(v => v.talla)).filter(Boolean)
  )].sort();
  const coloresDisponibles = [...new Map(
    datos.flatMap(p => (p.variantes || []))
      .filter(v => v.id_color && v.color_nombre)
      .map(v => [v.id_color, { id_color: v.id_color, nombre: v.color_nombre }])
  ).values()];

  const filtrados = datos.filter((p) => {
    const matchBusqueda  = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
      || p.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = filtroCategoria === "Todos" || p.categoria === filtroCategoria;
    const matchPrecioMin = !precioMin || Number(p.precio) >= Number(precioMin);
    const matchPrecioMax = !precioMax || Number(p.precio) <= Number(precioMax);
    const matchTalla     = !filtroTalla || (p.variantes || []).some(v => v.talla === filtroTalla);
    const matchColor      = !filtroColor || (p.variantes || []).some(v => String(v.id_color) === filtroColor);
    return matchBusqueda && matchCategoria && matchPrecioMin && matchPrecioMax && matchTalla && matchColor;
  });

  const hayFiltroAvanzado = precioMin || precioMax || filtroTalla || filtroColor;

  const handleTogglePublicado = async (p) => {
    try {
      await api.patch(`/productos/${p.id_producto}/publicar`);
      cargar();
    } catch {
      alert("Error al cambiar estado de publicación.");
    }
  };

  if (loading) return (
    <div style={{ padding: 48, display: "flex", gap: 12, alignItems: "center", color: "var(--muted)" }}>
      <div className="loading-ring" />
      <span className="loading-label">Cargando catálogo...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, color: "var(--danger)", background: "var(--danger-bg)",
                  borderRadius: "var(--r-md)", border: "1px solid #e2c4c4" }}>
      {error}
    </div>
  );

  const hayFiltroActivo = busqueda.trim() !== "" || filtroCategoria !== "Todos" || hayFiltroAvanzado;

  const limpiarFiltros = () => {
    if (setBusqueda && setFiltroCategoria) {
      setBusqueda("");
      setFiltroCategoria("Todos");
    }
    setPrecioMin("");
    setPrecioMax("");
    setFiltroTalla("");
    setFiltroColor("");
  };

  return (
    <>
      {/* ── Hero ── */}
      {!hayFiltroActivo && (
        <div className="nov-hero-wrapper">
          <section className="nov-hero">
            <div className="nov-hero-bg" aria-hidden="true">
              <div className="nov-hero-circle c1" />
              <div className="nov-hero-circle c2" />
              <div className="nov-hero-circle c3" />
            </div>

            <div className="nov-hero-content">
              <span className="sn-eyebrow">DVNA 2026</span>
              <h1 className="nov-hero-title">
                Lo nuevo de<br /><em>DVNA</em>
              </h1>
              <p className="nov-hero-sub">
                Ropa deportiva femenina diseñada para tu estilo y comodidad.<br />
                Calidad, tendencia y confianza en cada prenda.
              </p>
            </div>

            <div className="nov-hero-strip">
              <div className="nov-strip-item">
                <span className="nov-strip-num">2026</span>
                <span className="nov-stat-label">Control</span>
              </div>
              <div className="nov-strip-sep" />
              <div className="nov-strip-item">
                <span className="nov-strip-num">+500</span>
                <span className="nov-stat-label">Productos</span>
              </div>
              <div className="nov-strip-sep" />
              <div className="nov-strip-item">
                <span className="nov-strip-num">100%</span>
                <span className="nov-stat-label">Calidad</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── Catálogo ── */}
      <div className="Catalogo-enter">
        <div className="catalog-toolbar">
          <div className="catalog-toolbar-group">
            <label>Precio</label>
            <input type="number" min="0" placeholder="Mín" value={precioMin} onChange={(e) => setPrecioMin(e.target.value)} />
            <span>–</span>
            <input type="number" min="0" placeholder="Máx" value={precioMax} onChange={(e) => setPrecioMax(e.target.value)} />
          </div>
          {tallasDisponibles.length > 0 && (
            <div className="catalog-toolbar-group">
              <label>Talla</label>
              <select value={filtroTalla} onChange={(e) => setFiltroTalla(e.target.value)}>
                <option value="">Todas</option>
                {tallasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {coloresDisponibles.length > 0 && (
            <div className="catalog-toolbar-group">
              <label>Color</label>
              <select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}>
                <option value="">Todos</option>
                {coloresDisponibles.map(c => <option key={c.id_color} value={String(c.id_color)}>{c.nombre}</option>)}
              </select>
            </div>
          )}
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {filtrados.length} producto{filtrados.length !== 1 ? "s" : ""}
          </span>
          <div className="catalog-view-toggle">
            <button className={vista === "grid" ? "active" : ""} onClick={() => setVista("grid")} title="Vista de cuadrícula">
              <IconGrid />
            </button>
            <button className={vista === "list" ? "active" : ""} onClick={() => setVista("list")} title="Vista de lista">
              <IconList />
            </button>
          </div>
        </div>

        {filtrados.length === 0 && hayFiltroActivo && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><IconSearch /></div>
            <p>No hay productos que coincidan con tu búsqueda.</p>
            <button className="btn btn-secondary btn-sm" onClick={limpiarFiltros} style={{ marginTop: 16 }}>
              Ver todos los productos
            </button>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className={`catalog-grid${vista === "list" ? " list-view" : ""}`}>
            {filtrados.map((p) => (
              <ProductCard
                key={p.id_producto}
                p={p}
                esAdmin={esAdmin}
                onTogglePublicado={handleTogglePublicado}
              />
            ))}
          </div>
        )}

        {!hayFiltroActivo && (
          <footer className="catalog-footer">
            <div className="catalog-footer-content">
              <div className="catalog-footer-brand">
                <span className="catalog-footer-logo">SPORTWEAR</span>
                <p className="catalog-footer-desc">Moda deportiva para mujer. Confianza y estilo en cada detalle.</p>
              </div>
              <div className="catalog-footer-links">
                <a href="https://wa.link/ts1wmb" target="_blank" rel="noopener noreferrer" className="catalog-footer-link whatsapp">
                  <IconWhatsApp />
                  <span>WhatsApp</span>
                </a>
                <a href="https://www.instagram.com/dvna.co/?hl=es" target="_blank" rel="noopener noreferrer" className="catalog-footer-link instagram">
                  <IconInstagram />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
            <div className="catalog-footer-copy">
              &copy; {new Date().getFullYear()} Sportwear. Todos los derechos reservados.
            </div>
          </footer>
        )}
      </div>
    </>
  );
}