import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import puppeteer from 'puppeteer';

const app = express();
const cache = new Map();
let browser = null;

// Initialize Puppeteer
async function initBrowser() {
  if (!browser) {
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (e) {
      console.error('Puppeteer init failed:', e);
    }
  }
  return browser;
}

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now > v.exp) cache.delete(k);
  }
}, 10 * 60 * 1000);

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

// Health check endpoint
app.get('/v1/health', (r, s) => s.json({ ok: true }));

// Status endpoint
app.get('/v1/status', (r, s) => {
  s.json({
    mixnetEnabled: false,
    mixnetConfigured: false,
    mixnetHealthy: false,
    latency: null,
    privacy: {
      current: 'Basic (Standard proxy)',
      metadataProtection: false,
      trafficAnalysisResistance: false
    }
  });
});

// Proxy endpoint - creates cached token
app.post('/v1/proxy', async (r, s) => {
  const url = r.body?.url;
  if (!url) return s.json({ error: 'URL required' });
  
  try {
    const b = await initBrowser();
    if (!b) throw new Error('Browser unavailable');
    
    const page = await b.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    await page.close();
    
    const t = crypto.randomBytes(16).toString('hex');
    cache.set(t, { h: html, exp: Date.now() + 4 * 60 * 60 * 1000 });
    
    s.json({
      success: true,
      token: t,
      size: html.length,
      viaProxy: true,
      viaMixnet: false,
      privacyLevel: 'basic'
    });
  } catch (e) {
    console.error('Proxy error:', e);
    s.json({ error: e.message });
  }
});

// View proxied content
app.get('/v1/proxy/view/:t', (r, s) => {
  const c = cache.get(r.params.t);
  if (!c || Date.now() > c.exp) return s.status(404).json({ error: 'Expired or not found' });
  s.type('text/html').send(c.h);
});

export default app;
