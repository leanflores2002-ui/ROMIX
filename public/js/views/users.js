import { escapeHtml, showToast, setStatus } from '../utils.js';

export async function renderUsersView({ root, state, api }) {
  if (state.user?.role !== 'admin') {
    root.innerHTML = `
      <section class="module-box">
        <h4>Usuarios</h4>
        <p>Solo el administrador puede gestionar usuarios.</p>
      </section>
    `;
    setStatus('Sin permisos para gestionar usuarios');
    return;
  }

  root.innerHTML = `
    <div class="grid-2">
      <section class="module-box">
        <h4>Usuarios del Sistema</h4>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="users-body"></tbody>
          </table>
        </div>
      </section>

      <section class="module-box">
        <h4>Alta / Edicion</h4>
        <form id="user-form" class="form-grid">
          <input id="user-id" type="hidden" />
          <label>Username
            <input id="user-username" required />
          </label>
          <label>Nombre completo
            <input id="user-fullname" required />
          </label>
          <label>Rol
            <select id="user-role" required>
              <option value="seller">Vendedor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label>Password
            <input id="user-password" type="password" placeholder="Requerido para nuevos" />
          </label>
          <label class="inline">
            <input id="user-active" type="checkbox" checked /> Activo
          </label>
          <div class="row-actions">
            <button type="submit">Guardar</button>
            <button type="button" id="reset-user-btn" class="secondary">Nuevo</button>
          </div>
        </form>
      </section>
    </div>
  `;

  const usersBody = root.querySelector('#users-body');
  const form = root.querySelector('#user-form');
  const userIdInput = root.querySelector('#user-id');
  const usernameInput = root.querySelector('#user-username');
  const fullnameInput = root.querySelector('#user-fullname');
  const roleInput = root.querySelector('#user-role');
  const passwordInput = root.querySelector('#user-password');
  const activeInput = root.querySelector('#user-active');
  const resetBtn = root.querySelector('#reset-user-btn');

  let cache = [];

  function resetForm() {
    form.reset();
    userIdInput.value = '';
    usernameInput.disabled = false;
    activeInput.checked = true;
  }

  async function loadUsers() {
    cache = await api.getUsers();

    usersBody.innerHTML = cache
      .map(
        (user) => `
          <tr>
            <td>${escapeHtml(user.username)}</td>
            <td>${escapeHtml(user.full_name)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td>${user.active ? '<span class="badge">Activo</span>' : '<span class="badge danger">Inactivo</span>'}</td>
            <td><button type="button" class="ghost" data-id="${user.id}">Editar</button></td>
          </tr>
        `
      )
      .join('');

    setStatus(`Usuarios cargados: ${cache.length}`);
  }

  usersBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) {
      return;
    }

    const user = cache.find((entry) => entry.id === Number(button.dataset.id));
    if (!user) {
      return;
    }

    userIdInput.value = user.id;
    usernameInput.value = user.username;
    usernameInput.disabled = true;
    fullnameInput.value = user.full_name;
    roleInput.value = user.role;
    passwordInput.value = '';
    activeInput.checked = Boolean(user.active);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      if (userIdInput.value) {
        await api.updateUser(userIdInput.value, {
          fullName: fullnameInput.value.trim(),
          role: roleInput.value,
          active: activeInput.checked,
          password: passwordInput.value ? passwordInput.value : undefined
        });
        showToast('Usuario actualizado.');
      } else {
        if (!passwordInput.value) {
          showToast('Debes definir password para un usuario nuevo.', 'error');
          return;
        }

        await api.createUser({
          username: usernameInput.value.trim(),
          fullName: fullnameInput.value.trim(),
          role: roleInput.value,
          password: passwordInput.value
        });
        showToast('Usuario creado.');
      }

      resetForm();
      await loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  resetBtn.addEventListener('click', resetForm);

  await loadUsers();
}
