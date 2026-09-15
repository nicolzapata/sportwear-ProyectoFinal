// src/pages/catalogo/Catalogo.jsx
import { useState, useEffect, Fragment } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import { useThemeScope } from "../../../shared/contexts/ThemeContext";
import api from "../../../shared/services/api";
// Catalogo.css se dividió por sección para facilitar el mantenimiento; el
// orden de los imports preserva la cascada del archivo original.
import "./Catalogo.layout.css";
import "./Catalogo.card.css";
import "./Catalogo.variantes.css";
import "./Catalogo.hero.css";
import { IconSearch } from "../../../shared/components/Icons";
import ProductCard from "../components/catalogo/ProductCard";
import CatalogoHero from "../components/catalogo/CatalogoHero";
import CategoriasDestacadas from "../components/catalogo/CategoriasDestacadas";
import CatalogoToolbar from "../components/catalogo/CatalogoToolbar";
import CatalogoFooter from "../components/catalogo/CatalogoFooter";

// Cuántas columnas tiene .catalog-grid en cada breakpoint — tiene que
// coincidir con los media queries reales (Catalogo.layout.css /
// Catalogo.hero.css) para poder calcular dónde termina la 2ª fila exacta.
const columnasPorAncho = (ancho) => (ancho <= 560 ? 1 : ancho <= 900 ? 2 : 4);

