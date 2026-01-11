import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const proxyLinks = new Map(); // token -> {url, createdAt, expiresAt}

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/v1/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Status endpoint
app.get('/v1/status', (req, res) => {
  res.json({
    service: 'Privacy Proxy',
    version: '1.0',
    mode: 'single-proxy-per-url',
    features: {
      ipMasking: true,
      noLogs: true,
      https: true,
      expirationTime: '24 hours'
    }
  });
});

// GET handler for /v1/proxy - shows usage
app.get('/v1/proxy', (req, res) => {
  res.status(400).json({
    error: 'Method not allowed',
    message: 'Use POST /v1/proxy with {"url": "https://target-site.com"} in body',
    hint: 'You will get back 1 proxy URL with 24-hour expiration'
  });
});

// POST /v1/proxy - Generate proxy URL for blocked site
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Store proxy link
    proxyLinks.set(token, {
      url,
      createdAt: now,
      expiresAt,
      accessed: false
    });

    // Return proxy URL
    res.json({
      success: true,
      originalUrl: url,
      proxyUrl: `https://nym-proxy-backend.vercel.app/access/${token}`,
      expiresAt: expiresAt.toISOString(),
      expiresIn: '24 hours',
      instructions: 'Click the proxy URL to access the blocked site safely and privately'
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// Access proxy endpoint - serves the proxied content
app.get('/access/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const proxyData = proxyLinks.get(token);

    // Check if token exists and is valid
    if (!proxyData) {
      return res.status(404).json({ error: 'Proxy link expired or invalid' });
    }

    // Check expiration
    if (new Date() > new Date(proxyData.expiresAt)) {
      proxyLinks.delete(token);
      return res.status(410).json({ error: 'Link has expired. Generate a new one.' });
    }

    // Fetch the target URL with privacy headers
    const response = await fetch(proxyData.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Privacy-Proxy/1.0',
        'Accept-Encoding': 'gzip, deflate'
      },
      timeout: 15000
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Target returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type');
    const content = await response.text();

    // Mark as accessed
    proxyData.accessed = true;

    // Return content with privacy headers
    res.set({
      'Content-Type': contentType || 'text/html',
      'X-Privacy-Protected': 'true',
      'X-IP-Masked': 'true',
      'Cache-Control': 'no-store'
    });

    res.send(content);
  } catch (e) {
    res.status(500).json({ error: 'Failed to access content', details: e.message });
  }
});

// Cleanup expired links every hour
setInterval(() => {
  const now = new Date();
  for (const [token, data] of proxyLinks) {
    if (now > new Date(data.expiresAt)) {
      proxyLinks.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Serve static files
app.use(express.static('public'));

// Catch all - serve nothing (API only)
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', hint: 'POST to /v1/proxy to generate proxy URL' });
});

export default app;
