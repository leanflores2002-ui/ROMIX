(function (window, document) {
  "use strict";

  const DATA_URL = "assets/data/products.json";
  const MAX_RECOMMENDATIONS = 8;
  const PLACEHOLDER = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960"><rect width="100%" height="100%" fill="#fff7fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#b7a6af" font-family="Segoe UI, Arial" font-size="24">ROMIX</text></svg>',
  );
  const imageUtils = window.romixImageUtils || {};
  const pricing = window.romixPricing || {};
  const state = {
    products: null,
    loading: null,
    renderedKeys: [],
    carouselTrack: null,
    carouselSync: null,
  };

  const section = () => document.getElementById("cart-recommendations");
  const list = () => document.getElementById("cart-recommendations-list");
  const iconMarkup = (name, options) => typeof window.romixIcon === "function"
    ? window.romixIcon(name, options)
    : "";

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

  function colorImageData(product, color, index) {
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

    if (state.carouselTrack === track) {
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

  function render(products) {
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
    loadProducts().then(render);
  }

  function init() {
    if (!section() || !list()) return;
    refresh();
    window.addEventListener("romix:cart-changed", refresh);
    window.addEventListener("storage", (event) => {
      if (event.key === "romix_cart" || event.key === "cart") refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
