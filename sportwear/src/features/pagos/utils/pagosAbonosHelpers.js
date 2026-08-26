// Funciones y constantes puras usadas por PagosAbonos.jsx.
export { MONTO_MINIMO_ABONO } from "../../../shared/utils/cuotas";

export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
export const FILAS_POR_PAGINA = 10;

// ── NUEVO: "Cuota N" en vez de "Abono" genérico cuando la fila tiene número
// de cuota — más claro que un simple "Abono" para ventas a cuotas. ──
export const getTipoLabel = (pago) => (pago.num_cuota ? `Cuota ${pago.num_cuota}` : pago.tipo);

// ── NUEVO: las cuotas se resuelven en orden — si esta fila es una cuota
// Pendiente pero todavía hay una cuota ANTERIOR de la misma venta también
// Pendiente, no se puede accionar todavía (hay que resolver esa primero).
// El desplegable de acción se ve deshabilitado, nunca desaparece. ──
export const esAccionablePorOrden = (pago, datos) => {
  if (pago.estado !== "Pendiente" || !pago.num_cuota) return true;
  return !datos.some((otro) =>
    otro.id_venta === pago.id_venta && otro.estado === "Pendiente" && otro.num_cuota < pago.num_cuota
  );
};

// ── NUEVO: mismo patrón de desplegable de estado que ya usan Pedidos y
// Compras — antes, Confirmar/Anular vivían como botones sueltos en
// "Acciones" mientras el estado era solo texto plano; ahora todo vive junto
// en el propio badge de Estado, igual que en el resto del admin. ──
export const TRANSICIONES_PAGO = {
  'Pendiente':  ['Confirmado', 'Anulado'],
  'Confirmado': [],
  'Anulado':    [],
};

export const getMetodoIcon = (metodo) => {
  switch (metodo) {
    case "Efectivo":      return "Ef.";
    case "Tarjeta":       return "Tarj.";
    case "Transferencia": return "Transf.";
    default:              return "—";
  }
};
