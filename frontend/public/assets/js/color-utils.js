(function (global) {
  const UNIQUE_COLOR_KEYS = new Set(['unico', 'único', 'unique', 'u', 'one', 'default']);
  const UNIQUE_FALLBACK = 'Negro';

  function stripDiacritics(value) {
    try {
      return value.normalize('NFD').replace(/\p{Diacritic}+/gu, '');
    } catch (error) {
      return value;
    }
  }

  function normalizeColorName(value) {
    const raw = (value ?? '').toString().trim();
    if (!raw) return '';
    const plain = stripDiacritics(raw).toLowerCase();
    if (UNIQUE_COLOR_KEYS.has(plain)) return '';
    return raw;
  }

  function findColorOption(product, lookup) {
    const palette = Array.isArray(product?.colors) ? product.colors : [];
    if (!lookup && lookup !== 0) return palette[0] || null;
    const normalize = (val) => stripDiacritics((val ?? '').toString()).toLowerCase();
    const target = normalize(lookup);

    return palette.find((opt) => {
      if (!opt) return false;
      const ids = [opt.id, opt.colorId, opt.variantId, opt.variant_id];
      if (ids.some((id) => id != null && normalize(id) === target)) return true;
      const name = normalize(opt.name || opt.value || '');
      return name === target;
    }) || null;
  }

  function getDisplayColorName(product, selectedColorId) {
    const palette = Array.isArray(product?.colors) ? product.colors : [];
    const fromSelection = findColorOption(product, selectedColorId);
    const selectedName = normalizeColorName(
      (fromSelection && (fromSelection.name || fromSelection.value)) ?? selectedColorId
    );
    if (selectedName) return selectedName;

    if (palette.length === 1) {
      const single = normalizeColorName(palette[0]?.name || palette[0]?.value);
      if (single) return single;
    }

    for (const opt of palette) {
      const candidate = normalizeColorName((opt && (opt.name || opt.value)) || '');
      if (candidate) return candidate;
    }

    return UNIQUE_FALLBACK;
  }

  const api = {
    getDisplayColorName,
    normalizeColorName,
    findColorOption
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.romixColorUtils = Object.assign({}, global.romixColorUtils, api);
})(typeof window !== 'undefined' ? window : globalThis);
