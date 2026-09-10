import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/barrio.dart';
import '../../../shared/models/item_carrito.dart';
import '../../../shared/models/metodo_pago.dart';
import '../../../shared/models/pedido_confirmado.dart';
import '../../../shared/utils/formato_precio.dart';
import '../../carrito/providers/carrito_provider.dart';
import '../services/checkout_service.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  late final Future<({List<MetodoPago> metodos, List<Barrio> barrios})> _future;

  final _direccionController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  Barrio? _barrioSel;
  MetodoPago? _metodoSel;
  bool _enviando = false;
  String? _errorMessage;
  PedidoConfirmado? _pedidoConfirmado;

  @override
  void initState() {
    super.initState();
    final service = context.read<CheckoutService>();
    _future = _cargarOpciones(service);
  }

  Future<({List<MetodoPago> metodos, List<Barrio> barrios})> _cargarOpciones(
    CheckoutService service,
  ) async {
    final resultados = await Future.wait([service.getMetodosPago(), service.getBarrios()]);
    final metodos = resultados[0] as List<MetodoPago>;
    final barrios = resultados[1] as List<Barrio>
      ..sort((a, b) => a.nombre.compareTo(b.nombre));
    return (metodos: metodos, barrios: barrios);
  }

  @override
  void dispose() {
    _direccionController.dispose();
    super.dispose();
  }

  Future<void> _confirmarCompra(List<ItemCarrito> itemsCarrito, double total) async {
    if (!_formKey.currentState!.validate()) return;
    if (_barrioSel == null) {
      setState(() => _errorMessage = 'Selecciona el barrio de entrega.');
      return;
    }
    if (_metodoSel == null) {
      setState(() => _errorMessage = 'Selecciona un método de pago.');
      return;
    }

    setState(() {
      _enviando = true;
      _errorMessage = null;
    });

    try {
      final pedido = await context.read<CheckoutService>().crearPedido(
            items: itemsCarrito,
            total: total,
            direccionEntrega: _direccionController.text.trim(),
            idBarrio: _barrioSel!.idBarrio,
            metodoPago: _metodoSel!.nombre,
          );
      if (!mounted) return;
      context.read<CarritoProvider>().vaciar();
      setState(() => _pedidoConfirmado = pedido);
    } on ApiException catch (e) {
      setState(() => _errorMessage = e.message);
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_pedidoConfirmado != null) {
      return _ConfirmacionPedido(pedido: _pedidoConfirmado!);
    }

    final carrito = context.watch<CarritoProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Confirmar pedido')),
      body: FutureBuilder(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                    const SizedBox(height: 12),
                    const Text('No se pudieron cargar las opciones de compra.'),
                  ],
                ),
              ),
            );
          }

          final metodos = snapshot.data!.metodos;
          final barrios = snapshot.data!.barrios;
          _metodoSel ??= metodos.isNotEmpty ? metodos.first : null;

          return SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Resumen del pedido', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...carrito.items.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  '${item.cantidad}x ${item.nombreProducto} (${item.colorNombre}, ${item.talla})',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(formatoPrecioCop(item.subtotal)),
                            ],
                          ),
                        )),
                    const Divider(color: AppColors.border, height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total', style: TextStyle(fontWeight: FontWeight.w600)),
                        Text(
                          formatoPrecioCop(carrito.total),
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    const Text('Dirección de entrega', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _direccionController,
                      decoration: const InputDecoration(hintText: 'Calle, número, apto...'),
                      validator: (value) => (value == null || value.trim().isEmpty)
                          ? 'La dirección es requerida'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    const Text('Barrio', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    DropdownMenu<Barrio>(
                      width: double.infinity,
                      hintText: 'Selecciona tu barrio',
                      enableSearch: true,
                      initialSelection: _barrioSel,
                      dropdownMenuEntries: barrios
                          .map((b) => DropdownMenuEntry(value: b, label: b.nombre))
                          .toList(),
                      onSelected: (barrio) => setState(() => _barrioSel = barrio),
                    ),
                    const SizedBox(height: 16),
                    const Text('Método de pago', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    RadioGroup<int>(
                      groupValue: _metodoSel?.idMetodo,
                      onChanged: (idMetodo) => setState(
                        () => _metodoSel = metodos.firstWhere((m) => m.idMetodo == idMetodo),
                      ),
                      child: Column(
                        children: metodos
                            .map((metodo) => RadioListTile<int>(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(metodo.nombre),
                                  value: metodo.idMetodo,
                                ))
                            .toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
                      ),
                    ElevatedButton(
                      onPressed: _enviando
                          ? null
                          : () => _confirmarCompra(carrito.items, carrito.total),
                      child: _enviando
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Confirmar compra'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ConfirmacionPedido extends StatelessWidget {
  const _ConfirmacionPedido({required this.pedido});

  final PedidoConfirmado pedido;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pedido confirmado'), automaticallyImplyLeading: false),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_outline, size: 64, color: AppColors.primary),
              const SizedBox(height: 16),
              const Text(
                '¡Pedido confirmado!',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
              ),
              const SizedBox(height: 8),
              Text('Número de pedido: #${pedido.idVenta}'),
              const SizedBox(height: 4),
              Text('Total: ${formatoPrecioCop(pedido.total)}'),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.go('/home'),
                child: const Text('Seguir comprando'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
