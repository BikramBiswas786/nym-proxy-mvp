import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const contentCache = new Map();

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

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the URL directly
    console.log('Fetching URL:', url);
    
    const fetchOptions = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      },
      timeout: timeoutMs,
      redirect: 'follow'
    };

    // Add body if needed
    if (method !== 'GET' && body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();
    const duration = Date.now() - startTime;

    // Generate token
    const token = crypto.randomBytes(8).toString('hex');
    
    // Cache the content
    contentCache.set(token, {
      url,
      originalUrl: response.url || url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      size: responseBody.length,
      duration,
      timestamp: new Date().toISOString(),
      proxy: 'cloud'
    });

    // Keep cache size manageable
    if (contentCache.size > 100) {
      const firstKey = contentCache.keys().next().value;
      contentCache.delete(firstKey);
    }

    res.json({
      success: true,
      status: response.status,
      duration,
      size: responseBody.length,
      originalUrl: response.url || url,
      body: responseBody.substring(0, 5000),
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString(),
      proxy: 'cloud',
      token
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch content',
      proxy: 'cloud'
    });
  }
});

// GET /v1/proxy/view/:token - View cached content
app.get('/v1/proxy/view/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const cached = contentCache.get(token);

    if (!cached) {
      return res.status(404).json({ error: 'Content not found or expired' });
    }

    // Return HTML directly
    res.setHeader('Content-Type', cached.headers['content-type'] || 'text/html; charset=utf-8');
    res.send(cached.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/proxy/:token - Get cached metadata
app.get('/v1/proxy/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const cached = contentCache.get(token);

    if (!cached) {
      return res.status(404).json({ error: 'Content not found or expired' });
    }

    res.json({
      success: true,
      url: cached.originalUrl,
      status: cached.status,
      statusText: cached.statusText,
      headers: cached.headers,
      size: cached.size,
      duration: cached.duration,
      timestamp: cached.timestamp,
      proxy: 'cloud',
      body: cached.body
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Cloud Proxy Server running on port ' + PORT);
});
