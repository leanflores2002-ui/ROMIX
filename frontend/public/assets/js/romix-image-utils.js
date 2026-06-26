(function () {
  const PRODUCT_CARD_WIDTH = 720;
  const PRODUCT_CARD_HEIGHT = 960;
  const PRODUCT_FULL_WIDTH = 1200;
  const PRODUCT_FULL_HEIGHT = 1600;
  const HERO_WIDTH = 1900;
  const HERO_HEIGHT = 1267;
  const SQUARE_WIDTH = 1254;
  const SQUARE_HEIGHT = 1254;
  const PROMO_WIDTH = 1708;
  const PROMO_HEIGHT = 921;
  const LOGO_WIDTH = 752;
  const LOGO_HEIGHT = 829;
  const PRODUCTS_DIR = "images/products/";
  const THUMBS_DIR = "images/thumbs/";
  const MOBILE_DIR = "images/mobile/";

  function normalizeColorKey(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return raw.normalize("NFD").replace(/\p{Diacritic}+/gu, "").toLowerCase();
    } catch {
      return raw.toLowerCase();
    }
  }

  function cleanPath(value) {
    return String(value || "").trim().split(/[?#]/)[0];
  }

  function basename(value) {
    const normalized = cleanPath(value);
    const lastSlash = normalized.lastIndexOf("/");
    return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  }

  function extension(value) {
    const fileName = basename(value);
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
  }

  function replaceExtension(value, nextExtension) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const safeExtension = String(nextExtension || "").replace(/^\./, "").trim();
    if (!safeExtension) return normalized;
    const dotIndex = normalized.lastIndexOf(".");
    if (dotIndex < 0) return normalized + "." + safeExtension;
    return normalized.slice(0, dotIndex + 1) + safeExtension;
  }

  function hasThumbSuffix(value) {
    return /-thumb\.(png|jpe?g|webp|avif)$/i.test(cleanPath(value));
  }

  function hasMobileSuffix(value) {
    return /-mobile\.(png|jpe?g|webp|avif)$/i.test(cleanPath(value));
  }

  function appendSuffixBeforeExtension(value, suffix, nextExtension) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const safeSuffix = String(suffix || "").trim();
    const base = safeSuffix && normalized.includes(safeSuffix)
      ? normalized
      : normalized.replace(/(\.[^./]+)$/i, safeSuffix + "$1");
    return nextExtension ? replaceExtension(base, nextExtension) : base;
  }

  function getThumbPath(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized) return "";
    if (/^data:/i.test(normalized)) return normalized;
    if (normalized.includes(THUMBS_DIR)) {
      return hasThumbSuffix(normalized)
        ? replaceExtension(normalized, "webp")
        : appendSuffixBeforeExtension(normalized, "-thumb", "webp");
    }
    if (normalized.includes(PRODUCTS_DIR)) {
      return appendSuffixBeforeExtension(normalized.replace(PRODUCTS_DIR, THUMBS_DIR), "-thumb", "webp");
    }
    return appendSuffixBeforeExtension(normalized, "-thumb", "webp");
  }

  function getAvifThumbPath(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized) return "";
    if (/^data:/i.test(normalized)) return normalized;
    if (normalized.includes(THUMBS_DIR)) {
      return hasThumbSuffix(normalized)
        ? replaceExtension(normalized, "avif")
        : appendSuffixBeforeExtension(normalized, "-thumb", "avif");
    }
    if (normalized.includes(PRODUCTS_DIR)) {
      return appendSuffixBeforeExtension(normalized.replace(PRODUCTS_DIR, THUMBS_DIR), "-thumb", "avif");
    }
    return appendSuffixBeforeExtension(normalized, "-thumb", "avif");
  }

  function getMobileImagePath(imagePath) {
    const normalized = cleanPath(imagePath);
    if (!normalized) return "";
    if (/^data:/i.test(normalized)) return normalized;
    if (normalized.includes(MOBILE_DIR)) {
      return hasMobileSuffix(normalized)
        ? replaceExtension(normalized, "webp")
        : appendSuffixBeforeExtension(normalized, "-mobile", "webp");
    }
    if (normalized.includes(PRODUCTS_DIR)) {
      return appendSuffixBeforeExtension(normalized.replace(PRODUCTS_DIR, MOBILE_DIR), "-mobile", "webp");
    }
    return appendSuffixBeforeExtension(normalized, "-mobile", "webp");
  }

  function toThumbPath(value) {
    return getThumbPath(value);
  }

  function fallbackRasterPath(value) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const ext = extension(normalized);
    if (ext === "avif" || ext === "webp") return replaceExtension(normalized, "jpg");
    return normalized;
  }

  function uniquePaths(list) {
    const seen = new Set();
    const result = [];
    (Array.isArray(list) ? list : []).forEach(function (entry) {
      const value = cleanPath(entry);
      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(value);
    });
    return result;
  }

  function getProductLegacyImageMap(product) {
    if (!product || typeof product !== "object") return null;
    if (product.imageMap && typeof product.imageMap === "object" && !Array.isArray(product.imageMap)) {
      return product.imageMap;
    }
    if (product.images && typeof product.images === "object" && !Array.isArray(product.images)) {
      return product.images;
    }
    return null;
  }

  function getProductImageList(product) {
    const result = [];
    const seen = new Set();

    function push(src) {
      const value = cleanPath(src);
      if (!value || seen.has(value)) return;
      seen.add(value);
      result.push(value);
    }

    if (product && product.image) push(product.image);

    const legacyMap = getProductLegacyImageMap(product);
    if (legacyMap) {
      Object.values(legacyMap).forEach(push);
    }

    if (Array.isArray(product && product.images)) {
      product.images.forEach(push);
    }

    return result;
  }

  function findColorImageInLegacyMap(product, colorName) {
    const target = normalizeColorKey(colorName);
    if (!target) return "";
    const legacyMap = getProductLegacyImageMap(product);
    if (!legacyMap) return "";
    const direct = cleanPath(legacyMap[colorName]);
    if (direct) return direct;
    const key = Object.keys(legacyMap).find(function (entryName) {
      return normalizeColorKey(entryName) === target;
    });
    return key ? cleanPath(legacyMap[key]) : "";
  }

  function getImageFromOldFormat(product, color, index) {
    const colorIndex = Number.isFinite(Number(index))
      ? Number(index)
      : Number.isFinite(Number(color && color.index))
        ? Number(color.index)
        : 0;
    const colorName = typeof color === "string"
      ? color
      : color && typeof color === "object"
        ? (color.name || color.value || "")
        : "";
    return findColorImageInLegacyMap(product, colorName)
      || cleanPath(Array.isArray(product && product.images) ? product.images[colorIndex] : "")
      || cleanPath(product && product.image)
      || "";
  }

  function getImageFromNewFormat(product, color) {
    if (color && typeof color === "object" && cleanPath(color.image)) {
      return cleanPath(color.image);
    }
    const namedColor = findProductColor(product, color);
    return cleanPath(namedColor && namedColor.image) || "";
  }

  function resolveProductColorEntries(product) {
    const legacyMap = getProductLegacyImageMap(product);
    const imageList = Array.isArray(product && product.images) ? product.images.filter(Boolean).map(cleanPath) : [];
    const mainFallback = cleanPath(product && product.image);
    const legacyValues = legacyMap ? Object.values(legacyMap).map(cleanPath).filter(Boolean) : [];
    const firstLegacyImage = legacyValues[0] || imageList[0] || mainFallback || "";
    let palette = [];

    if (Array.isArray(product && product.colors)) {
      palette = product.colors.slice();
    } else if (product && product.colors && typeof product.colors === "object") {
      const values = Object.values(product.colors);
      if (values.every(function (entry) { return entry && typeof entry === "object"; })) {
        palette = values;
      } else if (product.colors.name || product.colors.value || product.colors.image) {
        palette = [product.colors];
      }
    }

    if (palette.length) {
      return palette.map(function (entry, index) {
        const color = entry && typeof entry === "object" ? entry : { name: entry };
        const name = String(color.name || color.value || "").trim() || ("Color " + (index + 1));
        const resolvedImage = cleanPath(color.image)
          || findColorImageInLegacyMap(product, name)
          || cleanPath(imageList[index])
          || firstLegacyImage;
        return Object.assign({}, color, {
          index: index,
          name: name,
          image: resolvedImage
        });
      });
    }

    if (legacyMap) {
      return Object.keys(legacyMap).map(function (colorName, index) {
        return {
          index: index,
          name: String(colorName || "").trim() || ("Color " + (index + 1)),
          image: cleanPath(legacyMap[colorName]) || firstLegacyImage
        };
      }).filter(function (entry) {
        return !!entry.image;
      });
    }

    if (imageList.length) {
      return imageList.map(function (image, index) {
        return {
          index: index,
          name: index === 0 ? "Principal" : ("Vista " + (index + 1)),
          image: image
        };
      });
    }

    if (mainFallback) {
      return [{ index: 0, name: "Unico", image: mainFallback }];
    }

    return [];
  }

  function getProductMainImage(product) {
    const colors = resolveProductColorEntries(product);
    if (colors[0] && colors[0].image) return colors[0].image;
    return cleanPath(product && product.image)
      || getProductImageList(product)[0]
      || "";
  }

  function findProductColor(product, lookup) {
    const target = typeof lookup === "string"
      ? normalizeColorKey(lookup)
      : normalizeColorKey(lookup && (lookup.name || lookup.value));
    if (!target) return null;
    const colors = resolveProductColorEntries(product);
    return colors.find(function (entry) {
      return normalizeColorKey(entry && (entry.name || entry.value)) === target;
    }) || null;
  }

  function getProductImageSources(product, color, index) {
    const colorEntry = color && typeof color === "object"
      ? color
      : findProductColor(product, color);
    const colorIndex = Number.isFinite(Number(index))
      ? Number(index)
      : Number.isFinite(Number(colorEntry && colorEntry.index))
        ? Number(colorEntry.index)
        : 0;
    const oldImage = getImageFromOldFormat(product, colorEntry || color, colorIndex);
    const newImage = getImageFromNewFormat(product, colorEntry || color);
    return uniquePaths([
      cleanPath(colorEntry && colorEntry.thumbAvif),
      cleanPath(colorEntry && colorEntry.thumb),
      cleanPath(colorEntry && colorEntry.thumbFallback),
      cleanPath(product && product.thumbnailAvif),
      cleanPath(product && (product.thumbnail || product.thumb)),
      cleanPath(product && (product.thumbnailFallback || product.thumbFallback)),
      oldImage,
      newImage,
      cleanPath(product && product.image)
    ]);
  }

  function getProductDetailImageSources(product, color, index) {
    const colorEntry = color && typeof color === "object"
      ? color
      : findProductColor(product, color);
    const colorIndex = Number.isFinite(Number(index))
      ? Number(index)
      : Number.isFinite(Number(colorEntry && colorEntry.index))
        ? Number(colorEntry.index)
        : 0;
    const oldImage = getImageFromOldFormat(product, colorEntry || color, colorIndex);
    const newImage = getImageFromNewFormat(product, colorEntry || color);
    return uniquePaths([
      oldImage,
      newImage,
      cleanPath(product && product.image),
      getProductMainImage(product)
    ]);
  }

  function getColorImage(productOrColor, colorOrProduct, index) {
    let product = null;
    let color = null;
    let colorIndex = Number(index);

    if (productOrColor && typeof productOrColor === "object" && Array.isArray(productOrColor.colors)) {
      product = productOrColor;
      color = colorOrProduct;
    } else if (colorOrProduct && typeof colorOrProduct === "object" && (Array.isArray(colorOrProduct.colors) || colorOrProduct.image || colorOrProduct.imageMap || colorOrProduct.images)) {
      color = productOrColor;
      product = colorOrProduct;
    } else {
      color = productOrColor;
      product = colorOrProduct;
    }

    if (color && typeof color === "object" && cleanPath(color.image)) {
      return cleanPath(color.image);
    }

    const namedColor = findProductColor(product, color);
    if (namedColor && namedColor.image) return cleanPath(namedColor.image);

    if (color && typeof color === "object" && color.name) {
      const legacyImage = findColorImageInLegacyMap(product, color.name);
      if (legacyImage) return legacyImage;
    }

    if (Number.isFinite(colorIndex) && colorIndex >= 0) {
      const imageList = getProductImageList(product);
      if (imageList[colorIndex]) return cleanPath(imageList[colorIndex]);
    }

    return getProductMainImage(product);
  }

  function getProductThumbSet(product, color) {
    const colorEntry = color && typeof color === "object"
      ? Object.assign({}, color, { image: getColorImage(color, product) })
      : findProductColor(product, color);
    const colorIndex = Number.isFinite(Number(colorEntry && colorEntry.index)) ? Number(colorEntry.index) : 0;
    const sources = getProductImageSources(product, colorEntry || color, colorIndex);
    const detailSources = getProductDetailImageSources(product, colorEntry || color, colorIndex);
    const mainImage = detailSources[0] || getColorImage(colorEntry || color, product) || getProductMainImage(product);
    const fallbackSrc = mainImage || sources[0] || "";

    return {
      src: sources[0] || fallbackSrc,
      fallbackSrc: fallbackSrc || mainImage,
      webpSrc: "",
      avifSrc: "",
      originalSrc: mainImage,
      sources: sources.length ? sources : uniquePaths([fallbackSrc, mainImage])
    };
  }

  function setImageWithFallback(img, sources, options) {
    if (!img) return;
    const opts = options || {};
    const queue = uniquePaths(sources);
    const placeholderSrc = cleanPath(opts.placeholderSrc);
    const placeholderClassName = String(opts.placeholderClassName || "").trim();
    const token = String(Date.now()) + Math.random().toString(16).slice(2);
    img.dataset.romixFallbackToken = token;
    let currentIndex = -1;

    function applySource(nextSrc) {
      if (img.dataset.romixFallbackToken !== token) return;
      if (typeof opts.onSourceChange === "function") {
        opts.onSourceChange(nextSrc, currentIndex);
      }
      if (placeholderClassName) {
        img.classList.toggle(placeholderClassName, nextSrc === placeholderSrc && !!placeholderSrc);
      }
      if (nextSrc) {
        img.src = nextSrc;
        return;
      }
      img.removeAttribute("src");
    }

    function tryNext() {
      if (img.dataset.romixFallbackToken !== token) return;
      currentIndex += 1;
      if (currentIndex < queue.length) {
        applySource(queue[currentIndex]);
        return;
      }
      img.onerror = null;
      applySource(placeholderSrc);
    }

    img.onerror = tryNext;
    tryNext();
  }

  function applyImageAttributes(img, options) {
    if (!img || !options) return img;
    if (options.alt != null) img.alt = String(options.alt);
    if (options.loading) img.loading = options.loading;
    if (options.decoding) img.decoding = options.decoding;
    if (options.fetchpriority) img.setAttribute("fetchpriority", options.fetchpriority);
    if (options.width) img.width = options.width;
    if (options.height) img.height = options.height;
    if (options.className) img.className = options.className;
    if (options.sizes) img.sizes = options.sizes;
    if (options.referrerpolicy) img.referrerPolicy = options.referrerpolicy;
    return img;
  }

  function createPicture(options) {
    const opts = options || {};
    const picture = document.createElement("picture");
    if (opts.pictureClassName) picture.className = opts.pictureClassName;

    const avifSrc = cleanPath(opts.avifSrc);
    const webpSrc = cleanPath(opts.webpSrc);
    const imgSrc = cleanPath(opts.src) || cleanPath(opts.fallbackSrc) || "";

    if (avifSrc) {
      const avif = document.createElement("source");
      avif.srcset = avifSrc;
      avif.type = "image/avif";
      picture.appendChild(avif);
    }

    if (webpSrc && webpSrc !== imgSrc) {
      const webp = document.createElement("source");
      webp.srcset = webpSrc;
      webp.type = "image/webp";
      picture.appendChild(webp);
    }

    const img = document.createElement("img");
    if (imgSrc) img.src = imgSrc;
    applyImageAttributes(img, opts);
    picture.appendChild(img);

    return { picture, img };
  }

  window.romixImageUtils = {
    cleanPath,
    basename,
    extension,
    replaceExtension,
    getThumbPath,
    getAvifThumbPath,
    getMobileImagePath,
    toThumbPath,
    fallbackRasterPath,
    uniquePaths,
    getProductLegacyImageMap,
    getProductImageList,
    getImageFromOldFormat,
    getImageFromNewFormat,
    getProductImageSources,
    getProductDetailImageSources,
    resolveProductColorEntries,
    getProductMainImage,
    findProductColor,
    getColorImage,
    getProductThumbSet,
    setImageWithFallback,
    createPicture,
    dimensions: {
      productCard: { width: PRODUCT_CARD_WIDTH, height: PRODUCT_CARD_HEIGHT },
      productFull: { width: PRODUCT_FULL_WIDTH, height: PRODUCT_FULL_HEIGHT },
      hero: { width: HERO_WIDTH, height: HERO_HEIGHT },
      square: { width: SQUARE_WIDTH, height: SQUARE_HEIGHT },
      promo: { width: PROMO_WIDTH, height: PROMO_HEIGHT },
      logo: { width: LOGO_WIDTH, height: LOGO_HEIGHT }
    }
  };
})();
