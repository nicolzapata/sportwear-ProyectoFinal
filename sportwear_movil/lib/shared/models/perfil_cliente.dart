import '../utils/parse_num.dart';

/// GET /api/clientes/mi-perfil (verificarToken; usa el id_cliente del JWT —
/// clientes.controller.js -> getMiPerfil -> clientesService.getClienteById).
/// Existe también PUT /api/clientes/mi-perfil (actualizarMiPerfil) para
/// auto-edición, pero esta fase es solo de lectura, así que no se usa aquí.
class PerfilCliente {
  PerfilCliente({
    required this.idCliente,
    required this.nombre,
    required this.email,
    this.tipoDoc,
    this.documento,
    this.telefono,
    this.ciudad,
    this.direccion,
    this.barrioNombre,
  });

  factory PerfilCliente.fromJson(Map<String, dynamic> json) {
    return PerfilCliente(
      idCliente: parseInt(json['id_cliente']),
      nombre: json['nombre'] as String? ?? '',
      email: json['email'] as String? ?? '',
      tipoDoc: json['tipo_doc'] as String?,
      documento: json['documento'] as String?,
      telefono: json['telefono'] as String?,
      ciudad: json['ciudad'] as String?,
      direccion: json['direccion'] as String?,
      barrioNombre: json['barrio_nombre'] as String?,
    );
  }

  final int idCliente;
  final String nombre;
  final String email;
  final String? tipoDoc;
  final String? documento;
  final String? telefono;
  final String? ciudad;
  final String? direccion;
  final String? barrioNombre;
}
