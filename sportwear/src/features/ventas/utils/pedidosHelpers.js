export const FILAS_POR_PAGINA = 10;

// Orden natural del flujo (sin contar Cancelado, que es una rama aparte)
export const ESTADOS_ORDEN = ['Pendiente', 'En preparación', 'Enviado', 'Entregado'];

// ── NUEVO: solo se puede editar un pedido en estos estados de envío —
// coincide con la misma regla que aplica el backend. ──
export const ESTADOS_EDITABLES = ['Pendiente', 'En preparación'];

// ── NUEVO: filtro por estado de envío en la tabla de Pedidos — "" = Todos. ──
export const ESTADOS_FILTRO = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "Pendiente", etiqueta: "Pendiente" },
  { valor: "En preparación", etiqueta: "En preparación" },
  { valor: "Enviado", etiqueta: "Enviado" },
  { valor: "Entregado", etiqueta: "Entregado" },
  { valor: "Cancelado", etiqueta: "Cancelado" },
];

// Debe calzar con TRANSICIONES del backend (pedidos.service.js)
export const TRANSICIONES = {
  'Pendiente':      ['En preparación', 'Cancelado'],
  'En preparación': ['Enviado', 'Cancelado'],
  'Enviado':        ['Entregado', 'Cancelado'],
  'Entregado':      [],
  'Cancelado':      [],
};

// ── NUEVO: si el pago de la venta asociada ya fue realizado o no — dato que
// el backend ya trae (v.estado AS estado_venta en pedidos.service.js), solo
// faltaba mostrarlo aquí. ──
export const getPagoBadge = (estadoVenta) => {
  switch (estadoVenta) {
    case "Pagado":     return "pedidos-badge-active";
    case "Anulado":    return "pedidos-badge-inactive";
    case "Confirmado": return "pedidos-badge-info";
    default:            return "pedidos-badge-pending"; // Pendiente
  }
};
export const getPagoTexto = (estadoVenta) => estadoVenta || "—";

export const getEstadoBadge = (estado) => {
  switch (estado) {
    case "Entregado":      return "pedidos-badge-active";
    case "Cancelado":      return "pedidos-badge-inactive";
    case "Enviado":        return "pedidos-badge-info";
    case "En preparación": return "pedidos-badge-pending";
    default:                return "pedidos-badge-pending";
  }
};
