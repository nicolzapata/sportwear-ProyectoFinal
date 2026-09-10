/// El driver `pg` del backend devuelve columnas NUMERIC/BIGINT (precio, stock
/// agregado con SUM, etc.) como String en el JSON para no perder precisión.
/// Estos helpers aceptan tanto String como num para no romperse con eso.
double parseDouble(dynamic value, {double fallback = 0}) {
  if (value == null) return fallback;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString()) ?? fallback;
}

int parseInt(dynamic value, {int fallback = 0}) {
  if (value == null) return fallback;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString()) ?? double.tryParse(value.toString())?.toInt() ?? fallback;
}
