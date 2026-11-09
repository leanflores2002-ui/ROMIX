(() => {
  const STORAGE_KEY = 'romix_cart';
  const LEGACY_KEYS = ['cart'];
  const PANEL_AUTO_HIDE_MS = 6500;
  const PANEL_HIDE_MS = 320;
  const PANEL_STYLE_ID = 'romix-cart-added-panel-style';
  const PANEL_IMAGE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="100%" height="100%" fill="#f6f6f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Segoe UI, Arial" font-size="18">ROMIX</text></svg>')}`;

  const panelState = {
    hideTimer: null,
    settleTimer: null,
    root: null,
    image: null,
    name: null,
    type: null,
    meta: null,
    price: null,
    cartLink: null,
    checkoutLink: null,
  };
  let lastSavePersisted = true;

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
      return true;
    } catch {
      return false;
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
    const rawQty = Object.hasOwn(item, 'qty') ? item.qty : Object.hasOwn(item, 'quantity') ? item.quantity : 1;
    const qty = typeof rawQty === 'number' ? rawQty : Number(rawQty);
    if (!['number', 'string'].includes(typeof rawQty) || !Number.isSafeInteger(qty) || qty <= 0) return null;
    const price = Number(item.price || 0);
    const productId = item.productId ?? item.pid ?? item.id ?? item.slug ?? item.sku ?? '';
    const color = item.color ?? item.colorName ?? item.colorKey ?? 'Unico';
    const size = item.size ?? item.talle ?? item.sizeValue ?? 'U';
    const key = buildKey({ productId, color, size });

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

  const formatPrice = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toLocaleString('es-AR')}`;
  };

  const addPanelStyles = () => {
    if (!document || !document.head) return;
    if (document.getElementById(PANEL_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PANEL_STYLE_ID;
    style.textContent = `
      .romix-cart-added-panel {
        position: fixed;
        top: 16px;
        right: 16px;
        width: min(94vw, 390px);
        background: #fff;
        border-radius: 16px;
        border: 1px solid #ededed;
        box-shadow: 0 24px 40px rgba(0, 0, 0, 0.14);
        padding: 14px;
        z-index: 2200;
        opacity: 0;
        transform: translate3d(110%, 0, 0);
        pointer-events: none;
        transition: transform .32s ease, opacity .24s ease;
      }
      .romix-cart-added-panel.is-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
      }
      .romix-cart-added-panel__close {
        position: absolute;
        top: 10px;
        right: 10px;
        border: 0;
        background: transparent;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 20px;
        line-height: 1;
        color: #5f5f5f;
        cursor: pointer;
      }
      .romix-cart-added-panel__close svg {
        width: 20px;
        height: 20px;
      }
      .romix-cart-added-panel__close:hover {
        background: #f2f2f2;
      }
      .romix-cart-added-panel__header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 28px 10px 0;
      }
      .romix-cart-added-panel__icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #20a052;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      .romix-cart-added-panel__status {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #222;
      }
      .romix-cart-added-panel__content {
        display: grid;
        grid-template-columns: 78px 1fr;
        gap: 12px;
        align-items: start;
      }
      .romix-cart-added-panel__image {
        width: 78px;
        height: 78px;
        border-radius: 10px;
        object-fit: cover;
        background: #f5f5f5;
      }
      .romix-cart-added-panel__name {
        margin: 0 0 4px;
        font-size: 14px;
        font-weight: 700;
        color: #181818;
      }
      .romix-cart-added-panel__type,
      .romix-cart-added-panel__meta {
        margin: 0;
        font-size: 12px;
        color: #666;
      }
      .romix-cart-added-panel__price {
        margin: 7px 0 0;
        font-size: 15px;
        font-weight: 800;
        color: #111;
      }
      .romix-cart-added-panel__actions {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .romix-cart-added-panel__btn {
        border-radius: 10px;
        text-decoration: none;
        text-align: center;
        padding: 10px 12px;
        font-size: 13px;
        font-weight: 700;
      }
      .romix-cart-added-panel__btn--secondary {
        border: 1px solid #d9d9d9;
        color: #222;
        background: #fff;
      }
      .romix-cart-added-panel__btn--primary {
        border: 1px solid #111;
        color: #fff;
        background: #111;
      }
      @media (max-width: 680px) {
        .romix-cart-added-panel {
          top: 10px;
          right: 10px;
          left: 10px;
          width: auto;
          padding: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensurePanel = () => {
    if (!document || !document.body) return null;
    if (panelState.root) return panelState;

    addPanelStyles();

    const panel = document.createElement('section');
    panel.className = 'romix-cart-added-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    panel.setAttribute('aria-atomic', 'true');
    panel.innerHTML = `
      <button type="button" class="romix-icon-btn romix-cart-added-panel__close" aria-label="Cerrar">${window.romixIcon("X", { size: "sm" })}</button>
      <div class="romix-cart-added-panel__header">
        <span class="romix-cart-added-panel__icon" aria-hidden="true">${window.romixIcon("Check", { size: "md" })}</span>
        <p class="romix-cart-added-panel__status">Agregado a la bolsa de compra</p>
      </div>
      <div class="romix-cart-added-panel__content">
        <img class="romix-cart-added-panel__image" src="${PANEL_IMAGE_PLACEHOLDER}" alt="Producto agregado" loading="lazy" decoding="async" width="720" height="960" />
        <div class="romix-cart-added-panel__info">
          <p class="romix-cart-added-panel__name">Producto</p>
          <p class="romix-cart-added-panel__type">Indumentaria</p>
          <p class="romix-cart-added-panel__meta">Talle: U</p>
          <p class="romix-cart-added-panel__price">$0</p>
        </div>
      </div>
      <div class="romix-cart-added-panel__actions">
        <a class="romix-btn romix-btn--secondary romix-cart-added-panel__btn romix-cart-added-panel__btn--secondary" href="cart.html">Ver carrito</a>
        <a class="romix-btn romix-btn--primary romix-cart-added-panel__btn romix-cart-added-panel__btn--primary" href="cart.html#order-btn">Comprar</a>
      </div>
    `;
    document.body.appendChild(panel);

    panelState.root = panel;
    panelState.image = panel.querySelector('.romix-cart-added-panel__image');
    panelState.name = panel.querySelector('.romix-cart-added-panel__name');
    panelState.type = panel.querySelector('.romix-cart-added-panel__type');
    panelState.meta = panel.querySelector('.romix-cart-added-panel__meta');
    panelState.price = panel.querySelector('.romix-cart-added-panel__price');
    panelState.cartLink = panel.querySelector('.romix-cart-added-panel__btn--secondary');
    panelState.checkoutLink = panel.querySelector('.romix-cart-added-panel__btn--primary');

    const close = panel.querySelector('.romix-cart-added-panel__close');
    if (close) close.addEventListener('click', () => hideAddedPanel(true));

    return panelState;
  };

  const hideAddedPanel = (immediate = false) => {
    const state = ensurePanel();
    if (!state || !state.root) return;
    if (state.hideTimer) clearTimeout(state.hideTimer);
    if (state.settleTimer) clearTimeout(state.settleTimer);

    const panel = state.root;
    panel.classList.remove('is-visible');
    if (immediate) {
      panel.hidden = true;
      return;
    }
    state.settleTimer = setTimeout(() => {
      panel.hidden = true;
    }, PANEL_HIDE_MS);
  };

  const showAddedPanel = (item) => {
    const state = ensurePanel();
    if (!state || !state.root || !item || typeof item !== 'object') return;

    const panel = state.root;
    const title = item.name || 'Producto';
    const type = item.type || 'Indumentaria';
    const size = item.talle || item.size || 'U';
    const color = item.colorName || item.color || '';
    const meta = color ? `Talle: ${size} | Color: ${color}` : `Talle: ${size}`;
    const image = item.image || PANEL_IMAGE_PLACEHOLDER;

    if (state.image) {
      state.image.src = image;
      state.image.alt = title;
      state.image.onerror = () => {
        state.image.onerror = null;
        state.image.src = PANEL_IMAGE_PLACEHOLDER;
      };
    }
    if (state.name) state.name.textContent = title;
    if (state.type) state.type.textContent = type;
    if (state.meta) state.meta.textContent = meta;
    if (state.price) state.price.textContent = formatPrice(item.price);
    if (state.cartLink) state.cartLink.href = 'cart.html';
    if (state.checkoutLink) state.checkoutLink.href = 'cart.html#order-btn';

    panel.hidden = false;
    if (state.settleTimer) clearTimeout(state.settleTimer);
    if (state.hideTimer) clearTimeout(state.hideTimer);

    panel.classList.remove('is-visible');
    // Restart entrance transition when another product is added.
    void panel.offsetWidth;
    panel.classList.add('is-visible');

    state.hideTimer = setTimeout(() => hideAddedPanel(), PANEL_AUTO_HIDE_MS);
  };

  const notifyItemAdded = (item) => {
    showAddedPanel(item);
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-item-added', { detail: { item } }));
    } catch {
      /* ignore */
    }
  };

  const migrateFromLegacy = () => {
    for (const key of LEGACY_KEYS) {
      const legacy = readLocal(key);
      if (legacy.length) {
        const normalized = legacy
          .map((item) => normalizeItem(item))
          .filter(Boolean);
        if (!persist(normalized)) return normalized;
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
    const persisted = persist(normalized);
    lastSavePersisted = persisted;
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-changed', { detail: { cart: normalized, persisted } }));
      if (!persisted) window.dispatchEvent(new CustomEvent('romix:cart-storage-error'));
    } catch {
      /* CustomEvent is optional in legacy browsers. */
    }
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

    let addedItem = newItem;
    const existingIndex = cart.findIndex((item) => item.key === newItem.key);
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const qty = (Number(existing.qty) || Number(existing.quantity) || 0) + newItem.qty;
      if (!Number.isSafeInteger(qty)) return cart;
      cart[existingIndex] = {
        ...existing,
        ...newItem,
        qty,
        quantity: qty,
        subtotal: qty * newItem.price,
      };
      addedItem = cart[existingIndex];
    } else {
      cart.push(newItem);
      addedItem = newItem;
    }

    const saved = saveCart(cart);
    const persistedItem = saved.find((entry) => entry.key === addedItem.key) || addedItem;
    if (lastSavePersisted) {
      notifyItemAdded(persistedItem);
      window.dispatchEvent(new CustomEvent("romix:analytics-cart-added", { detail: { item: newItem } }));
    }
    return saved;
  };

  const removeFromCart = (key) => {
    const before = getCart();
    const removed = before.filter(item => item.key === key);
    const saved = saveCart(before.filter(item => item.key !== key));
    if (lastSavePersisted && removed.length) window.dispatchEvent(new CustomEvent('romix:analytics-cart-removed', { detail: { items: removed } }));
    return saved;
  };

  const updateQty = (key, qty) => {
    const nextQty = Number(qty);
    if (!['number', 'string'].includes(typeof qty) || !Number.isSafeInteger(nextQty) || nextQty <= 0) return getCart();
    const before = getCart();
    const previous = before.find(item => item.key === key);
    const updated = before.map((item) => {
      if (item.key !== key) return item;
      return {
        ...item,
        qty: nextQty,
        quantity: nextQty,
        subtotal: nextQty * (Number(item.price) || 0),
      };
    });
    const saved = saveCart(updated);
    const delta = previous ? nextQty - previous.qty : 0;
    if (lastSavePersisted && delta) {
      const change = { ...previous, qty: Math.abs(delta), quantity: Math.abs(delta) };
      const name = delta > 0 ? 'romix:analytics-cart-added' : 'romix:analytics-cart-removed';
      window.dispatchEvent(new CustomEvent(name, { detail: delta > 0 ? { item: change } : { items: [change] } }));
    }
    return saved;
  };

  const clearCart = ({ forOrder = false } = {}) => {
    const before = getCart();
    const saved = saveCart([]);
    if (lastSavePersisted && before.length && !forOrder) window.dispatchEvent(new CustomEvent('romix:analytics-cart-removed', { detail: { items: before } }));
    return saved;
  };

  const updateBadge = (selector = '#cart-count') => {
    const badge = document.querySelector(selector);
    if (!badge) return;
    const { totalItems } = getCartTotals();
    badge.textContent = String(totalItems);
    badge.hidden = totalItems === 0;
    badge.setAttribute('aria-hidden', totalItems === 0 ? 'true' : 'false');
  };

  const decodeCartText = (value) => {
    if (value == null) return '';
    const text = String(value);
    try {
      return decodeURIComponent(text);
    } catch {
      return text;
    }
  };

  const buildWhatsAppMessage = (cart = getCart()) => {
    if (!Array.isArray(cart) || !cart.length) return '';
    const lines = cart.map((item) => {
      const qty = Number(item.qty ?? item.quantity) || 0;
      const name = decodeCartText(item.name) || 'Producto';
      const type = decodeCartText(item.type);
      const color = decodeCartText(item.colorName ?? item.color);
      const size = decodeCartText(item.talle ?? item.size);
      const label = type ? `${name} (${type})` : name;
      const parts = [
        `- ${label}`,
        color ? `Color: ${color}` : '',
        size ? `Talle: ${size}` : '',
        `Cant: ${qty}`,
      ].filter(Boolean);
      return parts.join(' | ');
    });
    return encodeURIComponent(lines.join('\n'));
  };

  const DRAWER_HIDE_MS = 220;
  const drawerState = {
    root: null,
    backdrop: null,
    panel: null,
    list: null,
    empty: null,
    count: null,
    subtotal: null,
    close: null,
    trigger: null,
    hideTimer: null,
    focusReturn: null,
    bound: false,
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const drawerItemDisplay = (item) => ({
    name: decodeCartText(item?.name) || 'Producto',
    color: decodeCartText(item?.colorName ?? item?.color) || 'Unico',
    size: decodeCartText(item?.talle ?? item?.size) || 'U',
    image: String(item?.image || '').trim(),
  });

  const applyDrawerImage = (img, item, altText) => {
    if (!img) return;
    const rawImage = item && item.image ? String(item.image).trim() : '';
    const sources = rawImage && window.romixImageUtils && typeof window.romixImageUtils.getImageFallbackSources === 'function'
      ? window.romixImageUtils.getImageFallbackSources(rawImage)
      : (rawImage ? [rawImage] : []);
    if (window.romixImageUtils && typeof window.romixImageUtils.applyImageWithFallback === 'function') {
      window.romixImageUtils.applyImageWithFallback(img, sources, altText || 'Producto ROMIX', {
        placeholder: PANEL_IMAGE_PLACEHOLDER,
      });
      return;
    }
    img.alt = altText || 'Producto ROMIX';
    img.onerror = () => {
      img.onerror = null;
      img.src = PANEL_IMAGE_PLACEHOLDER;
    };
    img.src = sources[0] || PANEL_IMAGE_PLACEHOLDER;
  };

  const drawerFocusable = () => {
    if (!drawerState.panel) return [];
    return Array.from(drawerState.panel.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && element.getClientRects().length);
  };

  const setDrawerLinks = () => {
    if (!drawerState.root) return;
    const cartUrl = new URL('cart.html', document.baseURI).href;
    const orderUrl = `${cartUrl}#order-btn`;
    drawerState.root.querySelector('[data-cart-drawer-link="cart"]')?.setAttribute('href', cartUrl);
    drawerState.root.querySelector('[data-cart-drawer-link="order"]')?.setAttribute('href', orderUrl);
  };

  const renderCartDrawer = () => {
    if (!drawerState.root) return;
    const cart = getCart();
    const totals = getCartTotals(cart);
    drawerState.count.textContent = `${totals.totalItems} ${totals.totalItems === 1 ? 'producto' : 'productos'}`;
    drawerState.subtotal.textContent = formatPrice(totals.totalPrice);
    drawerState.list.innerHTML = '';
    drawerState.empty.hidden = cart.length > 0;
    drawerState.list.hidden = cart.length === 0;

    cart.forEach((item) => {
      const display = drawerItemDisplay(item);
      const qty = Math.max(1, Number(item.qty ?? item.quantity) || 1);
      const price = Number(item.price) || 0;
      const itemElement = document.createElement('article');
      itemElement.className = 'romix-cart-drawer__item';
      itemElement.innerHTML = `
        <div class="romix-cart-drawer__media">
          <img src="${escapeHtml(display.image || PANEL_IMAGE_PLACEHOLDER)}" alt="${escapeHtml(display.name)}" loading="lazy" decoding="async" width="96" height="120" />
        </div>
        <div class="romix-cart-drawer__details">
          <h3 class="romix-cart-drawer__name">${escapeHtml(display.name)}</h3>
          <p class="romix-cart-drawer__meta">Color: ${escapeHtml(display.color)} · Talle: ${escapeHtml(display.size)}</p>
          <p class="romix-cart-drawer__price">${formatPrice(price)}</p>
          <div class="romix-cart-drawer__controls">
            <div class="romix-cart-drawer__stepper" role="group" aria-label="Cantidad de ${escapeHtml(display.name)}">
              <button type="button" class="romix-icon-btn romix-cart-drawer__qty romix-cart-drawer__qty--dec" aria-label="Disminuir cantidad de ${escapeHtml(display.name)}"${qty <= 1 ? ' disabled' : ''}>${window.romixIcon('Minus', { size: 'xs' })}</button>
              <input class="romix-cart-drawer__qty-input" type="number" min="1" inputmode="numeric" value="${qty}" aria-label="Cantidad de ${escapeHtml(display.name)}" />
              <button type="button" class="romix-icon-btn romix-cart-drawer__qty romix-cart-drawer__qty--inc" aria-label="Aumentar cantidad de ${escapeHtml(display.name)}">${window.romixIcon('Plus', { size: 'xs' })}</button>
            </div>
            <button type="button" class="romix-icon-btn romix-cart-drawer__remove" aria-label="Quitar ${escapeHtml(display.name)} del carrito">${window.romixIcon('Trash2', { size: 'sm' })}</button>
          </div>
        </div>`;

      const key = item.key;
      itemElement.querySelector('.romix-cart-drawer__qty--dec').addEventListener('click', () => updateQty(key, qty - 1));
      itemElement.querySelector('.romix-cart-drawer__qty--inc').addEventListener('click', () => updateQty(key, qty + 1));
      itemElement.querySelector('.romix-cart-drawer__qty-input').addEventListener('change', (event) => updateQty(key, event.target.value));
      itemElement.querySelector('.romix-cart-drawer__remove').addEventListener('click', () => removeFromCart(key));
      applyDrawerImage(itemElement.querySelector('img'), item, display.name);
      drawerState.list.appendChild(itemElement);
    });
  };

  const closeCartDrawer = ({ restoreFocus = true } = {}) => {
    if (!drawerState.root || drawerState.root.hidden) return;
    if (drawerState.hideTimer) clearTimeout(drawerState.hideTimer);
    drawerState.root.classList.remove('is-open');
    drawerState.root.setAttribute('aria-hidden', 'true');
    drawerState.backdrop.classList.remove('is-visible');
    drawerState.backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('romix-cart-drawer-open');
    if (drawerState.trigger) drawerState.trigger.setAttribute('aria-expanded', 'false');
    drawerState.hideTimer = window.setTimeout(() => {
      drawerState.root.hidden = true;
      drawerState.backdrop.hidden = true;
      if (restoreFocus) (drawerState.trigger || drawerState.focusReturn)?.focus?.({ preventScroll: true });
    }, DRAWER_HIDE_MS);
  };

  const openCartDrawer = () => {
    if (!drawerState.root) ensureCartDrawer();
    if (!drawerState.root) return;
    if (drawerState.hideTimer) clearTimeout(drawerState.hideTimer);
    drawerState.focusReturn = document.activeElement;
    renderCartDrawer();
    setDrawerLinks();
    drawerState.root.hidden = false;
    drawerState.backdrop.hidden = false;
    drawerState.root.setAttribute('aria-hidden', 'false');
    drawerState.backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('romix-cart-drawer-open');
    if (drawerState.trigger) drawerState.trigger.setAttribute('aria-expanded', 'true');
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-drawer-opened'));
    } catch {
      /* CustomEvent is optional in legacy browsers. */
    }
    const scheduleFrame = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    scheduleFrame(() => {
      drawerState.root.classList.add('is-open');
      drawerState.backdrop.classList.add('is-visible');
      drawerState.close?.focus({ preventScroll: true });
    });
  };

  function ensureCartDrawer() {
    if (!document?.body) return null;
    if (drawerState.root) return drawerState;

    const backdrop = document.createElement('div');
    backdrop.className = 'romix-cart-drawer__backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');

    const drawer = document.createElement('aside');
    drawer.id = 'romix-cart-drawer';
    drawer.className = 'romix-cart-drawer';
    drawer.hidden = true;
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'romix-cart-drawer-title');
    drawer.setAttribute('aria-hidden', 'true');
    drawer.tabIndex = -1;
    drawer.innerHTML = `
      <div class="romix-cart-drawer__header">
        <div>
          <h2 id="romix-cart-drawer-title">Tu carrito</h2>
          <p class="romix-cart-drawer__count"></p>
        </div>
        <button type="button" class="romix-icon-btn romix-cart-drawer__close" aria-label="Cerrar carrito">${window.romixIcon('X', { size: 'md' })}</button>
      </div>
      <div class="romix-cart-drawer__body">
        <div class="romix-cart-drawer__list" aria-live="polite"></div>
        <div class="romix-cart-drawer__empty" hidden>
          <span class="romix-cart-drawer__empty-icon" aria-hidden="true">${window.romixIcon('ShoppingBag', { size: 'lg' })}</span>
          <h3>Tu carrito está vacío</h3>
          <p>Agregá productos para verlos acá.</p>
        </div>
        <section id="romix-cart-drawer-recommendations" class="romix-cart-drawer-recommendations" aria-labelledby="romix-cart-drawer-recommendations-title" hidden>
          <div class="romix-cart-drawer-recommendations__header">
            <h3 id="romix-cart-drawer-recommendations-title">Te puede interesar</h3>
            <div class="romix-cart-drawer-recommendations__controls" aria-label="Controles de recomendaciones">
              <button id="romix-cart-drawer-recommendations-prev" class="romix-icon-btn" type="button" aria-label="Ver recomendaciones anteriores" aria-controls="romix-cart-drawer-recommendations-list"><span data-romix-icon="ChevronLeft" data-romix-icon-size="xs"></span></button>
              <button id="romix-cart-drawer-recommendations-next" class="romix-icon-btn" type="button" aria-label="Ver recomendaciones siguientes" aria-controls="romix-cart-drawer-recommendations-list"><span data-romix-icon="ChevronRight" data-romix-icon-size="xs"></span></button>
            </div>
          </div>
          <div class="romix-cart-drawer-recommendations__viewport">
            <div id="romix-cart-drawer-recommendations-list" class="romix-cart-drawer-recommendations__list" aria-live="polite"></div>
          </div>
        </section>
      </div>
      <div class="romix-cart-drawer__footer">
        <div class="romix-cart-drawer__subtotal"><span>Subtotal</span><strong>$0</strong></div>
        <div class="romix-cart-drawer__actions">
          <a class="romix-btn romix-btn--secondary" data-cart-drawer-link="cart" href="cart.html">Ver carrito</a>
          <a class="romix-btn romix-btn--primary" data-cart-drawer-link="order" href="cart.html#order-btn">Enviar pedido</a>
        </div>
      </div>`;

    document.body.append(backdrop, drawer);
    drawerState.root = drawer;
    drawerState.backdrop = backdrop;
    drawerState.panel = drawer;
    drawerState.list = drawer.querySelector('.romix-cart-drawer__list');
    drawerState.empty = drawer.querySelector('.romix-cart-drawer__empty');
    drawerState.count = drawer.querySelector('.romix-cart-drawer__count');
    drawerState.subtotal = drawer.querySelector('.romix-cart-drawer__subtotal strong');
    drawerState.close = drawer.querySelector('.romix-cart-drawer__close');
    drawerState.trigger = document.querySelector('.cart-pill');
    if (drawerState.trigger) {
      drawerState.trigger.setAttribute('aria-controls', drawer.id);
      drawerState.trigger.setAttribute('aria-expanded', 'false');
      drawerState.trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openCartDrawer();
      });
    }
    drawerState.close.addEventListener('click', () => closeCartDrawer());
    backdrop.addEventListener('click', () => closeCartDrawer());
    drawer.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCartDrawer();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = drawerFocusable();
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.addEventListener('romix:cart-changed', () => renderCartDrawer());
    window.addEventListener('storage', (event) => {
      if (event?.key === STORAGE_KEY || event?.key === null) renderCartDrawer();
    });
    drawerState.bound = true;
    renderCartDrawer();
    setDrawerLinks();
    try {
      window.dispatchEvent(new CustomEvent('romix:cart-drawer-ready', { detail: { root: drawer } }));
    } catch {
      /* CustomEvent is optional in legacy browsers. */
    }
    return drawerState;
  }

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
    getStatus() { return { persisted: lastSavePersisted }; },
  };

  // Backwards-compatible helpers for existing inline code
  window.safeGetCart = getCart;
  window.safeSetCart = saveCart;
  window.updateCartCount = updateBadge;

  document.addEventListener('DOMContentLoaded', () => {
    updateBadge();
    ensurePanel();
    ensureCartDrawer();
  });

  window.addEventListener('storage', (event) => {
    if (event?.key === STORAGE_KEY) updateBadge();
  });
  window.addEventListener('romix:cart-changed', () => updateBadge());
})();
