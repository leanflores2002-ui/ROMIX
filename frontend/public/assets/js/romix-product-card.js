(function (window, document) {
  "use strict";

  const PLACEHOLDER = "images/optimized/branding/romix-logo-360.webp";

  function normalizeColorKey(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase().replace(/\s+/g, " ");
    } catch (_error) {
      return raw.toLowerCase().replace(/\s+/g, " ");
    }
  }

  function colorKey(entry, index) {
    if (entry && typeof entry === "object") {
      const name = entry.name || entry.value || entry.color || entry.slug;
      if (name) return normalizeColorKey(name);
      const id = entry.id || entry.colorId || entry.variantId || entry.variant_id;
      if (id != null) return "id:" + String(id).trim().toLowerCase();
      const image = entry.image || entry.thumbnail || entry.thumb;
      if (image) return "image:" + String(image).trim().toLowerCase();
    }
    const value = normalizeColorKey(entry);
    return value || "index:" + index;
  }

  function uniqueColorEntries(colors) {
    if (!Array.isArray(colors)) return [];
    const seen = new Set();
    return colors.filter((entry, index) => {
      const key = colorKey(entry, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getMediaElement(card) {
    const direct = Array.from(card.children).find((child) => child.matches(
      ".product-thumb, .related-products__media-link, .romix-search-product__media"
    ));
    if (direct) return direct;
    return card.querySelector(".product-thumb, .related-products__media-link, .romix-search-product__media");
  }

  function setHoverImage(card, source, alt) {
    const media = getMediaElement(card);
    if (!media) return;
    const value = String(source || "").trim();
    media.dataset.hoverSrc = value;
    if (!value) {
      media.classList.remove("has-hover-image");
      media.querySelector(".product-thumb__hover")?.remove();
      return;
    }
    let hoverImage = media.querySelector(".product-thumb__hover");
    if (!hoverImage) {
      hoverImage = document.createElement("img");
      hoverImage.className = "product-thumb__hover";
      hoverImage.loading = "lazy";
      hoverImage.decoding = "async";
      hoverImage.width = 720;
      hoverImage.height = 960;
      hoverImage.setAttribute("aria-hidden", "true");
      media.appendChild(hoverImage);
    }
    hoverImage.dataset.src = value;
    hoverImage.alt = alt || "Vista trasera del producto";
    if (hoverImage.getAttribute("src") && hoverImage.getAttribute("src") !== value) {
      hoverImage.removeAttribute("src");
    }
    media.classList.add("has-hover-image");
  }

  function bindHoverImage(card) {
    if (!card || card.dataset.romixHoverBound === "true") return;
    const media = getMediaElement(card);
    if (!media) return;
    card.dataset.romixHoverBound = "true";
    const load = () => {
      const hoverImage = media.querySelector(".product-thumb__hover");
      const source = hoverImage?.dataset.src || media.dataset.hoverSrc || "";
      if (hoverImage && source && hoverImage.getAttribute("src") !== source) {
        hoverImage.src = source;
      }
    };
    card.addEventListener("pointerenter", load, { passive: true });
    card.addEventListener("focusin", load);
    setHoverImage(card, media.dataset.hoverSrc || card.dataset.hoverSrc || "", media.getAttribute("aria-label") || "Vista trasera del producto");
  }

  function getButtons(card) {
    return Array.from(card.querySelectorAll(
      ".product-variant-thumb[data-variant-index], .related-products__thumb[data-variant-index]"
    ));
  }

  function isInteractiveTarget(target) {
    return Boolean(target && target.closest("a, button, input, select, textarea, label"));
  }

  function bindCardNavigation(card) {
    if (!card || card.dataset.romixCardNavigation) return card;

    const detailLink = card.querySelector(
      ".product-thumb[href], .related-products__media-link[href], .romix-search-product__media[href], .product-name[href], .related-products__name[href]"
    );
    const href = detailLink?.getAttribute("href");
    if (!href) return card;

    // Home, catalog and cart recommendations already provide this behavior in
    // their renderers. Keep their handlers and only fill the missing surfaces.
    if (card.matches('[role="link"][tabindex]')) {
      card.dataset.romixCardNavigation = "existing";
      return card;
    }

    card.dataset.romixCardNavigation = "true";
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    if (!card.getAttribute("aria-label")) {
      const name = card.querySelector(".product-name, .related-products__name")?.textContent?.trim();
      card.setAttribute("aria-label", "Ver detalles de " + (name || detailLink.getAttribute("aria-label") || "producto"));
    }

    const navigate = () => {
      window.location.href = new URL(href, document.baseURI).href;
    };

    card.addEventListener("click", (event) => {
      if (isInteractiveTarget(event.target)) return;
      navigate();
    });
    card.addEventListener("keydown", (event) => {
      if (isInteractiveTarget(event.target)) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navigate();
    });

    return card;
  }

  function hydrateThumb(button) {
    if (!button) return;
    let image = button.querySelector("img");
    const source = button.dataset.variantSrc || image?.dataset.variantSrc || "";
    if (!source) return;
    if (!image) {
      image = document.createElement("img");
      image.alt = button.getAttribute("aria-label") || "Variante de color";
      image.loading = "lazy";
      image.decoding = "async";
      button.appendChild(image);
    }
    if (image.getAttribute("src")) return;
    image.dataset.variantSrc = source;
    image.src = source;
  }

  function syncActive(buttons, index) {
    buttons.forEach((button) => {
      const active = Number(button.dataset.variantIndex) === Number(index);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function setGenericImage(image, button) {
    if (!image || !button) return;
    const source = button.dataset.variantMainSrc || button.dataset.variantSrc || "";
    if (!source) return;
    const alt = button.querySelector("img")?.alt || image.alt || "Producto ROMIX";
    const imageUtils = window.romixImageUtils;
    if (imageUtils && typeof imageUtils.applyImageWithFallback === "function") {
      imageUtils.applyImageWithFallback(image, [source, button.dataset.variantSrc], alt, {
        placeholder: PLACEHOLDER
      });
      return;
    }
    image.src = source;
    image.alt = alt;
  }

  function bind(card, options) {
    if (!card) return card;
    bindCardNavigation(card);
    bindHoverImage(card);
    if (card.dataset.romixVariantInteraction === "true") return card;
    const buttons = getButtons(card);
    const config = options || {};
    const mediaImage = config.image || card.querySelector(".product-thumb img, .related-products__image, .romix-search-product__media img");
    const thumbs = card.querySelector(".product-variant-thumbs, .related-products__thumbs");
    if (!thumbs || !mediaImage || !buttons.length) return card;

    card.dataset.romixVariantInteraction = "true";
    const variantButtons = getButtons(card);
    const moreButton = thumbs.querySelector(".product-variant-more, .related-products__more");
    let activeIndex = Number(config.initialIndex) || 0;

    function choose(index, event) {
      const button = variantButtons[index];
      if (!button) return;
      event?.preventDefault();
      event?.stopPropagation();
      hydrateThumb(button);
      activeIndex = index;
      syncActive(variantButtons, activeIndex);
      if (typeof config.activateVariant === "function") {
        config.activateVariant(index, button);
      } else {
        setGenericImage(mediaImage, button);
      }
      setHoverImage(card, button.dataset.variantHoverSrc || "", button.getAttribute("aria-label") || "Vista trasera del producto");
    }

    variantButtons.forEach((button, index) => {
      const visible = index < 4;
      button.hidden = !visible;
      button.setAttribute("aria-hidden", visible ? "false" : "true");
      button.tabIndex = visible ? 0 : -1;
      button.addEventListener("click", (event) => choose(index, event));
      if (visible) hydrateThumb(button);
    });

    if (moreButton) {
      moreButton.type = "button";
      moreButton.setAttribute("aria-expanded", "false");
      moreButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const expanded = moreButton.getAttribute("aria-expanded") === "true";
        const nextExpanded = !expanded;
        moreButton.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
        moreButton.textContent = nextExpanded
          ? "−"
          : "+" + Math.max(0, variantButtons.length - 4);
        moreButton.setAttribute("aria-label", nextExpanded
          ? "Ocultar variantes adicionales"
          : "Mostrar variantes adicionales");
        variantButtons.forEach((button, index) => {
          const visible = nextExpanded || index < 4;
          button.hidden = !visible;
          button.setAttribute("aria-hidden", visible ? "false" : "true");
          button.tabIndex = visible ? 0 : -1;
          if (visible) hydrateThumb(button);
        });
      });
    }

    return card;
  }

  function bindAll(root) {
    const scope = root || document;
    scope.querySelectorAll(".romix-product-card").forEach((card) => {
      bindCardNavigation(card);
      bind(card);
    });
  }

  window.romixProductCard = Object.freeze({
    bind,
    bindAll,
    setHoverImage,
    uniqueColorEntries,
    normalizeColorKey
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindAll(document), { once: true });
  } else {
    bindAll(document);
  }
})(window, document);
