import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/barrio.dart';
import '../../../shared/models/perfil_cliente.dart';
import '../services/perfil_service.dart';

/// GET /api/clientes/mi-perfil para mostrar, PUT /api/clientes/mi-perfil para
/// editar. El backend (clientes.service.js -> actualizarMiPerfil) solo
/// acepta nombre/telefono/id_barrio/direccion/ciudad — documento, tipo_doc y
/// email nunca están en el body que procesa, así que siempre se muestran de
/// solo lectura, editando o no.
class MiPerfilScreen extends StatefulWidget {
  const MiPerfilScreen({super.key});

  @override
  State<MiPerfilScreen> createState() => _MiPerfilScreenState();
}

class _MiPerfilScreenState extends State<MiPerfilScreen> {
  late Future<PerfilCliente> _future;

  @override
  void initState() {
    super.initState();
    _future = context.read<PerfilService>().getMiPerfil();
  }

  Future<void> _recargar() async {
    final service = context.read<PerfilService>();
    setState(() => _future = service.getMiPerfil());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PerfilCliente>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return Scaffold(
            appBar: AppBar(title: const Text('Mi perfil')),
            body: const Center(child: CircularProgressIndicator()),
          );
        }
        if (snapshot.hasError) {
          final mensaje = snapshot.error is ApiException
              ? (snapshot.error as ApiException).message
              : 'No se pudo cargar tu perfil.';
          return Scaffold(
            appBar: AppBar(title: const Text('Mi perfil')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                    const SizedBox(height: 12),
                    Text(mensaje, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    TextButton(onPressed: _recargar, child: const Text('Reintentar')),
                  ],
                ),
              ),
            ),
          );
        }

        return _PerfilContenido(perfilInicial: snapshot.data!);
      },
    );
  }
}

class _PerfilContenido extends StatefulWidget {
  const _PerfilContenido({required this.perfilInicial});

  final PerfilCliente perfilInicial;

  @override
  State<_PerfilContenido> createState() => _PerfilContenidoState();
}

class _PerfilContenidoState extends State<_PerfilContenido> {
  final _formKey = GlobalKey<FormState>();

  late PerfilCliente _perfil = widget.perfilInicial;
  late final _nombreController = TextEditingController(text: _perfil.nombre);
  late final _telefonoController = TextEditingController(text: _perfil.telefono ?? '');
  late final _direccionController = TextEditingController(text: _perfil.direccion ?? '');
  late final _ciudadController = TextEditingController(text: _perfil.ciudad ?? '');

  bool _editando = false;
  bool _cargandoBarrios = false;
  bool _guardando = false;
  String? _error;
  List<Barrio> _barrios = [];
  Barrio? _barrioSel;

  @override
  void dispose() {
    _nombreController.dispose();
    _telefonoController.dispose();
    _direccionController.dispose();
    _ciudadController.dispose();
    super.dispose();
  }

