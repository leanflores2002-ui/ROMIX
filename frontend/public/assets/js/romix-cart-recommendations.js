(function (window, document) {
  "use strict";

  const scriptBase = document.currentScript?.src || document.baseURI;
  const DATA_URL = new URL("../data/products.json", scriptBase).href;
  const MAX_RECOMMENDATIONS = 8;
  const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960"><rect width="100%" height="100%" fill="#fff7fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b7a6af" font-family="Segoe UI, Arial" font-size="24">ROMIX</text></svg>',
  );
  const state = {
    products: null,
    loading: null,
    renderedKeys: [],
    carouselTrack: null,
    carouselSync: null,
    drawerTrack: null,
    drawerSync: null,
    drawerBound: false,
  };

  const section = () => document.getElementById("cart-recommendations");
  const list = () => document.getElementById("cart-recommendations-list");
  const iconMarkup = (name, options) => typeof window.romixIcon === "function"
    ? window.romixIcon(name, options)
    : "";
  const getImageUtils = () => window.romixImageUtils || {};
  const getPricing = () => window.romixPricing || {};

  function normalize(value) {
    const raw = String(value == null ? "" : value).trim();
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase();
    } catch (_error) {
      return raw.toLowerCase();
    }
  }

  function key(value) {
    return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function productKeys(product) {
    if (!product || typeof product !== "object") return [];
    return [product.id, product.slug, product.name]
      .map(key)
      .filter(Boolean);
  }

  function cartItemKeys(item) {
    if (!item || typeof item !== "object") return [];
    return [item.productId, item.pid, item.id, item.slug, item.name]
      .map(key)
      .filter(Boolean);
  }

  function isPublicProduct(product) {
    if (!product || typeof product !== "object") return false;
    if (product.visible === false || String(product.visible).toLowerCase() === "false") return false;
    return Boolean(String(product.name || "").trim() && (product.image || product.colors?.length));
  }

  function uniqueColors(product) {
    const rawColors = Array.isArray(product?.colors) ? product.colors : [];
    if (window.romixProductCard && typeof window.romixProductCard.uniqueColorEntries === "function") {
      return window.romixProductCard.uniqueColorEntries(rawColors);
    }
    return rawColors;
  }

  function getProductIdentity(product) {
    return productKeys(product)[0] || "";
  }

  function getDetailHref(product) {
    if (window.romixProductUrl && typeof window.romixProductUrl.detailHref === "function") {
      return window.romixProductUrl.detailHref(product);
    }
    const productName = key(product?.name) || "producto";
    const id = encodeURIComponent(String(product?.id || productName));
    const slug = encodeURIComponent(productName);
    const name = encodeURIComponent(String(product?.name || "Producto ROMIX"));
    return `product.html?id=${id}&slug=${slug}&name=${name}`;
  }

  function normalizeSizeValue(value) {
    if (value && typeof value === "object") {
      return String(value.size ?? value.value ?? value.label ?? "").trim();
    }
    return String(value ?? "").trim();
  }

  function uniqueSizes(product) {
    const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
    const seen = new Set();
    return sizes.reduce((result, entry) => {
      const value = normalizeSizeValue(entry);
      const normalized = normalize(value);
      if (!value || seen.has(normalized)) return result;
      seen.add(normalized);
      result.push(value);
      return result;
    }, []);
  }

  function getProductId(product) {
    return String(product?.id || product?.slug || key(product?.name) || "").trim();
  }

  function getPriceForSize(product, size) {
    const pricing = getPricing();
    if (typeof pricing.getPriceForSize === "function") return pricing.getPriceForSize(product, size);
    return Number(product?.price || 0);
  }

  function formatPrice(value) {
    const pricing = getPricing();
    if (typeof pricing.formatPrice === "function") return pricing.formatPrice(value);
    return `$${Number(value || 0).toLocaleString("es-AR")}`;
  }

  function createSelect(label, className, options) {
    const labelElement = document.createElement("label");
    labelElement.className = "romix-cart-drawer-recommendation__field";
    const labelText = document.createElement("span");
    labelText.className = "sr-only";
    labelText.textContent = label;
    const select = document.createElement("select");
    select.className = className;
    select.setAttribute("aria-label", label);
    options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    });
    labelElement.append(labelText, select);
    return { labelElement, select };
  }

  function createCompactCard(product, index) {
    const href = getDetailHref(product);
    const colors = uniqueColors(product);
    const sizes = uniqueSizes(product);
    const firstColor = colors[0] || null;
    const firstVariant = colorImageData(product, firstColor, 0);
    const card = document.createElement("article");
    card.className = "romix-cart-drawer-recommendation";

    const mediaLink = document.createElement("a");
    mediaLink.className = "romix-cart-drawer-recommendation__media";
    mediaLink.href = href;
    mediaLink.setAttribute("aria-label", `Ver ${product.name}`);
    const image = document.createElement("img");
    image.width = 180;
    image.height = 224;
    image.loading = index < 2 ? "eager" : "lazy";
    image.decoding = "async";
    image.sizes = "144px";
    applyImage(image, [firstVariant.src, firstVariant.mainSrc], `${product.name}${firstVariant.name ? ` - ${firstVariant.name}` : ""}`);
    mediaLink.appendChild(image);

    const content = document.createElement("div");
    content.className = "romix-cart-drawer-recommendation__content";
    const name = document.createElement("a");
    name.className = "romix-cart-drawer-recommendation__name";
    name.href = href;
    name.textContent = product.name;
    content.appendChild(name);

    const price = document.createElement("p");
    price.className = "romix-cart-drawer-recommendation__price";
    content.appendChild(price);

    const options = document.createElement("div");
    options.className = "romix-cart-drawer-recommendation__options";
    let colorSelect = null;
    let sizeSelect = null;
    if (colors.length > 1) {
      const colorControl = createSelect("Elegir color", "romix-cart-drawer-recommendation__select", colors.map((color, colorIndex) => String(color?.name || color?.value || `Color ${colorIndex + 1}`)));
      colorSelect = colorControl.select;
      options.appendChild(colorControl.labelElement);
    }
    if (sizes.length > 1) {
      const sizeControl = createSelect("Elegir talle", "romix-cart-drawer-recommendation__select", sizes);
      sizeSelect = sizeControl.select;
      options.appendChild(sizeControl.labelElement);
    }
    if (options.children.length) content.appendChild(options);

    const updatePreview = () => {
      const colorIndex = colorSelect ? colorSelect.selectedIndex : 0;
      const selectedColor = colors[colorIndex] || firstColor;
      const selectedSize = sizeSelect ? sizeSelect.value : sizes[0] || "";
      const variant = colorImageData(product, selectedColor, colorIndex);
      applyImage(image, [variant.src, variant.mainSrc], `${product.name}${variant.name ? ` - ${variant.name}` : ""}`);
      price.textContent = formatPrice(getPriceForSize(product, selectedSize));
    };
    if (colorSelect) colorSelect.addEventListener("change", updatePreview);
    if (sizeSelect) sizeSelect.addEventListener("change", updatePreview);
    updatePreview();

    const action = colors.length && sizes.length && window.romixCart && typeof window.romixCart.addToCart === "function"
      ? document.createElement("button")
      : document.createElement("a");
    action.className = "romix-cart-drawer-recommendation__action romix-btn romix-btn--primary";
    if (action.tagName === "A") {
      action.href = href;
      action.textContent = "Ver producto";
    } else {
      action.type = "button";
      action.innerHTML = iconMarkup("ShoppingBag", { size: "xs" }) + "<span>Agregar al carrito</span>";
      action.addEventListener("click", (event) => {
        event.preventDefault();
        const colorIndex = colorSelect ? colorSelect.selectedIndex : 0;
        const color = colors[colorIndex] || firstColor;
        const colorName = String(color?.name || color?.value || "Unico").trim();
        const size = sizeSelect ? sizeSelect.value : sizes[0];
        const variant = colorImageData(product, color, colorIndex);
        window.romixCart.addToCart({
          productId: getProductId(product),
          name: product.name,
          type: product.type || "",
          color: colorName,
          colorName,
          colorKey: colorName,
          colorId: color?.id ?? color?.colorId ?? color?.variantId ?? color?.variant_id ?? null,
          size,
          qty: 1,
          price: getPriceForSize(product, size),
          image: variant.mainSrc || variant.src,
        });
      });
    }
    content.appendChild(action);
    card.append(mediaLink, content);
    return card;
  }

  function colorImageData(product, color, index) {
    const imageUtils = getImageUtils();
    const mainSrc = typeof imageUtils.getColorImage === "function"
      ? imageUtils.getColorImage(color, product, index)
      : String(color?.image || product?.image || "").trim();
    const set = typeof imageUtils.getProductThumbSet === "function"
      ? imageUtils.getProductThumbSet(product, color)
      : {
        src: typeof imageUtils.getThumbPath === "function" ? imageUtils.getThumbPath(mainSrc) : mainSrc,
        fallbackSrc: mainSrc,
        originalSrc: mainSrc,
      };
    return {
      name: String(color?.name || color?.value || `Color ${index + 1}`).trim(),
      src: set.src || set.fallbackSrc || mainSrc || PLACEHOLDER,
      mainSrc: set.originalSrc || mainSrc || set.fallbackSrc || PLACEHOLDER,
    };
  }

  function applyImage(img, sources, alt) {
    if (!img) return;
    const imageUtils = getImageUtils();
    if (typeof imageUtils.applyImageWithFallback === "function") {
      imageUtils.applyImageWithFallback(img, sources, alt, { placeholder: PLACEHOLDER });
      return;
    }
    img.alt = alt || "Producto ROMIX";
    img.onerror = () => {
      img.onerror = null;
      img.src = PLACEHOLDER;
    };
    img.src = sources.find(Boolean) || PLACEHOLDER;
  }

  function scoreProduct(product, references, emptyCart) {
    if (emptyCart) {
      return (product.featured === true ? 100 : 0)
        + (String(product.featuredBadge || product.badge || "").trim() ? 20 : 0);
    }

    let score = 0;
    references.forEach((reference) => {
      if (!reference) return;
      if (normalize(product.section) && normalize(product.section) === normalize(reference.section)) score += 8;
      if (normalize(product.type) && normalize(product.type) === normalize(reference.type)) score += 7;
      if (normalize(product.season) && normalize(product.season) === normalize(reference.season)) score += 2;
    });
    if (product.featured === true) score += 1;
    return score;
  }

  function chooseRecommendations(products, cart) {
    const cartKeys = new Set(cart.flatMap(cartItemKeys));
    const cartProducts = products.filter((product) => productKeys(product).some((entry) => cartKeys.has(entry)));
    const references = cartProducts.length
      ? cartProducts
      : cart.map((item) => ({ type: item.type || "", section: item.section || "", season: item.season || "" }));
    const emptyCart = cart.length === 0;
    const seen = new Set();

    return products
      .filter((product) => !productKeys(product).some((entry) => cartKeys.has(entry)))
      .map((product, index) => ({
        product,
        index,
        score: scoreProduct(product, references, emptyCart),
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map((entry) => entry.product)
      .filter((product) => {
        const identity = getProductIdentity(product);
        if (!identity || seen.has(identity)) return false;
        seen.add(identity);
        return true;
      })
      .slice(0, MAX_RECOMMENDATIONS);
  }

  function createPictureImage(product, firstColor, cardIndex) {
    const main = colorImageData(product, firstColor, 0);
    const image = document.createElement("img");
    image.width = 720;
    image.height = 960;
    image.loading = "lazy";
    image.decoding = "async";
    image.fetchPriority = cardIndex < 2 ? "high" : "low";
    image.sizes = "(max-width: 600px) min(82vw, 286px), (max-width: 900px) calc(50vw - 28px), (max-width: 1180px) calc(33vw - 26px), 280px";
    applyImage(image, [main.src, main.mainSrc], `${product.name}${main.name ? ` - ${main.name}` : ""}`);
    return image;
  }

  function createVariantThumb(variant, product, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-variant-thumb" + (index === 0 ? " is-active" : "");
    button.dataset.variantIndex = String(index);
    button.dataset.variantSrc = variant.src || PLACEHOLDER;
    button.dataset.variantMainSrc = variant.mainSrc || variant.src || PLACEHOLDER;
    button.setAttribute("aria-label", `Ver variante ${variant.name || `Color ${index + 1}`} de ${product.name}`);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.setAttribute("aria-current", index === 0 ? "true" : "false");
    button.title = button.getAttribute("aria-label");

    if (index < 4) {
      const image = document.createElement("img");
      image.width = 720;
      image.height = 960;
      image.loading = "lazy";
      image.decoding = "async";
      image.alt = variant.name || `Color ${index + 1}`;
      image.sizes = "42px";
      applyImage(image, [variant.src, variant.mainSrc], image.alt);
      button.appendChild(image);
    } else {
      button.hidden = true;
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
    }

    return button;
  }

  function createCard(product, index) {
    const href = getDetailHref(product);
    const colors = uniqueColors(product);
    const variants = colors.map((color, colorIndex) => colorImageData(product, color, colorIndex));
    const firstColor = colors[0] || null;
    const card = document.createElement("article");
    card.className = "cart-recommendations__card romix-product-card";
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `Ver detalles de ${product.name}`);

    const isInteractiveTarget = (target) => Boolean(target?.closest("a, button, input, select, textarea, label"));
    card.addEventListener("click", (event) => {
      if (isInteractiveTarget(event.target)) return;
      window.location.href = new URL(href, document.baseURI).href;
    });
    card.addEventListener("keydown", (event) => {
      if (isInteractiveTarget(event.target)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.location.href = new URL(href, document.baseURI).href;
    });

    const thumb = document.createElement("div");
    thumb.className = "product-thumb";
    thumb.appendChild(createPictureImage(product, firstColor, index));
    const badgeLabel = String(product.badge || product.featuredBadge || "").trim();
    if (badgeLabel) {
      const badge = document.createElement("span");
      badge.className = "product-tag";
      badge.textContent = badgeLabel;
      thumb.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "product-body";

    const name = document.createElement("a");
    name.className = "product-name";
    name.href = href;
    name.textContent = product.name;
    body.appendChild(name);

    const priceRow = document.createElement("div");
    priceRow.className = "price-row";
    const pricing = getPricing();
    const priceDisplay = typeof pricing.createCardPriceDisplay === "function"
      ? pricing.createCardPriceDisplay(product, { currentClass: "product-price", currentTag: "span" })
      : null;
    if (priceDisplay) {
      priceRow.appendChild(priceDisplay);
    } else {
      const price = document.createElement("span");
      price.className = "product-price";
      price.textContent = `$${Number(product.price || 0).toLocaleString("es-AR")}`;
      priceRow.appendChild(price);
    }
    body.appendChild(priceRow);

    if (colors.length) {
      const colorCount = document.createElement("p");
      colorCount.className = "product-color-count";
      colorCount.innerHTML = iconMarkup("Palette", { size: "sm" })
        + `<span>${colors.length}${colors.length === 1 ? " color disponible" : " colores disponibles"}</span>`;
      body.appendChild(colorCount);
    }

    if (variants.length > 1) {
      const thumbs = document.createElement("div");
      thumbs.className = "product-variant-thumbs";
      thumbs.setAttribute("aria-label", `Variantes de color de ${product.name}`);
      variants.forEach((variant, variantIndex) => thumbs.appendChild(createVariantThumb(variant, product, variantIndex)));
      if (variants.length > 4) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "product-variant-more";
        more.textContent = `+${variants.length - 4}`;
        more.setAttribute("aria-expanded", "false");
        more.setAttribute("aria-label", `Mostrar ${variants.length - 4} variantes adicionales de ${product.name}`);
        thumbs.appendChild(more);
      }
      body.appendChild(thumbs);
    }

    const cta = document.createElement("a");
    cta.className = "product-cta romix-btn romix-btn--primary romix-btn--sm";
    cta.href = href;
    cta.innerHTML = iconMarkup("ShoppingBag", { size: "sm" }) + "<span>Ver producto</span>";
    body.appendChild(cta);

    card.append(thumb, body);
    return card;
  }

  function setupCarousel() {
    const track = list();
    const previous = document.getElementById("cart-recommendations-prev");
    const next = document.getElementById("cart-recommendations-next");
    if (!track || !previous || !next) return;

    if (state.carouselTrack?.isConnected && state.carouselTrack.isSameNode(track)) {
      state.carouselSync?.();
      return;
    }

    const getStep = () => {
      const firstCard = track.querySelector(".cart-recommendations__card");
      if (!firstCard) return track.clientWidth * 0.9;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const visibleCards = Math.max(1, Math.round(track.clientWidth / Math.max(1, firstCard.getBoundingClientRect().width + gap)));
      return (firstCard.getBoundingClientRect().width + gap) * visibleCards;
    };

    const sync = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const hasOverflow = maxScroll > 8;
      previous.disabled = !hasOverflow || track.scrollLeft <= 8;
      next.disabled = !hasOverflow || track.scrollLeft >= maxScroll - 8;
    };

    state.carouselTrack = track;
    state.carouselSync = sync;

    const scroll = (direction) => {
      const reduced = typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollBy({ left: direction * getStep(), behavior: reduced ? "auto" : "smooth" });
    };

    previous.onclick = () => scroll(-1);
    next.onclick = () => scroll(1);
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    window.requestAnimationFrame(sync);
  }

  function drawerSection() {
    return document.getElementById("romix-cart-drawer-recommendations");
  }

  function drawerList() {
    return document.getElementById("romix-cart-drawer-recommendations-list");
  }

  function setupDrawerCarousel() {
    const track = drawerList();
    const previous = document.getElementById("romix-cart-drawer-recommendations-prev");
    const next = document.getElementById("romix-cart-drawer-recommendations-next");
    if (!track || !previous || !next) return;

    if (state.drawerTrack?.isConnected && state.drawerTrack.isSameNode(track)) {
      state.drawerSync?.();
      return;
    }

    const getStep = () => {
      const firstCard = track.querySelector(".romix-cart-drawer-recommendation");
      if (!firstCard) return track.clientWidth * 0.85;
      const styles = window.getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      return firstCard.getBoundingClientRect().width + gap;
    };
    const sync = () => {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      const hasOverflow = maxScroll > 4;
      previous.disabled = !hasOverflow || track.scrollLeft <= 4;
      next.disabled = !hasOverflow || track.scrollLeft >= maxScroll - 4;
    };
    const scroll = (direction) => {
      const reduced = typeof window.matchMedia === "function"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollBy({ left: direction * getStep(), behavior: reduced ? "auto" : "smooth" });
    };

    previous.onclick = () => scroll(-1);
    next.onclick = () => scroll(1);
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync, { passive: true });
    state.drawerTrack = track;
    state.drawerSync = sync;
    window.requestAnimationFrame(sync);
  }

  function renderDrawer(products) {
    const targetSection = drawerSection();
    const targetList = drawerList();
    if (!targetSection || !targetList || !Array.isArray(products)) return;

    const cart = window.romixCart && typeof window.romixCart.getCart === "function"
      ? window.romixCart.getCart()
      : [];
    const recommendations = chooseRecommendations(products.filter(isPublicProduct), cart);
    targetList.replaceChildren();
    recommendations.forEach((product, index) => targetList.appendChild(createCompactCard(product, index)));
    targetSection.hidden = recommendations.length === 0;
    if (recommendations.length) setupDrawerCarousel();
  }

  function initDrawer() {
    if (state.drawerBound || !drawerSection()) return;
    state.drawerBound = true;
    if (state.products) renderDrawer(state.products);
  }

  function renderFull(products) {
    const targetSection = section();
    const targetList = list();
    if (!targetSection || !targetList || !Array.isArray(products)) return;

    const cart = window.romixCart && typeof window.romixCart.getCart === "function"
      ? window.romixCart.getCart()
      : [];
    const recommendations = chooseRecommendations(products.filter(isPublicProduct), cart);
    targetList.replaceChildren();
    state.renderedKeys = recommendations.map(getProductIdentity);
    recommendations.forEach((product, index) => {
      const card = createCard(product, index);
      targetList.appendChild(card);
      if (window.romixProductCard && typeof window.romixProductCard.bind === "function") {
        window.romixProductCard.bind(card, { image: card.querySelector(".product-thumb img") });
      }
    });
    targetSection.hidden = recommendations.length === 0;
    if (recommendations.length) setupCarousel();
  }

  function loadProducts() {
    if (state.products) return Promise.resolve(state.products);
    if (state.loading) return state.loading;
    if (typeof window.fetch !== "function") {
      state.products = [];
      return Promise.resolve(state.products);
    }
    state.loading = window.fetch(DATA_URL)
      .then((response) => response.ok ? response.json() : [])
      .then((products) => {
        state.products = Array.isArray(products) ? products : [];
        return state.products;
      })
      .catch(() => {
        state.products = [];
        return state.products;
      });
    return state.loading;
  }

  function refresh() {
    void loadProducts().then((products) => {
      renderFull(products);
      renderDrawer(products);
    });
  }

  function hasActiveTarget() {
    return Boolean(section()) || document.body.classList.contains("romix-cart-drawer-open");
  }

  function init() {
    initDrawer();
    window.addEventListener("romix:cart-drawer-ready", initDrawer, { passive: true });
    if (section()) refresh();
    window.addEventListener("romix:cart-drawer-opened", refresh);
    window.addEventListener("romix:cart-changed", () => {
      if (hasActiveTarget()) refresh();
    });
    window.addEventListener("storage", (event) => {
      if ((event.key === "romix_cart" || event.key === "cart") && hasActiveTarget()) refresh();
    });
  }

  window.romixRecommendations = Object.freeze({
    load: loadProducts,
    choose: (cart) => loadProducts().then((products) => {
      const availableProducts = Array.isArray(products) ? products : [];
      return chooseRecommendations(availableProducts.filter(isPublicProduct), Array.isArray(cart) ? cart : []);
    }),
    refresh,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
