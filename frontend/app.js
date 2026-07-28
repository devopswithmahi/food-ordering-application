const menuList = document.getElementById('menu-list');
const cartItems = document.getElementById('cart-items');
const totalPrice = document.getElementById('total-price');
const customerNameInput = document.getElementById('customer-name');
const placeOrderBtn = document.getElementById('place-order-btn');
const orderHistory = document.getElementById('order-history');
const orderCount = document.getElementById('order-count');

let menu = [];
let cart = [];
const API_BASE = window.API_BASE || '/api';

async function apiFetch(path, options) {
  return fetch(`${API_BASE}${path}`, options);
}

async function loadMenu() {
  try {
    const response = await apiFetch('/menu');
    menu = await response.json();
    renderMenu();
  } catch (error) {
    menuList.innerHTML = '<p>Unable to load menu.</p>';
  }
}

async function loadOrders() {
  try {
    const response = await apiFetch('/orders');
    const orders = await response.json();
    renderOrders(orders);
    const summaryResponse = await apiFetch('/summary');
    const summary = await summaryResponse.json();
    orderCount.textContent = `${summary.totalOrders} orders received`;
  } catch (error) {
    orderHistory.innerHTML = '<p>No recent orders yet.</p>';
  }
}

function renderMenu() {
  menuList.innerHTML = '';
  menu.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <strong>${item.category}</strong>
      <div>$${item.price}</div>
      <button data-id="${item.id}">Add to cart</button>
    `;
    menuList.appendChild(card);
  });
}

function renderCart() {
  cartItems.innerHTML = '';
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Your cart is empty.</p>';
    totalPrice.textContent = '$0';
    return;
  }

  cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <strong>${item.name}</strong>
      <div>$${item.price}</div>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    cartItems.appendChild(row);
  });

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  totalPrice.textContent = `$${total}`;
}

function renderOrders(orders) {
  if (!orders || orders.length === 0) {
    orderHistory.innerHTML = '<p>No recent orders yet.</p>';
    return;
  }

  orderHistory.innerHTML = '';
  orders.forEach(order => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const names = order.items.map(entry => entry.name).join(', ');
    item.innerHTML = `<strong>${order.customerName}</strong><br />${names} • $${order.totalAmount}`;
    orderHistory.appendChild(item);
  });
}

menuList.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const item = menu.find(entry => entry.id === Number(button.dataset.id));
  if (item) {
    cart.push(item);
    renderCart();
  }
});

cartItems.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;

  const index = Number(button.dataset.index);
  if (!Number.isNaN(index)) {
    cart.splice(index, 1);
    renderCart();
  }
});

placeOrderBtn.addEventListener('click', async () => {
  if (!customerNameInput.value.trim()) {
    alert('Please enter your name.');
    return;
  }

  if (cart.length === 0) {
    alert('Please add at least one item to your cart.');
    return;
  }

  try {
    const response = await apiFetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: customerNameInput.value.trim(),
        items: cart
      })
    });

    const result = await response.json();
    alert(`Order placed successfully for ${result.customerName}!`);
    cart = [];
    customerNameInput.value = '';
    renderCart();
    loadOrders();
  } catch (error) {
    alert('Unable to place your order right now.');
  }
});

loadMenu();
loadOrders();
renderCart();
