let token = localStorage.getItem('adminToken');

const money = (value) => `£${Number(value).toFixed(2)}`;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showAdmin(show) {
  document.querySelector('#loginPanel').hidden = show;
  document.querySelector('#adminPanel').hidden = !show;
  document.querySelector('#itemsPanel').hidden = !show;
}

async function login() {
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.querySelector('#username').value,
        password: document.querySelector('#password').value
      })
    });
    token = result.token;
    localStorage.setItem('adminToken', token);
    showAdmin(true);
    await loadAdmin();
  } catch (error) {
    document.querySelector('#loginMessage').textContent = error.message;
  }
}

async function loadAdmin() {
  const [stats, items] = await Promise.all([
    api('/api/admin/dashboard'),
    api('/api/admin/menu-items')
  ]);

  document.querySelector('#stats').textContent =
    `${stats.todaysOrders} orders · ${money(stats.todaysRevenue)} revenue · ${stats.activeOrders} active`;

  const container = document.querySelector('#items');
  container.innerHTML = '';
  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'card stack';
    card.innerHTML = `
      <div class="row">
        <strong>${item.name}</strong>
        <span>${money(item.price)}</span>
      </div>
      <p class="muted">${item.category || 'Uncategorised'} · Stock ${item.inventory.quantityAvailable}</p>
      <div class="row">
        <button class="secondary" data-toggle>${item.isAvailable ? 'Hide' : 'Show'}</button>
        <button class="danger" data-delete>Delete</button>
      </div>
    `;

    card.querySelector('[data-toggle]').addEventListener('click', async () => {
      await api(`/api/admin/menu-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...item,
          isAvailable: !item.isAvailable,
          quantityAvailable: item.inventory.quantityAvailable
        })
      });
      await loadAdmin();
    });

    card.querySelector('[data-delete]').addEventListener('click', async () => {
      await api(`/api/admin/menu-items/${item.id}`, { method: 'DELETE' });
      await loadAdmin();
    });

    container.appendChild(card);
  }
}

document.querySelector('#login').addEventListener('click', login);
document.querySelector('#logout').addEventListener('click', () => {
  localStorage.removeItem('adminToken');
  token = null;
  showAdmin(false);
});

document.querySelector('#itemForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await api('/api/admin/menu-items', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(form.entries()))
  });
  event.currentTarget.reset();
  await loadAdmin();
});

if (token) {
  showAdmin(true);
  loadAdmin().catch(() => {
    localStorage.removeItem('adminToken');
    token = null;
    showAdmin(false);
  });
}
