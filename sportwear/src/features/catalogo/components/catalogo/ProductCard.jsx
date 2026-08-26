import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../../../shared/contexts/CartContext";
import { useToast } from "../../../../shared/contexts/ToastContext";
import api from "../../../../shared/services/api";
import { fmt, extraerColores, tallasDeColor, filtrarImagenes } from "../../utils/catalogoHelpers";
import {
  IconMinus, IconPlus, ICONO_CAT, IconCheck, IconSparkle, IconTagPromo,
  IconAgotado, IconOjoTachado, IconCart, IconChevronLeft, IconChevronRight,
} from "./catalogoIcons";

export default function ProductCard({ p, onTogglePublicado, esAdmin }) {
  const navigate = useNavigate();
  const { agregarAlCarrito } = useCart();
  const showToast = useToast();

  const [imgsData,  setImgsData]  = useState(null);
  const [variantes, setVariantes] = useState(null);
  const [cargando,  setCargando]  = useState(false);
  const [imgIdx,    setImgIdx]    = useState(0);
  const [colorSel,  setColorSel]  = useState(null);
  const [tallaSel,  setTallaSel]  = useState(null);
  const [cantidad,  setCantidad]  = useState(1);
  const [agregado,  setAgregado]  = useState(false);

  // ── CORREGIDO: "stock" viene de un SUM() en Postgres, que la librería pg
  // entrega como texto ("0"), no como número — la comparación estricta
  // "stock === 0" nunca coincidía, así que "Agotado" jamás se activaba. ──
  const stock   = Number(p.stock ?? 0);
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
  const stockColorTalla = Number(varianteSel?.stock ?? stock);

  // ── NUEVO: cada variante puede tener su propio precio. Antes de elegir
  // color/talla, si todas las variantes valen lo mismo se muestra un solo
  // precio (igual que siempre); si varían, se muestra un rango "Desde $X".
  // En cuanto se elige una variante puntual, se muestra su precio exacto. ──
  const precioMinNum = Number(p.precio_min ?? p.precio ?? 0);
  const precioMaxNum = Number(p.precio_max ?? p.precio ?? 0);
  const hayRangoPrecio = precioMaxNum > precioMinNum;
  const precioVarianteSel = varianteSel ? Number(varianteSel.precio ?? p.precio ?? 0) : null;

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

        {/* ── NUEVO: badges apiladas — Destacado (Nuevo/Promoción) primero, luego Agotado/Inactivo ── */}
        {(() => {
          const badges = [];
          if (p.destacado === "Nuevo") badges.push({ key: "nuevo", texto: "Nuevo", clase: "badge-nuevo", icono: <IconSparkle /> });
          if (p.destacado === "Promocion") badges.push({ key: "promo", texto: "Promoción", clase: "badge-promo", icono: <IconTagPromo /> });
          if (agotado) badges.push({ key: "agotado", texto: "Agotado", clase: "badge-agotado", icono: <IconAgotado /> });
          if (esAdmin && p.estado !== "Activo") badges.push({ key: "inactivo", texto: "Inactivo", clase: "badge-admin-inactivo", icono: <IconOjoTachado /> });
          return badges.map((b, i) => (
            <span key={b.key} className={`catalog-card-badge ${b.clase}`} style={{ top: 12 + i * 26 }}>
              {b.icono}{b.texto}
            </span>
          ));
        })()}
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
          <div className="catalog-card-price">
            {precioVarianteSel !== null
              ? fmt(precioVarianteSel)
              : hayRangoPrecio
                ? <><span className="catalog-card-price-desde">Desde</span> {fmt(precioMinNum)}</>
                : fmt(precioMinNum)}
          </div>
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
                  // ── CORREGIDO: ya no exige sesión para agregar al carrito
                  // desde las cards — el carrito acepta productos sin login
                  // (se guardan en localStorage de forma anónima). El login
                  // solo se pide al hacer clic en "Finalizar compra". ──
                  if (!colorSel || !tallaSel) {
                    showToast("error", "Por favor selecciona color y talla");
                    return;
                  }
                  agregarAlCarrito({
                    id: p.id_producto,
                    id_variante: varianteSel?.id_variante ?? null,
                    nombre: p.nombre,
                    precio: precioVarianteSel ?? p.precio,
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
