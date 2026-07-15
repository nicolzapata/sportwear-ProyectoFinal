// src/services/clientes.service.js
const pool = require('../config/db');
const { validarCamposNumericos } = require('../utils/validarNumerico');
const { enviarCorreo } = require('./mailer.service');

const getClientes = async () => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    ORDER BY cl.id_cliente DESC
  `);
  return result.rows;
};

const getClientesConVentas = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `AND (cl.nombre ILIKE $${params.length} OR cl.documento ILIKE $${params.length})`;
  }

  const paginar = page !== undefined;
  let limitOffsetSql = '';
  if (paginar) {
    const pagina = Math.max(parseInt(page) || 1, 1);
    const limite = Math.max(parseInt(limit) || 10, 1);
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);
    limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona,
           COUNT(v.id_venta) AS total_compras,
           COALESCE(SUM(v.total::numeric), 0) AS total_gastado
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    LEFT JOIN "Ventas" v ON cl.id_cliente = v.id_cliente AND v.estado NOT IN ('Abandonado', 'Pendiente')
    WHERE 1=1 ${busquedaSql}
    GROUP BY cl.id_cliente, b.nombre, b.zona
    HAVING COUNT(v.id_venta) > 0
    ORDER BY total_gastado DESC
    ${limitOffsetSql}
  `, params);

  if (!paginar) return result.rows;
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

const debugClientesVentas = async () => {
  const clientes = await pool.query(`SELECT id_cliente, nombre, documento FROM "Clientes" ORDER BY id_cliente`);
  const ventas = await pool.query(`SELECT id_venta, id_cliente, total, fecha FROM "Ventas" ORDER BY id_venta DESC LIMIT 20`);
  return { clientes: clientes.rows, ventas: ventas.rows };
};

