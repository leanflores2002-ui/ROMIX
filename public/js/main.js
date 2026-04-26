import { api } from './api.js';
import { state, setToken, clearSession } from './state.js';
import { showToast, setStatus } from './utils.js';
import { renderPosView } from './views/pos.js';
import { renderProductsView } from './views/products.js';
import { renderInventoryView } from './views/inventory.js';
import { renderSalesView } from './views/sales.js';
import { renderUsersView } from './views/users.js';
import { renderLabelsView } from './views/labels.js';

const loginSection = document.getElementById('login-section');
const mainSection = document.getElementById('main-section');
const loginForm = document.getElementById('login-form');
const userBadge = document.getElementById('user-badge');
const navMenu = document.getElementById('nav-menu');
const viewRoot = document.getElementById('view-root');
const viewTitle = document.getElementById('view-title');
const logoutBtn = document.getElementById('logout-btn');

const titles = {
  pos: 'Punto de Venta',
  products: 'Productos',
  inventory: 'Inventario',
  sales: 'Historial de Ventas',
  users: 'Usuarios',
  labels: 'Etiquetas'
};

let cleanups = [];

function registerCleanup(fn) {
  cleanups.push(fn);
}

function runCleanup() {
  cleanups.forEach((fn) => {
    try {
      fn();
    } catch (_) {
      // ignore cleanup errors
    }
  });
  cleanups = [];
}

function applyRoleVisibility() {
  if (state.user?.role !== 'admin') {
    const usersBtn = navMenu.querySelector('button[data-view="users"]');
    if (usersBtn) {
      usersBtn.classList.add('hidden');
    }
  }
}

async function renderCurrentView() {
  runCleanup();

  const context = {
    root: viewRoot,
    state,
    api,
    registerCleanup
  };

  try {
    if (state.activeView === 'pos') {
      renderPosView(context);
    }

    if (state.activeView === 'products') {
      await renderProductsView(context);
    }

    if (state.activeView === 'inventory') {
      await renderInventoryView(context);
    }

    if (state.activeView === 'sales') {
      await renderSalesView(context);
    }

    if (state.activeView === 'users') {
      await renderUsersView(context);
    }

    if (state.activeView === 'labels') {
      await renderLabelsView(context);
    }
  } catch (error) {
    showToast(error.message || 'No se pudo renderizar la vista.', 'error');
    setStatus('Error de renderizado');
  }
}

function setActiveView(view) {
  state.activeView = view;
  viewTitle.textContent = titles[view] || 'Romix POS';

  navMenu.querySelectorAll('button[data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  renderCurrentView();
}

function showMainApp() {
  loginSection.classList.add('hidden');
  mainSection.classList.remove('hidden');

  userBadge.textContent = `${state.user.fullName} (${state.user.role})`;
  applyRoleVisibility();
  setActiveView(state.activeView || 'pos');
}

function showLogin() {
  runCleanup();
  mainSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  loginForm.reset();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);

  try {
    const data = await api.login({
      username: String(formData.get('username') || '').trim(),
      password: String(formData.get('password') || '')
    });

    setToken(data.token);
    state.user = data.user;
    state.activeView = 'pos';

    showToast('Sesion iniciada correctamente.');
    showMainApp();
  } catch (error) {
    showToast(error.message || 'No se pudo iniciar sesion.', 'error');
  }
});

navMenu.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-view]');
  if (!button) {
    return;
  }

  const view = button.dataset.view;
  setActiveView(view);
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  showToast('Sesion cerrada.');
  showLogin();
});

async function bootstrap() {
  if (!state.token) {
    showLogin();
    return;
  }

  try {
    const data = await api.me();
    state.user = data.user;
    showMainApp();
  } catch (error) {
    clearSession();
    showLogin();
  }
}

bootstrap();
