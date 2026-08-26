// Funciones y constantes puras usadas por Compras.jsx.
import { validarMonto } from "../../../shared/utils/numerico";

export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
export const FILAS_POR_PAGINA = 10;
export const HOY_ISO = new Date().toISOString().split("T")[0];
export const MAX_CANTIDAD = 9999;

export const nuevoItem = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "", precio_venta: "" });

export const formInicial = () => ({
  id_proveedor: "",
  numero_orden: "",
  descuento: 0,
  estado: "Pendiente",
  fecha: new Date().toISOString().split("T")[0],
  observaciones: "",
  items: [nuevoItem()],
  // ── NUEVO: si está activo, escribir el "Valor de venta" en cualquier línea
  // lo replica automáticamente a las demás líneas del MISMO producto (otra
  // talla/color) — no afecta líneas de un producto distinto. ──
  mismoPrecioVenta: false,
});

// ── Dropdown de estado con colores (mismo patrón que Pedidos/Ventas) ──
export const ESTADOS_ORDEN_COMPRA = ['Pendiente', 'En Tránsito', 'Recibido'];
export const TRANSICIONES_COMPRA = {
  'Pendiente':    ['En Tránsito', 'Recibido', 'Anulado'],
  'En Tránsito':  ['Recibido', 'Anulado'],
  'Recibido':     [],
  'Anulado':      [],
};

// ── Validaciones puntuales (en tiempo real, por campo) ──
export const errorFecha = (fecha) => {
  if (!fecha) return "La fecha es obligatoria";
  if (fecha > HOY_ISO) return "La fecha no puede ser futura";
  return "";
};
export const errorItemProducto = (idProducto) => (!idProducto ? "Selecciona un producto" : "");
export const errorItemVariante = (productos, idProducto, idVariante) => {
  const producto = productos.find((p) => String(p.id_producto) === String(idProducto));
  const variantesActivas = (producto?.variantes || []).filter((v) => v.estado === "Activo");
  return variantesActivas.length > 0 && !idVariante ? "Selecciona talla y color" : "";
};
export const errorItemCantidad = (cantidad) => {
  if (!cantidad || Number(cantidad) <= 0) return "Cantidad inválida";
  if (!Number.isInteger(Number(cantidad))) return "Debe ser un número entero";
  if (Number(cantidad) > MAX_CANTIDAD) return `No puede ser mayor a ${MAX_CANTIDAD}`;
  return "";
};
export const errorItemPrecio = (precio) => validarMonto(precio, { mensajeVacio: "Precio inválido" });
export const errorItemPrecioVenta = (precioVenta) => validarMonto(precioVenta, { mensajeVacio: "El valor de venta es obligatorio" });
export const errorDescuentoGeneral = (descuento, subtotal) => {
  const d = Number(descuento) || 0;
  if (d < 0) return "No puede ser negativo";
  if (d > subtotal) return "No puede ser mayor al subtotal";
  return "";
};

export const getEstadoBadge = (estado) => {
  switch (estado) {
    case "Recibido":
    case "Pagado":
      return "compras-badge-active";
    case "Pendiente":
      return "compras-badge-pending";
    case "En Tránsito":
    case "Confirmado":
      return "compras-badge-info";
    case "Anulado":
      return "compras-badge-inactive";
    default:
      return "compras-badge-info";
  }
};
