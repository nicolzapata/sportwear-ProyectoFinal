import { IconX } from "../../../../shared/components/Icons";
import Select from "../../../../shared/components/Select";
import { MAX_MONTO } from "../../../../shared/utils/numerico";
import { fmt, MAX_CANTIDAD, errorItemCantidad, errorItemPrecio, errorItemDescuento } from "../../utils/pedidosVentasHelpers";

export default function VentaItemRow({
  item, index: i, productos, erroresVenta, setErroresVenta,
  actualizarItemVenta, quitarItemVenta, errorItemStock, itemsLength,
}) {
  const cant = Number(item.cantidad) || 0;
  const precio = Number(item.precio_unitario) || 0;
  const desc = Number(item.descuento_linea) || 0;
  const lineaTotal = cant * precio - desc;
  const productoSel = productos.find((p) => String(p.id_producto) === String(item.id_producto));
  const variantesActivas = (productoSel?.variantes || []).filter((v) => v.estado === "Activo");

  return (
    <div className="pedidosventas-item-row">
      <div>
        <Select
          className={`pedidosventas-form-select${erroresVenta[`item_${i}_producto`] ? " input-error" : ""}`}
          value={item.id_producto}
          onChange={(e) => actualizarItemVenta(i, "id_producto", e.target.value)}
        >
          <option value="">Producto...</option>
          {productos.map((p) => {
            // ── NUEVO: "p.stock" viene de un SUM() en Postgres (llega como
            // texto vía la librería pg) — se coerciona a número para
            // comparar bien, mismo fix que ya se aplicó en el catálogo
            // público. Si el producto no tiene stock en NINGUNA de sus
            // variantes, no se puede seleccionar. ──
            const stockProducto = Number(p.stock ?? 0);
            return (
              <option key={p.id_producto} value={p.id_producto} disabled={stockProducto === 0}>
                {p.nombre}{stockProducto === 0 ? " — Sin stock" : ""}
              </option>
            );
          })}
        </Select>
      </div>
      <div>
        <Select
          className={`pedidosventas-form-select${erroresVenta[`item_${i}_variante`] ? " input-error" : ""}`}
          value={item.id_variante}
          onChange={(e) => {
            actualizarItemVenta(i, "id_variante", e.target.value);
            // ── NUEVO: revalida la cantidad contra el stock de la variante
            // recién elegida (puede que la que tenía antes ya no aplique). ──
            if (erroresVenta[`item_${i}_cantidad`]) {
              setErroresVenta((prev) => ({ ...prev, [`item_${i}_cantidad`]: "" }));
            }
          }}
          disabled={!item.id_producto || variantesActivas.length === 0}
        >
          <option value="">
            {!item.id_producto ? "Elige un producto" : variantesActivas.length === 0 ? "Sin variantes" : "Talla / color..."}
          </option>
          {variantesActivas.map((v) => {
            const stockVariante = Number(v.stock ?? 0);
            return (
              <option key={v.id_variante} value={v.id_variante} disabled={stockVariante === 0}>
                {v.talla} · {v.color_nombre} {stockVariante === 0 ? "— Agotado" : `(stock: ${stockVariante})`}
              </option>
            );
          })}
        </Select>
      </div>
      <div>
        <input
          type="number"
          min="1"
          max={MAX_CANTIDAD}
          step={1}
          placeholder="Cant."
          className={`pedidosventas-form-input${erroresVenta[`item_${i}_cantidad`] ? " input-error" : ""}`}
          value={item.cantidad}
          onChange={(e) => {
            actualizarItemVenta(i, "cantidad", e.target.value);
            if (erroresVenta[`item_${i}_cantidad`]) {
              const itemActualizado = { ...item, cantidad: e.target.value };
              const msg = errorItemCantidad(e.target.value) || errorItemStock(itemActualizado);
              setErroresVenta((prev) => ({ ...prev, [`item_${i}_cantidad`]: msg }));
            }
          }}
          onBlur={() => {
            const msg = errorItemCantidad(item.cantidad) || errorItemStock(item);
            setErroresVenta((prev) => ({ ...prev, [`item_${i}_cantidad`]: msg }));
          }}
        />
        {erroresVenta[`item_${i}_cantidad`] && <span className="pedidosventas-field-error">{erroresVenta[`item_${i}_cantidad`]}</span>}
      </div>
      <div>
        <input
          type="number"
          min="0"
          max={MAX_MONTO}
          placeholder="Precio"
          className={`pedidosventas-form-input${erroresVenta[`item_${i}_precio`] ? " input-error" : ""}`}
          value={item.precio_unitario}
          onChange={(e) => {
            actualizarItemVenta(i, "precio_unitario", e.target.value);
            if (erroresVenta[`item_${i}_precio`]) setErroresVenta((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(e.target.value) }));
          }}
          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(item.precio_unitario) }))}
        />
      </div>
      <div>
        <input
          type="number"
          min="0"
          max={MAX_MONTO}
          placeholder="Desc."
          className={`pedidosventas-form-input${erroresVenta[`item_${i}_descuento`] ? " input-error" : ""}`}
          value={item.descuento_linea}
          onChange={(e) => {
            actualizarItemVenta(i, "descuento_linea", e.target.value);
            if (erroresVenta[`item_${i}_descuento`]) setErroresVenta((prev) => ({ ...prev, [`item_${i}_descuento`]: errorItemDescuento(e.target.value, item.cantidad, item.precio_unitario) }));
          }}
          onBlur={() => setErroresVenta((prev) => ({ ...prev, [`item_${i}_descuento`]: errorItemDescuento(item.descuento_linea, item.cantidad, item.precio_unitario) }))}
        />
      </div>
      <div className="pedidosventas-item-subtotal">{fmt(lineaTotal)}</div>
      <button
        type="button"
        className="pedidosventas-item-remove"
        onClick={() => quitarItemVenta(i)}
        disabled={itemsLength === 1}
        title="Quitar producto"
      >
        <IconX />
      </button>
    </div>
  );
}
