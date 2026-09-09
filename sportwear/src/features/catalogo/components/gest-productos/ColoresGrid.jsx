import { useEffect, useMemo, useState } from "react";
import StatusToggle from "../../../../shared/components/StatusToggle";
import { IconEdit, IconTrash, IconX, IconImage } from "../../../../shared/components/Icons";
import { getBrightness } from "../../utils/coloresHelpers";
import { fmt, stockBadge } from "../../utils/gestProductosHelpers.jsx";

// Arma, por color, la lista de productos que lo usan (a partir de las
// variantes que ya vienen embebidas en cada producto) — todo derivado de
// /productos, no hay ningún dato inventado ni campo nuevo en BD.
const prendasDelColor = (productos, idColor) => productos
  .map((p) => {
    const vs = (p.variantes || []).filter((v) => v.id_color === idColor);
    if (vs.length === 0) return null;
    const tallas = [...new Set(vs.map((v) => v.talla))].join(", ");
    const stock = vs.reduce((acc, v) => acc + Number(v.stock || 0), 0);
    const precios = vs.map((v) => Number(v.precio ?? p.precio ?? 0));
    const min = Math.min(...precios), max = Math.max(...precios);
    return {
      id_producto: p.id_producto, nombre: p.nombre, imagen: p.imagen_principal,
      tallas, stock, precioTexto: min === max ? fmt(min) : `${fmt(min)} - ${fmt(max)}`,
    };
  })
  .filter(Boolean);

