// src/pages/catalogo/DetalleProducto.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import api from "../../services/api";
import "./DetalleProducto.css";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

const IconArrowLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);
const IconCart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
  </svg>
);
const IconTagPromo = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41L11 3.83A2 2 0 0 0 9.59 3.17H4a1 1 0 0 0-1 1v5.59a2 2 0 0 0 .66 1.41l9.59 9.59a2 2 0 0 0 2.83 0l5-5a2 2 0 0 0 0-2.83z"/>
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────
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

export default function DetalleProducto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { usuario } = useAuth();
  const { agregarItem } = useCart();

  const [producto,  setProducto]  = useState(null);
  const [imgsData,  setImgsData]  = useState([]);
  const [variantes, setVariantes] = useState([]);
  const [imgActiva, setImgActiva] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [agregado,  setAgregado]  = useState(false);
  const [preview,   setPreview]   = useState(false);
  const [cantidad,  setCantidad]  = useState(1);

  const [colorSel, setColorSel] = useState(null);
  const [tallaSel, setTallaSel] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await api.get("/productos?publicado=1");
        const prod = data.find(p => String(p.id_producto) === String(id));
        if (!prod) { setError("Producto no encontrado."); return; }
        setProducto(prod);

        const [imgRes, varRes] = await Promise.all([
          api.get(`/imagenes?tipo=Producto&id=${id}`),
          api.get(`/variantes?id_producto=${id}`),
        ]);

        const imgs = imgRes.data.length > 0
          ? imgRes.data
          : prod.imagen_principal
            ? [{ url: prod.imagen_principal, id_color: null }]
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
        setError("No se pudo cargar el producto.");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  // ── Derivados ─────────────────────────────────────────────────
  const colores       = extraerColores(variantes);
  const tallas        = colorSel ? tallasDeColor(variantes, colorSel.id_color) : [];
  const imgUrls       = filtrarImagenes(imgsData, colorSel?.id_color ?? null);
  const total         = imgUrls.length;
  const varianteSel   = variantes.find(v => v.id_color === colorSel?.id_color && v.talla === tallaSel);
  const stockMostrado = varianteSel?.stock ?? producto?.stock ?? 0;
  const agotado       = stockMostrado === 0;
  const sinSeleccion  = variantes.length > 0 && (!colorSel || !tallaSel);

  // ── Handlers ──────────────────────────────────────────────────
  const handleColorClick = (color) => {
    setColorSel(color);
    setImgActiva(0);
    const ts = tallasDeColor(variantes, color.id_color);
    setTallaSel(ts[0] ?? null);
    setCantidad(1);
  };

  const handleTallaClick = (t) => {
    setTallaSel(t);
    setCantidad(1);
  };

  const decrementar = () => setCantidad(c => Math.max(1, c - 1));
  const incrementar = () => setCantidad(c => Math.min(stockMostrado, c + 1));

  const prev = () => setImgActiva(i => (i - 1 + total) % total);
  const next = () => setImgActiva(i => (i + 1) % total);

  useEffect(() => {
    const onKey = (e) => {
      if (preview) { if (e.key === "Escape") setPreview(false); return; }
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, preview]);

  const handleAgregar = () => {
    if (!usuario) { navigate("/login"); return; }

    if (!colorSel || !tallaSel) {
      setError("Por favor selecciona color y talla");
      return;
    }

    agregarItem({
      id:          producto.id_producto,
      id_variante: varianteSel?.id_variante ?? null, // ✅ campo clave para el stock
      nombre:      producto.nombre,
      precio:      producto.precio,
      imagen:      imgUrls[0] ?? producto.imagen_principal,
      categoria:   producto.categoria,
      talla:       tallaSel,
      color:       colorSel?.nombre,
      stock:       stockMostrado,
      cantidad:    cantidad,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  };

  if (loading) return (
    <div className="dp-loading">
      <div className="dp-spinner" />
      <span>Cargando producto...</span>
    </div>
  );

  if (error) return (
    <div className="dp-error">
      <p>{error}</p>
      <button onClick={() => navigate("/catalogo")}>← Volver al catálogo</button>
    </div>
  );

  return (
    <div className="dp-page">

      <button className="dp-back" onClick={() => navigate("/catalogo")}>
        <IconArrowLeft /> Volver al catálogo
      </button>

      <div className="dp-layout">

        {/* ── Galería ── */}
        <div className="dp-gallery">
          {total > 1 && (
            <div className="dp-thumbs">
              {imgUrls.map((url, i) => (
                <button
                  key={i}
                  className={`dp-thumb${i === imgActiva ? " active" : ""}`}
                  onClick={() => setImgActiva(i)}
                >
                  <img src={url} alt={`Vista ${i + 1}`} />
                </button>
              ))}
            </div>
          )}

          <div className="dp-main-img-wrap">
            {total > 0 ? (
              <>
                <img
                  className="dp-main-img"
                  src={imgUrls[imgActiva]}
                  alt={producto.nombre}
                  onClick={() => setPreview(true)}
                  style={{ cursor: "zoom-in" }}
                />

                {total > 1 && (
                  <>
                    <button className="dp-arrow dp-arrow-left" onClick={prev}>
                      <IconChevronLeft />
                    </button>
                    <button className="dp-arrow dp-arrow-right" onClick={next}>
                      <IconChevronRight />
                    </button>
                    <div className="dp-img-dots">
                      {imgUrls.map((_, i) => (
                        <button
                          key={i}
                          className={`dp-img-dot${i === imgActiva ? " active" : ""}`}
                          onClick={() => setImgActiva(i)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {producto.destacado === "Nuevo" && <span className="dp-badge dp-badge-nuevo"><IconSparkle /> Nuevo</span>}
                {producto.destacado === "Promocion" && <span className="dp-badge dp-badge-promo"><IconTagPromo /> Promoción</span>}
                {agotado && !sinSeleccion && (
                  <span className="dp-badge dp-badge-out" style={producto.destacado ? { top: 42 } : undefined}>Agotado</span>
                )}
                {!agotado && !sinSeleccion && stockMostrado < 5 && (
                  <span className="dp-badge dp-badge-warn" style={producto.destacado ? { top: 42 } : undefined}>Pocas unidades</span>
                )}
              </>
            ) : (
              <div className="dp-no-img">Sin imagen</div>
            )}
          </div>
        </div>

        {/* ── Info ── */}
        <div className="dp-info">
          <p className="dp-brand">SPORTWEAR</p>
          <h1 className="dp-nombre">{producto.nombre}</h1>

          {(colores.length > 0 || tallas.length > 0) && (
            <div className="dp-variant-line">
              {colores.length > 0 && (
                <div className="dp-colores">
                  <span className="dp-attr-label">
                    Color: <span className="dp-attr-val">{colorSel?.nombre ?? "—"}</span>
                  </span>
                  <div className="dp-color-chips-row">
                    {colores.map(c => (
                      <button
                        key={c.id_color}
                        title={c.nombre}
                        className={`dp-color-chip-btn${colorSel?.id_color === c.id_color ? " selected" : ""}`}
                        style={{ background: c.codigo_hex || "#ccc" }}
                        onClick={() => handleColorClick(c)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {tallas.length > 0 && (
                <div className="dp-tallas">
                  <span className="dp-attr-label">Talla:</span>
                  <div className="dp-talla-chips-row">
                    {tallas.map(t => {
                      const varT     = variantes.find(v => v.id_color === colorSel?.id_color && v.talla === t);
                      const sinStock = varT?.stock === 0;
                      return (
                        <button
                          key={t}
                          className={`dp-talla-chip${tallaSel === t ? " selected" : ""}${sinStock ? " agotada" : ""}`}
                          onClick={() => !sinStock && handleTallaClick(t)}
                          title={sinStock ? "Agotada" : t}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="dp-precio-wrap">
            <span className="dp-precio">{fmt(producto.precio)}</span>
          </div>

          <div className="dp-stock-row">
            {sinSeleccion
              ? <span className="dp-stock-out" style={{ fontStyle: "italic" }}>Selecciona color y talla</span>
              : agotado
                ? <span className="dp-stock-out">Sin stock disponible</span>
                : stockMostrado < 5
                  ? <span className="dp-stock-low">Solo quedan {stockMostrado} unidades</span>
                  : <span className="dp-stock-ok">Stock disponible: {stockMostrado} unidades</span>
            }
          </div>

          {!agotado && !sinSeleccion && (
            <div className="dp-cantidad-row">
              <span className="dp-cantidad-label">Cantidad:</span>
              <div className="dp-cantidad-controls">
                <button className="dp-cantidad-btn" onClick={decrementar} disabled={cantidad <= 1}>
                  <IconMinus />
                </button>
                <span className="dp-cantidad-value">{cantidad}</span>
                <button className="dp-cantidad-btn" onClick={incrementar} disabled={cantidad >= stockMostrado}>
                  <IconPlus />
                </button>
              </div>
            </div>
          )}

          <button
            className={`dp-btn-agregar${agregado ? " agregado" : ""}${(agotado || sinSeleccion) ? " disabled" : ""}`}
            onClick={handleAgregar}
            disabled={agotado || sinSeleccion}
          >
            {agregado
              ? <><IconCheck /> ¡Agregado al carrito!</>
              : agotado
                ? "Agotado"
                : sinSeleccion
                  ? "Selecciona color y talla"
                  : <><IconCart /> Agregar al carrito</>
            }
          </button>

          <div className="dp-divider" />

          <div className="dp-detalles">
            {producto.descripcion && (
              <div className="dp-detalle-row">
                <span className="dp-detalle-label">Descripción</span>
                <span className="dp-detalle-val">{producto.descripcion}</span>
              </div>
            )}
            <div className="dp-detalle-row">
              <span className="dp-detalle-label">Categoría</span>
              <span className="dp-detalle-val">{producto.categoria || "—"}</span>
            </div>
            <div className="dp-detalle-row">
              <span className="dp-detalle-label">Referencia</span>
              <span className="dp-detalle-val">#{String(producto.id_producto).padStart(6, "0")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Preview / zoom ── */}
      {preview && (
        <div className="dp-preview-overlay" onClick={() => setPreview(false)}>
          <button className="dp-preview-close" onClick={() => setPreview(false)}>
            <IconX />
          </button>
          {total > 1 && (
            <>
              <button className="dp-preview-arrow dp-preview-arrow-left"
                onClick={(e) => { e.stopPropagation(); prev(); }}>
                <IconChevronLeft />
              </button>
              <button className="dp-preview-arrow dp-preview-arrow-right"
                onClick={(e) => { e.stopPropagation(); next(); }}>
                <IconChevronRight />
              </button>
            </>
          )}
          <img
            className="dp-preview-img"
            src={imgUrls[imgActiva]}
            alt="Vista ampliada"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}