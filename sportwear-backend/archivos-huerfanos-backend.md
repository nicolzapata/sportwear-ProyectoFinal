| Archivo | Tipo | Motivo | Confianza |
|---|---|---|---|
| src/controllers/pedidoCliente.controller.js | Controlador | No lo requiere ninguna ruta. `routes/ventas.js` usa `crearMiPedido` de `ventas.controller.js` para el mismo flujo (cliente crea su propio pedido); este archivo parece una versión anterior/duplicada nunca conectada. | Alta |
| src/controllers/rol.controller.js | Controlador | No lo requiere ninguna ruta. `routes/roles.js` implementa toda la lógica de roles con SQL crudo directamente sobre `pool`, sin pasar por este controlador ni por `roles.service.js`. | Alta |
| src/controllers/usuario.controller.js | Controlador | No lo requiere ninguna ruta. `routes/usuarios.js` usa `crudFactory` + `auth.controller.js` (crearUsuario/actualizarUsuario) y SQL crudo, no este controlador. | Alta |
| src/controllers/imagenes.controller.js | Controlador | No lo requiere ninguna ruta. `routes/imagenes.js` implementa todos los endpoints con SQL crudo y Cloudinary directamente, sin pasar por este controlador. | Alta |
| src/services/roles.service.js | Servicio | Sólo lo requiere `controllers/rol.controller.js`, que es en sí mismo huérfano (ver arriba); ninguna ruta llega a esta cadena. | Alta |
| src/services/usuarios.service.js | Servicio | Sólo lo requiere `controllers/usuario.controller.js`, que es huérfano; sin ruta que lo alcance. | Alta |
| src/services/imagenes.service.js | Servicio | Sólo lo requiere `controllers/imagenes.controller.js`, que es huérfano; sin ruta que lo alcance. | Alta |
| src/models/rol.model.js | Modelo | Sólo lo requiere `services/roles.service.js`, que es huérfano (cadena rota desde `routes/roles.js`). | Alta |
| src/models/permiso.model.js | Modelo | Sólo lo requiere `services/roles.service.js`, huérfano. | Alta |
| src/models/modulo.model.js | Modelo | Sólo lo requiere `services/roles.service.js`, huérfano. | Alta |
| src/models/usuario.model.js | Modelo | Sólo lo requiere `services/usuarios.service.js`, huérfano. | Alta |
| src/models/imagen.model.js | Modelo | Sólo lo requiere `services/imagenes.service.js`, huérfano. | Alta |
| src/models/barrio.model.js | Modelo | Cero referencias en todo el proyecto. `services/barrios.service.js` usa SQL crudo con `pool` directamente, nunca este modelo. | Alta |
| src/models/catalogo.model.js | Modelo | Cero referencias en todo el proyecto; ningún archivo lo importa. | Alta |
| src/models/categoria.model.js | Modelo | Cero referencias; `services/categorias.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/cliente.model.js | Modelo | Cero referencias; `services/clientes.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/color.model.js | Modelo | Cero referencias; `services/colores.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/compra.model.js | Modelo | Cero referencias; `services/compras.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/pago.model.js | Modelo | Cero referencias; `services/pagos.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/producto.model.js | Modelo | Cero referencias; `services/productos.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/proveedor.model.js | Modelo | Cero referencias; `services/proveedores.service.js` usa SQL crudo, no este modelo. | Alta |
| src/models/venta.model.js | Modelo | Cero referencias; `services/ventas.service.js` usa SQL crudo, no este modelo. | Alta |
