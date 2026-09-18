import '../../../core/api/api_client.dart';
import '../../../shared/models/dashboard_resumen.dart';
import '../../../shared/models/pedido_admin.dart';
import '../../../shared/models/producto_bajo_stock.dart';
import '../../../shared/models/venta_resumen.dart';
import '../../../shared/models/compra_resumen.dart';

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

  /// GET /api/dashboard -> `productosBajoStock` (dashboard.service.js:
  /// pv.stock < 5 AND pv.estado='Activo', LIMIT 10). Mismo endpoint que
  /// [getResumen], pero leyendo otro campo de la misma respuesta.
  Future<List<ProductoBajoStock>> getProductosBajoStock() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/dashboard');
      final data = response.data as Map<String, dynamic>;
      return (data['productosBajoStock'] as List? ?? [])
          .map((p) => ProductoBajoStock.fromJson(p as Map<String, dynamic>))
          .toList();
    });
  }

  /// GET /api/ventas?estado_pago=Pendiente&limit=5 — mismos parámetros que
  /// usa el centro de notificaciones de la web (useNotificaciones.js).
  /// ventas.service.js solo pagina (y solo entonces respeta `limit`) cuando
  /// viaja `page`; como la web nunca lo manda aquí, el backend responde un
  /// array plano SIN recortar a 5 — se replica tal cual, sin "arreglarlo".
  Future<List<VentaResumen>> getVentasPendientes() {
    return _apiClient.call((dio) async {
      final response = await dio.get(
        '/ventas',
        queryParameters: {'estado_pago': 'Pendiente', 'limit': 5},
      );
      return (response.data as List)
          .map((v) => VentaResumen.fromJson(v as Map<String, dynamic>))
          .toList();
    });
  }

  /// GET /api/compras — sin filtro de estado (el backend no lo soporta) ni
  /// de página, así que responde un array plano; el filtro "Pendiente" se
  /// aplica del lado del cliente, igual que en la web
  /// (useNotificaciones.js -> cargarNotificacionesCompras).
  Future<List<CompraResumen>> getComprasPendientes() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/compras');
      return (response.data as List)
          .map((c) => CompraResumen.fromJson(c as Map<String, dynamic>))
          .where((c) => c.estado == 'Pendiente')
          .toList();
    });
  }
}
