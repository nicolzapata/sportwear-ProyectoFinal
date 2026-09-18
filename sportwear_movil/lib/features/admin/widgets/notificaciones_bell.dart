import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/notificacion.dart';
import '../../../shared/utils/tiempo_relativo.dart';
import '../providers/notificaciones_provider.dart';

/// Campana del panel admin: mismo comportamiento que NotificacionesDropdown.jsx
/// en la web — al abrir el panel se recarga Y se marca todo como visto (no
/// solo lo que se toca), y el badge desaparece si no hay pendientes.
class NotificacionesBell extends StatelessWidget {
  const NotificacionesBell({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificacionesProvider>();
    final noLeidas = provider.noLeidas;

    return IconButton(
      tooltip: 'Notificaciones',
      onPressed: () => _abrirPanel(context, provider),
      icon: Badge(
        isLabelVisible: noLeidas > 0,
        label: Text(noLeidas > 9 ? '9+' : '$noLeidas'),
        child: const Icon(Icons.notifications_outlined),
      ),
    );
  }

  Future<void> _abrirPanel(BuildContext context, NotificacionesProvider provider) async {
    // Igual que el useEffect de la web al abrir: marca vistas las ya
    // cargadas y dispara una recarga (que puede traer notificaciones
    // nuevas, que sí volverían a contar).
    provider.marcarTodoVisto();
    provider.cargar();

    final tocada = await showModalBottomSheet<Notificacion>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ChangeNotifierProvider.value(
        value: provider,
        child: const _PanelNotificaciones(),
      ),
    );

    if (tocada == null || !context.mounted) return;
    try {
      if (tocada.categoria == 'pedidos' && tocada.pedido != null) {
        await context.push('/admin/pedido-detalle', extra: tocada.pedido);
      } else {
        // Sin pantalla propia de Productos/Ventas/Compras en el móvil (fuera
        // de alcance desde la Fase 6) — se lleva al Resumen del panel admin,
        // el destino ya construido más cercano a esa categoría.
        context.go('/admin');
      }
    } catch (_) {
      // _abrirPanel se invoca desde un IconButton.onPressed síncrono — si
      // esto no se atrapa acá, cualquier excepción durante la navegación
      // (por ejemplo, un estado transitorio del Navigator justo tras cerrar
      // el modal) queda como una excepción no manejada: no rompe la app,
      // pero tampoco se ve nada, exactamente el síntoma de "no pasa nada al
      // tocar la notificación". Con esto, en vez de fallar en silencio, se
      // avisa y se puede reintentar.
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo abrir. Intenta de nuevo.')),
        );
      }
    }
  }
}

class _PanelNotificaciones extends StatelessWidget {
  const _PanelNotificaciones();

  IconData _iconoPara(String categoria) {
    switch (categoria) {
      case 'inventario':
        return Icons.warning_amber_rounded;
      case 'pedidos':
        return Icons.local_shipping_outlined;
      case 'compras':
        return Icons.inventory_2_outlined;
      case 'ventas':
        return Icons.attach_money;
      default:
        return Icons.warning_amber_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificacionesProvider>();
    final items = [...provider.items]..sort((a, b) => b.fecha.compareTo(a.fecha));

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return SafeArea(
          child: items.isEmpty
              ? const Center(child: Text('No hay notificaciones.'))
              : ListView.separated(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: items.length,
                  separatorBuilder: (_, _) => Divider(height: 1, color: AppColors.border),
                  itemBuilder: (context, index) {
                    final n = items[index];
                    return ListTile(
                      leading: Icon(
                        _iconoPara(n.categoria),
                        color: n.urgente ? AppColors.error : AppColors.textSecondary,
                      ),
                      title: Text(n.titulo, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${n.detalle}\n${tiempoRelativo(n.fecha)}'),
                      isThreeLine: true,
                      onTap: () => Navigator.of(context).pop(n),
                    );
                  },
                ),
        );
      },
    );
  }
}
