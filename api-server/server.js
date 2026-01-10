import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ========== Storage: In-Memory Map (Primary) ==========
const proxyCache = new Map();

// Helper to clean up expired entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) {
      proxyCache.delete(key);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

// ========== Configuration ==========
const CONTENT_TTL_SECONDS = 72 * 60 * 60; // 72 hours
const CONTENT_TTL_MS = CONTENT_TTL_SECONDS * 1000;

// ========== Express Setup ==========
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// ========== Health Check ==========
app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy: 'cloud',
    storage: 'in-memory',
    uptime: process.uptime(),
    cached_items: proxyCache.size,
    ttl_hours: CONTENT_TTL_SECONDS / 3600,
    timestamp: new Date().toISOString(),
  });
});

// ========== Proxy Content Fetcher ==========
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs = 90000 } = req.body;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        hint: 'Include full URL like https://example.com',
      });
    }

    // Prepare fetch options
    const opts = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*',
        ...headers,
      },
      redirect: 'follow',
    };

    if (method !== 'GET' && body) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Execute fetch with timeout
    const t0 = Date.now();
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, { ...opts, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }

    const body_text = await response.text();
    const duration = Date.now() - t0;

    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');

    // Prepare data object
    const data = {
      url,
      status: response.status,
      originalUrl: response.url || url,
      headers: Object.fromEntries(response.headers.entries()),
      body: body_text,
      size: body_text.length,
      duration,
      timestamp: new Date().toISOString(),
      expiresAt: Date.now() + CONTENT_TTL_MS,
    };

    // Store in memory
    proxyCache.set(token, data);

    res.json({
      success: true,
      status: response.status,
      duration,
      size: body_text.length,
      originalUrl: response.url || url,
      body: body_text.substring(0, 5000),
      headers: Object.fromEntries(response.headers.entries()),
      token,
      viewUrl: `/v1/proxy/view/${token}`,
      cached: true,
      expiresInSeconds: CONTENT_TTL_SECONDS,
      ttl: `${CONTENT_TTL_SECONDS / 3600} hours`,
    });
  } catch (e) {
    console.error('Proxy error:', e.message);
    const msg = e.name === 'AbortError' ? 'Upstream request timed out' : e.message;
    res.status(500).json({
      success: false,
      error: msg,
      errorType: e.name,
    });
  }
});

// ========== View Cached Content ==========
app.get('/v1/proxy/view/:token', (req, res) => {
  try {
    const { token } = req.params;

    // Validate token format
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return res.status(400).json({
        error: 'Invalid token format',
        message: 'Token must be a 32-character hex string',
      });
    }

    // Retrieve from cache
    const cached = proxyCache.get(token);

    if (!cached) {
      return res.status(404).json({
        error: 'Content not found or expired',
        message: 'The link has expired. Create a new proxy link.',
        expired: true,
        action: 'create_new_link',
      });
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      proxyCache.delete(token);
      return res.status(404).json({
        error: 'Content expired',
        message: 'The link has expired. Create a new proxy link.',
        expired: true,
        action: 'create_new_link',
      });
    }

    // Extract content type
    const contentType = (cached.headers && cached.headers['content-type']) || 'text/html;charset=utf-8';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Proxy', 'Cloud-Memory');
    res.setHeader('X-Proxy-Version', '2.0');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Original-URL', cached.url || 'unknown');

    // Send cached body
    res.status(cached.status || 200).send(cached.body);
  } catch (e) {
    console.error('View error:', e.message);
    res.status(500).json({
      error: 'Server error',
      detail: e.message,
    });
  }
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Server error',
    message: err.message,
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cloud Proxy (In-Memory) running on port ${PORT}`);
  console.log(`Storage: In-Memory Map`);
  console.log(`Content TTL: ${CONTENT_TTL_SECONDS / 3600} hours`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
