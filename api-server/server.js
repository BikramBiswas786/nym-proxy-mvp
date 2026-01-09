import express from 'express';
import { ApifyClient } from 'apify-client';
import cors from 'cors';

const app = express();
const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

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
      message: 'Cloud Proxy - Fast & Secure'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/proxy - Fetch and return content directly
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
    
    // Return the result immediately with HTML content
    res.json({
      success: true,
      status: result.status,
      duration: result.duration,
      size: result.size,
      originalUrl: result.originalUrl,
      body: result.body,
      headers: result.headers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/proxy/view - Serve HTML content directly
app.post('/v1/proxy/view', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
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
    
    if (!result || !result.body) {
      return res.status(500).json({ error: 'Failed to fetch content' });
    }
    
    // Serve HTML with URL rewriting
    let html = result.body;
    
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
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
