import { formatCurrency, escapeHtml, debounce, showToast, setStatus } from '../utils.js';

export async function renderProductsView({ root, state, api }) {
  const isAdmin = state.user?.role === 'admin';

  if (!state.categories.length) {
    state.categories = await api.getCategories();
  }

  root.innerHTML = `
    <div class="grid-2">
      <section class="module-box">
        <h4>Listado de Productos</h4>
        <div class="toolbar">
          <input id="product-search" placeholder="Buscar por nombre o codigo" />
          <select id="product-filter-category">
            <option value="">Todas las categorias</option>
            ${state.categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')}
          </select>
          <label class="inline">
            <input id="low-stock-only" type="checkbox" />
            Bajo stock
          </label>
          ${isAdmin ? '<label class="inline"><input id="show-inactive" type="checkbox" /> Incluir inactivos</label>' : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Talle/Color</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                ${isAdmin ? '<th>Acciones</th>' : ''}
              </tr>
            </thead>
            <tbody id="products-body"></tbody>
          </table>
        </div>
      </section>

      <section class="module-box ${isAdmin ? '' : 'hidden'}">
        <h4>Crear / Editar Producto</h4>
        <form id="product-form" class="form-grid">
          <input type="hidden" id="product-id" />
          <label>Codigo de barras (opcional, se genera automatico)
            <input id="product-barcode" />
          </label>
          <label>Nombre
            <input id="product-name" required />
          </label>
          <label>Categoria
            <select id="product-category">
              <option value="">Sin categoria</option>
              ${state.categories.map((cat) => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join('')}
            </select>
          </label>
          <div class="grid-2">
            <label>Talle
              <input id="product-size" placeholder="S, M, L, 42" />
            </label>
            <label>Color
              <input id="product-color" placeholder="Negro, Azul..." />
            </label>
          </div>
          <div class="grid-2">
            <label>Precio de venta
              <input id="product-sale-price" type="number" min="0" step="0.01" required />
            </label>
            <label>Precio de costo (opcional)
              <input id="product-cost-price" type="number" min="0" step="0.01" />
            </label>
          </div>
          <div class="grid-2">
            <label>Stock actual
              <input id="product-stock" type="number" min="0" step="1" required />
            </label>
            <label>Stock minimo
              <input id="product-stock-min" type="number" min="0" step="1" required />
            </label>
          </div>
          <label>Imagen URL (opcional)
            <input id="product-image" />
          </label>
          <div class="row-actions">
            <button type="submit" id="save-product-btn">Guardar</button>
            <button type="button" id="reset-product-btn" class="secondary">Nuevo</button>
          </div>
        </form>

        <hr />
        <form id="category-form" class="toolbar">
          <input id="category-name" placeholder="Nueva categoria" />
          <button type="submit" class="ghost">Agregar categoria</button>
        </form>
      </section>
    </div>
  `;

  const productsBody = root.querySelector('#products-body');
  const searchInput = root.querySelector('#product-search');
  const categoryFilter = root.querySelector('#product-filter-category');
  const lowStockOnly = root.querySelector('#low-stock-only');
  const showInactive = root.querySelector('#show-inactive');

  async function loadProducts() {
    const filters = {
      search: searchInput.value,
      categoryId: categoryFilter.value,
      lowStock: lowStockOnly.checked ? '1' : '',
      includeInactive: showInactive?.checked ? '1' : ''
    };

    const rows = await api.getProducts(filters);
    state.productsCache = rows;

    if (!rows.length) {
      productsBody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}">Sin resultados.</td></tr>`;
      return;
    }

    productsBody.innerHTML = rows
      .map((product) => {
        const lowBadge = product.stock <= product.stock_min ? '<span class="badge warn">Bajo</span>' : '<span class="badge">OK</span>';
        const stateBadge = product.active ? '<span class="badge">Activo</span>' : '<span class="badge danger">Inactivo</span>';

        return `
          <tr>
            <td>${escapeHtml(product.barcode)}</td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category_name || '-')}</td>
            <td>${escapeHtml(product.size || '-')} / ${escapeHtml(product.color || '-')}</td>
            <td>${formatCurrency(product.sale_price)}</td>
            <td>${product.stock} (min ${product.stock_min}) ${lowBadge}</td>
            <td>${stateBadge}</td>
            ${
              isAdmin
                ? `<td>
                    <div class="row-actions">
                      <button type="button" class="ghost" data-action="edit" data-id="${product.id}">Editar</button>
                      <button type="button" class="danger" data-action="deactivate" data-id="${product.id}">Desactivar</button>
                    </div>
                  </td>`
                : ''
            }
          </tr>
        `;
      })
      .join('');

    setStatus(`Productos cargados: ${rows.length}`);
  }

  const debouncedLoad = debounce(() => {
    loadProducts().catch((error) => {
      showToast(error.message, 'error');
    });
  }, 300);

  searchInput.addEventListener('input', debouncedLoad);
  categoryFilter.addEventListener('change', () => loadProducts());
  lowStockOnly.addEventListener('change', () => loadProducts());
  showInactive?.addEventListener('change', () => loadProducts());

  if (isAdmin) {
    const productForm = root.querySelector('#product-form');
    const productId = root.querySelector('#product-id');
    const barcode = root.querySelector('#product-barcode');
    const name = root.querySelector('#product-name');
    const category = root.querySelector('#product-category');
    const size = root.querySelector('#product-size');
    const color = root.querySelector('#product-color');
    const salePrice = root.querySelector('#product-sale-price');
    const costPrice = root.querySelector('#product-cost-price');
    const stock = root.querySelector('#product-stock');
    const stockMin = root.querySelector('#product-stock-min');
    const image = root.querySelector('#product-image');
    const resetBtn = root.querySelector('#reset-product-btn');
    const categoryForm = root.querySelector('#category-form');
    const categoryName = root.querySelector('#category-name');

    function resetForm() {
      productForm.reset();
      productId.value = '';
    }

    resetBtn.addEventListener('click', resetForm);

    productForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const payload = {
        barcode: barcode.value.trim(),
        name: name.value.trim(),
        categoryId: category.value ? Number(category.value) : null,
        size: size.value.trim(),
        color: color.value.trim(),
        salePrice: Number(salePrice.value),
        costPrice: costPrice.value ? Number(costPrice.value) : null,
        stock: Number(stock.value),
        stockMin: Number(stockMin.value),
        imageUrl: image.value.trim() || null
      };

      try {
        if (productId.value) {
          await api.updateProduct(productId.value, payload);
          showToast('Producto actualizado.');
        } else {
          await api.createProduct(payload);
          showToast('Producto creado.');
        }

        resetForm();
        await loadProducts();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });

    productsBody.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      const id = Number(button.dataset.id);
      const product = state.productsCache.find((row) => row.id === id);
      if (!product) {
        return;
      }

      if (button.dataset.action === 'edit') {
        productId.value = product.id;
        barcode.value = product.barcode;
        name.value = product.name;
        category.value = product.category_id || '';
        size.value = product.size || '';
        color.value = product.color || '';
        salePrice.value = product.sale_price;
        costPrice.value = product.cost_price ?? '';
        stock.value = product.stock;
        stockMin.value = product.stock_min;
        image.value = product.image_url || '';
        setStatus(`Editando producto #${product.id}`);
      }

      if (button.dataset.action === 'deactivate') {
        if (!window.confirm(`Desactivar ${product.name}?`)) {
          return;
        }

        try {
          await api.deactivateProduct(product.id);
          showToast('Producto desactivado.');
          await loadProducts();
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });

    categoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!categoryName.value.trim()) {
        return;
      }

      try {
        await api.createCategory({ name: categoryName.value.trim() });
        state.categories = await api.getCategories();
        showToast('Categoria creada.');
        await renderProductsView({ root, state, api });
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  await loadProducts();
}
