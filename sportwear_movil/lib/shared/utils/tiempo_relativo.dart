const _mesesCortos = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/// "hace X min/h/d" a partir de una fecha, igual que tiempoRelativo.js.
String tiempoRelativo(DateTime fecha) {
  final diff = DateTime.now().difference(fecha);
  final min = diff.inMinutes;
  if (min < 1) return 'justo ahora';
  if (min < 60) return 'hace $min min';
  final horas = diff.inHours;
  if (horas < 24) return 'hace ${horas}h';
  final dias = diff.inDays;
  if (dias < 7) return 'hace ${dias}d';
  final dia = fecha.day.toString().padLeft(2, '0');
  return '$dia ${_mesesCortos[fecha.month - 1]}';
}