const getClienteById = async (id) => {
  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
    FROM "Clientes" cl
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    WHERE cl.id_cliente = $1
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

// Crea un cliente y, en la misma transacción, su cuenta de acceso (Usuarios),
// igual que el registro público (ver auth.service.js -> registro()).
const crearCliente = async (datos) => {
  const { nombre, tipo_doc, documento, telefono, ciudad, id_barrio, direccion, permiso_cuotas, estado, contrasena } = datos;
  const email = (datos.email || '').trim().toLowerCase();
  if (!nombre || !documento) throw { status: 400, message: 'Nombre y documento son requeridos' };
  if (!email || !contrasena) throw { status: 400, message: 'Correo y contraseña son requeridos' };
  validarCamposNumericos({ documento, teléfono: telefono });

  const client = await pool.connect();
  try {
    const emailExiste = await client.query(`SELECT id_usuario FROM "Usuarios" WHERE LOWER(email) = $1`, [email]);
    if (emailExiste.rows.length > 0)
      throw { status: 409, message: 'El email ya está registrado' };

    const emailClienteExiste = await client.query(`SELECT id_cliente FROM "Clientes" WHERE LOWER(email) = $1`, [email]);
    if (emailClienteExiste.rows.length > 0)
      throw { status: 409, message: 'El email ya está registrado' };

    const docExiste = await client.query(`SELECT id_cliente FROM "Clientes" WHERE documento = $1`, [documento]);
    if (docExiste.rows.length > 0)
      throw { status: 409, message: 'El documento ya está registrado' };

    const rolResult = await client.query(`SELECT id_rol FROM "Roles" WHERE LOWER(nombre) = 'cliente'`);
    const id_rol_cliente = rolResult.rows[0]?.id_rol;
    if (!id_rol_cliente) throw { status: 500, message: 'No se encontró el rol "Cliente"' };

    await client.query('BEGIN');

    const nuevoCliente = await client.query(`
      INSERT INTO "Clientes"
        (nombre, tipo_doc, documento, telefono, email, ciudad, id_barrio, direccion, permiso_cuotas, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [
      nombre, tipo_doc || 'CC', documento, telefono || null, email,
      ciudad || 'Medellín', id_barrio || null, direccion || null,
      permiso_cuotas !== undefined ? permiso_cuotas : true,
      estado || 'Activo',
    ]);
    const cliente = nuevoCliente.rows[0];

    await client.query(
      `INSERT INTO "Usuarios" (nombre, email, password_hash, id_rol, id_cliente)
       VALUES ($1, $2, crypt($3, gen_salt('bf',12)), $4, $5)`,
      [nombre, email, contrasena, id_rol_cliente, cliente.id_cliente]
    );

    await client.query('COMMIT');

    enviarCorreo({
      to: email,
      subject: 'Bienvenido a DVNA SportWear',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#b49780">DVNA SportWear</h2>
          <p>Hola ${nombre},</p>
          <p>Tu cuenta fue creada exitosamente con el correo <strong>${email}</strong>.</p>
          <p>Ya puedes iniciar sesión y comenzar a comprar en nuestro catálogo.</p>
          <a href="${process.env.FRONTEND_URL}/login"
             style="display:inline-block;padding:12px 24px;background:#b49780;color:#fff;
                    border-radius:6px;text-decoration:none;margin:16px 0">
            Ir a mi cuenta
          </a>
        </div>
      `,
    });

    return cliente;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const actualizarCliente = async (id, datos) => {
  // La identificación (tipo_doc/documento) y el email no se pueden modificar una vez creados.
  const { nombre, telefono, id_barrio, direccion, permiso_cuotas, estado } = datos;
  validarCamposNumericos({ teléfono: telefono });
  const campos = [];
  const valores = [];
  let idx = 1;
  if (nombre !== undefined) { campos.push(`nombre = $${idx++}`); valores.push(nombre); }
  if (telefono !== undefined) { campos.push(`telefono = $${idx++}`); valores.push(telefono); }
  if (id_barrio !== undefined) { campos.push(`id_barrio = $${idx++}`); valores.push(id_barrio); }
  if (direccion !== undefined) { campos.push(`direccion = $${idx++}`); valores.push(direccion); }
  if (permiso_cuotas !== undefined) { campos.push(`permiso_cuotas = $${idx++}`); valores.push(permiso_cuotas); }
  if (estado !== undefined) { campos.push(`estado = $${idx++}`); valores.push(estado); }
  if (campos.length === 0) return { id_cliente: id };
  valores.push(id);
  const query = `UPDATE "Clientes" SET ${campos.join(', ')} WHERE id_cliente = $${idx} RETURNING *`;
  const result = await pool.query(query, valores);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};

const toggleEstado = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes"
    SET estado = CASE WHEN estado='Activo' THEN 'Inactivo' ELSE 'Activo' END
    WHERE id_cliente = $1 RETURNING id_cliente, estado
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const togglePermisoCuotas = async (id) => {
  const result = await pool.query(`
    UPDATE "Clientes" SET permiso_cuotas = NOT permiso_cuotas
    WHERE id_cliente = $1 RETURNING id_cliente, permiso_cuotas
  `, [id]);
  if (!result.rows.length) throw { status: 404, message: 'No encontrado' };
  return result.rows[0];
};

const actualizarMiPerfil = async (id, datos) => {
  const { nombre, telefono, id_barrio, direccion, ciudad } = datos;
  validarCamposNumericos({ teléfono: telefono });
  const result = await pool.query(`
    UPDATE "Clientes" SET
      nombre    = COALESCE($1, nombre),
      telefono  = COALESCE($2, telefono),
      id_barrio = COALESCE($3, id_barrio),
      direccion = COALESCE($4, direccion),
      ciudad    = COALESCE($5, ciudad)
    WHERE id_cliente = $6 RETURNING *
  `, [nombre, telefono, id_barrio, direccion, ciudad, id]);
  if (!result.rows.length) throw { status: 404, message: 'Cliente no encontrado' };
  return result.rows[0];
};
const getClientesRolCliente = async ({ page, limit, q } = {}) => {
  const params = [];
  let busquedaSql = '';
  if (q) {
    params.push(`%${q}%`);
    busquedaSql = `AND (cl.nombre ILIKE $${params.length} OR cl.documento ILIKE $${params.length})`;
  }

  const paginar = page !== undefined;
  let limitOffsetSql = '';
  if (paginar) {
    const pagina = Math.max(parseInt(page) || 1, 1);
    const limite = Math.max(parseInt(limit) || 10, 1);
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);
    limitOffsetSql = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const result = await pool.query(`
    SELECT cl.*, b.nombre AS barrio_nombre, b.zona
           ${paginar ? ', COUNT(*) OVER() AS total_count' : ''}
    FROM "Clientes" cl
    INNER JOIN "Usuarios" u ON cl.id_cliente = u.id_cliente
    LEFT JOIN "Barrios" b ON cl.id_barrio = b.id_barrio
    WHERE u.id_rol = 2 ${busquedaSql}
    ORDER BY cl.id_cliente DESC
    ${limitOffsetSql}
  `, params);

  if (!paginar) return result.rows;
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  const data = result.rows.map(({ total_count, ...r }) => r);
  return { data, total };
};

module.exports = { getClientes, getClientesConVentas, getClienteById, crearCliente, actualizarCliente, toggleEstado, togglePermisoCuotas, actualizarMiPerfil, debugClientesVentas, getClientesRolCliente };