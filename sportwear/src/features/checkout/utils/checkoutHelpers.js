// Funciones y constantes puras usadas por Checkout.jsx.
export {
  MONTO_MINIMO_ABONO, MAX_CUOTAS_ABSOLUTO, OPCIONES_CUOTAS_ESTANDAR,
  calcularMaxCuotas, opcionesCuotasDisponibles, calcularFechasVencimiento,
  MESES, DIAS,
} from "../../../shared/utils/cuotas";

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

// ── Etiquetas más descriptivas para los métodos de pago conocidos — si el
// admin agrega uno nuevo que no esté aquí, se usa su nombre tal cual. ──
export const ETIQUETAS_METODO = {
  Efectivo: "Efectivo (contra entrega)",
  Transferencia: "Transferencia bancaria",
};
