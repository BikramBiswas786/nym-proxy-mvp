// Vercel serverless function handler
// This file exports the Express app for Vercel's serverless environment

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { ApifyClient } = require('apify-client');
const { nanoid } = require('nanoid');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const client = new ApifyClient({ token: process.env.APIFY_TOKEN });
const VALID_API_KEYS = new Set(
  (process.env.VALID_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);
const requestLog = [];

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const key = auth.replace('Bearer ', '').trim();
  if (!VALID_API_KEYS.has(key)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.apiKey = key;
  next();
}

function logRequest(req, res, next) {
  const requestId = nanoid(10);
  const startTime = Date.now();
  req.requestId = requestId;
  res.on('finish', () => {
    requestLog.push({
      requestId,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`
    });
  });
  next();
}

app.use(logRequest);

app.post('/v1/proxy', authenticate, async (req, res) => {
  const { url, method = 'GET', headers = {}, body, timeoutMs } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }
  try {
    const run = await client.actor(process.env.ACTOR_ID).call(
      { url, method, headers, body, timeoutMs: timeoutMs || 90000 },
      { timeout: 120000 }
    );
    const kvStore = await client.keyValueStore(run.defaultKeyValueStoreId);
    const result = await kvStore.getRecord('RESULT');
    if (!result) {
      return res.status(502).json({ error: 'No result' });
    }
    res.json({
      requestId: req.requestId,
      result: result.value,
      viaProxy: true
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/v1/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export for Vercel
module.exports = app;
