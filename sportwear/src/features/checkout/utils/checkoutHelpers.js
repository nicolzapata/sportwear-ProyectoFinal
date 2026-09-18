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

// ── NUEVO: edad mínima para comprar — la validación que de verdad bloquea la
// compra vive en el backend (crearMiPedido); esta copia en frontend solo
// evita el viaje al servidor cuando el dato es obviamente inválido. ──
export const EDAD_MINIMA_COMPRA = 18;

export const calcularEdad = (fechaNacimiento) => {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;

  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - nacimiento.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
};
