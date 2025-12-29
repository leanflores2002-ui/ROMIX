(() => {
  const state = {
    user: null,
    dashboard: null,
    products: [],
    variants: [],
    orders: [],
  };

  const LOW_STOCK = 3;

  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function money(n) {
    return "$" + Number(n || 0).toLocaleString("es-AR");
  }

  function toast(msg, type = "info") {
    const box = qs("#toast");
    if (!box) return;
    box.textContent = msg || "";
    box.classList.remove("show");
    box.style.borderColor = type === "error" ? "var(--danger)" : "var(--border)";
    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => box.classList.remove("show"), 2400);
  }

  function showSection(id) {
    qsa(".admin-section").forEach((sec) => {
      sec.classList.toggle("hidden", sec.id !== id);
    });
    qsa(".nav-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.target === id);
    });
  }

  function setAuthenticated(user) {
    state.user = user || null;
    qs("#admin-user-label").textContent = user ? `Admin: ${user}` : "No conectado";
    const loginPanel = qs("#login-panel");
    loginPanel?.classList.toggle("hidden", !!user);
    qs(".admin-main")?.classList.toggle("showing-login", !user);
    qsa(".admin-section").forEach((sec) => sec.classList.toggle("hidden", !user && sec.id !== "login-panel"));
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    if (res.status === 401) {
      setAuthenticated(null);
      showSection("login-panel");
      throw new Error("No autorizado");
    }
    if (!res.ok) {
      let message = `Error ${res.status}`;
      try {
        const body = await res.json();
        message = body.detail || body.message || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function firstImage(product) {
    if (!product) return "../images/placeholder.jpg";
    if (product.image) return product.image;
    if (product.images && typeof product.images === "object") {
      const values = Object.values(product.images);
      if (values.length) return values[0];
    }
    if (Array.isArray(product.colors) && product.colors.length) {
      const img = product.colors[0].image;
      if (img) return img;
    }
    return "../images/placeholder.jpg";
  }

  function computeTotals(product) {
    const pid = product.id || (window.slugify ? window.slugify(product.name || "") : product.name);
    const variants = state.variants.filter((v) => String(v.product_id) === String(pid));
    const total = variants.reduce((acc, v) => acc + Number(v.stock || 0), 0);
    let status = "available";
    if (total <= 0) status = "out";
    else if (total <= LOW_STOCK) status = "low";
    return { total, status };
  }

  function badge(label, status) {
    const map = { available: "success", low: "warning", out: "danger", active: "success", inactive: "danger", pending: "warning", confirmed: "success", cancelled: "danger" };
    return `<span class="badge ${map[status] || "neutral"}">${label}</span>`;
  }

  function renderDashboard() {
    const wrap = qs("#dashboard-cards");
    if (!wrap || !state.dashboard) return;
    const d = state.dashboard;
    wrap.innerHTML = `
      <div class="kpi-card"><div class="kpi-title">Pendientes</div><div class="kpi-value">${d.pending_orders}</div></div>
      <div class="kpi-card"><div class="kpi-title">Confirmados</div><div class="kpi-value">${d.confirmed_orders}</div></div>
      <div class="kpi-card"><div class="kpi-title">Productos activos</div><div class="kpi-value">${d.active_products}</div></div>
      <div class="kpi-card"><div class="kpi-title">Stock bajo</div><div class="kpi-value">${d.low_stock_variants}</div></div>
    `;
  }

  function renderProducts() {
    const list = qs("#products-list");
    if (!list) return;
    const search = (qs("#products-search")?.value || "").toLowerCase();
    const section = qs("#products-section-filter")?.value || "";
    const type = qs("#products-type-filter")?.value || "";
    const filtered = state.products.filter((p) => {
      const matchesQ = !search || `${p.name} ${p.type} ${p.section}`.toLowerCase().includes(search);
      const matchesSection = !section || String(p.section || "").toLowerCase() === section;
      const matchesType = !type || String(p.type || "").toLowerCase() === type;
      return matchesQ && matchesSection && matchesType;
    });
    list.innerHTML = filtered
      .map((p) => {
        const pid = p.id || (window.slugify ? window.slugify(p.name || "") : p.name);
        const { total, status } = computeTotals(p);
        const statusLabel = status === "out" ? "Agotado" : status === "low" ? "Por agotarse" : "Disponible";
        const active = String(p.active ?? true) !== "false";
        return `
          <article class="product-row" data-id="${pid}">
            <div class="product-thumb"><img src="${firstImage(p)}" alt="${p.name || ""}" onerror="this.src='../images/placeholder.jpg'"></div>
            <div class="product-info">
              <div class="title">${p.name || ""}</div>
              <div class="meta">${(p.section || "").toString().toUpperCase()} • ${p.type || ""}</div>
              <div class="price">${money(p.price)}</div>
              <div class="meta">${badge(statusLabel, status)} ${badge(active ? "Activo" : "Inactivo", active ? "active" : "inactive")}</div>
            </div>
            <div class="product-actions">
              <button class="btn ghost" data-action="edit">Editar</button>
              <button class="btn ghost" data-action="duplicate">Duplicar</button>
              <button class="btn ${active ? "danger" : "primary"}" data-action="toggle">${active ? "Desactivar" : "Activar"}</button>
            </div>
          </article>
        `;
      })
      .join("");
    list.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".product-row");
        const id = card?.dataset.id;
        const product = state.products.find((p) => String(p.id || p.name) === String(id));
        if (!product) return;
        const action = btn.dataset.action;
        if (action === "edit") openProductForm(product);
        if (action === "duplicate") openProductForm({ ...product, id: `${product.id || ""}-copy` });
        if (action === "toggle") toggleProductActive(product);
      });
    });
  }

  function renderTypesFilter() {
    const select = qs("#products-type-filter");
    if (!select) return;
    const types = Array.from(new Set(state.products.map((p) => String(p.type || "").toLowerCase()).filter(Boolean)));
    select.innerHTML = `<option value="">Tipo</option>${types.map((t) => `<option value="${t}">${t}</option>`).join("")}`;
  }

  function renderStock() {
    const tableWrap = qs("#stock-table");
    if (!tableWrap) return;
    const rows = state.products.map((p) => {
      const pid = p.id || (window.slugify ? window.slugify(p.name || "") : p.name);
      const { total, status } = computeTotals(p);
      const label = status === "out" ? "Agotado" : status === "low" ? "Por agotarse" : "Disponible";
      return `
        <tr data-id="${pid}">
          <td><div class="product-thumb" style="width:56px;height:56px;"><img src="${firstImage(p)}" alt="${p.name || ""}" onerror="this.src='../images/placeholder.jpg'"></div></td>
          <td>${p.name || ""}</td>
          <td class="muted">${p.section || ""}</td>
          <td>${total}</td>
          <td>${badge(label, status === "out" ? "danger" : status === "low" ? "warning" : "success")}</td>
          <td><button class="btn ghost" data-action="edit-stock">Editar</button></td>
        </tr>
      `;
    });
    tableWrap.innerHTML = `
      <table>
        <thead><tr><th></th><th>Producto</th><th>Sección</th><th>Cantidad</th><th>Estado</th><th></th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    `;
    tableWrap.querySelectorAll("[data-action='edit-stock']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest("tr");
        const product = state.products.find((p) => String(p.id || p.name) === String(row?.dataset.id));
        if (product) openStockEditor(product);
      });
    });
  }

  function renderOrders() {
    const table = qs("#orders-table");
    if (!table) return;
    const search = (qs("#orders-search")?.value || "").toLowerCase();
    const statusFilter = qs("#orders-status-filter")?.value || "";
    const filtered = state.orders.filter((o) => {
      const matchesQ =
        !search ||
        `${o.customer_name || ""} ${o.whatsapp || ""} ${o.id || ""}`.toLowerCase().includes(search);
      const matchesStatus = !statusFilter || String(o.status || "").toLowerCase() === statusFilter;
      return matchesQ && matchesStatus;
    });
    const rows = filtered
      .map((o) => {
        const created = o.created_at ? new Date(o.created_at * 1000) : null;
        const date = created ? created.toLocaleString("es-AR") : "-";
        const itemsCount = (o.items || []).reduce((acc, it) => acc + Number(it.qty || 0), 0);
        return `
          <tr data-id="${o.id}">
            <td>${o.id}</td>
            <td>${o.customer_name || "Sin nombre"}<div class="muted">${o.whatsapp || ""}</div></td>
            <td>${itemsCount}</td>
            <td>${date}</td>
            <td>${badge((o.status || "").toUpperCase(), o.status)}</td>
            <td>
              <div class="inline-actions">
                <button class="btn primary" data-action="confirm" ${o.status === "confirmed" ? "disabled" : ""}>Confirmar</button>
                <button class="btn danger" data-action="cancel" ${o.status === "cancelled" ? "disabled" : ""}>Cancelar</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
    table.innerHTML = `
      <table>
        <thead><tr><th>ID</th><th>Cliente</th><th>Items</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
        <tbody>${rows || "<tr><td colspan='6' class='muted'>Sin pedidos</td></tr>"}</tbody>
      </table>
    `;
    table.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        if (!row) return;
        const id = row.dataset.id;
        const status = btn.dataset.action === "confirm" ? "confirmed" : "cancelled";
        try {
          await fetchJson(`/api/admin/orders/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          });
          toast("Pedido actualizado");
          await loadOrders();
          await loadDashboard();
          await loadStock();
        } catch (err) {
          toast(err.message || "No se pudo actualizar", "error");
        }
      });
    });
  }

  function openModal(title, bodyHtml) {
    const modal = qs("#modal-backdrop");
    if (!modal) return;
    qs("#modal-title").textContent = title || "Editar";
    qs("#modal-body").innerHTML = bodyHtml || "";
    modal.classList.remove("hidden");
  }
  function closeModal() {
    const modal = qs("#modal-backdrop");
    if (modal) modal.classList.add("hidden");
  }

  function addColorRow(container, color = {}) {
    const row = document.createElement("div");
    row.className = "inline-actions";
    row.innerHTML = `
      <input type="text" name="color-name" placeholder="Color" value="${color.name || ""}">
      <input type="text" name="color-image" placeholder="URL imagen" value="${color.image || ""}" style="min-width:220px;">
      <button type="button" class="btn ghost" data-remove-row><i class="fas fa-times"></i></button>
    `;
    row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
    container.appendChild(row);
  }

  function addVariantRow(container, variant = {}) {
    const row = document.createElement("div");
    row.className = "inline-actions";
    row.innerHTML = `
      <input type="hidden" name="variant-id" value="${variant.id || variant.variant_id || ""}">
      <input class="small-input" type="text" name="variant-color" placeholder="Color" value="${variant.color || ""}">
      <input class="small-input" type="text" name="variant-size" placeholder="Talle" value="${variant.size || ""}">
      <input class="small-input" type="number" min="0" name="variant-stock" placeholder="Stock" value="${variant.stock ?? 0}">
      <input type="text" name="variant-image" placeholder="URL imagen" value="${variant.image || ""}" style="min-width:220px;">
      <button type="button" class="btn ghost" data-remove-row><i class="fas fa-times"></i></button>
    `;
    row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
    container.appendChild(row);
  }

  function openProductForm(product = {}) {
    const base = { ...product };
    const colors = (base.colors || []).map((c) => ({
      name: c.name || "",
      image: (base.images && base.images[c.name]) || c.image || "",
    }));
    const variants = base.variants || [];
    const sizes = Array.isArray(base.sizes) ? base.sizes.map((s) => s.size || s) : [];
    const section = (base.section || "").toLowerCase();

    const formHtml = `
      <form id="product-form">
        <div class="form-grid">
          <label>Nombre<input name="name" value="${base.name || ""}" required></label>
          <label>Sección<input name="section" value="${section || ""}" placeholder="mujer/hombre/ninos"></label>
          <label>Tipo<input name="type" value="${base.type || ""}" placeholder="calza, remera..."></label>
          <label>Precio<input name="price" type="number" min="0" step="1" value="${base.price || 0}"></label>
          <label>Badge<input name="badge" value="${base.badge || ""}" placeholder="Novedad, Oferta"></label>
          <label>Imagen principal<input name="image" value="${base.image || ""}" placeholder="URL imagen"></label>
          <label>Descripción<textarea name="description">${base.description || ""}</textarea></label>
          <label>Talles (coma separados)<input name="sizes" value="${sizes.join(", ")}" placeholder="1,2,3"></label>
          <label class="inline-actions" style="align-items:center;gap:10px;">
            <input type="checkbox" name="active" ${String(base.active ?? true) !== "false" ? "checked" : ""}> <span>Activo</span>
          </label>
        </div>
        <div class="row-group">
          <div class="inline-actions" style="justify-content: space-between;">
            <h4>Colores / imágenes</h4>
            <button type="button" class="btn ghost" id="add-color-btn"><i class="fas fa-plus"></i> Color</button>
          </div>
          <div id="color-rows"></div>
        </div>
        <div class="row-group">
          <div class="inline-actions" style="justify-content: space-between;">
            <h4>Variantes</h4>
            <button type="button" class="btn ghost" id="add-variant-btn"><i class="fas fa-plus"></i> Variante</button>
          </div>
          <div id="variant-rows"></div>
        </div>
        <div class="inline-actions" style="justify-content:flex-end;">
          <button type="button" class="btn ghost" id="cancel-product">Cancelar</button>
          <button type="submit" class="btn primary">Guardar</button>
        </div>
      </form>
    `;
    openModal(base.id ? "Editar producto" : "Nuevo producto", formHtml);
    const colorRows = qs("#color-rows");
    const variantRows = qs("#variant-rows");
    colors.forEach((c) => addColorRow(colorRows, c));
    if (!colors.length) addColorRow(colorRows, {});
    variants.forEach((v) => addVariantRow(variantRows, v));
    if (!variants.length) addVariantRow(variantRows, {});

    qs("#add-color-btn")?.addEventListener("click", () => addColorRow(colorRows, {}));
    qs("#add-variant-btn")?.addEventListener("click", () => addVariantRow(variantRows, {}));
    qs("#cancel-product")?.addEventListener("click", closeModal);

    qs("#product-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const next = { ...base };
      next.name = data.get("name") || "";
      next.section = (data.get("section") || "").toString().toLowerCase();
      next.type = data.get("type") || "";
      const price = Number(data.get("price") || 0);
      next.price = price;
      next.priceByGroup = next.priceByGroup || { common: price };
      next.badge = data.get("badge") || null;
      next.description = data.get("description") || "";
      next.image = data.get("image") || next.image || "";
      next.active = form.querySelector("input[name='active']")?.checked ?? true;
      const sizesRaw = (data.get("sizes") || "").toString().split(",").map((s) => s.trim()).filter(Boolean);
      next.sizes = sizesRaw.map((s) => ({ size: s, status: "available" }));

      const colorEntries = Array.from(colorRows.querySelectorAll(".inline-actions")).map((row) => {
        return {
          name: row.querySelector("input[name='color-name']")?.value || "",
          image: row.querySelector("input[name='color-image']")?.value || "",
        };
      }).filter((c) => c.name);
      next.colors = colorEntries.map((c) => ({ name: c.name }));
      next.images = {};
      colorEntries.forEach((c) => { if (c.image) next.images[c.name] = c.image; });

      const variantsPayload = Array.from(variantRows.querySelectorAll(".inline-actions")).map((row) => {
        return {
          id: row.querySelector("input[name='variant-id']")?.value || "",
          product_id: next.id || "",
          color: row.querySelector("input[name='variant-color']")?.value || "",
          size: row.querySelector("input[name='variant-size']")?.value || "",
          stock: Number(row.querySelector("input[name='variant-stock']")?.value || 0),
          image: row.querySelector("input[name='variant-image']")?.value || "",
        };
      }).filter((v) => v.color && v.size);
      next.variants = variantsPayload;
      const slugFn = window.slugify || ((txt) => (txt || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "-"));
      next.id = next.id || slugFn(next.name);

      try {
        const method = base.id ? "PUT" : "POST";
        const url = base.id ? `/api/admin/products/${encodeURIComponent(base.id)}` : "/api/admin/products";
        await fetchJson(url, { method, body: JSON.stringify(next) });
        toast("Producto guardado");
        closeModal();
        await loadProducts();
        await loadStock();
      } catch (err) {
        toast(err.message || "Error al guardar", "error");
      }
    });
  }

  async function toggleProductActive(product) {
    const pid = product.id || (window.slugify ? window.slugify(product.name || "") : product.name);
    const current = String(product.active ?? true) !== "false";
    try {
      await fetchJson(`/api/admin/products/${encodeURIComponent(pid)}/active`, {
        method: "PATCH",
        body: JSON.stringify({ active: !current }),
      });
      toast("Estado actualizado");
      await loadProducts();
    } catch (err) {
      toast(err.message || "No se pudo actualizar", "error");
    }
  }

  function openStockEditor(product) {
    const pid = product.id || (window.slugify ? window.slugify(product.name || "") : product.name);
    const variants = state.variants.filter((v) => String(v.product_id) === String(pid));
    const body = `
      <div class="form-grid">
        <label>Producto<input value="${product.name || ""}" disabled></label>
        <label>Sección<input value="${product.section || ""}" disabled></label>
      </div>
      <div class="row-group">
        <h4>Variantes</h4>
        <div id="stock-rows"></div>
      </div>
      <div class="inline-actions" style="justify-content:flex-end;">
        <button class="btn ghost" id="close-stock">Cerrar</button>
        <button class="btn primary" id="save-stock">Guardar</button>
      </div>
    `;
    openModal("Editar stock", body);
    const container = qs("#stock-rows");
    variants.forEach((v) => {
      const row = document.createElement("div");
      row.className = "inline-actions";
      row.dataset.variantId = v.id;
      row.innerHTML = `
        <span class="tag">${v.color || ""} / ${v.size || ""}</span>
        <input class="small-input" type="number" min="0" value="${v.stock ?? 0}">
      `;
      container.appendChild(row);
    });
    qs("#close-stock")?.addEventListener("click", closeModal);
    qs("#save-stock")?.addEventListener("click", async () => {
      const updates = Array.from(container.querySelectorAll(".inline-actions")).map((row) => ({
        id: row.dataset.variantId,
        stock: Number(row.querySelector("input")?.value || 0),
      }));
      try {
        for (const up of updates) {
          await fetchJson(`/api/admin/variants/${encodeURIComponent(up.id)}/stock`, {
            method: "PATCH",
            body: JSON.stringify({ stock: up.stock }),
          });
        }
        toast("Stock actualizado");
        closeModal();
        await loadVariants();
        await loadStock();
      } catch (err) {
        toast(err.message || "No se pudo actualizar stock", "error");
      }
    });
  }

  async function loadDashboard() {
    try {
      state.dashboard = await fetchJson("/api/admin/dashboard");
      renderDashboard();
    } catch (err) {
      toast(err.message || "No se pudo cargar dashboard", "error");
    }
  }

  async function loadProducts() {
    const data = await fetchJson("/api/admin/products");
    state.products = data || [];
    state.variants = state.products.flatMap((p) => p.variants || []);
    renderTypesFilter();
    renderProducts();
    renderStock();
  }

  async function loadVariants() {
    state.variants = await fetchJson("/api/admin/variants");
  }

  async function loadStock() {
    renderStock();
  }

  async function loadOrders() {
    state.orders = await fetchJson("/api/admin/orders");
    renderOrders();
  }

  async function hydrate() {
    try {
      await loadDashboard();
      await loadProducts();
      await loadOrders();
    } catch (err) {
      toast(err.message || "Sesión requerida", "error");
      setAuthenticated(null);
      showSection("login-panel");
    }
  }

  function bindEvents() {
    qs("#modal-close")?.addEventListener("click", closeModal);
    qsa(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.target;
        if (target) showSection(target);
        if (target === "dashboard-section") loadDashboard();
        if (target === "orders-section") loadOrders();
      });
    });
    qs("#refresh-dashboard")?.addEventListener("click", loadDashboard);
    qs("#refresh-stock")?.addEventListener("click", async () => {
      await loadVariants();
      renderStock();
    });
    qs("#products-search")?.addEventListener("input", renderProducts);
    qs("#products-section-filter")?.addEventListener("change", renderProducts);
    qs("#products-type-filter")?.addEventListener("change", renderProducts);
    qs("#orders-search")?.addEventListener("input", renderOrders);
    qs("#orders-status-filter")?.addEventListener("change", renderOrders);
    qs("#new-product-btn")?.addEventListener("click", () => openProductForm({}));
    qs("#logout-btn")?.addEventListener("click", () => {
      // simple logout by clearing cookie in browser
      document.cookie = `${encodeURIComponent("romix_admin_token")}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      setAuthenticated(null);
      showSection("login-panel");
    });
    qs("#login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      try {
        const res = await fetchJson("/api/admin/login", {
          method: "POST",
          body: JSON.stringify({ username: data.get("username"), password: data.get("password") }),
        });
        setAuthenticated(res.user || "admin");
        toast("Ingreso correcto");
        showSection("dashboard-section");
        await hydrate();
      } catch (err) {
        toast(err.message || "Credenciales inválidas", "error");
      }
    });
  }

  function init() {
    bindEvents();
    showSection("dashboard-section");
    hydrate();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
