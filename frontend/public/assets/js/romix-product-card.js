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

  function ensureMediaShell(card) {
    const media = getMediaElement(card);
    if (!media) return null;
    if (media.parentElement && media.parentElement.classList.contains("product-media-shell")) {
      return media.parentElement;
    }
    const shell = document.createElement("div");
    shell.className = "product-media-shell";
    media.parentNode.insertBefore(shell, media);
    shell.appendChild(media);
    return shell;
  }

  function getButtons(card) {
    return Array.from(card.querySelectorAll(
      ".product-variant-thumb[data-variant-index], .related-products__thumb[data-variant-index]"
    ));
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

  function createNavButton(direction, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-variant-nav product-variant-nav--" + direction;
    button.setAttribute("aria-label", label);
    button.innerHTML = direction === "prev" ? "&#8249;" : "&#8250;";
    return button;
  }

  function createTouchToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "product-variant-toggle";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Mostrar variantes de color");
    const icon = typeof window.romixIcon === "function"
      ? window.romixIcon("Palette", { size: "xs" })
      : "";
    button.innerHTML = icon + "<span>Colores</span>";
    return button;
  }

  function bind(card, options) {
    if (!card || card.dataset.romixVariantInteraction === "true") return card;
    const buttons = getButtons(card);
    if (buttons.length <= 1) {
      const onlyThumbs = card.querySelector(".product-variant-thumbs, .related-products__thumbs");
      if (onlyThumbs) onlyThumbs.hidden = true;
      return card;
    }

    const config = options || {};
    const shell = ensureMediaShell(card);
    const mediaImage = config.image || card.querySelector(".product-thumb img, .related-products__image, .romix-search-product__media img");
    const thumbs = card.querySelector(".product-variant-thumbs, .related-products__thumbs");
    if (!shell || !thumbs || !mediaImage) return card;
    const keyboardFocusTarget = card.matches("[tabindex]")
      ? card
      : card.querySelector("a[href], button:not([hidden])");

    card.dataset.romixVariantInteraction = "true";
    card.classList.add("has-variant-preview");

    const tray = document.createElement("div");
    tray.className = "product-variant-tray";
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", "Variantes fotográficas");
    shell.appendChild(tray);
    tray.appendChild(thumbs);

    const more = tray.querySelector(".product-variant-more, .related-products__more");
    if (more && more.tagName !== "BUTTON") {
      const replacement = document.createElement("button");
      replacement.type = "button";
      replacement.className = more.className;
      replacement.textContent = more.textContent;
      Array.from(more.attributes).forEach((attribute) => {
        if (attribute.name !== "class") replacement.setAttribute(attribute.name, attribute.value);
      });
      more.replaceWith(replacement);
    }
    const moreButton = tray.querySelector(".product-variant-more, .related-products__more");
    if (moreButton) {
      moreButton.classList.add("product-variant-more");
      moreButton.setAttribute("aria-expanded", "false");
      moreButton.type = "button";
    }

    const variantButtons = getButtons(card);
    const prevButton = createNavButton("prev", "Ver color anterior");
    const nextButton = createNavButton("next", "Ver color siguiente");
    shell.appendChild(prevButton);
    shell.appendChild(nextButton);

    const touchToggle = createTouchToggle();
    shell.appendChild(touchToggle);
    const touchToggleLabel = touchToggle.lastElementChild;
    let suppressToggleClick = false;

    const isTouch = window.matchMedia && window.matchMedia("(hover: none), (pointer: coarse)").matches;
    let activeIndex = Number(config.initialIndex) || 0;
    let expanded = false;
    let open = false;
    let suppressNextFocusShow = false;

    function setButtonVisibility() {
      tray.classList.toggle("is-expanded", expanded);
      const thumbWidth = variantButtons[0]
        ? Math.max(1, variantButtons[0].getBoundingClientRect().width)
        : 42;
      const styles = window.getComputedStyle(thumbs);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const available = Math.max(thumbWidth, thumbs.clientWidth || shell.clientWidth || 180);
      const moreWidth = moreButton ? Math.max(34, moreButton.getBoundingClientRect().width) + gap : 0;
      const fitCount = Math.max(1, Math.floor((available - moreWidth + gap) / Math.max(1, thumbWidth + gap)));
      const visibleCount = Math.min(variantButtons.length, fitCount);
      variantButtons.forEach((button, index) => {
        const visible = expanded || index < visibleCount;
        button.hidden = !visible;
        button.setAttribute("aria-hidden", visible ? "false" : "true");
        button.tabIndex = visible ? 0 : -1;
        if (visible && index >= visibleCount) hydrateThumb(button);
      });
      if (moreButton) {
        const remaining = Math.max(0, variantButtons.length - visibleCount);
        moreButton.hidden = !expanded && remaining === 0;
        moreButton.textContent = expanded ? "−" : "+" + remaining;
        moreButton.setAttribute("aria-label", expanded ? "Ocultar variantes adicionales" : "Mostrar " + remaining + " variantes adicionales");
        moreButton.title = moreButton.getAttribute("aria-label");
        moreButton.setAttribute("aria-expanded", expanded ? "true" : "false");
      }
    }

    function show() {
      open = true;
      card.classList.add(isTouch ? "is-touch-open" : "is-variants-visible");
      touchToggle.setAttribute("aria-expanded", "true");
      touchToggle.setAttribute("aria-label", "Cerrar variantes de color");
      if (touchToggleLabel) touchToggleLabel.textContent = "Cerrar";
      setButtonVisibility();
    }

    function restoreInitial() {
      expanded = false;
      activeIndex = Number(config.initialIndex) || 0;
      syncActive(variantButtons, activeIndex);
      if (typeof config.restoreInitial === "function") {
        config.restoreInitial();
      } else {
        setGenericImage(mediaImage, variantButtons[activeIndex]);
      }
    }

    function hide(restore) {
      open = false;
      expanded = false;
      card.classList.remove("is-touch-open", "is-variants-visible");
      tray.classList.remove("is-expanded");
      touchToggle.setAttribute("aria-expanded", "false");
      touchToggle.setAttribute("aria-label", "Mostrar variantes de color");
      if (touchToggleLabel) touchToggleLabel.textContent = "Colores";
      if (restore) restoreInitial();
      setButtonVisibility();
    }

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
      if (!open) show();
    }

    variantButtons.forEach((button, index) => {
      button.addEventListener("click", (event) => choose(index, event));
      button.addEventListener("pointerenter", () => {
        if (!isTouch) choose(index);
      });
    });

    if (moreButton) {
      moreButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        expanded = !expanded;
        show();
        if (!expanded) thumbs.scrollLeft = 0;
        setButtonVisibility();
      });
    }

    prevButton.addEventListener("click", (event) => {
      choose((activeIndex - 1 + variantButtons.length) % variantButtons.length, event);
    });
    nextButton.addEventListener("click", (event) => {
      choose((activeIndex + 1) % variantButtons.length, event);
    });

    function toggleTouchSelector(event) {
      event.preventDefault();
      event.stopPropagation();
      if (open) hide(false);
      else show();
    }

    touchToggle.addEventListener("click", (event) => {
      if (suppressToggleClick) {
        suppressToggleClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      toggleTouchSelector(event);
    });
    touchToggle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") suppressToggleClick = true;
    });
    touchToggle.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch") return;
      toggleTouchSelector(event);
    });

    card.addEventListener("pointerenter", () => {
      if (!isTouch) show();
    });
    card.addEventListener("pointerleave", () => {
      if (!isTouch) hide(true);
    });
    card.addEventListener("focusin", (event) => {
      if (suppressNextFocusShow) {
        suppressNextFocusShow = false;
        return;
      }
      if (isTouch && event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) return;
      show();
    });
    card.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!card.contains(document.activeElement) && !isTouch) hide(true);
      }, 0);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        hide(false);
        suppressNextFocusShow = true;
        keyboardFocusTarget?.focus({ preventScroll: true });
        return;
      }
      if (!open || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      event.preventDefault();
      choose((activeIndex + (event.key === "ArrowRight" ? 1 : -1) + variantButtons.length) % variantButtons.length, event);
    });

    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(() => setButtonVisibility())
      : null;
    resizeObserver?.observe(shell);
    window.addEventListener("resize", setButtonVisibility, { passive: true });
    setButtonVisibility();
    return card;
  }

  function bindAll(root) {
    const scope = root || document;
    scope.querySelectorAll(".romix-product-card").forEach((card) => bind(card));
  }

  window.romixProductCard = Object.freeze({
    bind,
    bindAll,
    uniqueColorEntries,
    normalizeColorKey
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindAll(document), { once: true });
  } else {
    bindAll(document);
  }
})(window, document);
