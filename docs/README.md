# Estructura del proyecto

Este repositorio está organizado en carpetas lógicas para separar responsabilidades y facilitar el mantenimiento.

- `frontend/`: código del cliente (HTML/CSS/JS, assets, componentes). Por ahora los archivos existentes siguen en la raíz para no romper rutas. La migración puede hacerse gradualmente.
- `backend/`: espacio reservado para servicios o API en el futuro. Actualmente contiene solo un README.
- `docs/`: documentación, notas y guías operativas.

## Próximos pasos sugeridos

- Migrar `index.html`, `search.js`, `support-widget-romix.js`, `products.json` y `images/` a `frontend/` y ajustar rutas si se desea.
- Backend listo con FastAPI (ver `backend/`): sirve API y archivos estáticos. Ideal para desarrollo y despliegue.

### Backend (FastAPI)

1) Crear venv e instalar dependencias
   - Windows (PowerShell):
     - `python -m venv .venv`
     - `.venv\Scripts\Activate.ps1`
     - `pip install -r backend/requirements.txt`

2) Ejecutar el servidor de desarrollo
   - `uvicorn backend.app.main:app --reload`
   - Abre `http://127.0.0.1:8000` para ver el sitio y `http://127.0.0.1:8000/api/products` para la API.

3) Endpoints disponibles
   - `GET /api/health` → estado
   - `GET /api/products` → todos los productos (opcional `?section=mujer|hombre|ninos`)
   - `GET /api/products/{slug}` → producto por slug
   - `GET /api/search?q=texto` → sugerencias

El servidor también monta los archivos estáticos del repositorio en `/`, por lo que no es necesario abrir `index.html` con doble clic (lo cual rompe `fetch`).
