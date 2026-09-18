import '../utils/parse_num.dart';

/// Una fila de `productosBajoStock` en GET /api/dashboard (dashboard.service.js
/// -> getResumen: pv.stock < 5 AND pv.estado = 'Activo', ORDER BY stock ASC,
/// LIMIT 10). Varias filas pueden compartir `idProducto` (una por variante).
class ProductoBajoStock {
  ProductoBajoStock({
    required this.idProducto,
    required this.nombre,
    required this.talla,
    required this.color,
    required this.stock,
  });

  factory ProductoBajoStock.fromJson(Map<String, dynamic> json) {
    return ProductoBajoStock(
      idProducto: parseInt(json['id_producto']),
      nombre: json['nombre'] as String? ?? '',
      talla: json['talla'] as String? ?? '',
      color: json['color'] as String? ?? '',
      stock: parseInt(json['stock']),
    );
  }

  final int idProducto;
  final String nombre;
  final String talla;
  final String color;
  final int stock;
}
