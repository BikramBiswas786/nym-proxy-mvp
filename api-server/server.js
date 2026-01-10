import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { chromium } from 'playwright';

const app = express();
const proxyCache = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) proxyCache.delete(key);
  }
}, 5 * 60 * 1000);

const CONTENT_TTL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_DEX_SITES = {
  'uniswap.org': true,
  'pancakeswap.finance': true,
  'raydium.io': true,
  'curve.fi': true,
  'aave.com': true,
  '1inch.io': true,
  'sushiswap.fi': true,
  'dex.guru': true,
  'kyberswap.com': true,
  'quickswap.exchange': true
};

function isDexSite(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return Object.keys(CRYPTO_DEX_SITES).some(dex => hostname.includes(dex.replace('www.', '')));
  } catch { return false; }
}

async function renderWithPlaywright(url) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({ status: 'ok', cache: proxyCache.size, memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) });
});

app.post('/v1/proxy', async (req, res) => {
  const { url } = req.body;
  const startTime = Date.now();
  try {
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

    const isDex = isDexSite(url);
    let html;

    if (isDex) {
      console.log(`[DEX RENDER] ${url}`);
      html = await renderWithPlaywright(url);
    } else {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
  res.setHeader('X-Proxy', 'DEX-Render');
  res.send(cached.html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✓ Cloud Proxy DEX Ready on ${PORT}`));
