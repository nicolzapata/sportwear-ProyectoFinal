const pool = require('../../../../src/config/db');
const productosService = require('../../../../src/services/productos.service');

jest.mock('../../../../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

describe('productos.service', () => {
  afterEach(() => jest.clearAllMocks());

  describe('getProductos', () => {
    it('devuelve el array plano de filas cuando no se pagina', async () => {
      const filas = [{ id_producto: 1, nombre: 'Camiseta' }];
      pool.query.mockResolvedValueOnce({ rows: filas });

      const resultado = await productosService.getProductos({ publicado: 'true' });

      expect(resultado).toEqual(filas);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('devuelve { data, total } cuando se envía "page"', async () => {
      const filas = [{ id_producto: 1, nombre: 'Camiseta', total_count: '2' }];
      pool.query.mockResolvedValueOnce({ rows: filas });

      const resultado = await productosService.getProductos({ page: 1, limit: 10 });

      expect(resultado.total).toBe(2);
      expect(resultado.data[0]).not.toHaveProperty('total_count');
    });
  });

  describe('crearProducto', () => {
    it('lanza 400 si falta el nombre', async () => {
      await expect(productosService.crearProducto({})).rejects.toMatchObject({ status: 400 });
    });

    it('crea el producto usando una transacción', async () => {
      const client = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [{ nv: 1 }] }) // nextval
          .mockResolvedValueOnce({ rows: [{ id_producto: 1, codigo: 'PROD-0001', nombre: 'Camiseta' }] }) // INSERT
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };
      pool.connect.mockResolvedValueOnce(client);

      const resultado = await productosService.crearProducto({ nombre: 'Camiseta' });

      expect(resultado).toEqual({ id_producto: 1, codigo: 'PROD-0001', nombre: 'Camiseta' });
      expect(client.query).toHaveBeenCalledWith('COMMIT');
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe('eliminarProducto', () => {
    it('rechaza la eliminación si hay ventas pendientes', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ total: '1' }] });

      await expect(productosService.eliminarProducto(1)).rejects.toMatchObject({ status: 400 });
    });

    it('lanza 404 si el producto no existe', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(productosService.eliminarProducto(999)).rejects.toMatchObject({ status: 404 });
    });
  });
});
