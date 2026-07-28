const http = require('http');
const { createClient } = require('redis');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis-service:6379';
const ORDERS_KEY = 'food_ordering_orders';

const menu = [
  { id: 1, name: 'Margherita Pizza', price: 12, category: 'Pizza', description: 'Classic cheese pizza with tomato sauce.' },
  { id: 2, name: 'Chicken Burger', price: 9, category: 'Burgers', description: 'Crispy chicken burger with lettuce and sauce.' },
  { id: 3, name: 'Pasta Alfredo', price: 10, category: 'Pasta', description: 'Creamy pasta with parmesan and herbs.' },
  { id: 4, name: 'Veggie Wrap', price: 7, category: 'Wraps', description: 'Fresh vegetables and hummus in a soft wrap.' }
];

const redisClient = createClient({ url: REDIS_URL });
redisClient.on('error', error => {
  console.error('Redis Client Error:', error);
});

async function getRecentOrders(limit = 10) {
  const items = await redisClient.lRange(ORDERS_KEY, 0, limit - 1);
  return items.map(item => JSON.parse(item));
}

async function getOrderSummary() {
  const totalOrders = await redisClient.lLen(ORDERS_KEY);
  const lastOrderJson = await redisClient.lIndex(ORDERS_KEY, 0);
  return {
    totalOrders,
    lastOrder: lastOrderJson ? JSON.parse(lastOrderJson) : null
  };
}

async function saveOrder(order) {
  await redisClient.lPush(ORDERS_KEY, JSON.stringify(order));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'food-ordering-api' });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/menu') {
    sendJson(res, 200, menu);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    const orders = await getRecentOrders(10);
    sendJson(res, 200, orders);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/summary') {
    const summary = await getOrderSummary();
    sendJson(res, 200, summary);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    try {
      const payload = await parseBody(req);
      if (!payload.customerName || !Array.isArray(payload.items) || payload.items.length === 0) {
        sendJson(res, 400, { error: 'Invalid order payload' });
        return;
      }

      const totalAmount = payload.items.reduce((sum, item) => sum + Number(item.price || 0), 0);
      const order = {
        id: Date.now().toString(),
        customerName: payload.customerName,
        items: payload.items,
        totalAmount,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      await saveOrder(order);
      sendJson(res, 201, order);
    } catch (error) {
      sendJson(res, 400, { error: 'Invalid JSON body' });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    sendJson(res, 200, { status: 'ok', service: 'food-ordering-api', message: 'Backend is running' });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

async function startServer() {
  try {
    await redisClient.connect();
    server.listen(PORT, () => {
      console.log(`Food ordering server running at http://localhost:${PORT}`);
      console.log(`Connected to Redis at ${REDIS_URL}`);
    });
  } catch (error) {
    console.error('Unable to start server because Redis connection failed:', error);
    process.exit(1);
  }
}

startServer();
