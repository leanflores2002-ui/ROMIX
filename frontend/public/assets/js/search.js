// Predictive shared search for ROMIX.
(function () {
  let PRODUCTS = null;
  let SEARCH_STATE = null;

  const globalFixUtf8 = typeof window.fixUtf8 === "function" ? window.fixUtf8 : (value) => value;
  const hideProduct = typeof window.romixShouldHideProduct === "function"
    ? window.romixShouldHideProduct
    : () => false;

  const SECTION_LABELS = {
    mujer: "Mujer",
    hombre: "Hombre",
    ninos: "Ni\u00f1os",
    novedades: "Novedades"
  };

  const TYPE_LABELS = {
    calzas: "Calzas",
    pantalones: "Pantalones",
    remeras: "Remeras",
    camperas: "Camperas",
    buzos: "Buzos",
    tops: "Tops",
    palazos: "Palazos",
    accesorios: "Accesorios"
  };

  function sanitizeProducts(list) {
    const seen = new Set();
    const out = [];
    (Array.isArray(list) ? list : []).forEach((product) => {
      if (!product || !product.name) return;
      const copy = Object.assign({}, product);
      ["name", "type", "section", "badge", "description", "season", "collection"].forEach((key) => {
        if (copy[key]) copy[key] = globalFixUtf8(String(copy[key]));
      });
      if (Array.isArray(copy.colors)) {
        copy.colors = copy.colors.map((color) => Object.assign({}, color, {
          name: globalFixUtf8(color && color.name)
        }));
      }
      if (hideProduct(copy)) return;
      const key = String(copy.id || copy.slug || copy.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(copy);
    });
    return out;
  }

  function qs(name) {
    const params = new URLSearchParams(location.search);
    return (params.get(name) || "").trim();
  }

  function norm(value) {
    if (!value) return "";
    const raw = String(value).trim().toLowerCase();
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    } catch (_error) {
      return raw;
    }
  }

  function compact(value) {
    return norm(value).replace(/[^a-z0-9]+/g, "");
  }

  function tokenize(value) {
    return norm(value).split(/[^a-z0-9]+/).filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function defaultSlugify(value) {
    return norm(String(value || ""))
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function slugify(value) {
    const shared = typeof window.romixSlugify === "function" ? window.romixSlugify : window.slugify;
    if (typeof shared === "function") return shared(value);
    return defaultSlugify(value);
  }

  function titleCase(value) {
    return String(value || "")
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function normalizeSection(value) {
    const key = norm(value);
    if (["mujer", "mujeres", "dama", "damas"].includes(key)) return "mujer";
    if (["hombre", "hombres", "caballero", "caballeros"].includes(key)) return "hombre";
    if (["ninos", "ninas", "nino", "nina", "kids", "infantil"].includes(key)) return "ninos";
    return key || "";
  }

  function normalizeType(value) {
    const key = compact(value);
    if (!key) return "";
    if (key.includes("calza")) return "calzas";
    if (key.includes("pantalon") || key.includes("jogger") || key.includes("babucha") || key.includes("recto")) return "pantalones";
    if (key.includes("remera") || key.includes("camiseta")) return "remeras";
    if (key.includes("campera")) return "camperas";
    if (key.includes("buzo")) return "buzos";
    if (key.includes("top")) return "tops";
    if (key.includes("palazo") || key.includes("palazzo")) return "palazos";
    if (key.includes("accesorio") || key.includes("cuello")) return "accesorios";
    return key;
  }

  function sectionLabel(value) {
    const key = normalizeSection(value);
    return SECTION_LABELS[key] || titleCase(value || key || "ROMIX");
  }

  function typeLabel(value) {
    const key = normalizeType(value);
    return TYPE_LABELS[key] || titleCase(value || key || "Productos");
  }

  function formatPrice(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) return "";
    try {
      return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0
      }).format(number);
    } catch (_error) {
      return "$" + Math.round(number).toLocaleString("es-AR");
    }
  }

  function buildCatalogUrl(params) {
    const search = new URLSearchParams();
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value == null || String(value).trim() === "") return;
      search.set(key, String(value).trim());
    });
    const query = search.toString();
    return "catalogo.html" + (query ? "?" + query : "");
  }

  function buildDetailUrl(product, slugOverride, nameOverride) {
    const slugValue = slugOverride || slugify(product && product.name ? product.name : "");
    const nameValue = nameOverride || globalFixUtf8(product && product.name ? product.name : "");
    const pid = typeof window.productId === "function" ? window.productId(product) : (product && (product.id || product.slug)) || slugValue;
    return "product.html?id=" + encodeURIComponent(pid) +
      "&slug=" + encodeURIComponent(slugValue) +
      "&name=" + encodeURIComponent(nameValue);
  }

  function getProductImage(product) {
    const imageUtils = window.romixImageUtils || {};
    if (typeof imageUtils.getProductMainImage === "function") {
      const main = imageUtils.getProductMainImage(product);
      if (main) return main;
    }
    if (typeof imageUtils.getThumbPath === "function" && product && product.image) {
      return imageUtils.getThumbPath(product.image);
    }
    return (product && (product.thumbnail || product.thumb || product.image || (Array.isArray(product.images) && product.images[0]))) || "images/logo-romix.png";
  }

  function ensureProducts() {
    if (PRODUCTS) return Promise.resolve(PRODUCTS);
    if (Array.isArray(window.PRELOADED_PRODUCTS) && window.PRELOADED_PRODUCTS.length) {
      PRODUCTS = sanitizeProducts(window.PRELOADED_PRODUCTS);
      return Promise.resolve(PRODUCTS);
    }
    if (window.romixProductsStore && typeof window.romixProductsStore.load === "function") {
      return window.romixProductsStore
        .load({ preloaded: window.PRELOADED_PRODUCTS })
        .then((data) => {
          PRODUCTS = sanitizeProducts(data || []);
          return PRODUCTS;
        })
        .catch(() => []);
    }

    const tryApi = () => fetch("/api/products").then((response) => response.ok ? response.json() : Promise.reject());
    const tryFile = () => fetch(new URL("assets/data/products.json", location.href)).then((response) => response.json());
    return tryApi()
      .catch(tryFile)
      .then((data) => {
        PRODUCTS = sanitizeProducts(data || []);
        return PRODUCTS;
      })
      .catch(() => []);
  }

  function productFields(product) {
    const fields = [
      product && product.name,
      product && product.type,
      product && product.category,
      product && product.section,
      product && product.gender,
      product && product.genero,
      product && product.collection,
      product && product.season,
      product && product.badge,
      product && product.description
    ];

    if (Array.isArray(product && product.tags)) {
      product.tags.forEach((tag) => fields.push(tag));
    }
    if (Array.isArray(product && product.colors)) {
      product.colors.forEach((color) => {
        if (color && color.name) fields.push(color.name);
      });
    }
    return fields.filter(Boolean).join(" ");
  }

  function editDistanceAtMost(a, b, max) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (Math.abs(a.length - b.length) > max) return false;
    const prev = new Array(b.length + 1);
    const curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      let rowMin = curr[0];
      for (let j = 1; j <= b.length; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
        if (curr[j] < rowMin) rowMin = curr[j];
      }
      if (rowMin > max) return false;
      for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }
    return prev[b.length] <= max;
  }

  function scoreProduct(product, queryNorm) {
    if (!product || !queryNorm) return -1;
    const name = norm(product.name || "");
    const type = norm(product.type || product.category || "");
    const section = norm(product.section || product.gender || "");
    const combined = norm(productFields(product));
    const compactQuery = compact(queryNorm);
    const compactCombined = compact(combined);
    const words = tokenize(combined);
    const tokens = tokenize(queryNorm);
    let score = -1;

    if (name.startsWith(queryNorm)) score = Math.max(score, 130 - name.length);
    if (name.includes(queryNorm)) score = Math.max(score, 112 - name.indexOf(queryNorm));
    if (type.startsWith(queryNorm)) score = Math.max(score, 104);
    if (type.includes(queryNorm)) score = Math.max(score, 94);
    if (section.includes(queryNorm)) score = Math.max(score, 70);
    if (compactQuery && compactCombined.includes(compactQuery)) score = Math.max(score, 86);

    if (tokens.length) {
      let matched = 0;
      tokens.forEach((token) => {
        if (combined.includes(token) || words.some((word) => word.startsWith(token))) {
          matched += 1;
          return;
        }
        if (token.length >= 3) {
          const max = token.length <= 5 ? 1 : 2;
          if (words.some((word) => editDistanceAtMost(token, word, max))) matched += 1;
        }
      });
      if (matched === tokens.length) score = Math.max(score, 76 + matched * 4);
      else if (matched) score = Math.max(score, 42 + matched * 4);
    }

    return score;
  }

  function searchProductsSync(list, term, options) {
    const opts = options || {};
    const queryNorm = norm((term || "").trim());
    const category = opts.category ? norm(opts.category) : "";
    if (!queryNorm) return [];
    const seen = new Set();
    const results = [];
    (Array.isArray(list) ? list : []).forEach((product) => {
      if (!product || !product.name) return;
      if (category && norm(product.section || "") !== category) return;
      const score = scoreProduct(product, queryNorm);
      if (score < 0) return;
      const key = String(product.id || product.slug || product.name).toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ product, score });
    });
    results.sort((a, b) => b.score - a.score || String(a.product.name || "").localeCompare(String(b.product.name || ""), "es"));
    return results.map((entry) => entry.product);
  }

  function searchProducts(term, options) {
    return ensureProducts().then((list) => searchProductsSync(list, term, options));
  }

  function buildSearchModel(query, products) {
    const term = String(query || "").trim();
    const qn = norm(term);
    const results = qn ? searchProductsSync(products, term).slice(0, 24) : [];
    const defaultProducts = (Array.isArray(products) ? products : [])
      .filter((product) => product && product.name)
      .slice(0, 4);
    return {
      query: term,
      products: qn ? results.slice(0, 4) : defaultProducts,
      suggestions: buildSuggestions(term, results, products),
      categories: buildCategories(term, results)
    };
  }

  function addSuggestion(map, label, source, score) {
    const clean = String(label || "").trim();
    if (!clean || clean.length < 3) return;
    const key = norm(clean);
    if (!key || map.has(key)) return;
    map.set(key, { label: clean, source: source || "", score: score || 0 });
  }

  function buildSuggestions(query, results, products) {
    const qn = norm(query);
    const map = new Map();
    const source = results.length ? results : (Array.isArray(products) ? products : []);

    source.forEach((product, index) => {
      const score = Math.max(1, 80 - index);
      addSuggestion(map, product.name, product.type || product.section, score);
      addSuggestion(map, product.type, sectionLabel(product.section), score - 8);
      addSuggestion(map, product.season, "Temporada", score - 14);

      tokenize(product.name || "").forEach((word) => {
        if (word.length >= 4 && (!qn || word.startsWith(qn) || word.includes(qn))) {
          addSuggestion(map, word, product.type || "Producto", score - 20);
        }
      });
    });

    return Array.from(map.values())
      .filter((entry) => !qn || norm(entry.label).includes(qn) || compact(entry.label).includes(compact(qn)))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, "es"))
      .slice(0, 6);
  }

  function buildCategories(query, results) {
    const qn = norm(query);
    const map = new Map();
    results.forEach((product) => {
      const section = normalizeSection(product.section || product.gender);
      const type = normalizeType(product.type || product.category);
      if (!section || !type) return;
      const key = section + "|" + type;
      if (!map.has(key)) {
        map.set(key, {
          section,
          type,
          label: sectionLabel(section) + " \u00b7 " + typeLabel(type),
          count: 0,
          href: buildCatalogUrl({ section, tipo: type, q: query })
        });
      }
      map.get(key).count += 1;
    });

    return Array.from(map.values())
      .filter((entry) => !qn || norm(entry.label + " " + entry.type).includes(qn) || entry.count > 0)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
      .slice(0, 5);
  }

  function renderProductCard(product) {
    const href = buildDetailUrl(product);
    const image = getProductImage(product);
    const colors = Array.isArray(product.colors) ? product.colors.slice(0, 4) : [];
    const colorDots = colors.length
      ? '<div class="romix-search-product__colors" aria-label="Colores disponibles">' +
          colors.map((color) => (
            '<span style="--swatch:' + escapeHtml((color && color.hex) || "#d9d9d9") + '" title="' + escapeHtml((color && color.name) || "Color") + '"></span>'
          )).join("") +
        '</div>'
      : "";

    return '' +
      '<a class="romix-search-product" href="' + escapeHtml(href) + '">' +
        '<span class="romix-search-product__media">' +
          '<img src="' + escapeHtml(image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy" decoding="async" />' +
        '</span>' +
        '<span class="romix-search-product__body">' +
          '<small>' + escapeHtml(sectionLabel(product.section)) + ' &middot; ' + escapeHtml(typeLabel(product.type || product.category)) + '</small>' +
          '<strong>' + escapeHtml(product.name) + '</strong>' +
          (formatPrice(product.price) ? '<span class="romix-search-product__price">' + escapeHtml(formatPrice(product.price)) + '</span>' : '') +
          colorDots +
        '</span>' +
      '</a>';
  }

  function renderPanel(model) {
    const state = SEARCH_STATE;
    if (!state || !state.overlay) return;

    const hasQuery = model.query.length > 0;
    const viewAllHref = hasQuery ? buildCatalogUrl({ q: model.query }) : "catalogo.html";
    const suggestions = model.suggestions.length
      ? model.suggestions.map((entry) => (
        '<button class="romix-search-chip" type="button" data-search-suggestion="' + escapeHtml(entry.label) + '">' +
          '<span aria-hidden="true"></span>' +
          '<strong>' + escapeHtml(entry.label) + '</strong>' +
          (entry.source ? '<small>' + escapeHtml(entry.source) + '</small>' : '') +
        '</button>'
      )).join("")
      : '<p class="romix-search-muted">Prob&aacute; con calzas, camperas, pantalones o t&eacute;rmicos.</p>';

    const categories = model.categories.length
      ? model.categories.map((entry) => (
        '<a class="romix-search-category" href="' + escapeHtml(entry.href) + '">' +
          '<span>' + escapeHtml(entry.label) + '</span>' +
          '<small>' + entry.count + '</small>' +
        '</a>'
      )).join("")
      : '<p class="romix-search-muted">Las categor&iacute;as aparecen seg&uacute;n tu b&uacute;squeda.</p>';

    const products = model.products.length
      ? model.products.map(renderProductCard).join("")
      : '<div class="romix-search-empty">' +
          '<strong>No encontramos productos para tu b&uacute;squeda.</strong>' +
          '<span>Prob&aacute; con calzas, camperas, pantalones o t&eacute;rmicos.</span>' +
        '</div>';

    state.overlay.innerHTML = '' +
      '<div class="romix-search-layout">' +
        '<aside class="romix-search-side">' +
          '<section>' +
            '<h3>Sugerencias</h3>' +
            '<div class="romix-search-list">' + suggestions + '</div>' +
          '</section>' +
          '<section>' +
            '<h3>Categor&iacute;as</h3>' +
            '<div class="romix-search-list">' + categories + '</div>' +
          '</section>' +
        '</aside>' +
        '<section class="romix-search-results">' +
          '<div class="romix-search-results__head">' +
            '<div>' +
              '<span>Mejores resultados</span>' +
              '<h3>' + (hasQuery ? 'Para "' + escapeHtml(model.query) + '"' : "Busc&aacute; productos ROMIX") + '</h3>' +
            '</div>' +
            '<a href="' + escapeHtml(viewAllHref) + '">Ver todo</a>' +
          '</div>' +
          '<div class="romix-search-products">' + products + '</div>' +
        '</section>' +
      '</div>';

    state.overlay.querySelectorAll("[data-search-suggestion]").forEach((button) => {
      button.addEventListener("click", () => {
        state.input.value = button.getAttribute("data-search-suggestion") || "";
        state.input.focus();
        scheduleRender();
      });
    });
  }

  function showLoading() {
    const state = SEARCH_STATE;
    if (!state || !state.overlay) return;
    state.overlay.innerHTML = '<div class="romix-search-loading">Buscando productos...</div>';
  }

  function scheduleRender() {
    const state = SEARCH_STATE;
    if (!state) return;
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => {
      const query = state.input.value.trim();
      showLoading();
      ensureProducts().then((products) => {
        renderPanel(buildSearchModel(query, products));
      });
      updateClearButton();
    }, 180);
  }

  function setSearchOpen(open) {
    const state = SEARCH_STATE;
    if (!state || !state.panel) return;
    state.panel.classList.toggle("is-open", open);
    state.panel.classList.toggle("romix-search-panel-open", open);
    document.body.classList.toggle("romix-search-open", open);
    document.querySelectorAll("[data-search-toggle='true']").forEach((toggle) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    if (open) {
      scheduleRender();
      window.setTimeout(() => state.input && state.input.focus(), 20);
    }
  }

  function closeSearch() {
    setSearchOpen(false);
  }

  function updateClearButton() {
    const state = SEARCH_STATE;
    if (!state || !state.clearButton) return;
    state.clearButton.hidden = !state.input.value.trim();
  }

  function enhanceForm(form) {
    if (!form || form.dataset.predictiveSearchBound === "1") return;
    form.dataset.predictiveSearchBound = "1";
    form.classList.add("romix-search-form");
    if (!form.getAttribute("action")) form.setAttribute("action", "catalogo.html");
    if (!form.getAttribute("method")) form.setAttribute("method", "get");

    const input = form.querySelector('input[name="q"]');
    if (!input) return;
    input.setAttribute("aria-label", "Buscar productos");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "Buscar calzas, camperas, pantalones...");

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.classList.add("romix-search-submit");

    const panel = form.closest(".search-panel") || document.getElementById("header-search");
    const shell = document.createElement("div");
    shell.className = "romix-search-shell";
    shell.innerHTML = '' +
      '<span class="romix-search-icon" aria-hidden="true"></span>' +
      '<button class="romix-search-clear" type="button" aria-label="Limpiar b&uacute;squeda" hidden>x</button>' +
      '<button class="romix-search-cancel" type="button" aria-label="Cancelar b&uacute;squeda">Cancelar</button>' +
      '<div class="romix-search-overlay" role="region" aria-label="Resultados de b&uacute;squeda"></div>';

    form.appendChild(shell);
    shell.insertBefore(input, shell.querySelector(".romix-search-clear"));
    if (submit) submit.hidden = true;

    SEARCH_STATE = {
      form,
      input,
      panel,
      overlay: shell.querySelector(".romix-search-overlay"),
      clearButton: shell.querySelector(".romix-search-clear"),
      cancelButton: shell.querySelector(".romix-search-cancel"),
      timer: null
    };

    const initialQuery = qs("q") || qs("search") || qs("query");
    if (initialQuery && !String(input.value || "").trim()) {
      input.value = initialQuery;
    }
    updateClearButton();

    input.addEventListener("focus", () => setSearchOpen(true));
    input.addEventListener("input", scheduleRender);
    SEARCH_STATE.clearButton.addEventListener("click", () => {
      input.value = "";
      updateClearButton();
      input.focus();
      scheduleRender();
    });
    SEARCH_STATE.cancelButton.addEventListener("click", closeSearch);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = input.value.trim();
      if (!query) return;
      location.href = buildCatalogUrl({ q: query });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel && panel.classList.contains("is-open")) closeSearch();
    });
  }

  function findAndFocus(query) {
    const q = norm(query);
    const cards = document.querySelectorAll(".product-card");
    let first;
    cards.forEach((card) => {
      if (first) return;
      let nameText = "";
      try {
        const data = JSON.parse(card.dataset.product || "{}");
        nameText = data && data.name ? data.name : "";
      } catch (_error) {}
      if (!nameText) {
        const element = card.querySelector(".product-title, .product-name, .product-card__title");
        nameText = element ? element.textContent : "";
      }
      if (norm(nameText).includes(q)) first = card;
    });
    if (first) {
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      first.classList.add("search-highlight");
      setTimeout(() => first && first.classList.remove("search-highlight"), 2000);
      return true;
    }
    return false;
  }

  function runIfNeeded() {
    const q = qs("q");
    if (!q) return;
    let tries = 0;
    const max = 20;
    const timer = setInterval(() => {
      tries += 1;
      if (findAndFocus(q) || tries >= max) clearInterval(timer);
    }, 200);
  }

  function initSearchUi() {
    injectSearchStyles();
    const form = document.getElementById("global-search-form");
    enhanceForm(form);
    runIfNeeded();
  }

  document.addEventListener("DOMContentLoaded", initSearchUi);
  document.addEventListener("romix:header-ready", initSearchUi);

  window.romixSearch = {
    run: runIfNeeded,
    focus: findAndFocus,
    slug: slugify,
    search: searchProducts,
    searchInList: searchProductsSync,
    ensure: ensureProducts,
    close: closeSearch
  };

  function injectSearchStyles() {
    if (document.getElementById("romix-search-style")) return;
    const style = document.createElement("style");
    style.id = "romix-search-style";
    style.textContent = `
      .site-header,.romix-shared-header{overflow:visible !important;}
      .site-header .search-panel.romix-search-panel-open,
      header.romix-shared-header .search-panel.romix-search-panel-open{max-height:min(76vh,720px) !important;overflow:visible !important;background:rgba(255,255,255,.98);box-shadow:0 22px 54px rgba(17,17,17,.08);}
      .site-header .search-panel .container,
      header.romix-shared-header .search-panel .container{padding:14px 0 18px !important;}
      .romix-search-form{max-width:min(1080px,100%) !important;display:block !important;position:relative;}
      .romix-search-shell{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:8px;border:1px solid rgba(247,37,133,.18);border-radius:24px;background:#fff;box-shadow:0 16px 40px rgba(17,17,17,.08);}
      .romix-search-icon{width:42px;height:42px;border-radius:999px;background:#fff3f8;position:relative;}
      .romix-search-icon:before{content:"";position:absolute;left:13px;top:12px;width:12px;height:12px;border:2px solid #f72585;border-radius:50%;}
      .romix-search-icon:after{content:"";position:absolute;left:26px;top:26px;width:9px;height:2px;border-radius:999px;background:#f72585;transform:rotate(45deg);transform-origin:left center;}
      .romix-search-form input[type="search"],.romix-search-form input[name="q"]{height:48px !important;border:0 !important;border-radius:14px !important;padding:0 8px !important;background:#fff !important;color:#171317 !important;font-size:1rem !important;font-weight:800;box-shadow:none !important;}
      .romix-search-form input[type="search"]:focus,.romix-search-form input[name="q"]:focus{box-shadow:none !important;outline:0 !important;}
      .romix-search-clear,.romix-search-cancel{height:40px;border:0;border-radius:999px;cursor:pointer;font-weight:900;}
      .romix-search-clear{width:40px;background:#fff0f6;color:#f72585;font-size:1.1rem;}
      .romix-search-cancel{padding:0 16px;background:#111;color:#fff;}
      .romix-search-clear:focus-visible,.romix-search-cancel:focus-visible,.romix-search-chip:focus-visible,.romix-search-category:focus-visible,.romix-search-product:focus-visible{outline:3px solid rgba(247,37,133,.24);outline-offset:3px;}
      .romix-search-overlay{position:absolute;left:0;right:0;top:calc(100% + 12px);z-index:2500;max-height:min(60vh,560px);overflow:auto;border:1px solid rgba(247,37,133,.14);border-radius:24px;background:#fff;box-shadow:0 28px 70px rgba(17,17,17,.16);padding:18px;}
      .romix-search-layout{display:grid;grid-template-columns:minmax(220px,300px) minmax(0,1fr);gap:18px;}
      .romix-search-side,.romix-search-results{min-width:0;}
      .romix-search-side{display:grid;gap:18px;padding-right:18px;border-right:1px solid #f3d9e5;}
      .romix-search-side h3,.romix-search-results__head h3{margin:0;color:#171317;font-family:Outfit,Arial,sans-serif;font-weight:900;}
      .romix-search-side h3{margin-bottom:9px;font-size:.88rem;text-transform:uppercase;letter-spacing:.08em;}
      .romix-search-list{display:grid;gap:8px;}
      .romix-search-chip,.romix-search-category{display:grid;align-items:center;width:100%;min-height:42px;border:1px solid #f5dce8;border-radius:14px;background:#fffafd;color:#211b22;text-align:left;text-decoration:none;}
      .romix-search-chip{grid-template-columns:24px minmax(0,1fr);gap:10px;padding:8px 11px;cursor:pointer;}
      .romix-search-chip span{width:24px;height:24px;border-radius:999px;background:#fff;position:relative;box-shadow:inset 0 0 0 1px #ffd1e3;}
      .romix-search-chip span:before{content:"";position:absolute;left:7px;top:7px;width:7px;height:7px;border:2px solid #f72585;border-radius:50%;}
      .romix-search-chip span:after{content:"";position:absolute;left:16px;top:17px;width:6px;height:2px;background:#f72585;transform:rotate(45deg);}
      .romix-search-chip strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;}
      .romix-search-chip small{display:block;color:#7a7078;font-size:.74rem;font-weight:800;}
      .romix-search-category{grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px 12px;font-weight:900;}
      .romix-search-category small{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:26px;border-radius:999px;background:#f72585;color:#fff;font-size:.76rem;}
      .romix-search-results{display:grid;gap:14px;}
      .romix-search-results__head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;}
      .romix-search-results__head span{display:block;margin-bottom:4px;color:#f72585;font-size:.72rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;}
      .romix-search-results__head h3{font-size:1.15rem;}
      .romix-search-results__head a{display:inline-flex;align-items:center;min-height:38px;padding:0 15px;border-radius:999px;background:#f72585;color:#fff;text-decoration:none;font-size:.86rem;font-weight:900;white-space:nowrap;}
      .romix-search-products{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
      .romix-search-product{display:grid;grid-template-columns:92px minmax(0,1fr);gap:12px;min-width:0;padding:9px;border:1px solid #f0e4ea;border-radius:16px;background:#fff;color:#211b22;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease;}
      .romix-search-product:hover{transform:translateY(-2px);border-color:rgba(247,37,133,.24);box-shadow:0 14px 28px rgba(17,17,17,.08);}
      .romix-search-product__media{display:block;aspect-ratio:1/1;border-radius:12px;overflow:hidden;background:#f4f4f4;}
      .romix-search-product__media img{display:block;width:100%;height:100%;object-fit:cover;}
      .romix-search-product__body{display:grid;align-content:center;gap:4px;min-width:0;}
      .romix-search-product__body small{color:#7a7078;font-size:.72rem;font-weight:900;}
      .romix-search-product__body strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#161216;font-size:.9rem;line-height:1.15;}
      .romix-search-product__price{color:#f72585;font-size:.9rem;font-weight:900;}
      .romix-search-product__colors{display:flex;gap:5px;margin-top:2px;}
      .romix-search-product__colors span{width:13px;height:13px;border-radius:999px;background:var(--swatch);box-shadow:0 0 0 1px rgba(0,0,0,.12);}
      .romix-search-empty,.romix-search-loading{display:grid;gap:6px;align-content:center;min-height:180px;padding:22px;border:1px dashed #f1bdd3;border-radius:18px;background:#fff8fb;color:#6c626b;text-align:center;font-weight:800;}
      .romix-search-empty strong{color:#171317;font-size:1rem;}
      .romix-search-empty span,.romix-search-muted{margin:0;color:#7a7078;font-size:.88rem;font-weight:800;line-height:1.4;}
      @media (max-width:760px){
        body.romix-search-open{overflow:hidden;}
        .site-header .search-panel.romix-search-panel-open,
        header.romix-shared-header .search-panel.romix-search-panel-open{position:fixed;inset:0;z-index:3200;max-height:none !important;overflow:auto !important;border-top:0;background:#fff;}
        .site-header .search-panel.romix-search-panel-open .container,
        header.romix-shared-header .search-panel.romix-search-panel-open .container{width:min(100% - 24px,680px) !important;padding:14px 0 22px !important;}
        .romix-search-shell{grid-template-columns:38px minmax(0,1fr) auto auto;border-radius:20px;box-shadow:none;}
        .romix-search-icon{width:38px;height:38px;}
        .romix-search-form input[type="search"],.romix-search-form input[name="q"]{height:44px !important;font-size:.94rem !important;}
        .romix-search-cancel{padding:0 12px;}
        .romix-search-overlay{position:static;max-height:none;margin-top:12px;padding:14px;border-radius:20px;box-shadow:none;}
        .romix-search-layout{grid-template-columns:1fr;gap:18px;}
        .romix-search-side{padding-right:0;border-right:0;}
        .romix-search-products{grid-template-columns:1fr;}
        .romix-search-product{grid-template-columns:82px minmax(0,1fr);}
        .romix-search-results__head{align-items:flex-start;}
      }
      @media (max-width:420px){
        .romix-search-shell{grid-template-columns:34px minmax(0,1fr) auto;gap:5px;padding:7px;}
        .romix-search-icon{width:34px;height:34px;}
        .romix-search-clear{width:34px;height:34px;}
        .romix-search-cancel{grid-column:1/-1;width:100%;}
      }
    `;
    document.head.appendChild(style);
  }
})();
