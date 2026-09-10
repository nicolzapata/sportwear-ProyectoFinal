import '../utils/parse_num.dart';

/// GET /api/barrios. `id_barrio` es lo que se envía como `id_barrio` al
/// crear un pedido (FK real a "Barrios", no texto libre).
class Barrio {
  Barrio({required this.idBarrio, required this.nombre, this.zona});

  factory Barrio.fromJson(Map<String, dynamic> json) {
    return Barrio(
      idBarrio: parseInt(json['id_barrio']),
      nombre: json['nombre'] as String,
      zona: json['zona'] as String?,
    );
  }

  final int idBarrio;
  final String nombre;
  final String? zona;
}
