// Reglas de cuotas compartidas por Carrito, Checkout y "Nueva venta" (admin).
// Deben coincidir exactamente con pagoLogica.service.js en el backend — ahí
// vive la validación real; esto es solo para que la UI ofrezca opciones
// consistentes con lo que el backend va a aceptar.

export const MONTO_MINIMO_ABONO = 10000;
export const MAX_CUOTAS_ABSOLUTO = 36;
export const OPCIONES_CUOTAS_ESTANDAR = [2, 3, 4, 6, 9, 12, 18, 24, 36];

// El máximo REAL de cuotas para un total puntual: cada cuota debe valer al
// menos MONTO_MINIMO_ABONO, y nunca más de MAX_CUOTAS_ABSOLUTO.
export const calcularMaxCuotas = (total) =>
  Math.max(1, Math.min(MAX_CUOTAS_ABSOLUTO, Math.floor(Number(total || 0) / MONTO_MINIMO_ABONO)));

// Opciones estándar (2,3,4,6,9,12,18,24,36) filtradas por lo que el total permita.
export const opcionesCuotasDisponibles = (total) => {
  const max = calcularMaxCuotas(total);
  return OPCIONES_CUOTAS_ESTANDAR.filter((n) => n <= max);
};

// ── Fechas de vencimiento: quincenal (15 días) si el total es menor a
// $500.000, mensual (30 días) si es mayor o igual. La cuota 1 cae en la
// fecha de inicio exacta, sin desplazamiento. ──
const UMBRAL_MENSUAL = 500000;

// ── OJO: "fechaInicio" suele llegar como texto "YYYY-MM-DD" (el value de un
// <input type="date">). "new Date('YYYY-MM-DD')" lo interpreta como
// medianoche UTC — en un navegador con offset negativo (ej. America/Bogota,
// UTC-5) eso hace que getDate()/getMonth() del objeto resultante devuelvan
// el día ANTERIOR al que en verdad se eligió. Se parsea a mano como fecha
// LOCAL para que la cuota 1 caiga exactamente en el día seleccionado. ──
const parseFechaLocal = (valor) => {
  if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(valor || Date.now());
};

export const calcularFechasVencimiento = (fechaInicio, numCuotas, total) => {
  const intervaloDias = Number(total || 0) >= UMBRAL_MENSUAL ? 30 : 15;
  const base = parseFechaLocal(fechaInicio);
  const fechas = [];
  for (let i = 0; i < numCuotas; i++) {
    const f = new Date(base);
    f.setDate(f.getDate() + i * intervaloDias);
    fechas.push(f);
  }
  return fechas;
};

export const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const DIAS  = ['D','L','M','X','J','V','S'];
