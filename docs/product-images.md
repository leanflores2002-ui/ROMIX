# Imágenes de productos

ROMIX administra una sola imagen canónica por foto o variante comercial:

```text
frontend/public/images/products/<nombre>.webp
```

La misma imagen se reutiliza en las cards, el detalle, la galería, los swatches,
el carrito y las recomendaciones. Si un producto no define `thumbnail`,
`thumbnailFallback`, `swatch` o una galería separada, el frontend usa `image`
automáticamente. El formato anterior con esos campos explícitos sigue siendo
compatible durante la transición.

## Agregar una foto

1. Guardar el archivo WebP en `frontend/public/images/products/`.
2. Referenciarlo una sola vez en `products.json`, normalmente en `image` o en
   la variante correspondiente.

No crear archivos manuales en `images/thumbs/`, `images/mobile/`,
`images/optimized/` ni variantes AVIF.

Para una foto PNG/JPG nueva, validar y convertir en modo seguro:

```text
npm run optimize:products
npm run optimize:products -- --write
```

El primer comando es dry-run. El segundo crea WebP con orientación corregida,
lado mayor de hasta 1.600 px, calidad 82 y sin agrandar imágenes pequeñas.
Nunca borra el archivo de entrada ni modifica referencias automáticamente;
informá o actualizá esas referencias y validá el resultado antes de borrar
archivos antiguos.

## Cambiar una foto

Reemplazar un único archivo manteniendo el mismo nombre, por ejemplo
`capri_lycra_negro.webp`. No hay que regenerar miniaturas ni buscar extensiones
adicionales.

## Agregar un producto

Agregar solamente las imágenes canónicas necesarias y referenciarlas en
`frontend/public/assets/data/products.json`. Una variante simple puede ser:

```json
{
  "name": "Estampado 1",
  "image": "images/products/capri_lycra_estampado_1.webp"
}
```

El resolver deriva las colecciones `images` e `imageMap` cuando faltan y usa la
misma imagen para miniatura y swatch. No es necesario repetir la ruta en
`thumbnail`, `swatch` o `thumbnailFallback`.

## Previews sociales

Las páginas compartibles conservan como máximo un preview JPEG generado por
producto. Se regeneran desde la imagen principal canónica con:

```text
npm run generate:share-pages
```

Los archivos resultantes viven en `frontend/public/share-previews/` y el
manifiesto se genera automáticamente. No se administran manualmente.

## Auditoría y validación

```text
npm run audit:product-media -- before
npm run audit:storage -- before
npm run check:products
npm run test:media
npm test
```

Los reportes quedan en `reports/`, están excluidos del deployment y sirven para
comparar el estado antes y después de una migración.
