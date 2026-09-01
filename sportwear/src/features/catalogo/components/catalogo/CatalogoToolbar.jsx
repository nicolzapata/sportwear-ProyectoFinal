import { IconGrid, IconList } from "./catalogoIcons";
import Select from "../../../../shared/components/Select";

export default function CatalogoToolbar({
  precioMin, setPrecioMin, precioMax, setPrecioMax,
  tallasDisponibles, filtroTalla, setFiltroTalla,
  coloresDisponibles, filtroColor, setFiltroColor,
  filtrados, vista, setVista,
}) {
  return (
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
          <Select value={filtroTalla} onChange={(e) => setFiltroTalla(e.target.value)}>
            <option value="">Todas</option>
            {tallasDisponibles.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
      )}
      {coloresDisponibles.length > 0 && (
        <div className="catalog-toolbar-group">
          <label>Color</label>
          <Select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}>
            <option value="">Todos</option>
            {coloresDisponibles.map(c => <option key={c.id_color} value={String(c.id_color)}>{c.nombre}</option>)}
          </Select>
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
  );
}
