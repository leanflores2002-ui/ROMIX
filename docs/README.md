# Estructura y guía rápida

- `frontend/public/`: sitio estático (HTML, JS y assets). Los datos locales están en `frontend/public/assets/data/products.json`.
- `backend/`: FastAPI sirve el API y las vistas HTML renderizadas con Jinja (precarga productos en cliente).
- `docs/`: documentación y notas.

## Ejecutar localmente

Opción rápida (Windows): `./scripts/dev.ps1`

Opción rápida (macOS/Linux): `bash ./scripts/dev.sh`

Manual:
1) Crear y activar venv  
   - Windows: `python -m venv .venv && .\.venv\Scripts\Activate.ps1`  
   - macOS/Linux: `python -m venv .venv && source .venv/bin/activate`
2) Instalar deps: `pip install -r backend/requirements.txt`
3) Iniciar dev server: `uvicorn backend.app.main:app --reload --port 8000`
4) Abrir `http://127.0.0.1:8000` (sirve HTML + assets) y API en `/api/*`.

## Endpoints API
- `GET /api/health` estado
- `GET /api/products` lista (opcional `?section=...`)
- `GET /api/products/{slug}` detalle por slug
- `GET /api/search?q=` sugerencias
## Panel admin
- URL: `/admin` (mismo host). Requiere usuario/contraseña por env: `ROMIX_ADMIN_USER`, `ROMIX_ADMIN_PASSWORD` y `ROMIX_ADMIN_SECRET` (token HttpOnly).
- Login: completar formulario de acceso. Si falla, revisar variables de entorno al levantar FastAPI.
- Crear/editar producto: completar formulario de Productos. El stock por variante se genera/actualiza automáticamente y se persiste en `frontend/public/assets/data/product_variants.json`.
- Variantes y stock: en "Stock por variante" se agregan combinaciones o se edita el stock inline.
- Pedidos: tabla de pedidos (pendientes/confirmados/cancelados). Botones Confirmar o Cancelar ajustan el stock; al cancelar se devuelve stock una sola vez. Los pedidos se guardan en `backend/data/orders.json`.
