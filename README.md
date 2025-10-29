# Estructura del proyecto

Este repo está organizado en dos carpetas principales:

- frontend/: Código y assets del sitio web (HTML, JS, imágenes, datos estáticos).
- backend/: Espacio reservado para la API y lógica de servidor (cuando exista backend).

Abrir la web desde `frontend/index.html` o servir la carpeta `frontend/` como raíz estática.

La UI del catálogo intenta consumir `/api/products` si existe backend, y si falla usa `products.json` local.

