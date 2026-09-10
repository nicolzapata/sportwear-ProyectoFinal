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

// ── CORREGIDO: esto mostraba "estado_venta" (Ventas.estado) tal cual, sin
// traducirlo — pero "Confirmado" en Ventas.estado significa "el PEDIDO quedó
// registrado", NO que el pago se haya confirmado (todo pedido de cliente
// nace en "Confirmado" así no se haya pagado nada todavía). Eso hacía que el
// badge de "Pago" dijera "Confirmado" para pedidos sin ningún abono, justo
// al lado del botón "Confirmar pago" — una contradicción visual directa. El
// estado real del PAGO se calcula con la misma plata confirmada contra el
// total, igual que ya hace useVentasListado.js para la tabla de Ventas. ──
export const getEstadoPago = (p) => {
  if (p.estado_venta === "Anulado") return "Anulado";
  const total = Number(p.total || 0);
  const pagado = Number(p.total_pagado || 0);
  return total > 0 && pagado >= total ? "Pagado" : "Pendiente";
};
export const getPagoBadge = (estadoPago) => {
  switch (estadoPago) {
    case "Pagado":  return "pedidos-badge-active";
    case "Anulado": return "pedidos-badge-inactive";
    default:         return "pedidos-badge-pending"; // Pendiente
  }
};
export const getPagoTexto = (estadoPago) => estadoPago || "—";

export const getEstadoBadge = (estado) => {
  switch (estado) {
    case "Entregado":      return "pedidos-badge-active";
    case "Cancelado":      return "pedidos-badge-inactive";
    case "Enviado":        return "pedidos-badge-info";
    case "En preparación": return "pedidos-badge-pending";
    default:                return "pedidos-badge-pending";
  }
};

// "hace X min/h/d" a partir de fecha_actualizacion — solo formateo, el dato
// (la fecha) ya lo trae el backend.
export const tiempoRelativo = (fecha) => {
  if (!fecha) return "—";
  const diffMs = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas}h ${min % 60}m`;
  return `hace ${Math.floor(horas / 24)}d`;
};

// v.origen solo guarda 'Landing' | 'Admin' (ver ventas.service.js) — esto
// únicamente traduce esos dos valores a un texto legible, no inventa nada.
export const origenTexto = (origen) => (origen === 'Landing' ? 'Tienda web' : origen === 'Admin' ? 'Registro interno' : origen || '—');
