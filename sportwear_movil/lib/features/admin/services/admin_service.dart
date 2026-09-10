import '../../../core/api/api_client.dart';
import '../../../shared/models/dashboard_resumen.dart';
import '../../../shared/models/pedido_admin.dart';

/// Endpoints de administración confirmados leyendo pedidos.controller.js/
/// pedidos.service.js y dashboard.controller.js/dashboard.service.js.
/// Todos exigen rol Admin (o el módulo correspondiente, que Admin siempre
/// tiene) — el backend los protege igual, esto solo evita mostrar la UI a
/// quien de todos modos no podría usarla.
class AdminService {
  AdminService(this._apiClient);

  final ApiClient _apiClient;

  /// GET /api/pedidos?estado=Pendiente — pedidos.service.js valida el
  /// filtro contra ESTADOS_VALIDOS, así que el valor debe ser exacto.
  Future<List<PedidoAdmin>> getPedidosPendientes() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/pedidos', queryParameters: {'estado': 'Pendiente'});
      return (response.data as List)
          .map((p) => PedidoAdmin.fromJson(p as Map<String, dynamic>))
          .toList();
    });
  }

  /// PATCH /api/pedidos/:id_pedido/estado. El backend revalida la
  /// transición y devuelve solo la fila cruda de "Pedidos" (sin cliente/
  /// items) — no se usa esa respuesta, el llamador vuelve a pedir la lista.
  Future<void> cambiarEstadoPedido(int idPedido, String nuevoEstado) {
    return _apiClient.call((dio) async {
      await dio.patch('/pedidos/$idPedido/estado', data: {'estado': nuevoEstado});
    });
  }

  /// GET /api/dashboard — sin rango de fechas: "hoy" + "todo el tiempo".
  Future<DashboardResumen> getResumen() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/dashboard');
      final data = response.data as Map<String, dynamic>;
      return DashboardResumen.fromJson(data['stats'] as Map<String, dynamic>);
    });
  }
}
