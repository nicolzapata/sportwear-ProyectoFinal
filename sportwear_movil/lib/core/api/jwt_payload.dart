import 'dart:convert';

/// Decodifica el payload de un JWT sin verificar la firma — el backend ya lo
/// validó al emitirlo, y vuelve a validarlo en cada request. Esto es solo
/// para reconstruir el estado local (ej. `rol` del usuario) al restaurar una
/// sesión guardada, sin tener que llamar a un endpoint de perfil.
Map<String, dynamic>? decodeJwtPayload(String token) {
  try {
    final partes = token.split('.');
    if (partes.length != 3) return null;
    final payload = utf8.decode(base64Url.decode(base64Url.normalize(partes[1])));
    return jsonDecode(payload) as Map<String, dynamic>;
  } catch (_) {
    return null;
  }
}
