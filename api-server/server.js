import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();
const cache = new Map();

// Load index.html
let indexHtml;
try {
  indexHtml = readFileSync(join(process.cwd(), 'public', 'index.html'), 'utf-8');
} catch (e) {
  console.warn('Could not load index.html:', e.message);
  indexHtml = '<html><body>Cloud Proxy</body></html>';
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
  if (!url) return s.status(400).json({ error: 'URL required' });
  
  try {
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    let html = await res.text();
    
    // Inject base href to fix relative URLs
    const baseHref = `<base href="${url}" />`;
    html = html.replace(/<head[^>]*>/i, match => `${match}${baseHref}`);
    
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
    console.error('Proxy error:', e.message);
    s.status(500).json({ error: e.message });
  }
});

// View proxied content
app.get('/v1/proxy/view/:t', (r, s) => {
  const c = cache.get(r.params.t);
  if (!c || Date.now() > c.exp) {
    return s.status(404).json({ error: 'Token expired or not found' });
  }
  s.type('text/html').send(c.h);
});

// Serve static files
app.use(express.static('public'));

// Serve frontend for all other GET requests (catch-all)
app.use((r, s) => {
  s.type('text/html').send(indexHtml);
});

export default app;
