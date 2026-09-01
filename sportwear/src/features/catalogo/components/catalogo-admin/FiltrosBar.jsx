import ExportButtons from "../../../../shared/components/ExportButtons";
import Select from "../../../../shared/components/Select";
import { IconSearch, IconX } from "../../../../shared/components/Icons";
import { IconExternalLink } from "./icons";
import { precioMostrado } from "../../utils/catalogoAdminHelpers";

export default function FiltrosBar({
  busqueda, setBusqueda, filtroEstado, setFiltroEstado, orden, setOrden, filtrados,
}) {
  return (
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

      <Select className="catadmin-select catadmin-select-orden" value={orden} onChange={(e) => setOrden(e.target.value)}>
        <option value="nombre">Nombre (A-Z)</option>
        <option value="recientes">Más recientes</option>
        <option value="precio_asc">Precio: menor a mayor</option>
        <option value="precio_desc">Precio: mayor a menor</option>
        <option value="stock">Stock: menor primero</option>
      </Select>

      <ExportButtons
        datos={filtrados}
        columnas={[
          { header: "Producto", key: "nombre" },
          { header: "Código", key: "codigo" },
          { header: "Categoría", key: "categoria" },
          { header: "Precio", value: (p) => precioMostrado(p) },
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
  );
}
