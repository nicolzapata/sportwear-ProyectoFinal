import '../utils/parse_num.dart';
import 'variante.dart';

/// GET /api/productos (productos.service.js -> getProductos). Es la misma
/// fila para el catálogo (grilla) y para el detalle (ya trae `variantes`
/// embebidas con su propio precio/stock).
class Producto {
  Producto({
    required this.idProducto,
    required this.codigo,
    required this.nombre,
    required this.precio,
    this.descripcion,
    this.idCategoria,
    this.categoria,
    this.publicado = false,
    this.estado,
    this.destacado,
    this.stock = 0,
    this.precioMin,
    this.precioMax,
    this.imagenPrincipal,
    this.variantes = const [],
  });

  factory Producto.fromJson(Map<String, dynamic> json) {
    return Producto(
      idProducto: parseInt(json['id_producto']),
      codigo: json['codigo'] as String? ?? '',
      nombre: json['nombre'] as String,
      descripcion: json['descripcion'] as String?,
      idCategoria: json['id_categoria'] == null ? null : parseInt(json['id_categoria']),
      categoria: json['categoria'] as String?,
      precio: parseDouble(json['precio']),
      publicado: json['publicado'] as bool? ?? false,
      estado: json['estado'] as String?,
      destacado: json['destacado'] as String?,
      stock: parseInt(json['stock']),
      precioMin: json['precio_min'] == null ? null : parseDouble(json['precio_min']),
      precioMax: json['precio_max'] == null ? null : parseDouble(json['precio_max']),
      imagenPrincipal: json['imagen_principal'] as String?,
      variantes: (json['variantes'] as List?)
              ?.map((v) => Variante.fromJson(v as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }

  final int idProducto;
  final String codigo;
  final String nombre;
  final String? descripcion;
  final int? idCategoria;
  final String? categoria;
  final double precio;
  final bool publicado;
  final String? estado;
  final String? destacado;
  final int stock;
  final double? precioMin;
  final double? precioMax;
  final String? imagenPrincipal;
  final List<Variante> variantes;

  /// true si hay variantes con precios distintos entre sí (mostrar "Desde $X").
  bool get tieneRangoPrecio =>
      precioMax != null && precioMin != null && precioMax! > precioMin!;

  double get precioDesde => precioMin ?? precio;

  bool get agotado => stock <= 0;
}
