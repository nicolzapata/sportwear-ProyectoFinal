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

// ── estado del envío (distinto del estado del pago) — viene de
// "Pedidos.estado_pedido" a través de /ventas/mis-pedidos. ──
export const getEnvioBadgeClass = (estado) => {
  switch (estado) {
    case "Entregado":      return "exito";
    case "Enviado":        return "info";
    case "En preparación": return "pendiente";
    case "Cancelado":      return "error";
    default:                return "pendiente"; // Pendiente o sin registrar aún
  }
};
export const getEnvioTexto = (estado) => estado || "Pendiente";

export const getBadgeClass = (estado) => {
  switch (estado) {
    case "Pagado": case "Confirmado": case "Abonado": return "exito";
    case "Pendiente": return "pendiente";
    // ── CORREGIDO: "Cancelado" no es un valor real de Ventas.estado — el
    // que sí se usa es "Anulado" (distinto de Pedidos.estado_pedido, que
    // sí usa "Cancelado" — por eso getEnvioBadgeClass, más arriba, no se
    // toca). Se dejan los dos por seguridad, sin que ninguno estorbe. ──
    case "Cancelado": case "Anulado": return "error";
    default: return "info";
  }
};

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export const getInitials = (nombre) => {
  if (!nombre) return "?";
  return nombre.split(" ").filter(Boolean).map((w) => w[0].toUpperCase()).slice(0, 2).join("");
};
