import '../../../core/api/api_client.dart';
import '../../../shared/models/pedido.dart';

/// GET /api/ventas/mis-pedidos: la única forma segura de leer los pedidos del
/// cliente autenticado — el backend filtra por `id_cliente` tomado del JWT
/// (verificarToken + soloCliente en routes/ventas.js), nunca de un parámetro
/// que el cliente pudiera manipular. No existe un endpoint de cliente para
/// traer un solo pedido por id (GET /ventas/:id es solo para Admin), así que
/// el detalle se muestra a partir del objeto ya cargado en esta lista.
class PedidosService {
  PedidosService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Pedido>> getMisPedidos() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/ventas/mis-pedidos');
      final pedidos = (response.data as List)
          .map((p) => Pedido.fromJson(p as Map<String, dynamic>))
          .toList();
      // El backend ya ordena por fecha DESC; se reordena aquí también para
      // no depender silenciosamente de ese detalle de implementación.
      pedidos.sort((a, b) => b.fecha.compareTo(a.fecha));
      return pedidos;
    });
  }
}
