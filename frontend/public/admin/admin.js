(() => {
  const state = {
    authenticated: false,
    dashboard: null,
    products: [],
    variants: [],
    orders: [],
    selectedOrder: null,
    filterStatus: 'all',
  };

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  function showToast(message) {
    const toast = qs('#toast');
    if (!toast) return;
    toast.textContent = message || '';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }

  async function apiFetch(path, options = {}) {
    const opts = {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      opts.body = JSON.stringify(options.body);
    }
    const res = await fetch(path, opts);
    if (res.status === 401) {
      state.authenticated = false;
      renderAuthState();
      throw new Error('No autorizado');
    }
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      const msg = detail.detail || res.statusText || 'Error';
      throw new Error(msg);
    }
    return res.json();
  }

  function renderAuthState() {
    const chip = qs('#auth-state');
    const logoutBtn = qs('#logout-btn');
    const logged = state.authenticated;
    if (chip) {
      chip.textContent = logged ? 'Admin conectado' : 'Desconectado';
      chip.classList.toggle('chip--ok', logged);
      chip.classList.toggle('chip--muted', !logged);
    }
    if (logoutBtn) logoutBtn.disabled = !logged;
    qs('#login-section')?.classList.toggle('hidden', logged);
    ['dashboard-section', 'orders-section', 'products-section', 'variants-section'].forEach((id) => {
      qs(`#${id}`)?.classList.toggle('hidden', !logged);
    });
  }

  function renderDashboard() {
    const data = state.dashboard || {};
    qs('#stat-pending').textContent = data.pending_orders ?? 0;
    qs('#stat-confirmed').textContent = data.confirmed_orders ?? 0;
    qs('#stat-cancelled').textContent = data.cancelled_orders ?? 0;
    qs('#stat-products').textContent = data.active_products ?? 0;
    const list = qs('#low-stock-list');
    if (list) {
      list.innerHTML = '';
      (data.low_stock || []).forEach((v) => {
        const pill = document.createElement('div');
        pill.className = 'pill warn';
        pill.textContent = `${v.productId || v.product_id} · ${v.color} / ${v.size} (${v.stock})`;
        list.appendChild(pill);
      });
      if (!data.low_stock || !data.low_stock.length) {
        const pill = document.createElement('div');
        pill.className = 'pill';
        pill.textContent = 'Sin alertas';
        list.appendChild(pill);
      }
    }
  }

  function formatDate(value) {
    if (!value) return '';
    try {
      return new Date(value).toLocaleString('es-AR');
    } catch {
      return value;
    }
  }

  function renderOrders() {
    const tbody = qs('#orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const filter = state.filterStatus;
    const filtered = state.orders.filter((o) => filter === 'all' || o.status === filter);
    filtered.forEach((order) => {
      const tr = document.createElement('tr');
      const itemsLabel = (order.items || []).map((it) => `${it.product_id || it.productId} (${it.qty})`).join(', ');
      tr.innerHTML = `
        <td>${order.id}</td>
        <td>${order.customer_name || 'Sin nombre'}<div class="form-hint">${order.whatsapp || ''}</div></td>
        <td><span class="badge ${order.status}">${order.status}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>${itemsLabel || '-'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn--ghost" data-action="view">Ver</button>
            <button class="btn btn--primary" data-action="confirm" ${order.status === 'confirmed' ? 'disabled' : ''}>Confirmar</button>
            <button class="btn btn--ghost" data-action="cancel" ${order.status === 'cancelled' ? 'disabled' : ''}>Cancelar</button>
          </div>
        </td>
      `;
      tr.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => handleOrderAction(order, btn.dataset.action));
      });
      tbody.appendChild(tr);
    });
  }

  function renderOrderDetail(order) {
    const box = qs('#order-detail-body');
    if (!box) return;
    if (!order) {
      box.textContent = 'Seleccioná un pedido para ver los items.';
      return;
    }
    const items = (order.items || []).map(
      (it) => `<div class="order-item">${it.product_id || it.productId} · ${it.color} / ${it.size} · x${it.qty}</div>`
    );
    box.innerHTML = `
      <div><strong>Cliente:</strong> ${order.customer_name || 'Sin nombre'}</div>
      <div><strong>WhatsApp:</strong> ${order.whatsapp || '-'}</div>
      <div><strong>Notas:</strong> ${order.notes || '-'}</div>
      <div><strong>Estado:</strong> <span class="badge ${order.status}">${order.status}</span></div>
      <div class="order-items">${items.join('') || '<div class="form-hint">Sin items</div>'}</div>
    `;
  }

  function renderProducts() {
    const tbody = qs('#products-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.products.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${p.name || '-'}</td>
        <td>${p.section || '-'}</td>
        <td>${p.type || '-'}</td>
        <td>$${Number(p.price || (p.priceByGroup && p.priceByGroup.common) || 0).toLocaleString('es-AR')}</td>
        <td>${p.active === false ? '<span class="badge cancelled">No</span>' : '<span class="badge ok">Sí</span>'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn--ghost" data-action="edit">Editar</button>
            <button class="btn btn--ghost" data-action="toggle">${p.active === false ? 'Activar' : 'Desactivar'}</button>
          </div>
        </td>
      `;
      tr.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => handleProductAction(p, btn.dataset.action));
      });
      tbody.appendChild(tr);
    });
    renderVariantProductOptions();
  }

  function renderVariants() {
    const tbody = qs('#variants-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.variants.forEach((v) => {
      const tr = document.createElement('tr');
      const low = Number(v.stock || 0) < 3;
      tr.innerHTML = `
        <td>${v.productId || v.product_id}</td>
        <td>${v.color}</td>
        <td>${v.size}</td>
        <td><input class="stock-input" type="number" min="0" value="${v.stock ?? 0}" data-id="${v.id}"></td>
        <td>
          <button class="btn btn--primary" data-action="save">Guardar</button>
        </td>
      `;
      if (low) tr.classList.add('stock-low');
      tr.querySelector('[data-action=\"save\"]').addEventListener('click', () => {
        const value = tr.querySelector('input').value;
        updateVariantStock(v.id, value);
      });
      tbody.appendChild(tr);
    });
  }

  function renderVariantProductOptions() {
    const select = qs('#variant-product');
    if (!select) return;
    select.innerHTML = state.products
      .map((p) => `<option value="${p.id}">${p.id} - ${p.name}</option>`)
      .join('');
  }

  function parseList(text) {
    return (text || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }

  function parseSizes(text) {
    return (text || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((size) => ({ size, status: 'available' }));
  }

  function fillProductForm(product = null) {
    const form = qs('#product-form');
    if (!form) return;
    form.reset();
    qs('#product-form-title').textContent = product ? `Editar ${product.name}` : 'Crear producto';
    form.id.value = product?.id || '';
    form.name.value = product?.name || '';
    form.section.value = product?.section || '';
    form.type.value = product?.type || '';
    const price = product?.price ?? product?.priceByGroup?.common ?? '';
    form.price.value = price;
    form.badge.value = product?.badge || '';
    form.description.value = product?.description || '';
    form.colors.value = (product?.colors || []).map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean).join(', ');
    form.sizes.value = (product?.sizes || []).map((s) => (typeof s === 'string' ? s : s.size)).filter(Boolean).join(', ');
    form.active.checked = product?.active !== false;
    qs('#product-form-hint').textContent = product ? 'Editando producto existente' : 'Completá para crear uno nuevo';
  }

  function currentProductById(id) {
    return state.products.find((p) => String(p.id) === String(id));
  }

  async function handleOrderAction(order, action) {
    if (action === 'view') {
      state.selectedOrder = order;
      renderOrderDetail(order);
      return;
    }
    let status = order.status;
    if (action === 'confirm') status = 'confirmed';
    if (action === 'cancel') status = 'cancelled';
    try {
      await apiFetch(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: { status } });
      showToast(`Pedido ${order.id} -> ${status}`);
      await loadOrders();
      await loadVariants();
      renderDashboard();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleProductAction(product, action) {
    if (action === 'edit') {
      fillProductForm(product);
      return;
    }
    if (action === 'toggle') {
      try {
        await apiFetch(`/api/admin/products/${product.id}/active`, {
          method: 'PATCH',
          body: { active: product.active === false },
        });
        showToast('Producto actualizado');
        await loadProducts();
        await loadVariants();
      } catch (err) {
        showToast(err.message);
      }
    }
  }

  async function updateVariantStock(variantId, value) {
    const stock = Math.max(0, Number(value) || 0);
    try {
      await apiFetch(`/api/admin/variants/${variantId}/stock`, { method: 'PATCH', body: { stock } });
      showToast('Stock actualizado');
      await loadVariants();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function createVariantFromForm() {
    const productId = qs('#variant-product')?.value;
    const color = qs('#variant-color')?.value;
    const size = qs('#variant-size')?.value;
    const stock = qs('#variant-stock')?.value;
    if (!productId || !color || !size) {
      qs('#variant-error').textContent = 'Completá producto, color y talle.';
      return;
    }
    qs('#variant-error').textContent = '';
    try {
      await apiFetch('/api/admin/variants', {
        method: 'POST',
        body: { product_id: productId, color, size, stock: Number(stock) || 0 },
      });
      showToast('Variante creada');
      qs('#variant-color').value = '';
      qs('#variant-size').value = '';
      await loadVariants();
    } catch (err) {
      qs('#variant-error').textContent = err.message;
    }
  }

  async function submitProductForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const errorBox = qs('#product-form-error');
    if (errorBox) errorBox.textContent = '';
    const id = form.id.value.trim();
    const base = id ? currentProductById(id) || {} : {};
    const payload = {
      ...base,
      id: id || undefined,
      name: form.name.value.trim(),
      section: form.section.value.trim(),
      type: form.type.value.trim(),
      badge: form.badge.value.trim(),
      description: form.description.value.trim(),
      price: Number(form.price.value) || 0,
      priceByGroup: { ...(base.priceByGroup || {}), common: Number(form.price.value) || 0 },
      colors: parseList(form.colors.value),
      sizes: parseSizes(form.sizes.value),
      active: form.active.checked,
      image: base.image,
      images: base.images,
    };
    const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
    const method = id ? 'PUT' : 'POST';
    try {
      await apiFetch(url, { method, body: payload });
      showToast('Producto guardado');
      fillProductForm(null);
      await loadProducts();
      await loadVariants();
    } catch (err) {
      if (errorBox) errorBox.textContent = err.message;
      showToast(err.message);
    }
  }

  async function loadDashboard() {
    const data = await apiFetch('/api/admin/dashboard');
    state.dashboard = data;
    state.authenticated = true;
    renderAuthState();
    renderDashboard();
  }

  async function loadOrders() {
    const orders = await apiFetch('/api/admin/orders');
    state.orders = orders;
    renderOrders();
    renderOrderDetail(state.selectedOrder && orders.find((o) => o.id === state.selectedOrder.id));
  }

  async function loadProducts() {
    const products = await apiFetch('/api/admin/products');
    state.products = products.map((p) => ({ ...p, id: p.id || p.slug }));
    renderProducts();
  }

  async function loadVariants() {
    const variants = await apiFetch('/api/admin/variants');
    state.variants = variants;
    renderVariants();
  }

  async function bootstrap() {
    try {
      await loadDashboard();
      await Promise.all([loadOrders(), loadProducts(), loadVariants()]);
    } catch (err) {
      state.authenticated = false;
      renderAuthState();
    }
  }

  function wireEvents() {
    const loginForm = qs('#login-form');
    loginForm?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      qs('#login-error').textContent = '';
      const body = {
        username: loginForm.username.value.trim(),
        password: loginForm.password.value,
      };
      try {
        await apiFetch('/api/admin/login', { method: 'POST', body });
        state.authenticated = true;
        renderAuthState();
        await bootstrap();
      } catch (err) {
        qs('#login-error').textContent = err.message;
      }
    });

    qs('#refresh-btn')?.addEventListener('click', bootstrap);
    qs('#orders-filter')?.addEventListener('change', (ev) => {
      state.filterStatus = ev.target.value;
      renderOrders();
    });
    qs('#product-form')?.addEventListener('submit', submitProductForm);
    qs('#product-cancel-btn')?.addEventListener('click', () => fillProductForm(null));
    qs('#new-product-btn')?.addEventListener('click', () => fillProductForm(null));
    qs('#variant-create-btn')?.addEventListener('click', createVariantFromForm);
    qs('#logout-btn')?.addEventListener('click', async () => {
      try {
        await apiFetch('/api/admin/logout', { method: 'POST' });
      } catch {}
      state.authenticated = false;
      state.orders = [];
      state.products = [];
      state.variants = [];
      renderAuthState();
      renderOrders();
      renderProducts();
      renderVariants();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAuthState();
    fillProductForm(null);
    wireEvents();
    bootstrap();
  });
})();
