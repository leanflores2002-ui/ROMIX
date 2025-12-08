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

## Despliegue en Fly.io
1) Instala y autentica Fly CLI: `fly auth login`.
2) Ajusta `fly.toml` si quieres otra región (`primary_region`) o nombre de app (`app`).
3) Primera vez: `fly launch --no-deploy` (crea app si no existe). Si ya existe, salta este paso.
4) `fly deploy` (usa el `Dockerfile` incluido: expone `PORT=8080` y ejecuta `uvicorn backend.app.main:app`).
