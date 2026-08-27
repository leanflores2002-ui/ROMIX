from pathlib import Path
import re

# One-time migration: season remains metadata; `visible` controls publication.


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


# products-store.js
path = "frontend/public/assets/js/products-store.js"
text = read(path)
text = text.replace("const CACHE_KEY = 'romixProductsCacheV3';", "const CACHE_KEY = 'romixProductsCacheV4';")
text = text.replace("  const BLOCKED_SEASON_KEY = 'verano';\n", "")

old_block = re.compile(
    r"  function localShouldHideProduct\(product\) \{.*?\n  \}\n\n"
    r"  function shouldHideProduct\(product\) \{.*?\n  \}\n",
    re.S,
)
new_block = '''  function isVisibleProduct(product) {
    if (!product || typeof product !== 'object') return false;

    if (Object.prototype.hasOwnProperty.call(product, 'visible')) {
      if (typeof product.visible === 'boolean') return product.visible;
      const visible = normalizeText(product.visible);
      return !['false', '0', 'no', 'hidden', 'oculto', 'inactive', 'inactivo'].includes(visible);
    }

    if (product.hidden === true || product.hide === true || product.oculto === true) return false;

    if (Object.prototype.hasOwnProperty.call(product, 'active')) {
      const active = normalizeText(product.active);
      if (active === 'false' || active === '0' || active === 'no') return false;
    }

    const state = normalizeText(product.visibility || product.state || product.publish);
    if (['hidden', 'oculto', 'draft', 'archived', 'inactive', 'inactivo'].includes(state)) {
      return false;
    }

    return true;
  }

  function localShouldHideProduct(product) {
    return !isVisibleProduct(product);
  }

  function shouldHideProduct(product) {
    return localShouldHideProduct(product);
  }
'''
text, count = old_block.subn(new_block, text, count=1)
if count != 1:
    raise SystemExit("No se pudo actualizar products-store.js")
text = text.replace(
    "    normalizeProduct: normalizeProductShape,\n",
    "    normalizeProduct: normalizeProductShape,\n    isVisible: isVisibleProduct,\n",
    1,
)
write(path, text)


# romix-catalog-pages.js
path = "frontend/public/assets/js/romix-catalog-pages.js"
text = read(path)
old = '''      const normalized = raw
        .map(normalizeProduct)
        .filter((item) => item && item.seasonKey !== "verano");'''
new = '''      const normalized = raw
        .map(normalizeProduct)
        .filter(Boolean);'''
if old not in text:
    raise SystemExit("No se encontro el filtro estacional del catalogo")
text = text.replace(old, new, 1)
write(path, text)


# product.html
path = "frontend/public/product.html"
text = read(path)
old_func = re.compile(
    r"      function isBlockedSeasonProduct\(product\) \{\n"
    r"        if \(!product \|\| typeof product !== 'object'\) return false;\n"
    r"        const season = normalizeSeasonKey\(product\.season \|\| product\.seasonKey\);\n"
    r"        return season\.includes\('verano'\);\n"
    r"      \}",
)
new_func = '''      function isHiddenProduct(product) {
        if (!product || typeof product !== 'object') return true;

        if (Object.prototype.hasOwnProperty.call(product, 'visible')) {
          if (typeof product.visible === 'boolean') return !product.visible;
          const value = String(product.visible ?? '').trim().toLowerCase();
          return ['false', '0', 'no', 'hidden', 'oculto', 'inactive', 'inactivo'].includes(value);
        }

        if (product.hidden === true || product.hide === true || product.oculto === true) return true;

        if (Object.prototype.hasOwnProperty.call(product, 'active')) {
          const active = String(product.active ?? '').trim().toLowerCase();
          if (['false', '0', 'no'].includes(active)) return true;
        }

        const state = String(product.visibility || product.state || product.publish || '').trim().toLowerCase();
        return ['hidden', 'oculto', 'draft', 'archived', 'inactive', 'inactivo'].includes(state);
      }'''
text, count = old_func.subn(new_func, text, count=1)
if count != 1:
    raise SystemExit("No se pudo actualizar product.html")
text = text.replace("isBlockedSeasonProduct", "isHiddenProduct")
write(path, text)


# backend/app/main.py
path = "backend/app/main.py"
text = read(path)
text = text.replace('BLOCKED_SEASON_KEYS = {"verano"}\n', '')
old = '''def is_public_product(product: dict) -> bool:
    return season_key(product) not in BLOCKED_SEASON_KEYS
'''
new = '''def is_public_product(product: dict) -> bool:
    """La temporada describe al producto; `visible` decide si se publica."""
    if not isinstance(product, dict):
        return False

    if "visible" in product:
        value = product.get("visible")
        if isinstance(value, bool):
            return value
        normalized = normalize_text(value)
        return normalized not in {
            "false", "0", "no", "hidden", "oculto", "inactive", "inactivo"
        }

    if product.get("hidden") is True or product.get("hide") is True or product.get("oculto") is True:
        return False

    if "active" in product and normalize_text(product.get("active")) in {"false", "0", "no"}:
        return False

    state = normalize_text(
        product.get("visibility") or product.get("state") or product.get("publish")
    )
    if state in {"hidden", "oculto", "draft", "archived", "inactive", "inactivo"}:
        return False

    return True
'''
if old not in text:
    raise SystemExit("No se encontro is_public_product en backend/app/main.py")
text = text.replace(old, new, 1)
write(path, text)


# Documentation
path = "docs/CATALOGO_PRODUCTOS.md"
text = read(path)
if "## Visibilidad de productos" not in text:
    text += '''\n## Visibilidad de productos\n\nLa temporada ya no decide si un producto se publica. Para controlar la publicacion usar:\n\n```json\n"visible": true\n```\n\nEl producto aparece en la web. Para ocultarlo sin borrarlo:\n\n```json\n"visible": false\n```\n\nSi el campo `visible` no existe, el producto se considera visible por defecto para mantener compatibilidad con el catalogo anterior.\n'''
    write(path, text)


assert 'BLOCKED_SEASON_KEY' not in read('frontend/public/assets/js/products-store.js')
assert 'seasonKey !== "verano"' not in read('frontend/public/assets/js/romix-catalog-pages.js')
assert 'isBlockedSeasonProduct' not in read('frontend/public/product.html')
assert 'BLOCKED_SEASON_KEYS' not in read('backend/app/main.py')
print("Visibility refactor applied successfully")
