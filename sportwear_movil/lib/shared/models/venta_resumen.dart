import '../utils/parse_num.dart';

/// Una fila de GET /api/ventas (ventas.service.js -> getVentas): solo los
/// campos que hacen falta para la notificación de "venta pendiente de pago",
/// no el detalle completo de la venta.
class VentaResumen {
  VentaResumen({
    required this.idVenta,
    required this.cliente,
    required this.total,
    required this.fecha,
  });

  factory VentaResumen.fromJson(Map<String, dynamic> json) {
    return VentaResumen(
      idVenta: parseInt(json['id_venta']),
      cliente: json['cliente'] as String? ?? '',
      total: parseDouble(json['total']),
      fecha: DateTime.parse(json['fecha'] as String),
    );
  }

  final int idVenta;
  final String cliente;
  final double total;
  final DateTime fecha;
}
