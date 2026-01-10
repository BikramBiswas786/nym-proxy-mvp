import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';

const app = express();

// ========== Redis Configuration ==========
// Initialize Redis client from Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Content retention: 72 hours in seconds
const CONTENT_TTL_SECONDS = 72 * 60 * 60;

// Helper to build Redis key
const keyForToken = (token) => `proxy:${token}`;

// ========== Express Setup ==========
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.static('public'));

// ========== Health Check ==========
app.get('/v1/health', async (req, res) => {
  try {
    const ping = await redis.ping();
    res.json({
      status: 'ok',
      proxy: 'cloud',
      uptime: process.uptime(),
      redis: ping === 'PONG' ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Health check Redis error:', e.message);
    res.status(503).json({
      status: 'degraded',
      proxy: 'cloud',
      uptime: process.uptime(),
      redis: 'unreachable',
      error: e.message,
      timestamp: new Date().toISOString(),
    });
  }
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

    // Add body if not GET
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
    };

    // Store in Redis with TTL
    try {
      await redis.set(
        keyForToken(token),
        JSON.stringify(data),
        { ex: CONTENT_TTL_SECONDS }
      );
    } catch (redisErr) {
      console.error('Redis write error:', redisErr.message);
    }

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
app.get('/v1/proxy/view/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token format (should be hex string)
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return res.status(400).json({
        error: 'Invalid token format',
        message: 'Token must be a 32-character hex string',
      });
    }

    // Retrieve from Redis
    let raw;
    try {
      raw = await redis.get(keyForToken(token));
    } catch (redisErr) {
      console.error('Redis read error:', redisErr.message);
      return res.status(503).json({
        error: 'Cache service unavailable',
        message: 'Redis connection failed',
      });
    }

    if (!raw) {
      return res.status(404).json({
        error: 'Content not found or expired',
        message: 'The link has expired. Create a new proxy link.',
        expired: true,
        action: 'create_new_link',
      });
    }

    let cached;
    try {
      cached = JSON.parse(raw);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message);
      return res.status(500).json({
        error: 'Corrupted cache entry',
        message: 'Could not parse cached content',
      });
    }

    // Extract content type from cached headers
    const contentType = (cached.headers && cached.headers['content-type']) || 'text/html;charset=utf-8';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Proxy', 'Cloud-Redis');
    res.setHeader('X-Proxy-Version', '2.0');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Original-URL', cached.url || 'unknown');

    // Send cached body with original status
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
  console.log(`Cloud Proxy (Redis) running on port ${PORT}`);
  console.log(`Redis TTL: ${CONTENT_TTL_SECONDS / 3600} hours`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
