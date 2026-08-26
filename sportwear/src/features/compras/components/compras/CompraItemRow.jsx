import { IconAlertTriangle, IconX } from "../../../../shared/components/Icons";
import { MAX_MONTO } from "../../../../shared/utils/numerico";
import {
  fmt, MAX_CANTIDAD, errorItemProducto, errorItemVariante,
  errorItemCantidad, errorItemPrecio, errorItemPrecioVenta,
} from "../../utils/comprasHelpers";

export default function CompraItemRow({
  item, index: i, productos, errores, setErrores,
  actualizarItem, quitarItem, itemsLength,
}) {
  const cant = Number(item.cantidad) || 0;
  const precio = Number(item.precio_unitario) || 0;
  const lineaTotal = cant * precio;
  const productoSel = productos.find((p) => String(p.id_producto) === String(item.id_producto));
  const variantesActivas = (productoSel?.variantes || []).filter((v) => v.estado === "Activo");
  const costo = Number(item.precio_unitario) || 0;
  const venta = Number(item.precio_venta) || 0;
  const ventaIngresada = item.precio_venta !== "" && item.precio_venta !== null && item.precio_venta !== undefined;
  const alertaMenor = ventaIngresada && costo > 0 && venta < costo;
  const alertaIgual  = ventaIngresada && costo > 0 && venta === costo;

  return (
    <div className="compras-item-row">
      <div className="compras-item-field compras-item-field-producto">
        <label className="compras-item-label-movil">Producto</label>
        <select
          className={`compras-form-select${errores[`item_${i}_producto`] ? " input-error" : ""}`}
          value={item.id_producto}
          onChange={(e) => {
            const valor = e.target.value;
            actualizarItem(i, "id_producto", valor);
            if (errores[`item_${i}_producto`]) {
              setErrores((prev) => ({ ...prev, [`item_${i}_producto`]: errorItemProducto(valor) }));
            }
          }}
          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_producto`]: errorItemProducto(item.id_producto) }))}
        >
          <option value="">Producto...</option>
          {productos.map((p) => (
            <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
          ))}
        </select>
        {errores[`item_${i}_producto`] && <span className="compras-field-error">{errores[`item_${i}_producto`]}</span>}
      </div>
      <div className="compras-item-field compras-item-field-variante">
        <label className="compras-item-label-movil">Talla / Color</label>
        <select
          className={`compras-form-select${errores[`item_${i}_variante`] ? " input-error" : ""}`}
          value={item.id_variante}
          onChange={(e) => {
            const valor = e.target.value;
            actualizarItem(i, "id_variante", valor);
            if (errores[`item_${i}_variante`]) {
              setErrores((prev) => ({ ...prev, [`item_${i}_variante`]: errorItemVariante(productos, item.id_producto, valor) }));
            }
          }}
          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_variante`]: errorItemVariante(productos, item.id_producto, item.id_variante) }))}
          disabled={!item.id_producto || variantesActivas.length === 0}
        >
          <option value="">
            {!item.id_producto ? "Elige un producto" : variantesActivas.length === 0 ? "Sin variantes" : "Talla / color..."}
          </option>
          {variantesActivas.map((v) => (
            <option key={v.id_variante} value={v.id_variante}>
              {v.talla} · {v.color_nombre} (stock: {v.stock})
            </option>
          ))}
        </select>
        {errores[`item_${i}_variante`] && <span className="compras-field-error">{errores[`item_${i}_variante`]}</span>}
      </div>
      <div className="compras-item-field">
        <label className="compras-item-label-movil">Cantidad</label>
        <input
          type="number"
          min="1"
          max={MAX_CANTIDAD}
          step={1}
          placeholder="Cant."
          className={`compras-form-input${errores[`item_${i}_cantidad`] ? " input-error" : ""}`}
          value={item.cantidad}
          onChange={(e) => {
            const valor = e.target.value;
            actualizarItem(i, "cantidad", valor);
            if (errores[`item_${i}_cantidad`]) {
              setErrores((prev) => ({ ...prev, [`item_${i}_cantidad`]: errorItemCantidad(valor) }));
            }
          }}
          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_cantidad`]: errorItemCantidad(item.cantidad) }))}
        />
      </div>
      <div className="compras-item-field">
        <label className="compras-item-label-movil">Precio de costo</label>
        <input
          type="number"
          min="0"
          max={MAX_MONTO}
          placeholder="Precio de costo"
          className={`compras-form-input${errores[`item_${i}_precio`] ? " input-error" : ""}`}
          value={item.precio_unitario}
          onChange={(e) => {
            const valor = e.target.value;
            actualizarItem(i, "precio_unitario", valor);
            if (errores[`item_${i}_precio`]) {
              setErrores((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(valor) }));
            }
          }}
          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_precio`]: errorItemPrecio(item.precio_unitario) }))}
        />
        {errores[`item_${i}_precio`] && <span className="compras-field-error">{errores[`item_${i}_precio`]}</span>}
      </div>
      <div className="compras-item-field">
        <label className="compras-item-label-movil">Valor de venta</label>
        <input
          type="number"
          min="0"
          max={MAX_MONTO}
          placeholder="Valor de venta"
          className={`compras-form-input${errores[`item_${i}_precio_venta`] ? " input-error" : ""}${alertaMenor || alertaIgual ? " compras-input-warning" : ""}`}
          value={item.precio_venta}
          onChange={(e) => {
            const valor = e.target.value;
            actualizarItem(i, "precio_venta", valor);
            if (errores[`item_${i}_precio_venta`]) {
              setErrores((prev) => ({ ...prev, [`item_${i}_precio_venta`]: errorItemPrecioVenta(valor) }));
            }
          }}
          onBlur={() => setErrores((prev) => ({ ...prev, [`item_${i}_precio_venta`]: errorItemPrecioVenta(item.precio_venta) }))}
        />
        {errores[`item_${i}_precio_venta`] && <span className="compras-field-error">{errores[`item_${i}_precio_venta`]}</span>}
        {alertaMenor && (
          <span className="compras-field-warning"><IconAlertTriangle /> Estás vendiendo más barato de lo que te costó.</span>
        )}
        {!alertaMenor && alertaIgual && (
          <span className="compras-field-warning"><IconAlertTriangle /> El valor de venta es igual al costo — no hay ganancia.</span>
        )}
      </div>
      <div className="compras-item-subtotal">
        <label className="compras-item-label-movil">Subtotal</label>
        {fmt(lineaTotal)}
      </div>
      <button
        type="button"
        className="compras-item-remove"
        onClick={() => quitarItem(i)}
        disabled={itemsLength === 1}
        title="Quitar producto"
      >
        <IconX />
      </button>
    </div>
  );
}
