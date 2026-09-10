/// Línea del carrito, en memoria (no viene de ningún endpoint). Se identifica
/// por `idVariante`: agregar la misma variante dos veces suma cantidades en
/// vez de crear una línea duplicada.
class ItemCarrito {
  ItemCarrito({
    required this.idProducto,
    required this.idVariante,
    required this.nombreProducto,
    required this.colorNombre,
    required this.talla,
    required this.precio,
    required this.stockDisponible,
    this.imagenUrl,
    this.cantidad = 1,
  });

  final int idProducto;
  final int idVariante;
  final String nombreProducto;
  final String colorNombre;
  final String talla;
  final double precio;
  final int stockDisponible;
  final String? imagenUrl;
  final int cantidad;

  double get subtotal => precio * cantidad;

  ItemCarrito copyWith({int? cantidad}) {
    return ItemCarrito(
      idProducto: idProducto,
      idVariante: idVariante,
      nombreProducto: nombreProducto,
      colorNombre: colorNombre,
      talla: talla,
      precio: precio,
      stockDisponible: stockDisponible,
      imagenUrl: imagenUrl,
      cantidad: cantidad ?? this.cantidad,
    );
  }
}
