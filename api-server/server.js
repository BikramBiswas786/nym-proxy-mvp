import express from 'express';
import cors from 'cors';
import crypto from 'crypto';;
import puppeteer from 'puppeteer'

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
const CONTENT_TTL_MS = CONTENT_TTL_SECONDS * 1000;;

// ========== Crypto DEX Detection ==========
const CRYPTO_DEX_SITES = [
  'uniswap.org',
  'pancakeswap.finance',
  'raydium.io',
  'curve.fi',
  'aave.com',
  '1inch.io',
  'sushiswap.fi',
  'dex.guru',
  'kyberswap.com',
  'quickswap.exchange'
];

function isCryptoDexSite(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    return CRYPTO_DEX_SITES.some(dex => hostname.includes(dex.replace('www.', '')));
  } catch {
    return false;
  }
}

// ========== Puppeteer Render Function ==========
async function renderPageWithPuppeteer(url, timeoutMs = 30000) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    const html = await page.content();
    const headers = {}; 
    return { html, status: response?.status() || 200, headers };
  } catch (err) {
    console.error('Puppeteer rendering error:', err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

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
      // Check if crypto DEX site - use Puppeteer for JS rendering
    let body_text;
    if (isCryptoDexSite(url)) {
      console.log(`[Puppeteer] Rendering crypto DEX site: ${url}`);
      const rendered = await renderPageWithPuppeteer(url, timeoutMs);
      body_text = rendered.html;
      response = { status: () => rendered.status, url };
    } else {
      response = await fetch(url, { ...opts, signal: controller.signal });
      body_text = await response.text();
    }
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
