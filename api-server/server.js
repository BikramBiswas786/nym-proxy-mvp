import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyCache = new Map();
const cryptoCache = new Map(); // Separate cache for crypto sites

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

const CONTENT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
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

// Enhanced headers specifically for crypto sites
function getCryptoHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
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

function getStandardHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'DNT': '1',
    'Connection': 'keep-alive'
  };
}

async function fetchWithCryptoOptimization(url, maxRetries = 3) {
  const isCrypto = isCryptoSite(url);
  const timeout = isCrypto ? 60000 : 45000;
  const headers = isCrypto ? getCryptoHeaders() : getStandardHeaders();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      console.log(`[${isCrypto ? 'CRYPTO' : 'STANDARD'}] Attempt ${attempt + 1}/${maxRetries + 1}: ${url}`);
      
      const response = await fetch(url, {
        headers: headers,
        signal: controller.signal,
        redirect: 'follow',
        timeout: timeout,
        keepalive: true
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok && response.status !== 429) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (response.status === 429) {
        console.warn('[RATE_LIMITED] Server returned 429, retrying...');
        await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        continue;
      }
      
      return response;
    } catch (err) {
      console.error(`[Attempt ${attempt + 1}] Error:`, err.message);
      
      if (attempt < maxRetries) {
        const waitTime = isCrypto ? 1500 * (attempt + 1) : 1000 * (attempt + 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    totalCache: proxyCache.size + cryptoCache.size,
    generalCache: proxyCache.size,
    cryptoCache: cryptoCache.size,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    supportedDEXs: CRYPTO_DEX_SITES
  });
});

app.post('/v1/proxy', async (req, res) => {
  const { url } = req.body;
  const startTime = Date.now();
  
  try {
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    const isCrypto = isCryptoSite(url);
    console.log(`[Proxy] ${isCrypto ? '💎 CRYPTO' : '🌐 GENERAL'} Fetching: ${url}`);

    const fetchResponse = await fetchWithCryptoOptimization(url, isCrypto ? 3 : 2);
    let html = await fetchResponse.text();
    const duration = Date.now() - startTime;

    const token = crypto.randomBytes(16).toString('hex');
    const cacheEntry = {
      html,
      size: html.length,
      isCrypto,
      duration,
      expiresAt: Date.now() + CONTENT_TTL_MS
    };
    
    if (isCrypto) {
      cryptoCache.set(token, cacheEntry);
    } else {
      proxyCache.set(token, cacheEntry);
    }

    res.json({
      success: true,
      token,
      size: html.length,
      duration,
      isCrypto,
      viewUrl: `/v1/proxy/view/${token}`,
      message: isCrypto ? '💎 Crypto DEX content cached!' : 'Content cached!'
    });

  } catch (err) {
    console.error('[Error]', err.message);
    const errorMsg = err.message.includes('AbortError')
      ? 'Request timeout (website unresponsive)'
      : err.message.includes('ECONNREFUSED')
      ? 'Connection refused (website blocked)'
      : err.message;
    
    res.status(500).json({ error: errorMsg });
  }
});

app.get('/v1/proxy/view/:token', (req, res) => {
  const { token } = req.params;
  
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  const cached = cryptoCache.get(token) || proxyCache.get(token);
  if (!cached || Date.now() > cached.expiresAt) {
    if (cached) {
      if (cached.isCrypto) cryptoCache.delete(token);
      else proxyCache.delete(token);
    }
    return res.status(404).json({ error: 'Expired or not found' });
  }

  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.setHeader('X-Proxy', 'Cloud-Crypto-DEX');
  res.setHeader('X-Cache-Type', cached.isCrypto ? 'Crypto' : 'Standard');
  res.send(cached.html);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
