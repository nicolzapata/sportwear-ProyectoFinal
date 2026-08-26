// src/pages/catalogo/DetalleProducto.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../../../shared/contexts/CartContext";
import api from "../../../shared/services/api";
// DetalleProducto.css se dividió por sección para facilitar el
// mantenimiento; el orden de los imports preserva la cascada del archivo
// original.
import "./DetalleProducto.layout.css";
import "./DetalleProducto.preview.css";
import "./DetalleProducto.variantes.css";
import { IconArrowLeft } from "../components/detalle-producto/detalleProductoIcons";
import Galeria from "../components/detalle-producto/Galeria";
import InfoPanel from "../components/detalle-producto/InfoPanel";
import PreviewOverlay from "../components/detalle-producto/PreviewOverlay";
import { extraerColores, tallasDeColor, filtrarImagenes } from "../utils/detalleProductoHelpers";

export default function DetalleProducto() {
  const { id }      = useParams();
  const navigate    = useNavigate();
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
  // ── CORREGIDO: mismo bug que en Catalogo.jsx — "producto.stock" viene de
  // un SUM() en Postgres, que llega como texto ("0") vía la librería pg, no
  // como número. La comparación estricta "=== 0" nunca coincidía cuando no
  // había variante seleccionada. ──
  const stockMostrado = Number(varianteSel?.stock ?? producto?.stock ?? 0);
  // ── NUEVO: cada variante puede tener su propio precio (definido al
  // recibir una compra) — si esta variante no tiene uno propio, se usa el
  // precio general del producto como respaldo. ──
  const precioMostrado = Number(varianteSel?.precio ?? producto?.precio ?? 0);
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

  // ── CORREGIDO: ya no exige sesión para agregar al carrito — el carrito
  // acepta productos sin iniciar sesión (CartContext ya los guarda en
  // localStorage de forma anónima). El login solo se pide más adelante, al
  // hacer clic en "Finalizar compra" (ver Carrito.jsx). ──
  const handleAgregar = () => {
    if (!colorSel || !tallaSel) {
      setError("Por favor selecciona color y talla");
      return;
    }

    agregarItem({
      id:          producto.id_producto,
      id_variante: varianteSel?.id_variante ?? null, // ✅ campo clave para el stock
      nombre:      producto.nombre,
      precio:      precioMostrado,
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
        <Galeria
          imgUrls={imgUrls} imgActiva={imgActiva} setImgActiva={setImgActiva}
          producto={producto} prev={prev} next={next}
          agotado={agotado} sinSeleccion={sinSeleccion} stockMostrado={stockMostrado}
          onPreview={() => setPreview(true)}
        />

        <InfoPanel
          producto={producto} colores={colores} tallas={tallas}
          colorSel={colorSel} tallaSel={tallaSel} variantes={variantes}
          handleColorClick={handleColorClick} handleTallaClick={handleTallaClick}
          precioMostrado={precioMostrado} sinSeleccion={sinSeleccion} agotado={agotado} stockMostrado={stockMostrado}
          cantidad={cantidad} decrementar={decrementar} incrementar={incrementar}
          agregado={agregado} handleAgregar={handleAgregar}
        />
      </div>

      {preview && (
        <PreviewOverlay
          imgUrls={imgUrls} imgActiva={imgActiva} total={total}
          prev={prev} next={next} onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
