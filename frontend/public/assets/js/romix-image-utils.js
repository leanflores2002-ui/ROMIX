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

  function toThumbPath(value) {
    const fileName = basename(value);
    if (!fileName) return "";
    const dotIndex = fileName.lastIndexOf(".");
    const stem = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
    return "images/thumbs/" + stem + "-thumb.jpg";
  }

  function fallbackRasterPath(value) {
    const normalized = cleanPath(value);
    if (!normalized) return "";
    const ext = extension(normalized);
    if (ext === "avif" || ext === "webp") return replaceExtension(normalized, "jpg");
    return normalized;
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
    toThumbPath,
    fallbackRasterPath,
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
