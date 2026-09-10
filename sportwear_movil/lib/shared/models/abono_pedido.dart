import '../utils/parse_num.dart';

/// Fila de "PagosAbonos" embebida en GET /api/ventas/mis-pedidos. Todo pedido
/// tiene al menos un abono (incluso de pago completo, con tipo
/// 'Pago completo' y num_cuota/fecha_vencimiento en null) — solo se muestra
/// como "calendario de cuotas" cuando Pedido.tipoPago == 'cuotas'.
class AbonoPedido {
  AbonoPedido({
    required this.idPago,
    required this.monto,
    required this.tipo,
    required this.metodo,
    required this.estado,
    required this.fecha,
    this.numCuota,
    this.fechaVencimiento,
  });

  factory AbonoPedido.fromJson(Map<String, dynamic> json) {
    return AbonoPedido(
      idPago: parseInt(json['id_pago']),
      monto: parseDouble(json['monto']),
      tipo: json['tipo'] as String? ?? '',
      metodo: json['metodo'] as String? ?? '',
      estado: json['estado'] as String? ?? '',
      fecha: DateTime.parse(json['fecha'] as String),
      numCuota: json['num_cuota'] == null ? null : parseInt(json['num_cuota']),
      fechaVencimiento: json['fecha_vencimiento'] == null
          ? null
          : DateTime.parse(json['fecha_vencimiento'] as String),
    );
  }

  final int idPago;
  final double monto;
  final String tipo;
  final String metodo;
  final String estado;
  final DateTime fecha;
  final int? numCuota;
  final DateTime? fechaVencimiento;
}
