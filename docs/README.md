# Estructura del proyecto

Este repositorio está organizado en carpetas lógicas para separar responsabilidades y facilitar el mantenimiento.

- `frontend/`: código del cliente (HTML/CSS/JS, assets, componentes). Por ahora los archivos existentes siguen en la raíz para no romper rutas. La migración puede hacerse gradualmente.
- `backend/`: espacio reservado para servicios o API en el futuro. Actualmente contiene solo un README.
- `docs/`: documentación, notas y guías operativas.

## Próximos pasos sugeridos

- Migrar `index.html`, `search.js`, `support-widget-romix.js`, `products.json` y `images/` a `frontend/` y ajustar rutas.
- Agregar un servidor estático simple (por ejemplo, con Node/Express) si se necesita backend o despliegue local consistente.

