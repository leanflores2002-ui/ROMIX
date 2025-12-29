(() => {
  const STORAGE_KEY = 'romix_cart';
  const LEGACY_KEYS = ['cart'];

  const normalize = (value) => {
    if (value == null) return '';
    try {
      return value
        .toString()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .toLowerCase()
        .trim();
    } catch {
      return value.toString().toLowerCase().trim();
    }
  };

  const readLocal = (key) => {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const persist = (cart) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  };

  const buildKey = (item) => {
    const productId = item.productId ?? item.pid ?? item.id ?? item.slug ?? item.sku ?? '';
    const color = item.color ?? item.colorName ?? item.colorKey ?? '';
    const size = item.size ?? item.talle ?? item.sizeValue ?? '';
    return [String(productId || ''), normalize(color), normalize(size)].join('|');
  };

  const normalizeItem = (item) => {
    if (!item || typeof item !== 'object') return null;
    const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
    const price = Number(item.price || 0);
    const productId = item.productId ?? item.pid ?? item.id ?? item.slug ?? item.sku ?? '';
    const color = item.color ?? item.colorName ?? item.colorKey ?? 'Unico';
    const size = item.size ?? item.talle ?? item.sizeValue ?? 'U';
    const key = item.key || buildKey({ productId, color, size });

    return {
      key,
      productId: productId ? String(productId) : '',
      name: item.name ?? '',
      type: item.type ?? '',
      price,
      image: item.image ?? '',
      color,
      colorName: item.colorName ?? color,
      size,
      talle: size,
      qty,
      quantity: qty,
      subtotal: price * qty,
    };
  };

  const migrateFromLegacy = () => {
    for (const key of LEGACY_KEYS) {
      const legacy = readLocal(key);
      if (legacy.length) {
        const normalized = legacy
          .map((item) => normalizeItem(item))
          .filter(Boolean);
        persist(normalized);
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        return normalized;
      }
    }
    return [];
  };

  const getCart = () => {
    const stored = readLocal(STORAGE_KEY);
    if (stored.length) {
      const normalized = stored.map((item) => normalizeItem(item)).filter(Boolean);
      persist(normalized);
      return normalized;
    }
    return migrateFromLegacy();
  };

  const saveCart = (cart) => {
    const normalized = (Array.isArray(cart) ? cart : [])
      .map((item) => normalizeItem(item))
      .filter(Boolean);
    persist(normalized);
    return normalized;
  };

  const getCartTotals = (cart = getCart()) => {
    const totals = cart.reduce(
      (acc, item) => {
        const qty = Number(item.qty ?? item.quantity) || 0;
        const price = Number(item.price) || 0;
        acc.totalItems += qty;
        acc.totalPrice += qty * price;
        return acc;
      },
      { totalItems: 0, totalPrice: 0 },
    );
    return totals;
  };

  const addToCart = (product) => {
    const cart = getCart();
    const newItem = normalizeItem(product);
    if (!newItem) return cart;
    const existingIndex = cart.findIndex((item) => item.key === newItem.key);
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const qty = (Number(existing.qty) || Number(existing.quantity) || 0) + newItem.qty;
      cart[existingIndex] = {
        ...existing,
        ...newItem,
        qty,
        quantity: qty,
        subtotal: qty * newItem.price,
      };
    } else {
      cart.push(newItem);
    }
    return saveCart(cart);
  };

  const removeFromCart = (key) => {
    const filtered = getCart().filter((item) => item.key !== key);
    return saveCart(filtered);
  };

  const updateQty = (key, qty) => {
    const nextQty = Math.max(1, Number(qty) || 1);
    const updated = getCart().map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        qty: nextQty,
        quantity: nextQty,
        subtotal: nextQty * (Number(item.price) || 0),
      };
    });
    return saveCart(updated);
  };

  const clearCart = () => saveCart([]);

  const updateBadge = (selector = '#cart-count') => {
    const badge = document.querySelector(selector);
    if (!badge) return;
    const { totalItems } = getCartTotals();
    badge.textContent = String(totalItems);
  };

  const buildWhatsAppMessage = (cart = getCart()) => {
    if (!Array.isArray(cart) || !cart.length) return '';
    const lines = cart.map((item) => {
      const qty = Number(item.qty ?? item.quantity) || 0;
      const price = Number(item.price) || 0;
      const subtotal = qty * price;
      const parts = [
        `- ${item.name || 'Producto'}`,
        item.color ? `Color: ${item.color}` : '',
        item.talle ? `Talle: ${item.talle}` : '',
        `Cant: ${qty}`,
        `Subtotal: $${subtotal.toLocaleString('es-AR')}`,
      ].filter(Boolean);
      return parts.join(' | ');
    });
    const { totalItems, totalPrice } = getCartTotals(cart);
    lines.push(`\nTotal (${totalItems} uds): $${totalPrice.toLocaleString('es-AR')}`);
    return encodeURIComponent(lines.join('\n'));
  };

  window.romixCart = {
    STORAGE_KEY,
    getCart,
    saveCart,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    getCartTotals,
    buildKey,
    buildWhatsAppMessage,
    updateBadge,
  };

  // Backwards-compatible helpers for existing inline code
  window.safeGetCart = getCart;
  window.safeSetCart = saveCart;
  window.updateCartCount = updateBadge;

  document.addEventListener('DOMContentLoaded', () => updateBadge());
})();
