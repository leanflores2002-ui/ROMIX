# ROMIX - Panel Admin y Fix Home

## Acceso admin
- Variables de entorno: `ADMIN_USER` y `ADMIN_PASS` (por defecto `admin` / `romix123`).
- Levantar backend: `uvicorn backend.app.main:app --reload` (usa `frontend/public` como static root).
- Ingresar a `/admin` y loguearse; las rutas `/api/admin/*` requieren el token/cookie emitido en el login.

## Operaciones principales
- **Productos:** en `/admin` pestaña Productos puedes buscar/filtrar, editar, duplicar o activar/desactivar. El formulario permite nombre, sección, tipo, precio, badge, descripción, imagen principal, colores (color + URL) y variantes (color, talle, stock, imagen). Guardar persiste `frontend/public/assets/data/products.json` y `backend/data/product_variants.json` de forma atómica.
- **Stock:** pestaña Stock muestra el total por producto con estado `Disponible/Por agotarse/Agotado`. El botón Editar abre las variantes para ajustar stock y guardarlas.
- **Pedidos:** pestaña Pedidos lista los pedidos (`orders.json`) con filtros por estado y búsqueda por cliente/WhatsApp/id. Botones **Confirmar** / **Cancelar** actualizan estado; al cancelar se devuelve stock solo una vez.

## Datos persistidos
- Productos: `frontend/public/assets/data/products.json` (source of truth).
- Variantes: `backend/data/product_variants.json` (se crea si no existe).
- Pedidos: `backend/data/orders.json` (se inicializa vacío).

## Bugfix rápido (home Add to Cart)
1) Abre `index.html`, limpia el carrito (si aplica).  
2) En la grilla de inicio haz clic en “Agregar” una sola vez.  
3) Se agrega únicamente ese producto con la variante determinística (primer color distinto de “Unico” y primer talle con stock>0, si existe).  
4) Repite con otro producto: ya no se mezclan selecciones previas ni se duplica el click.
