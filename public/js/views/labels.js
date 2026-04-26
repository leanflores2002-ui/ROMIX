import { escapeHtml, formatCurrency, showToast, setStatus } from '../utils.js';
import { state } from '../state.js';

async function fetchBarcodeBlobUrl(barcode) {
  const response = await fetch(`/api/labels/barcode/${encodeURIComponent(barcode)}.png`, {
    headers: {
      Authorization: `Bearer ${state.token}`
    }
  });

  if (!response.ok) {
    throw new Error('No se pudo cargar codigo de barras.');
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function renderLabelsView({ root, api }) {
  root.innerHTML = `
    <section class="module-box">
      <h4>Etiquetas con Codigo de Barras</h4>
      <div class="toolbar">
        <label class="inline"><input id="generated-only" type="checkbox" checked /> Solo codigos generados automaticamente</label>
        <button id="load-label-products" class="secondary">Cargar productos</button>
        <button id="select-all-labels" class="ghost">Seleccionar todos</button>
        <button id="clear-all-labels" class="ghost">Limpiar</button>
        <button id="download-labels" class="warn">Descargar PDF</button>
        <button id="print-labels">Imprimir seleccion</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Producto</th>
              <th>Codigo</th>
              <th>Talle/Color</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody id="labels-products-body"></tbody>
        </table>
      </div>
    </section>

    <section class="module-box" style="margin-top: 14px;">
      <h4>Vista previa de etiquetas</h4>
      <div id="labels-preview" class="label-grid"></div>
    </section>
  `;

  const body = root.querySelector('#labels-products-body');
  const preview = root.querySelector('#labels-preview');
  const generatedOnlyInput = root.querySelector('#generated-only');

  let products = [];
  let selectedIds = new Set();
  const objectUrls = [];

  function cleanupObjectUrls() {
    while (objectUrls.length) {
      const url = objectUrls.pop();
      URL.revokeObjectURL(url);
    }
  }

  function renderTable() {
    if (!products.length) {
      body.innerHTML = '<tr><td colspan="5">No hay productos para etiquetas.</td></tr>';
      return;
    }

    body.innerHTML = products
      .map(
        (product) => `
          <tr>
            <td><input type="checkbox" data-id="${product.id}" ${selectedIds.has(product.id) ? 'checked' : ''} /></td>
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.barcode)}</td>
            <td>${escapeHtml(product.size || '-')} / ${escapeHtml(product.color || '-')}</td>
            <td>${formatCurrency(product.sale_price)}</td>
          </tr>
        `
      )
      .join('');
  }

  async function renderPreview() {
    cleanupObjectUrls();

    const selectedProducts = products.filter((product) => selectedIds.has(product.id));

    if (!selectedProducts.length) {
      preview.innerHTML = 'Selecciona productos para generar vista previa.';
      setStatus('Sin etiquetas seleccionadas');
      return;
    }

    const cards = [];
    for (const product of selectedProducts) {
      // Cargamos la imagen con token para proteger el endpoint.
      const barcodeUrl = await fetchBarcodeBlobUrl(product.barcode);
      objectUrls.push(barcodeUrl);

      cards.push(`
        <article class="label-card">
          <strong>${escapeHtml(product.name)}</strong>
          <p>${escapeHtml(product.size || '-')} / ${escapeHtml(product.color || '-')} - ${formatCurrency(product.sale_price)}</p>
          <img src="${barcodeUrl}" alt="Barcode ${escapeHtml(product.barcode)}" />
        </article>
      `);
    }

    preview.innerHTML = cards.join('');
    setStatus(`Etiquetas seleccionadas: ${selectedProducts.length}`);
  }

  async function loadProducts() {
    products = await api.getLabelProducts({ generatedOnly: generatedOnlyInput.checked ? '1' : '0' });
    selectedIds = new Set();
    renderTable();
    await renderPreview();
  }

  body.addEventListener('change', async (event) => {
    const checkbox = event.target.closest('input[type="checkbox"][data-id]');
    if (!checkbox) {
      return;
    }

    const id = Number(checkbox.dataset.id);
    if (checkbox.checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }

    try {
      await renderPreview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#load-label-products').addEventListener('click', async () => {
    try {
      await loadProducts();
      showToast('Productos para etiquetas cargados.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#select-all-labels').addEventListener('click', async () => {
    selectedIds = new Set(products.map((product) => product.id));
    renderTable();
    try {
      await renderPreview();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#clear-all-labels').addEventListener('click', async () => {
    selectedIds = new Set();
    renderTable();
    await renderPreview();
  });

  root.querySelector('#download-labels').addEventListener('click', async () => {
    try {
      const ids = [...selectedIds];
      if (!ids.length) {
        showToast('Selecciona al menos un producto.', 'error');
        return;
      }

      const response = await fetch(api.labelsPdfUrl(ids), {
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'No se pudo descargar el PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'etiquetas-productos.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      showToast('PDF generado correctamente.');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  root.querySelector('#print-labels').addEventListener('click', () => {
    const selectedProducts = products.filter((product) => selectedIds.has(product.id));
    if (!selectedProducts.length) {
      showToast('Selecciona etiquetas para imprimir.', 'error');
      return;
    }

    const html = preview.innerHTML;
    const win = window.open('', '_blank');
    if (!win) {
      showToast('No se pudo abrir la ventana de impresion.', 'error');
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>Etiquetas</title>
          <style>
            body { font-family: sans-serif; margin: 16px; }
            .label-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            .label-card { border: 1px dashed #bbb; padding: 8px; border-radius: 8px; }
            .label-card img { width: 100%; }
          </style>
        </head>
        <body>
          <div class="label-grid">${html}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  });

  await loadProducts();
}
