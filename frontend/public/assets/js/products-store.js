(() => {
  const CACHE_KEY = 'romixProductsCacheV1';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const DATA_URL = 'assets/data/products.json';

  let memoryCache = null;
  let inFlight = null;

  function sanitizeList(list) {
    if (typeof window.sanitizeList === 'function') {
      return window.sanitizeList(Array.isArray(list) ? list : []);
    }
    return Array.isArray(list) ? list : [];
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
      } catch {}
    }

    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const fileList = sanitizeList(await response.json());
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
    clear() {
      memoryCache = null;
      inFlight = null;
      try { sessionStorage.removeItem(CACHE_KEY); } catch {}
    }
  };
})();
