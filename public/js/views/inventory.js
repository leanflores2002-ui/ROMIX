import { formatCurrency, escapeHtml, showToast, todayISODate, setStatus } from '../utils.js';

export async function renderInventoryView({ root, state, api }) {
  const isAdmin = state.user?.role === 'admin';

  const [products, movements] = await Promise.all([
    api.getProducts({ includeInactive: '1' }),
    api.getMovements({ from: todayISODate() })
  ]);

  root.innerHTML = `
    <div class="grid-2">
      <section class="module-box">
        <h4>Stock y Bajo Stock</h4>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Categoria</th>
                <th>Stock</th>
                <th>Min.</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody id="low-stock-body"></tbody>
          </table>
        </div>
      </section>

      <section class="module-box ${isAdmin ? '' : 'hidden'}">
        <h4>Entradas / Salidas de Stock</h4>
        <div class="grid-2">
          <form id="entry-form" class="form-grid">
            <h5>Entrada</h5>
            <label>Producto
              <select id="entry-product" required>
                <option value="">Seleccionar</option>
                ${products
                  .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${escapeHtml(product.barcode)})</option>`)
                  .join('')}
              </select>
            </label>
            <label>Cantidad
              <input id="entry-qty" type="number" min="1" step="1" required />
            </label>
            <label>Nota
              <input id="entry-note" placeholder="Compra proveedor" />
            </label>
            <button type="submit">Registrar entrada</button>
          </form>

          <form id="exit-form" class="form-grid">
            <h5>Salida Manual</h5>
            <label>Producto
              <select id="exit-product" required>
                <option value="">Seleccionar</option>
                ${products
                  .map((product) => `<option value="${product.id}">${escapeHtml(product.name)} (${escapeHtml(product.barcode)})</option>`)
                  .join('')}
              </select>
            </label>
            <label>Cantidad
              <input id="exit-qty" type="number" min="1" step="1" required />
            </label>
            <label>Nota
              <input id="exit-note" placeholder="Merma, rotura, ajuste" />
            </label>
            <button type="submit" class="warn">Registrar salida</button>
          </form>
        </div>
      </section>
    </div>

    <section class="module-box" style="margin-top: 14px;">
      <h4>Historial de Movimientos de Stock</h4>
      <div class="toolbar">
        <label>Desde <input id="mov-from" type="date" value="${todayISODate()}" /></label>
        <label>Hasta <input id="mov-to" type="date" value="${todayISODate()}" /></label>
        <select id="mov-type">
          <option value="">Todos</option>
          <option value="sale">Venta</option>
          <option value="entry">Entrada</option>
          <option value="manual_exit">Salida manual</option>
          <option value="adjustment">Ajuste</option>
        </select>
        <button id="refresh-movements" class="secondary">Filtrar</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Nota</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody id="movements-body"></tbody>
        </table>
      </div>
    </section>
  `;

  const lowStockBody = root.querySelector('#low-stock-body');
  const movementsBody = root.querySelector('#movements-body');

  function renderLowStock() {
    const rows = [...products].sort((a, b) => a.stock - b.stock);
    lowStockBody.innerHTML = rows
      .map((product) => {
        const badge = product.stock <= product.stock_min ? '<span class="badge danger">Reponer</span>' : '<span class="badge">OK</span>';
        return `
          <tr>
            <td>${escapeHtml(product.barcode)}</td>
            <td>${escapeHtml(product.name)} ${badge}</td>
            <td>${escapeHtml(product.category_name || '-')}</td>
            <td>${product.stock}</td>
            <td>${product.stock_min}</td>
            <td>${formatCurrency(product.sale_price)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderMovements(data) {
    if (!data.length) {
      movementsBody.innerHTML = '<tr><td colspan="6">Sin movimientos.</td></tr>';
      return;
    }

    movementsBody.innerHTML = data
      .map(
        (movement) => `
          <tr>
            <td>${new Date(movement.created_at).toLocaleString('es-AR')}</td>
            <td>${escapeHtml(movement.product_name)}<br /><small>${escapeHtml(movement.barcode)}</small></td>
            <td>${escapeHtml(movement.movement_type)}</td>
            <td>${movement.quantity}</td>
            <td>${escapeHtml(movement.note || '-')}</td>
            <td>${escapeHtml(movement.user_name || '-')}</td>
          </tr>
        `
      )
      .join('');
  }

  async function refreshMovements() {
    const from = root.querySelector('#mov-from').value;
    const to = root.querySelector('#mov-to').value;
    const movementType = root.querySelector('#mov-type').value;
    const data = await api.getMovements({ from, to, movementType });
    renderMovements(data);
    setStatus(`Movimientos encontrados: ${data.length}`);
  }

  root.querySelector('#refresh-movements').addEventListener('click', async () => {
    try {
      await refreshMovements();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  if (isAdmin) {
    root.querySelector('#entry-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        productId: Number(root.querySelector('#entry-product').value),
        quantity: Number(root.querySelector('#entry-qty').value),
        note: root.querySelector('#entry-note').value.trim()
      };

      try {
        await api.addStockEntry(payload);
        showToast('Entrada de stock registrada.');
        await renderInventoryView({ root, state, api });
      } catch (error) {
        showToast(error.message, 'error');
      }
    });

    root.querySelector('#exit-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        productId: Number(root.querySelector('#exit-product').value),
        quantity: Number(root.querySelector('#exit-qty').value),
        note: root.querySelector('#exit-note').value.trim()
      };

      try {
        await api.addStockExit(payload);
        showToast('Salida de stock registrada.');
        await renderInventoryView({ root, state, api });
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  }

  renderLowStock();
  renderMovements(movements);
  setStatus(`Bajo stock: ${products.filter((p) => p.stock <= p.stock_min).length}`);
}
