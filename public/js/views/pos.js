import { formatCurrency, escapeHtml, showToast, setStatus } from '../utils.js';

export function renderPosView({ root, state, api, registerCleanup }) {
  root.innerHTML = `
    <div class="grid-2">
      <section class="module-box">
        <h4>Escaneo y Carrito</h4>
        <form id="scan-form" class="toolbar">
          <input id="scan-input" placeholder="Escanear o escribir codigo de barras" autofocus />
          <button type="submit">Agregar</button>
          <button id="clear-cart-btn" type="button" class="secondary">Vaciar carrito</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talle/Color</th>
                <th>Precio</th>
                <th>Cant.</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="cart-body"></tbody>
          </table>
        </div>

        <div class="cart-summary">
          <div>
            <strong>Total:</strong>
            <span id="cart-total">${formatCurrency(0)}</span>
          </div>
          <div class="row-actions">
            <select id="payment-method">
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
            <button id="confirm-sale-btn" type="button">Confirmar venta</button>
          </div>
        </div>
      </section>

      <section class="module-box">
        <h4>Comprobante</h4>
        <div id="receipt-box">Aun no hay ventas registradas en esta sesion.</div>
      </section>
    </div>
  `;

  const scanForm = root.querySelector('#scan-form');
  const scanInput = root.querySelector('#scan-input');
  const cartBody = root.querySelector('#cart-body');
  const cartTotal = root.querySelector('#cart-total');
  const paymentMethod = root.querySelector('#payment-method');
  const confirmSaleBtn = root.querySelector('#confirm-sale-btn');
  const clearCartBtn = root.querySelector('#clear-cart-btn');
  const receiptBox = root.querySelector('#receipt-box');

  function calcTotal() {
    return state.cart.reduce((acc, item) => acc + item.quantity * item.sale_price, 0);
  }

  function renderReceipt() {
    if (!state.lastSale) {
      receiptBox.innerHTML = 'Aun no hay ventas registradas en esta sesion.';
      return;
    }

    const itemsHtml = state.lastSale.items
      .map((item) => {
        const line = item.subtotal ?? item.quantity * item.unitPrice;
        return `<li>${escapeHtml(item.productName)} x${item.quantity} - ${formatCurrency(line)}</li>`;
      })
      .join('');

    receiptBox.innerHTML = `
      <div class="receipt">
        <p><strong>Comprobante:</strong> ${escapeHtml(state.lastSale.saleNumber)}</p>
        <p><strong>Total:</strong> ${formatCurrency(state.lastSale.total)}</p>
        <p><strong>Pago:</strong> ${escapeHtml(state.lastSale.paymentMethod)}</p>
        <ul>${itemsHtml}</ul>
        <button id="print-receipt-btn" class="ghost">Imprimir comprobante</button>
      </div>
    `;

    const printBtn = receiptBox.querySelector('#print-receipt-btn');
    printBtn?.addEventListener('click', () => {
      const printable = `
        <html>
          <head><title>Comprobante ${state.lastSale.saleNumber}</title></head>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>Romix POS</h2>
            <p>Comprobante: ${state.lastSale.saleNumber}</p>
            <p>Total: ${formatCurrency(state.lastSale.total)}</p>
            <p>Pago: ${state.lastSale.paymentMethod}</p>
            <ul>${itemsHtml}</ul>
          </body>
        </html>
      `;
      const win = window.open('', '_blank');
      if (!win) {
        showToast('No se pudo abrir la ventana de impresion.', 'error');
        return;
      }
      win.document.write(printable);
      win.document.close();
      win.focus();
      win.print();
    });
  }

  function renderCart() {
    if (!state.cart.length) {
      cartBody.innerHTML = `<tr><td colspan="6">Carrito vacio.</td></tr>`;
      cartTotal.textContent = formatCurrency(0);
      return;
    }

    cartBody.innerHTML = state.cart
      .map(
        (item) => `
          <tr data-id="${item.id}">
            <td>${escapeHtml(item.name)}<br /><small>${escapeHtml(item.barcode)}</small></td>
            <td>${escapeHtml(item.size || '-')} / ${escapeHtml(item.color || '-')}<br /><small>Stock: ${item.stock}</small></td>
            <td>${formatCurrency(item.sale_price)}</td>
            <td>
              <div class="row-actions">
                <button data-action="dec" data-id="${item.id}" type="button" class="secondary">-</button>
                <span>${item.quantity}</span>
                <button data-action="inc" data-id="${item.id}" type="button" class="secondary">+</button>
              </div>
            </td>
            <td>${formatCurrency(item.quantity * item.sale_price)}</td>
            <td><button data-action="remove" data-id="${item.id}" type="button" class="danger">Quitar</button></td>
          </tr>
        `
      )
      .join('');

    cartTotal.textContent = formatCurrency(calcTotal());
  }

  function upsertCartItem(product) {
    const existing = state.cart.find((entry) => entry.id === product.id);
    if (existing) {
      if (existing.quantity + 1 > product.stock) {
        showToast('Sin stock disponible.', 'error');
        return;
      }
      existing.quantity += 1;
    } else {
      if (product.stock <= 0) {
        showToast('Sin stock disponible.', 'error');
        return;
      }
      state.cart.push({ ...product, quantity: 1 });
    }

    renderCart();
    setStatus(`Carrito: ${state.cart.length} item(s)`);
  }

  async function searchAndAddBarcode(barcode) {
    const code = String(barcode || '').trim();
    if (!code) {
      return;
    }

    try {
      const product = await api.getProductByBarcode(code);
      upsertCartItem(product);
      scanInput.value = '';
      scanInput.focus();
    } catch (error) {
      showToast(error.message || 'Producto no encontrado.', 'error');
      setStatus('Producto no encontrado');
      scanInput.select();
    }
  }

  scanForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await searchAndAddBarcode(scanInput.value);
  });

  cartBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const itemId = Number(button.dataset.id);
    const action = button.dataset.action;
    const item = state.cart.find((row) => row.id === itemId);
    if (!item) {
      return;
    }

    if (action === 'inc') {
      if (item.quantity + 1 > item.stock) {
        showToast('No puedes vender mas de lo disponible.', 'error');
        return;
      }
      item.quantity += 1;
    }

    if (action === 'dec') {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        state.cart = state.cart.filter((row) => row.id !== itemId);
      }
    }

    if (action === 'remove') {
      state.cart = state.cart.filter((row) => row.id !== itemId);
    }

    renderCart();
  });

  clearCartBtn.addEventListener('click', () => {
    state.cart = [];
    renderCart();
    scanInput.focus();
  });

  confirmSaleBtn.addEventListener('click', async () => {
    if (!state.cart.length) {
      showToast('El carrito esta vacio.', 'error');
      return;
    }

    try {
      confirmSaleBtn.disabled = true;

      const payload = {
        paymentMethod: paymentMethod.value,
        items: state.cart.map((item) => ({ productId: item.id, quantity: item.quantity }))
      };

      const sale = await api.createSale(payload);
      state.lastSale = sale;
      state.cart = [];

      showToast(`Venta ${sale.saleNumber} registrada`);
      setStatus(`Venta registrada: ${sale.saleNumber}`);

      renderCart();
      renderReceipt();
      scanInput.focus();
    } catch (error) {
      showToast(error.message || 'No se pudo registrar la venta.', 'error');
      setStatus('Error al registrar la venta');
    } finally {
      confirmSaleBtn.disabled = false;
    }
  });

  const focusInterval = window.setInterval(() => {
    const active = document.activeElement;
    // Mantiene el foco de escaneo, pero no lo roba si el usuario interactua con otro control.
    if (!active || active === document.body || active === scanInput) {
      scanInput.focus();
    }
  }, 800);

  scanInput.addEventListener('blur', () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        scanInput.focus();
      }
    }, 50);
  });

  registerCleanup(() => {
    window.clearInterval(focusInterval);
  });

  renderCart();
  renderReceipt();
  scanInput.focus();
}
