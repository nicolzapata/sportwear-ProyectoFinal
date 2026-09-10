import '../utils/parse_num.dart';

/// GET /api/metodos-pago (metodosPago.service.js). `nombre` es el valor
/// exacto que se debe enviar como `metodo_pago` al crear un pedido — no es
/// una referencia por id, es un VARCHAR libre en "Ventas".
class MetodoPago {
  MetodoPago({required this.idMetodo, required this.nombre, this.estado});

  factory MetodoPago.fromJson(Map<String, dynamic> json) {
    return MetodoPago(
      idMetodo: parseInt(json['id_metodo']),
      nombre: json['nombre'] as String,
      estado: json['estado'] as String?,
    );
  }

  final int idMetodo;
  final String nombre;
  final String? estado;
}
