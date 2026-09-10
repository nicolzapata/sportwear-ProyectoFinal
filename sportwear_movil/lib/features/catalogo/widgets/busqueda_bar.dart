import 'package:flutter/material.dart';

/// Barra de búsqueda del catálogo. El filtrado es del lado del cliente
/// (ver [CatalogoProvider.productosFiltrados]), así que no hace debounce
/// de red: cada cambio solo recalcula la lista ya cargada en memoria.
class BusquedaBar extends StatelessWidget {
  const BusquedaBar({super.key, required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      onChanged: onChanged,
      decoration: const InputDecoration(
        hintText: 'Buscar productos...',
        prefixIcon: Icon(Icons.search),
      ),
    );
  }
}
