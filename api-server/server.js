import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyCache = new Map();

// Cache cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of proxyCache.entries()) {
    if (now > value.expiresAt) proxyCache.delete(key);
  }
}, 5 * 60 * 1000);

const CONTENT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('public'));

app.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    cache: proxyCache.size,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

app.post('/v1/proxy', async (req, res) => {
  const { url } = req.body;
  const startTime = Date.now();
  
  try {
    // Validate URL
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    console.log(`[Proxy] Fetching: ${url}`);

    // Fetch with standard fetch
    const fetchResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    let html = await fetchResponse.text();
    const duration = Date.now() - startTime;

    // Generate cache token
    const token = crypto.randomBytes(16).toString('hex');
    proxyCache.set(token, {
      html,
      size: html.length,
      expiresAt: Date.now() + CONTENT_TTL_MS
    });

    // Return success response
    res.json({
      success: true,
      token,
      size: html.length,
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
  
  // Validate token format
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  const cached = proxyCache.get(token);
  if (!cached || Date.now() > cached.expiresAt) {
    if (cached) proxyCache.delete(token);
    return res.status(404).json({ error: 'Expired or not found' });
  }

  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.setHeader('X-Proxy', 'Cloud-Crypto');
  res.send(cached.html);
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
