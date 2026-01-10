import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import https from 'https';
import http from 'http';

const app = express();

// ========== Storage: In-Memory Map (Optimized) ==========
const proxyCache = new Map();

// Enhanced cleanup with memory management
const cleanupExpiredEntries = () => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) {
      proxyCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[Cleanup] Removed ${cleaned} expired entries. Cache size: ${proxyCache.size}`);
  }
};

// Run cleanup every 5 minutes (aggressive for high traffic)
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

// ========== Configuration ==========
const CONTENT_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const CONTENT_TTL_MS = CONTENT_TTL_SECONDS * 1000;
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB limit

// ========== Crypto DEX Detection (10 Major Platforms) ==========
const CRYPTO_DEX_SITES = {
  'uniswap.org': { name: 'Uniswap', priority: 1 },
  'pancakeswap.finance': { name: 'PancakeSwap', priority: 1 },
  'raydium.io': { name: 'Raydium', priority: 1 },
  'curve.fi': { name: 'Curve', priority: 1 },
  'aave.com': { name: 'Aave', priority: 1 },
  '1inch.io': { name: '1Inch', priority: 2 },
  'sushiswap.fi': { name: 'SushiSwap', priority: 2 },
  'dex.guru': { name: 'Dex.Guru', priority: 2 },
  'kyberswap.com': { name: 'KyberSwap', priority: 2 },
  'quickswap.exchange': { name: 'QuickSwap', priority: 2 }
};

function isCryptoDexSite(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    return Object.keys(CRYPTO_DEX_SITES).some(dex => hostname.includes(dex.replace('www.', '')));
  } catch {
    return false;
  }
}

// ========== Express Setup ==========
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

// ========== Health Check ==========
app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy: 'cloud-optimized',
    storage: 'in-memory',
    uptime: process.uptime(),
    cached_items: proxyCache.size,
    memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    ttl_hours: CONTENT_TTL_SECONDS / 3600,
    max_content_size_mb: MAX_CONTENT_SIZE / 1024 / 1024,
    timestamp: new Date().toISOString(),
  });
});

// ========== Smart URL Fetcher (Handles Crypto DEX + Regular Sites) ==========
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = options.timeout || REQUEST_TIMEOUT;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
        ...(options.headers || {})
      },
      timeout
    };

    let data = '';
    const req = protocol.request(url, requestOptions, (res) => {
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > MAX_CONTENT_SIZE) {
          req.abort();
          reject(new Error('Content size exceeded'));
        }
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          url: res.url || url
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// ========== Main Proxy Endpoint ==========
app.post('/v1/proxy', async (req, res) => {
  const startTime = Date.now();
  try {
    const { url, method = 'GET', headers = {}, body, timeoutMs } = req.body;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL',
        hint: 'Include full URL like https://example.com'
      });
    }

    const timeout = timeoutMs || REQUEST_TIMEOUT;
    const isDexSite = isCryptoDexSite(url);

    if (isDexSite) {
      console.log(`[DEX] Processing: ${url}`);
    }

    // Fetch content
    const response = await fetchUrl(url, {
      method,
      headers,
      body,
      timeout
    });

    const duration = Date.now() - startTime;
    const token = crypto.randomBytes(16).toString('hex');

    // Prepare data object
    const data = {
      url,
      status: response.status,
      originalUrl: response.url,
      headers: response.headers,
      body: response.body,
      size: response.body.length,
      duration,
      isDexSite,
      timestamp: new Date().toISOString(),
      expiresAt: Date.now() + CONTENT_TTL_MS,
    };

    // Store in memory
    proxyCache.set(token, data);

    // Log for analytics
    console.log(`[Proxy] ${isDexSite ? 'DEX' : 'WEB'} | ${response.status} | ${duration}ms | ${data.size} bytes | Cache: ${proxyCache.size}`);

    res.json({
      success: true,
      status: response.status,
      duration,
      size: response.body.length,
      originalUrl: response.url,
      isDexSite,
      token,
      viewUrl: `/v1/proxy/view/${token}`,
      cached: true,
      expiresInSeconds: CONTENT_TTL_SECONDS,
      cacheSize: proxyCache.size,
      preview: response.body.substring(0, 500)
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Error] ${duration}ms | ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message,
      duration
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
        error: 'Invalid token format'
      });
    }

    // Retrieve from cache
    const cached = proxyCache.get(token);
    if (!cached) {
      return res.status(404).json({
        error: 'Content not found or expired',
        message: 'The link has expired. Create a new proxy link.',
        action: 'create_new_link'
      });
    }

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      proxyCache.delete(token);
      return res.status(404).json({
        error: 'Content expired'
      });
    }

    // Extract content type
    const contentType = (cached.headers && cached.headers['content-type']) || 'text/html;charset=utf-8';

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Proxy', 'Cloud-Memory-Optimized');
    res.setHeader('X-Cache-Hit', 'true');
    res.setHeader('X-Original-URL', cached.url || 'unknown');

    if (cached.isDexSite) {
      res.setHeader('X-DEX-Site', 'true');
    }

    // Send cached body
    res.status(cached.status || 200).send(cached.body);
  } catch (err) {
    console.error('View error:', err.message);
    res.status(500).json({
      error: 'Server error',
      detail: err.message
    });
  }
});

// ========== Cache Stats Endpoint ==========
app.get('/v1/stats', (req, res) => {
  const totalSize = Array.from(proxyCache.values()).reduce((sum, item) => sum + item.size, 0);
  const dexCount = Array.from(proxyCache.values()).filter(item => item.isDexSite).length;

  res.json({
    cache_size: proxyCache.size,
    total_bytes: totalSize,
    total_mb: Math.round(totalSize / 1024 / 1024),
    dex_items: dexCount,
    memory_heapUsed_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    memory_heapTotal_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ========== Error Handler ==========
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'Server error',
    message: err.message
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Cloud Proxy Running on port ${PORT}`);
  console.log(`✓ Storage: In-Memory Map (Optimized)`);
  console.log(`✓ Crypto DEX Support: 10 platforms`);
  console.log(`✓ Max Content: ${MAX_CONTENT_SIZE / 1024 / 1024}MB`);
  console.log(`✓ TTL: ${CONTENT_TTL_SECONDS / 3600} hours`);
  console.log(`✓ Production Ready for Millions`);
});
