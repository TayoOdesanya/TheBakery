const state = {
  menu: [],
  cart: new Map(),
  config: {
    stripeServiceFeePercentage: 0
  }
};

const money = (value) => `£${Number(value).toFixed(2)}`;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function loadCategories() {
  const categories = await api('/api/menu/categories');
  const select = document.querySelector('#categoryFilter');
  for (const category of categories) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  }
  select.addEventListener('change', () => loadMenu(select.value));
}

async function loadConfig() {
  state.config = await api('/api/config');
}

async function loadMenu(category = '') {
  const path = category ? `/api/menu?category=${encodeURIComponent(category)}` : '/api/menu';
  state.menu = await api(path);
  renderMenu();
}

function renderMenu() {
  const container = document.querySelector('#menu');
  container.innerHTML = '';

  for (const item of state.menu) {
    const card = document.createElement('article');
    card.className = 'card stack';
    card.innerHTML = `
      <img class="item-image" src="${item.imageUrl || ''}" alt="">
      <div class="item-title">
        <h3>${item.name}</h3>
        <span class="price">${money(item.price)}</span>
      </div>
      <p class="muted">${item.description || ''}</p>
      <p class="muted">Stock: ${item.inventory.quantityAvailable}</p>
      <button>Add to cart</button>
    `;
    card.querySelector('button').addEventListener('click', () => addToCart(item));
    container.appendChild(card);
  }
}

function addToCart(item) {
  const existing = state.cart.get(item.id);
  state.cart.set(item.id, {
    ...item,
    quantity: existing ? existing.quantity + 1 : 1
  });
  renderCart();
}

function renderCart() {
  const container = document.querySelector('#cart');
  container.innerHTML = '';
  let total = 0;

  for (const item of state.cart.values()) {
    total += item.price * item.quantity;
    const line = document.createElement('div');
    line.className = 'cart-line';
    line.innerHTML = `
      <div class="row">
        <strong>${item.name}</strong>
        <span>${money(item.price * item.quantity)}</span>
      </div>
      <div class="row">
        <span class="muted">Qty ${item.quantity}</span>
        <button class="secondary" type="button">Remove</button>
      </div>
    `;
    line.querySelector('button').addEventListener('click', () => {
      state.cart.delete(item.id);
      renderCart();
    });
    container.appendChild(line);
  }

  const serviceFee = total * (Number(state.config.stripeServiceFeePercentage || 0) / 100);
  document.querySelector('#total').textContent = money(total + serviceFee);
}

async function placeOrder() {
  const message = document.querySelector('#message');
  message.className = 'message';
  message.textContent = '';

  try {
    const items = [...state.cart.values()].map((item) => ({
      menuItemId: item.id,
      quantity: item.quantity
    }));

    const orderPayload = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        tableNumber: Number(document.querySelector('#tableNumber').value),
        customerName: document.querySelector('#customerName').value,
        customerPhone: document.querySelector('#customerPhone').value,
        specialInstructions: document.querySelector('#specialInstructions').value,
        items
      })
    });

    const order = orderPayload.order;
    if (!order?.id) {
      throw new Error('Order creation failed');
    }

    const completePayload = await api(`/api/orders/${order.id}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        items,
        paymentMethod: 'card'
      })
    });

    state.cart.clear();
    renderCart();
    await loadMenu(document.querySelector('#categoryFilter').value);
    message.textContent = `Order ${completePayload.order.order_number || `#${completePayload.order.id}`} paid.`;
  } catch (error) {
    message.className = 'message error';
    message.textContent = error.message;
  }
}

document.querySelector('#placeOrder').addEventListener('click', placeOrder);
loadConfig().then(loadCategories).then(() => loadMenu()).catch((error) => {
  document.querySelector('#menu').textContent = error.message;
});
