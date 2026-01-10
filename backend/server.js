// server.js - Production-ready backend with Upstash, security, and Mixnet support
import express from 'express';
import helmet from 'helmet';
import sanitizeHtml from 'sanitize-html';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { validateUrlAndHost } from './lib/validateUrl.js';
import { fetchSafe } from './lib/fetchSafe.js';
import { ApifyTransport, Socks5Transport } from './lib/transport.js';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Upstash redis
const redis = new Redis({ url: process.env.UPSTASH_REST_URL, token: process.env.UPSTASH_REST_TOKEN });

// Rate limiter
app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || '30', 10),
  standardHeaders: true, legacyHeaders: false
}));

// Transports
const socksUrl = process.env.NYM_SOCKS5_URL || null;
const socksTransport = socksUrl ? new Socks5Transport(socksUrl) : null;
const apifyTransport = new ApifyTransport();

function makeToken() {
  return crypto.randomBytes(12).toString('base64url');
}

// Preview endpoint - get metadata
app.post('/api/preview', async (req, res) => {
  try {
    const { url } = req.body || {};
    const v = await validateUrlAndHost(url);
    const metadata = await fetchSafe(apifyTransport.fetch.bind(apifyTransport), v.url, { timeoutMs: 5000, maxBytes: 200 * 1024 });
    const text = metadata.bodyBuffer.toString('utf8');
    const m = text.match(/<title>([^<]*)<\/title>/i);
    const desc = text.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    return res.json({ status: metadata.status, title: m ? m[1].trim() : null, description: desc ? desc[1] : null, resolved: v.resolved });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// Create token
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, mode } = req.body || {};
    const v = await validateUrlAndHost(url);
    const token = makeToken();
    const key = `token:${token}`;
    const payload = { url: v.url, mode: mode || 'apify', createdAt: Date.now() };
    await redis.set(key, JSON.stringify(payload), { ex: parseInt(process.env.TOKEN_TTL || '86400', 10) });
    return res.json({ token });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// Revoke token
app.post('/api/revoke', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'missing token' });
    await redis.del(`token:${token}`);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Proxied view
app.get('/p/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const raw = await redis.get(`token:${token}`);
    if (!raw) return res.status(404).send('not found or expired');
    const entry = JSON.parse(raw);
    await validateUrlAndHost(entry.url);

    let transport = apifyTransport;
    if (entry.mode === 'mixnet' && socksTransport) transport = socksTransport;

    const fetchFn = transport.fetch.bind(transport);
    const safe = await fetchSafe(fetchFn, entry.url, { timeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS || '20000', 10), maxBytes: parseInt(process.env.FETCH_MAX_BYTES || String(5*1024*1024), 10) });

    const unsafe = new Set(['set-cookie','content-security-policy','x-frame-options','x-powered-by','server','referrer-policy']);
    for (const [k,v] of safe.headers) {
      if (unsafe.has(k.toLowerCase())) continue;
      try { res.setHeader(k, v); } catch(e){}
    }

    if (safe.contentType && safe.contentType.includes('html')) {
      const text = safe.bodyBuffer.toString('utf8');
      const clean = sanitizeHtml(text, {
        allowedTags: sanitizeHtml.defaults.allowedTags.filter(t => t !== 'script'),
        allowedAttributes: { a:['href','title','rel'], img:['src','alt','title','width','height'] }
      });
      res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'none';");
      return res.status(safe.status || 200).send(clean);
    }
    return res.status(safe.status || 200).send(safe.bodyBuffer);
  } catch (e) {
    console.error('p/:token error', e);
    return res.status(500).send('error: ' + e.message);
  }
});

// GET /v1/proxy endpoint for quick proxy token generation (query parameter style)
app.get('/v1/proxy', async (req, res) => {
  try {
    const { url, mode } = req.query || {};
    const v = await validateUrlAndHost(url);
    const token = makeToken();
    const key = `token:${token}`;
    const payload = { url: v.url, mode: mode || 'apify', createdAt: Date.now() };
    await redis.set(key, JSON.stringify(payload), { ex: parseInt(process.env.TOKEN_TTL || '86400', 10) });
    const proxyUrl = `${req.protocol}://${req.get('host')}/p/${token}`;
    return res.json({ token, proxyUrl });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// POST /v1/proxy - for creating proxy tokens (matches frontend expectations)
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url, mode } = req.body || {};
    const v = await validateUrlAndHost(url);
    const token = makeToken();
    const key = `token:${token}`;
    const payload = { url: v.url, mode: mode || 'apify', createdAt: Date.now() };
    await redis.set(key, JSON.stringify(payload), { ex: parseInt(process.env.TOKEN_TTL || '86400', 10) });
    return res.json({ success: true, token, size: 0, duration: 0 });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});



app.get('/v1/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, ()=>console.log('listening on', PORT));
