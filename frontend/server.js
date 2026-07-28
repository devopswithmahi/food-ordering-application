const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 80;
const rawBackendUrl = process.env.BACKEND_URL || 'http://backend-service:3000';
const backendUrl = rawBackendUrl.match(/^https?:\/\//i) ? rawBackendUrl : `http://${rawBackendUrl}`;

app.use(express.static(path.join(__dirname)));

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.API_BASE = '/api';`);
});

app.use('/api', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const targetUrl = backendUrl.replace(/\/$/, '') + req.originalUrl;
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: new URL(backendUrl).host
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual'
    });

    response.headers.forEach((value, name) => {
      if (name.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(name, value);
    });
    res.status(response.status);
    const responseBody = await response.arrayBuffer();
    res.send(Buffer.from(responseBody));
  } catch (error) {
    console.error('API proxy error:', error);
    res.status(502).send('Bad gateway');
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
});
