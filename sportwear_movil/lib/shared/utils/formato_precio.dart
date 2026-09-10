/// Formatea un precio en pesos colombianos sin decimales y con puntos de
/// miles (ej. 49900 -> "$ 49.900"), igual que `fmt()` en la web
/// (detalleProductoHelpers.js), sin depender del paquete `intl`.
String formatoPrecioCop(num valor) {
  final entero = valor.round();
  final digitos = entero.abs().toString();
  final buffer = StringBuffer();
  for (var i = 0; i < digitos.length; i++) {
    if (i > 0 && (digitos.length - i) % 3 == 0) buffer.write('.');
    buffer.write(digitos[i]);
  }
  final signo = entero < 0 ? '-' : '';
  return '$signo\$ $buffer';
}
