export const state = {
  token: localStorage.getItem('pos_token') || '',
  user: null,
  activeView: 'pos',
  categories: [],
  productsCache: [],
  cart: [],
  lastSale: null
};

export function setToken(token) {
  state.token = token;
  if (token) {
    localStorage.setItem('pos_token', token);
  } else {
    localStorage.removeItem('pos_token');
  }
}

export function clearSession() {
  state.token = '';
  state.user = null;
  state.cart = [];
  state.lastSale = null;
  localStorage.removeItem('pos_token');
}
