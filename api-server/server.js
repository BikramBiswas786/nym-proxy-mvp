import express from 'express';
import { nanoid } from 'nanoid';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Redis Upstash REST API client
class RedisClient {
  constructor(url) {
    this.url = url;
  }

  async set(key, value, exSeconds = 86400) {
    try {
      const response = await fetch(`${this.url}/set/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([key, JSON.stringify(value)]),
      });
      
      if (!response.ok) {
        console.error(`Redis SET failed: ${response.status}`);
        return false;
      }
      
      // Set expiration
      await fetch(`${this.url}/expire/${key}/${exSeconds}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      return true;
    } catch (e) {
      console.error('Redis SET error:', e.message);
      return false;
    }
  }

  async get(key) {
    try {
      const response = await fetch(`${this.url}/get/${key}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (!data || !data.result) return null;
      
      try {
        return JSON.parse(data.result);
      } catch {
        return data.result;
      }
    } catch (e) {
      console.error('Redis GET error:', e.message);
      return null;
    }
  }
}

const redis = new RedisClient(process.env.UPSTASH_REDIS_REST_URL);

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

// POST /v1/proxy - Create private proxy link
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('\ud83d\ude80 Creating proxy link for:', url);
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the URL directly
    const fetchOptions = {
      method,
      headers: headers || {},
      timeout: Math.min(timeoutMs, 120000),
    };
    
    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;
    
    // Get response body
    const responseBody = await response.text();
    const size = Buffer.byteLength(responseBody, 'utf8');

    // Prepare result object
    const result = {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
      originalUrl: url,
      duration,
      size,
      timestamp: new Date().toISOString(),
      method
    };

    // Generate token and store in Redis
    const token = nanoid(10);
    const resultWithMeta = {
      ...result,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    const stored = await redis.set(token, resultWithMeta, 86400);
    if (!stored) {
      console.warn('Failed to store in Redis, but continuing...');
    }

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
    console.error('\u274c Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/proxy/:token - View proxied content
app.get('/v1/proxy/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await redis.get(token);

    if (!result) {
      return res.status(404).json({ error: 'Proxy result not found or expired' });
    }

    // Check if expired
    if (Date.now() > result.expiresAt) {
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
    console.error('\u274c GET proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
