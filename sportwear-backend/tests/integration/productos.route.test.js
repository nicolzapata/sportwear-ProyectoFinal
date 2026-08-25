const request = require('supertest');

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../../src/config/db');
const app = require('../../src/app');

describe('GET /api/productos', () => {
  afterEach(() => jest.clearAllMocks());

  it('responde 200 con el listado de productos (ruta pública)', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id_producto: 1, nombre: 'Camiseta', publicado: true }],
    });

    const res = await request(app).get('/api/productos');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id_producto: 1, nombre: 'Camiseta', publicado: true }]);
  });

  it('propaga errores del servicio como 500', async () => {
    pool.query.mockRejectedValueOnce(new Error('fallo de conexión'));

    const res = await request(app).get('/api/productos');

    expect(res.status).toBe(500);
  });
});

describe('POST /api/productos', () => {
  it('requiere autenticación', async () => {
    const res = await request(app).post('/api/productos').send({ nombre: 'Camiseta' });

    expect(res.status).toBe(401);
  });
});