  Future<void> _iniciarEdicion() async {
    setState(() {
      _cargandoBarrios = true;
      _error = null;
    });
    try {
      final barrios = await context.read<PerfilService>().getBarrios();
      barrios.sort((a, b) => a.nombre.compareTo(b.nombre));
      Barrio? actual;
      for (final b in barrios) {
        if (b.idBarrio == _perfil.idBarrio) {
          actual = b;
          break;
        }
      }
      if (!mounted) return;
      setState(() {
        _barrios = barrios;
        _barrioSel = actual;
        _editando = true;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _cargandoBarrios = false);
    }
  }

  void _cancelarEdicion() {
    setState(() {
      _editando = false;
      _error = null;
      _nombreController.text = _perfil.nombre;
      _telefonoController.text = _perfil.telefono ?? '';
      _direccionController.text = _perfil.direccion ?? '';
      _ciudadController.text = _perfil.ciudad ?? '';
    });
  }

  Future<void> _guardar() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _guardando = true;
      _error = null;
    });
    try {
      // Se vuelve a pedir /mi-perfil después del PUT (dentro del service):
      // la respuesta del PUT no trae barrio_nombre/zona, así que lo que se
      // muestra siempre sale de la fuente completa, no de lo que se escribió.
      final actualizado = await context.read<PerfilService>().actualizarMiPerfil(
            nombre: _nombreController.text.trim(),
            telefono: _telefonoController.text.trim(),
            direccion: _direccionController.text.trim(),
            ciudad: _ciudadController.text.trim(),
            idBarrio: _barrioSel?.idBarrio,
          );
      if (!mounted) return;
      setState(() {
        _perfil = actualizado;
        _editando = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil actualizado')),
      );
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _guardando = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final documento = [
      if (_perfil.tipoDoc != null) _perfil.tipoDoc,
      if (_perfil.documento != null) _perfil.documento,
    ].join(' ');
    final ubicacion = [
      if (_perfil.direccion != null && _perfil.direccion!.isNotEmpty) _perfil.direccion,
      if (_perfil.barrioNombre != null) _perfil.barrioNombre,
      if (_perfil.ciudad != null) _perfil.ciudad,
    ].join(', ');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mi perfil'),
        actions: [
          if (!_editando)
            IconButton(
              icon: _cargandoBarrios
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.edit_outlined),
              tooltip: 'Editar',
              onPressed: _cargandoBarrios ? null : _iniciarEdicion,
            )
          else ...[
            IconButton(
              icon: const Icon(Icons.close),
              tooltip: 'Cancelar',
              onPressed: _guardando ? null : _cancelarEdicion,
            ),
            IconButton(
              icon: _guardando
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.check),
              tooltip: 'Guardar',
              onPressed: _guardando ? null : _guardar,
            ),
          ],
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_error!, style: TextStyle(color: AppColors.error)),
                ),
              // Solo lectura siempre: el backend nunca los toma del body de edición.
              _CampoSoloLectura(
                icono: Icons.email_outlined,
                etiqueta: 'Correo (no editable)',
                valor: _perfil.email,
              ),
              _CampoSoloLectura(
                icono: Icons.badge_outlined,
                etiqueta: 'Documento (no editable)',
                valor: documento.isEmpty ? '—' : documento,
              ),
              const SizedBox(height: 8),
              if (!_editando) ...[
                _CampoSoloLectura(icono: Icons.person_outline, etiqueta: 'Nombre', valor: _perfil.nombre),
                _CampoSoloLectura(
                  icono: Icons.phone_outlined,
                  etiqueta: 'Teléfono',
                  valor: _perfil.telefono?.isNotEmpty == true ? _perfil.telefono! : '—',
                ),
                _CampoSoloLectura(
                  icono: Icons.location_on_outlined,
                  etiqueta: 'Dirección',
                  valor: ubicacion.isEmpty ? '—' : ubicacion,
                ),
              ] else ...[
                TextFormField(
                  controller: _nombreController,
                  decoration: const InputDecoration(labelText: 'Nombre'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'El nombre es requerido' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _telefonoController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Teléfono'),
                  validator: (v) => (v == null || v.isEmpty || RegExp(r'^\d+$').hasMatch(v))
                      ? null
                      : 'El teléfono solo debe contener números',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _direccionController,
                  decoration: const InputDecoration(labelText: 'Dirección'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _ciudadController,
                  decoration: const InputDecoration(labelText: 'Ciudad'),
                ),
                const SizedBox(height: 16),
                const Text('Barrio', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                DropdownMenu<Barrio>(
                  width: double.infinity,
                  hintText: 'Selecciona tu barrio',
                  enableSearch: true,
                  initialSelection: _barrioSel,
                  dropdownMenuEntries:
                      _barrios.map((b) => DropdownMenuEntry(value: b, label: b.nombre)).toList(),
                  onSelected: (barrio) => setState(() => _barrioSel = barrio),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CampoSoloLectura extends StatelessWidget {
  const _CampoSoloLectura({required this.icono, required this.etiqueta, required this.valor});

  final IconData icono;
  final String etiqueta;
  final String valor;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.surface,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        leading: Icon(icono, color: AppColors.textSecondary),
        title: Text(etiqueta, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        subtitle: Text(valor, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}
