const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Simple health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Store simple in-memory history (for demo only)
const history = [];

app.post('/api/record', (req, res) => {
  const body = req.body || {};
  history.push({ ...body, ts: Date.now() });
  res.json({ status: 'saved' });
});

app.get('/api/history', (req, res) => {
  res.json(history.slice(-100));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));

