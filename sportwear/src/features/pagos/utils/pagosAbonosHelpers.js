// Funciones y constantes puras usadas por PagosAbonos.jsx.

export const fmt = (n) => Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });
export const FILAS_POR_PAGINA = 10;
// ── NUEVO: mismo mínimo que valida el backend — un abono no debería poder
// registrarse por $1 o cualquier valor sin sentido. ──
export const MONTO_MINIMO_ABONO = 20000;

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
