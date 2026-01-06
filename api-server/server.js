import express from 'express';
import { ApifyClient } from 'apify-client';
import { nanoid } from 'nanoid';
import cors from 'cors';

const app = express();
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

// Use a dedicated shared KV store for all proxy results
const PROXY_STORE_NAME = 'nym-proxy-results';

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static('public'));

// POST /v1/proxy - Create private proxy link
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;

    console.log('🚀 Proxying request for:', url);

    // Run Apify actor
    const run = await client.actor('integrative_operative/my-actor').call({
      url,
      method,
      headers,
      body,
      timeoutMs
    });

    // Wait for actor to finish and get dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const result = items[0];

    if (!result) {
      return res.status(500).json({ error: 'No result from actor' });
    }

    // Generate token and store result
    const token = nanoid(10);
    const resultWithMeta = {
      ...result,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    // Store in a dedicated shared KV store
    await client.keyValueStore(PROXY_STORE_NAME).setRecord({
      key: `proxy_${token}`,
      value: resultWithMeta,
      contentType: 'application/json'
    });

    const viewUrl = `${req.protocol}://${req.get('host')}/v1/proxy/${token}`;

    res.json({
      requestId: run.id,
      token,
      viewUrl,
      viaProxy: true,
      status: result.status
    });

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/proxy/:token - View proxied content
app.get('/v1/proxy/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Get from the dedicated shared KV store
    const record = await client.keyValueStore(PROXY_STORE_NAME).getRecord(`proxy_${token}`);

    if (!record || !record.value) {
      return res.status(404).json({ error: 'Proxy result not found or expired' });
    }

    const result = record.value;

    // Check if expired
    if (Date.now() > result.expiresAt) {
      return res.status(404).json({ error: 'Proxy result expired' });
    }

    // Serve HTML with basic URL rewriting for resources
    let html = result.body;

    // Basic URL rewriting for common relative URLs
    const originalUrl = new URL(result.originalUrl);
    const baseUrl = `${originalUrl.protocol}//${originalUrl.host}`;

    // Replace relative URLs with absolute ones
    html = html
      .replace(/href=\"\/([^\"]*)\"/g, `href=\"${baseUrl}/$1\"`)
      .replace(/src=\"\/([^\"]*)\"/g, `src=\"${baseUrl}/$1\"`)
      .replace(/url\(\/([^)]*)\)/g, `url(${baseUrl}/$1)`);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('❌ GET proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
