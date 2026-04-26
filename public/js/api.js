import { state } from './state.js';

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  const out = query.toString();
  return out ? `?${out}` : '';
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(data?.message || 'Error de servidor');
  }

  return data;
}

export const api = {
  login(payload) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  me() {
    return request('/api/auth/me');
  },
  getCategories() {
    return request('/api/categories');
  },
  createCategory(payload) {
    return request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getProducts(filters) {
    return request(`/api/products${buildQuery(filters)}`);
  },
  getProductByBarcode(barcode) {
    return request(`/api/products/barcode/${encodeURIComponent(barcode)}`);
  },
  createProduct(payload) {
    return request('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateProduct(id, payload) {
    return request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deactivateProduct(id) {
    return request(`/api/products/${id}/deactivate`, {
      method: 'PATCH'
    });
  },
  createSale(payload) {
    return request('/api/sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getSales(filters) {
    return request(`/api/sales${buildQuery(filters)}`);
  },
  getSalesSummary() {
    return request('/api/sales/summary');
  },
  getSaleDetail(id) {
    return request(`/api/sales/${id}`);
  },
  getMovements(filters) {
    return request(`/api/inventory/movements${buildQuery(filters)}`);
  },
  addStockEntry(payload) {
    return request('/api/inventory/entries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  addStockExit(payload) {
    return request('/api/inventory/exits', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  getUsers() {
    return request('/api/users');
  },
  createUser(payload) {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateUser(id, payload) {
    return request(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  getLabelProducts(params) {
    return request(`/api/labels/products${buildQuery(params)}`);
  },
  labelsPdfUrl(productIds) {
    const params = new URLSearchParams();
    params.set('productIds', productIds.join(','));
    return `/api/labels/pdf?${params.toString()}`;
  },
  barcodeImageUrl(barcode) {
    return `/api/labels/barcode/${encodeURIComponent(barcode)}.png`;
  }
};
