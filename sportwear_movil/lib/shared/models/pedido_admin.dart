import '../utils/parse_num.dart';
import 'item_pedido_admin.dart';

/// GET /api/pedidos (admin — verificarToken + tieneModulo('Pedidos','ver'),
/// sin filtro de cliente: pedidos.service.js -> getPedidos). `idPedido` (no
/// `idVenta`) es lo que exige PATCH /api/pedidos/:id/estado.
class PedidoAdmin {
  PedidoAdmin({
    required this.idPedido,
    required this.idVenta,
    required this.estadoPedido,
    required this.fechaActualizacion,
    required this.total,
    required this.fechaVenta,
    required this.direccionEntrega,
    required this.estadoVenta,
    required this.metodoPago,
    required this.cliente,
    required this.items,
  });

  factory PedidoAdmin.fromJson(Map<String, dynamic> json) {
    return PedidoAdmin(
      idPedido: parseInt(json['id_pedido']),
      idVenta: parseInt(json['id_venta']),
      estadoPedido: json['estado_pedido'] as String? ?? '',
      fechaActualizacion: DateTime.parse(json['fecha_actualizacion'] as String),
      total: parseDouble(json['total']),
      fechaVenta: DateTime.parse(json['fecha_venta'] as String),
      direccionEntrega: json['direccion_entrega'] as String? ?? '',
      estadoVenta: json['estado_venta'] as String? ?? '',
      metodoPago: json['metodo_pago'] as String? ?? '',
      cliente: json['cliente'] as String? ?? '',
      items: (json['items'] as List? ?? [])
          .map((i) => ItemPedidoAdmin.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }

  final int idPedido;
  final int idVenta;
  final String estadoPedido;
  final DateTime fechaActualizacion;
  final double total;
  final DateTime fechaVenta;
  final String direccionEntrega;
  final String estadoVenta;
  final String metodoPago;
  final String cliente;
  final List<ItemPedidoAdmin> items;
}

/// Transiciones válidas de estado_pedido, tal como las exige el backend
/// (pedidos.service.js -> TRANSICIONES). El PATCH las revalida igual, pero
/// mostrar solo las válidas evita que el admin intente un salto que el
/// backend va a rechazar.
const transicionesEstadoPedido = {
  'Pendiente': ['En preparación', 'Cancelado'],
  'En preparación': ['Enviado', 'Cancelado'],
  'Enviado': ['Entregado', 'Cancelado'],
  'Entregado': <String>[],
  'Cancelado': <String>[],
};
