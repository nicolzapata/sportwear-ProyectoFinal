import '../utils/parse_num.dart';

/// GET /api/categorias (categorias.service.js -> getCategorias).
class Categoria {
  Categoria({
    required this.idCategoria,
    required this.nombre,
    this.descripcion,
    this.estado,
    this.icono,
    this.totalProductos = 0,
  });

  factory Categoria.fromJson(Map<String, dynamic> json) {
    return Categoria(
      idCategoria: parseInt(json['id_categoria']),
      nombre: json['nombre'] as String,
      descripcion: json['descripcion'] as String?,
      estado: json['estado'] as String?,
      icono: json['icono'] as String?,
      totalProductos: parseInt(json['total_productos']),
    );
  }

  final int idCategoria;
  final String nombre;
  final String? descripcion;
  final String? estado;
  final String? icono;
  final int totalProductos;
}
