import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';

/// Punto único para exigir sesión antes de continuar con una acción que sí
/// la requiere (ej. pasar a pagar, en una fase futura).
///
/// Si ya hay sesión iniciada, no hace nada y devuelve `true`: el llamador
/// sigue con su acción de inmediato. Si no la hay, navega a `/login` con la
/// ruta actual como query param `redirect` y devuelve `false` — el router
/// (ver app_router.dart) se encarga de volver automáticamente a esa ruta en
/// cuanto el login sea exitoso, sin que el llamador tenga que hacer nada más.
///
/// Uso (a futuro, ej. desde el botón "Pagar" del carrito):
/// ```dart
/// if (!requireLogin(context, redirectTo: '/carrito')) return;
/// // continuar con el checkout...
/// ```
bool requireLogin(BuildContext context, {required String redirectTo}) {
  final isAuthenticated = context.read<AuthProvider>().isAuthenticated;
  if (isAuthenticated) return true;

  context.push('/login?redirect=${Uri.encodeComponent(redirectTo)}');
  return false;
}
