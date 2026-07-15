// src/controllers/pedidoCliente.controller.js
//
// Controlador para que un Cliente autenticado cree su propio pedido.
//
// Flujo:
//   1. Toma id_cliente del token (nunca del body)
//   2. Verifica que el cliente existe
//   3. Crea la Venta + DetalleVenta + descuenta stock (ventasService.crearVenta)
//   4. Registra el pago en PagosAbonos con el estado que corresponda:
//        estado_venta "Confirmado" → pago "Confirmado"
//        estado_venta "Pendiente"  → pago "Pendiente" (carrito abandonado)
//
const ventasService = require('../services/ventas.service');
const pagosService  = require('../services/pagos.service');
const pool          = require('../config/db');

const crearPedidoCliente = async (req, res) => {
  try {
    const id_cliente = req.usuario.id_cliente;

    if (!id_cliente)
      return res.status(403).json({ message: 'Tu cuenta no tiene un cliente asociado.' });

    // 1. Verificar que el cliente existe
    const clienteRes = await pool.query(
      `SELECT id_cliente FROM "Clientes" WHERE id_cliente = $1`,
      [id_cliente]
    );
    if (!clienteRes.rows.length)
      return res.status(404).json({ message: 'Cliente no encontrado.' });

    // Guardar permiso_cuotas en req para uso posterior
    req.permiso_cuotas = clienteRes.rows[0].permiso_cuotas;

    // 2. Extraer datos del body
    const {
      items,             // [{ id_producto, cantidad, precio_unitario }]
      direccion_entrega,
      metodo_pago,       // 'Efectivo' | 'Transferencia' | 'Tarjeta'
      estado_venta,      // 'Confirmado' | 'Pendiente'
    } = req.body;

    if (!items?.length)
      return res.status(400).json({ message: 'El carrito está vacío.' });

    const estado = estado_venta || 'Pendiente';
    const fecha  = new Date().toISOString().split('T')[0];

    // 3. Crear Venta + DetalleVenta en una sola transacción (lógica ya existente)
    const venta = await ventasService.crearVenta({
      id_cliente,
      descuento:    0,
      impuesto:     0,
      estado,
      fecha,
      observaciones: direccion_entrega
        ? `Dirección de entrega: ${direccion_entrega}`
        : null,
      items: items.map(i => ({
        id_producto:     i.id_producto ?? i.id,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario ?? i.precio,
        descuento_linea: 0,
      })),
    });

    // 4. Registrar pago usando el service existente
    await pagosService.crearPago({
      id_venta:        venta.id_venta,
      monto:           venta.total,
      tipo:            'Pago completo',
      metodo:          estado === 'Confirmado' ? (metodo_pago || 'Efectivo') : '—',
      referencia_pago: null,
      estado:          estado === 'Confirmado' ? 'Confirmado' : 'Pendiente',
      fecha,
    });

    return res.status(201).json({
      ok:       true,
      id_venta: venta.id_venta,
      total:    venta.total,
      estado,
    });

  } catch (err) {
    console.error('crearPedidoCliente:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Error interno.' });
  }
};

module.exports = { crearPedidoCliente };