export default function ColoresGrid({
  coloresTodos, productos, busqueda, tienePerm,
  cambiarEstadoColor, abrirEditarColor, setEliminarColorId,
}) {
  const [seleccionado, setSeleccionado] = useState(null);

  const termino = busqueda.trim().toLowerCase();
  const filtrados = useMemo(() => !termino ? coloresTodos : coloresTodos.filter((c) =>
    c.nombre.toLowerCase().includes(termino) || c.codigo_hex.toLowerCase().includes(termino)
  ), [coloresTodos, termino]);

  const conteoPrendas = useMemo(() => {
    const mapa = {};
    coloresTodos.forEach((c) => { mapa[c.id_color] = prendasDelColor(productos, c.id_color).length; });
    return mapa;
  }, [coloresTodos, productos]);

  // Mantiene seleccionado el primer color visible: si el filtro cambia y el
  // seleccionado actual ya no aparece (o todavía no hay ninguno), el panel
  // de detalle siempre muestra algo en vez de quedar vacío o desactualizado.
  useEffect(() => {
    if (filtrados.length === 0) { setSeleccionado(null); return; }
    if (!filtrados.some((c) => c.id_color === seleccionado?.id_color)) {
      setSeleccionado(filtrados[0]);
    } else {
      setSeleccionado(filtrados.find((c) => c.id_color === seleccionado.id_color));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrados]);

  const prendasSeleccionado = seleccionado ? prendasDelColor(productos, seleccionado.id_color) : [];

  return (
    <div className="gestproductos-colores-layout">
      <div className="gestproductos-colores-main">
        {filtrados.length === 0 ? (
          <p style={{ color: "var(--dvna-muted)", fontSize: 13, padding: 24 }}>No se encontraron colores.</p>
        ) : (
          <div className="gestproductos-colores-grid">
            {filtrados.map((c) => {
              const claro = getBrightness(c.codigo_hex) > 150;
              const nPrendas = conteoPrendas[c.id_color] || 0;
              return (
                <div
                  key={c.id_color}
                  className={`gestproductos-colores-card${seleccionado?.id_color === c.id_color ? " selected" : ""}`}
                  onClick={() => setSeleccionado(c)}
                >
                  <div className="gestproductos-colores-topbar">
                    <span className="gestproductos-colores-badge-activo">{c.estado}</span>
                    {tienePerm('Colores.estado') && (
                      <span onClick={(e) => e.stopPropagation()}>
                        <StatusToggle id={c.id_color} estado={c.estado} onToggle={cambiarEstadoColor} showConfirmation={true} size="sm" nombreRegistro={c.nombre} />
                      </span>
                    )}
                  </div>
                  <div className="gestproductos-colores-swatch" style={{ backgroundColor: c.codigo_hex }}>
                    <span className={`gestproductos-colores-hexpill${claro ? " claro" : ""}`}>{c.codigo_hex}</span>
                  </div>
                  <div className="gestproductos-colores-info">
                    <div className="gestproductos-colores-nombre-row">
                      <span className="gestproductos-colores-name">{c.nombre}</span>
                      {nPrendas > 0 && <span className="gestproductos-colores-prendas-count">{nPrendas} prenda{nPrendas !== 1 ? "s" : ""}</span>}
                    </div>
                    <div className="gestproductos-colores-actions-btns" onClick={(e) => e.stopPropagation()}>
                      {tienePerm('Colores.editar') && (
                        <button className="catproductos-action-btn catproductos-edit-btn" style={{ width: 28, height: 28 }} onClick={() => abrirEditarColor(c)} title="Editar"><IconEdit /></button>
                      )}
                      {tienePerm('Colores.eliminar') && (
                        <button className="catproductos-action-btn catproductos-deactivate-btn" style={{ width: 28, height: 28 }} onClick={() => setEliminarColorId(c.id_color)} title="Eliminar"><IconTrash /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {seleccionado && (
        <aside className="gestproductos-colores-detalle">
          <div className="gestproductos-colores-detalle-header">
            <span><span className="gestproductos-colores-detalle-dot" /> Detalle de color</span>
            <button className="gestproductos-colores-detalle-close" onClick={() => setSeleccionado(null)} title="Cerrar"><IconX /></button>
          </div>

          <div className="gestproductos-colores-detalle-swatch" style={{ backgroundColor: seleccionado.codigo_hex }}>
            <span className={`gestproductos-colores-hexpill${getBrightness(seleccionado.codigo_hex) > 150 ? " claro" : ""}`}>{seleccionado.codigo_hex}</span>
            <span className={`gestproductos-colores-refpill${getBrightness(seleccionado.codigo_hex) > 150 ? " claro" : ""}`}>Ref: C-{String(seleccionado.id_color).padStart(2, "0")}</span>
          </div>

          <div className="gestproductos-colores-detalle-nombre">{seleccionado.nombre}</div>
          <div className="gestproductos-colores-detalle-estado">
            <span className={`tabla-status ${seleccionado.estado === "Activo" ? "activo" : "inactivo"}`}>{seleccionado.estado}</span>
          </div>

          <div className="gestproductos-colores-detalle-seccion">
            <div className="gestproductos-colores-detalle-seccion-titulo">
              Prendas con este color {prendasSeleccionado.length > 0 && `(${prendasSeleccionado.length})`}
            </div>
            {prendasSeleccionado.length === 0 ? (
              <p className="gestproductos-colores-detalle-vacio">Ningún producto usa este color todavía.</p>
            ) : (
              <div className="gestproductos-colores-detalle-prendas">
                {prendasSeleccionado.map((p) => (
                  <div key={p.id_producto} className="gestproductos-colores-prenda-row">
                    <div className="gestproductos-colores-prenda-thumb">
                      {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <IconImage />}
                    </div>
                    <div className="gestproductos-colores-prenda-info">
                      <span className="gestproductos-colores-prenda-nombre">{p.nombre}</span>
                      <span className="gestproductos-colores-prenda-meta">Tallas: {p.tallas} · {p.precioTexto}</span>
                    </div>
                    {stockBadge(p.stock)}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="gestproductos-colores-detalle-footer">
            {tienePerm('Colores.editar') && (
              <button className="gestproductos-btn-primary" onClick={() => abrirEditarColor(seleccionado)}><IconEdit /> Editar color</button>
            )}
            {tienePerm('Colores.eliminar') && (
              <button className="gestproductos-btn-secondary" onClick={() => setEliminarColorId(seleccionado.id_color)}>Eliminar</button>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
