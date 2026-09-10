import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/item_carrito.dart';
import '../../../shared/utils/formato_precio.dart';

/// Fila del carrito: imagen, nombre + variante, cantidad editable, subtotal.
class CarritoItemTile extends StatelessWidget {
  const CarritoItemTile({
    super.key,
    required this.item,
    required this.onCantidadCambiada,
    required this.onQuitar,
  });

  final ItemCarrito item;
  final ValueChanged<int> onCantidadCambiada;
  final VoidCallback onQuitar;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 72,
                height: 72,
                child: item.imagenUrl == null
                    ? const ColoredBox(
                        color: AppColors.background,
                        child: Icon(Icons.image_not_supported_outlined, color: AppColors.textSecondary),
                      )
                    : CachedNetworkImage(
                        imageUrl: item.imagenUrl!,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => const ColoredBox(color: AppColors.background),
                        errorWidget: (context, url, error) => const ColoredBox(
                          color: AppColors.background,
                          child: Icon(Icons.broken_image_outlined, color: AppColors.textSecondary),
                        ),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.nombreProducto,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${item.colorNombre} · Talla ${item.talla}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _BotonCantidad(
                        icono: Icons.remove,
                        onPressed: () => onCantidadCambiada(item.cantidad - 1),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('${item.cantidad}'),
                      ),
                      _BotonCantidad(
                        icono: Icons.add,
                        onPressed: item.cantidad >= item.stockDisponible
                            ? null
                            : () => onCantidadCambiada(item.cantidad + 1),
                      ),
                      const Spacer(),
                      Text(
                        formatoPrecioCop(item.subtotal),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: AppColors.textSecondary),
              tooltip: 'Quitar',
              onPressed: onQuitar,
            ),
          ],
        ),
      ),
    );
  }
}

class _BotonCantidad extends StatelessWidget {
  const _BotonCantidad({required this.icono, required this.onPressed});

  final IconData icono;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onPressed,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.border),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(
          icono,
          size: 16,
          color: onPressed == null ? AppColors.border : AppColors.textPrimary,
        ),
      ),
    );
  }
}
