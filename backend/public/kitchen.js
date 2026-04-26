const money = (value) => `£${Number(value).toFixed(2)}`;

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function loadOrders() {
  const { orders } = await api('/api/orders/kitchen');
  const container = document.querySelector('#orders');
  container.innerHTML = '';

  for (const order of orders) {
    const card = document.createElement('article');
    card.className = 'card stack';
    card.innerHTML = `
      <div class="row">
        <h2>Table ${order.tableNumber}</h2>
        <span class="status ${order.status}">${order.status}</span>
      </div>
      <p class="muted">Order #${order.id} · ${new Date(order.createdAt).toLocaleTimeString()}</p>
      <div>${order.orderItems.map((item) => `<p>${item.quantity} x ${item.menuItem.name}</p>`).join('')}</div>
      ${order.specialInstructions ? `<p><strong>Notes:</strong> ${order.specialInstructions}</p>` : ''}
      <strong>${money(order.totalAmount)}</strong>
      <div class="row">
        <button data-status="preparing">Preparing</button>
        <button data-status="ready">Ready</button>
        <button data-status="delivered" class="secondary">Done</button>
      </div>
    `;

    for (const button of card.querySelectorAll('button')) {
      button.addEventListener('click', async () => {
        await api(`/api/orders/${order.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadOrders();
      });
    }

    container.appendChild(card);
  }

  document.querySelector('#lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

loadOrders().catch(console.error);
setInterval(() => loadOrders().catch(console.error), 5000);
