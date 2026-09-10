/// Usuario autenticado. `rol`, `estado`, `idCliente`, `modulos` y `permisos`
/// solo vienen en la respuesta de login; en el registro el backend responde
/// apenas id/nombre/email, por eso son nullable.
class Usuario {
  Usuario({
    required this.idUsuario,
    required this.nombre,
    required this.email,
    this.rol,
    this.estado,
    this.idCliente,
    this.modulos = const [],
    this.permisos = const [],
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      idUsuario: json['id_usuario'] as int,
      nombre: json['nombre'] as String,
      email: json['email'] as String,
      rol: json['rol'] as String?,
      estado: json['estado'] as String?,
      idCliente: json['id_cliente'] as int?,
      modulos: (json['modulos'] as List?)?.cast<String>() ?? const [],
      permisos: (json['permisos'] as List?)?.cast<String>() ?? const [],
    );
  }

  final int idUsuario;
  final String nombre;
  final String email;
  final String? rol;
  final String? estado;
  final int? idCliente;
  final List<String> modulos;
  final List<String> permisos;
}
