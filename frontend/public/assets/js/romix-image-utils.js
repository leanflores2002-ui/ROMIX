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

  function toThumbPath(value) {
    const fileName = basename(value);
    if (!fileName) return "";
    const dotIndex = fileName.lastIndexOf(".");
    const stem = dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
    return "images/thumbs/" + stem + "-thumb.jpg";
  }

  window.romixImageUtils = {
    cleanPath,
    basename,
    toThumbPath,
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
