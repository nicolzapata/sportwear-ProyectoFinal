import '../../../core/api/api_client.dart';
import '../../../shared/models/usuario.dart';

/// Resultado común de login y registro: el backend siempre devuelve
/// `token` + `usuario` (ver auth.controller.js / auth.service.js).
class AuthResult {
  AuthResult({required this.token, required this.usuario});

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    return AuthResult(
      token: json['token'] as String,
      usuario: Usuario.fromJson(json['usuario'] as Map<String, dynamic>),
    );
  }

  final String token;
  final Usuario usuario;
}

/// Llama a los endpoints reales de /api/auth (routes/auth.js).
class AuthService {
  AuthService(this._apiClient);

  final ApiClient _apiClient;

  Future<AuthResult> login({
    required String email,
    required String contrasena,
  }) {
    return _apiClient.call((dio) async {
      final response = await dio.post('/auth/login', data: {
        'email': email,
        'contrasena': contrasena,
      });
      return AuthResult.fromJson(response.data as Map<String, dynamic>);
    });
  }

  Future<AuthResult> registro({
    required String nombre,
    required String email,
    required String contrasena,
    required String documento,
    String tipoDoc = 'CC',
    String? telefono,
    String? direccion,
  }) {
    return _apiClient.call((dio) async {
      final response = await dio.post('/auth/registro', data: {
        'nombre': nombre,
        'email': email,
        'contrasena': contrasena,
        'documento': documento,
        'tipo_doc': tipoDoc,
        if (telefono != null) 'telefono': telefono,
        if (direccion != null) 'direccion': direccion,
      });
      return AuthResult.fromJson(response.data as Map<String, dynamic>);
    });
  }
}
