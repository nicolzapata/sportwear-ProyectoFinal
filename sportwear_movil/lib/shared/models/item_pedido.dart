import '../utils/parse_num.dart';

/// Línea de un pedido, embebida en la respuesta de
/// GET /api/ventas/mis-pedidos (ventas.service.js -> getMisPedidos): join de
/// "DetalleVenta" con "Productos"/"ProductoVariantes"/"Colores".
class ItemPedido {
  ItemPedido({
    required this.idProducto,
    required this.nombreProducto,
    required this.cantidad,
    required this.precioUnitario,
    required this.subtotal,
    this.idVariante,
    this.talla,
    this.colorNombre,
  });

  factory ItemPedido.fromJson(Map<String, dynamic> json) {
    return ItemPedido(
      idProducto: parseInt(json['id_producto']),
      idVariante: json['id_variante'] == null ? null : parseInt(json['id_variante']),
      nombreProducto: json['producto'] as String? ?? '',
      talla: json['talla'] as String?,
      colorNombre: json['color_nombre'] as String?,
      cantidad: parseInt(json['cantidad']),
      precioUnitario: parseDouble(json['precio_unitario']),
      subtotal: parseDouble(json['subtotal']),
    );
  }

  final int idProducto;
  final int? idVariante;
  final String nombreProducto;
  final String? talla;
  final String? colorNombre;
  final int cantidad;
  final double precioUnitario;
  final double subtotal;
}
