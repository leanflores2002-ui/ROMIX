# ROMIX Design System

La interfaz de la tienda comparte sus tokens visuales en
`frontend/public/assets/css/romix-design-system.css`. La hoja se carga después
de las fuentes y antes de las hojas específicas de cada página.

## Tokens principales

Usar los nombres `--romix-*` en estilos nuevos:

- Marca: `--romix-pink` (`#F22797`), `--romix-pink-hover` (`#D91D83`),
  `--romix-pink-soft` (`#F291C7`) y `--romix-pink-bg` (`#FFF0F6`).
- Texto y superficies: `--romix-ink`, `--romix-text-muted`,
  `--romix-white`, `--romix-surface` (`#F2F2F2`) y
  `--romix-surface-soft` (`#FAFAFA`).
- Estado: `--romix-success`, `--romix-warning` y `--romix-danger`.
- Forma: `--romix-radius-sm`, `--romix-radius` y `--romix-radius-lg`.
- Controles: `--romix-control-height` (44px) y
  `--romix-control-height-lg` (50px).
- Ritmo: `--romix-space-1` a `--romix-space-8`.
- Foco y elevación: `--romix-focus-ring`, `--romix-shadow-xs`,
  `--romix-shadow` y `--romix-shadow-hover`.

## Botones y controles

Para componentes nuevos:

```html
<a class="romix-btn romix-btn--primary" href="catalogo.html">Ver catálogo</a>
<button class="romix-btn romix-btn--secondary" type="button">Cancelar</button>
<button class="romix-icon-btn" type="button" aria-label="Cerrar">×</button>
```

Variantes disponibles: `romix-btn--primary`, `romix-btn--secondary`,
`romix-btn--ghost` y `romix-btn--danger`. Todos conservan foco visible,
altura táctil mínima de 44px y estados hover/disabled coherentes.

Las clases históricas (`.btn`, `.cta`, `.filters-open-btn`, `.product-buy-now`,
`.icon-btn`, entre otras) se mantienen porque JavaScript y plantillas las usan.
Sus variables de página (`--catalog-*`, `--product-*`, `--header-*`) son alias
compatibles de los tokens compartidos; no crear nuevos colores paralelos.

## Carga y responsive

`romix-design-system.css` se carga en home, catálogo, categorías, novedades,
detalle de producto, carrito, ayuda y página 404 antes del CSS específico.
Los layouts existentes conservan sus breakpoints y deben revisarse en
360×800, 390×844, 430×932, 768×1024 y 1440×900. La hoja compartida no cambia
datos de productos, precios, talles ni stock.
