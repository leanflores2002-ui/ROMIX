(function () {
  const DATA_URL = "assets/data/products.json";
  const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="540" height="700"><rect width="100%" height="100%" fill="#fff7fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b7a6af" font-family="Segoe UI, Arial" font-size="24">ROMIX</text></svg>');
  const COLOR_LIMIT = 8;
  const SIZE_BASE = ["1", "2", "3", "4", "5", "6"];

  const PAGE_CONFIG = {
    mujer: { title: "Mujer", label: "Mujer" },
    hombre: { title: "Hombre", label: "Hombre" },
    ninos: { title: "Ninos", label: "Ninos" },
    novedades: { title: "Novedades", label: null },
    catalogo: { title: "Catalogo", label: null }
  };

  const SECTION_OPTIONS = [
    { key: "mujer", label: "Mujer" },
    { key: "hombre", label: "Hombre" },
    { key: "ninos", label: "Nino" }
  ];

  const CATEGORY_OPTIONS = [
    { key: "buzos", label: "Buzos" },
    { key: "calzas", label: "Calzas" },
    { key: "camperas", label: "Camperas" },
    { key: "palazos", label: "Palazos" },
    { key: "pantalones", label: "Pantalones" },
    { key: "remeras", label: "Remeras" },
    { key: "tops", label: "Tops" }
  ];

  const SEASON_OPTIONS = [
    { key: "media-estacion", label: "Media Estacion" },
    { key: "invierno", label: "Invierno" }
  ];

  const STOCK_META = {
    available: { label: "Disponible", css: "status-available" },
    low: { label: "Por agotarse", css: "status-low" },
    out: { label: "Sin stock", css: "status-out" }
  };

  const COLOR_DEFINITIONS = [
    { key: "multicolor", label: "Multicolor", hex: "#f7c948", aliases: ["multicolor", "estampado", "estampada", "print", "floreado"] },
    { key: "negro", label: "Negro", hex: "#000000", aliases: ["negro", "black", "hex", "name"] },
    { key: "blanco", label: "Blanco", hex: "#ffffff", aliases: ["blanco", "white"] },
    { key: "azul", label: "Azul", hex: "#007bff", aliases: ["azul", "azul jaspeado", "azul oscuro", "azul marino", "francia"] },
    { key: "rosa", label: "Rosa", hex: "#ff69b4", aliases: ["rosa", "fucsia"] },
    { key: "verde", label: "Verde", hex: "#28a745", aliases: ["verde", "verde jaspeado"] },
    { key: "rojo", label: "Rojo", hex: "#dc3545", aliases: ["rojo", "rojo jaspeado"] },
    { key: "morado", label: "Violeta", hex: "#6f42c1", aliases: ["violeta", "morado", "purpura"] },
    { key: "naranja", label: "Naranja", hex: "#fd7e14", aliases: ["naranja"] },
    { key: "amarillo", label: "Amarillo", hex: "#ffc107", aliases: ["amarillo"] },
    { key: "marron", label: "Marron", hex: "#795548", aliases: ["marron", "chocolate", "caqui"] },
    { key: "gris", label: "Gris", hex: "#adb5bd", aliases: ["gris", "gris jaspeado", "gris oscuro", "gris medio"] },
    { key: "otros", label: "Otros", hex: "#b9b2b8", aliases: [] }
  ];

  const RAW_COLOR_FALLBACK_HEX = {
    negro: "#000000",
    blanco: "#ffffff",
    gris: "#9aa0a6",
    "gris oscuro": "#4b4b4b",
    "gris melange": "#a9a9a9",
    "azul marino": "#0b1f5b",
    azul: "#1f4f9f",
    "azul francia": "#2f4ee8",
    rojo: "#c0392b",
    bordo: "#7a1b2a",
    verde: "#2e7d32",
    "verde oscuro": "#2f5f3f",
    fucsia: "#d91a78",
    rosa: "#ff8ab9",
    salmon: "#f28f82",
    lila: "#9f86c0",
    violeta: "#7b5ba1",
    camel: "#ba8a4f",
    beige: "#c9b79f",
    marron: "#6f4f37"
  };

  const state = {
    scope: "catalogo",
    products: [],
    view: [],
    searchQueryRaw: "",
    searchQueryNorm: "",
    searchTokens: [],
    selected: {
      sections: new Set(),
      colors: new Set(),
      categories: new Set(),
      seasons: new Set(),
      sizes: new Set()
    },
    optionLabels: {
      sections: new Map(),
      colors: new Map(),
      categories: new Map(),
      seasons: new Map(),
      sizes: new Map()
    },
    showAllColors: false,
    showAllSizes: false,
    sizeValues: []
  };

  function stripAccents(value) {
    const raw = value == null ? "" : String(value);
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (_error) {
      return raw;
    }
  }

  function normalizeText(value) {
    return stripAccents(value).toLowerCase().trim();
  }

  function resolveColorDefinitionByKey(key) {
    return COLOR_DEFINITIONS.find((entry) => entry.key === key) || COLOR_DEFINITIONS[COLOR_DEFINITIONS.length - 1];
  }

  function normalizeColorToFilterKey(value) {
    const key = normalizeText(value);
    if (!key) return "otros";

    if (key.includes("estamp") || key.includes("print") || key.includes("floread") || key.includes("multicolor")) {
      return "multicolor";
    }

    for (const definition of COLOR_DEFINITIONS) {
      if (!Array.isArray(definition.aliases) || !definition.aliases.length) continue;
      const match = definition.aliases.some((alias) => {
        const aliasKey = normalizeText(alias);
        if (!aliasKey) return false;
        return key === aliasKey || key.includes(aliasKey);
      });
      if (match) return definition.key;
    }

    return "otros";
  }

  function setOptionLabel(group, value, label) {
    const target = state.optionLabels[group];
    if (!target) return;
    target.set(String(value || ""), String(label || value || ""));
  }

  function getOptionLabel(group, value) {
    const target = state.optionLabels[group];
    const key = String(value || "");
    if (target && target.has(key)) return target.get(key);
    if (group === "sizes") return key;
    return titleCase(key);
  }

  function getActiveFilters() {
    const result = [];
    Object.keys(state.selected).forEach((group) => {
      state.selected[group].forEach((value) => {
        result.push({
          group,
          value,
          label: getOptionLabel(group, value)
        });
      });
    });
    return result;
  }

  function slugify(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "producto";
  }

  function titleCase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function toStartCase(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text
      .split(/[\s\-_]+/)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" ");
  }

  function formatPrice(value) {
    const amount = Number(value || 0);
    return "$" + amount.toLocaleString("es-AR");
  }

  function parseJsonText(text) {
    const cleaned = String(text || "").replace(/^\uFEFF/, "");
    return JSON.parse(cleaned);
  }

  function normalizeSection(value) {
    const key = normalizeText(value);
    if (["mujer", "mujeres", "dama", "damas"].includes(key)) return "mujer";
    if (["hombre", "hombres", "caballero", "caballeros"].includes(key)) return "hombre";
    if (["ninos", "ninas", "nino", "nina", "ninos y ninas", "nino y nina"].includes(key)) return "ninos";
    return key || "catalogo";
  }

  function sectionLabel(sectionKey) {
    if (sectionKey === "mujer") return "Mujer";
    if (sectionKey === "hombre") return "Hombre";
    if (sectionKey === "ninos") return "Ninos";
    return "Catalogo";
  }

  function normalizeSeason(value, fallbackName) {
    const key = normalizeText(value);
    if (key.includes("media")) return "media-estacion";
    if (key.includes("invierno")) return "invierno";
    if (key.includes("verano")) return "verano";

    const nameKey = normalizeText(fallbackName);
    if (nameKey.includes("termic") || nameKey.includes("frizado") || nameKey.includes("corder")) {
      return "invierno";
    }
    return "media-estacion";
  }

  function categoryKeyFromType(typeValue) {
    const key = normalizeText(typeValue);
    if (!key) return "";
    if (key.includes("buzo")) return "buzos";
    if (key.includes("calza")) return "calzas";
    if (key.includes("campera")) return "camperas";
    if (key.includes("palazo")) return "palazos";
    if (key.includes("pantalon") || key.includes("babucha") || key.includes("jogger")) return "pantalones";
    if (key.includes("remera") || key.includes("camiseta") || key.includes("musculosa") || key.includes("sudadera")) return "remeras";
    if (key.includes("top")) return "tops";
    return key;
  }

  function normalizeCategoryFilterValue(value) {
    const key = normalizeText(value);
    if (!key) return "";
    if (key.includes("buzo")) return "buzos";
    if (key.includes("calza")) return "calzas";
    if (key.includes("campera")) return "camperas";
    if (key.includes("palazo")) return "palazos";
    if (key.includes("pantalon") || key.includes("babucha") || key.includes("jogger") || key.includes("short")) return "pantalones";
    if (key.includes("remera") || key.includes("camiseta") || key.includes("musculosa") || key.includes("sudadera") || key.includes("conjunto") || key.includes("deporte")) return "remeras";
    if (key.includes("top")) return "tops";
    return categoryKeyFromType(key);
  }

  function tokenizeSearch(value) {
    return normalizeText(value).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function compactSearch(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "");
  }

  function readInitialSearchQuery() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return "";
    }

    const raw = params.get("q") || params.get("query") || params.get("search") || "";
    return String(raw || "").trim();
  }

  function readInitialCategoryFilterKeys() {
    let params = null;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (_error) {
      return [];
    }

    const keys = [];
    ["categories", "categoria", "category", "cat"].forEach((param) => {
      params.getAll(param).forEach((value) => {
        String(value || "")
          .split(",")
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => {
            const normalized = normalizeCategoryFilterValue(token);
            if (normalized) keys.push(normalized);
          });
      });
    });

    return Array.from(new Set(keys));
  }

  function applyInitialFiltersFromQuery() {
    const requested = readInitialCategoryFilterKeys();
    if (!requested.length) return;
    const available = new Set(collectCategoryOptions(state.products).map((option) => option.key));
    requested.forEach((key) => {
      if (available.has(key)) state.selected.categories.add(key);
    });
  }

  function applyInitialSearchFromQuery() {
    const searchQuery = readInitialSearchQuery();
    state.searchQueryRaw = searchQuery;
    state.searchQueryNorm = normalizeText(searchQuery);
    state.searchTokens = tokenizeSearch(searchQuery);
  }

  function matchesSearchQuery(product) {
    if (!state.searchQueryNorm) return true;
    if (!product) return false;

    const fields = [
      product.name,
      product.type,
      product.typeLabel,
      product.section,
      product.sectionLabel,
      product.categoryKey
    ];

    if (Array.isArray(product.colors)) {
      product.colors.forEach((entry) => {
        if (entry && entry.name) fields.push(entry.name);
      });
    }

    const haystack = normalizeText(fields.join(" "));
    const compactHaystack = compactSearch(haystack);
    const compactQuery = compactSearch(state.searchQueryNorm);

    if (compactQuery && compactHaystack.includes(compactQuery)) return true;

    const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
    return state.searchTokens.every((token) => {
      return haystack.includes(token) || words.some((word) => word.startsWith(token));
    });
  }

  function normalizeStatus(rawStatus) {
    const key = normalizeText(rawStatus);
    if (!key) return "available";
    if (key.includes("sin") || key.includes("agot") || key.includes("out") || key.includes("unavail")) return "out";
    if (key.includes("low") || key.includes("poco") || key.includes("por")) return "low";
    return "available";
  }

  function statusFromSizes(sizes) {
    if (!Array.isArray(sizes) || !sizes.length) return "available";
    let available = 0;
    let low = 0;

    sizes.forEach((entry) => {
      const status = normalizeStatus(entry && entry.status);
      if (status === "available") available += 1;
      if (status === "low") {
        available += 1;
        low += 1;
      }
    });

    if (available === 0) return "out";
    if (low > 0) return "low";
    return "available";
  }

  function resolveColorImageMap(product) {
    const map = {};
    if (!product || !product.images || typeof product.images !== "object") return map;

    Object.keys(product.images).forEach((colorName) => {
      const key = normalizeText(colorName);
      const src = String(product.images[colorName] || "").trim();
      if (!key || !src) return;
      map[key] = src;
    });

    return map;
  }

  function buildColors(product, colorImageMap) {
    const result = [];
    const seen = new Set();
    const fallbackImage = String((product && product.image) || "").trim() || PLACEHOLDER;

    const fromList = Array.isArray(product && product.colors) ? product.colors : [];
    fromList.forEach((entry) => {
      if (!entry) return;
      const name = String(entry.name || entry.value || "").trim();
      if (!name) return;
      const key = normalizeText(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push({
        key,
        name,
        hex: entry.hex || RAW_COLOR_FALLBACK_HEX[key] || "#d9d4da",
        image: colorImageMap[key] || fallbackImage
      });
    });

    if (product && product.images && typeof product.images === "object") {
      Object.keys(product.images).forEach((colorName) => {
        const name = String(colorName || "").trim();
        if (!name) return;
        const key = normalizeText(name);
        if (!key || seen.has(key)) return;
        seen.add(key);
        result.push({
          key,
          name,
          hex: RAW_COLOR_FALLBACK_HEX[key] || "#d9d4da",
          image: colorImageMap[key] || fallbackImage
        });
      });
    }

    if (!result.length) {
      result.push({
        key: "unico",
        name: "Unico",
        hex: "#dddddd",
        image: fallbackImage
      });
    }

    return result;
  }

  function buildSizes(product) {
    const list = [];
    const seen = new Set();
    const source = Array.isArray(product && product.sizes) ? product.sizes : [];

    source.forEach((entry) => {
      const value = String((entry && entry.size) || entry || "").trim();
      if (!value || seen.has(value)) return;
      seen.add(value);
      list.push({
        value,
        status: normalizeStatus(entry && entry.status)
      });
    });

    return list;
  }

  function normalizeProduct(raw) {
    const section = normalizeSection(raw && raw.section);
    const name = String((raw && raw.name) || "Producto ROMIX").trim();
    const typeRaw = String((raw && raw.type) || (raw && raw.category) || "Indumentaria").trim();
    const typeLabel = titleCase(typeRaw);
    const categoryKey = categoryKeyFromType(typeRaw);
    const sizes = buildSizes(raw);
    const colorImageMap = resolveColorImageMap(raw);
    const colors = buildColors(raw, colorImageMap);
    const filterColorKeys = Array.from(new Set(colors.map((entry) => normalizeColorToFilterKey(entry.name)).filter(Boolean)));
    const seasonKey = normalizeSeason(raw && raw.season, name);
    const baseStock = raw && raw.stockStatus ? normalizeStatus(raw.stockStatus) : "";
    const coverImage = colors[0] && colors[0].image ? colors[0].image : ((raw && raw.image) || PLACEHOLDER);

    return {
      id: String((raw && raw.id) || (section + "-" + slugify(name))),
      slug: slugify(name),
      name,
      section,
      sectionLabel: sectionLabel(section),
      type: typeRaw,
      typeLabel,
      categoryKey,
      image: coverImage,
      price: Number((raw && raw.price) || 0),
      seasonKey,
      featured: !!(raw && raw.featured === true),
      colors,
      filterColorKeys: filterColorKeys.length ? filterColorKeys : ["otros"],
      sizes,
      stockStatus: baseStock || statusFromSizes(sizes)
    };
  }

  async function loadProducts() {
    if (window.romixProductsStore && typeof window.romixProductsStore.load === "function") {
      const data = await window.romixProductsStore.load();
      return Array.isArray(data) ? data : [];
    }

    const response = await fetch(new URL(DATA_URL, window.location.href));
    const text = await response.text();
    const parsed = parseJsonText(text);
    return Array.isArray(parsed) ? parsed : [];
  }

  function productsByScope(list, scope) {
    if (scope === "mujer") {
      return list.filter((item) => item.section === "mujer");
    }
    if (scope === "hombre") {
      return list.filter((item) => item.section === "hombre");
    }
    if (scope === "ninos") {
      return list.filter((item) => item.section === "ninos");
    }
    if (scope === "novedades") {
      const featured = list.filter((item) => item.featured === true);
      return featured.length ? featured : list.slice(0, 20);
    }
    return list;
  }

  function collectColorOptions(list) {
    const map = new Map();
    list.forEach((product) => {
      const keys = Array.isArray(product.filterColorKeys) ? product.filterColorKeys : [];
      keys.forEach((key) => {
        const definition = resolveColorDefinitionByKey(key);
        if (!map.has(definition.key)) {
          map.set(definition.key, {
            key: definition.key,
            name: definition.label,
            hex: definition.hex,
            count: 0
          });
        }
        map.get(definition.key).count += 1;
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });
  }

  function collectSizes(list, options) {
    const opts = options || {};
    const includeBase = opts.includeBase !== false;
    const values = new Set(includeBase ? SIZE_BASE : []);
    list.forEach((product) => {
      product.sizes.forEach((entry) => {
        if (entry && entry.value) values.add(String(entry.value));
      });
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }

  function collectCategoryOptions(list) {
    const predefinedOrder = new Map(CATEGORY_OPTIONS.map((entry, index) => [entry.key, index]));
    const predefinedLabels = new Map(CATEGORY_OPTIONS.map((entry) => [entry.key, entry.label]));
    const map = new Map();

    list.forEach((product) => {
      const key = String(product && product.categoryKey ? product.categoryKey : "").trim();
      if (!key) return;

      if (!map.has(key)) {
        const knownLabel = predefinedLabels.get(key);
        const derivedLabel = toStartCase(product && product.typeLabel ? product.typeLabel : key);
        map.set(key, {
          key,
          label: knownLabel || derivedLabel || toStartCase(key),
          count: 0,
          order: predefinedOrder.has(key) ? predefinedOrder.get(key) : Number.MAX_SAFE_INTEGER
        });
      }

      map.get(key).count += 1;
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });
  }

  function detailUrl(product) {
    const id = encodeURIComponent(product.id || product.slug);
    const slug = encodeURIComponent(product.slug || slugify(product.name));
    const name = encodeURIComponent(product.name || "");
    return "product.html?id=" + id + "&slug=" + slug + "&name=" + name;
  }

  function getFirstColor(product) {
    return (product.colors && product.colors[0]) || { key: "unico", name: "Unico", image: product.image || PLACEHOLDER };
  }

  function getFirstAvailableSize(product) {
    if (!product.sizes.length) return "U";
    const available = product.sizes.find((entry) => entry.status !== "out");
    return String((available && available.value) || product.sizes[0].value || "U");
  }

  function showToast(message) {
    const toast = document.getElementById("catalog-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (showToast.timer) clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2100);
  }

  function addToCart(product, selectedColor) {
    if (!window.romixCart || typeof window.romixCart.addToCart !== "function") {
      window.location.href = detailUrl(product);
      return;
    }

    const fallbackColor = getFirstColor(product);
    const color = selectedColor || fallbackColor;
    const size = getFirstAvailableSize(product);
    const image = color && color.image ? color.image : product.image;

    window.romixCart.addToCart({
      productId: product.id,
      id: product.id,
      name: product.name,
      type: product.typeLabel,
      price: product.price,
      image,
      color: color.name,
      colorName: color.name,
      size,
      talle: size,
      qty: 1
    });

    if (typeof window.romixCart.updateBadge === "function") {
      window.romixCart.updateBadge("#cart-count");
    }
  }

  function renderSummary() {
    const target = document.getElementById("products-summary");
    if (!target) return;

    target.innerHTML = "Mostrando <strong>" + state.view.length + "</strong> de <strong>" + state.products.length + "</strong> productos";
  }

  function renderGrid() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const allowVariantPreview = state.scope === "mujer" || state.scope === "hombre" || state.scope === "ninos" || state.scope === "novedades";
    const cardPreviewLimit = window.innerWidth <= 640 ? 3 : 4;

    grid.innerHTML = "";

    if (!state.view.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      if (state.searchQueryRaw) {
        empty.textContent = "No encontramos resultados para \"" + state.searchQueryRaw + "\".";
      } else {
        empty.textContent = "No hay productos para los filtros seleccionados.";
      }
      grid.appendChild(empty);
      renderSummary();
      return;
    }

    state.view.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card";
      const productDetailUrl = detailUrl(product);
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "Ver detalles de " + product.name);

      function isInteractiveTarget(target) {
        return !!(target && target.closest("a, button, input, select, textarea, label"));
      }

      card.addEventListener("click", function (event) {
        if (isInteractiveTarget(event.target)) return;
        window.location.href = productDetailUrl;
      });

      card.addEventListener("keydown", function (event) {
        if (isInteractiveTarget(event.target)) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        window.location.href = productDetailUrl;
      });

      const thumb = document.createElement("div");
      thumb.className = "product-thumb";
      let selectedColor = getFirstColor(product);

      const image = document.createElement("img");
      const defaultImageSrc = product.image || PLACEHOLDER;

      function setMainImage(src, colorName) {
        const candidate = src || defaultImageSrc;
        image.onerror = function onImageError() {
          image.onerror = null;
          if (candidate !== defaultImageSrc) {
            image.src = defaultImageSrc;
            image.alt = product.name;
            return;
          }
          image.src = PLACEHOLDER;
          image.alt = product.name;
        };
        image.src = candidate;
        image.alt = colorName ? (product.name + " - " + colorName) : product.name;
      }

      image.loading = "lazy";
      image.decoding = "async";
      setMainImage((selectedColor && selectedColor.image) || defaultImageSrc, selectedColor && selectedColor.name);

      const tag = document.createElement("span");
      tag.className = "product-tag";
      tag.textContent = product.typeLabel || "Producto";

      thumb.appendChild(image);
      thumb.appendChild(tag);

      const body = document.createElement("div");
      body.className = "product-body";

      if (allowVariantPreview && Array.isArray(product.colors) && product.colors.length > 0) {
        const variants = document.createElement("div");
        variants.className = "product-variants";
        const visibleColors = product.colors.slice(0, cardPreviewLimit);

        visibleColors.forEach((color, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "variant-chip" + (index === 0 ? " is-active" : "");
          button.setAttribute("aria-label", "Ver color " + color.name);
          button.title = color.name;
          button.style.backgroundColor = color.hex || "#efecf3";

          const swatch = document.createElement("img");
          swatch.loading = "lazy";
          swatch.decoding = "async";
          swatch.src = color.image || product.image || PLACEHOLDER;
          swatch.alt = color.name;
          swatch.onerror = function onSwatchError() {
            swatch.onerror = null;
            swatch.remove();
            button.classList.add("variant-chip--color");
          };

          button.appendChild(swatch);
          button.addEventListener("click", function () {
            selectedColor = color;
            setMainImage(color.image || defaultImageSrc, color.name);
            variants.querySelectorAll(".variant-chip").forEach((chip) => chip.classList.remove("is-active"));
            button.classList.add("is-active");
          });

          variants.appendChild(button);
        });

        if (product.colors.length > cardPreviewLimit) {
          const more = document.createElement("span");
          more.className = "variant-more";
          more.textContent = "+" + (product.colors.length - cardPreviewLimit);
          more.setAttribute("aria-label", "Hay " + (product.colors.length - cardPreviewLimit) + " colores adicionales");
          variants.appendChild(more);
        }

        body.appendChild(variants);
      }

      const name = document.createElement("p");
      name.className = "product-name";
      name.textContent = product.name;

      const meta = document.createElement("p");
      meta.className = "product-meta";
      const pageConfig = PAGE_CONFIG[state.scope] || PAGE_CONFIG.catalogo;
      const sectionLabelText = pageConfig.label || product.sectionLabel;
      meta.textContent = sectionLabelText + " | " + (product.typeLabel || "Indumentaria");

      const priceRow = document.createElement("div");
      priceRow.className = "price-row";

      const price = document.createElement("p");
      price.className = "product-price";
      price.textContent = formatPrice(product.price);

      const stock = document.createElement("p");
      const stockInfo = STOCK_META[product.stockStatus] || STOCK_META.available;
      stock.className = "stock-note " + stockInfo.css;
      stock.textContent = stockInfo.label;

      priceRow.appendChild(price);
      priceRow.appendChild(stock);

      const actions = document.createElement("div");
      actions.className = "product-actions";

      const details = document.createElement("a");
      details.className = "btn-card btn-card-details";
      details.href = productDetailUrl;
      details.textContent = "Detalles";

      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn-card btn-card-buy";
      buy.textContent = "Agregar";

      if (product.stockStatus === "out") {
        buy.disabled = true;
        buy.textContent = "Sin stock";
      } else {
        buy.addEventListener("click", function () {
          addToCart(product, selectedColor);
        });
      }

      actions.appendChild(details);
      actions.appendChild(buy);

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(priceRow);
      body.appendChild(actions);

      card.appendChild(thumb);
      card.appendChild(body);
      grid.appendChild(card);
    });

    renderSummary();
  }

  function matchFilters(product) {
    if (state.scope === "catalogo" && state.selected.sections.size) {
      const section = Array.from(state.selected.sections)[0];
      if (section && product.section !== section) return false;
    }

    if (state.selected.colors.size) {
      const colorKeys = Array.isArray(product.filterColorKeys) ? product.filterColorKeys : [];
      const hasColor = colorKeys.some((key) => state.selected.colors.has(key));
      if (!hasColor) return false;
    }

    if (state.selected.categories.size) {
      if (!state.selected.categories.has(product.categoryKey)) return false;
    }

    if (state.selected.seasons.size) {
      if (!state.selected.seasons.has(product.seasonKey)) return false;
    }

    if (state.selected.sizes.size) {
      const sizeValues = product.sizes.map((entry) => String(entry.value));
      const hasSize = sizeValues.some((value) => state.selected.sizes.has(value));
      if (!hasSize) return false;
    }

    if (!matchesSearchQuery(product)) return false;

    return true;
  }

  function syncCheckboxState(group, value, checked) {
    const selector = ".filters-sidebar input[data-group='" + group + "']";
    const inputs = Array.from(document.querySelectorAll(selector));
    const target = inputs.find((input) => String(input.value || "") === String(value || ""));
    if (target) target.checked = checked;
  }

  function renderActiveFilters() {
    const bar = document.getElementById("active-filters-bar");
    const title = document.getElementById("active-filters-title");
    const list = document.getElementById("active-filters-list");
    const clear = document.getElementById("active-filters-clear");
    if (!bar || !title || !list || !clear) return;

    const activeFilters = getActiveFilters().sort((a, b) => {
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });

    const hasActiveFilters = activeFilters.length > 0;
    title.textContent = "Filtros activos (" + activeFilters.length + ")";
    clear.disabled = !hasActiveFilters;
    bar.hidden = !hasActiveFilters;
    bar.classList.toggle("is-empty", !hasActiveFilters);

    list.innerHTML = "";

    if (!hasActiveFilters) return;

    activeFilters.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "active-filter-chip";

      const text = document.createElement("span");
      text.className = "active-filter-chip-text";
      text.textContent = item.label;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "active-filter-chip-remove";
      remove.dataset.group = item.group;
      remove.dataset.value = item.value;
      remove.setAttribute("aria-label", "Quitar filtro " + item.label);
      remove.textContent = "X";

      chip.appendChild(text);
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }

  function applyFilters() {
    state.view = state.products.filter(matchFilters);
    renderGrid();
    renderActiveFilters();
  }

  function onFilterChange(event) {
    const input = event.target;
    if (!input || (input.type !== "checkbox" && input.type !== "radio")) return;

    const group = input.dataset.group;
    const value = String(input.value || "");
    if (!group || !state.selected[group]) return;

    if (group === "sections") {
      state.selected.sections.clear();
      if (input.checked) state.selected.sections.add(value);
      state.selected.sizes.clear();
      state.showAllSizes = false;
      renderSizeFilters();
      applyFilters();
      return;
    }

    if (input.checked) state.selected[group].add(value);
    else state.selected[group].delete(value);

    applyFilters();
  }

  function resetFilters() {
    Object.keys(state.selected).forEach((key) => state.selected[key].clear());
    state.showAllSizes = false;
    document.querySelectorAll(".filters-sidebar input[data-group]").forEach((input) => {
      input.checked = false;
    });
    renderSizeFilters();
    applyFilters();
  }

  function removeActiveFilter(group, value) {
    if (!group || !state.selected[group]) return;
    const safeValue = String(value || "");
    state.selected[group].delete(safeValue);
    syncCheckboxState(group, safeValue, false);
    if (group === "sections") {
      state.selected.sizes.clear();
      state.showAllSizes = false;
      renderSizeFilters();
    }
    applyFilters();
  }

  function toggleExtraOptions(group, showAll) {
    const selector = group === "colors" ? "#color-options .filter-option" : "#size-options .size-chip";
    const limit = group === "colors" ? COLOR_LIMIT : SIZE_BASE.length;
    const rows = Array.from(document.querySelectorAll(selector));

    rows.forEach((row, index) => {
      if (index < limit) {
        row.classList.remove("is-hidden");
        return;
      }
      row.classList.toggle("is-hidden", !showAll);
    });

    const buttonId = group === "colors" ? "color-more-btn" : "size-more-btn";
    const button = document.getElementById(buttonId);
    if (!button) return;

    const hasMore = rows.length > limit;
    button.classList.toggle("is-hidden", !hasMore);
    if (!hasMore) return;

    button.textContent = showAll ? "Ver menos" : "+ Ver mas";
  }

  function renderColorFilters() {
    const container = document.getElementById("color-options");
    if (!container) return;

    container.innerHTML = "";
    const options = collectColorOptions(state.products);
    state.optionLabels.colors.clear();

    options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "filter-option" + (index >= COLOR_LIMIT && !state.showAllColors ? " is-hidden" : "");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "colors";
      input.value = option.key;
      input.checked = state.selected.colors.has(option.key);

      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.background = option.hex;

      const text = document.createElement("span");
      text.textContent = option.name;
      setOptionLabel("colors", option.key, option.name);

      label.appendChild(input);
      label.appendChild(dot);
      label.appendChild(text);
      container.appendChild(label);
    });

    toggleExtraOptions("colors", state.showAllColors);
  }

  function renderCategoryFilters() {
    const container = document.getElementById("category-options");
    if (!container) return;

    container.innerHTML = "";
    state.optionLabels.categories.clear();
    const options = collectCategoryOptions(state.products);

    options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "categories";
      input.value = option.key;
      input.checked = state.selected.categories.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("categories", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSeasonFilters() {
    const container = document.getElementById("season-options");
    if (!container) return;

    container.innerHTML = "";
    state.optionLabels.seasons.clear();

    SEASON_OPTIONS.forEach((option) => {
      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = "seasons";
      input.value = option.key;
      input.checked = state.selected.seasons.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("seasons", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSectionFilters() {
    const container = document.getElementById("section-options");
    const group = document.getElementById("section-filter-group");
    if (!container || !group || state.scope !== "catalogo") return;

    container.innerHTML = "";
    state.optionLabels.sections.clear();

    const counts = { mujer: 0, hombre: 0, ninos: 0 };
    state.products.forEach((product) => {
      if (counts[product.section] != null) counts[product.section] += 1;
    });

    SECTION_OPTIONS.forEach((option) => {
      const count = counts[option.key] || 0;
      if (!count) return;

      const label = document.createElement("label");
      label.className = "filter-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "catalog-section";
      input.dataset.group = "sections";
      input.value = option.key;
      input.checked = state.selected.sections.has(option.key);

      const text = document.createElement("span");
      text.textContent = option.label;
      setOptionLabel("sections", option.key, option.label);

      label.appendChild(input);
      label.appendChild(text);
      container.appendChild(label);
    });
  }

  function renderSizeFilters() {
    const container = document.getElementById("size-options");
    if (!container) return;
    const group = document.getElementById("size-filter-group");
    const helper = document.getElementById("size-helper");
    const sizeMoreButton = document.getElementById("size-more-btn");

    if (state.scope === "catalogo") {
      const selectedSection = Array.from(state.selected.sections)[0] || "";
      if (!selectedSection) {
        state.sizeValues = [];
        state.selected.sizes.clear();
        container.innerHTML = "";
        if (sizeMoreButton) {
          sizeMoreButton.classList.add("is-hidden");
          sizeMoreButton.disabled = true;
          sizeMoreButton.setAttribute("aria-disabled", "true");
        }
        if (group) {
          group.classList.add("is-disabled", "is-collapsed");
          group.setAttribute("aria-disabled", "true");
        }
        if (helper) {
          helper.hidden = false;
          helper.textContent = "Seleccioná una sección para ver los talles disponibles";
        }
        return;
      }

      if (group) {
        group.classList.remove("is-disabled", "is-collapsed");
        group.removeAttribute("aria-disabled");
      }
      if (helper) helper.hidden = true;
      if (sizeMoreButton) {
        sizeMoreButton.disabled = false;
        sizeMoreButton.removeAttribute("aria-disabled");
      }

      const sectionProducts = state.products.filter((product) => product.section === selectedSection);
      state.sizeValues = collectSizes(sectionProducts, { includeBase: false });
      const allowedSizes = new Set(state.sizeValues);
      state.selected.sizes.forEach((value) => {
        if (!allowedSizes.has(value)) state.selected.sizes.delete(value);
      });
    } else {
      if (group) {
        group.classList.remove("is-disabled", "is-collapsed");
        group.removeAttribute("aria-disabled");
      }
      if (helper) helper.hidden = true;
      if (sizeMoreButton) {
        sizeMoreButton.disabled = false;
        sizeMoreButton.removeAttribute("aria-disabled");
      }
      state.sizeValues = collectSizes(state.products);
    }

    container.innerHTML = "";
    state.optionLabels.sizes.clear();

    if (!state.sizeValues.length) {
      if (helper && state.scope === "catalogo") {
        helper.hidden = false;
        helper.textContent = "No hay talles disponibles para la sección seleccionada";
      }
      if (sizeMoreButton) sizeMoreButton.classList.add("is-hidden");
      return;
    }

    state.sizeValues.forEach((value, index) => {
      const holder = document.createElement("div");
      holder.className = "size-chip" + (index >= SIZE_BASE.length && !state.showAllSizes ? " is-hidden" : "");

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = "size-filter-" + value;
      input.dataset.group = "sizes";
      input.value = value;
      input.checked = state.selected.sizes.has(value);

      const label = document.createElement("label");
      label.setAttribute("for", input.id);
      label.textContent = value;
      setOptionLabel("sizes", value, value);

      holder.appendChild(input);
      holder.appendChild(label);
      container.appendChild(holder);
    });

    toggleExtraOptions("sizes", state.showAllSizes);
  }

  function initPageHeader() {
    const config = PAGE_CONFIG[state.scope] || PAGE_CONFIG.catalogo;
    const title = document.getElementById("page-title");
    if (title) {
      if (state.scope === "catalogo") title.textContent = "Catalogo completo ROMIX";
      else if (state.scope === "novedades") title.textContent = "Novedades destacadas ROMIX";
      else title.textContent = "Catalogo " + config.title + " ROMIX";
    }

    document.querySelectorAll(".catalog-nav a[data-scope]").forEach((link) => {
      const active = link.dataset.scope === state.scope;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function closeSidebar() {
    document.body.classList.remove("filters-open");
  }

  function openSidebar() {
    document.body.classList.add("filters-open");
  }

  function wireUiEvents() {
    const sidebar = document.getElementById("filters-sidebar");
    if (sidebar) sidebar.addEventListener("change", onFilterChange);

    const clearBtn = document.getElementById("clear-filters");
    if (clearBtn) clearBtn.addEventListener("click", resetFilters);

    const activeFiltersClearBtn = document.getElementById("active-filters-clear");
    if (activeFiltersClearBtn) activeFiltersClearBtn.addEventListener("click", resetFilters);

    const activeFiltersList = document.getElementById("active-filters-list");
    if (activeFiltersList) {
      activeFiltersList.addEventListener("click", function (event) {
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        const removeButton = target.closest(".active-filter-chip-remove");
        if (!removeButton) return;
        removeActiveFilter(removeButton.dataset.group, removeButton.dataset.value);
      });
    }

    const colorMore = document.getElementById("color-more-btn");
    if (colorMore) {
      colorMore.addEventListener("click", function () {
        state.showAllColors = !state.showAllColors;
        toggleExtraOptions("colors", state.showAllColors);
      });
    }

    const sizeMore = document.getElementById("size-more-btn");
    if (sizeMore) {
      sizeMore.addEventListener("click", function () {
        state.showAllSizes = !state.showAllSizes;
        toggleExtraOptions("sizes", state.showAllSizes);
      });
    }

    const openBtn = document.getElementById("open-filters");
    if (openBtn) {
      openBtn.addEventListener("click", openSidebar);
    }

    const closeBtn = document.getElementById("close-filters");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeSidebar);
    }

    const overlay = document.getElementById("filters-overlay");
    if (overlay) {
      overlay.addEventListener("click", closeSidebar);
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) closeSidebar();
    });
  }

  async function init() {
    const scope = document.body && document.body.dataset ? document.body.dataset.catalogScope : "catalogo";
    state.scope = PAGE_CONFIG[scope] ? scope : "catalogo";

    initPageHeader();
    wireUiEvents();

    try {
      const raw = await loadProducts();
      const normalized = raw
        .map(normalizeProduct)
        .filter((item) => item && item.seasonKey !== "verano");
      state.products = productsByScope(normalized, state.scope);
      state.view = state.products.slice();
      applyInitialSearchFromQuery();
      applyInitialFiltersFromQuery();

      renderColorFilters();
      renderSectionFilters();
      renderCategoryFilters();
      renderSeasonFilters();
      renderSizeFilters();
      applyFilters();
    } catch (error) {
      const grid = document.getElementById("product-grid");
      if (grid) {
        grid.innerHTML = "";
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent = "No se pudieron cargar los productos.";
        grid.appendChild(empty);
      }
      renderSummary();
      console.error("[romix-catalog]", error);
    }

    if (window.romixCart && typeof window.romixCart.updateBadge === "function") {
      window.romixCart.updateBadge("#cart-count");
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
