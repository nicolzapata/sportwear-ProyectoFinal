import 'package:flutter/foundation.dart';

import '../../../core/api/jwt_payload.dart';
import '../../../core/api/token_storage.dart';
import '../../../shared/models/usuario.dart';
import '../services/auth_service.dart';

/// Estado de sesión de la app. El catálogo (/home, /producto/:id) es público
/// y no depende de esto; [isAuthenticated] solo determina qué se ve en el
/// AppBar y se usa para exigir login puntualmente (ver requireLogin()).
/// [ApiClient.onUnauthorized] llama a [logout] cuando el backend responde 401.
class AuthProvider extends ChangeNotifier {
  AuthProvider({
    required AuthService authService,
    required TokenStorage tokenStorage,
  })  : _authService = authService,
        _tokenStorage = tokenStorage {
    _restoreSession();
  }

  final AuthService _authService;
  final TokenStorage _tokenStorage;

  bool _isAuthenticated = false;
  Usuario? _usuario;

  bool get isAuthenticated => _isAuthenticated;
  Usuario? get usuario => _usuario;

  Future<void> _restoreSession() async {
    final token = await _tokenStorage.readToken();
    if (token != null) {
      _isAuthenticated = true;
      // login() ya trae `usuario` completo en la respuesta, pero al
      // restaurar una sesión guardada (reabrir la app) solo hay un token —
      // se reconstruye `rol`/`id_cliente`/etc. leyendo el payload del JWT
      // (el mismo que arma generarToken() en el backend), sin llamar a un
      // endpoint. Si no se hace esto, un admin que reabre la app pierde el
      // acceso al panel admin hasta volver a loguearse.
      final payload = decodeJwtPayload(token);
      if (payload != null) _usuario = Usuario.fromJson(payload);
    }
    notifyListeners();
  }

  Future<void> login({
    required String email,
    required String contrasena,
  }) async {
    final result = await _authService.login(email: email, contrasena: contrasena);
    await _tokenStorage.saveToken(result.token);
    _usuario = result.usuario;
    _isAuthenticated = true;
    notifyListeners();
  }

  Future<void> registro({
    required String nombre,
    required String email,
    required String contrasena,
    required String documento,
    String tipoDoc = 'CC',
    String? telefono,
    String? direccion,
  }) {
    // No autologuea: igual que la web, tras el registro exitoso se vuelve a /login.
    return _authService.registro(
      nombre: nombre,
      email: email,
      contrasena: contrasena,
      documento: documento,
      tipoDoc: tipoDoc,
      telefono: telefono,
      direccion: direccion,
    );
  }

  Future<void> logout() async {
    await _tokenStorage.deleteToken();
    _usuario = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
