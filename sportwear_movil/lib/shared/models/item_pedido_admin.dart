import '../utils/parse_num.dart';

/// Línea de producto embebida en GET /api/pedidos (pedidos.service.js ->
/// getPedidos). A diferencia de mis-pedidos del cliente, aquí no viene
/// precio ni color — el join solo trae cantidad, nombre y talla.
class ItemPedidoAdmin {
  ItemPedidoAdmin({required this.cantidad, required this.producto, this.talla});

  factory ItemPedidoAdmin.fromJson(Map<String, dynamic> json) {
    return ItemPedidoAdmin(
      cantidad: parseInt(json['cantidad']),
      producto: json['producto'] as String? ?? '',
      talla: json['talla'] as String?,
    );
  }

  final int cantidad;
  final String producto;
  final String? talla;
}
