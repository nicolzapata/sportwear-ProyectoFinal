import api from "../../../../shared/services/api";
import ExportButtons from "../../../../shared/components/ExportButtons";
import { IconSearch, IconX, IconBox, IconTag, IconPalette } from "../../../../shared/components/Icons";

export default function GestProductosToolbar({ g }) {
  return (
    <div className="gestproductos-actions-bar">
      <div className="gestproductos-actions-left">
        <div className="gestproductos-search-wrapper">
          <span className="gestproductos-search-icon"><IconSearch /></span>
          <input className="gestproductos-search-input" placeholder={g.tab === 'productos' ? "Buscar por nombre, código o categoría..." : g.tab === 'categorias' ? "Buscar categoría por nombre..." : "Buscar color por nombre..."} value={g.busqueda}
            onChange={(e) => g.setBusqueda(e.target.value)} />
          {g.busqueda && <button className="gestproductos-search-clear" onClick={() => g.setBusqueda("")}><IconX /></button>}
        </div>
        <div className="gestproductos-tabs-bar">
          <button className={`gestproductos-tab-btn${g.tab === 'productos' ? ' active' : ''}`} onClick={() => g.setTab('productos')}><IconBox /> Productos</button>
          <button className={`gestproductos-tab-btn${g.tab === 'categorias' ? ' active' : ''}`} onClick={() => g.setTab('categorias')}><IconTag /> Categorías</button>
          <button className={`gestproductos-tab-btn${g.tab === 'colores' ? ' active' : ''}`} onClick={() => g.setTab('colores')}><IconPalette /> Colores</button>
        </div>
      </div>
      <div className="gestproductos-actions-right">
        {g.tab === 'productos' && g.tienePerm('Productos.crear') && (
          <button className="gestproductos-btn-primary" onClick={g.abrirRegistrar}><span>+</span> Nuevo producto</button>
        )}
        {g.tab === 'categorias' && g.tienePerm('Categorias.crear') && (
          <button className="gestproductos-btn-primary" onClick={g.abrirRegistrarCategoria}><span>+</span> Nueva categoría</button>
        )}
        {g.tab === 'colores' && g.tienePerm('Colores.crear') && (
          <button className="gestproductos-btn-primary" onClick={g.abrirRegistrarColor}><span>+</span> Nuevo color</button>
        )}
        {g.tab === 'productos' ? (
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/productos", { params: { q: g.busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Producto", key: "nombre" },
              { header: "Categoría", key: "categoria" },
              { header: "Precio", key: "precio" },
              { header: "Stock", key: "stock" },
              { header: "Publicado", value: (p) => p.publicado ? "Sí" : "No" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="productos"
            titulo="Productos"
          />
        ) : g.tab === 'categorias' ? (
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/categorias", { params: { q: g.busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Nombre", key: "nombre" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="categorias"
            titulo="Categorías"
          />
        ) : (
          <ExportButtons
            obtenerDatos={async () => {
              const { data } = await api.get("/colores", { params: { q: g.busquedaDebounced || undefined } });
              return data;
            }}
            columnas={[
              { header: "Nombre", key: "nombre" },
              { header: "HEX", key: "codigo_hex" },
              { header: "Estado", key: "estado" },
            ]}
            nombreArchivo="colores"
            titulo="Colores"
          />
        )}
      </div>
    </div>
  );
}
