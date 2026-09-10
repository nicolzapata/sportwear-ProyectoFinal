import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'token_storage.dart';

const _baseUrl = 'https://sportwear-proyectofinal.onrender.com/api';

/// Cliente HTTP único de la app. Agrega el JWT a cada request y traduce
/// cualquier error de red/backend a [ApiException] con el mensaje real.
class ApiClient {
  ApiClient({TokenStorage? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorage() {
    _dio = Dio(BaseOptions(baseUrl: _baseUrl))
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) async {
            final token = await _tokenStorage.readToken();
            if (token != null) {
              options.headers['Authorization'] = 'Bearer $token';
            }
            handler.next(options);
          },
          onError: (error, handler) async {
            if (error.response?.statusCode == 401) {
              await _tokenStorage.deleteToken();
              onUnauthorized?.call();
            }
            handler.next(error);
          },
        ),
      );
  }

  final TokenStorage _tokenStorage;
  late final Dio _dio;

  /// Se invoca cuando el backend responde 401, ya con el token borrado.
  /// [AuthProvider] la usa para limpiar la sesión y go_router redirige a /login.
  void Function()? onUnauthorized;

  Dio get dio => _dio;

  /// Ejecuta una llamada a Dio y traduce cualquier [DioException] a [ApiException].
  Future<T> call<T>(Future<T> Function(Dio dio) request) async {
    try {
      return await request(_dio);
    } on DioException catch (e) {
      throw _toApiException(e);
    }
  }

  ApiException _toApiException(DioException error) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;
    if (data is Map && data['message'] is String) {
      return ApiException(data['message'] as String, statusCode: statusCode);
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return ApiException('No se pudo conectar con el servidor.');
    }
    return ApiException('Error inesperado. Intenta de nuevo.', statusCode: statusCode);
  }
}
