import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const cache = new Map();

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
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 20000
    });
    const html = await res.text();
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
    s.json({ error: e.message });
  }
});

// View proxied content
app.get('/v1/proxy/view/:t', (r, s) => {
  const c = cache.get(r.params.t);
  if (!c || Date.now() > c.exp) return s.json({ error: 'Expired' });
  s.set('Content-Type', 'text/html').send(c.h);
});

export default app;
