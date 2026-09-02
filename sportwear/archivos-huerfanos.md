| Archivo | Tipo | Motivo | Confianza |
|---|---|---|---|
| src/features/catalogo/pages/CatProductos.jsx | Página (.jsx) | No aparece importado en `routes.jsx` ni en ningún otro archivo del proyecto (import estático, dinámico o `require`). La gestión de productos vigente está enrutada a través de `GestProductos.jsx`; este archivo parece una versión anterior no eliminada. | Alta |
| src/features/catalogo/pages/Colores.jsx | Página (.jsx) | Sin referencias entrantes en todo el proyecto. La gestión de colores actual vive dentro de `GestProductos.jsx` (que reutiliza sus propios componentes de colores); este archivo no está enlazado en `routes.jsx`. | Alta |
| src/features/clientes/pages/Clientes.jsx | Página (.jsx) | Sin referencias entrantes; no aparece en `routes.jsx`. La administración de clientes vigente se maneja desde el feature `usuarios`. | Alta |
| src/features/ventas/components/PaymentReceipt.jsx | Componente (.jsx) | Sin referencias entrantes (ni import estático ni dinámico). Su funcionalidad parece haber sido reemplazada por `payment-modal/ReceiptView.jsx`, que sí está importado por `PaymentModal.jsx`. | Alta |
