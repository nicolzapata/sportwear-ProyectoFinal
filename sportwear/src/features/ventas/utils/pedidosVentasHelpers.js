// Funciones y constantes puras usadas por PedidosVentas.jsx.
import { validarMonto } from "../../../shared/utils/numerico";

export const fmt = (n) => Number(n||0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
export const FILAS_POR_PAGINA = 10;
export const HOY_ISO = new Date().toISOString().split("T")[0];

export const MAX_CANTIDAD = 9999;
export const MAX_NUM_CUOTAS = 60;

export const nuevoItem = () => ({ id_producto: "", id_variante: "", cantidad: 1, precio_unitario: "", descuento_linea: 0 });

export const formVentaInicial = () => ({
  id_cliente: "",
  fecha: new Date().toISOString().split("T")[0],
  estado: "Pendiente",       // Pendiente | Pagado
  tipo_pago: "completo",     // completo | cuotas
  num_cuotas: "",
  metodo_pago: "Efectivo",
  descuento: 0,
  motivo_descuento: "",
  impuesto: 0,
  observaciones: "",
  direccion_entrega: "",
  items: [nuevoItem()],
});

// ── Dropdown de estado (mismo patrón que Pedidos.jsx) ──
export const ESTADOS_ORDEN_VENTA = ['Pendiente', 'Pagado'];
export const TRANSICIONES_VENTA = {
  'Pendiente': ['Pagado', 'Anulado'],
  'Pagado':    ['Anulado'],
  'Anulado':   [],
};

export const errorItemCantidad = (cantidad) => {
  if (!cantidad || Number(cantidad) <= 0) return "Cantidad inválida";
  if (!Number.isInteger(Number(cantidad))) return "Debe ser un número entero";
  if (Number(cantidad) > MAX_CANTIDAD) return `No puede ser mayor a ${MAX_CANTIDAD}`;
  return "";
};
export const errorItemPrecio = (precio) => validarMonto(precio, { mensajeVacio: "Precio inválido" });
export const errorItemDescuento = (descuento, cantidad, precioUnitario) => {
  const d = Number(descuento) || 0;
  if (d < 0) return "No puede ser negativo";
  const subtotalLinea = (Number(cantidad) || 0) * (Number(precioUnitario) || 0);
  if (d > subtotalLinea) return "No puede ser mayor al subtotal de la línea";
  return "";
};

export const getEstadoBadge = (estado) => {
  switch(estado) {
    case "Pagado":   return "pedidosventas-badge-active";
    case "Pendiente":return "pedidosventas-badge-pending";
    case "Anulado":  return "pedidosventas-badge-inactive";
    default:         return "pedidosventas-badge-info";
  }
};
