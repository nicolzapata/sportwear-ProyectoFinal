import GaleriaImagenes from "../../../../shared/components/GaleriaImagenes";
import { DetalleItem, DetalleGrid } from "../../../../shared/components/ModalDetalle";
import { IconEdit, IconX } from "../../../../shared/components/Icons";
import { fmt, precioMostrado, agruparVariantesPorColor, esColorClaro } from "../../utils/gestProductosHelpers.jsx";

export default function ProductoDetalleModal({ verDetalle, setVerDetalle, tienePerm, abrirEditar }) {
  if (!verDetalle) return null;

  const DetalleInfoGeneral = (
    <>
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Información general</h3>
        <DetalleGrid>
          <DetalleItem label="ID" value={`#${String(verDetalle.id_producto).padStart(3, "0")}`} />
          <DetalleItem label="Código" value={verDetalle.codigo} />
          <DetalleItem label="Categoría" value={verDetalle.categoria} />
          <DetalleItem label="Precio de venta" value={precioMostrado(verDetalle)} />
          <DetalleItem label="Precio base (respaldo sin variante)" value={fmt(verDetalle.precio)} />
          <DetalleItem label="Stock total" value={`${verDetalle.stock ?? 0} unidades`} />
          <DetalleItem label="Publicado" value={verDetalle.publicado ? "Sí, visible en catálogo" : "No publicado"} />
          <DetalleItem label="Estado" value={<span className={`tabla-status${verDetalle.estado === "Activo" ? " activo" : " inactivo"}`}>{verDetalle.estado}</span>} />
          <DetalleItem label="Destacado" value={verDetalle.destacado === "Nuevo" ? "Nuevo" : verDetalle.destacado === "Promocion" ? "Promoción" : "Ninguno"} />
        </DetalleGrid>
      </div>
      {verDetalle.historialPrecios?.length > 0 && (
        <div className="gestproductos-factura-seccion">
          <h3 className="gestproductos-factura-titulo">Historial de precios</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {verDetalle.historialPrecios.map(h => (
              <div key={h.id_historial} style={{ display: "flex", justifyContent: "space-between", gap: 10, background: "var(--dvna-pale)", border: "1px solid var(--dvna-border)", borderRadius: "var(--r)", padding: "8px 12px", fontSize: 12 }}>
                <span>{new Date(h.fecha).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })} {h.usuario ? `· ${h.usuario}` : ""}</span>
                <span>{fmt(h.precio_anterior)} <span style={{ color: "var(--dvna-muted)" }}>→</span> <b>{fmt(h.precio_nuevo)}</b></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const DetalleVariantesImagenes = (
    <>
      {verDetalle.variantes?.length > 0 && (() => {
        // ── CORREGIDO: antes esto agrupaba por color y solo separaba en dos
        // baldes ("con stock" / "sin stock"), sin decir el número exacto de
        // unidades de cada talla — el admin no tenía forma de saber, por
        // ejemplo, si la talla M tiene 2 unidades o 20. Ahora cada color
        // muestra una fila por talla con su stock exacto y su precio real
        // (el de la variante si tiene uno propio, si no el precio base). ──
        const grupos = agruparVariantesPorColor(verDetalle.variantes);
        const preciosPorColor = new Map();
        const stockPorColor = new Map();
        verDetalle.variantes.forEach(v => {
          if (!preciosPorColor.has(v.id_color)) preciosPorColor.set(v.id_color, new Map());
          preciosPorColor.get(v.id_color).set(v.talla, v.precio);
          if (!stockPorColor.has(v.id_color)) stockPorColor.set(v.id_color, new Map());
          stockPorColor.get(v.id_color).set(v.talla, v.stock);
        });
        return (
          <div className="gestproductos-factura-seccion">
            <h3 className="gestproductos-factura-titulo">Variantes — stock y precio por talla/color</h3>
            <p style={{ fontSize: 11, color: "var(--dvna-muted)", margin: "0 0 10px" }}>
              Si una talla no tiene precio propio, se usa el precio base del producto (mostrado arriba).
            </p>
            <div className="gestproductos-detalle-variantes-grupos">
              {grupos.map(g => {
                const swatchStyle = esColorClaro(g.codigo_hex)
                  ? { background: g.codigo_hex || "#ccc", border: "2px solid #ccc" }
                  : { background: g.codigo_hex || "#ccc" };
                const mapaPrecios = preciosPorColor.get(g.id_color) || new Map();
                const mapaStock = stockPorColor.get(g.id_color) || new Map();
                return (
                  <div key={g.id_color} className="gestproductos-detalle-color-grupo">
                    <div className="gestproductos-detalle-color-header">
                      <span className="gestproductos-detalle-variante-dot" style={swatchStyle} />
                      <span>{g.nombre}</span>
                    </div>
                    <table className="gestproductos-detalle-variantes-tabla">
                      <thead>
                        <tr><th>Talla</th><th>Stock</th><th>Precio</th></tr>
                      </thead>
                      <tbody>
                        {g.tallas.map(t => {
                          const stock = mapaStock.get(t) ?? 0;
                          const precio = mapaPrecios.get(t) ?? verDetalle.precio;
                          return (
                            <tr key={t} className={stock === 0 ? "agotada" : ""}>
                              <td>{t}</td>
                              <td>{stock === 0 ? <span className="gestproductos-detalle-agotado-tag">Agotado</span> : `${stock} uds`}</td>
                              <td>{fmt(precio)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
      <div className="gestproductos-factura-seccion">
        <h3 className="gestproductos-factura-titulo">Imágenes</h3>
        <GaleriaImagenes tipoReferencia="Producto" idReferencia={verDetalle.id_producto} soloLectura />
      </div>
    </>
  );

  return (
    <div className="gestproductos-modal-overlay" onClick={() => setVerDetalle(null)}>
      <div className="gestproductos-modal gestproductos-modal-factura" onClick={(e) => e.stopPropagation()}>
        <div className="gestproductos-modal-header">
          <div>
            <h2 className="gestproductos-modal-title">{verDetalle.nombre}</h2>
            <p className="gestproductos-modal-subtitulo">Detalle del producto</p>
          </div>
          <button className="gestproductos-modal-close" onClick={() => setVerDetalle(null)}><IconX /></button>
        </div>

        <div className="gestproductos-modal-body gestproductos-factura-body">
          {DetalleInfoGeneral}
          {DetalleVariantesImagenes}
        </div>

        <div className="gestproductos-modal-footer">
          <button className="gestproductos-btn-secondary" onClick={() => setVerDetalle(null)}>Cerrar</button>
          {tienePerm('Productos.editar') && (
            <button className="gestproductos-btn-primary" onClick={() => { setVerDetalle(null); abrirEditar(verDetalle); }}>
              <IconEdit /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
