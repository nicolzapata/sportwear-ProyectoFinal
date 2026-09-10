import '../../../core/api/api_client.dart';
import '../../../shared/models/barrio.dart';
import '../../../shared/models/item_carrito.dart';
import '../../../shared/models/metodo_pago.dart';
import '../../../shared/models/pedido_confirmado.dart';

/// Llama a los endpoints reales de checkout, confirmados leyendo
/// ventas.controller.js/ventas.service.js, metodosPago.controller.js y
/// barrios.js — no hay nada inventado aquí.
class CheckoutService {
  CheckoutService(this._apiClient);

  final ApiClient _apiClient;

  Future<List<MetodoPago>> getMetodosPago() {
    return _apiClient.call((dio) async {
      final response = await dio.get('/metodos-pago', queryParameters: {'activos': '1'});
      return (response.data as List)
          .map((m) => MetodoPago.fromJson(m as Map<String, dynamic>))
          .toList();
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

  /// POST /api/ventas/mi-pedido (soloCliente). `id_cliente` lo toma el
  /// backend del token, nunca se manda en el body. Fase 3 no soporta cuotas:
  /// siempre se envía `tipo_pago: 'completo'`.
  Future<PedidoConfirmado> crearPedido({
    required List<ItemCarrito> items,
    required double total,
    required String direccionEntrega,
    required int idBarrio,
    required String metodoPago,
  }) {
    return _apiClient.call((dio) async {
      final hoy = DateTime.now();
      final fecha =
          '${hoy.year.toString().padLeft(4, '0')}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}';

      final response = await dio.post('/ventas/mi-pedido', data: {
        'total': total,
        'estado': 'Confirmado',
        'fecha': fecha,
        'direccion_entrega': direccionEntrega,
        'id_barrio': idBarrio,
        'metodo_pago': metodoPago,
        'tipo_pago': 'completo',
        'items': items
            .map((i) => {
                  'id_producto': i.idProducto,
                  'id_variante': i.idVariante,
                  'cantidad': i.cantidad,
                  'precio': i.precio,
                })
            .toList(),
      });
      return PedidoConfirmado.fromJson(response.data as Map<String, dynamic>);
    });
  }
}
