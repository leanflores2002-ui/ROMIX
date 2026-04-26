# Romix POS - Sistema Web de Ventas e Inventario

Sistema completo tipo punto de venta para tienda de ropa, con lector de codigo de barras (USB/Bluetooth), control de stock e historial.

## Stack
- Backend: Node.js + Express
- DB: SQLite
- Frontend: HTML + CSS + JavaScript modular
- Seguridad: JWT + roles (`admin`, `seller`)

## Funcionalidades implementadas

### 1) Productos
- Alta, edicion y desactivacion de productos.
- Codigo de barras unico (manual o generado automaticamente).
- Campos: nombre, categoria, talle, color, precio venta, precio costo, stock, stock minimo, imagen.
- Busqueda/filtros por texto, categoria y bajo stock.

### 2) Ventas / POS
- Campo de escaneo/manual siempre enfocado en la vista POS.
- Busqueda por codigo de barras.
- Carrito con sumar/restar/quitar.
- Bloqueo de venta por falta de stock.
- Registro de venta en `sales` y detalle en `sale_items`.
- Descuento automatico de stock + movimiento en `stock_movements`.
- Comprobante simple imprimible.

### 3) Inventario
- Vista de stock y alerta bajo stock.
- Entrada y salida manual (admin).
- Historial de movimientos con filtros por fecha/tipo.

### 4) Historial de ventas
- Listado por fecha.
- Detalle por venta.
- Totales vendidos por dia, semana y mes.

### 5) Usuarios y roles
- Login.
- Roles:
  - `seller`: puede vender y ver informacion.
  - `admin`: gestiona productos, stock, usuarios y categorias.

### 6) Etiquetas
- Listado de productos para etiquetas.
- Vista previa de codigos de barras.
- Descarga de PDF de etiquetas.
- Impresion de etiquetas seleccionadas.

## Estructura

```text
public/
  css/styles.css
  js/
    api.js
    main.js
    state.js
    utils.js
    views/
      pos.js
      products.js
      inventory.js
      sales.js
      users.js
      labels.js
src/
  app.js
  server.js
  config/
    env.js
    database.js
  middleware/
    auth.js
  routes/
    authRoutes.js
    categoryRoutes.js
    productRoutes.js
    saleRoutes.js
    inventoryRoutes.js
    userRoutes.js
    labelRoutes.js
  services/
    saleService.js
    stockService.js
  utils/
    token.js
    saleNumber.js
    barcode.js
```

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

Abrir: `http://localhost:3000`

## Credenciales iniciales
- Admin: `admin` / `admin123`
- Vendedor: `vendedor` / `vendedor123`

## API principal
- `POST /api/auth/login`
- `GET /api/products`
- `GET /api/products/barcode/:barcode`
- `POST /api/sales`
- `GET /api/sales`
- `GET /api/sales/:id`
- `GET /api/sales/summary`
- `POST /api/inventory/entries`
- `POST /api/inventory/exits`
- `GET /api/inventory/movements`
- `GET /api/labels/products`
- `GET /api/labels/barcode/:barcode.png`
- `GET /api/labels/pdf?productIds=1,2,3`

## Nota
Para produccion, cambiar `JWT_SECRET`, usar HTTPS y migrar a MySQL/PostgreSQL si necesitas mayor concurrencia.
