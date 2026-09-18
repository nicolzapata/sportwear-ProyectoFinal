import '../utils/parse_num.dart';

/// Una fila de GET /api/compras (compras.service.js -> getCompras): solo los
/// campos que hacen falta para la notificación de "compra pendiente" — el
/// backend no filtra por estado, por eso `estado` se conserva para filtrar
/// del lado del cliente, igual que hace la web.
class CompraResumen {
  CompraResumen({
    required this.idCompra,
    required this.proveedor,
    required this.nombreComercial,
    required this.total,
    required this.fecha,
    required this.estado,
  });

  factory CompraResumen.fromJson(Map<String, dynamic> json) {
    return CompraResumen(
      idCompra: parseInt(json['id_compra']),
      proveedor: json['proveedor'] as String? ?? '',
      nombreComercial: json['nombre_comercial'] as String? ?? '',
      total: parseDouble(json['total']),
      fecha: DateTime.parse(json['fecha'] as String),
      estado: json['estado'] as String? ?? '',
    );
  }

  final int idCompra;
  final String proveedor;
  final String nombreComercial;
  final double total;
  final DateTime fecha;
  final String estado;
}
