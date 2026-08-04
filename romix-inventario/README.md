# ROMIX Inventario

Sistema web completo de inventario para ROMIX con lector de códigos de barras USB, autenticación, movimientos transaccionales y actualización en tiempo real.

## Funciones principales

- Inicio/cierre de sesión con Supabase Auth.
- Entrada, salida, ajuste y consulta por código de barras.
- Una variante y stock independiente por producto, color y talle.
- Dashboard, inventario con filtros y movimientos paginados.
- Alta/edición de productos y variantes; ajustes de stock auditados.
- RPC PostgreSQL con `FOR UPDATE`, prevención de stock negativo y registro de movimientos.
- Supabase Realtime sin recargar la página ni duplicar filas.
- Interfaz responsive para computadora, tablet y celular.

## Estructura

```text
romix-inventario/
├── frontend/             # React, Vite, TypeScript, Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── .env.example
│   └── vercel.json
├── backend/              # Node, Express, TypeScript, Zod
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   └── .env.example
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── package.json
└── .gitignore
```

## Requisitos

- Node.js 20 o superior y npm.
- Un proyecto de Supabase con PostgreSQL, Auth y Realtime.
- Para producción: cuentas de Render y Vercel.
- Lector USB configurado como teclado y con sufijo `Enter`.

## Configurar Supabase

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor** y ejecutar completo `supabase/schema.sql`.
3. Ejecutar `supabase/seed.sql` para cargar los tres productos iniciales.
4. Ir a **Authentication > Users > Add user > Create new user**.
5. Crear un usuario con email y contraseña y dejar su email confirmado.
6. En **Database > Replication**, verificar que `public.product_variants` esté en `supabase_realtime`; el esquema intenta agregarla automáticamente.

RLS queda activa en `products`, `product_variants` e `inventory_movements`. Los usuarios autenticados solo tienen políticas de lectura. La función `adjust_inventory` solo puede ser ejecutada por `service_role`.

Datos de prueba:

| Producto | Variante | SKU | Código | Stock |
|---|---|---|---|---:|
| Pantalón jogger rústico | Negro / 3 | `JOG-NEG-T3` | `ROM-JOG-NEG-T3` | 10 |
| Campera de lycra | Azul / 2 | `CAM-AZU-T2` | `ROM-CAM-AZU-T2` | 8 |
| Pantalón recto | Gris / 4 | `REC-GRI-T4` | `ROM-REC-GRI-T4` | 6 |

## Variables de entorno

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Completar manualmente `backend/.env`:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
FRONTEND_URL=http://localhost:5173
```

Completar manualmente `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Las claves están en **Supabase > Project Settings > API Keys**. `SUPABASE_SERVICE_ROLE_KEY` es secreta: solo debe cargarse en el backend/Render. Nunca debe copiarse al frontend, Vercel ni Git.

## Instalar y ejecutar

Desde `romix-inventario`:

```powershell
npm.cmd --prefix backend ci
npm.cmd --prefix frontend ci
```

Abrir dos terminales:

```powershell
npm.cmd --prefix backend run dev
```

```powershell
npm.cmd --prefix frontend run dev
```

Abrir `http://localhost:5173`. El backend queda en `http://localhost:3000`; `GET /health` debe responder `{"status":"ok"}`. En macOS/Linux, reemplazar `npm.cmd` por `npm`.

## Probar el lector

1. Conectar el lector y abrir **Escáner**.
2. Elegir Entrada, Salida, Ajuste o Consulta.
3. Configurar cantidad/stock final y nota.
4. Escanear, por ejemplo, `ROM-JOG-NEG-T3`.

El campo se enfoca solo, procesa con `Enter`, se limpia y recupera el foco. La misma etiqueta se ignora durante 1,5 segundos. Sin lector, escribir el código y presionar `Enter`.

## Seguridad y consistencia

El frontend envía el access token como `Authorization: Bearer TOKEN`. El backend lo valida con Supabase antes de cada endpoint `/api` y aplica Helmet, CORS, rate limiting, Zod, sanitización, logs y manejo central de errores.

Toda entrada, salida o ajuste llama a `adjust_inventory`. La función bloquea la variante con `FOR UPDATE`, calcula el stock, rechaza negativos, actualiza la fila e inserta el movimiento dentro de la misma transacción. Dos escaneos simultáneos quedan serializados.

Al crear una variante con stock inicial, el backend la crea en cero y registra un ajuste `Stock inicial`. La edición normal de variantes no acepta `stock`; el frontend nunca hace un `UPDATE` directo de ese campo.

## API

Todos excepto `/health` requieren JWT:

```text
GET    /health
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
POST   /api/products/:productId/variants
PATCH  /api/variants/:id
GET    /api/variants/barcode/:barcode
POST   /api/inventory/scan
GET    /api/inventory/movements
GET    /api/inventory/low-stock
GET    /api/inventory/dashboard
```

Ejemplo de escaneo:

```json
{
  "barcode": "ROM-JOG-NEG-T3",
  "movementType": "out",
  "quantity": 1,
  "note": "Venta"
}
```

## Build, lint y pruebas

```powershell
npm.cmd --prefix backend run build
npm.cmd --prefix backend run lint
npm.cmd --prefix backend test
npm.cmd --prefix frontend run build
npm.cmd --prefix frontend run lint
```

También se puede ejecutar `npm.cmd run build`, `npm.cmd run lint` y `npm.cmd test` desde la raíz. Los tests cubren autenticación/JWT, los cuatro modos, validaciones, código inexistente, stock negativo, concurrencia, creación de productos y duplicados de código/SKU.

## Render

Crear un **Web Service**:

```text
Root Directory: romix-inventario/backend
Build Command: npm ci && npm run build
Start Command: npm start
```

Cargar todas las variables del backend, con `NODE_ENV=production`, y establecer `FRONTEND_URL` al origen exacto de Vercel sin `/` final. El servidor usa `process.env.PORT` y escucha en `0.0.0.0`.

## Vercel

```text
Root Directory: romix-inventario/frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

Cargar `VITE_API_URL` (URL HTTPS de Render), `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. `vercel.json` reescribe las rutas de React Router a `index.html`.

## CORS, Realtime y errores comunes

- **CORS bloqueado:** `FRONTEND_URL` no coincide exactamente con el origen del navegador; actualizarla y reiniciar Render.
- **Token inválido/vencido:** cerrar sesión y volver a ingresar; revisar URL y anon key.
- **Código inexistente:** confirmar que exista en `product_variants`.
- **Stock insuficiente:** una salida nunca puede dejar stock negativo.
- **Realtime no actualiza:** revisar Replication y las variables `VITE_SUPABASE_*`.
- **Invalid API key/permission denied:** revisar la service role key privada de Render.
- **El lector no funciona:** probarlo en un editor de texto y configurarlo para enviar `Enter`.
- **PowerShell bloquea `npm.ps1`:** usar `npm.cmd`.

`.gitignore` excluye `.env`, dependencias, builds, cobertura y logs. Si una service role key se expone, debe rotarse inmediatamente.
