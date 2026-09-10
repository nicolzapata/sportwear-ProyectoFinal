import '../../../core/api/api_client.dart';
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
}
