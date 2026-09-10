import '../utils/parse_num.dart';

/// El bloque `stats` de GET /api/dashboard (dashboard.service.js ->
/// getResumen). Solo se modela `stats` — el resumen "de guardia" no incluye
/// las listas de topProductos/ventasRecientes/clientesRecientes/
/// productosBajoStock, que son más gestión (clientes/productos) que un
/// resumen rápido de guardia.
class DashboardResumen {
  DashboardResumen({
    required this.ventasHoy,
    required this.ingresosHoy,
    required this.pedidosPendientes,
    required this.ingresosTotales,
    required this.ventasTotales,
    required this.ticketPromedio,
    required this.bajoStock,
    required this.clientesActivos,
  });

  factory DashboardResumen.fromJson(Map<String, dynamic> json) {
    return DashboardResumen(
      ventasHoy: parseInt(json['ventas_hoy']),
      ingresosHoy: parseDouble(json['ingresos_hoy']),
      pedidosPendientes: parseInt(json['pedidos_pendientes']),
      ingresosTotales: parseDouble(json['ingresos_totales']),
      ventasTotales: parseInt(json['ventas_totales']),
      ticketPromedio: parseDouble(json['ticket_promedio']),
      bajoStock: parseInt(json['bajo_stock']),
      clientesActivos: parseInt(json['clientes_activos']),
    );
  }

  final int ventasHoy;
  final double ingresosHoy;
  final int pedidosPendientes;
  final double ingresosTotales;
  final int ventasTotales;
  final double ticketPromedio;
  final int bajoStock;
  final int clientesActivos;
}
