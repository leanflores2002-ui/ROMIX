(() => {
  const CACHE_KEY = 'romixProductsCacheV3';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const DATA_URL = 'assets/data/products.json';
  const BLOCKED_SEASON_KEY = 'verano';

  let memoryCache = null;
  let inFlight = null;

  function normalizeText(value) {
    const raw = value == null ? '' : String(value).trim();
    if (!raw) return '';
    try {
      return raw.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function fileToken(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function cleanPath(value) {
    return String(value || '').trim().split(/[?#]/)[0];
  }

  function deriveColorImage(product, colorName) {
    if (!product || !product.imageBase) return '';
    const base = String(product.imageBase || '').trim().replace(/^\/+|\/+$/g, '');
    const color = fileToken(colorName);
    if (!base || !color) return '';
    const ext = String(product.imageExt || 'png').trim().replace(/^\./, '') || 'png';
    const dir = String(product.imageDir || 'images/products').trim().replace(/^\/+|\/+$/g, '') || 'images/products';
    return `${dir}/${base}_${color}.${ext}`;
  }

  function deriveThumbPath(imagePath) {
    const src = cleanPath(imagePath);
    if (!src || /^data:/i.test(src) || /^https?:\/\//i.test(src)) return '';
    const inProducts = src.includes('images/products/')
      ? src.replace('images/products/', 'images/thumbs/')
      : src;
    return inProducts.replace(/(\.[^./]+)$/i, '-thumb.webp');
  }

  function imageForColor(product, color, index) {
    const source = color && typeof color === 'object' ? color : { name: color };
    const directList = [
      source.images,
      source.imagenes,
      source.gallery,
      source.galeria,
      source.photos,
      source.fotos
    ].find((value) => Array.isArray(value) && value.length);
    if (directList && directList[0]) return cleanPath(directList[0]);

    const direct = cleanPath(source.image || source.imagen);
    if (direct) return direct;

    const colorName = String(source.name || source.value || '').trim();
    const imageMap = product && product.imageMap && typeof product.imageMap === 'object' && !Array.isArray(product.imageMap)
      ? product.imageMap
      : null;
    if (imageMap && colorName) {
      if (cleanPath(imageMap[colorName])) return cleanPath(imageMap[colorName]);
      const target = normalizeText(colorName);
      const key = Object.keys(imageMap).find((entry) => normalizeText(entry) === target);
      if (key && cleanPath(imageMap[key])) return cleanPath(imageMap[key]);
    }

    const derived = deriveColorImage(product, colorName);
    if (derived) return derived;

    if (Array.isArray(product && product.images) && product.images[index]) {
      return cleanPath(product.images[index]);
    }

    return cleanPath(product && product.image);
  }

  function normalizeSizes(sizes) {
    return (Array.isArray(sizes) ? sizes : []).map((entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        const size = String(entry.size ?? entry.value ?? '').trim();
        if (!size) return null;
        return Object.assign({}, entry, {
          size,
          status: String(entry.status || 'available').trim() || 'available'
        });
      }

      const size = String(entry ?? '').trim();
      return size ? { size, status: 'available' } : null;
    }).filter(Boolean);
  }

  function normalizeProductShape(product) {
    if (!product || typeof product !== 'object' || Array.isArray(product)) return product;

    const normalized = Object.assign({}, product);
    normalized.sizes = normalizeSizes(product.sizes);

    const rawColors = Array.isArray(product.colors)
      ? product.colors
      : (product.colors && typeof product.colors === 'object' ? Object.values(product.colors) : []);

    normalized.colors = rawColors.map((entry, index) => {
      const color = entry && typeof entry === 'object'
        ? Object.assign({}, entry)
        : { name: String(entry || '').trim() };
      const name = String(color.name || color.value || `Color ${index + 1}`).trim();
      const image = imageForColor(product, color, index);
      if (image && !color.image) color.image = image;
      color.name = name;
      return color;
    });

    const generatedMap = {};
    const generatedImages = [];
    normalized.colors.forEach((color, index) => {
      const image = imageForColor(normalized, color, index);
      if (!image) return;
      generatedMap[color.name] = image;
      if (!generatedImages.includes(image)) generatedImages.push(image);
    });

    if (!normalized.imageMap || typeof normalized.imageMap !== 'object' || Array.isArray(normalized.imageMap)) {
      normalized.imageMap = generatedMap;
    }

    if (!Array.isArray(normalized.images) || !normalized.images.length) {
      normalized.images = generatedImages;
    }

    if (!cleanPath(normalized.image)) {
      normalized.image = generatedImages[0] || '';
    }

    if (!cleanPath(normalized.thumbnail) && normalized.image) {
      normalized.thumbnail = deriveThumbPath(normalized.image);
    }

    if (!cleanPath(normalized.thumbnailFallback) && normalized.image) {
      normalized.thumbnailFallback = normalized.image;
    }

    return normalized;
  }

  function seasonKey(product) {
    const fromSeason = normalizeText(product && product.season).replace(/[^a-z0-9]+/g, '');
    if (fromSeason.includes('verano')) return 'verano';
    if (fromSeason.includes('invierno')) return 'invierno';
    if (fromSeason === 'mediaestacion') return 'media-estacion';

    const fromSeasonKey = normalizeText(product && product.seasonKey).replace(/[^a-z0-9-]+/g, '');
    if (fromSeasonKey.includes('verano')) return 'verano';
    if (fromSeasonKey.includes('invierno')) return 'invierno';
    if (fromSeasonKey.replace(/-/g, '') === 'mediaestacion') return 'media-estacion';
    return '';
  }

  function localShouldHideProduct(product) {
    if (!product || typeof product !== 'object') return false;

    if (product.hidden === true || product.hide === true || product.oculto === true) return true;

    if (Object.prototype.hasOwnProperty.call(product, 'visible')) {
      const visible = normalizeText(product.visible);
      if (visible === 'false' || visible === '0' || visible === 'no') return true;
    }

    if (Object.prototype.hasOwnProperty.call(product, 'active')) {
      const active = normalizeText(product.active);
      if (active === 'false' || active === '0' || active === 'no') return true;
    }

    const state = normalizeText(product.visibility || product.state || product.publish);
    if (['hidden', 'oculto', 'draft', 'archived', 'inactive', 'inactivo'].includes(state)) {
      return true;
    }

    return seasonKey(product) === BLOCKED_SEASON_KEY;
  }

  function shouldHideProduct(product) {
    if (typeof window.shouldHideProduct === 'function') {
      try {
        if (window.shouldHideProduct(product)) return true;
      } catch {}
    }
    return localShouldHideProduct(product);
  }

  function sanitizeList(list) {
    const source = Array.isArray(list) ? list : [];
    const base = typeof window.sanitizeList === 'function' ? window.sanitizeList(source) : source;
    return (Array.isArray(base) ? base : [])
      .map(normalizeProductShape)
      .filter((item) => !shouldHideProduct(item));
  }

  function parseJsonText(text) {
    const cleaned = String(text || '').replace(/^\uFEFF/, '');
    return JSON.parse(cleaned);
  }

  function now() {
    return Date.now();
  }

  function readSessionCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.list)) return null;
      if (typeof parsed.timestamp !== 'number') return null;
      if ((now() - parsed.timestamp) > CACHE_TTL_MS) return null;
      return sanitizeList(parsed.list);
    } catch {
      return null;
    }
  }

  function writeSessionCache(list) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: now(),
        list: Array.isArray(list) ? list : []
      }));
    } catch {}
  }

  function fromPreloaded(options) {
    const opts = options || {};
    if (Array.isArray(opts.preloaded) && opts.preloaded.length) {
      return sanitizeList(opts.preloaded);
    }
    if (!opts.preloadedScriptId) return null;
    try {
      const el = document.getElementById(opts.preloadedScriptId);
      if (!el) return null;
      const raw = (el.textContent || el.innerText || '').trim();
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return sanitizeList(Array.isArray(parsed) ? parsed : []);
    } catch {
      return null;
    }
  }

  async function fetchProducts(options) {
    const opts = options || {};
    const dataUrl = new URL(opts.dataUrl || DATA_URL, location.href);

    if (opts.useApi !== false) {
      try {
        const apiRes = await fetch('/api/products');
        if (apiRes.ok) {
          const apiList = sanitizeList(await apiRes.json());
          if (apiList.length) writeSessionCache(apiList);
          return apiList;
        }
      } catch (error) {
        console.warn('[products-store] API fallback omitido', error);
      }
    }

    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error('No se pudo cargar products.json (' + response.status + ') desde ' + dataUrl.href);
    }
    const text = await response.text();
    let parsed;
    try {
      parsed = parseJsonText(text);
    } catch (error) {
      console.error('[products-store] JSON invalido en ' + dataUrl.href, error);
      throw error;
    }
    const fileList = sanitizeList(Array.isArray(parsed) ? parsed : []);
    writeSessionCache(fileList);
    return fileList;
  }

  async function load(options) {
    const opts = options || {};
    const force = opts.force === true;

    if (!force && memoryCache && memoryCache.length) return memoryCache;

    const preloaded = fromPreloaded(opts);
    if (!force && preloaded && preloaded.length) {
      memoryCache = preloaded;
      writeSessionCache(memoryCache);
      return memoryCache;
    }

    if (!force) {
      const sessionCached = readSessionCache();
      if (sessionCached && sessionCached.length) {
        memoryCache = sessionCached;
        return memoryCache;
      }
    }

    if (!force && inFlight) return inFlight;

    inFlight = fetchProducts(opts)
      .then((list) => {
        memoryCache = sanitizeList(list);
        return memoryCache;
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  }

  window.romixProductsStore = {
    load,
    normalizeProduct: normalizeProductShape,
    clear() {
      memoryCache = null;
      inFlight = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    }
  };
})();
