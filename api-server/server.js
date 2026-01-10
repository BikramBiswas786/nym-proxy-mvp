import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ========== Storage: In-Memory Map ==========
const proxyCache = new Map();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) {
      proxyCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`[Cleanup] Removed ${cleaned} entries`);
}, 5 * 60 * 1000);

// ========== Configuration ==========
const CONTENT_TTL_SECONDS = 6 * 60 * 60; // 6 hours
const CONTENT_TTL_MS = CONTENT_TTL_SECONDS * 1000;
const REQUEST_TIMEOUT = 20000; // 20 seconds
const MAX_CONTENT_SIZE = 50 * 1024 * 1024; // 50MB

// 10 Crypto DEX Detection
const CRYPTO_DEX_SITES = {
  'uniswap.org': 'Uniswap',
  'pancakeswap.finance': 'PancakeSwap',
  'raydium.io': 'Raydium',
  'curve.fi': 'Curve',
  'aave.com': 'Aave',
  '1inch.io': '1Inch',
  'sushiswap.fi': 'SushiSwap',
  'dex.guru': 'Dex.Guru',
  'kyberswap.com': 'KyberSwap',
  'quickswap.exchange': 'QuickSwap'
};

function isCryptoDexSite(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return Object.keys(CRYPTO_DEX_SITES).some(dex => hostname.includes(dex.replace('www.', '')));
  } catch { return false; }
}

// ========== Express Setup ==========
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

// ========== Health Check ==========
app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    cache_items: proxyCache.size,
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ========== Main Proxy Endpoint ==========
app.post('/v1/proxy', async (req, res) => {
  const startTime = Date.now();
  try {
    const { url, method = 'GET', headers = {}, body } = req.body;

    // Validate URL
    try { new URL(url); } 
    catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const isDexSite = isCryptoDexSite(url);
    
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        ...headers
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || 'text/html;charset=utf-8';
    const body_text = await response.text();

    if (body_text.length > MAX_CONTENT_SIZE) {
      return res.status(413).json({ error: 'Content too large' });
    }

    const duration = Date.now() - startTime;
    const token = crypto.randomBytes(16).toString('hex');

    const data = {
      url,
      status: response.status,
      originalUrl: response.url,
      body: body_text,
      size: body_text.length,
      isDexSite,
      timestamp: new Date().toISOString(),
      expiresAt: Date.now() + CONTENT_TTL_MS
    };

    proxyCache.set(token, data);
    console.log(`[Proxy] ${isDexSite ? 'DEX' : 'WEB'} | ${response.status} | ${duration}ms | Cache: ${proxyCache.size}`);

    res.json({
      success: true,
      status: response.status,
      duration,
      size: body_text.length,
      isDexSite,
      token,
      viewUrl: `/v1/proxy/view/${token}`,
      expiresInSeconds: CONTENT_TTL_SECONDS
    });

  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[Error] ${duration}ms | ${err.message}`);
    res.status(500).json({
      success: false,
      error: err.message || 'Proxy error',
      duration
    });
  }
});

// ========== View Cached Content ==========
app.get('/v1/proxy/view/:token', (req, res) => {
  try {
    const { token } = req.params;

    if (!/^[a-f0-9]{32}$/.test(token)) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const cached = proxyCache.get(token);
    if (!cached || Date.now() > cached.expiresAt) {
      if (cached) proxyCache.delete(token);
      return res.status(404).json({ error: 'Content not found or expired' });
    }

    const contentType = cached.body.substring(0, 100).includes('<') ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Proxy', 'Cloud');
    res.setHeader('X-Cache-Hit', 'true');
    res.status(cached.status || 200).send(cached.body);
  } catch (err) {
    console.error('View error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== Cache Stats ==========
app.get('/v1/stats', (req, res) => {
  const totalSize = Array.from(proxyCache.values()).reduce((sum, item) => sum + item.size, 0);
  const dexCount = Array.from(proxyCache.values()).filter(item => item.isDexSite).length;

  res.json({
    cache_size: proxyCache.size,
    total_mb: Math.round(totalSize / 1024 / 1024),
    dex_items: dexCount,
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

// ========== Start Server ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✓ Cloud Proxy Production Server`);
  console.log(`✓ Port: ${PORT}`);
  console.log(`✓ Storage: In-Memory (Optimized)`);
  console.log(`✓ Crypto DEX: 10 platforms`);
  console.log(`✓ Ready for Millions\n`);
});
