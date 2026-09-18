import 'pedido_admin.dart';

/// Notificación armada del lado del cliente combinando datos que ya se piden
/// para otras pantallas (dashboard, pedidos, ventas, compras) — igual que
/// useNotificaciones.js en la web, que tampoco tiene una tabla/endpoint
/// dedicado de notificaciones.
class Notificacion {
  Notificacion({
    required this.id,
    required this.categoria,
    required this.titulo,
    required this.detalle,
    required this.enlaceWeb,
    required this.urgente,
    required this.fecha,
    this.pedido,
  });

  /// Igual que en la web: "stock-$idProducto", "venta-$idVenta",
  /// "pedido-$idPedido", "compra-$idCompra". Es la clave que se compara
  /// contra lo guardado en shared_preferences para saber qué ya se vio.
  final String id;

  /// "inventario" | "ventas" | "pedidos" | "compras".
  final String categoria;
  final String titulo;
  final String detalle;

  /// Ruta de la web (/productos, /ventas, /pedidos, /compras) — se conserva
  /// solo para trazabilidad de a qué corresponde cada notificación; el panel
  /// admin del móvil no tiene pantallas propias de Productos/Ventas/Compras.
  final String enlaceWeb;
  final bool urgente;
  final DateTime fecha;

  /// Solo presente en categoría "pedidos": el pedido ya cargado (mismo
  /// GET /pedidos?estado=Pendiente que usa el tab Pendientes), para poder
  /// navegar directo al detalle sin pedirlo de nuevo.
  final PedidoAdmin? pedido;
}
