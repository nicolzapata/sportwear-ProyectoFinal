import '../utils/parse_num.dart';
import 'abono_pedido.dart';
import 'item_pedido.dart';

/// GET /api/ventas/mis-pedidos (verificarToken, soloCliente — filtrado por
/// id_cliente del token, ver ventas.controller.js -> getMisPedidos).
class Pedido {
  Pedido({
    required this.idVenta,
    required this.total,
    required this.totalPagado,
    required this.estado,
    required this.fecha,
    required this.direccionEntrega,
    required this.metodoPago,
    required this.tipoPago,
    required this.items,
    required this.abonos,
    this.estadoEnvio,
    this.numCuotas,
  });

  factory Pedido.fromJson(Map<String, dynamic> json) {
    return Pedido(
      idVenta: parseInt(json['id_venta']),
      total: parseDouble(json['total']),
      totalPagado: parseDouble(json['total_pagado']),
      estado: json['estado'] as String? ?? '',
      estadoEnvio: json['estado_envio'] as String?,
      fecha: DateTime.parse(json['fecha'] as String),
      direccionEntrega: json['direccion_entrega'] as String? ?? '',
      metodoPago: json['metodo_pago'] as String? ?? '',
      tipoPago: json['tipo_pago'] as String? ?? 'completo',
      numCuotas: json['num_cuotas'] == null ? null : parseInt(json['num_cuotas']),
      items: (json['items'] as List? ?? [])
          .map((i) => ItemPedido.fromJson(i as Map<String, dynamic>))
          .toList(),
      abonos: (json['abonos'] as List? ?? [])
          .map((a) => AbonoPedido.fromJson(a as Map<String, dynamic>))
          .toList(),
    );
  }

  final int idVenta;
  final double total;
  final double totalPagado;
  final String estado;
  final String? estadoEnvio;
  final DateTime fecha;
  final String direccionEntrega;
  final String metodoPago;
  final String tipoPago;
  final int? numCuotas;
  final List<ItemPedido> items;
  final List<AbonoPedido> abonos;

  /// Estado de envío si el pedido ya tiene un "Pedido" de logística asociado
  /// (siempre debería, ver crearPedidoParaVenta), si no cae al estado de venta.
  String get estadoMostrado => estadoEnvio ?? estado;

  bool get esCuotas => tipoPago == 'cuotas';
}
