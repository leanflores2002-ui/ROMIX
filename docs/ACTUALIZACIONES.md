# Cambios recientes

## Ocultar productos de invierno

Sin borrar datos, el frontend oculta cualquier producto cuyo nombre/tipo contenga: "frizado", "frisado", "polar" o "térmica". Esto aplica en:
- Catálogo (`frontend/app.js`)
- Inicio (`frontend/index.html`)
- Búsqueda/sugerencias (`frontend/search.js`)

Los productos siguen presentes en `frontend/products.json` y en la página de detalle si se accede por URL directa.

## Actualizar precios desde CSV

Para alinear precios con una lista, exportá el PDF a CSV (por ejemplo, desde Excel) con columnas: `nombre` y `precio` (opcional `precio_original`). Luego ejecute:

```
python scripts/update_prices_from_csv.py ruta/al/archivo.csv
```

El script:
- Normaliza nombres (sin acentos, minúsculas) y matchea por nombre.
- Actualiza `price` y `originalPrice` en `frontend/products.json`.
- Crea backup en `frontend/products.json.bak`.