// Cuántas columnas tiene la grilla ahora mismo, actualizado en resize — así
// el video del inicio se intercala siempre al final de la 2ª fila completa,
// nunca a mitad de una fila (eso dejaba huecos raros en el layout).
function useColumnasGrid() {
  const [columnas, setColumnas] = useState(() =>
    columnasPorAncho(typeof window !== "undefined" ? window.innerWidth : 1200)
  );
  useEffect(() => {
    const onResize = () => setColumnas(columnasPorAncho(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return columnas;
}

// ── Página principal ──────────────────────────────────────────
export default function Catalogo() {
  // Modo oscuro del catálogo público — aislado en su propio scope
  // ("sw-scope-catalogo") para poder quitarlo fácilmente más adelante sin
  // afectar admin/checkout/carrito/auth: basta con eliminar esta línea, la
  // condición del botón en PublicNavbar.jsx y el bloque correspondiente en
  // src/shared/styles/theme.css.
  useThemeScope("sw-scope-catalogo");
  const { usuario } = useAuth();
  const esAdmin     = usuario?.rol === "Administrador" || usuario?.rol === "Admin";
  const { busqueda, setBusqueda, filtroCategoria, setFiltroCategoria, categorias, setCategorias } = useOutletContext();
  const showToast = useToast();
  const columnasGrid = useColumnasGrid();
  const posicionVideo = columnasGrid * 2; // se intercala al final de la 2ª fila

  const [datos,   setDatos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [vista,        setVista]        = useState("grid"); // 'grid' | 'list'
  const [precioMin,     setPrecioMin]     = useState("");
  const [precioMax,     setPrecioMax]     = useState("");
  const [filtroTalla,   setFiltroTalla]   = useState("");
  const [filtroColor,   setFiltroColor]   = useState("");
  const [videoInicio,   setVideoInicio]   = useState(null);
  const [fotoVideoInicio, setFotoVideoInicio] = useState(null);

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

  // ── CORREGIDO: antes la lista de categorías salía de leer el texto
  // "categoria" que ya traía cada producto cargado — así que si administras
  // categorías por separado (crear una nueva, renombrar, desactivar), el
  // menú nunca se enteraba, porque no tenía ninguna relación con la tabla
  // real de Categorías. Ahora se consulta esa tabla directamente, filtrando
  // solo las que están Activas y sí tienen al menos un producto (para no
  // ofrecer una categoría vacía sin nada que mostrar). ──
  const cargarCategorias = async () => {
    try {
      const { data } = await api.get("/categorias");
      const nombres = (data || [])
        .filter((c) => c.estado === "Activo" && Number(c.total_productos) > 0)
        .map((c) => c.nombre);
      setCategorias(["Todos", ...nombres]);
    } catch {
      // Si falla, se deja el fallback anterior (derivado de productos) para
      // no dejar el filtro completamente vacío.
      const nombres = ["Todos", ...new Set(datos.map(p => p.categoria).filter(Boolean))];
      setCategorias(nombres);
    }
  };

  useEffect(() => { cargar(); }, [esAdmin]);
  useEffect(() => { cargarCategorias(); }, []);
  useEffect(() => {
    api.get("/imagenes?tipo=HomeVideo&id=1")
      .then(({ data }) => setVideoInicio(data?.[0]?.url || null))
      .catch(() => {});
    // Foto que acompaña al video (Catálogo admin → Contenido del inicio) —
    // opcional, para que un video vertical no quede solo en medio de una
    // franja vacía.
    api.get("/imagenes?tipo=HomeVideoFoto&id=1")
      .then(({ data }) => setFotoVideoInicio(data?.[0]?.url || null))
      .catch(() => {});
  }, []);

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
    // ── CORREGIDO: ahora que cada variante puede tener su propio precio, el
    // filtro de rango debe comparar contra el rango real del producto
    // (precio_min/precio_max, ya calculado por el backend), no solo contra
    // el precio base — si no, un producto con una variante dentro del rango
    // buscado podía quedar afuera solo porque su precio "base" no calzaba. ──
    const precioMinProducto = Number(p.precio_min ?? p.precio ?? 0);
    const precioMaxProducto = Number(p.precio_max ?? p.precio ?? 0);
    const matchPrecioMin = !precioMin || precioMaxProducto >= Number(precioMin);
    const matchPrecioMax = !precioMax || precioMinProducto <= Number(precioMax);
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
      showToast("error", "Error al cambiar estado de publicación.");
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
      {!hayFiltroActivo && <CatalogoHero />}

      {/* ── Catálogo ── */}
      <div className="Catalogo-enter">
        {!hayFiltroActivo && (
          <CategoriasDestacadas
            categorias={categorias}
            datos={datos}
            onClickCategoria={setFiltroCategoria}
          />
        )}

        <CatalogoToolbar
          precioMin={precioMin} setPrecioMin={setPrecioMin}
          precioMax={precioMax} setPrecioMax={setPrecioMax}
          tallasDisponibles={tallasDisponibles} filtroTalla={filtroTalla} setFiltroTalla={setFiltroTalla}
          coloresDisponibles={coloresDisponibles} filtroColor={filtroColor} setFiltroColor={setFiltroColor}
          filtrados={filtrados} vista={vista} setVista={setVista}
        />

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
            {filtrados.map((p, i) => (
              <Fragment key={p.id_producto}>
                <ProductCard
                  p={p}
                  esAdmin={esAdmin}
                  onTogglePublicado={handleTogglePublicado}
                />
                {/* Video del inicio (Catálogo admin → Contenido del inicio),
                    intercalado justo al terminar la 2ª fila completa de
                    productos (columnasGrid * 2, ver useColumnasGrid) para
                    no dejar una fila a medias — solo en la vista sin
                    filtros ni búsqueda, y solo si el Admin ya subió uno. */}
                {i === posicionVideo - 1 && videoInicio && !hayFiltroActivo && vista === "grid" && (
                  <div className="catalog-video-block">
                    <p className="catalog-video-caption">Míranos en movimiento</p>
                    <div className={`catalog-video-media${fotoVideoInicio ? " con-foto" : ""}`}>
                      <video src={videoInicio} controls playsInline preload="metadata" />
                      {fotoVideoInicio && <img src={fotoVideoInicio} alt="" className="catalog-video-foto" />}
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}

        {!hayFiltroActivo && <CatalogoFooter />}
      </div>
    </>
  );
}
