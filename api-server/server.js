import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyCache = new Map();
const cryptoCache = new Map();
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Cache cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) proxyCache.delete(key);
  }
  for (const [key, value] of cryptoCache.entries()) {
    if (now > value.expiresAt) cryptoCache.delete(key);
  }
}, 5 * 60 * 1000);

const CONTENT_TTL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_DEX_SITES = [
  'uniswap.org', 'pancakeswap.finance', 'raydium.io', 'curve.fi',
  'aave.com', '1inch.io', 'sushiswap.fi', 'dex.guru',
  'kyberswap.com', 'quickswap.exchange'
];

function isCryptoSite(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return CRYPTO_DEX_SITES.some(dex => hostname.includes(dex.replace('www.', '')));
  } catch {
    return false;
  }
}

function getCryptoHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'DNT': '1'
  };
}

async function renderWithApify(url) {
  if (!APIFY_TOKEN) throw new Error('Apify not configured');
  
  const input = {
    startUrls: [{ url }],
    maxRequestsPerCrawl: 1,
    pageFunction: `
      return {
        title: document.title,
        html: document.documentElement.outerHTML,
        status: 200
      };
    `
  };
  
  const response = await fetch(`https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  
  if (!response.ok) throw new Error(`Apify error: ${response.status}`);
  
  const data = await response.json();
  const runId = data.data.id;
  
  for (let i = 0; i < 120; i++) {
    const statusRes = await fetch(`https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusRes.json();
    
    if (statusData.data.status === 'SUCCEEDED') {
      const resultsRes = await fetch(`https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}/dataset/items?token=${APIFY_TOKEN}`);
      const results = await resultsRes.json();
      if (results && results.length > 0 && results[0].html) return results[0].html;
      break;
    }
    if (statusData.data.status === 'FAILED') throw new Error('Apify render failed');
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Apify timeout');
}

async function fetchWithCryptoOptimization(url, maxRetries = 3) {
  const isCrypto = isCryptoSite(url);
  const timeout = isCrypto ? 60000 : 45000;
  const headers = isCrypto ? getCryptoHeaders() : { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`[${isCrypto ? 'CRYPTO' : 'STANDARD'}] Attempt ${attempt + 1}: ${url}`);
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        redirect: 'follow',
        timeout
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && response.status !== 429) throw new Error(`HTTP ${response.status}`);
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      
      let html = await response.text();
      
      // For crypto sites with minimal content, try Apify rendering
      if (isCrypto && html.length < 50000 && APIFY_TOKEN) {
        try {
          console.log(`[APIFY] Rendering for ${url}`);
          html = await renderWithApify(url);
        } catch (e) {
          console.warn(`[APIFY_FALLBACK] Using simple HTML: ${e.message}`);
        }
      }
      
      return { html, isApify: false };
    } catch (err) {
      lastError = err;
      console.error(`[Attempt ${attempt + 1}] Error:`, err.message);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('Unknown fetch error');
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    totalCache: proxyCache.size + cryptoCache.size,
    cryptoCache: cryptoCache.size,
    apifyConfigured: !!APIFY_TOKEN,
    supportedDEXs: CRYPTO_DEX_SITES
  });
});

app.post('/v1/proxy', async (req, res) => {
  const { url } = req.body;
  const startTime = Date.now();
  
  try {
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const isCrypto = isCryptoSite(url);
    console.log(`[Proxy] ${isCrypto ? '💎 CRYPTO' : '🌐 GENERAL'}: ${url}`);

    const { html } = await fetchWithCryptoOptimization(url, isCrypto ? 3 : 2);
    const duration = Date.now() - startTime;
    const token = crypto.randomBytes(16).toString('hex');
    
    const cacheEntry = { html, size: html.length, isCrypto, duration, expiresAt: Date.now() + CONTENT_TTL_MS };
    (isCrypto ? cryptoCache : proxyCache).set(token, cacheEntry);

    res.json({ success: true, token, size: html.length, duration, isCrypto, viewUrl: `/v1/proxy/view/${token}` });
  } catch (err) {
    console.error('[Error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/v1/proxy/view/:token', (req, res) => {
  const { token } = req.params;
  if (!/^[a-f0-9]{32}$/.test(token)) return res.status(400).json({ error: 'Invalid token' });
  
  const cached = cryptoCache.get(token) || proxyCache.get(token);
  if (!cached || Date.now() > cached.expiresAt) {
    if (cached) (cached.isCrypto ? cryptoCache : proxyCache).delete(token);
    return res.status(404).json({ error: 'Expired or not found' });
  }

  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.setHeader('X-Proxy', 'Cloud-Crypto-DEX');
  res.send(cached.html);
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
export default app;
