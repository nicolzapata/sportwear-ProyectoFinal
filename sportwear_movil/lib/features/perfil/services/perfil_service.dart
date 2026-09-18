import '../../../core/api/api_client.dart';
import '../../../shared/models/barrio.dart';
import '../../../shared/models/perfil_cliente.dart';

class PerfilService {
  PerfilService(this._apiClient);

  final ApiClient _apiClient;

  Future<PerfilCliente> getMiPerfil() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/clientes/mi-perfil');
      return PerfilCliente.fromJson(response.data as Map<String, dynamic>);
    });
  }

  Future<List<Barrio>> getBarrios() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/barrios');
      return (response.data as List)
          .map((b) => Barrio.fromJson(b as Map<String, dynamic>))
          .toList();
    });
  }

  /// PUT /api/clientes/mi-perfil (clientes.service.js -> actualizarMiPerfil):
  /// solo `nombre`, `telefono`, `id_barrio`, `direccion`, `ciudad` — cualquier
  /// otro campo del body se ignora. Ese endpoint devuelve la fila cruda de
  /// "Clientes" (RETURNING *), SIN `barrio_nombre`/`zona` (esos solo vienen
  /// del JOIN en GET mi-perfil) — así que tras guardar se vuelve a pedir el
  /// perfil completo, en vez de mostrar una respuesta con el barrio
  /// desactualizado.
  Future<PerfilCliente> actualizarMiPerfil({
    required String nombre,
    String? telefono,
    String? direccion,
    String? ciudad,
    int? idBarrio,
  }) {
    return _apiClient.call((dio) async {
      await dio.put('/clientes/mi-perfil', data: {
        'nombre': nombre,
        'telefono': telefono,
        'direccion': direccion,
        'ciudad': ciudad,
        'id_barrio': idBarrio,
      });
      final response = await dio.get('/clientes/mi-perfil');
      return PerfilCliente.fromJson(response.data as Map<String, dynamic>);
    });
  }
}
