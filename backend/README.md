Backend (placeholder)

Esta carpeta está lista para contener la API cuando se implemente el backend.

API esperada:
- GET /api/products?section=mujer|hombre|ninos&q=&sort=relevance|price-asc|price-desc|newest&page=1&pageSize=24
- Respuesta: { items: Product[], total: number }
- Product mínimo: { id, name, section, type, price, priceByGroup?, images?, colors?, sizes?, stockByColor? }

Mientras no haya backend, la UI usa `frontend/products.json` como fuente de datos.

