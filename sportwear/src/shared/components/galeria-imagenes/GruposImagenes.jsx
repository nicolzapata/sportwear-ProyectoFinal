import { construirGrupos } from "../../utils/galeriaImagenesHelpers";
import ImagenCard from "./ImagenCard";

export default function GruposImagenes({
  imagenes, imagenesLocales, todosColores, soloLectura, tieneColores,
  eliminarLocal, setPrincipal, eliminar, cambiarColor,
  editandoColor, setEditandoColor, dropdownPos, setDropdownPos, paletteBtnRefs,
}) {
  const grupos = construirGrupos(imagenes, imagenesLocales, todosColores);

  return (
    <div className="gi-grupos">
      {grupos.map(g => (
        <div key={g.key} className="gi-grupo">
          <div className="gi-grupo-header">
            <span className={`gi-chip-dot${g.info ? "" : " gi-chip-dot-none"}`} style={g.info ? { background: g.info.codigo_hex } : undefined} />
            {g.info ? g.info.nombre : "Sin color asignar"}
            <span className="gi-grupo-count">({g.items.length})</span>
          </div>
          <div className="gi-grid">
            {g.items.map(entry => (
              <ImagenCard
                key={entry.tipo === "local" ? `local-${entry.idx}` : entry.img.id_imagen}
                entry={entry}
                soloLectura={soloLectura}
                todosColores={todosColores}
                tieneColores={tieneColores}
                eliminarLocal={eliminarLocal}
                setPrincipal={setPrincipal}
                eliminar={eliminar}
                cambiarColor={cambiarColor}
                editandoColor={editandoColor}
                setEditandoColor={setEditandoColor}
                dropdownPos={dropdownPos}
                setDropdownPos={setDropdownPos}
                paletteBtnRefs={paletteBtnRefs}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
