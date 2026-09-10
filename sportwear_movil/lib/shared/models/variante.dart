import '../utils/parse_num.dart';

/// Variante embebida en cada producto de GET /api/productos (json_agg en
/// productos.service.js). `precio` puede venir null: si no tiene precio
/// propio, la UI debe usar el precio general del producto como respaldo
/// (mismo criterio documentado en el backend).
class Variante {
  Variante({
    required this.idVariante,
    required this.idColor,
    required this.colorNombre,
    required this.codigoHex,
    required this.talla,
    required this.stock,
    required this.estado,
    this.precio,
  });

  factory Variante.fromJson(Map<String, dynamic> json) {
    return Variante(
      idVariante: parseInt(json['id_variante']),
      idColor: parseInt(json['id_color']),
      colorNombre: json['color_nombre'] as String,
      codigoHex: json['codigo_hex'] as String?,
      talla: json['talla'] as String,
      stock: parseInt(json['stock']),
      estado: json['estado'] as String?,
      precio: json['precio'] == null ? null : parseDouble(json['precio']),
    );
  }

  final int idVariante;
  final int idColor;
  final String colorNombre;
  final String? codigoHex;
  final String talla;
  final int stock;
  final String? estado;
  final double? precio;

  bool get sinStock => stock <= 0;
}
