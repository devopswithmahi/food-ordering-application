const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 80;
const backendUrl = process.env.BACKEND_URL || 'http://backend-service:3000';

app.use(express.static(path.join(__dirname)));

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.API_BASE = '${backendUrl.replace(/'/g, "\\'")}';`);
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
