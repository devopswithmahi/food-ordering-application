const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 80;

app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
});
