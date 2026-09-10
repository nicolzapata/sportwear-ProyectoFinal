import '../utils/parse_num.dart';

/// Respuesta de POST /api/ventas/mi-pedido (ventas.service.js -> crearMiPedido):
/// devuelve la fila de "Ventas" completa vía RETURNING *; solo se usan los
/// campos relevantes para la pantalla de confirmación.
class PedidoConfirmado {
  PedidoConfirmado({required this.idVenta, required this.total, required this.estado});

  factory PedidoConfirmado.fromJson(Map<String, dynamic> json) {
    return PedidoConfirmado(
      idVenta: parseInt(json['id_venta']),
      total: parseDouble(json['total']),
      estado: json['estado'] as String? ?? 'Confirmado',
    );
  }

  final int idVenta;
  final double total;
  final String estado;
}
