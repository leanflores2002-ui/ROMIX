import { formatCurrency, escapeHtml, todayISODate, showToast, setStatus } from '../utils.js';

export async function renderSalesView({ root, api }) {
  root.innerHTML = `
    <section class="module-box">
      <h4>Resumen de Ventas</h4>
      <div class="grid-3" id="sales-summary"></div>
    </section>

    <section class="module-box" style="margin-top: 14px;">
      <h4>Historial</h4>
      <div class="toolbar">
        <label>Desde <input id="sales-from" type="date" value="${todayISODate()}" /></label>
        <label>Hasta <input id="sales-to" type="date" value="${todayISODate()}" /></label>
        <button id="sales-filter-btn" class="secondary">Filtrar</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nro Venta</th>
              <th>Vendedor</th>
              <th>Pago</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="sales-body"></tbody>
        </table>
      </div>
    </section>

    <section class="module-box" style="margin-top: 14px;">
      <h4>Detalle de Venta</h4>
      <div id="sale-detail">Selecciona una venta para ver sus items.</div>
    </section>
  `;

  const summaryBox = root.querySelector('#sales-summary');
  const salesBody = root.querySelector('#sales-body');
  const detailBox = root.querySelector('#sale-detail');

  async function loadSummary() {
    const summary = await api.getSalesSummary();

    summaryBox.innerHTML = `
      <article class="module-box">
        <h5>Total del dia</h5>
        <strong>${formatCurrency(summary.dayTotal)}</strong>
      </article>
      <article class="module-box">
        <h5>Total ultima semana</h5>
        <strong>${formatCurrency(summary.weekTotal)}</strong>
      </article>
      <article class="module-box">
        <h5>Total del mes</h5>
        <strong>${formatCurrency(summary.monthTotal)}</strong>
      </article>
    `;
  }

  async function loadSales() {
    const from = root.querySelector('#sales-from').value;
    const to = root.querySelector('#sales-to').value;
    const rows = await api.getSales({ from, to });

    if (!rows.length) {
      salesBody.innerHTML = '<tr><td colspan="6">No hay ventas para el filtro indicado.</td></tr>';
      detailBox.textContent = 'No hay detalle para mostrar.';
      setStatus('Sin ventas para el rango seleccionado');
      return;
    }

    salesBody.innerHTML = rows
      .map(
        (sale) => `
          <tr>
            <td>${new Date(sale.created_at).toLocaleString('es-AR')}</td>
            <td>${escapeHtml(sale.sale_number)}</td>
            <td>${escapeHtml(sale.seller_name)}</td>
            <td>${escapeHtml(sale.payment_method)}</td>
            <td>${formatCurrency(sale.total)}</td>
            <td><button data-sale-id="${sale.id}" class="ghost">Ver detalle</button></td>
          </tr>
        `
      )
      .join('');

    setStatus(`Ventas encontradas: ${rows.length}`);
  }

  root.querySelector('#sales-filter-btn').addEventListener('click', async () => {
    try {
      await loadSales();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  salesBody.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-sale-id]');
    if (!button) {
      return;
    }

    try {
      const detail = await api.getSaleDetail(Number(button.dataset.saleId));
      detailBox.innerHTML = `
        <p><strong>Venta:</strong> ${escapeHtml(detail.sale_number)} | <strong>Total:</strong> ${formatCurrency(detail.total)}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Talle/Color</th>
                <th>Cant.</th>
                <th>P. Unit</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${detail.items
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.name)}</td>
                      <td>${escapeHtml(item.barcode)}</td>
                      <td>${escapeHtml(item.size || '-')} / ${escapeHtml(item.color || '-')}</td>
                      <td>${item.quantity}</td>
                      <td>${formatCurrency(item.unit_price)}</td>
                      <td>${formatCurrency(item.subtotal)}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  try {
    await Promise.all([loadSummary(), loadSales()]);
  } catch (error) {
    showToast(error.message, 'error');
  }
}
