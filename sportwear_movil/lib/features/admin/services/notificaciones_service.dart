import '../../../shared/models/notificacion.dart';
import '../../../shared/models/producto_bajo_stock.dart';
import '../../../shared/utils/formato_precio.dart';
import 'admin_service.dart';

/// Arma la misma lista de notificaciones que useNotificaciones.js en la web,
/// a partir de datos que YA se piden para otras pantallas (dashboard,
/// pedidos, ventas, compras) — no hay tabla ni endpoint de notificaciones en
/// el backend, ni acá ni en la web.
///
/// El panel admin del móvil solo es visible para rol=='Admin' (ver
/// AdminHomeScreen), y `tieneModulo` en la web deja pasar a Admin sin mirar
/// `usuario.modulos` — por eso, a diferencia de la web, acá no hace falta
/// repetir esa comprobación por categoría: si se ve la campana, se cargan
/// las 4 fuentes, igual que vería un Admin en la web.
class NotificacionesService {
  NotificacionesService(this._adminService);

  final AdminService _adminService;

  Future<List<Notificacion>> cargarTodas() async {
    final resultados = await Future.wait([
      _cargarInventario(),
      _cargarVentasPendientes(),
      _cargarPedidos(),
      _cargarCompras(),
    ]);
    return resultados.expand((lista) => lista).toList();
  }

  /// dashboard.service.js -> productosBajoStock, agrupado por producto
  /// (varias filas = varias variantes del mismo producto).
  Future<List<Notificacion>> _cargarInventario() async {
    try {
      final filas = await _adminService.getProductosBajoStock();
      final porProducto = <int, List<ProductoBajoStock>>{};
      for (final fila in filas) {
        porProducto.putIfAbsent(fila.idProducto, () => []).add(fila);
      }
      final ahora = DateTime.now();
      return porProducto.entries.map((entrada) {
        final variantes = entrada.value..sort((a, b) => a.stock.compareTo(b.stock));
        final peor = variantes.first;
        final detalle = variantes.length > 1
            ? '${variantes.length} variantes con poco stock (mínimo ${peor.stock} en talla ${peor.talla})'
            : 'Talla ${peor.talla} · ${peor.color} · quedan ${peor.stock}';
        return Notificacion(
          id: 'stock-${entrada.key}',
          categoria: 'inventario',
          titulo: 'Stock bajo · ${peor.nombre}',
          detalle: detalle,
          enlaceWeb: '/productos',
          urgente: peor.stock <= 2,
          fecha: ahora,
        );
      }).toList();
    } catch (_) {
      return [];
    }
  }

  /// ventas.service.js -> getVentas({estado_pago:'Pendiente', limit:5}).
  Future<List<Notificacion>> _cargarVentasPendientes() async {
    try {
      final ventas = await _adminService.getVentasPendientes();
      return ventas
          .map((v) => Notificacion(
                id: 'venta-${v.idVenta}',
                categoria: 'ventas',
                titulo: 'Venta #${v.idVenta} pendiente de pago',
                detalle: '${v.cliente} · ${formatoPrecioCop(v.total)}',
                enlaceWeb: '/ventas',
                urgente: false,
                fecha: v.fecha,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// pedidos.service.js -> getPedidos({estado:'Pendiente'}) — mismo endpoint
  /// que usa el tab "Pendientes"; se guarda el PedidoAdmin completo para
  /// poder navegar directo a /admin/pedido-detalle al tocar la notificación.
  Future<List<Notificacion>> _cargarPedidos() async {
    try {
      final pedidos = await _adminService.getPedidosPendientes();
      return pedidos
          .map((p) => Notificacion(
                id: 'pedido-${p.idPedido}',
                categoria: 'pedidos',
                titulo: 'Pedido #${p.idPedido} por preparar',
                detalle: '${p.cliente} · ${formatoPrecioCop(p.total)}',
                enlaceWeb: '/pedidos',
                urgente: true,
                fecha: p.fechaActualizacion,
                pedido: p,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// compras.service.js -> getCompras() sin filtro de estado; se filtra acá
  /// por 'Pendiente', igual que cargarNotificacionesCompras() en la web.
  Future<List<Notificacion>> _cargarCompras() async {
    try {
      final compras = await _adminService.getComprasPendientes();
      return compras
          .map((c) => Notificacion(
                id: 'compra-${c.idCompra}',
                categoria: 'compras',
                titulo: 'Compra #${c.idCompra} pendiente',
                detalle:
                    '${c.proveedor.isNotEmpty ? c.proveedor : c.nombreComercial} · ${formatoPrecioCop(c.total)}',
                enlaceWeb: '/compras',
                urgente: false,
                fecha: c.fecha,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }
}
