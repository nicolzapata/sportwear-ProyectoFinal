import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/theme/app_theme.dart';
import '../../../shared/models/perfil_cliente.dart';
import '../services/perfil_service.dart';

/// Solo lectura: GET /api/clientes/mi-perfil. La edición (PUT /mi-perfil)
/// existe en el backend pero se deja fuera de esta fase a propósito.
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
    return Scaffold(
      appBar: AppBar(title: const Text('Mi perfil')),
      body: FutureBuilder<PerfilCliente>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            final mensaje = snapshot.error is ApiException
                ? (snapshot.error as ApiException).message
                : 'No se pudo cargar tu perfil.';
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: AppColors.textSecondary),
                    const SizedBox(height: 12),
                    Text(mensaje, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    TextButton(onPressed: _recargar, child: const Text('Reintentar')),
                  ],
                ),
              ),
            );
          }

          final perfil = snapshot.data!;
          final documento = [
            if (perfil.tipoDoc != null) perfil.tipoDoc,
            if (perfil.documento != null) perfil.documento,
          ].join(' ');
          final ubicacion = [
            if (perfil.direccion != null && perfil.direccion!.isNotEmpty) perfil.direccion,
            if (perfil.barrioNombre != null) perfil.barrioNombre,
            if (perfil.ciudad != null) perfil.ciudad,
          ].join(', ');

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _CampoPerfil(icono: Icons.person_outline, etiqueta: 'Nombre', valor: perfil.nombre),
              _CampoPerfil(icono: Icons.email_outlined, etiqueta: 'Correo', valor: perfil.email),
              _CampoPerfil(
                icono: Icons.badge_outlined,
                etiqueta: 'Documento',
                valor: documento.isEmpty ? '—' : documento,
              ),
              _CampoPerfil(
                icono: Icons.phone_outlined,
                etiqueta: 'Teléfono',
                valor: perfil.telefono?.isNotEmpty == true ? perfil.telefono! : '—',
              ),
              _CampoPerfil(
                icono: Icons.location_on_outlined,
                etiqueta: 'Dirección',
                valor: ubicacion.isEmpty ? '—' : ubicacion,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CampoPerfil extends StatelessWidget {
  const _CampoPerfil({required this.icono, required this.etiqueta, required this.valor});

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
        side: const BorderSide(color: AppColors.border),
      ),
      child: ListTile(
        leading: Icon(icono, color: AppColors.textSecondary),
        title: Text(etiqueta, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        subtitle: Text(valor, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }
}
