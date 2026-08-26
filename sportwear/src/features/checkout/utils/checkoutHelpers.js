// Funciones y constantes puras usadas por Checkout.jsx.

export const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0,
  });

// ── NUEVO: monto mínimo permitido para un abono/cuota — evita que una
// cuota termine siendo de $1 o cualquier valor sin sentido frente al
// precio real de los productos. ──
export const MONTO_MINIMO_ABONO = 20000;

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DIAS  = ['D','L','M','X','J','V','S'];

// ── Etiquetas más descriptivas para los métodos de pago conocidos — si el
// admin agrega uno nuevo que no esté aquí, se usa su nombre tal cual. ──
export const ETIQUETAS_METODO = {
  Efectivo: "Efectivo (contra entrega)",
  Transferencia: "Transferencia bancaria",
};

// ── Calcular fechas de cuotas (retorna objetos Date) ──────────────────────
export function getFechasCuotas(numCuotas) {
  const fechasDate = [];
  const hoy = new Date();
  const dia = hoy.getDate();
  for (let i = 0; i < numCuotas; i++) {
    let fecha;
    if (i === 0) {
      fecha = dia < 15
        ? new Date(hoy.getFullYear(), hoy.getMonth(), 15)
        : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    } else {
      const ant = fechasDate[i - 1];
      fecha = ant.getDate() === 15
        ? new Date(ant.getFullYear(), ant.getMonth() + 1, 0)
        : new Date(ant.getFullYear(), ant.getMonth() + 1, 15);
    }
    fechasDate.push(fecha);
  }
  return fechasDate;
}
