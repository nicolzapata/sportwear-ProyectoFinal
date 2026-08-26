import { IconCart, IconCheck, IconMinus, IconPlus } from "./detalleProductoIcons";
import { fmt } from "../../utils/detalleProductoHelpers";

export default function InfoPanel({
  producto, colores, tallas, colorSel, tallaSel, variantes,
  handleColorClick, handleTallaClick,
  precioMostrado, sinSeleccion, agotado, stockMostrado,
  cantidad, decrementar, incrementar,
  agregado, handleAgregar,
}) {
  return (
    <div className="dp-info">
      <p className="dp-brand">SPORTWEAR</p>
      <h1 className="dp-nombre">{producto.nombre}</h1>

      {(colores.length > 0 || tallas.length > 0) && (
        <div className="dp-variant-line">
          {colores.length > 0 && (
            <div className="dp-colores">
              <span className="dp-attr-label">
                Color: <span className="dp-attr-val">{colorSel?.nombre ?? "—"}</span>
              </span>
              <div className="dp-color-chips-row">
                {colores.map(c => (
                  <button
                    key={c.id_color}
                    title={c.nombre}
                    className={`dp-color-chip-btn${colorSel?.id_color === c.id_color ? " selected" : ""}`}
                    style={{ background: c.codigo_hex || "#ccc" }}
                    onClick={() => handleColorClick(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {tallas.length > 0 && (
            <div className="dp-tallas">
              <span className="dp-attr-label">Talla:</span>
              <div className="dp-talla-chips-row">
                {tallas.map(t => {
                  const varT     = variantes.find(v => v.id_color === colorSel?.id_color && v.talla === t);
                  const sinStock = Number(varT?.stock ?? 0) === 0;
                  return (
                    <button
                      key={t}
                      className={`dp-talla-chip${tallaSel === t ? " selected" : ""}${sinStock ? " agotada" : ""}`}
                      onClick={() => !sinStock && handleTallaClick(t)}
                      title={sinStock ? "Agotada" : t}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dp-precio-wrap">
        <span className="dp-precio">{fmt(precioMostrado)}</span>
      </div>

      <div className="dp-stock-row">
        {sinSeleccion
          ? <span className="dp-stock-out" style={{ fontStyle: "italic" }}>Selecciona color y talla</span>
          : agotado
            ? <span className="dp-stock-out">Sin stock disponible</span>
            : stockMostrado < 5
              ? <span className="dp-stock-low">Solo quedan {stockMostrado} unidades</span>
              : <span className="dp-stock-ok">Stock disponible: {stockMostrado} unidades</span>
        }
      </div>

      {!agotado && !sinSeleccion && (
        <div className="dp-cantidad-row">
          <span className="dp-cantidad-label">Cantidad:</span>
          <div className="dp-cantidad-controls">
            <button className="dp-cantidad-btn" onClick={decrementar} disabled={cantidad <= 1}>
              <IconMinus />
            </button>
            <span className="dp-cantidad-value">{cantidad}</span>
            <button className="dp-cantidad-btn" onClick={incrementar} disabled={cantidad >= stockMostrado}>
              <IconPlus />
            </button>
          </div>
        </div>
      )}

      <button
        className={`dp-btn-agregar${agregado ? " agregado" : ""}${(agotado || sinSeleccion) ? " disabled" : ""}`}
        onClick={handleAgregar}
        disabled={agotado || sinSeleccion}
      >
        {agregado
          ? <><IconCheck /> ¡Agregado al carrito!</>
          : agotado
            ? "Agotado"
            : sinSeleccion
              ? "Selecciona color y talla"
              : <><IconCart /> Agregar al carrito</>
        }
      </button>

      <div className="dp-divider" />

      <div className="dp-detalles">
        {producto.descripcion && (
          <div className="dp-detalle-row">
            <span className="dp-detalle-label">Descripción</span>
            <span className="dp-detalle-val">{producto.descripcion}</span>
          </div>
        )}
        <div className="dp-detalle-row">
          <span className="dp-detalle-label">Categoría</span>
          <span className="dp-detalle-val">{producto.categoria || "—"}</span>
        </div>
        <div className="dp-detalle-row">
          <span className="dp-detalle-label">Referencia</span>
          <span className="dp-detalle-val">#{String(producto.id_producto).padStart(6, "0")}</span>
        </div>
      </div>
    </div>
  );
}
