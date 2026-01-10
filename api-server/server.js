import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) proxyCache.delete(key);
  }
}, 5 * 60 * 1000);

const CONTENT_TTL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_DEX_SITES = new Set([
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
]);

function isDexSite(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const dex of CRYPTO_DEX_SITES) {
      if (hostname.includes(dex.replace('www.', ''))) return true;
    }
    return false;
  } catch { return false; }
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    cache: proxyCache.size,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    crypto_dex_support: Array.from(CRYPTO_DEX_SITES)
  });
});

app.post('/v1/proxy', async (req, res) => {
  const { url } = req.body;
  const startTime = Date.now();
  try {
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const isDex = isDexSite(url);
    console.log(`[Proxy] Fetching: ${url} (DEX: ${isDex})`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow',
      timeout: 20000
    });

    const html = await response.text();
    const duration = Date.now() - startTime;
    const token = crypto.randomBytes(16).toString('hex');

    proxyCache.set(token, {
      html,
      isDex,
      size: html.length,
      expiresAt: Date.now() + CONTENT_TTL_MS
    });

    res.json({
      success: true,
      token,
      size: html.length,
      isDex,
      duration,
      viewUrl: `/v1/proxy/view/${token}`
    });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/v1/proxy/view/:token', (req, res) => {
  const { token } = req.params;
  if (!/^[a-f0-9]{32}$/.test(token)) return res.status(400).json({ error: 'Invalid token' });

  const cached = proxyCache.get(token);
  if (!cached || Date.now() > cached.expiresAt) {
    if (cached) proxyCache.delete(token);
    return res.status(404).json({ error: 'Expired or not found' });
  }

  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.setHeader('X-Proxy', 'Cloud-Crypto');
  res.send(cached.html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Cloud Proxy Ready`);
  console.log(`✓ Support: 5 Crypto DEX Platforms`);
  console.log(`✓ Port: ${PORT}\n`);
});
