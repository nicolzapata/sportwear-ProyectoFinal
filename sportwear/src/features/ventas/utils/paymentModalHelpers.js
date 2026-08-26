// Funciones y constantes puras usadas por PaymentModal.jsx.

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });

export function formatCardNumber(v) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
export function formatExpiry(v) {
  const clean = v.replace(/\D/g, "").slice(0, 4);
  return clean.length > 2 ? clean.slice(0, 2) + "/" + clean.slice(2) : clean;
}

// ── NUEVO: detecta la marca de la tarjeta por el prefijo del número, para
// mostrar el logo correspondiente en la vista previa mientras se escribe. ──
export function detectarMarca(numero) {
  const digits = numero.replace(/\s/g, "");
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]\d|[3-6]\d{2}|7[01]\d|720)/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  return null;
}

/* ── DATOS DE PRUEBA — reemplazar por los datos reales del negocio cuando los tengan ── */
export const CUENTA_BANCARIA = {
  banco: "Banco X",
  tipo: "Ahorros",
  numero: "000-000000-00",
  titular: "DVNA SportWear S.A.S. — NIT 000.000.000-0",
};
// ── NUEVO: número de WhatsApp para confirmar transferencias — mismo dato que
// ya se usaba como texto en ventas.service.js (notificarPedidoRecibido). En
// formato internacional sin signos, listo para armar el link de wa.me. ──
export const WHATSAPP_CONFIRMACION = "573000000000";
