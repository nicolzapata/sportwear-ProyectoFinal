import { useState } from "react";
import ProductoCardGestion from "./ProductoCardGestion";

export default function ProductosGrid({
  datos, tienePerm, abrirDetalle, abrirEditar, setEliminarId,
  totalPaginasProductos, paginaProductos, setPaginaProductos, totalProductos,
}) {
  const [menuAbierto, setMenuAbierto] = useState(null);

  return (
    <div className="gestproductos-grid-frame">
      {datos.length === 0 ? (
        <p className="gestproductos-empty-row">No se encontraron productos.</p>
      ) : (
        <div className="gestproductos-grid">
          {datos.map(p => (
            <ProductoCardGestion
              key={p.id_producto} producto={p} tienePerm={tienePerm}
              abrirDetalle={abrirDetalle} abrirEditar={abrirEditar} setEliminarId={setEliminarId}
              menuAbierto={menuAbierto} setMenuAbierto={setMenuAbierto}
            />
          ))}
        </div>
      )}

      {totalPaginasProductos > 1 && (
        <div className="paginador">
          <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.max(p - 1, 1))} disabled={paginaProductos === 1}>‹</button>
          {Array.from({ length: totalPaginasProductos }, (_, i) => i + 1).map(n => (
            <button key={n} className={`paginador-btn ${n === paginaProductos ? "paginador-btn-active" : ""}`} onClick={() => setPaginaProductos(n)}>{n}</button>
          ))}
          <button className="paginador-btn" onClick={() => setPaginaProductos(p => Math.min(p + 1, totalPaginasProductos))} disabled={paginaProductos === totalPaginasProductos}>›</button>
          <span className="paginador-info">Página {paginaProductos} de {totalPaginasProductos} · {totalProductos} registros</span>
        </div>
      )}
    </div>
  );
}
