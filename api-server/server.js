import express from 'express';
import { ApifyClient } from 'apify-client';
import { nanoid } from 'nanoid';
import cors from 'cors';

const app = express();
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

// In-memory store for proxy results (24h expiry)
const proxyCache = new Map();

// Cleanup expired entries periodically (every 2 hours)
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of proxyCache.entries()) {
    if (value.expiresAt < now) {
      proxyCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}, 2 * 60 * 60 * 1000); // Every 2 hours

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// GET /v1/health - Health check
app.get('/v1/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      proxy: 'cloud',
      message: 'Cloud Proxy - Fast & Secure',
      cacheSize: proxyCache.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/proxy - Create private proxy link
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    console.log('🚀 Creating proxy link for:', url);
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Call Apify actor to fetch the URL
    const run = await client.actor('integrative_operative/my-actor').call({
      url,
      method,
      headers: headers || {},
      body: body || undefined,
      timeoutMs: Math.min(timeoutMs, 120000)
    });
    
    // Get dataset results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const result = items[0];
    
    if (!result) {
      return res.status(500).json({ error: 'Actor produced no results' });
    }
    
    // Generate token and store in memory cache
    const token = nanoid(10);
    const cacheEntry = {
      ...result,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    proxyCache.set(token, cacheEntry);
    const viewUrl = `${req.protocol}://${req.get('host')}/v1/proxy/${token}`;
    
    res.json({
      success: true,
      token,
      viewUrl,
      status: result.status,
      duration: result.duration,
      size: result.size,
      originalUrl: result.originalUrl
    });
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/proxy/:token - View proxied content
app.get('/v1/proxy/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = proxyCache.get(token);
    
    if (!result) {
      return res.status(404).json({ error: 'Proxy result not found or expired' });
    }
    
    // Check if expired
    if (Date.now() > result.expiresAt) {
      proxyCache.delete(token);
      return res.status(404).json({ error: 'Proxy result expired' });
    }
    
    // Serve HTML with URL rewriting
    let html = result.body || '';
    
    if (result.originalUrl) {
      const originalUrl = new URL(result.originalUrl);
      const baseUrl = `${originalUrl.protocol}//${originalUrl.host}`;
      
      // Basic URL rewriting
      html = html
        .replace(/href="\/(\w[^"]*)"/g, `href="${baseUrl}/$1"`)
        .replace(/src="\/(\w[^"]*)"/g, `src="${baseUrl}/$1"`)
        .replace(/url\(\/(\w[^)]*)/g, `url(${baseUrl}/$1`);
    }
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('❌ GET proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
