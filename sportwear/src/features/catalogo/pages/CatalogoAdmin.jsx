// src/pages/catalogoAdmin/CatalogoAdmin.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../shared/services/api";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useToast } from "../../../shared/contexts/ToastContext";
import Loader from "../../../shared/components/Loader";
import { IconBox, IconAlertTriangle } from "../../../shared/components/Icons";
import "./CatalogoAdmin.css";
import { PRODUCTOS_POR_PAGINA } from "../utils/catalogoAdminHelpers";
import KpiGrid from "../components/catalogo-admin/KpiGrid";
import ChipsCategoria from "../components/catalogo-admin/ChipsCategoria";
import FiltrosBar from "../components/catalogo-admin/FiltrosBar";
import ProductoCard from "../components/catalogo-admin/ProductoCard";
import VistaRapidaModal from "../components/catalogo-admin/VistaRapidaModal";

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
      showToast("exito", p.publicado ? "Producto despublicado." : "Producto publicado en el catálogo.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "No se pudo cambiar la publicación.");
    }
  };

  const toggleEstado = async (p) => {
    try {
      await api.patch(`/productos/${p.id_producto}/estado`);
      const nuevoEstado = p.estado === "Activo" ? "Inactivo" : "Activo";
      setProductos(prev => prev.map(x => x.id_producto === p.id_producto ? { ...x, estado: nuevoEstado, publicado: nuevoEstado === "Inactivo" ? false : x.publicado } : x));
      showToast("exito", `Producto marcado como "${nuevoEstado}".`);
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
      // ── CORREGIDO: ordenar por "precio" a secas se quedaba en $0 para
      // productos con variantes (ver catalogoAdminHelpers.js) — se ordena
      // por precio_min, el mismo valor que ahora se muestra en la tarjeta. ──
      if (orden === "precio_asc")  return (a.precio_min ?? a.precio ?? 0) - (b.precio_min ?? b.precio ?? 0);
      if (orden === "precio_desc") return (b.precio_min ?? b.precio ?? 0) - (a.precio_min ?? a.precio ?? 0);
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

  if (loading) return <Loader text="Cargando catálogo..." />;
  if (error) return <div className="catadmin-error-banner"><IconAlertTriangle /> {error}</div>;

  return (
    <div className="catadmin-container">
      <KpiGrid kpis={kpis} />

      <ChipsCategoria
        categoriaChips={categoriaChips}
        filtroCategoria={filtroCategoria}
        setFiltroCategoria={setFiltroCategoria}
      />

      <FiltrosBar
        busqueda={busqueda} setBusqueda={setBusqueda}
        filtroEstado={filtroEstado} setFiltroEstado={setFiltroEstado}
        orden={orden} setOrden={setOrden}
        filtrados={filtrados}
      />

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
              <ProductoCard
                key={p.id_producto}
                p={p}
                tienePerm={tienePerm}
                setVerRapido={setVerRapido}
                navigate={navigate}
                togglePublicado={togglePublicado}
                toggleEstado={toggleEstado}
              />
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
        <VistaRapidaModal
          verRapido={verRapido}
          setVerRapido={setVerRapido}
          tienePerm={tienePerm}
          navigate={navigate}
        />
      )}
    </div>
  );
}
