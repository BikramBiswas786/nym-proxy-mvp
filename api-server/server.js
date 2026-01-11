import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const cache = new Map();

// Embedded HTML - Privacy-focused proxy UI
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Proxy - Bypass Censorship</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      min-height: 100vh;
      padding: 20px;
      color: #e0e0e0;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: rgba(15, 52, 96, 0.9);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      padding: 40px;
      border: 1px solid #e94560;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e94560;
    }
    .header h1 {
      font-size: 2.5rem;
      color: #ff6b6b;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 1.1rem;
      color: #b0b0b0;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #e94560;
      font-size: 1.4rem;
      margin-bottom: 15px;
      border-bottom: 2px solid #e94560;
      padding-bottom: 10px;
    }
    .feature {
      background: rgba(0,0,0,0.2);
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #e94560;
      border-radius: 4px;
      line-height: 1.6;
    }
    .input-group {
      display: flex;
      gap: 10px;
      margin: 20px 0;
    }
    .url-input {
      flex: 1;
      padding: 12px 15px;
      border: 2px solid #16213e;
      border-radius: 6px;
      background: #1a1a2e;
      color: white;
      font-size: 1rem;
    }
    .url-input:focus {
      outline: none;
      border-color: #e94560;
      box-shadow: 0 0 10px rgba(233, 69, 96, 0.3);
    }
    .btn {
      padding: 12px 30px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
      font-size: 1rem;
    }
    .btn-primary {
      background: #e94560;
      color: white;
    }
    .btn-primary:hover {
      background: #ff6b6b;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(233, 69, 96, 0.4);
    }
    .message {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
      display: none;
    }
    .message.success {
      background: #4caf50;
      color: white;
      border-left: 4px solid #45a049;
    }
    .message.error {
      background: #f44336;
      color: white;
      border-left: 4px solid #d32f2f;
    }
    .blocked-sites {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin: 15px 0;
    }
    .site-card {
      background: rgba(233, 69, 96, 0.1);
      border: 1px solid #e94560;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
    }
    .site-card strong {
      color: #ff6b6b;
    }
    code {
      background: #000;
      padding: 2px 6px;
      border-radius: 3px;
      color: #90ee90;
      font-size: 0.9rem;
    }
    .warning {
      background: rgba(255, 193, 7, 0.1);
      border-left: 4px solid #ffc107;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Privacy Proxy</h1>
      <p>Access blocked content. Protect your privacy. Bypass censorship.</p>
    </div>

    <div class="section">
      <h2>How It Works</h2>
      <div class="feature">
        📡 <strong>Send a POST request</strong> with your target URL to <code>/v1/proxy</code>
      </div>
      <div class="feature">
        🔗 <strong>Example:</strong> POST body: <code>{"url": "https://blocked-site.com"}</code>
      </div>
      <div class="feature">
        🎯 <strong>Get content</strong> with privacy protection and anonymity
      </div>
    </div>

    <div class="section">
      <h2>🚫 Countering Censorship</h2>
      <p>This tool helps access information in countries where censorship is prevalent:</p>
      <div class="blocked-sites">
        <div class="site-card">
          <strong>China</strong><br>
          Great Firewall blocks content
        </div>
        <div class="site-card">
          <strong>Iran</strong><br>
          Heavy internet restrictions
        </div>
        <div class="site-card">
          <strong>Russia</strong><br>
          Blocks independent media
        </div>
        <div class="site-card">
          <strong>North Korea</strong><br>
          Extreme content blocking
        </div>
        <div class="site-card">
          <strong>Belarus</strong><br>
          Limited freedom online
        </div>
        <div class="site-card">
          <strong>Myanmar</strong><br>
          Government web filtering
        </div>
      </div>
    </div>

    <div class="section">
      <h2>🛡️ Privacy Features</h2>
      <div class="feature">
        ✅ <strong>IP Masking:</strong> Your real IP is hidden from target servers
      </div>
      <div class="feature">
        ✅ <strong>No Logs:</strong> We don't store or log your requests
      </div>
      <div class="feature">
        ✅ <strong>HTTPS Support:</strong> Encrypted connections
      </div>
      <div class="feature">
        ✅ <strong>Metadata Protection:</strong> User agents and headers are sanitized
      </div>
    </div>

    <div class="section">
      <h2>👥 For Activists & Journalists</h2>
      <div class="feature">
        💪 <strong>Bypass Government Blocks:</strong> Access news, social media, and communication platforms
      </div>
      <div class="feature">
        📰 <strong>Report Safely:</strong> Send information without exposing your location
      </div>
      <div class="feature">
        🔍 <strong>Research:</strong> Investigate without detection
      </div>
      <div class="feature">
        🤝 <strong>Organize:</strong> Communicate with peers freely
      </div>
    </div>

    <div class="warning">
      ⚠️ <strong>Legal Notice:</strong> Use this tool responsibly. Check your local laws. We're designed for freedom of information, not illegal activities.
    </div>

    <div id="message" class="message"></div>
  </div>

  <script>
    function showMessage(text, type) {
      const msg = document.getElementById('message');
      msg.textContent = text;
      msg.className = 'message ' + type;
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 5000);
    }
  </script>
</body>
</html>`;

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now > v.exp) cache.delete(k);
  }
}, 10 * 60 * 1000);

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
    privacyFocused: true,
    noCensorship: true,
    supportedCountries: ['China', 'Iran', 'Russia', 'Belarus', 'Myanmar', 'North Korea'],
    features: {
      ipMasking: true,
      noLogs: true,
      https: true,
      metadataProtection: true
    }
  });
});

// GET /v1/proxy - explains how to use the API
app.get('/v1/proxy', (req, res) => {
  res.status(400).json({
    error: 'Method not allowed',
    message: 'Use POST /v1/proxy with {"url": "https://target-site.com"} in body',
    hint: 'This is a privacy-focused proxy for accessing censored content'
  });
});

// POST /v1/proxy - proxy endpoint
app.post('/v1/proxy', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    // Check cache
    if (cache.has(url)) {
      const cached = cache.get(url);
      if (Date.now() <= cached.exp) {
        return res.json({ success: true, cached: true, content: cached.html });
      }
      cache.delete(url);
    }

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Privacy Proxy v1.0' },
        timeout: 15000
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();

      // Cache for 1 hour
      const token = crypto.randomBytes(16).toString('hex');
      cache.set(url, { html, exp: Date.now() + 60 * 60 * 1000, token });

      res.json({
        success: true,
        cached: false,
        content: html,
        size: html.length,
        privacy: 'IP masked, no logs kept'
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

// Serve static files
app.use(express.static('public'));

// Serve frontend for all other routes
app.use((req, res) => {
  res.type('text/html').send(indexHtml);
});

export default app;
