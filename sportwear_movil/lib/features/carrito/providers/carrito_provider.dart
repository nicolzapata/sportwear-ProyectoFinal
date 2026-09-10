import 'package:flutter/foundation.dart';

import '../../../shared/models/item_carrito.dart';

/// Carrito en memoria, accesible sin sesión (como invitada). No se persiste
/// en disco por ahora — vive mientras la app esté abierta.
class CarritoProvider extends ChangeNotifier {
  final List<ItemCarrito> _items = [];

  List<ItemCarrito> get items => List.unmodifiable(_items);

  int get totalItems => _items.fold(0, (suma, i) => suma + i.cantidad);

  double get total => _items.fold(0.0, (suma, i) => suma + i.subtotal);

  bool get estaVacio => _items.isEmpty;

  /// Si ya existe una línea para esa variante, suma cantidades (respetando el
  /// stock disponible) en vez de duplicar la línea.
  void agregar(ItemCarrito nuevo) {
    final index = _items.indexWhere((i) => i.idVariante == nuevo.idVariante);
    if (index >= 0) {
      final existente = _items[index];
      final cantidad = (existente.cantidad + nuevo.cantidad).clamp(1, existente.stockDisponible);
      _items[index] = existente.copyWith(cantidad: cantidad);
    } else {
      _items.add(nuevo);
    }
    notifyListeners();
  }

  /// cantidad <= 0 quita la línea del carrito.
  void actualizarCantidad(int idVariante, int cantidad) {
    final index = _items.indexWhere((i) => i.idVariante == idVariante);
    if (index < 0) return;
    if (cantidad <= 0) {
      _items.removeAt(index);
    } else {
      _items[index] = _items[index].copyWith(
        cantidad: cantidad.clamp(1, _items[index].stockDisponible),
      );
    }
    notifyListeners();
  }

  void quitar(int idVariante) {
    _items.removeWhere((i) => i.idVariante == idVariante);
    notifyListeners();
  }

  void vaciar() {
    _items.clear();
    notifyListeners();
  }
}
