// Funciones y constantes puras usadas por MiCuenta.jsx.
import { validarEmail } from "../../../shared/utils/numerico";

// ── NUEVO: cuántos pedidos se muestran de una en la página — el resto vive
// en la ventana "Ver todos mis pedidos", para que Mi Cuenta no se vuelva un
// scroll interminable con clientes que tienen muchos pedidos. ──
export const PEDIDOS_VISIBLES_INLINE = 3;

// "nombre" completo (BD) -> primer palabra = nombres, resto = apellidos.
export const dividirNombre = (nombreCompleto) => {
  const partes = (nombreCompleto || "").trim().split(/\s+/).filter(Boolean);
  return { nombres: partes[0] || "", apellidos: partes.slice(1).join(" ") };
};

export const errorEmailPerfil = (valor) => validarEmail(valor);

// ── CORREGIDO: estas dos funciones devolvían "exito" / "pendiente" /
// "error" / "info" a secas, pero en todo el proyecto NUNCA existió una
// clase CSS con esos nombres (ni ".exito", ni ".badge-exito") — las que sí
// existen, definidas en shared/styles/global.css, son ".badge-active",
// ".badge-pending", ".badge-inactive" y ".badge-info". Sin la clase real,
// el badge se pintaba sin ningún color (solo el pill vacío de ".badge"),
// así que "Pago: Pendiente" y "Envío: Pendiente" se veían exactamente
// iguales — ni el texto los distinguía (ver más abajo) ni el color. ──

// ── estado del envío (distinto del estado del pago) — viene de
// "Pedidos.estado_pedido" a través de /ventas/mis-pedidos. ──
export const getEnvioBadgeClass = (estado) => {
  switch (estado) {
    case "Entregado":      return "badge-active";
    case "Enviado":        return "badge-info";
    case "En preparación": return "badge-pending";
    case "Cancelado":      return "badge-inactive";
    default:                return "badge-pending"; // Pendiente o sin registrar aún
  }
};
// ── NUEVO: "Envío: X" en vez de solo "X" — antes, con pago y envío ambos
// en "Pendiente", las dos etiquetas se veían idénticas y no había forma de
// saber cuál de las dos cosas era la que faltaba. ──
export const getEnvioTexto = (estado) => `Envío: ${estado || "Pendiente"}`;

export const getBadgeClass = (estado) => {
  switch (estado) {
    case "Pagado": case "Confirmado": case "Abonado": return "badge-active";
    case "Pendiente": return "badge-pending";
    // ── CORREGIDO: "Cancelado" no es un valor real de Ventas.estado — el
    // que sí se usa es "Anulado" (distinto de Pedidos.estado_pedido, que
    // sí usa "Cancelado" — por eso getEnvioBadgeClass, más arriba, no se
    // toca). Se dejan los dos por seguridad, sin que ninguno estorbe. ──
    case "Cancelado": case "Anulado": return "badge-inactive";
    default: return "badge-info";
  }
};
// ── NUEVO: "Pago: X" — misma razón que getEnvioTexto de arriba. ──
export const getBadgeTexto = (estado) => `Pago: ${estado}`;

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export const getInitials = (nombre) => {
  if (!nombre) return "?";
  return nombre.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
};
