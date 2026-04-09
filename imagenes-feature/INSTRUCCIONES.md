# INSTRUCCIONES — Módulo de Imágenes

## 1. Instalar dependencia en el backend

```bash
cd sportzone-backend
npm install multer
```

---

## 2. Archivos a copiar

### Backend
| Archivo | Destino |
|---|---|
| `backend/routes/imagenes.js` | `sportzone-backend/src/routes/imagenes.js` |
| `backend/index.js` | Toma las 2 líneas nuevas y agrégalas a tu index.js |

### Frontend
| Archivo | Destino |
|---|---|
| `frontend/GaleriaImagenes.jsx` | `src/components/GaleriaImagenes.jsx` |
| `frontend/GaleriaImagenes.css` | `src/components/GaleriaImagenes.css` |

---

## 3. Usar la galería en GestProductos.jsx

Dentro del modal de editar/ver un producto, agrega el componente así:

```jsx
// Al inicio del archivo GestProductos.jsx
import GaleriaImagenes from "../../components/GaleriaImagenes";

// Dentro del modal, después del último campo del formulario:
{editar && (
  <GaleriaImagenes
    tipoReferencia="Producto"
    idReferencia={editar}   // id del producto que estás editando
  />
)}
```

---

## 4. Estructura de carpetas que crea el backend

```
sportzone-backend/
  uploads/
    productos/        ← aquí se guardan las imágenes subidas
      img_1234567890_4521.jpg
      img_1234567891_8732.png
      ...
```

---

## 5. Endpoints disponibles

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/imagenes?tipo=Producto&id=3` | Todas las imágenes del producto 3 |
| GET | `/api/imagenes/:id` | Una imagen por ID |
| POST | `/api/imagenes` | Subir 1 o varias imágenes (form-data) |
| PATCH | `/api/imagenes/:id/principal` | Marcar como imagen principal |
| PATCH | `/api/imagenes/:id/orden` | Cambiar el orden |
| DELETE | `/api/imagenes/:id` | Eliminar imagen (BD + disco) |

---

## 6. Parámetros del POST (multipart/form-data)

| Campo | Tipo | Requerido |
|---|---|---|
| `imagenes` | File(s) | ✅ |
| `tipo_referencia` | String | ✅ `Producto` / `Usuario` / `Promocion` |
| `id_referencia` | Number | ✅ id del producto |
| `titulo` | String | opcional |
| `descripcion` | String | opcional |

---

## 7. Comportamiento automático

- Si es la **primera imagen** del producto → se marca como principal automáticamente
- Si **eliminas la principal** → la siguiente en orden pasa a ser principal
- Valida que el archivo sea imagen JPG/PNG/WEBP/GIF y máximo **5 MB**
- Las URLs se construyen como `http://localhost:4000/uploads/productos/nombre.jpg`
