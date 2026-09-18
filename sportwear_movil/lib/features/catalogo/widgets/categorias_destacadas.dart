import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/models/categoria.dart';

/// "Explora por categoría" — equivalente a CategoriasDestacadas.jsx: una
/// tarjeta por categoría con la foto del primer producto publicado de esa
/// categoría (ver CatalogoProvider.categoriasDestacadas), nombre superpuesto.
///
/// En la web el nombre solo aparece al pasar el mouse (`:hover`) — un touch
/// no tiene hover, así que acá el overlay+nombre quedan siempre visibles;
/// es la adaptación mínima a una pantalla táctil, no contenido inventado.
class CategoriasDestacadas extends StatelessWidget {
  const CategoriasDestacadas({super.key, required this.items, required this.onTap});

  final List<CategoriaConImagen> items;
  final ValueChanged<int> onTap;

  static const _anchoMinimoTarjeta = 140.0;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
          child: Text(
            'Explora por categoría',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w500),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final columnas = (constraints.maxWidth / _anchoMinimoTarjeta).floor().clamp(2, 4);
              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columnas,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  // aspect-ratio: 3/4 en .cat-tile.
                  childAspectRatio: 3 / 4,
                ),
                itemBuilder: (context, index) {
                  final item = items[index];
                  return _CategoriaTile(
                    item: item,
                    onTap: () => onTap(item.categoria.idCategoria),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CategoriaTile extends StatelessWidget {
  const _CategoriaTile({required this.item, required this.onTap});

  final CategoriaConImagen item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      // --r efectivo de la web: 4px (global.css lo redeclara con el mismo
      // valor que index.css, así que no hay pisada de por medio acá).
      borderRadius: BorderRadius.circular(4),
      child: Material(
        color: AppColors.surfaceAlt,
        child: InkWell(
          onTap: onTap,
          child: Stack(
            fit: StackFit.expand,
            children: [
              CachedNetworkImage(
                imageUrl: item.imagenUrl,
                fit: BoxFit.cover,
                // object-position: center 20% en .cat-tile img.
                alignment: const Alignment(0, -0.6),
                placeholder: (context, url) => ColoredBox(color: AppColors.surfaceAlt),
                errorWidget: (context, url, error) => ColoredBox(color: AppColors.surfaceAlt),
              ),
              DecoratedBox(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    stops: [0.55, 1],
                    colors: [Colors.transparent, Color(0xC72C2218)],
                  ),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12, left: 6, right: 6),
                  child: Text(
                    item.categoria.nombre.toUpperCase(),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.1,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
