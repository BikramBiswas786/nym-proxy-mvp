import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyCache = new Map();
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// Cache cleanup
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

async function renderWithApify(url) {
  if (!APIFY_TOKEN) throw new Error('APIFY_TOKEN not configured');
  
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

  const runEndpoint = `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}`;
  const runResponse = await fetch(runEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    timeout: 90000
  });

  if (!runResponse.ok) throw new Error(`Apify error: ${runResponse.status}`);
  const runData = await runResponse.json();
  const runId = runData.data.id;

  // Poll for results
  let attempts = 0;
  while (attempts < 60) {
    const statusResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusResponse.json();

    if (statusData.data.status === 'SUCCEEDED') {
      const resultsResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~web-scraper/runs/${runId}/dataset/items?token=${APIFY_TOKEN}`
      );
      const results = await resultsResponse.json();
      if (results && results.length > 0 && results[0].html) {
        return results[0].html;
      }
      break;
    }

    if (statusData.data.status === 'FAILED') throw new Error('Apify run failed');
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Apify timeout');
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    apify: APIFY_TOKEN ? 'configured' : 'missing APIFY_TOKEN',
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

    let html;
    if (isDex && APIFY_TOKEN) {
      try {
        console.log(`[DEX] Using Apify for ${url}`);
        html = await renderWithApify(url);
      } catch (apifyErr) {
        console.warn(`[Apify Failed] Falling back to standard fetch: ${apifyErr.message}`);
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        html = await r.text();
      }
    } else {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });
      html = await r.text();
    }

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


export default app;
